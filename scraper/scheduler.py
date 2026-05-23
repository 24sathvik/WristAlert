import asyncio
import os
import requests
from db import get_active_watches, insert_price_snapshot, update_watch_status
from scrapers.amazon import AmazonScraper
from scrapers.flipkart import FlipkartScraper
from scrapers.hmt import HMTScraper
from scrapers.titan import TitanScraper
from scrapers.myntra import MyntraScraper

API_URL = "http://localhost:3000/api/internal/price-update"

async def scrape_watch(watch):
    url = watch['product_url'].lower()
    scraper = None
    
    if 'amazon' in url or 'amzn' in url:
        scraper = AmazonScraper()
    elif 'flipkart' in url:
        scraper = FlipkartScraper()
    elif 'hmtwatches' in url or 'hmt' in url:
        scraper = HMTScraper()
    elif 'titan' in url:
        scraper = TitanScraper()
    elif 'myntra' in url:
        scraper = MyntraScraper()
        
    if not scraper:
        print(f"No scraper found for {url}")
        return
        
    result = await scraper.scrape(watch['product_url'])
    new_price = result['price']
    new_stock = result['stock_status']
    
    if new_price > 0:
        # Check if changed
        if new_price != watch['current_price'] or new_stock != watch['stock_status']:
            print(f"[{watch['retailer']}] {watch['model_name']}: ₹{watch['current_price']} -> ₹{new_price} ({new_stock}) ✓")
            
            # Save snapshot
            insert_price_snapshot(watch['id'], new_price, new_stock)
            # Update watch
            update_watch_status(watch['id'], new_price, new_stock)
            
            # Notify Node.js backend
            try:
                headers = {'Authorization': f'Bearer {os.environ.get("SERVICE_ROLE_KEY")}'}
                requests.post(API_URL, json={'watch_id': watch['id'], 'new_price': new_price}, headers=headers)
            except Exception as e:
                print(f"Failed to notify backend: {e}")
        else:
            print(f"[{watch['retailer']}] {watch['model_name']}: No change")
            update_watch_status(watch['id'], watch['current_price'], watch['stock_status'])
    else:
        print(f"[{watch['retailer']}] {watch['model_name']}: Scrape failed")

async def run_all_scrapes():
    print("Starting scheduled scrape run...")
    watches = get_active_watches()
    if not watches:
        print("No active watches found.")
        return
        
    for watch in watches:
        await scrape_watch(watch)
        
def scrape_all_active_watches():
    # Sync wrapper for APScheduler
    asyncio.run(run_all_scrapes())
