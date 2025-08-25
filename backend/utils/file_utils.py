"""File handling utilities."""
import uuid
import urllib.parse
from pathlib import Path
from typing import Optional


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename using UUID only."""
    file_path = Path(original_filename)
    unique_filename = f"{uuid.uuid4()}{file_path.suffix}"
    return unique_filename


def extract_original_filename(filename: str) -> str:
    """For UUID-only filenames, this function is not needed but kept for compatibility."""
    return filename


def is_allowed_file(filename: str, allowed_extensions: set) -> bool:
    """Check if file extension is allowed."""
    return Path(filename).suffix.lower() in allowed_extensions


def find_file_by_name(directory: Path, filename: str) -> Optional[Path]:
    """Find file by name with URL encoding/decoding fallback."""
    if not directory.exists():
        return None
    
    # Try direct match
    file_path = directory / filename
    if file_path.exists():
        return file_path
    
    # Try URL decoded filename
    try:
        decoded_filename = urllib.parse.unquote(filename)
        decoded_path = directory / decoded_filename
        if decoded_path.exists():
            return decoded_path
    except Exception:
        pass
    
    # Search through all files
    for existing_file in directory.iterdir():
        if not existing_file.is_file():
            continue
            
        if existing_file.name == filename:
            return existing_file
            
        try:
            if (urllib.parse.quote(existing_file.name) == filename or 
                urllib.parse.unquote(existing_file.name) == filename):
                return existing_file
        except Exception:
            continue
    
    return None