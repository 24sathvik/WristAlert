import asyncio
import random
from playwright.async_api import async_playwright
from .base import BaseScraper

CHROME_UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
]

class AmazonScraper(BaseScraper):
    async def scrape(self, url: str) -> dict:
        retries = 3
        delays = [5, 15, 30]
        
        for attempt in range(retries):
            try:
                async with async_playwright() as p:
                    # Stealth mode is applied implicitly with standard playwright setups or by using playwright-stealth package if needed
                    # For simplicity, we just use random UA
                    browser = await p.chromium.launch(headless=True)
                    context = await browser.new_context(
                        user_agent=random.choice(CHROME_UAS),
                        viewport={'width': 1920, 'height': 1080}
                    )
                    
                    page = await context.new_page()
                    # Apply stealth script if using playwright_stealth
                    try:
                        from playwright_stealth import stealth_async
                        await stealth_async(page)
                    except ImportError:
                        pass
                        
                    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    
                    # Random delay to simulate human
                    await asyncio.sleep(random.uniform(2, 5))
                    
                    price_element = await page.query_selector('.a-price .a-offscreen')
                    if not price_element:
                        price_element = await page.query_selector('#priceblock_ourprice')
                        
                    price_text = await price_element.inner_text() if price_element else "0"
                    
                    stock_element = await page.query_selector('#availability span')
                    stock_text = await stock_element.inner_text() if stock_element else ""
                    
                    await browser.close()
                    
                    price = self.parse_price(price_text)
                    stock_status = self.parse_stock(stock_text)
                    
                    if price > 0:
                        return {"price": price, "stock_status": stock_status}
                    else:
                        raise ValueError("Price could not be parsed.")
                        
            except Exception as e:
                print(f"Amazon scrape failed (attempt {attempt + 1}): {e}")
                if attempt < retries - 1:
                    await asyncio.sleep(delays[attempt])
                else:
                    return {"price": 0.0, "stock_status": "unknown"}
                    
        return {"price": 0.0, "stock_status": "unknown"}
