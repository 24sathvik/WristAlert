import requests
import json
from bs4 import BeautifulSoup
from .base import BaseScraper
from .amazon import CHROME_UAS
import random

class TitanScraper(BaseScraper):
    async def scrape(self, url: str) -> dict:
        try:
            headers = {'User-Agent': random.choice(CHROME_UAS)}
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract from JSON-LD
            scripts = soup.find_all('script', type='application/ld+json')
            price = 0.0
            stock_status = 'unknown'
            
            for script in scripts:
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict):
                        if data.get('@type') == 'Product' and 'offers' in data:
                            offers = data['offers']
                            if isinstance(offers, dict):
                                price = float(offers.get('price', 0))
                                avail = offers.get('availability', '').lower()
                                stock_status = 'in_stock' if 'instock' in avail else 'out_of_stock'
                                break
                except Exception:
                    continue
            
            # Fallback
            if price == 0.0:
                price_elem = soup.find(class_='price-sales')
                if price_elem:
                    price = self.parse_price(price_elem.text)
                    stock_status = 'in_stock'
                    
            return {"price": price, "stock_status": stock_status}
            
        except Exception as e:
            print(f"Titan scrape failed: {e}")
            return {"price": 0.0, "stock_status": "unknown"}
