import * as cheerio from 'cheerio';
import axios from 'axios';

// Rotate between 5 User-Agent strings to avoid blocks
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

let uaIndex = 0;
function getRandomUA() { 
  return USER_AGENTS[uaIndex++ % USER_AGENTS.length]; 
}

async function fetchHtml(url: string) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      timeout: 7000,
      maxRedirects: 3,
    });
    return response.data;
  } catch {
    return '';
  }
}

async function searchAmazon(query: string) {
  const encoded = encodeURIComponent(query + ' watch');
  const url = `https://www.amazon.in/s?k=${encoded}&i=watches`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('div[data-component-type="s-search-result"]').slice(0, 5).each((_, el) => {
    const name = $(el).find('h2 span.a-text-normal').text().trim();
    const priceWhole = $(el).find('span.a-price-whole').first().text().replace(/[^0-9]/g, '');
    const priceFraction = $(el).find('span.a-price-fraction').first().text().replace(/[^0-9]/g, '') || '00';
    const price = priceWhole ? parseFloat(`${priceWhole}.${priceFraction}`) : null;
    const originalPriceText = $(el).find('span.a-price.a-text-price span.a-offscreen').first().text();
    const originalPrice = originalPriceText ? parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) : price;
    const imageUrl = $(el).find('img.s-image').attr('src');
    const relativeUrl = $(el).find('h2 a.a-link-normal').attr('href');
    const productUrl = relativeUrl ? `https://www.amazon.in${relativeUrl.split('?')[0]}` : null;
    const stockText = $(el).find('span.a-color-price').text().toLowerCase();
    const stockStatus = stockText.includes('out of stock') ? 'out_of_stock' : price ? 'in_stock' : 'unknown';
    const rating = parseFloat($(el).find('span.a-icon-alt').text()) || null;
    const reviewText = $(el).find('span[aria-label*="stars"] + span').attr('aria-label') || '';
    const reviewCount = parseInt(reviewText.replace(/[^0-9]/g, '')) || null;

    if (name && price) results.push({ name, price, originalPrice, imageUrl, productUrl, stockStatus, rating, reviewCount });
  });
  return results;
}

async function searchFlipkart(query: string) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.flipkart.com/search?q=${encoded}&category=watches`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  const containers = $('div._1AtVbE, div._13oc-S, div.s1Q9rs').slice(0, 8);
  containers.each((_, el) => {
    const name = $(el).find('div._4rR01T, a.s1Q9rs, div.KzDlHZ, div._2WkVRV').first().text().trim();
    const priceText = $(el).find('div._30jeq3, div._1_WHN1, div.Nx9bqj').first().text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const origText = $(el).find('div._3I9_wc, div._2p6lqe').first().text();
    const originalPrice = parseFloat(origText.replace(/[^0-9.]/g, '')) || price;
    const imageUrl = $(el).find('img._396cs4, img.q6DClP, img._2r_T1I').first().attr('src');
    const href = $(el).find('a._1fQZEK, a.s1Q9rs, a._2rpwqI').first().attr('href');
    const productUrl = href ? `https://www.flipkart.com${href.split('?')[0]}` : null;
    const stockStatus = price ? 'in_stock' : 'out_of_stock';

    if (name && price) results.push({ name, price, originalPrice, imageUrl, productUrl, stockStatus, rating: null, reviewCount: null });
  });
  return results;
}

async function searchMyntra(query: string) {
  const encoded = encodeURIComponent(query);
  const apiUrl = `https://www.myntra.com/gateway/v2/search/${encoded}?rawQuery=${encoded}&ignoreSuggestive=true&results=10`;
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'application/json',
        'x-location-code': 'MH',
      },
      timeout: 10000,
    });
    const products = response.data?.products || response.data?.searchData?.results?.products || [];
    return products.slice(0, 5).map((p: any) => ({
      name: p.productName || p.name,
      price: p.price || p.discountedPrice,
      originalPrice: p.mrp || p.price,
      imageUrl: p.images?.[0]?.src ? `https://assets.myntassets.com/dpr_1.5,q_60,w_400,c_limit,fl_progressive/${p.images[0].src}` : null,
      productUrl: `https://www.myntra.com/${p.slug || p.productId}`,
      stockStatus: p.availability === 'IN_STOCK' ? 'in_stock' : 'out_of_stock',
      rating: p.rating || null,
      reviewCount: p.ratingCount || null,
    }));
  } catch {
    return [];
  }
}

async function searchTitan(query: string) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.titan.co.in/search?q=${encoded}&category=watches`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('li.product-item, div.product-card, div[class*="product"]').slice(0, 5).each((_, el) => {
    const name = $(el).find('a.product-item-link, h2.product-name, div.product-name').text().trim();
    const priceText = $(el).find('span.price, span[class*="price"]').first().text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const imageUrl = $(el).find('img.product-image-photo, img[class*="product"]').attr('src');
    const href = $(el).find('a.product-item-link, a[class*="product"]').attr('href');
    const productUrl = href?.startsWith('http') ? href : href ? `https://www.titan.co.in${href}` : null;
    if (name && price) results.push({ name, price, originalPrice: price, imageUrl, productUrl, stockStatus: 'in_stock', rating: null, reviewCount: null });
  });
  return results;
}

async function searchHmt(query: string) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.hmtwatches.in/?s=${encoded}&post_type=product`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('li.product, div.product-small').slice(0, 5).each((_, el) => {
    const name = $(el).find('h2.woocommerce-loop-product__title, p.name, h3').text().trim();
    const priceText = $(el).find('span.woocommerce-Price-amount, ins span.woocommerce-Price-amount').first().text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const origText = $(el).find('del span.woocommerce-Price-amount').text();
    const originalPrice = parseFloat(origText.replace(/[^0-9.]/g, '')) || price;
    const imageUrl = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src');
    const productUrl = $(el).find('a.woocommerce-LoopProduct-link').attr('href');
    const stockStatus = $(el).find('p.stock.out-of-stock').length ? 'out_of_stock' : 'in_stock';
    if (name && price) results.push({ name, price, originalPrice, imageUrl, productUrl, stockStatus, rating: null, reviewCount: null });
  });
  return results;
}

async function searchTataCliq(query: string) {
  const encoded = encodeURIComponent(query);
  const apiUrl = `https://api.tatacliq.com/moglilabs/category-api/v3/web/search?q=${encoded}&searchType=manual&willVary=true&start=0&sz=6`;
  try {
    const response = await axios.get(apiUrl, {
      headers: { 'User-Agent': getRandomUA(), 'Accept': 'application/json' },
      timeout: 10000,
    });
    const items = response.data?.searchresult?.products?.productList || [];
    return items.slice(0, 5).map((p: any) => ({
      name: p.productName,
      price: p.priceInfo?.sellingPrice || p.priceInfo?.mrp,
      originalPrice: p.priceInfo?.mrp,
      imageUrl: p.imageURL ? `https://assets.tatacliq.com${p.imageURL}` : null,
      productUrl: `https://www.tatacliq.com${p.pdpUrl || ''}`,
      stockStatus: p.isInStock ? 'in_stock' : 'out_of_stock',
      rating: p.ratingCount || null,
      reviewCount: null,
    }));
  } catch {
    return [];
  }
}

async function searchNykaa(query: string) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.nykaa.com/search/result/?q=${encoded}&category_filter=watches`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  try {
    const nextData = JSON.parse($('#__NEXT_DATA__').html() || '{}');
    const products = nextData?.props?.pageProps?.searchData?.products || [];
    return products.slice(0, 5).map((p: any) => ({
      name: p.name,
      price: p.price || p.discountedPrice,
      originalPrice: p.mrp,
      imageUrl: p.imageUrl,
      productUrl: `https://www.nykaa.com${p.slug}`,
      stockStatus: p.inStock ? 'in_stock' : 'out_of_stock',
      rating: p.averageRating || null,
      reviewCount: p.numberOfReviews || null,
    }));
  } catch {
    return [];
  }
}

async function searchMeesho(query: string) {
  try {
    const response = await axios.post('https://meesho.com/api/v1/products/search', {
      query,
      filters: {},
      page: 1,
      limit: 6,
    }, {
      headers: {
        'User-Agent': getRandomUA(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000,
    });
    const products = response.data?.products || response.data?.data?.products || [];
    return products.slice(0, 5).map((p: any) => ({
      name: p.name || p.productName,
      price: p.price || p.sellingPrice,
      originalPrice: p.mrp || p.price,
      imageUrl: p.images?.[0] || p.imageUrl,
      productUrl: `https://www.meesho.com/product/${p.id || p.productId}`,
      stockStatus: 'in_stock',
      rating: p.rating || null,
      reviewCount: p.ratingCount || null,
    }));
  } catch {
    return [];
  }
}

async function searchAjio(query: string) {
  const encoded = encodeURIComponent(query);
  const apiUrl = `https://www.ajio.com/api/search?text=${encoded}&category=watches&start=0&sz=6`;
  try {
    const response = await axios.get(apiUrl, {
      headers: { 'User-Agent': getRandomUA(), 'Accept': 'application/json' },
      timeout: 10000,
    });
    const products = response.data?.products || [];
    return products.slice(0, 5).map((p: any) => ({
      name: p.name,
      price: p.price?.value || p.discountedPrice,
      originalPrice: p.wasPrice?.value || p.price?.value,
      imageUrl: p.images?.[0]?.url ? `https://assets.ajio.com${p.images[0].url}` : null,
      productUrl: `https://www.ajio.com${p.url}`,
      stockStatus: p.stock?.stockLevelStatus === 'inStock' ? 'in_stock' : 'out_of_stock',
      rating: null,
      reviewCount: null,
    }));
  } catch {
    return [];
  }
}

async function searchSnapdeal(query: string) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.snapdeal.com/search?keyword=${encoded}&categoryId=watches`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];

  $('div.product-tuple-listing, div[class*="product-tuple"]').slice(0, 5).each((_, el) => {
    const name = $(el).find('p.product-title, div.product-title').text().trim();
    const priceText = $(el).find('span.product-price, div.lfloat.product-price').text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const origText = $(el).find('span.product-desc-price, span.strike').text();
    const originalPrice = parseFloat(origText.replace(/[^0-9.]/g, '')) || price;
    const imageUrl = $(el).find('img.product-image, img[class*="product"]').attr('src');
    const href = $(el).find('a[class*="product"]').attr('href');
    const productUrl = href?.startsWith('http') ? href : null;
    if (name && price) results.push({ name, price, originalPrice, imageUrl, productUrl, stockStatus: 'in_stock', rating: null, reviewCount: null });
  });
  return results;
}

export const PLATFORMS = [
  { id: 'amazon',   name: 'Amazon.in',        searchFn: searchAmazon   },
  { id: 'flipkart', name: 'Flipkart',          searchFn: searchFlipkart },
  { id: 'myntra',   name: 'Myntra',            searchFn: searchMyntra   },
  { id: 'titan',    name: 'Titan.co.in',       searchFn: searchTitan    },
  { id: 'hmt',      name: 'HMTWatches.com',    searchFn: searchHmt      },
  { id: 'tatacliq', name: 'Tata Cliq',         searchFn: searchTataCliq },
  { id: 'nykaa',    name: 'Nykaa Fashion',     searchFn: searchNykaa    },
  { id: 'meesho',   name: 'Meesho',            searchFn: searchMeesho   },
  { id: 'ajio',     name: 'AJIO',              searchFn: searchAjio     },
  { id: 'snapdeal', name: 'Snapdeal',          searchFn: searchSnapdeal },
];

export default async function searchWatch(req: any, res: any) {
  // CORS headers — required for browser fetches from Vercel frontend
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { return res.status(200).json({}); }

  if (req.method !== 'POST') {
    return res.status(200).json({ success: false, error: 'Method not allowed', results: [] });
  }

  const query = req.body?.query || (typeof req.body === 'string' ? JSON.parse(req.body).query : null);
  if (!query?.trim()) return res.status(200).json({ success: false, error: 'Query required', results: [] });

  try {
    // Wrap each platform search in an individual timeout so slow scrapers don't block the response
    const withTimeout = (fn: Promise<any>, ms: number) =>
      Promise.race([fn, new Promise<any[]>((resolve) => setTimeout(() => resolve([]), ms))]);

    const settled = await Promise.allSettled(
      PLATFORMS.map(p =>
        withTimeout(
          p.searchFn(query).then((results: any) => ({ platform: p, results })),
          8000
        )
      )
    );

    const allResults: any[] = [];
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled' && outcome.value?.results?.length) {
        for (const r of outcome.value.results) {
          allResults.push({
            platform: outcome.value.platform.id,
            platformName: outcome.value.platform.name,
            name: r.name,
            price: r.price,
            originalPrice: r.originalPrice || r.price,
            imageUrl: r.imageUrl,
            productUrl: r.productUrl,
            stockStatus: r.stockStatus || 'unknown',
            rating: r.rating || null,
            reviewCount: r.reviewCount || null,
          });
        }
      }
    }

    allResults.sort((a, b) => (a.price || 9999999) - (b.price || 9999999));

    return res.json({ success: true, query, results: allResults, total: allResults.length });
  } catch (error: any) {
    console.error('Error in searchWatch:', error);
    return res.status(200).json({ success: false, error: error.message || 'Internal server error', results: [] });
  }
}
