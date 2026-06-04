const { chromium } = require('playwright');
const cheerio = require('cheerio');

async function testSite(name, url) {
  console.log(`\n--- Testing ${name} ---`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    const html = await page.content();
    console.log(`[OK] Length: ${html.length}`);
    const $ = cheerio.load(html);
    
    if (name === 'Meesho') {
      const products = [];
      $('a[href^="/s/"], a[href^="/p/"]').each((i, el) => {
        const text = $(el).text();
        if (text && text.includes('₹')) products.push(text.substring(0, 50));
      });
      console.log('Meesho products:', products.length);
    }
    if (name === 'Ajio') {
      const state = $('script').filter((_, el) => $(el).html().includes('window.__PRELOADED_STATE__')).html();
      console.log('Ajio state found:', !!state);
    }
    if (name === 'TataCliq') {
      const products = [];
      $('div.ProductDescription__description, a.ProductModule__dummyDiv').each((i, el) => products.push($(el).text()));
      console.log('TataCliq products:', products.length);
    }
    if (name === 'Nykaa') {
      const data = $('#__NEXT_DATA__').html();
      console.log('Nykaa NEXT_DATA found:', !!data);
    }
    if (name === 'Myntra') {
      const script = $('script').filter((_, el) => $(el).html().includes('searchData')).html() || '';
      console.log('Myntra searchData found:', script.includes('searchData'));
    }
    if (name === 'Flipkart') {
      const products = [];
      $('a.VJA3rP, a.WKTcLC, div._4rR01T, a.s1Q9rs, div.KzDlHZ, div._2WkVRV').each((i, el) => products.push($(el).text()));
      console.log('Flipkart products:', products.length);
    }

  } catch (e) {
    console.log(`[FAIL] ${e.message}`);
  }
  await browser.close();
}

async function run() {
  const query = 'Casio F91W';
  const enc = encodeURIComponent(query);
  await testSite('Myntra', `https://www.myntra.com/${query.toLowerCase().replace(/ /g, '-')}`);
  await testSite('Flipkart', `https://www.flipkart.com/search?q=${enc}&category=watches`);
  await testSite('Meesho', `https://www.meesho.com/search?q=${enc}`);
  await testSite('Ajio', `https://www.ajio.com/search/?text=${enc}`);
  await testSite('TataCliq', `https://www.tatacliq.com/search/?searchCategory=all&text=${enc}`);
  await testSite('Nykaa', `https://www.nykaa.com/search/result/?q=${enc}&category_filter=watches`);
}

run();
