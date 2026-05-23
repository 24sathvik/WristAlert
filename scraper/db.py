import re
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load root .env
load_dotenv(dotenv_path='../.env')

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SERVICE_ROLE_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    raise ValueError("Supabase credentials not found in .env")

supabase: Client = create_client(url, key)

def get_active_watches():
    response = supabase.table("watches").select("*").execute()
    return response.data

def insert_price_snapshot(watch_id: str, price: float, stock_status: str):
    data = {
        "watch_id": watch_id,
        "price": price,
        "stock_status": stock_status
    }
    supabase.table("price_snapshots").insert(data).execute()

def update_watch_status(watch_id: str, price: float, stock_status: str):
    data = {
        "current_price": price,
        "stock_status": stock_status,
        "last_scraped_at": "now()"
    }
    supabase.table("watches").update(data).eq("id", watch_id).execute()

def update_watch_failure(watch_id: str, failures: int):
    # This assumes we add a scrape_failure_count to the watches table if we want it
    try:
        supabase.table("watches").update({"last_scraped_at": "now()"}).eq("id", watch_id).execute()
    except Exception as e:
        print(f"Failed to update failure count: {e}")
