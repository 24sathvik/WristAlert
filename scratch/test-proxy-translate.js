import axios from 'axios';
import * as cheerio from 'cheerio';

async function testTranslateProxy(url) {
  try {
    const encoded = encodeURIComponent(url);
    const proxyUrl = `https://translate.google.com/translate?sl=en&tl=en&u=${encoded}`;
    const res = await axios.get(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 15000
    });
    console.log(`[OK] Proxy Status: ${res.status}. Length: ${res.data.length}`);
    return cheerio.load(res.data);
  } catch(e) {
    console.log(`[FAIL] Proxy Error: ${e.message}`);
    return null;
  }
}

async function run() {
  const flipkart = await testTranslateProxy('https://www.flipkart.com/search?q=casio+f91w');
  if (flipkart) {
    const p = flipkart('a.VJA3rP, a.WKTcLC, div._4rR01T, a.s1Q9rs, div.KzDlHZ, div._2WkVRV').length;
    console.log('Flipkart proxy products:', p);
  }
}

run();
