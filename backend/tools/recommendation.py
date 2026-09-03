import os
import yaml
import json
import logging
import time
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List, Optional
from backend.core.execution_context import ExecutionContext
from backend.core.decision_engine import make_decision

logger = logging.getLogger("bank-segmentation-agent.recommendation")

def load_customer_features() -> pd.DataFrame:
    """Load the latest customer features CSV via Artifact Manager."""
    from backend.utils.artifact_manager import get_latest_artifact
    path = get_latest_artifact("customer_features")
    if not path or not os.path.exists(path):
        raise ValueError("Missing customer features artifact. Please run feature engineering first.")
    try:
        return pd.read_csv(path)
    except Exception as e:
        raise ValueError(f"Failed to read customer features from {path}: {str(e)}")

def load_segmentation_results() -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """Load segment mapping CSV and cluster summary JSON via Artifact Manager."""
    from backend.utils.artifact_manager import get_latest_artifact
    mapping_path = get_latest_artifact("segment_mapping")
    summary_path = get_latest_artifact("cluster_summary")
    
    if not mapping_path or not os.path.exists(mapping_path):
        raise ValueError("Missing segment mapping artifact. Please run segmentation first.")
    if not summary_path or not os.path.exists(summary_path):
        raise ValueError("Missing cluster summary artifact. Please run segmentation first.")
        
    try:
        mapping_df = pd.read_csv(mapping_path)
    except Exception as e:
        raise ValueError(f"Failed to read segment mappings from {mapping_path}: {str(e)}")
        
    try:
        with open(summary_path, "r") as f:
            cluster_summary = json.load(f)
    except Exception as e:
        raise ValueError(f"Failed to read cluster summary from {summary_path}: {str(e)}")
        
    return mapping_df, cluster_summary

def load_business_rules() -> Dict[str, Any]:
    """Load recommendation rules from config YAML."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    rules_path = os.path.join(base_dir, "config", "recommendation_rules.yaml")
    
    if not os.path.exists(rules_path):
        raise ValueError(f"Recommendation rules configuration missing at {rules_path}")
        
    try:
        with open(rules_path, "r") as f:
            rules_config = yaml.safe_load(f)
            if not rules_config or "recommendation_rules" not in rules_config:
                raise ValueError("Corrupted recommendation rules configuration: 'recommendation_rules' key not found.")
            return rules_config["recommendation_rules"]
    except Exception as e:
        raise ValueError(f"Failed to load recommendation rules: {str(e)}")

def generate_recommendations_report(
    customer_recs: List[Dict[str, Any]],
    segment_recs: Dict[str, Any],
    stats: Dict[str, Any]
) -> str:
    """Constructs a non-technical recommendation summary report."""
    lines = []
    lines.append("==========================================================")
    lines.append("        EXECUTIVE CUSTOMER RECOMMENDATIONS REPORT")
    lines.append("==========================================================")
    lines.append("")
    lines.append(f"Total Customers Processed: {stats['total_customers']}")
    lines.append(f"High Priority Actions Identified: {stats['priority_counts'].get('Very High Priority', 0) + stats['priority_counts'].get('High Priority', 0)}")
    lines.append("")
    lines.append("## PRIORITY ACTION COUNTS BY SEGMENT")
    for seg, count in stats["segment_counts"].items():
        lines.append(f" - {seg}: {count} customers")
    lines.append("")
    lines.append("## RECOMMENDED STRATEGIES BY SEGMENT")
    for seg, details in segment_recs.items():
        lines.append(f"### Segment: {seg}")
        lines.append(f" - Strategy: {details['recommendation']}")
        lines.append(f" - Expected Benefit: {details['expected_benefit']}")
        lines.append(f" - Target Offerings: {', '.join(details['products'])}")
        lines.append("")
    lines.append("==========================================================")
    return "\n".join(lines)

def run_recommendations(context: ExecutionContext) -> Tuple[pd.DataFrame, Dict[str, Any], str]:
    """
    Main orchestrator for Recommendation Engine.
    Evaluates business rules against customer features, prioritizes profiles,
    exports CSV/JSON reports, updates run metadata, and registers outputs.
    
    Args:
        context (ExecutionContext): Run context holding threshold limits.
        
    Returns:
        Tuple[pd.DataFrame, Dict[str, Any], str]:
            1. Customer Recommendations DataFrame.
            2. Statistics metrics dictionary.
            3. Path to the saved customer recommendations CSV.
    """
    start_time = time.time()
    
    # 1. Load artifacts
    features_df = load_customer_features()
    mapping_df, cluster_summary = load_segmentation_results()
    rules = load_business_rules()
    
    cust_col = 'customer_id' if 'customer_id' in features_df.columns else ('cust_id' if 'cust_id' in features_df.columns else None)
    if not cust_col:
        for col in features_df.columns:
            if col.lower().endswith('id') or 'customer' in col.lower() or 'cust' in col.lower():
                cust_col = col
                break
                
    if not cust_col:
        raise ValueError("Missing customer identifier column in features.")
        
    # Calculate dataset population statistics for scoring normalization
    df_numeric = features_df.drop(columns=[cust_col])
    numeric_cols = list(df_numeric.select_dtypes(include=[np.number]).columns)
    overall_stats = df_numeric[numeric_cols].mean().to_dict()
    
    # 2. Iterate and generate customer-level recommendations via Decision Engine
    recs_records = []
    
    # Merge mapping to resolve segment label
    merged = features_df.merge(mapping_df, on=cust_col)
    
    for idx, row in merged.iterrows():
        cust_id = str(row[cust_col])
        segment_label = str(row["business_label"])
        
        # Build individual profile dictionary
        profile = row.to_dict()
        
        # Call Decision Engine
        decision = make_decision(profile, segment_label, rules, overall_stats, context)
        
        recs_records.append({
            "customer_id": cust_id,
            "cluster_id": int(row["cluster_id"]),
            "business_label": segment_label,
            "recommendation": decision["recommendation"],
            "reason": decision["reason"],
            "priority": decision["priority"],
            "confidence_score": decision["confidence_score"],
            "expected_benefit": decision["expected_benefit"],
            "recommended_products": ", ".join(decision["products"])
        })
        
    recs_df = pd.DataFrame(recs_records)
    
    # 3. Filter high-priority customers
    high_priority_df = recs_df[recs_df["priority"].isin(["Very High Priority", "High Priority"])]
    
    # 4. Generate segment-level recommendations
    segment_recs_summary = {}
    for c_info in cluster_summary:
        seg_label = c_info["business_label"]
        clean_label = seg_label.split(" (Cluster ")[0] if " (Cluster " in seg_label else seg_label
        
        rule = rules.get(clean_label, rules.get("Standard Customers"))
        segment_recs_summary[seg_label] = {
            "recommendation": rule["recommendation"],
            "expected_benefit": rule["expected_benefit"],
            "products": rule["products"],
            "customer_count": c_info["customer_count"],
            "percentage": c_info["percentage"]
        }
        
    # 5. Calculate statistics metrics
    priority_counts = recs_df["priority"].value_counts().to_dict()
    segment_counts = recs_df["business_label"].value_counts().to_dict()
    total_products = sum(len(rule.get("products", [])) for rule in rules.values())
    
    stats = {
        "total_customers": len(recs_df),
        "priority_counts": priority_counts,
        "segment_counts": segment_counts,
        "total_products_available": total_products,
        "high_priority_customers_count": len(high_priority_df),
        "execution_time": f"{time.time() - start_time:.2f} seconds"
    }
    
    # 6. Generate business summary text
    summary_text = generate_recommendations_report(recs_records, segment_recs_summary, stats)
    
    # 7. Write outputs to outputs/recommendations/
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, "outputs", "recommendations")
    os.makedirs(output_dir, exist_ok=True)
    
    recs_csv_path = os.path.join(output_dir, "customer_recommendations.csv")
    priority_csv_path = os.path.join(output_dir, "priority_customers.csv")
    seg_json_path = os.path.join(output_dir, "segment_recommendations.json")
    stats_json_path = os.path.join(output_dir, "recommendation_statistics.json")
    summary_txt_path = os.path.join(output_dir, "recommendation_summary.txt")
    
    try:
        recs_df.to_csv(recs_csv_path, index=False)
        high_priority_df.to_csv(priority_csv_path, index=False)
        logger.info(f"Saved recommendations tables to {recs_csv_path}")
    except Exception as e:
        raise IOError(f"Failed to write recommendations CSV tables: {str(e)}")
        
    try:
        with open(seg_json_path, "w") as f:
            json.dump(segment_recs_summary, f, indent=4)
        with open(stats_json_path, "w") as f:
            json.dump(stats, f, indent=4)
        logger.info(f"Saved JSON reports to {seg_json_path}")
    except Exception as e:
        raise IOError(f"Failed to write recommendations JSON reports: {str(e)}")
        
    try:
        with open(summary_txt_path, "w") as f:
            f.write(summary_text)
        logger.info(f"Saved recommendation executive report to {summary_txt_path}")
    except Exception as e:
        raise IOError(f"Failed to write summary text: {str(e)}")
        
    # 8. Register artifacts using Artifact Manager
    from backend.utils.artifact_manager import register_artifact
    register_artifact("customer_recommendations", recs_csv_path)
    register_artifact("priority_customers", priority_csv_path)
    register_artifact("segment_recommendations", seg_json_path)
    register_artifact("recommendation_statistics", stats_json_path)
    register_artifact("recommendation_summary", summary_txt_path)
    
    # 9. Update run metadata using Metadata Manager
    from backend.utils.metadata_manager import update_metadata
    update_metadata({
        "recommendations_completed": True,
        "high_priority_customers_count": len(high_priority_df),
        "recommendations_generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    })
    
    relative_output_path = "outputs/recommendations/customer_recommendations.csv"
    
    return recs_df, stats, relative_output_path
