import axios from 'axios';
import * as cheerio from 'cheerio';

async function testYahoo(query) {
  try {
    const encoded = encodeURIComponent(query + ' watch buy india price');
    const url = `https://in.search.yahoo.com/search?p=${encoded}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8'
      },
      timeout: 10000
    });
    console.log(`[OK] Yahoo Search. Status: ${res.status}. Data length: ${res.data.length}`);
    const $ = cheerio.load(res.data);
    const results = [];
    
    $('.algo').each((_, el) => {
      const title = $(el).find('h3.title a').text().trim();
      const link = $(el).find('h3.title a').attr('href');
      const snippet = $(el).find('.compTitle + div, .compText').text().trim();
      
      if (title && link) {
        // Find price in snippet or title
        const priceMatch = (title + ' ' + snippet).match(/₹\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|Rs\.?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
        let price = null;
        if (priceMatch) {
          const raw = priceMatch[1] || priceMatch[2];
          price = parseFloat(raw.replace(/,/g, ''));
        }

        // Try to identify platform from link
        let platform = new URL(link).hostname.replace('www.', '').split('.')[0];
        if (platform === 'flipkart') platform = 'Flipkart';
        else if (platform === 'amazon') platform = 'Amazon';
        else if (platform === 'myntra') platform = 'Myntra';
        else if (platform === 'tatacliq') platform = 'TataCliq';
        else if (platform === 'meesho') platform = 'Meesho';
        else if (platform === 'ajio') platform = 'Ajio';
        else platform = platform.charAt(0).toUpperCase() + platform.slice(1);

        results.push({ name: title, platform, productUrl: link, price: price || 'Check Site', snippet });
      }
    });
    
    console.log(`Found ${results.length} items`);
    console.log(results.slice(0, 5));
  } catch (e) {
    console.log(`[FAIL] ${e.message}`);
    if (e.response) console.log(`Status: ${e.response.status}`);
  }
}

testYahoo('Casio F91W');
