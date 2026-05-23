import re

def parse_price_text(text: str) -> float:
    if not text:
        return 0.0
    # Remove everything except numbers and decimal point
    cleaned = re.sub(r'[^\d.]', '', text)
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def normalize_stock_status(text: str) -> str:
    text = text.lower().strip()
    if not text:
        return 'in_stock'
        
    if 'out of stock' in text or 'sold out' in text or 'currently unavailable' in text:
        return 'out_of_stock'
    elif 'left in stock' in text or 'only' in text:
        return 'low_stock'
    else:
        return 'in_stock'
