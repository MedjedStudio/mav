import json
import os
from datetime import datetime
from pathlib import Path

def convert_handler(data):
    try:
        url = data.get('url')
        if not url:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "URL parameter is required"})
            }
        
        dummy_text = f"Processed URL: {url}\nTimestamp: {datetime.now().isoformat()}\nStatus: Success"
        
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        file_path = output_dir / filename
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(dummy_text)
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "File saved successfully",
                "url": url,
                "file_location": str(file_path.absolute())
            })
        }
        
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }