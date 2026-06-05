import * as cheerio from 'cheerio';
import axios from 'axios';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
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
        'Cache-Control': 'no-cache',
      },
      timeout: 8000,
    });
    return response.data;
  } catch {
    return '';
  }
}

// ================= PLATFORM SCRAPERS ================= //

async function searchAmazon(query: string) {
  const url = `https://www.amazon.in/s?k=${encodeURIComponent(query + ' watch')}&i=watches`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('div[data-component-type="s-search-result"]').slice(0, 5).each((_, el) => {
    const name = $(el).find('h2 span.a-text-normal').text().trim();
    const priceWhole = $(el).find('span.a-price-whole').first().text().replace(/[^0-9]/g, '');
    const price = priceWhole ? parseFloat(priceWhole) : null;
    const originalPriceText = $(el).find('span.a-price.a-text-price span.a-offscreen').first().text();
    const originalPrice = originalPriceText ? parseFloat(originalPriceText.replace(/[^0-9.]/g, '')) : price;
    const imageUrl = $(el).find('img.s-image').attr('src');
    const relativeUrl = $(el).find('h2 a.a-link-normal').attr('href');
    const productUrl = relativeUrl ? `https://www.amazon.in${relativeUrl.split('?')[0]}` : null;
    if (name && price) results.push({ name, price, originalPrice, imageUrl, productUrl, stockStatus: 'in_stock' });
  });
  return results;
}

async function searchTitan(query: string) {
  const url = `https://www.titan.co.in/shop/${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('.product-tile').slice(0, 5).each((_, el) => {
    const name = $(el).find('.link.name').text().trim();
    const priceText = $(el).find('.sales .value').text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const origText = $(el).find('.strike-through .value').text();
    const originalPrice = parseFloat(origText.replace(/[^0-9.]/g, '')) || price;
    const imageUrl = $(el).find('img.tile-image').attr('src');
    const relativeUrl = $(el).find('a.link').attr('href');
    const productUrl = relativeUrl ? `https://www.titan.co.in${relativeUrl}` : null;
    if (name && price) results.push({ name, price, originalPrice, imageUrl, productUrl, stockStatus: 'in_stock' });
  });
  return results;
}

async function searchHmt(query: string) {
  const url = `https://www.hmtwatches.in/search?q=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('.product-card').slice(0, 5).each((_, el) => {
    const name = $(el).find('.product-title').text().trim();
    const priceText = $(el).find('.price').text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const imageUrl = $(el).find('img').attr('src');
    const relativeUrl = $(el).find('a').attr('href');
    const productUrl = relativeUrl ? `https://www.hmtwatches.in${relativeUrl}` : null;
    if (name && price) results.push({ name, price, originalPrice: price, imageUrl, productUrl, stockStatus: 'in_stock' });
  });
  return results;
}

async function searchSnapdeal(query: string) {
  const url = `https://www.snapdeal.com/search?keyword=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('.product-tuple-listing').slice(0, 5).each((_, el) => {
    const name = $(el).find('p.product-title').text().trim();
    const priceText = $(el).find('span.lfloat.product-price').text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const origText = $(el).find('span.lfloat.product-desc-price').text();
    const originalPrice = parseFloat(origText.replace(/[^0-9.]/g, '')) || price;
    const imageUrl = $(el).find('img.product-image').attr('data-src') || $(el).find('img.product-image').attr('src');
    const productUrl = $(el).find('a.dp-widget-link').attr('href');
    if (name && price) results.push({ name, price, originalPrice, imageUrl, productUrl, stockStatus: 'in_stock' });
  });
  return results;
}

async function searchCasioIndia(query: string) {
  const url = `https://www.casioindiashop.com/search/${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('.product-item').slice(0, 5).each((_, el) => {
    const name = $(el).find('.product-name a').text().trim();
    const priceText = $(el).find('.price').text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const imageUrl = $(el).find('.product-image img').attr('src');
    const relativeUrl = $(el).find('.product-name a').attr('href');
    const productUrl = relativeUrl ? `https://www.casioindiashop.com${relativeUrl}` : null;
    if (name && price) results.push({ name, price, originalPrice: price, imageUrl, productUrl, stockStatus: 'in_stock' });
  });
  return results;
}

async function searchJustInTime(query: string) {
  const url = `https://justintime.in/search?q=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('.grid__item').slice(0, 5).each((_, el) => {
    const name = $(el).find('.card__heading a').text().trim();
    const priceText = $(el).find('.price-item--sale').text() || $(el).find('.price-item--regular').text();
    const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
    const imageUrl = $(el).find('img').first().attr('src');
    const relativeUrl = $(el).find('.card__heading a').attr('href');
    let productUrl = relativeUrl ? `https://justintime.in${relativeUrl}` : null;
    if (imageUrl && !imageUrl.startsWith('http')) {
      productUrl = `https:${imageUrl}`;
    }
    if (name && price) results.push({ name, price, originalPrice: price, imageUrl, productUrl, stockStatus: 'in_stock' });
  });
  return results;
}

async function searchMyntra(query: string) {
  // Myntra HTML scraper fallback
  try {
    const url = `https://www.myntra.com/${encodeURIComponent(query.toLowerCase().replace(/ /g, '-'))}-watch`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const script = $('script').filter((_, el) => $(el).html()?.includes('searchData') || false).html() || '';
    const match = script.match(/window\.__myx = (.+?);/);
    if (match) {
      const data = JSON.parse(match[1]);
      const products = data.searchData?.results?.products || [];
      return products.slice(0, 5).map((p: any) => ({
        name: p.productName || p.name,
        price: p.price || p.discountedPrice,
        originalPrice: p.mrp || p.price,
        imageUrl: p.images?.[0]?.src ? `https://assets.myntassets.com/dpr_1.5,q_60,w_400,c_limit,fl_progressive/${p.images[0].src}` : null,
        productUrl: `https://www.myntra.com/${p.slug || p.productId}`,
        stockStatus: p.availability === 'IN_STOCK' ? 'in_stock' : 'out_of_stock',
      }));
    }
  } catch {}
  return [];
}

async function searchFlipkart(query: string) {
  try {
    const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}&category=watches`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const results: any[] = [];
    const containers = $('div._1AtVbE, div._13oc-S, div.s1Q9rs, div.cPHDOP').slice(0, 5);
    containers.each((_, el) => {
      const name = $(el).find('div._4rR01T, a.s1Q9rs, div.KzDlHZ, div._2WkVRV, a.WKTcLC').first().text().trim();
      const priceText = $(el).find('div._30jeq3, div._1_WHN1, div.Nx9bqj').first().text();
      const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || null;
      const origText = $(el).find('div._3I9_wc, div._2p6lqe').first().text();
      const originalPrice = parseFloat(origText.replace(/[^0-9.]/g, '')) || price;
      const imageUrl = $(el).find('img._396cs4, img.q6DClP, img._2r_T1I, img.DByuf4').first().attr('src');
      const href = $(el).find('a._1fQZEK, a.s1Q9rs, a._2rpwqI, a.CGtC98').first().attr('href');
      const productUrl = href ? `https://www.flipkart.com${href.split('?')[0]}` : null;
      if (name && price) results.push({ name, price, originalPrice, imageUrl, productUrl, stockStatus: 'in_stock' });
    });
    return results;
  } catch {
    return [];
  }
}

// ================= MAIN ENGINE ================= //

const PLATFORMS = [
  { id: 'amazon', name: 'Amazon', searchFn: searchAmazon },
  { id: 'titan', name: 'Titan', searchFn: searchTitan },
  { id: 'hmt', name: 'HMT', searchFn: searchHmt },
  { id: 'snapdeal', name: 'Snapdeal', searchFn: searchSnapdeal },
  { id: 'casioindia', name: 'Casio India', searchFn: searchCasioIndia },
  { id: 'justintime', name: 'JustInTime', searchFn: searchJustInTime },
  { id: 'myntra', name: 'Myntra', searchFn: searchMyntra },
  { id: 'flipkart', name: 'Flipkart', searchFn: searchFlipkart },
];

export default async function searchWatch(req: any, res: any) {
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
    const withTimeout = (fn: Promise<any>, ms: number) =>
      Promise.race([fn, new Promise<any[]>((resolve) => setTimeout(() => resolve([]), ms))]);

    const settled = await Promise.allSettled(PLATFORMS.map(p => 
      withTimeout(
        p.searchFn(query).then((results: any) => ({ platform: p, results })).catch(() => ({ platform: p, results: [] })),
        12000 // 12 seconds per platform max
      )
    ));

    const allResults = [];
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled' && outcome.value?.results?.length > 0) {
        allResults.push({
          platform: { name: outcome.value.platform.name, id: outcome.value.platform.id },
          results: outcome.value.results
        });
      }
    }

    return res.status(200).json({ success: true, query, results: allResults, total: allResults.length });
  } catch (error: any) {
    console.error('Error in searchWatch:', error);
    return res.status(200).json({ success: false, error: error.message || 'Internal server error', results: [] });
  }
}
