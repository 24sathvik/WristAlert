import axios from 'axios';
import * as cheerio from 'cheerio';

// ─── USER AGENT POOL ───
const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
];
let uaIdx = 0;
const getUA = () => UA_POOL[uaIdx++ % UA_POOL.length];

// ─── RETAILER DETECTION ───
function detectRetailer(url: string) {
  const u = url.toLowerCase();
  if (u.includes('amazon.in') || u.includes('amazon.com')) return 'amazon';
  if (u.includes('flipkart.com')) return 'flipkart';
  if (u.includes('myntra.com')) return 'myntra';
  if (u.includes('titan.co.in')) return 'titan';
  if (u.includes('hmtwatches')) return 'hmt';
  if (u.includes('meesho.com')) return 'meesho';
  if (u.includes('nykaa.com')) return 'nykaa';
  if (u.includes('tatacliq.com')) return 'tatacliq';
  if (u.includes('ajio.com')) return 'ajio';
  if (u.includes('snapdeal.com')) return 'snapdeal';
  if (u.includes('reliancedigital.in')) return 'reliancedigital';
  if (u.includes('croma.com')) return 'croma';
  if (u.includes('shopclues.com')) return 'shopclues';
  if (u.includes('paytmmall.com')) return 'paytmmall';
  if (u.includes('jiomart.com')) return 'jiomart';
  return 'generic';
}

// ─── PRICE PARSER — handles all Indian price formats ───
function parsePrice(raw: any) {
  if (!raw) return null;
  const s = String(raw)
    .replace(/₹/g, '')
    .replace(/INR/gi, '')
    .replace(/Rs\.?/gi, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  const match = s.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  return isNaN(val) || val <= 0 || val > 10000000 ? null : val;
}

// ─── LAYER 1: JSON-LD (Schema.org Product) ───
function extractFromJsonLd($: any) {
  let result: any = { name: null, price: null, originalPrice: null, imageUrl: null, stockStatus: null, brand: null };

  $('script[type="application/ld+json"]').each((_: any, el: any) => {
    try {
      const raw = $(el).html()?.trim() || '';
      const json = JSON.parse(raw);
      const nodes = Array.isArray(json) ? json : (json['@graph'] ? json['@graph'] : [json]);
      for (const node of nodes) {
        if (node['@type'] !== 'Product') continue;
        if (!result.name && node.name) result.name = node.name;
        if (!result.brand && node.brand?.name) result.brand = node.brand.name;
        const img = node.image;
        if (!result.imageUrl && img) result.imageUrl = Array.isArray(img) ? img[0] : img;

        const offerNode = node.offers?.offers?.[0] ?? node.offers;
        if (offerNode) {
          if (!result.price) result.price = parsePrice(offerNode.price);
          if (!result.originalPrice) result.originalPrice = parsePrice(offerNode.highPrice || offerNode.price);
          const av = (offerNode.availability || '').toLowerCase();
          if (!result.stockStatus) {
            if (av.includes('outofstock')) result.stockStatus = 'out_of_stock';
            else if (av.includes('limitedavailability') || av.includes('lowstock')) result.stockStatus = 'low_stock';
            else if (av.includes('instock') || av.includes('onlineonly')) result.stockStatus = 'in_stock';
          }
        }
      }
    } catch {}
  });
  return result;
}

// ─── LAYER 2: Meta tags (Open Graph + Twitter + product: namespace) ───
function extractFromMeta($: any) {
  const get = (sel: string) => $(sel).attr('content')?.trim() || null;
  return {
    name: get('meta[property="og:title"]') || get('meta[name="twitter:title"]') || get('meta[name="title"]'),
    price: parsePrice(get('meta[property="product:price:amount"]') || get('meta[name="price"]') || get('meta[property="og:price:amount"]')),
    originalPrice: parsePrice(get('meta[property="product:original_price:amount"]')),
    imageUrl: get('meta[property="og:image"]') || get('meta[name="twitter:image"]'),
    stockStatus: (() => {
      const av = (get('meta[property="product:availability"]') || '').toLowerCase();
      return av.includes('in stock') ? 'in_stock' : av.includes('out') ? 'out_of_stock' : null;
    })(),
    brand: get('meta[property="product:brand"]') || get('meta[name="brand"]'),
  };
}

// ─── LAYER 3: Site-specific CSS selectors ───
function extractFromSelectors($: any, retailer: string, url: string) {
  const SITE_RULES: any = {
    amazon: {
      name:          ['#productTitle', 'span#productTitle', 'h1.a-size-large'],
      price:         ['#priceblock_ourprice', '#priceblock_dealprice', '#priceblock_saleprice',
                      '.a-price[data-a-color="price"] .a-offscreen',
                      '#apex_offerDisplay_desktop .a-offscreen',
                      '#corePrice_feature_div .a-offscreen',
                      'span.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen',
                      '#sns-base-price', '#attach-base-product-price'],
      originalPrice: ['#priceblock_listprice', '#listPrice', '.a-price.a-text-price .a-offscreen',
                      'span.a-price[data-a-strike="true"] .a-offscreen'],
      image:         ['#landingImage', '#imgBlkFront', 'img[data-old-hires]', '#main-image',
                      '#imageBlock img', 'img.a-dynamic-image'],
      inStock:       ['#availability span.a-color-success', '#add-to-cart-button', '#buy-now-button'],
      outOfStock:    ['#availability span.a-color-price', '#outOfStock',
                      '#availability span:contains("Currently unavailable")',
                      '#availability span:contains("currently unavailable")'],
      lowStock:      ['#availability span:contains("Only")', '#almostGone_feature_div'],
    },
    flipkart: {
      name:          ['span.B_NuCI', 'h1.yhB1nd', 'h1._6EBuvT', 'span.VU-ZEz', 'h1.KalC9f'],
      price:         ['div._30jeq3._16Jk6d', 'div._30jeq3', 'div.Nx9bqj._4b5DiR',
                      'div._25b18 ._30jeq3', 'div._3qQ9m1._1B9LRn .Nx9bqj',
                      'div[class*="price"] div[class*="jeq"]'],
      originalPrice: ['div._3I9_wc._2p6lqe', 'div._3I9_wc', 'div._2p6lqe'],
      image:         ['img._396cs4._2amPTt._3qGmMb', 'img.q6DClP', 'div._3kidJX img',
                      'img._2r_T1I', 'img[class*="396cs4"]'],
      inStock:       ['button._2KpZ6l._2U9uOA._3v1-ww', 'button._2AkmmA._2Npkh4',
                      'div._16FRp0:not(:contains("Out of Stock"))'],
      outOfStock:    ['div._16FRp0:contains("Out of Stock")', 'div._2Tpdn3',
                      'div[class*="out-of-stock"]', 'div._1gcxRG'],
      lowStock:      ['div._16FRp0:contains("Hurry")', 'div._16FRp0:contains("only")'],
    },
    myntra: {
      name:          ['h1.pdp-title', 'h1.pdp-name', 'h1[class*="pdp-name"]'],
      price:         ['span.pdp-price strong', 'span.pdp-discount-price strong',
                      'div.pdp-price span', 'strong.pdp-price'],
      originalPrice: ['span.pdp-mrp s', 'del.pdp-price'],
      image:         ['div.image-grid-container img', 'img.srcset-src', 'div.pdp-media img'],
      inStock:       ['button.btn-addtobag:not([disabled])', 'div.pdp-add-to-bag button:not([disabled])'],
      outOfStock:    ['div.size-buttons-size-button.size-buttons-out-of-stock',
                      'div[class*="out-of-stock"]', 'p.pdp-out-of-stock-text'],
      lowStock:      ['div.pdp-low-stock-text'],
    },
    titan: {
      name:          ['h1.product-name', 'h1.pdp-product-name', 'div.product-title h1',
                      'h1[itemprop="name"]'],
      price:         ['span.product-price', 'div.pdp-price span', 'p.price',
                      'span[class*="selling-price"]', 'span[itemprop="price"]'],
      originalPrice: ['span.compare-price', 'span[class*="original-price"]', 's.price'],
      image:         ['div.product-image img', 'img.pdp-img', 'img[itemprop="image"]'],
      inStock:       ['button.add-to-cart-btn:not([disabled])', 'div.add-to-cart:not(.disabled)'],
      outOfStock:    ['div.out-of-stock', 'button.add-to-cart-btn[disabled]', 'p:contains("Out of Stock")'],
      lowStock:      ['p:contains("Only"):contains("left")'],
    },
    hmt: {
      name:          ['h1.product_title', 'h1.entry-title', 'h1[class*="product-title"]'],
      price:         ['p.price ins .woocommerce-Price-amount',
                      'p.price .woocommerce-Price-amount:not(del .woocommerce-Price-amount)',
                      'span.woocommerce-Price-amount.amount'],
      originalPrice: ['p.price del .woocommerce-Price-amount'],
      image:         ['div.woocommerce-product-gallery img.wp-post-image',
                      'img.attachment-woocommerce_single'],
      inStock:       ['p.stock.in-stock', 'button.single_add_to_cart_button:not([disabled])'],
      outOfStock:    ['p.stock.out-of-stock'],
      lowStock:      ['p.stock:contains("Only")'],
    },
    tatacliq: {
      name:          ['h1[class*="pdp-name"]', 'h1[class*="ProductDetails"]', 'h1.product-name'],
      price:         ['span[class*="final-price"]', 'div[class*="price-box"] span',
                      'span[class*="sellingPrice"]'],
      originalPrice: ['span[class*="mrp"]', 'span[class*="listPrice"]'],
      image:         ['img[class*="product-image"]', 'div[class*="Carousel"] img'],
      inStock:       ['button[class*="add-to-cart"]:not([disabled])'],
      outOfStock:    ['div[class*="out-of-stock"]', 'button[class*="notify"]'],
      lowStock:      [],
    },
    meesho: {
      name:          ['span[class*="ProductTitle"]', 'h1[class*="ProductName"]', 'h4[class*="sc-"]'],
      price:         ['h5[class*="sc-"]', 'span[class*="price"]', 'div[class*="PriceContainer"] h5'],
      originalPrice: ['p[class*="strikethrough"]', 's[class*="price"]'],
      image:         ['div[class*="swiper"] img', 'img[class*="ProductImage"]'],
      inStock:       ['button:contains("Add to Cart")', 'button:contains("Buy Now")'],
      outOfStock:    ['button:contains("Notify Me")', 'div:contains("Out of Stock")'],
      lowStock:      [],
    },
    generic: {
      name:          ['h1[itemprop="name"]', 'h1.product-title', 'h1.product-name',
                      'h1.pdp-title', 'h1', '[itemprop="name"]'],
      price:         ['[itemprop="price"]', '[class*="selling-price"]', '[class*="sale-price"]',
                      '[class*="offer-price"]', '[class*="final-price"]', '[class*="current-price"]',
                      '.product-price', '#product-price', '[class*="product-price"]'],
      originalPrice: ['[class*="original-price"]', '[class*="list-price"]', '[class*="mrp"]',
                      '[class*="strike"]', 'del [itemprop="price"]'],
      image:         ['[itemprop="image"]', 'img.product-image', 'img[class*="product"]',
                      'img.main-image', '#main-product-image', 'img[id*="product"]'],
      inStock:       ['[itemprop="availability"][content*="InStock"]',
                      'button[class*="add-to-cart"]:not([disabled])',
                      'button[class*="addtocart"]:not([disabled])'],
      outOfStock:    ['[itemprop="availability"][content*="OutOfStock"]',
                      '[class*="out-of-stock"]', '[class*="outofstock"]',
                      'button[class*="add-to-cart"][disabled]'],
      lowStock:      ['[class*="low-stock"]', '[class*="limited-stock"]'],
    },
  };

  const rules = SITE_RULES[retailer] || SITE_RULES.generic;

  const tryMany = (selList: string[]) => {
    for (const sel of selList) {
      try {
        const el = $(sel).first();
        if (!el.length) continue;
        const text = (el.attr('content') || el.attr('data-price') || el.text()).trim();
        if (text) return text;
      } catch {}
    }
    return null;
  };

  // Image: check multiple attributes
  let imageUrl = null;
  for (const sel of rules.image) {
    const el = $(sel).first();
    if (!el.length) continue;
    imageUrl = el.attr('data-zoom-image') || el.attr('data-src') || el.attr('data-lazy-src')
      || el.attr('data-original') || el.attr('src');
    // Amazon's dynamic image JSON
    const dynImg = el.attr('data-a-dynamic-image');
    if (dynImg) {
      try { imageUrl = Object.keys(JSON.parse(dynImg))[0]; } catch {}
    }
    if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('blank.gif') && !imageUrl.includes('pixel')) break;
    imageUrl = null;
  }

  // Stock status from selectors
  let stockStatus = null;
  for (const sel of rules.outOfStock) {
    try {
      if ($(sel).length > 0) { stockStatus = 'out_of_stock'; break; }
    } catch {}
  }
  if (!stockStatus) {
    for (const sel of rules.lowStock) {
      try {
        if ($(sel).length > 0) { stockStatus = 'low_stock'; break; }
      } catch {}
    }
  }
  if (!stockStatus) {
    for (const sel of rules.inStock) {
      try {
        const el = $(sel).first();
        if (el.length > 0 && el.attr('disabled') === undefined) { stockStatus = 'in_stock'; break; }
      } catch {}
    }
  }

  return {
    name: tryMany(rules.name),
    price: parsePrice(tryMany(rules.price)),
    originalPrice: parsePrice(tryMany(rules.originalPrice)),
    imageUrl,
    stockStatus,
    brand: null,
  };
}

// ─── LAYER 4: Full-body text mining (absolute last resort) ───
function extractFromBodyText($: any, url: string) {
  const bodyText = $('body').text();
  const titleText = $('title').text().replace(/[|\-–—].*$/, '').trim();

  // Price: find all ₹ patterns in body, take the most common one that's reasonable
  const priceMatches = bodyText.match(/₹\s*[\d,]+(?:\.\d{1,2})?/g) || [];
  const prices = priceMatches
    .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
    .filter(p => p > 50 && p < 5000000);
  // Most frequently appearing price is likely the real price
  const priceCounts: any = {};
  prices.forEach(p => priceCounts[p] = (priceCounts[p] || 0) + 1);
  const price = Object.keys(priceCounts).length
    ? parseFloat(Object.keys(priceCounts).reduce((a, b) => priceCounts[a] > priceCounts[b] ? a : b))
    : null;

  // Stock from body text
  const lower = bodyText.toLowerCase();
  const stockStatus = lower.includes('out of stock') || lower.includes('currently unavailable') || lower.includes('sold out')
    ? 'out_of_stock'
    : lower.includes('only') && lower.includes('left')
    ? 'low_stock'
    : lower.includes('add to cart') || lower.includes('buy now') || lower.includes('in stock')
    ? 'in_stock'
    : 'unknown';

  // Image: largest img on page likely the product image
  let imageUrl = null;
  $('img').each((_: any, el: any) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')
      && !src.includes('banner') && !src.includes('sprite') && !src.includes('pixel')
      && !src.includes('blank') && !src.includes('tracking')) {
      imageUrl = src;
      return false; // break
    }
  });

  return { name: titleText, price, originalPrice: null, imageUrl, stockStatus, brand: null };
}

// ─── PLAYWRIGHT FALLBACK ───
async function scrapeWithPlaywright(url: string) {
  let browser;
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
             '--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
      userAgent: getUA(),
      viewport: { width: 1366, height: 768 },
      locale: 'en-IN',
      geolocation: { latitude: 19.076, longitude: 72.8777 }, // Mumbai
      permissions: ['geolocation'],
      extraHTTPHeaders: { 'Accept-Language': 'en-IN,en;q=0.9' },
    });

    // Block unnecessary resources to speed up
    await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,eot,mp4,mp3}', r => r.abort());
    await context.route('**/ads/**', r => r.abort());
    await context.route('**/analytics/**', r => r.abort());
    await context.route('**/tracking/**', r => r.abort());

    const page = await context.newPage();

    // Remove webdriver flag
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

    // Wait for ANY price selector to appear
    await page.waitForFunction(() => {
      const priceSelectors = [
        '#priceblock_ourprice', '.a-price', '._30jeq3', '.pdp-price',
        '[itemprop="price"]', '.product-price', 'span[class*="price"]',
        '.woocommerce-Price-amount', 'span[class*="selling-price"]',
      ];
      return priceSelectors.some(sel => document.querySelector(sel));
    }, { timeout: 8000 }).catch(() => {});

    // Small scroll to trigger lazy-loaded content
    await page.evaluate(() => window.scrollBy(0, 300)).catch(() => {});
    await page.waitForTimeout(800);

    const html = await page.content();
    return html;
  } catch (err: any) {
    console.error('[Playwright error]', err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// ─── MERGE RESULTS — first non-null value wins from layers in priority order ───
function mergeResults(...layers: any[]) {
  const merged: any = { name: null, price: null, originalPrice: null, imageUrl: null, stockStatus: 'unknown', brand: null };
  for (const key of Object.keys(merged)) {
    for (const layer of layers) {
      if (layer[key] !== null && layer[key] !== undefined && layer[key] !== 'unknown') {
        merged[key] = layer[key];
        break;
      }
    }
  }
  if (!merged.stockStatus || merged.stockStatus === 'unknown') merged.stockStatus = 'unknown';
  if (!merged.originalPrice && merged.price) merged.originalPrice = merged.price;
  if (merged.name) merged.name = merged.name.replace(/\s+/g, ' ').trim().slice(0, 250);
  return merged;
}

// ─── MAIN EXPORT ───
export async function scrapeProductUrl(url: string) {
  const retailer = detectRetailer(url);
  console.log(`[Scraper] ${retailer} — ${url}`);

  // ATTEMPT 1: axios fetch + all 4 extraction layers
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);
    const l1 = extractFromJsonLd($);
    const l2 = extractFromMeta($);
    const l3 = extractFromSelectors($, retailer, url);
    const l4 = extractFromBodyText($, url);
    const merged = mergeResults(l1, l2, l3, l4);

    console.log(`[Scraper] Axios result — price: ${merged.price}, stock: ${merged.stockStatus}`);

    // If we got a price, return immediately
    if (merged.price) {
      return { ...merged, retailer, productUrl: url, currency: 'INR' };
    }
    // No price from axios — fall through to Playwright
    console.log('[Scraper] No price from axios, trying Playwright...');
  } catch (err: any) {
    console.log(`[Scraper] Axios failed (${err.message}), trying Playwright...`);
  }

  // ATTEMPT 2: Playwright + same extraction layers
  const playwrightHtml = await scrapeWithPlaywright(url);
  if (playwrightHtml) {
    const $ = cheerio.load(playwrightHtml);
    const l1 = extractFromJsonLd($);
    const l2 = extractFromMeta($);
    const l3 = extractFromSelectors($, retailer, url);
    const l4 = extractFromBodyText($, url);
    const merged = mergeResults(l1, l2, l3, l4);

    console.log(`[Scraper] Playwright result — price: ${merged.price}, stock: ${merged.stockStatus}`);

    if (merged.price || merged.name) {
      return { ...merged, retailer, productUrl: url, currency: 'INR' };
    }
  }

  // Complete failure
  return null;
}

// ─── EXPRESS ROUTE HANDLER ───
export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url?.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'A valid URL starting with https:// is required.' });
  }

  try {
    const data = await scrapeProductUrl(url);

    if (!data || (!data.price && !data.name)) {
      return res.status(422).json({
        success: false,
        error: 'Could not extract product data from this URL.',
        suggestion: 'Make sure the URL is a direct product page (not a search or category page).',
      });
    }

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Scraper Route Error]', error.message);
    return res.status(500).json({ success: false, error: 'Scraping failed: ' + error.message });
  }
}
