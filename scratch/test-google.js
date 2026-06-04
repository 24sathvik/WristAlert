import axios from 'axios';
import * as cheerio from 'cheerio';

async function searchGoogle(query) {
  try {
    const encoded = encodeURIComponent(query + ' watch buy india');
    const url = `https://www.google.co.in/search?q=${encoded}&gl=in`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    console.log(`[OK] Google Search. Status: ${res.status}. Data length: ${res.data.length}`);
    const $ = cheerio.load(res.data);
    const links = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.startsWith('http')) {
        links.push(href);
      }
    });
    
    // Filter for our platforms
    const platforms = ['amazon.in', 'flipkart.com', 'myntra.com', 'titan.co.in', 'hmtwatches.in', 'tatacliq.com', 'nykaa.com', 'meesho.com', 'ajio.com', 'snapdeal.com'];
    
    const matchedLinks = links.filter(link => platforms.some(p => link.includes(p)));
    console.log(matchedLinks.slice(0, 10));
  } catch (e) {
    console.log(`[FAIL] ${e.message}`);
    if (e.response) console.log(`Status: ${e.response.status}`);
  }
}

searchGoogle('Casio F91W');
