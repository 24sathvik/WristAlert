import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];
const getRandomUA = () => USER_AGENTS[0];

async function testFetch(name, url, method = 'get', headers = {}, data = null) {
  console.log(`\n--- Testing ${name} ---`);
  try {
    const res = await axios({
      method,
      url,
      headers: { 'User-Agent': getRandomUA(), ...headers },
      data,
      timeout: 10000
    });
    console.log(`[OK] Status: ${res.status}. Data length: ${JSON.stringify(res.data).length}`);
    return res.data;
  } catch (e) {
    console.log(`[FAIL] ${e.message}`);
    if (e.response) console.log(`Status: ${e.response.status}`);
  }
}

async function run() {
  const query = 'Casio F91W';
  const encoded = encodeURIComponent(query);
  
  // Myntra
  await testFetch('Myntra', `https://www.myntra.com/gateway/v2/search/${encoded}?rawQuery=${encoded}&ignoreSuggestive=true&results=10`, 'get', { 'x-location-code': 'MH', 'Accept': 'application/json' });
  
  // Tata Cliq
  await testFetch('Tata Cliq', `https://api.tatacliq.com/moglilabs/category-api/v3/web/search?q=${encoded}&searchType=manual&willVary=true&start=0&sz=6`, 'get', { 'Accept': 'application/json' });
  
  // Meesho
  await testFetch('Meesho', 'https://meesho.com/api/v1/products/search', 'post', { 'Content-Type': 'application/json', 'Accept': 'application/json' }, { query, filters: {}, page: 1, limit: 6 });
  
  // Ajio
  await testFetch('Ajio', `https://www.ajio.com/api/search?text=${encoded}&category=watches&start=0&sz=6`, 'get', { 'Accept': 'application/json' });
}

run();
