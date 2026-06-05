import * as cheerio from 'cheerio';
import axios from 'axios';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export default async function searchWatch(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { return res.status(200).json({}); }

  if (req.method !== 'POST') {
    return res.status(200).json({ success: false, error: 'Method not allowed', results: [] });
  }

  const query = req.body?.query || (typeof req.body === 'string' ? JSON.parse(req.body).query : null);
  if (!query?.trim()) return res.status(200).json({ success: false, error: 'Query required', results: [] });

  try {
    const encoded = encodeURIComponent(query + ' watch buy online india price');
    const url = `https://in.search.yahoo.com/search?p=${encoded}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    const resultsMap = new Map(); // Group by platform
    
    $('.algo').each((_, el) => {
      const title = $(el).find('h3.title a').text().trim();
      let link = $(el).find('h3.title a').attr('href');
      const snippet = $(el).find('.compTitle + div, .compText').text().trim();
      
      if (title && link) {
        // Decode Yahoo redirect URL if necessary
        if (link.includes('RU=')) {
          try {
            link = decodeURIComponent(link.split('RU=')[1].split('/R')[0]);
          } catch(e) {}
        }
        
        // Extract Price
        const priceMatch = (title + ' ' + snippet).match(/₹\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|Rs\.?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
        let price = null;
        if (priceMatch) {
          const raw = priceMatch[1] || priceMatch[2];
          price = parseFloat(raw.replace(/,/g, ''));
        }

        // Determine Platform
        let platformName = 'Unknown';
        try {
          const urlObj = new URL(link);
          platformName = urlObj.hostname.replace('www.', '').split('.')[0];
          if (platformName === 'flipkart') platformName = 'Flipkart';
          else if (platformName === 'amazon') platformName = 'Amazon';
          else if (platformName === 'myntra') platformName = 'Myntra';
          else if (platformName === 'tatacliq') platformName = 'Tata Cliq';
          else if (platformName === 'meesho') platformName = 'Meesho';
          else if (platformName === 'ajio') platformName = 'Ajio';
          else if (platformName === 'nykaa') platformName = 'Nykaa';
          else if (platformName === 'chrono24') platformName = 'Chrono24';
          else if (platformName === 'ethoswatches') platformName = 'Ethos Watches';
          else platformName = platformName.charAt(0).toUpperCase() + platformName.slice(1);
        } catch(e) {}
        
        // Filter out non-shopping sites like Wikipedia or YouTube
        const excluded = ['youtube', 'wikipedia', 'instagram', 'facebook', 'twitter', 'pinterest'];
        if (excluded.includes(platformName.toLowerCase())) return;

        // If we haven't seen this platform yet, add it
        if (!resultsMap.has(platformName) && platformName !== 'Unknown' && link.startsWith('http')) {
          resultsMap.set(platformName, {
            platform: platformName,
            name: title.length > 60 ? title.substring(0, 60) + '...' : title,
            price: price || null,
            productUrl: link,
            originalPrice: null,
            imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400&q=80', // Generic placeholder as search engine doesn't return raw images
            stockStatus: 'in_stock'
          });
        }
      }
    });

    const finalResults = Array.from(resultsMap.values()).map(r => ({
      platform: { name: r.platform, id: r.platform.toLowerCase().replace(' ', '') },
      results: [r]
    }));

    return res.status(200).json({ success: true, query, results: finalResults, total: finalResults.length });
  } catch (error: any) {
    console.error('Error in searchWatch:', error);
    return res.status(200).json({ success: false, error: error.message || 'Internal server error', results: [] });
  }
}
