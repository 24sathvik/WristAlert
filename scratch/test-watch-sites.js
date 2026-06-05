import axios from 'axios';
import * as cheerio from 'cheerio';

async function testSite(name, url) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 10000
    });
    console.log(`[OK] ${name} Status: ${res.status}. Length: ${res.data.length}`);
    return cheerio.load(res.data);
  } catch(e) {
    console.log(`[FAIL] ${name} Error: ${e.message}`);
    return null;
  }
}

async function run() {
  const query = 'Casio F91W';
  const encoded = encodeURIComponent(query);
  
  // Casio India Shop
  const casio = await testSite('CasioIndia', `https://www.casioindiashop.com/search/${encoded}`);
  if (casio) {
    const p = casio('.product-item').length;
    console.log('Casio products:', p);
  }

  // JustInTime
  const jit = await testSite('JustInTime', `https://justintime.in/search?q=${encoded}`);
  if (jit) {
    const p = jit('.product-card').length || jit('.grid__item').length;
    console.log('JustInTime products:', p);
  }

  // SwissTimeHouse
  const sth = await testSite('SwissTimeHouse', `https://www.swisstimehouse.com/search?q=${encoded}`);
  if (sth) {
    const p = sth('.product-item').length || sth('li.item').length;
    console.log('SwissTimeHouse products:', p);
  }
  
  // Helios
  const helios = await testSite('Helios', `https://www.helioswatchstore.com/search?q=${encoded}`);
  if (helios) {
    const p = helios('.product-item').length || helios('.item').length;
    console.log('Helios products:', p);
  }
}

run();
