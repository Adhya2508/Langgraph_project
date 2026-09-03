import os
import json
import logging
import time
import pandas as pd
import numpy as np
import plotly.express as px
from typing import Tuple, Dict, Any, List, Optional

logger = logging.getLogger("bank-segmentation-agent.explainability")

def load_segmentation_results() -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Load segmentation outputs (segment_mapping.csv and cluster_summary.json) via Artifact Manager.
    """
    from backend.utils.artifact_manager import get_latest_artifact
    mapping_path = get_latest_artifact("segment_mapping")
    summary_path = get_latest_artifact("cluster_summary")
    
    if not mapping_path or not os.path.exists(mapping_path):
        raise ValueError("Missing segmentation artifact: segment_mapping.csv not found. "
                         "Please run customer segmentation (/segment) first.")
    if not summary_path or not os.path.exists(summary_path):
        raise ValueError("Missing segmentation artifact: cluster_summary.json not found. "
                         "Please run customer segmentation (/segment) first.")
                         
    try:
        mapping_df = pd.read_csv(mapping_path)
    except Exception as e:
        raise ValueError(f"Failed to read segment_mapping.csv: {str(e)}")
        
    try:
        with open(summary_path, "r") as f:
            cluster_summary = json.load(f)
    except Exception as e:
        raise ValueError(f"Failed to read cluster_summary.json: {str(e)}")
        
    return mapping_df, cluster_summary

def load_feature_table() -> pd.DataFrame:
    """
    Load latest customer features via Artifact Manager.
    """
    from backend.utils.artifact_manager import get_latest_artifact
    features_path = get_latest_artifact("customer_features")
    
    if not features_path or not os.path.exists(features_path):
        raise ValueError("Missing feature table: customer_features.csv not found.")
        
    try:
        df = pd.read_csv(features_path)
        return df
    except Exception as e:
        raise ValueError(f"Failed to read customer_features.csv: {str(e)}")

def identify_key_features(df_features: pd.DataFrame, mapping_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[int, List[Dict[str, Any]]]]:
    """
    Identify distinguishing features for every cluster by comparing cluster means to the global population.
    Computes population standard-deviation Z-scores.
    Finds top 5 features:
    - Most above average (highest positive z-score)
    - Most below average (highest negative z-score)
    - Largest absolute deviation (overall defining characteristics)
    
    Returns:
        Tuple[pd.DataFrame, Dict[int, List[Dict[str, Any]]]]:
            1. feature_importance DataFrame for export.
            2. Dictionary mapping cluster ID to feature importance metrics list.
    """
    cust_col = 'customer_id' if 'customer_id' in df_features.columns else ('cust_id' if 'cust_id' in df_features.columns else None)
    if not cust_col:
        for col in df_features.columns:
            if col.lower().endswith('id') or 'customer' in col.lower() or 'cust' in col.lower():
                cust_col = col
                break
                
    df_clustering = df_features.drop(columns=[cust_col]) if cust_col else df_features
    numeric_cols = list(df_clustering.select_dtypes(include=[np.number]).columns)
    
    # Calculate global stats
    global_means = df_clustering[numeric_cols].mean()
    global_stds = df_clustering[numeric_cols].std().replace(0, 1.0)
    
    merged = df_features.merge(mapping_df, on=cust_col)
    
    importance_records = []
    cluster_features_importance = {}
    
    unique_clusters = sorted(list(merged['cluster_id'].unique()))
    
    for c in unique_clusters:
        c_df = merged[merged['cluster_id'] == c]
        c_means = c_df[numeric_cols].mean()
        
        # Calculate standard deviation z-score
        z_scores = (c_means - global_means) / global_stds
        
        cluster_metrics = []
        for feat in numeric_cols:
            z = float(z_scores[feat])
            c_mean = float(c_means[feat])
            g_mean = float(global_means[feat])
            
            cluster_metrics.append({
                "cluster_id": int(c),
                "feature": feat,
                "cluster_mean": c_mean,
                "overall_mean": g_mean,
                "z_score": z,
                "abs_z_score": abs(z)
            })
            
        # Classify defining characteristics
        # Sort metrics
        sorted_metrics = sorted(cluster_metrics, key=lambda x: x["z_score"], reverse=True)
        
        # Most above average (top 5 positive z-scores)
        above = sorted_metrics[:5]
        for item in above:
            importance_records.append({
                "cluster_id": item["cluster_id"],
                "feature": item["feature"],
                "cluster_mean": item["cluster_mean"],
                "overall_mean": item["overall_mean"],
                "z_score": item["z_score"],
                "deviation_type": "above_average"
            })
            
        # Most below average (top 5 negative z-scores)
        below = sorted_metrics[-5:]
        for item in below:
            importance_records.append({
                "cluster_id": item["cluster_id"],
                "feature": item["feature"],
                "cluster_mean": item["cluster_mean"],
                "overall_mean": item["overall_mean"],
                "z_score": item["z_score"],
                "deviation_type": "below_average"
            })
            
        # Largest absolute deviation (top 5 overall z-score magnitudes)
        abs_sorted = sorted(cluster_metrics, key=lambda x: x["abs_z_score"], reverse=True)
        largest = abs_sorted[:5]
        for item in largest:
            importance_records.append({
                "cluster_id": item["cluster_id"],
                "feature": item["feature"],
                "cluster_mean": item["cluster_mean"],
                "overall_mean": item["overall_mean"],
                "z_score": item["z_score"],
                "deviation_type": "largest_absolute_deviation"
            })
            
        cluster_features_importance[int(c)] = largest
        
    importance_df = pd.DataFrame(importance_records)
    return importance_df, cluster_features_importance

def generate_cluster_explanations(cluster_summary: List[Dict[str, Any]], cluster_importance: Dict[int, List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Construct natural language descriptions for each cluster segment.
    """
    explanations = {}
    
    for c_info in cluster_summary:
        c_id = c_info["cluster_id"]
        label = c_info["business_label"]
        size = c_info["customer_count"]
        pct = c_info["percentage"]
        
        importance_items = cluster_importance.get(c_id, [])
        distinguishing_traits = []
        for item in importance_items[:3]:
            direction = "above average" if item["z_score"] > 0 else "below average"
            distinguishing_traits.append(f"'{item['feature']}' which is highly {direction} (mean: {item['cluster_mean']:.2f} vs global mean: {item['overall_mean']:.2f})")
            
        traits_str = ", ".join(distinguishing_traits)
        
        explanation = (
            f"Segment '{label}' represents {size} customers ({pct:.2f}% of the population). "
            f"This cluster is primarily characterized by {traits_str}. "
            f"On average, members of this cluster maintain a balance of {c_info['average_balance']:.2f}, "
            f"with monthly spending averaging {c_info['average_spending']:.2f} across {c_info['average_transactions']:.1f} transactions."
        )
        
        explanations[str(c_id)] = {
            "business_label": label,
            "customer_count": size,
            "percentage": pct,
            "key_distinguishing_features": [item["feature"] for item in importance_items[:3]],
            "natural_language_explanation": explanation,
            "average_balance": c_info["average_balance"],
            "average_spending": c_info["average_spending"],
            "average_transactions": c_info["average_transactions"],
            "recency": c_info["recency"]
        }
        
    return explanations

def generate_customer_explanations(df_features: pd.DataFrame, mapping_df: pd.DataFrame) -> pd.DataFrame:
    """
    Generate personalized, concise natural language explanations for individual customers.
    Analyzes which feature of the individual customer deviates most from the overall averages.
    """
    cust_col = 'customer_id' if 'customer_id' in df_features.columns else ('cust_id' if 'cust_id' in df_features.columns else None)
    if not cust_col:
        for col in df_features.columns:
            if col.lower().endswith('id') or 'customer' in col.lower() or 'cust' in col.lower():
                cust_col = col
                break
                
    df_clustering = df_features.drop(columns=[cust_col]) if cust_col else df_features
    numeric_cols = list(df_clustering.select_dtypes(include=[np.number]).columns)
    
    # Calculate global averages
    global_means = df_clustering[numeric_cols].mean()
    global_stds = df_clustering[numeric_cols].std().replace(0, 1.0)
    
    merged = df_features.merge(mapping_df, on=cust_col)
    
    customer_explanations_records = []
    
    for idx, row in merged.iterrows():
        cust_id = str(row[cust_col])
        cluster_id = int(row['cluster_id'])
        label = str(row['business_label'])
        
        # Calculate z-score of this individual customer vs global population
        z_scores = {}
        for feat in numeric_cols:
            val = float(row[feat])
            mean = float(global_means[feat])
            std = float(global_stds[feat])
            z_scores[feat] = (val - mean) / std
            
        # Find feature with largest absolute z-score
        sorted_z = sorted(z_scores.items(), key=lambda x: abs(x[1]), reverse=True)
        
        reasons = []
        for feat, z in sorted_z[:2]:
            direction = "High" if z > 0 else "Low"
            reasons.append(f"{direction} {feat} ({float(row[feat]):.2f} vs overall average {float(global_means[feat]):.2f})")
            
        reasons_str = " and ".join(reasons)
        explanation = f"Customer belongs to {label} primarily due to their {reasons_str}."
        
        customer_explanations_records.append({
            "customer_id": cust_id,
            "cluster_id": cluster_id,
            "business_label": label,
            "explanation": explanation
        })
        
    return pd.DataFrame(customer_explanations_records)

def generate_business_summary(cluster_explanations: Dict[str, Any]) -> str:
    """
    Construct a non-technical text report summary.
    """
    lines = []
    lines.append("==========================================================")
    lines.append("        EXECUTIVE CUSTOMER SEGMENTATION SUMMARY")
    lines.append("==========================================================")
    lines.append("")
    lines.append("This document summarizes customer segmentation analysis, outlining")
    lines.append("the core profiles identified and providing business insights for non-technical users.")
    lines.append("")
    
    for c_id, details in cluster_explanations.items():
        lines.append(f"### Segment Profile: {details['business_label']}")
        lines.append(f" - Size: {details['customer_count']} customers ({details['percentage']:.2f}% of the portfolio)")
        lines.append(f" - Summary: {details['natural_language_explanation']}")
        lines.append(f" - Distinguishing Traits: {', '.join(details['key_distinguishing_features'])}")
        
        # Marketing recommendations based on label
        recommendation = "Maintain regular contact and monitor engagement."
        lbl = details['business_label'].lower()
        if "premium" in lbl or "high-value" in lbl:
            recommendation = "Provide exclusive relationship management, rewards, and cross-sell premium wealth investment solutions."
        elif "dormant" in lbl:
            recommendation = "Run win-back promotions, email check-ins, or offer fee-waiver reactivation incentives."
        elif "frequent" in lbl:
            recommendation = "Suggest digital wallet upgrades or transaction-tier merchant discounts to grow deposit sizing."
            
        lines.append(f" - Action Strategy: {recommendation}")
        lines.append("")
        
    lines.append("==========================================================")
    return "\n".join(lines)

def run_explainability() -> Tuple[Dict[str, Any], List[str], List[str], str]:
    """
    Main orchestrator for Explainability Engine.
    Executes z-score importance extraction, customer reasons profiling,
    executive summaries text, Plotly visual charts, saves results, and registers.
    """
    start_time = time.time()
    
    # 1. Load artifacts
    mapping_df, cluster_summary = load_segmentation_results()
    df_features = load_feature_table()
    
    # 2. Identify key features (Feature Importance)
    importance_df, cluster_importance = identify_key_features(df_features, mapping_df)
    
    # 3. Generate Cluster explanations
    cluster_explanations = generate_cluster_explanations(cluster_summary, cluster_importance)
    
    # 4. Generate Customer explanations
    customer_explanations_df = generate_customer_explanations(df_features, mapping_df)
    
    # 5. Generate Business Executive summary
    summary_text = generate_business_summary(cluster_explanations)
    
    # 6. Save outputs
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, "outputs", "explainability")
    os.makedirs(output_dir, exist_ok=True)
    
    explanations_json_path = os.path.join(output_dir, "cluster_explanations.json")
    customer_explanations_csv_path = os.path.join(output_dir, "customer_explanations.csv")
    summary_txt_path = os.path.join(output_dir, "business_summary.txt")
    importance_csv_path = os.path.join(output_dir, "feature_importance.csv")
    
    try:
        with open(explanations_json_path, "w") as f:
            json.dump(cluster_explanations, f, indent=4)
        logger.info(f"Saved cluster explanations to {explanations_json_path}")
    except Exception as e:
        raise IOError(f"Failed to write cluster_explanations.json: {str(e)}")
        
    try:
        customer_explanations_df.to_csv(customer_explanations_csv_path, index=False)
        logger.info(f"Saved customer explanations to {customer_explanations_csv_path}")
    except Exception as e:
        raise IOError(f"Failed to write customer_explanations.csv: {str(e)}")
        
    try:
        with open(summary_txt_path, "w") as f:
            f.write(summary_text)
        logger.info(f"Saved business summary text report to {summary_txt_path}")
    except Exception as e:
        raise IOError(f"Failed to write business_summary.txt: {str(e)}")
        
    try:
        importance_df.to_csv(importance_csv_path, index=False)
        logger.info(f"Saved feature importance matrix to {importance_csv_path}")
    except Exception as e:
        raise IOError(f"Failed to write feature_importance.csv: {str(e)}")
        
    # 7. Generate Plotly HTML charts
    visualizations = []
    
    try:
        # Visual 1: Cluster Sizes Pie Chart
        counts = mapping_df['business_label'].value_counts().reset_index()
        counts.columns = ['business_label', 'customer_count']
        fig1 = px.pie(
            counts, 
            values='customer_count', 
            names='business_label', 
            title="Customer Segment Distribution",
            color_discrete_sequence=px.colors.qualitative.Pastel
        )
        sizes_chart_path = os.path.join(output_dir, "cluster_sizes.html")
        fig1.write_html(sizes_chart_path)
        visualizations.append("outputs/explainability/cluster_sizes.html")
        
        # Visual 2: Grouped Bar Chart of Cluster Means (our Radar equivalent)
        summary_rows = []
        for c in cluster_summary:
            summary_rows.append({
                "Segment": c["business_label"],
                "Avg Balance": c["average_balance"],
                "Avg Spending": c["average_spending"],
                "Avg Transactions": c["average_transactions"],
                "Recency (Days)": c["recency"]
            })
        summary_df = pd.DataFrame(summary_rows)
        melted = summary_df.melt(id_vars=["Segment"], var_name="Metric", value_name="Value")
        
        fig2 = px.bar(
            melted, 
            x="Metric", 
            y="Value", 
            color="Segment", 
            barmode="group", 
            title="Cluster Segment Metric Comparison",
            color_discrete_sequence=px.colors.qualitative.Safe
        )
        radar_chart_path = os.path.join(output_dir, "radar_characteristics.html")
        fig2.write_html(radar_chart_path)
        visualizations.append("outputs/explainability/radar_characteristics.html")
        
        # Visual 3: Feature comparisons boxplot
        cust_col = 'customer_id' if 'customer_id' in df_features.columns else ('cust_id' if 'cust_id' in df_features.columns else None)
        if cust_col:
            merged_features = df_features.merge(mapping_df, on=cust_col)
            spend_col = next((c for c in df_features.columns if 'spend' in c.lower() or 'purchases' in c.lower() or 'amount' in c.lower()), None)
            if spend_col:
                fig3 = px.box(
                    merged_features, 
                    x='business_label', 
                    y=spend_col, 
                    title="Spending Volume Distribution Across Segments",
                    color='business_label',
                    color_discrete_sequence=px.colors.qualitative.Bold
                )
                box_chart_path = os.path.join(output_dir, "feature_comparison.html")
                fig3.write_html(box_chart_path)
                visualizations.append("outputs/explainability/feature_comparison.html")
                
        logger.info("Successfully exported interactive Plotly HTML visualizations.")
    except Exception as e:
        logger.error(f"Visualization generation failed: {str(e)}")
        # Graceful degradation (never crash on plotting failures)
        
    # 8. Register artifacts in the Artifact Manager
    from backend.utils.artifact_manager import register_artifact
    register_artifact("cluster_explanations", explanations_json_path)
    register_artifact("customer_explanations", customer_explanations_csv_path)
    register_artifact("business_summary", summary_txt_path)
    register_artifact("feature_importance", importance_csv_path)
    
    for vis in visualizations:
        vis_abs_path = os.path.abspath(os.path.join(base_dir, vis))
        vis_name = os.path.splitext(os.path.basename(vis))[0]
        register_artifact(f"explain_vis_{vis_name}", vis_abs_path)
        
    generated_reports = [
        "outputs/explainability/cluster_explanations.json",
        "outputs/explainability/customer_explanations.csv",
        "outputs/explainability/business_summary.txt",
        "outputs/explainability/feature_importance.csv"
    ]
    
    # 9. Update Metadata Manager with explainability status
    from backend.utils.metadata_manager import update_metadata
    update_metadata({
        "explainability_completed": True,
        "explained_clusters_count": len(cluster_summary),
        "explainability_generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    })
    
    relative_mapping_path = "outputs/explainability/cluster_explanations.json"
    
    return cluster_explanations, generated_reports, visualizations, summary_text
