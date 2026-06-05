import axios from 'axios';

async function testFlipkartMobile() {
  try {
    const res = await axios.post('https://1.rome.api.flipkart.com/api/4/page/fetch', {
      pageUri: "/search?q=casio+f91w",
      pageContext: { fetchSeoData: true }
    }, {
      headers: {
        'User-Agent': 'Flipkart/7.39 (Android 10; Pixel 4)',
        'X-User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0',
        'Content-Type': 'application/json'
      }
    });
    console.log("Flipkart Rome API Success:", res.status);
    console.log("Data keys:", Object.keys(res.data));
  } catch (e) {
    console.log("Flipkart Rome API Error:", e.message);
  }
}

async function testMyntraApp() {
  try {
    const res = await axios.get('https://www.myntra.com/gateway/v2/search/casio-f91w', {
      headers: {
        'User-Agent': 'MyntraApp/4.24.0 (Android 10; Pixel 4)',
        'x-location-code': 'MH'
      }
    });
    console.log("Myntra App API Success:", res.status);
  } catch (e) {
    console.log("Myntra App API Error:", e.message);
  }
}

testFlipkartMobile();
testMyntraApp();
