import asyncio
import random
from playwright.async_api import async_playwright
from .base import BaseScraper
from .amazon import CHROME_UAS

class FlipkartScraper(BaseScraper):
    async def scrape(self, url: str) -> dict:
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(user_agent=random.choice(CHROME_UAS))
                page = await context.new_page()
                
                try:
                    from playwright_stealth import stealth_async
                    await stealth_async(page)
                except ImportError:
                    pass
                
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(random.uniform(3, 8))
                
                # Random scroll
                await page.evaluate("window.scrollBy(0, window.innerHeight)")
                await asyncio.sleep(random.uniform(1, 3))
                await page.evaluate("window.scrollBy(0, -window.innerHeight/2)")
                
                # Selectors for Flipkart price and stock
                price_element = await page.query_selector('div._30jeq3, div.Nx9bqj')
                price_text = await price_element.inner_text() if price_element else "0"
                
                stock_element = await page.query_selector('div._16FRp0, div.Z8rNN0')
                stock_text = await stock_element.inner_text() if stock_element else "in_stock"
                
                await browser.close()
                
                price = self.parse_price(price_text)
                stock_status = self.parse_stock(stock_text)
                
                return {"price": price, "stock_status": stock_status}
                
        except Exception as e:
            print(f"Flipkart scrape failed: {e}")
            return {"price": 0.0, "stock_status": "unknown"}
