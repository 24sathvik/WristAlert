import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

async function fetchHtml(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENTS[0],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000
    });
    return res.data;
  } catch (e) {
    console.log(`[Fetch Error] ${e.message}`);
    return '';
  }
}

async function run() {
  const query = 'Casio F91W';
  const encoded = encodeURIComponent(query);
  
  // Myntra HTML
  console.log('\n--- Myntra HTML ---');
  let html = await fetchHtml(`https://www.myntra.com/${encoded.toLowerCase().replace(/%20/g, '-')}`);
  let $ = cheerio.load(html);
  let script = $('script').filter((_, el) => $(el).html().includes('searchData')).html();
  if (script) console.log('Found searchData in Myntra HTML script!');
  else console.log('Myntra: Could not find searchData in HTML.');

  // Tata Cliq HTML
  console.log('\n--- TataCliq HTML ---');
  html = await fetchHtml(`https://www.tatacliq.com/search/?searchCategory=all&text=${encoded}`);
  $ = cheerio.load(html);
  let nextData = $('#__NEXT_DATA__').html();
  if (nextData) console.log('Found NEXT_DATA in TataCliq HTML!');
  else console.log('TataCliq: No NEXT_DATA found.');
  
  // Meesho HTML
  console.log('\n--- Meesho HTML ---');
  html = await fetchHtml(`https://www.meesho.com/search?q=${encoded}`);
  $ = cheerio.load(html);
  nextData = $('#__NEXT_DATA__').html();
  if (nextData) console.log('Found NEXT_DATA in Meesho HTML!');
  else console.log('Meesho: No NEXT_DATA found.');

  // Ajio HTML
  console.log('\n--- Ajio HTML ---');
  html = await fetchHtml(`https://www.ajio.com/search/?text=${encoded}`);
  $ = cheerio.load(html);
  if (html.includes('window.__PRELOADED_STATE__')) console.log('Found PRELOADED_STATE in Ajio HTML!');
  else console.log('Ajio: No preloaded state found.');
}

run();
