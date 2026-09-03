import os
import pandas as pd
from typing import Tuple, List

def format_file_size(size_in_bytes: int) -> str:
    """Format file size in bytes to a human-readable string (e.g., B, KB, MB, GB)."""
    if size_in_bytes < 0:
        return "0 B"
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_in_bytes < 1024.0:
            if unit == 'B':
                return f"{int(size_in_bytes)} B"
            return f"{size_in_bytes:.1f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.1f} PB"

def validate_and_parse_csv(file_path: str) -> Tuple[int, int, List[str]]:
    """
    Reads the CSV file using pandas and returns metadata: (rows, columns, column_names).
    
    Raises:
        pandas.errors.EmptyDataError: If the CSV file is empty.
        pandas.errors.ParserError: If the CSV file is corrupted or cannot be parsed.
        ValueError: For other data validation errors (e.g., not a valid DataFrame structure).
    """
    # Check if the file is completely empty (0 bytes) before parsing
    if os.path.getsize(file_path) == 0:
        raise pd.errors.EmptyDataError("The uploaded CSV file is empty (0 bytes).")
        
    try:
        # Use pandas to read the CSV
        df = pd.read_csv(file_path)
    except pd.errors.EmptyDataError as e:
        raise pd.errors.EmptyDataError("The file does not contain any readable CSV data or header columns.") from e
    except pd.errors.ParserError as e:
        raise pd.errors.ParserError(f"Corrupted or malformed CSV: {str(e)}") from e
    except Exception as e:
        # Catch other errors such as UnicodeDecodeError or parsing issues
        raise ValueError(f"Failed to read CSV file. The format might be invalid: {str(e)}") from e

    # Extra validation: if it parsed but has no columns
    if len(df.columns) == 0:
        raise pd.errors.EmptyDataError("The CSV file must contain at least one column.")

    rows = len(df)
    columns = len(df.columns)
    column_names = [str(col) for col in df.columns]

    return rows, columns, column_names
