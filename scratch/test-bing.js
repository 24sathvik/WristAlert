import axios from 'axios';
import * as cheerio from 'cheerio';

async function testBing(query) {
  try {
    const encoded = encodeURIComponent(query + ' watch buy india');
    const url = `https://www.bing.com/search?q=${encoded}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-IN,en;q=0.9'
      },
      timeout: 10000
    });
    console.log(`[OK] Bing Status: ${res.status}. Length: ${res.data.length}`);
    const $ = cheerio.load(res.data);
    const results = [];
    $('.b_algo').each((_, el) => {
      const title = $(el).find('h2 a').text();
      const link = $(el).find('h2 a').attr('href');
      const snippet = $(el).find('.b_caption p, .b_algoSlug').text();
      if (title && link) {
        results.push({ title, link, snippet });
      }
    });
    console.log(`Found ${results.length} items`);
    console.log(results.slice(0, 2));
  } catch(e) {
    console.log(`[FAIL] ${e.message}`);
  }
}
testBing('Casio F91W');
