import axios from 'axios';
import * as cheerio from 'cheerio';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchHtml(url) {
  try {
    const res = await axios.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US' },
      timeout: 10000
    });
    return res.data;
  } catch (e) {
    return '';
  }
}

async function searchMyntraHTML(query) {
  const encoded = encodeURIComponent(query.toLowerCase().replace(/ /g, '-'));
  const url = `https://www.myntra.com/${encoded}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  try {
    const script = $('script').filter((_, el) => $(el).html().includes('searchData')).html() || '';
    const match = script.match(/window\.__myx = (.+?);/);
    if (match) {
      const data = JSON.parse(match[1]);
      const products = data.searchData.results.products || [];
      console.log(`Myntra HTML: Found ${products.length} products`);
      return products.slice(0, 5).map(p => ({ name: p.productName, price: p.price }));
    }
  } catch(e) {}
  console.log('Myntra HTML: Failed');
  return [];
}

async function searchFlipkartHTML(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.flipkart.com/search?q=${encoded}&category=watches`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const results = [];
  $('a.VJA3rP, a.WKTcLC, div._4rR01T, a.s1Q9rs, div.KzDlHZ, div._2WkVRV').each((i, el) => {
     results.push($(el).text().trim());
  });
  console.log(`Flipkart HTML: Found ${results.length} elements`);
  return results;
}

async function run() {
  const q = 'Casio F91W';
  console.log(await searchMyntraHTML(q));
  console.log(await searchFlipkartHTML(q));
}
run();
