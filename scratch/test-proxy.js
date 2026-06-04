import axios from 'axios';

async function testProxy(name, targetUrl) {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
  ];
  
  for (const proxy of proxies) {
    console.log(`\nTesting ${name} via ${new URL(proxy).hostname}...`);
    try {
      const res = await axios.get(proxy, { timeout: 10000 });
      console.log(`[OK] Status: ${res.status}. Data length: ${JSON.stringify(res.data).length}`);
      if (JSON.stringify(res.data).length > 1000) {
        console.log(`SUCCESS with ${proxy}`);
        return;
      }
    } catch (e) {
      console.log(`[FAIL] ${e.message}`);
    }
  }
}

async function run() {
  const query = encodeURIComponent('Casio F91W');
  await testProxy('Myntra', `https://www.myntra.com/gateway/v2/search/${query}?rawQuery=${query}&ignoreSuggestive=true&results=10`);
  await testProxy('Flipkart HTML', `https://www.flipkart.com/search?q=${query}&category=watches`);
}

run();
