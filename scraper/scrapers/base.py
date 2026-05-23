from abc import ABC, abstractmethod
from typing import Dict, Any
from utils import parse_price_text, normalize_stock_status

class BaseScraper(ABC):
    
    @abstractmethod
    async def scrape(self, url: str) -> Dict[str, Any]:
        """
        Scrape the given URL and return a dictionary with price and stock_status.
        Expected return format:
        {
            "price": float,
            "stock_status": "in_stock" | "low_stock" | "out_of_stock" | "unknown"
        }
        """
        pass
        
    def parse_price(self, text: str) -> float:
        return parse_price_text(text)
        
    def parse_stock(self, text: str) -> str:
        return normalize_stock_status(text)
