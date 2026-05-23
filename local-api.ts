import express from 'express';
import cors from 'cors';
import scrapeProduct from './api/scrape-product.js';
import watches from './api/watches.js';

const app = express();
app.use(cors());
app.use(express.json());

// Wrapper to adapt Express req/res to Vercel-like handlers if needed, though they are mostly compatible.
app.all('/api/scrape-product', async (req, res) => {
  try { await scrapeProduct(req, res); } catch(e) { res.status(500).json({error: e.message}); }
});

app.all('/api/watches', async (req, res) => {
  try { await watches(req, res); } catch(e) { res.status(500).json({error: e.message}); }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Local API Server running on http://localhost:${PORT}`));
