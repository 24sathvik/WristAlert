import axios from 'axios';
import * as cheerio from 'cheerio';

async function testGoogleShopping(query) {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://www.google.co.in/search?tbm=shop&q=${encoded}&hl=en`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });
    console.log(`Google Shopping Status: ${res.status}`);
    const $ = cheerio.load(res.data);
    
    const results = [];
    $('div.sh-dgr__grid-result, div.sh-dgr__content, div[data-docid]').each((i, el) => {
      const name = $(el).find('h3, .tAxDx').text().trim();
      const priceText = $(el).find('span.a8Pemb, .a8Pemb, span[aria-hidden="true"]').first().text();
      const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
      const vendor = $(el).find('.aULzUe, .IuHnof').text().trim();
      const link = $(el).find('a').attr('href');
      
      let actualUrl = link;
      if (link && link.includes('/url?url=')) {
        actualUrl = decodeURIComponent(link.split('/url?url=')[1].split('&')[0]);
      } else if (link && link.startsWith('/shopping/product/')) {
        actualUrl = `https://www.google.co.in${link}`;
      }
      
      if (name && price && vendor) {
        results.push({ name, price, vendor, actualUrl });
      }
    });
    
    console.log(`Found ${results.length} items`);
    console.log(results.slice(0, 3));
  } catch (e) {
    console.log(`[FAIL] ${e.message}`);
  }
}

testGoogleShopping('Casio F91W');
