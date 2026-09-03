import os
import json
import logging
import time
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List

# Try importing plotly; we handle failures gracefully as per specifications
try:
    import plotly.express as px
    import plotly.graph_objects as go
    import plotly.io as pio
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

logger = logging.getLogger("bank-segmentation-agent.eda")

def generate_basic_statistics(df: pd.DataFrame, numeric_cols: List[str], eda_dir: str) -> Dict[str, Any]:
    """
    Calculate statistical metrics (count, mean, median, min, max, std, variance, 25%, 75%)
    for numeric columns, export them to statistics.csv, and return as a dict.
    """
    if not numeric_cols:
        logger.warning("No numeric columns found to generate basic statistics.")
        return {}
        
    stats_dict = {}
    stats_rows = []
    
    for col in numeric_cols:
        col_data = df[col].dropna()
        if len(col_data) == 0:
            continue
            
        count = len(col_data)
        mean_val = float(col_data.mean())
        median_val = float(col_data.median())
        min_val = float(col_data.min())
        max_val = float(col_data.max())
        std_val = float(col_data.std()) if len(col_data) > 1 else 0.0
        var_val = float(col_data.var()) if len(col_data) > 1 else 0.0
        p25 = float(col_data.quantile(0.25))
        p75 = float(col_data.quantile(0.75))
        
        stats_dict[col] = {
            "count": count,
            "mean": mean_val,
            "median": median_val,
            "min": min_val,
            "max": max_val,
            "std": std_val,
            "variance": var_val,
            "25%": p25,
            "75%": p75
        }
        
        stats_rows.append({
            "column": col,
            "count": count,
            "mean": mean_val,
            "median": median_val,
            "min": min_val,
            "max": max_val,
            "std": std_val,
            "variance": var_val,
            "25%": p25,
            "75%": p75
        })

    # Save to statistics.csv
    csv_path = os.path.join(eda_dir, "statistics.csv")
    try:
        if stats_rows:
            stats_df = pd.DataFrame(stats_rows)
            stats_df.to_csv(csv_path, index=False)
            logger.info(f"Saved basic statistics to {csv_path}")
        else:
            # Create an empty CSV with headers if no data
            pd.DataFrame(columns=["column", "count", "mean", "median", "min", "max", "std", "variance", "25%", "75%"]).to_csv(csv_path, index=False)
    except Exception as e:
        logger.error(f"Failed to save statistics.csv: {str(e)}")
        raise IOError(f"Permission or write error saving statistics.csv: {str(e)}") from e

    return stats_dict

def analyze_missing_values(df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    For every column in the dataframe, compute missing count and missing percentage.
    Returns:
        - A list of dict summaries for all columns
        - A sorted list of top columns with missing values (descending order)
    """
    missing_report = []
    total_rows = len(df)
    
    for col in df.columns:
        missing_count = int(df[col].isna().sum())
        missing_pct = float((missing_count / total_rows) * 100) if total_rows > 0 else 0.0
        missing_report.append({
            "column": col,
            "missing_count": missing_count,
            "missing_percentage": missing_pct
        })
        
    # Sort descending based on missing percentage
    top_missing = sorted(
        [item for item in missing_report if item["missing_count"] > 0],
        key=lambda x: x["missing_percentage"],
        reverse=True
    )
    
    return missing_report, top_missing

def analyze_numeric_columns(df: pd.DataFrame, numeric_cols: List[str]) -> Dict[str, Any]:
    """
    Calculate skewness, kurtosis, IQR, minimum, and maximum for numeric columns.
    """
    numeric_analysis = {}
    for col in numeric_cols:
        col_data = df[col].dropna()
        if len(col_data) == 0:
            continue
            
        skew = float(col_data.skew()) if len(col_data) > 2 else 0.0
        kurt = float(col_data.kurt()) if len(col_data) > 3 else 0.0
        min_val = float(col_data.min())
        max_val = float(col_data.max())
        q75, q25 = col_data.quantile(0.75), col_data.quantile(0.25)
        iqr = float(q75 - q25)
        
        # Replace NaN values with 0.0 for json compliance
        if np.isnan(skew): skew = 0.0
        if np.isnan(kurt): kurt = 0.0
        
        numeric_analysis[col] = {
            "skewness": skew,
            "kurtosis": kurt,
            "minimum": min_val,
            "maximum": max_val,
            "IQR": iqr
        }
    return numeric_analysis

def analyze_categorical_columns(df: pd.DataFrame, categorical_cols: List[str]) -> Dict[str, Any]:
    """
    Compute unique count, top 5 frequent values, and frequency distribution for categorical columns.
    """
    categorical_analysis = {}
    for col in categorical_cols:
        col_data = df[col].dropna()
        num_unique = int(col_data.nunique())
        
        # Calculate value counts
        value_counts = col_data.value_counts()
        
        # Top 5 most frequent
        top_five = []
        for val, count in value_counts.head(5).items():
            top_five.append({
                "value": str(val),
                "count": int(count),
                "percentage": float((count / len(col_data)) * 100) if len(col_data) > 0 else 0.0
            })
            
        # Overall frequency distribution (limited to top 20 to avoid bloated report size)
        freq_dist = {}
        for val, count in value_counts.head(20).items():
            freq_dist[str(val)] = int(count)
            
        categorical_analysis[col] = {
            "unique_values_count": num_unique,
            "top_five_frequent": top_five,
            "frequency_distribution": freq_dist
        }
    return categorical_analysis

def generate_correlation_matrix(df: pd.DataFrame, numeric_cols: List[str], eda_dir: str) -> Dict[str, Any]:
    """
    Generate Pearson Correlation Matrix, save it as correlation.csv, 
    and identify strong positive and strong negative correlations (|r| > 0.70).
    """
    correlation_report = {
        "strong_positive": [],
        "strong_negative": []
    }
    
    corr_path = os.path.join(eda_dir, "correlation.csv")
    
    if len(numeric_cols) < 2:
        logger.warning("Fewer than 2 numeric columns. Skipping correlation matrix.")
        # Save empty correlation CSV
        pd.DataFrame().to_csv(corr_path)
        return correlation_report
        
    try:
        # Calculate Pearson correlation matrix
        corr_matrix = df[numeric_cols].corr(method='pearson')
        corr_matrix.to_csv(corr_path)
        logger.info(f"Saved Pearson correlation matrix to {corr_path}")
        
        # Extract pairs with correlation > 0.70 or < -0.70
        # Iterate over upper triangle of the matrix to avoid duplicate pairs
        columns = corr_matrix.columns
        for i in range(len(columns)):
            for j in range(i + 1, len(columns)):
                col1 = columns[i]
                col2 = columns[j]
                r_val = corr_matrix.iloc[i, j]
                
                if pd.isna(r_val):
                    continue
                    
                correlation_item = {
                    "column_1": col1,
                    "column_2": col2,
                    "correlation": float(round(r_val, 4))
                }
                
                if r_val > 0.70:
                    correlation_report["strong_positive"].append(correlation_item)
                elif r_val < -0.70:
                    correlation_report["strong_negative"].append(correlation_item)
                    
        # Sort values descending by absolute strength
        correlation_report["strong_positive"] = sorted(correlation_report["strong_positive"], key=lambda x: x["correlation"], reverse=True)
        correlation_report["strong_negative"] = sorted(correlation_report["strong_negative"], key=lambda x: x["correlation"])
        
    except Exception as e:
        logger.error(f"Failed to generate/save correlation matrix: {str(e)}")
        raise IOError(f"Permission or write error saving correlation.csv: {str(e)}") from e
        
    return correlation_report

def detect_outliers(df: pd.DataFrame, numeric_cols: List[str], eda_dir: str) -> Dict[str, int]:
    """
    Detect outliers using the IQR method. Outliers are counted but NOT removed.
    Saves outlier counts per column to outlier_report.csv.
    """
    outlier_counts = {}
    outlier_rows = []
    
    for col in numeric_cols:
        col_data = df[col].dropna()
        if len(col_data) == 0:
            outlier_counts[col] = 0
            outlier_rows.append({"column": col, "outlier_count": 0})
            continue
            
        q1 = col_data.quantile(0.25)
        q3 = col_data.quantile(0.75)
        iqr = q3 - q1
        
        if iqr > 0:
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers = col_data[(col_data < lower_bound) | (col_data > upper_bound)]
            count = int(len(outliers))
        else:
            count = 0
            
        outlier_counts[col] = count
        outlier_rows.append({"column": col, "outlier_count": count})
        
    # Save to outlier_report.csv
    csv_path = os.path.join(eda_dir, "outlier_report.csv")
    try:
        outliers_df = pd.DataFrame(outlier_rows)
        outliers_df.to_csv(csv_path, index=False)
        logger.info(f"Saved outlier report to {csv_path}")
    except Exception as e:
        logger.error(f"Failed to save outlier_report.csv: {str(e)}")
        raise IOError(f"Permission or write error saving outlier_report.csv: {str(e)}") from e
        
    return outlier_counts

def calculate_data_quality_score(df: pd.DataFrame, numeric_cols: List[str], outlier_counts: Dict[str, int], base_dir: str) -> Dict[str, Any]:
    """
    Compute a simple data quality score out of 100 based on:
    - Missing value percentages (30% weight)
    - Duplicate rows removed (20% weight)
    - Invalid records filtered (20% weight)
    - Columns with excessive nulls (> 50%) (20% weight)
    - Outliers count relative to row count (10% weight)
    """
    # Start at 100.0
    deductions = 0.0
    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols
    
    # Try reading the cleaning report from sibling directory to fetch duplicates & invalid counts
    duplicates_removed = 0
    invalid_rows_removed = 0
    
    cleaning_report_path = os.path.join(base_dir, "outputs", "cleaning_report.json")
    if os.path.exists(cleaning_report_path):
        try:
            with open(cleaning_report_path, "r") as f:
                cleaning_data = json.load(f)
                duplicates_removed = int(cleaning_data.get("duplicates_removed", 0))
                invalid_rows_removed = int(cleaning_data.get("invalid_rows", 0))
        except Exception as e:
            logger.warning(f"Could not parse cleaning report at {cleaning_report_path}: {str(e)}")
            
    # 1. Missing Values Deduction (Max 30 points)
    # Rationale: more missing data reduces statistical reliability
    total_missing = int(df.isna().sum().sum())
    missing_ratio = total_missing / total_cells if total_cells > 0 else 0.0
    deductions += min(30.0, missing_ratio * 100.0 * 1.5)
    
    # 2. Duplicate rows Deduction (Max 20 points)
    # Rationale: duplicate profiles bias analyses
    original_total = total_rows + duplicates_removed + invalid_rows_removed
    dup_ratio = duplicates_removed / original_total if original_total > 0 else 0.0
    deductions += min(20.0, dup_ratio * 100.0 * 2.0)
    
    # 3. Invalid rows Deduction (Max 20 points)
    # Rationale: dirty inputs represent system data entry issues
    invalid_ratio = invalid_rows_removed / original_total if original_total > 0 else 0.0
    deductions += min(20.0, invalid_ratio * 100.0 * 2.0)
    
    # 4. Columns with excessive nulls (> 50% missing values) (Max 20 points)
    # Rationale: dropped columns or mostly empty columns represent poor metric completeness
    excessive_null_cols_count = 0
    for col in df.columns:
        col_missing_ratio = df[col].isna().sum() / total_rows if total_rows > 0 else 0.0
        if col_missing_ratio > 0.50:
            excessive_null_cols_count += 1
    deductions += min(20.0, excessive_null_cols_count * 5.0)
    
    # 5. Outliers count Deduction (Max 10 points)
    # Rationale: high proportion of extreme values skews means and model generalizability
    total_outliers = sum(outlier_counts.values())
    numeric_cells = total_rows * len(numeric_cols) if numeric_cols else 0
    outlier_ratio = total_outliers / numeric_cells if numeric_cells > 0 else 0.0
    deductions += min(10.0, outlier_ratio * 100.0 * 0.5)
    
    # Compute score
    score = max(0.0, min(100.0, 100.0 - deductions))
    score_rounded = int(round(score))
    
    # Classify rating
    if score_rounded >= 90:
        classification = "Excellent"
    elif score_rounded >= 80:
        classification = "Good"
    elif score_rounded >= 60:
        classification = "Fair"
    else:
        classification = "Poor"
        
    return {
        "score": score_rounded,
        "classification": classification
    }

def generate_visualizations(df: pd.DataFrame, numeric_cols: List[str], categorical_cols: List[str], eda_dir: str) -> List[str]:
    """
    Generate meaningful Plotly charts and save them as HTML files.
    Ensures gracefully catching errors and returning paths.
    """
    visualizations = []
    
    if not PLOTLY_AVAILABLE:
        logger.warning("Plotly is not installed or available. Skipping visualization generation.")
        return visualizations
        
    # 1. Missing Value Bar Chart (only if missing values exist)
    try:
        missing_data = df.isna().sum().reset_index()
        missing_data.columns = ['column', 'missing_count']
        missing_data['missing_percentage'] = (missing_data['missing_count'] / len(df)) * 100
        
        # Filter for columns that actually have missing values
        missing_filtered = missing_data[missing_data['missing_count'] > 0]
        
        if not missing_filtered.empty:
            fig = px.bar(
                missing_filtered,
                x='column',
                y='missing_percentage',
                text='missing_count',
                title='Missing Value Percentages per Column',
                labels={'missing_percentage': 'Missing Percentage (%)', 'column': 'Column Name'},
                template='plotly_white'
            )
            fig.update_traces(textposition='outside', marker_color='rgb(214, 39, 40)')
            fig.update_layout(yaxis_range=[0, 105])
            
            missing_chart_path = os.path.join(eda_dir, "missing_values.html")
            fig.write_html(missing_chart_path)
            visualizations.append("outputs/eda/missing_values.html")
            logger.info("Generated missing values bar chart.")
    except Exception as e:
        logger.error(f"Failed to generate missing values chart: {str(e)}")

    # 2. Correlation Heatmap (if we have at least 2 numeric columns)
    try:
        if len(numeric_cols) >= 2:
            corr_matrix = df[numeric_cols].corr()
            
            fig = go.Figure(data=go.Heatmap(
                z=corr_matrix.values,
                x=corr_matrix.columns,
                y=corr_matrix.index,
                colorscale='RdBu_r', # Red-Blue color scale centered at 0
                zmin=-1,
                zmax=1,
                colorbar=dict(title='Pearson Coefficient')
            ))
            fig.update_layout(
                title='Pearson Correlation Heatmap',
                template='plotly_white',
                xaxis_showgrid=False,
                yaxis_showgrid=False
            )
            
            heatmap_path = os.path.join(eda_dir, "correlation_heatmap.html")
            fig.write_html(heatmap_path)
            visualizations.append("outputs/eda/correlation_heatmap.html")
            logger.info("Generated correlation heatmap.")
    except Exception as e:
        logger.error(f"Failed to generate correlation heatmap: {str(e)}")

    # 3. Numeric Distributions (Histograms and Box plots for top 3 numeric columns to prevent bloating)
    try:
        # Sort columns to show distributions for columns with high variance/importance
        top_numeric = numeric_cols[:3]
        for col in top_numeric:
            col_data = df[col].dropna()
            if len(col_data) == 0:
                continue
                
            # Histogram
            fig_hist = px.histogram(
                df,
                x=col,
                title=f"Distribution (Histogram) of {col.replace('_', ' ').title()}",
                template='plotly_white',
                marginal='rug',
                color_discrete_sequence=['rgb(31, 119, 180)']
            )
            hist_path = os.path.join(eda_dir, f"dist_{col}.html")
            fig_hist.write_html(hist_path)
            visualizations.append(f"outputs/eda/dist_{col}.html")
            
            # Boxplot
            fig_box = px.box(
                df,
                y=col,
                title=f"Box Plot (Outliers) of {col.replace('_', ' ').title()}",
                template='plotly_white',
                color_discrete_sequence=['rgb(255, 127, 14)']
            )
            box_path = os.path.join(eda_dir, f"box_{col}.html")
            fig_box.write_html(box_path)
            visualizations.append(f"outputs/eda/box_{col}.html")
            
            logger.info(f"Generated distribution charts for numeric column: {col}")
    except Exception as e:
        logger.error(f"Failed to generate numeric distribution charts: {str(e)}")

    # 4. Category Frequency Charts (Bar charts for top 3 categorical columns)
    try:
        top_categorical = categorical_cols[:3]
        for col in top_categorical:
            col_data = df[col].dropna()
            if len(col_data) == 0:
                continue
                
            val_counts = col_data.value_counts().head(10).reset_index()
            val_counts.columns = ['value', 'count']
            
            fig = px.bar(
                val_counts,
                x='value',
                y='count',
                title=f"Frequency Counts for {col.replace('_', ' ').title()} (Top 10)",
                labels={'count': 'Record Count', 'value': col.replace('_', ' ').title()},
                template='plotly_white',
                color_discrete_sequence=['rgb(44, 160, 44)']
            )
            fig.update_traces(texttemplate='%{y}', textposition='outside')
            
            cat_path = os.path.join(eda_dir, f"cat_{col}.html")
            fig.write_html(cat_path)
            visualizations.append(f"outputs/eda/cat_{col}.html")
            
            logger.info(f"Generated category frequency chart for: {col}")
    except Exception as e:
        logger.error(f"Failed to generate category frequency charts: {str(e)}")

    return visualizations

def save_report(report_data: Dict[str, Any], eda_dir: str) -> Tuple[str, str]:
    """
    Saves the JSON report and generates a human-readable summary.txt.
    """
    report_path = os.path.join(eda_dir, "eda_report.json")
    summary_path = os.path.join(eda_dir, "summary.txt")
    
    # Save JSON report
    try:
        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=4)
        logger.info(f"Saved eda_report.json to {report_path}")
    except Exception as e:
        logger.error(f"Failed to save eda_report.json: {str(e)}")
        raise IOError(f"Permission or write error saving eda_report.json: {str(e)}") from e

    # Generate summary.txt text structure
    try:
        overview = report_data["dataset_overview"]
        quality = report_data["data_quality_score"]
        missing_vals = report_data["missing_value_analysis"]["top_missing_columns"]
        strong_corr = report_data["correlation_analysis"]
        outliers = report_data["outliers_summary"]
        
        with open(summary_path, "w") as f:
            f.write("=" * 60 + "\n")
            f.write("      AUTOMATED EDA FINDINGS SUMMARY REPORT\n")
            f.write("=" * 60 + "\n\n")
            
            f.write("## 1. DATASET OVERVIEW\n")
            f.write(f" - Total Rows: {overview['rows']}\n")
            f.write(f" - Total Columns: {overview['columns']}\n")
            f.write(f" - Memory Usage: {overview['memory_usage_bytes']} bytes\n")
            f.write(f" - Exact Duplicate Rows: {overview['duplicate_count']}\n\n")
            
            f.write("## 2. DATA QUALITY SCORE\n")
            f.write(f" - Overall Score: {quality['score']}/100\n")
            f.write(f" - Quality Rating: {quality['classification']}\n\n")
            
            f.write("## 3. MISSING VALUE STATISTICS\n")
            if missing_vals:
                f.write(f" - Total columns with missing values: {len(missing_vals)}\n")
                f.write(" - Columns with highest missing percentages:\n")
                for item in missing_vals[:5]:
                    f.write(f"   * {item['column']}: {item['missing_count']} values ({item['missing_percentage']:.2f}%)\n")
            else:
                f.write(" - No missing values detected in the dataset.\n")
            f.write("\n")
            
            f.write("## 4. OUTLIERS ANALYSIS\n")
            total_outliers = sum(outliers.values())
            f.write(f" - Total outliers detected (IQR method): {total_outliers}\n")
            for col, count in outliers.items():
                if count > 0:
                    f.write(f"   * {col}: {count} outliers\n")
            f.write("\n")
            
            f.write("## 5. CORRELATION FINDINGS (|r| > 0.70)\n")
            pos_corr = strong_corr.get("strong_positive", [])
            neg_corr = strong_corr.get("strong_negative", [])
            
            f.write(" - Strong Positive Correlations:\n")
            if pos_corr:
                for item in pos_corr:
                    f.write(f"   * {item['column_1']} <--> {item['column_2']}: {item['correlation']:.2f}\n")
            else:
                f.write("   * None found\n")
                
            f.write(" - Strong Negative Correlations:\n")
            if neg_corr:
                for item in neg_corr:
                    f.write(f"   * {item['column_1']} <--> {item['column_2']}: {item['correlation']:.2f}\n")
            else:
                f.write("   * None found\n")
            f.write("\n")
            f.write("Report generated on relative path: outputs/eda/\n")
            
        logger.info(f"Saved summary.txt to {summary_path}")
    except Exception as e:
        logger.error(f"Failed to generate summary.txt: {str(e)}")
        raise IOError(f"Permission or write error saving summary.txt: {str(e)}") from e
        
    return report_path, summary_path

def run_eda(df: pd.DataFrame) -> Tuple[Dict[str, Any], List[str], List[str]]:
    """
    Orchestrates the full Automated EDA pipeline.
    
    Args:
        df (pd.DataFrame): The cleaned DataFrame to perform EDA on.
        
    Returns:
        Tuple[Dict[str, Any], List[str], List[str]]:
            1. eda_report (dict): Full metadata and statistical values in JSON format.
            2. generated_reports (list): Rel path lists of created CSV/text reports.
            3. visualizations (list): Rel path lists of HTML Plotly charts.
    """
    if df.empty:
        raise ValueError("Cannot perform EDA on an empty DataFrame.")
        
    # Set up folders relative to backend folder
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    eda_dir = os.path.join(base_dir, "outputs", "eda")
    
    # Ensure eda folder exists
    os.makedirs(eda_dir, exist_ok=True)
    
    # Detect column types
    numeric_cols = []
    categorical_cols = []
    
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]) and not pd.api.types.is_datetime64_any_dtype(df[col]):
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)
            
    if not numeric_cols:
        logger.warning("The input dataset does not contain any numeric columns.")
        
    if not categorical_cols:
        logger.warning("The input dataset does not contain any categorical columns.")
        
    # List of reports created to be returned
    generated_reports = [
        "outputs/eda/statistics.csv",
        "outputs/eda/correlation.csv",
        "outputs/eda/outlier_report.csv",
        "outputs/eda/eda_report.json",
        "outputs/eda/summary.txt"
    ]
    
    # 1. Dataset Overview
    rows = len(df)
    cols = len(df.columns)
    memory_usage = int(df.memory_usage(deep=True).sum())
    duplicates_count = int(df.duplicated().sum())
    datatypes = {col: str(dtype) for col, dtype in df.dtypes.items()}
    
    overview = {
        "rows": rows,
        "columns": cols,
        "memory_usage_bytes": memory_usage,
        "duplicate_count": duplicates_count,
        "column_datatypes": datatypes
    }
    
    # 2. Basic Statistics & statistics.csv
    basic_stats = generate_basic_statistics(df, numeric_cols, eda_dir)
    
    # 3. Missing Value Analysis
    missing_all, top_missing = analyze_missing_values(df)
    missing_analysis = {
        "all_columns": missing_all,
        "top_missing_columns": top_missing
    }
    
    # 4. Numeric Column Analysis (skew, kurt, iqr, bounds)
    numeric_analysis = analyze_numeric_columns(df, numeric_cols)
    
    # 5. Categorical Column Analysis
    categorical_analysis = analyze_categorical_columns(df, categorical_cols)
    
    # 6. Correlation Analysis & correlation.csv
    correlation_analysis = generate_correlation_matrix(df, numeric_cols, eda_dir)
    
    # 7. Outliers Summary & outlier_report.csv
    outliers_summary = detect_outliers(df, numeric_cols, eda_dir)
    
    # 8. Data Quality Score
    quality_score = calculate_data_quality_score(df, numeric_cols, outliers_summary, base_dir)
    
    # 9. Plotly HTML Charts
    visualizations = generate_visualizations(df, numeric_cols, categorical_cols, eda_dir)
    
    # 10. Assemble and Save reports
    report_data = {
        "dataset_overview": overview,
        "basic_statistics": basic_stats,
        "missing_value_analysis": missing_analysis,
        "numeric_column_analysis": numeric_analysis,
        "categorical_column_analysis": categorical_analysis,
        "correlation_analysis": correlation_analysis,
        "outliers_summary": outliers_summary,
        "data_quality_score": quality_score
    }
    
    save_report(report_data, eda_dir)
    
    # Register outputs with Artifact Manager
    from backend.utils.artifact_manager import register_artifact
    register_artifact("eda_statistics", os.path.join(eda_dir, "statistics.csv"))
    register_artifact("eda_correlation", os.path.join(eda_dir, "correlation.csv"))
    register_artifact("eda_outlier_report", os.path.join(eda_dir, "outlier_report.csv"))
    register_artifact("eda_report", os.path.join(eda_dir, "eda_report.json"))
    register_artifact("eda_summary", os.path.join(eda_dir, "summary.txt"))
    
    return report_data, generated_reports, visualizations
