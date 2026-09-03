import os
import json
import logging
import time
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List, Optional

logger = logging.getLogger("bank-segmentation-agent.feature_engineering")

def identify_customer_column(df: pd.DataFrame) -> Optional[str]:
    """
    Intelligently identify the customer ID column.
    Searches exact matches like customer_id, cust_id, id, and substring matches ending with _id.
    """
    cols_lower = [col.lower() for col in df.columns]
    
    # 1. Exact matches
    for target in ['customer_id', 'cust_id', 'id']:
        if target in cols_lower:
            matched_col = df.columns[cols_lower.index(target)]
            logger.info(f"Identified customer ID column (exact match): {matched_col}")
            return matched_col
            
    # 2. Pattern matches (contains customer, cust, or ends with _id)
    for col in df.columns:
        c_low = col.lower()
        if c_low.endswith('_id') or 'customer' in c_low or 'cust' in c_low:
            logger.info(f"Identified customer ID column (pattern match): {col}")
            return col
            
    logger.warning("Could not identify any customer identifier column.")
    return None

def detect_target_columns(df: pd.DataFrame) -> Dict[str, Optional[str]]:
    """
    Auto-detect columns relevant to financial transactions, balances, dates, types, and incomes.
    """
    cols_lower = [col.lower() for col in df.columns]
    targets = {
        "amount": None,
        "balance": None,
        "date": None,
        "income": None,
        "type": None
    }
    
    # Amount keywords
    amt_keywords = ['transaction_amount', 'amount', 'purchases', 'payments', 'spend']
    for kw in amt_keywords:
        for col in df.columns:
            if col.lower() == kw:
                targets["amount"] = col
                break
        if targets["amount"]:
            break
            
    if not targets["amount"]:
        # Fallback to substring match
        for col in df.columns:
            if 'amount' in col.lower() or 'spend' in col.lower() or 'purchase' in col.lower():
                targets["amount"] = col
                break
                
    # Balance keywords
    for col in df.columns:
        if 'balance' in col.lower():
            targets["balance"] = col
            break
            
    # Date keywords
    date_keywords = ['date', 'time', 'timestamp', 'created', 'updated']
    for col in df.columns:
        if any(kw in col.lower() for kw in date_keywords):
            targets["date"] = col
            break
            
    # Income/Salary keywords
    inc_keywords = ['income', 'salary_amount', 'salary', 'revenue', 'earnings']
    for kw in inc_keywords:
        for col in df.columns:
            if kw in col.lower():
                targets["income"] = col
                break
        if targets["income"]:
            break
            
    # Type keywords
    type_keywords = ['type', 'direction', 'transaction_type']
    for col in df.columns:
        if any(kw in col.lower() for kw in type_keywords):
            targets["type"] = col
            break
            
    logger.info(f"Detected target columns: {targets}")
    return targets

def aggregate_customer_row(g: pd.DataFrame, targets: Dict[str, Optional[str]], max_date_dataset: Optional[pd.Timestamp]) -> Dict[str, Any]:
    """
    Calculates features for a single customer group (transaction logs).
    """
    features = {}
    total_tx = len(g)
    features["total_transactions"] = total_tx
    features["frequency"] = total_tx
    
    amt_col = targets["amount"]
    bal_col = targets["balance"]
    date_col = targets["date"]
    inc_col = targets["income"]
    type_col = targets["type"]
    
    # Active Months
    active_m = 1
    if date_col:
        try:
            dates = pd.to_datetime(g[date_col], errors='coerce')
            active_m = int(dates.dt.to_period('M').nunique())
            if active_m == 0:
                active_m = 1
        except Exception:
            active_m = 1
    features["active_months"] = active_m
    features["transactions_per_month"] = float(total_tx / active_m)
    features["transaction_frequency"] = float(total_tx / active_m)

    

    # 1. Transaction Amounts
    if amt_col:
        col_data = pd.to_numeric(g[amt_col], errors='coerce')
        features["average_transaction_amount"] = float(col_data.mean())
        features["maximum_transaction"] = float(col_data.max())
        features["minimum_transaction"] = float(col_data.min())
        features["median_transaction"] = float(col_data.median())
        features["monetary_value"] = float(col_data.sum())
        features["standard_deviation_of_spending"] = float(col_data.std()) if len(col_data) > 1 else 0.0
        features["variance_of_spending"] = float(col_data.var()) if len(col_data) > 1 else 0.0
        
        # Debits and Credits
        if type_col:
            # Type-based debit/credit
            types = g[type_col].astype(str).str.lower()
            debit_mask = types.str.contains('debit|withdrawal|spend|payment|out', regex=True)
            credit_mask = types.str.contains('credit|deposit|income|salary|in', regex=True)
            features["total_debit"] = float(col_data[debit_mask].sum())
            features["total_credit"] = float(col_data[credit_mask].sum())
        else:
            # Amount sign-based debit/credit
            neg_mask = col_data < 0
            pos_mask = col_data > 0
            if neg_mask.any():
                features["total_debit"] = float(col_data[neg_mask].abs().sum())
                features["total_credit"] = float(col_data[pos_mask].sum())
            else:
                # Fallback: assume all are spend/debit, credit from salary
                features["total_debit"] = float(col_data.sum())
                features["total_credit"] = 0.0
                
        if inc_col:
            inc_data = pd.to_numeric(g[inc_col], errors='coerce')
            features["total_credit"] = float(inc_data.sum())
            
        features["average_monthly_spend"] = float(features["total_debit"] / active_m)
        features["average_monthly_income"] = float(features["total_credit"] / active_m)
        
        # Income to Spending ratio
        if features["total_debit"] > 0:
            features["income_to_spending_ratio"] = float(features["total_credit"] / features["total_debit"])
        else:
            features["income_to_spending_ratio"] = 0.0
            
        # Spend Growth
        if date_col and len(g) > 1:
            try:
                sorted_g = g.sort_values(by=date_col)
                half = len(sorted_g) // 2
                first_half_spend = pd.to_numeric(sorted_g[amt_col].iloc[:half], errors='coerce').sum()
                second_half_spend = pd.to_numeric(sorted_g[amt_col].iloc[half:], errors='coerce').sum()
                if first_half_spend > 0:
                    features["transaction_growth"] = float((second_half_spend - first_half_spend) / first_half_spend)
                else:
                    features["transaction_growth"] = 0.0
            except Exception:
                features["transaction_growth"] = 0.0
        else:
            features["transaction_growth"] = 0.0
            
        # Rolling Average Spend
        try:
            features["rolling_average_spend"] = float(col_data.rolling(window=3, min_periods=1).mean().mean())
        except Exception:
            features["rolling_average_spend"] = features["average_transaction_amount"]

    # 2. Date Metrics
    if date_col and max_date_dataset:
        try:
            dates = pd.to_datetime(g[date_col], errors='coerce').sort_values()
            last_tx = dates.max()
            features["recency"] = int((max_date_dataset - last_tx).days)
            features["days_since_last_transaction"] = features["recency"]
            
            if len(dates) > 1:
                features["average_gap_between_transactions"] = float(dates.diff().dt.days.mean())
            else:
                features["average_gap_between_transactions"] = 0.0
        except Exception:
            features["recency"] = 0
            features["days_since_last_transaction"] = 0
            features["average_gap_between_transactions"] = 0.0

    # 3. Balance Metrics
    if bal_col:
        bal_data = pd.to_numeric(g[bal_col], errors='coerce')
        features["average_balance"] = float(bal_data.mean())
        
        # Current balance is latest sorted by date, or simply last element
        if date_col:
            try:
                sorted_g = g.sort_values(by=date_col)
                features["current_balance"] = float(pd.to_numeric(sorted_g[bal_col], errors='coerce').iloc[-1])
            except Exception:
                features["current_balance"] = float(bal_data.iloc[-1])
        else:
            features["current_balance"] = float(bal_data.iloc[-1])
            
        # Balance Trend (regression slope of balance over date-days)
        if len(g) > 1 and date_col:
            try:
                sorted_g = g.sort_values(by=date_col)
                x = (pd.to_datetime(sorted_g[date_col]) - pd.to_datetime(sorted_g[date_col]).min()).dt.days
                y = pd.to_numeric(sorted_g[bal_col], errors='coerce')
                
                # Filter out NaNs
                valid_mask = x.notna() & y.notna()
                x, y = x[valid_mask], y[valid_mask]
                
                if len(x) > 1:
                    cov = np.cov(x, y)
                    var_x = np.var(x)
                    features["balance_trend"] = float(cov[0, 1] / var_x) if var_x > 0 else 0.0
                else:
                    features["balance_trend"] = 0.0
            except Exception:
                features["balance_trend"] = 0.0
        else:
            features["balance_trend"] = 0.0

    return features

def generate_customer_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any], str]:
    """
    Main orchestrator for feature engineering.
    Accepts a cleaned customer dataset and returns:
    1. Features DataFrame (one row per customer)
    2. Summary report metrics dictionary
    3. Path to the saved CSV file
    """
    start_time = time.time()
    
    if df.empty:
        raise ValueError("Cannot perform feature engineering on an empty DataFrame.")
        
    # 1. Auto-detect Customer ID
    cust_col = identify_customer_column(df)
    if not cust_col:
        raise ValueError("Feature engineering failed: Missing customer identifier column in dataset.")
        
    # 2. Auto-detect targets (amounts, balances, dates, etc.)
    targets = detect_target_columns(df)
    
    # List of all possible features we attempt to generate
    expected_features = [
        "customer_id", "total_transactions", "transaction_frequency", "average_transaction_amount",
        "maximum_transaction", "minimum_transaction", "total_debit", "total_credit",
        "average_monthly_spend", "average_monthly_income", "current_balance", "average_balance", "balance_trend",
        "recency", "frequency", "monetary_value", "days_since_last_transaction", "active_months",
        "transactions_per_month", "income_to_spending_ratio", "average_gap_between_transactions",
        "standard_deviation_of_spending", "variance_of_spending", "median_transaction",
        "transaction_growth", "rolling_average_spend"
    ]
    
    # 3. Determine if dataset is transactional (multiple rows per customer ID)
    is_transactional = bool(df[cust_col].duplicated().any())
    logger.info(f"Is transactional dataset: {is_transactional}")
    
    features_rows = []
    
    if is_transactional:
        # Transactional logic
        max_date_dataset = None
        if targets["date"]:
            try:
                max_date_dataset = pd.to_datetime(df[targets["date"]], errors='coerce').max()
            except Exception:
                pass
                
        # Group by customer ID
        grouped = df.groupby(cust_col)
        for name, group in grouped:
            cust_id = str(name)
            cust_features = aggregate_customer_row(group, targets, max_date_dataset)
            cust_features["customer_id"] = cust_id
            features_rows.append(cust_features)
            
        features_df = pd.DataFrame(features_rows)
    else:
        # Pre-aggregated dataset (e.g. credit card dataset, one row per customer)
        logger.info("Dataset is already at customer level. Applying mapping conversion.")
        features_df = pd.DataFrame()
        features_df["customer_id"] = df[cust_col].astype(str)
        
        # Check matching columns
        amt_col = targets["amount"]
        bal_col = targets["balance"]
        inc_col = targets["income"]
        
        # 1. Total Transactions mapping
        tx_col = next((c for c in df.columns if 'trx' in c.lower() or 'transactions' in c.lower()), None)
        if tx_col:
            features_df["total_transactions"] = pd.to_numeric(df[tx_col], errors='coerce').fillna(1).astype(int)
        else:
            features_df["total_transactions"] = 1

        # Guard against real zero values (fillna only catches NaN, not 0)
        features_df["total_transactions"] = features_df["total_transactions"].replace(0, 1)

        features_df["frequency"] = features_df["total_transactions"]
        
        # Active Months/Tenure mapping
        tenure_col = next((c for c in df.columns if 'tenure' in c.lower() or 'months' in c.lower()), None)
        if tenure_col:
            features_df["active_months"] = (
                pd.to_numeric(df[tenure_col], errors="coerce")
                .fillna(1)
                .clip(lower=1)
            )
        else:
            features_df["active_months"] = 12
            
        features_df["transactions_per_month"] = features_df["total_transactions"] / features_df["active_months"]
        features_df["transaction_frequency"] = features_df["transactions_per_month"]
        
        # 2. Spending metrics
        if amt_col:
            df_amt = pd.to_numeric(df[amt_col], errors='coerce').fillna(0.0)
            features_df["average_transaction_amount"] = df_amt / features_df["total_transactions"].replace(0, 1)
            features_df["maximum_transaction"] = df_amt
            features_df["minimum_transaction"] = df_amt
            features_df["median_transaction"] = df_amt
            features_df["monetary_value"] = df_amt
            features_df["total_debit"] = df_amt
            features_df["average_monthly_spend"] = df_amt / features_df["active_months"].replace(0, 1)
            features_df["rolling_average_spend"] = df_amt / features_df["active_months"].replace(0, 1)
            
        # 3. Income metrics
        if inc_col:
            df_inc = pd.to_numeric(df[inc_col], errors='coerce').fillna(0.0)
            features_df["total_credit"] = df_inc
            features_df["average_monthly_income"] = df_inc / features_df["active_months"].replace(0, 1)
        else:
            features_df["total_credit"] = 0.0
            features_df["average_monthly_income"] = 0.0
            
        # Income ratio
        if "total_debit" in features_df.columns:
            features_df["income_to_spending_ratio"] = np.where(
                features_df["total_debit"] > 0,
                features_df["total_credit"] / features_df["total_debit"],
                0.0
            )
            
        # 4. Balance metrics
        if bal_col:
            df_bal = pd.to_numeric(df[bal_col], errors='coerce').fillna(0.0)
            features_df["current_balance"] = df_bal
            features_df["average_balance"] = df_bal

    # Align columns, drop non-existent, fill missing with sensible NaN/defaults
    generated_features = []
    skipped_features = []
    
    for feat in expected_features:
        if feat in features_df.columns:
            generated_features.append(feat)
        else:
            # We skip this feature by adding NaN or omitting. Let's omit if not applicable, 
            # but to align with schemas, we can add it as NaN or omit. 
            # "If required columns are unavailable, skip gracefully. Never crash."
            # Let's keep only what is generated in features_df
            skipped_features.append(feat)
            
    # Final safety net: replace any remaining inf/-inf and NaN in numeric columns.
    # (Divide-by-zero guards above should prevent this, but this catches anything
    # that still slips through so StandardScaler downstream never crashes.)
    numeric_cols = features_df.select_dtypes(include=np.number).columns
    features_df[numeric_cols] = (
        features_df[numeric_cols]
        .replace([np.inf, -np.inf], np.nan)
        .fillna(0)
    )
    remaining_infs = int(np.isinf(features_df[numeric_cols]).sum().sum())
    logger.info(f"Remaining infinities after cleanup: {remaining_infs}")

    # Output paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, "outputs", "features")
    os.makedirs(output_dir, exist_ok=True)
    
    features_csv_path = os.path.join(output_dir, "customer_features.csv")
    report_json_path = os.path.join(output_dir, "feature_report.json")
    
    # Save CSV
    try:
        features_df.to_csv(features_csv_path, index=False)
        logger.info(f"Saved customer features to {features_csv_path}")
    except Exception as e:
        logger.error(f"Failed to write features CSV: {str(e)}")
        raise IOError(f"Write permission error saving features table: {str(e)}") from e
        
    # Execution details
    exec_time = f"{time.time() - start_time:.2f} seconds"
    num_customers = len(features_df)
    num_features = len(generated_features)
    
    report = {
        "number_of_customers": num_customers,
        "number_of_features": num_features,
        "generated_features": generated_features,
        "skipped_features": skipped_features,
        "execution_time": exec_time
    }
    
    # Save Report JSON
    try:
        with open(report_json_path, "w") as f:
            json.dump(report, f, indent=4)
        logger.info(f"Saved feature report to {report_json_path}")
    except Exception as e:
        logger.error(f"Failed to write features report: {str(e)}")
        raise IOError(f"Write permission error saving feature report: {str(e)}") from e

    # 4. Register outputs inside the Artifact Manager
    from backend.utils.artifact_manager import register_artifact
    register_artifact("customer_features", features_csv_path)
    register_artifact("feature_report", report_json_path)

    relative_output_path = "outputs/features/customer_features.csv"
    
    return features_df, report, relative_output_path