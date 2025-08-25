import json
from datetime import datetime

def status_handler(data):
    try:
        return {
            "statusCode": 200,
            "body": json.dumps({
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "service": "mav-api"
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }