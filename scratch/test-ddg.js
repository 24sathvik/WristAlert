import axios from 'axios';
import * as cheerio from 'cheerio';

async function searchDDG(query) {
  try {
    const encoded = encodeURIComponent(`site:amazon.in OR site:flipkart.com OR site:myntra.com OR site:titan.co.in OR site:meesho.com ${query} watch`);
    const url = `https://html.duckduckgo.com/html/?q=${encoded}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    console.log(`[OK] DDG Search. Status: ${res.status}. Data length: ${res.data.length}`);
    const $ = cheerio.load(res.data);
    const results = [];
    $('.result__snippet').each((_, el) => {
      const parent = $(el).closest('.result');
      const title = parent.find('.result__title a').text().trim();
      const href = parent.find('.result__title a').attr('href');
      // DDG uses redirects: //duckduckgo.com/l/?uddg=https%3A%2F%2F...
      let actualUrl = href;
      if (href && href.includes('uddg=')) {
        actualUrl = decodeURIComponent(href.split('uddg=')[1].split('&')[0]);
      }
      if (actualUrl) {
        results.push({ title, url: actualUrl });
      }
    });
    
    console.log(results);
  } catch (e) {
    console.log(`[FAIL] ${e.message}`);
    if (e.response) console.log(`Status: ${e.response.status}`);
  }
}

searchDDG('Casio F91W');
