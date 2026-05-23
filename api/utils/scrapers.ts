import axios from 'axios';
import * as cheerio from 'cheerio';


function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = String(text).replace(/[₹$€£,\s]/g, '').replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function detectRetailer(url: string): string {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('amazon.in') || lowerUrl.includes('amazon.com')) return 'amazon';
  if (lowerUrl.includes('flipkart.com')) return 'flipkart';
  if (lowerUrl.includes('myntra.com')) return 'myntra';
  if (lowerUrl.includes('titan.co.in')) return 'titan';
  if (lowerUrl.includes('hmtwatches.in') || lowerUrl.includes('hmtwatches.com')) return 'hmt';
  if (lowerUrl.includes('meesho.com')) return 'meesho';
  if (lowerUrl.includes('nykaa.com')) return 'nykaa';
  if (lowerUrl.includes('tatacliq.com')) return 'tatacliq';
  if (lowerUrl.includes('ajio.com')) return 'ajio';
  return 'default';
}

function parseStockStatus($: any, retailer: string, url: string) {
  // ── Strategy 1: JSON-LD availability (most reliable) ──
  let stockFromJsonLd = null;
  $('script[type="application/ld+json"]').each((_: any, el: any) => {
    try {
      const json = JSON.parse($(el).html().trim());
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const product = item['@type'] === 'Product' ? item
          : item['@graph']?.find((n: any) => n['@type'] === 'Product');
        if (!product) continue;
        const avail = product.offers?.availability || product.offers?.offers?.[0]?.availability || '';
        if (avail) {
          const a = avail.toLowerCase();
          if (a.includes('instock') || a.includes('in_stock')) stockFromJsonLd = 'in_stock';
          else if (a.includes('outofstock') || a.includes('out_of_stock')) stockFromJsonLd = 'out_of_stock';
          else if (a.includes('limitedavailability') || a.includes('lowstock')) stockFromJsonLd = 'low_stock';
        }
      }
    } catch {}
  });
  if (stockFromJsonLd) return stockFromJsonLd;

  // ── Strategy 2: Site-specific selectors ──
  const STOCK_SELECTORS: any = {
    amazon: {
      inStock:    ['#availability span.a-color-success', '#add-to-cart-button', '#buy-now-button'],
      outOfStock: ['#availability span.a-color-price', '#outOfStock', '#availability span:contains("Currently unavailable")', '#availability span:contains("unavailable")'],
      lowStock:   ['#availability span:contains("Only")', '#availability span:contains("left in stock")', '#almostGone_feature_div'],
    },
    flipkart: {
      inStock:    ['button._2KpZ6l._2U9uOA._3v1-ww', 'button[class*="add-to-cart"]', 'div._16FRp0:contains("In Stock")'],
      outOfStock: ['div._16FRp0:contains("Out of Stock")', 'div._2Tpdn3', 'div[class*="out-of-stock"]'],
      lowStock:   ['div._16FRp0:contains("Hurry")', 'div._16FRp0:contains("only"):contains("left")'],
    },
    myntra: {
      inStock:    ['div.pdp-add-to-bag button:not([disabled])', 'button.btn-addtobag:not([disabled])'],
      outOfStock: ['div.size-buttons-size-button.size-buttons-out-of-stock', 'p.pdp-out-of-stock-text', 'div[class*="out-of-stock"]'],
      lowStock:   ['div.pdp-low-stock-text', 'p:contains("Hurry up"):contains("left")'],
    },
    titan: {
      inStock:    ['button.add-to-cart-btn:not([disabled])', 'button:contains("Add to Cart"):not([disabled])'],
      outOfStock: ['div.out-of-stock', 'button.add-to-cart-btn[disabled]', 'p:contains("Out of Stock")'],
      lowStock:   ['p:contains("Only"):contains("left")', 'div.low-stock-label'],
    },
    hmt: {
      inStock:    ['p.stock.in-stock', 'button.single_add_to_cart_button:not([disabled])'],
      outOfStock: ['p.stock.out-of-stock', 'p.stock:contains("Out of stock")'],
      lowStock:   ['p.stock:contains("Only")'],
    },
    default: {
      inStock:    ['[itemprop="availability"][content*="InStock"]', 'button[class*="add-to-cart"]:not([disabled])', 'button[class*="addtocart"]:not([disabled])', '.stock.in-stock', '[class*="in-stock"]'],
      outOfStock: ['[itemprop="availability"][content*="OutOfStock"]', '[class*="out-of-stock"]', '[class*="outofstock"]', 'button[class*="add-to-cart"][disabled]', '.stock.out-of-stock'],
      lowStock:   ['[class*="low-stock"]', '[class*="lowstock"]'],
    }
  };

  const sel = STOCK_SELECTORS[retailer] || STOCK_SELECTORS.default;

  for (const s of sel.outOfStock) {
    const el = $(s);
    if (el.length > 0) {
      const text = el.text().toLowerCase();
      if (s.includes(':contains') || text.includes('out of stock') || text.includes('unavailable') || text.includes('sold out') || el.attr('disabled') !== undefined) {
        return 'out_of_stock';
      }
    }
  }

  for (const s of sel.lowStock) {
    if ($(s).length > 0) return 'low_stock';
  }

  for (const s of sel.inStock) {
    const el = $(s);
    if (el.length > 0 && el.attr('disabled') === undefined) return 'in_stock';
  }

  // ── Strategy 3: Full-page text scan (last resort) ──
  const bodyText = $('body').text().toLowerCase();
  const outOfStockPhrases = [
    'out of stock', 'currently unavailable', 'sold out',
    'not available', 'item unavailable', 'temporarily unavailable',
    'notify me when available', 'join waitlist'
  ];
  const inStockPhrases = [
    'add to cart', 'add to bag', 'buy now', 'in stock', 'available'
  ];

  for (const phrase of outOfStockPhrases) {
    if (bodyText.includes(phrase)) return 'out_of_stock';
  }
  for (const phrase of inStockPhrases) {
    if (bodyText.includes(phrase)) return 'in_stock';
  }

  return 'unknown';
}

function extractFromHtml($: any, url: string) {
  let result = {
    name: null as string | null,
    price: null as number | null,
    originalPrice: null as number | null,
    imageUrl: null as string | null,
    stockStatus: 'unknown',
    brand: null as string | null,
    retailer: detectRetailer(url),
    productUrl: url,
    currency: 'INR',
  };

  // ── JSON-LD extraction (highest accuracy) ──
  $('script[type="application/ld+json"]').each((_: any, el: any) => {
    try {
      const html = $(el).html();
      if (!html) return;
      const json = JSON.parse(html);
      const items = Array.isArray(json) ? json : [json];
      for (const item of items) {
        const target = item['@type'] === 'Product' ? item
          : item['@graph']?.find((n: any) => n['@type'] === 'Product');
        if (!target) continue;
        if (target.name && !result.name) result.name = target.name;
        if (target.brand?.name && !result.brand) result.brand = target.brand.name;
        if (target.image) result.imageUrl = Array.isArray(target.image) ? target.image[0] : target.image;
        const offer = target.offers?.offers?.[0] ?? target.offers;
        if (offer?.price && !result.price) result.price = parseFloat(String(offer.price).replace(/[^0-9.]/g, ''));
      }
    } catch (e) {}
  });

  // ── Open Graph tags ──
  if (!result.name) result.name = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || null;
  if (!result.imageUrl) result.imageUrl = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;

  // ── Site-specific CSS selector fallbacks ──
  const retailerKey = detectRetailer(url);

  const SELECTORS: any = {
    amazon: {
      name: ['#productTitle', 'h1.a-size-large', 'span#productTitle'],
      price: ['#priceblock_ourprice', '#priceblock_dealprice', '.a-price .a-offscreen', '#corePrice_feature_div .a-offscreen', 'span.a-price[data-a-color="price"] .a-offscreen', '#apex_offerDisplay_desktop .a-offscreen'],
      image: ['#landingImage', '#imgBlkFront', 'img#main-image', '#imageBlock img'],
      stock: ['#availability span', '#outOfStock', '#almostGone_feature_div'],
      originalPrice: ['.a-price.a-text-price .a-offscreen', '#priceblock_listprice', '#listPrice'],
    },
    flipkart: {
      name: ['span.B_NuCI', 'h1.yhB1nd', 'h1._6EBuvT', 'div._35KyD6 h1'],
      price: ['div._30jeq3._16Jk6d', 'div._30jeq3', 'div._25b18 ._30jeq3', 'div.Nx9bqj._4b5DiR'],
      image: ['img._396cs4._2amPTt._3qGmMb', 'img.q6DClP', 'div._3kidJX img'],
      stock: ['div._16FRp0', 'div.Z8JjpR'],
      originalPrice: ['div._3I9_wc._2p6lqe', 'div._3I9_wc'],
    },
    myntra: {
      name: ['h1.pdp-title', 'h1.pdp-name', 'div.pdp-name h1'],
      price: ['span.pdp-price strong', 'div.pdp-price span', 'span.pdp-mrp strong'],
      image: ['div.image-grid-container img', 'img.srcset-src'],
      stock: ['div.size-buttons-size-button', 'p.out-of-stock'],
      originalPrice: ['span.pdp-mrp s'],
    },
    titan: {
      name: ['h1.product-name', 'h1.pdp-product-name', 'div.product-title h1'],
      price: ['span.product-price', 'div.pdp-price span', 'p.price'],
      image: ['div.product-image img', 'img.pdp-img'],
      stock: ['div.product-availability', 'button.add-to-cart'],
      originalPrice: ['span.compare-price', 'span.product-original-price'],
    },
    hmt: {
      name: ['h1.product_title', 'h1.entry-title', 'h1.product-title'],
      price: ['p.price ins .woocommerce-Price-amount', 'p.price .woocommerce-Price-amount', 'span.woocommerce-Price-amount'],
      image: ['div.woocommerce-product-gallery img.wp-post-image', 'img.attachment-woocommerce_single'],
      stock: ['p.stock.in-stock', 'p.stock.out-of-stock', 'div.woocommerce-variation-availability p'],
      originalPrice: ['p.price del .woocommerce-Price-amount'],
    },
    default: {
      name: ['h1', 'h1.product-title', 'h1.product-name', 'h1.pdp-title', '[itemprop="name"]'],
      price: ['[itemprop="price"]', '.product-price', '.price', '.sale-price', '#product-price'],
      image: ['[itemprop="image"]', '.product-image img', 'img.product-img', 'img.main-image'],
      stock: ['[itemprop="availability"]', '.stock-status', '.availability'],
      originalPrice: ['.original-price', '.compare-price', '.list-price', 'del .price'],
    }
  };

  const sel = SELECTORS[retailerKey] || SELECTORS.default;

  const trySelectors = (selList: string[]) => {
    for (const s of selList) {
      const el = $(s).first();
      const text = el.attr('content') || el.text().trim();
      if (text) return text;
    }
    return null;
  };

  if (!result.name) result.name = trySelectors(sel.name);
  if (!result.imageUrl) {
    const imgEl = $(sel.image[0]).first();
    result.imageUrl = imgEl.attr('src') || imgEl.attr('data-src') || imgEl.attr('data-a-dynamic-image')?.match(/"([^"]+)"/)?.[1] || null;
  }

  if (!result.price) {
    const rawPrice = trySelectors(sel.price);
    if (rawPrice) result.price = parsePrice(rawPrice);
  }

  if (!result.originalPrice) {
    const rawOriginal = trySelectors(sel.originalPrice);
    if (rawOriginal) result.originalPrice = parsePrice(rawOriginal);
  }

  result.stockStatus = parseStockStatus($, retailerKey, url);

  if (result.name) result.name = result.name.replace(/\s+/g, ' ').trim().substring(0, 200);
  if (!result.originalPrice && result.price) result.originalPrice = result.price;

  return result;
}

export async function scrapeByMetadata(url: string) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
    'sec-ch-ua-mobile': '?0',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'Upgrade-Insecure-Requests': '1',
  };

  const response = await axios.get(url, {
    headers,
    timeout: 15000,
    maxRedirects: 5,
  });

  const html = response.data;
  const $ = cheerio.load(html);
  return extractFromHtml($, url);
}



