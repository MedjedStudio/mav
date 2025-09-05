"""Response handling utilities."""
from typing import Dict, Any, List, Optional
from fastapi import HTTPException


def create_error_response(status_code: int, message: str, details: Optional[str] = None) -> HTTPException:
    """Create standardized error response."""
    detail = message
    if details:
        detail = f"{message}: {details}"
    return HTTPException(status_code=status_code, detail=detail)


def create_success_response(message: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create standardized success response."""
    response = {"message": message}
    if data:
        response["data"] = data
    return response


def paginate_results(items: List[Any], page: int = 1, per_page: int = 10) -> Dict[str, Any]:
    """Paginate a list of items."""
    total = len(items)
    start = (page - 1) * per_page
    end = start + per_page
    
    return {
        "items": items[start:end],
        "page": page,
        "per_page": per_page,
        "total": total,
        "pages": (total + per_page - 1) // per_page
    }