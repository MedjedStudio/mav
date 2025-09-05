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


def generate_unique_filename_with_path(original_filename: str, file_type: str = "files") -> str:
    """Generate unique filename with hierarchical path."""
    file_path = Path(original_filename)
    unique_filename = f"{uuid.uuid4()}{file_path.suffix}"
    
    # Create hierarchical path
    if file_type == "avatar":
        return f"avatars/{unique_filename}"
    else:
        return f"files/{unique_filename}"


def find_file_by_name(directory: Path, filename: str) -> Optional[Path]:
    """Find file by name with hierarchical structure support."""
    if not directory.exists():
        return None
    
    # If filename contains path (e.g., "avatars/file.jpg"), use it directly
    if "/" in filename:
        file_path = directory / filename
        if file_path.exists():
            return file_path
    else:
        # Try direct match in root
        file_path = directory / filename
        if file_path.exists():
            return file_path
        
        # Search in subdirectories
        for subdir in ["files", "avatars"]:
            subdir_path = directory / subdir
            if subdir_path.exists():
                file_path = subdir_path / filename
                if file_path.exists():
                    return file_path
    
    # Try URL decoded filename
    try:
        decoded_filename = urllib.parse.unquote(filename)
        if "/" in decoded_filename:
            decoded_path = directory / decoded_filename
            if decoded_path.exists():
                return decoded_path
        else:
            # Search in subdirectories for decoded filename
            for subdir in ["files", "avatars"]:
                subdir_path = directory / subdir
                if subdir_path.exists():
                    decoded_path = subdir_path / decoded_filename
                    if decoded_path.exists():
                        return decoded_path
    except Exception:
        pass
    
    # Recursive search through all subdirectories
    for root_dir in directory.rglob("*"):
        if not root_dir.is_file():
            continue
            
        if root_dir.name == filename:
            return root_dir
            
        try:
            if (urllib.parse.quote(root_dir.name) == filename or 
                urllib.parse.unquote(root_dir.name) == filename):
                return root_dir
        except Exception:
            continue
    
    return None


def ensure_upload_directories(base_upload_dir: Path) -> None:
    """Ensure upload directories exist."""
    (base_upload_dir / "files").mkdir(parents=True, exist_ok=True)
    (base_upload_dir / "avatars").mkdir(parents=True, exist_ok=True)