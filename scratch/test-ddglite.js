import axios from 'axios';
import * as cheerio from 'cheerio';

async function testDDGLite(query) {
  try {
    const encoded = encodeURIComponent(query + ' watch buy india');
    const res = await axios.post('https://lite.duckduckgo.com/lite/', `q=${encoded}&kl=in-en`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    });
    console.log(`[OK] DDG Lite Status: ${res.status}. Length: ${res.data.length}`);
    const $ = cheerio.load(res.data);
    const results = [];
    $('tr').each((_, el) => {
      const title = $(el).find('.result-snippet').text().trim();
      const link = $(el).find('.result-url').attr('href');
      if (title && link) {
        results.push({ title, link });
      }
    });
    console.log(`Found ${results.length} items`);
    console.log(results.slice(0, 2));
  } catch(e) {
    console.log(`[FAIL] DDG Lite Error: ${e.message}`);
  }
}
testDDGLite('Casio F91W');
