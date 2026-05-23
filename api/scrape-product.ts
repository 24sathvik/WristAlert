import { scrapeByMetadata, scrapeWithPlaywright } from './utils/scrapers.js';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }

  try {
    let data = await scrapeByMetadata(url);
    
    // If critical fields missing, try Playwright
    if (!data.price || !data.name) {
      console.log('[Scraper] Layer 1 incomplete, trying Playwright...');
      data = await scrapeWithPlaywright(url);
    }
    
    if (!data.name && !data.price) {
      return res.status(422).json({ success: false, error: 'Could not extract product data from this URL. Please try manual entry.' });
    }
    
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[Scraper] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Scraping failed: ' + error.message });
  }
}
