import time
from apscheduler.schedulers.background import BackgroundScheduler
from scheduler import scrape_all_active_watches

def main():
    print("Initializing WristAlert Scraper Service...")
    scheduler = BackgroundScheduler()
    
    # Daytime schedule: 8 AM to 11 PM (08:00 - 22:59) - every 15 minutes
    scheduler.add_job(
        scrape_all_active_watches,
        'cron',
        hour='8-22',
        minute='*/15',
        id='daytime_scrape'
    )
    
    # Nighttime schedule: 11 PM to 8 AM (23:00 - 07:59) - every 60 minutes
    scheduler.add_job(
        scrape_all_active_watches,
        'cron',
        hour='23,0-7',
        minute='0',
        id='nighttime_scrape'
    )
    
    scheduler.start()
    print("Scheduler started successfully. Press Ctrl+C to exit.")
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(2)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        print("Scheduler shut down.")

if __name__ == "__main__":
    main()
