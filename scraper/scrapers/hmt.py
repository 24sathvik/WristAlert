import requests
from bs4 import BeautifulSoup
from .base import BaseScraper
from .amazon import CHROME_UAS
import random

class HMTScraper(BaseScraper):
    async def scrape(self, url: str) -> dict:
        try:
            headers = {'User-Agent': random.choice(CHROME_UAS)}
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            price_elem = soup.find(class_='price')
            price_text = price_elem.text if price_elem else "0"
            
            stock_elem = soup.find(class_='availability')
            stock_text = stock_elem.text if stock_elem else "in_stock"
            
            return {
                "price": self.parse_price(price_text),
                "stock_status": self.parse_stock(stock_text)
            }
            
        except Exception as e:
            print(f"HMT scrape failed: {e}")
            return {"price": 0.0, "stock_status": "unknown"}
