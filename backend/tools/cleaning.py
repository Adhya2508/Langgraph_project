import os
import time
import json
import logging
import pandas as pd
from typing import Tuple, Dict, Any, List

logger = logging.getLogger("bank-segmentation-agent.cleaning")

def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize column names to lowercase, remove outer spaces, 
    and replace inner spaces with underscores.
    """
    df = df.copy()
    df.columns = [str(col).strip().lower().replace(" ", "_") for col in df.columns]
    logger.info(f"Standardized column names to: {list(df.columns)}")
    return df

def remove_duplicate_rows(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """
    Remove exact duplicate rows. If a 'customer_id' (or 'cust_id') column exists, 
    remove duplicate customer IDs only if the dataset is a profile-level dataset 
    (i.e., not a transactional dataset containing multiple logs per customer).
    """
    initial_rows = len(df)
    df = df.drop_duplicates()
    
    cust_col = 'customer_id' if 'customer_id' in df.columns else ('cust_id' if 'cust_id' in df.columns else None)
    if cust_col:
        # Check if transactional (e.g. columns indicating transaction events: date, amount, spend, payment)
        tx_indicators = ['amount', 'spend', 'transaction', 'date', 'time', 'payment', 'trx']
        is_transactional = any(any(ind in col.lower() for ind in tx_indicators) for col in df.columns)
        
        if not is_transactional:
            df = df.drop_duplicates(subset=[cust_col], keep='first')
            logger.info(f"Deduplicated by customer ID column '{cust_col}' (profile dataset).")
        else:
            logger.info(f"Skipped customer ID column deduplication to preserve transactional history.")
        
    removed = initial_rows - len(df)
    logger.info(f"Removed {removed} duplicate rows.")
    return df, removed
    return df, removed

def handle_missing_values(df: pd.DataFrame) -> Tuple[pd.DataFrame, int, int]:
    """
    Handle missing values in the dataset:
    1. If an entire column is empty (all NaN), drop it.
    2. Fill remaining missing values:
       - Numeric columns: fill using median.
       - Categorical/Object columns: fill using mode.
    """
    df = df.copy()
    initial_cols_count = len(df.columns)
    
    # Drop columns that are entirely null
    df = df.dropna(how='all', axis=1)
    cols_dropped = initial_cols_count - len(df.columns)
    
    filled_count = 0
    for col in df.columns:
        null_mask = df[col].isna()
        null_count = null_mask.sum()
        if null_count > 0:
            if pd.api.types.is_numeric_dtype(df[col]):
                median_val = df[col].median()
                # Fallback in case median itself is NaN (e.g. all values in col were NaN, but not dropped due to other checks)
                if pd.isna(median_val):
                    median_val = 0.0
                df[col] = df[col].fillna(median_val)
                filled_count += int(null_count)
            else:
                mode_series = df[col].mode()
                if not mode_series.empty:
                    mode_val = mode_series.iloc[0]
                else:
                    mode_val = "Unknown"
                df[col] = df[col].fillna(mode_val)
                filled_count += int(null_count)
                
    logger.info(f"Dropped {cols_dropped} empty columns. Filled {filled_count} missing values.")
    return df, filled_count, cols_dropped

def convert_date_columns(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """
    Automatically detect date columns (containing 'date', 'time', 'timestamp', 'created', 'updated' in name)
    and parse them into datetime. Invalid dates are converted to NaT.
    Returns the updated DataFrame and the number of invalid dates that became NaT.
    """
    df = df.copy()
    invalid_dates_count = 0
    date_indicators = ['date', 'time', 'timestamp', 'created', 'updated']
    
    for col in df.columns:
        col_lower = col.lower()
        if any(ind in col_lower for ind in date_indicators):
            if not pd.api.types.is_datetime64_any_dtype(df[col]):
                # Count non-null values before conversion
                non_null_before = df[col].notna().sum()
                
                # Attempt conversion
                df[col] = pd.to_datetime(df[col], errors='coerce', format='mixed')
                
                # Count non-null values after conversion
                non_null_after = df[col].notna().sum()
                
                invalid_dates_count += int(non_null_before - non_null_after)
                
    logger.info(f"Processed date columns. Detected {invalid_dates_count} invalid dates.")
    return df, invalid_dates_count

def data_type_correction(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert columns related to 'balance', 'amount', 'salary', and 'transaction_amount' 
    to numeric. Invalid values become NaN.
    """
    df = df.copy()
    numeric_targets = ['balance', 'amount', 'salary', 'transaction_amount']
    
    for col in df.columns:
        col_lower = col.lower()
        if any(target in col_lower for target in numeric_targets):
            if not pd.api.types.is_numeric_dtype(df[col]):
                df[col] = pd.to_numeric(df[col], errors='coerce')
                
    logger.info("Applied data type corrections to numeric target columns.")
    return df

def remove_invalid_records(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, int]:
    """
    Detect invalid values and filter them from the main dataset:
    - Negative balance
    - Negative transaction amount / amount
    - Impossible ages (<0 or >120)
    - Invalid/Missing customer IDs
    
    Returns:
        clean_df: DataFrame with invalid rows removed.
        invalid_df: DataFrame containing the removed invalid rows.
        invalid_rows_count: Number of invalid rows removed.
    """
    df = df.copy()
    invalid_mask = pd.Series(False, index=df.index)
    
    for col in df.columns:
        col_lower = col.lower()
        
        # 1. Invalid Customer ID (empty/null)
        if col_lower in ['customer_id', 'cust_id']:
            invalid_id = df[col].isna() | (df[col].astype(str).str.strip() == '')
            invalid_mask = invalid_mask | invalid_id
            
        # 2. Negative Balance
        if 'balance' in col_lower:
            vals = pd.to_numeric(df[col], errors='coerce')
            invalid_bal = vals < 0
            invalid_mask = invalid_mask | (invalid_bal.fillna(False))
            
        # 3. Negative Transaction Amount / Amount
        if 'amount' in col_lower:
            vals = pd.to_numeric(df[col], errors='coerce')
            invalid_amt = vals < 0
            invalid_mask = invalid_mask | (invalid_amt.fillna(False))
            
        # 4. Impossible Ages (<0 or >120)
        if 'age' in col_lower:
            vals = pd.to_numeric(df[col], errors='coerce')
            invalid_age = (vals < 0) | (vals > 120)
            invalid_mask = invalid_mask | (invalid_age.fillna(False))

    invalid_df = df[invalid_mask]
    clean_df = df[~invalid_mask]
    invalid_count = int(len(invalid_df))
    
    logger.info(f"Detected {invalid_count} invalid records.")
    return clean_df, invalid_df, invalid_count

def detect_outliers(df: pd.DataFrame) -> Dict[str, int]:
    """
    Detect outliers in all numeric columns using the IQR method.
    Outliers are NOT removed. Returns the number of outliers per column.
    """
    outliers_detected = {}
    for col in df.columns:
        # Check if the column is numeric and not a datetime column
        if pd.api.types.is_numeric_dtype(df[col]) and not pd.api.types.is_datetime64_any_dtype(df[col]):
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            if iqr > 0:
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
                outliers_detected[col] = int(outlier_mask.sum())
            else:
                outliers_detected[col] = 0
                
    logger.info(f"Outliers detected: {outliers_detected}")
    return outliers_detected

def save_outputs(df: pd.DataFrame, invalid_df: pd.DataFrame, report: Dict[str, Any]) -> Tuple[str, str, str]:
    """
    Saves outputs to their designated paths:
    - outputs/cleaned/cleaned_dataset.csv
    - outputs/invalid_records.csv
    - outputs/cleaning_report.json
    
    Raises:
        PermissionError: if there are file writing access issues.
        RuntimeError: for any other OS errors.
    """
    # Resolve the directory paths relative to backend folder
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    outputs_dir = os.path.join(base_dir, "outputs")
    cleaned_dir = os.path.join(outputs_dir, "cleaned")
    
    os.makedirs(cleaned_dir, exist_ok=True)
    
    cleaned_path = os.path.join(cleaned_dir, "cleaned_dataset.csv")
    invalid_path = os.path.join(outputs_dir, "invalid_records.csv")
    report_path = os.path.join(outputs_dir, "cleaning_report.json")
    
    try:
        df.to_csv(cleaned_path, index=False)
        invalid_df.to_csv(invalid_path, index=False)
        with open(report_path, "w") as f:
            json.dump(report, f, indent=4)
    except PermissionError as e:
        logger.error(f"Permission error saving output files: {str(e)}")
        raise PermissionError(f"Failed to write output files due to permission limits: {str(e)}") from e
    except Exception as e:
        logger.error(f"Failed to save cleaning outputs: {str(e)}")
        raise RuntimeError(f"Error saving output files: {str(e)}") from e
        
    logger.info("Cleaning outputs saved successfully.")
    return cleaned_path, invalid_path, report_path

def clean_dataset(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any], str]:
    """
    Exposes the complete dataset cleaning pipeline.
    
    Args:
        df (pd.DataFrame): The input DataFrame to clean.
        
    Returns:
        Tuple[pd.DataFrame, Dict[str, Any], str]:
            1. The cleaned DataFrame
            2. The cleaning summary report dict
            3. The path to the cleaned CSV file relative to the project structure
    """
    start_time = time.time()
    original_rows = len(df)
    
    if df.empty:
        raise ValueError("Cannot clean an empty DataFrame.")
        
    # 1. Normalise column names
    df = standardize_column_names(df)
    
    # 2. Data type correction for bank columns
    df = data_type_correction(df)
    
    # 3. Date parsing
    df, invalid_dates_count = convert_date_columns(df)
    
    # 4. Invalid record removal (stores invalid records separately)
    df, invalid_df, invalid_rows = remove_invalid_records(df)
    
    # 5. Duplicate row removal
    df, duplicates_removed = remove_duplicate_rows(df)
    
    # 6. Missing value handling (drops completely empty cols, imputes remaining)
    df, missing_values_filled, columns_dropped = handle_missing_values(df)
    
    # 7. Outliers detection (using IQR)
    outliers_detected = detect_outliers(df)
    
    # Compute elapsed execution time
    elapsed_time = time.time() - start_time
    execution_time_str = f"{elapsed_time:.2f} seconds"
    
    # 8. Construct report
    report = {
        "original_rows": original_rows,
        "clean_rows": len(df),
        "duplicates_removed": duplicates_removed,
        "missing_values_filled": missing_values_filled,
        "invalid_rows": invalid_rows,
        "columns_dropped": columns_dropped,
        "outliers_detected": outliers_detected,
        "execution_time": execution_time_str
    }
    
    # 9. Save all results
    cleaned_path, invalid_path, report_path = save_outputs(df, invalid_df, report)
    
    # Register outputs with Artifact Manager
    from backend.utils.artifact_manager import register_artifact
    register_artifact("cleaned_dataset", cleaned_path)
    register_artifact("invalid_records", invalid_path)
    register_artifact("cleaning_report", report_path)
    
    # Return path layout matching specifications (relative path)
    relative_cleaned_path = "outputs/cleaned/cleaned_dataset.csv"
    
    return df, report, relative_cleaned_path
