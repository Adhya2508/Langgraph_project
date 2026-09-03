import os
import yaml
import logging
import time
import json
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List, Optional
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.cluster import KMeans, DBSCAN
from sklearn import metrics

logger = logging.getLogger("bank-segmentation-agent.segmentation")

def load_config() -> Dict[str, Any]:
    """
    Load segmentation configurations from backend/config/segmentation_config.yaml.
    Falls back to default settings if file is missing.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(base_dir, "config", "segmentation_config.yaml")
    
    defaults = {
        "segmentation": {
            "algorithm": "auto",
            "scaling_method": "standard",
            "random_state": 42,
            "evaluation_metric": "silhouette",
            "kmeans": {
                "min_clusters": 2,
                "max_clusters": 8
            },
            "dbscan": {
                "eps": 0.5,
                "min_samples": 5
            }
        }
    }
    
    if not os.path.exists(config_path):
        logger.warning(f"Config file not found at {config_path}. Using defaults.")
        return defaults
        
    try:
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
            # Ensure safe access structures
            if not config or "segmentation" not in config:
                return defaults
            return config
    except Exception as e:
        logger.error(f"Failed to load yaml config at {config_path}: {str(e)}")
        return defaults

def load_features() -> pd.DataFrame:
    """
    Retrieves the latest customer features dataset registered in the Artifact Manager.
    Raises ValueError if not registered or file missing.
    """
    from backend.utils.artifact_manager import get_latest_artifact
    features_path = get_latest_artifact("customer_features")
    
    if not features_path or not os.path.exists(features_path):
        raise ValueError("Cannot run customer segmentation: customer_features dataset artifact is missing. "
                         "Please run the feature engineering tool (/features) first.")
                         
    try:
        df = pd.read_csv(features_path)
        logger.info(f"Successfully loaded customer features from: {features_path}")
        return df
    except Exception as e:
        raise ValueError(f"Failed to read customer features from {features_path}: {str(e)}")

def validate_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str], List[str]]:
    """
    Validates features for clustering:
    - Imputes missing cells with column mean values.
    - Identifies and drops constant features (variance == 0).
    - Identifies and drops duplicate columns.
    - Identifies and drops highly correlated features (Pearson r > 0.95) to prevent double counting.
    - Drops non-numeric columns.
    
    Returns:
        Tuple[pd.DataFrame, List[str], List[str]]:
            1. Validated numeric DataFrame (excluding customer_id key).
            2. List of kept features.
            3. List of skipped/removed features.
    """
    df = df.copy()
    skipped_features = []
    
    # 1. Separate customer identifier
    cust_col = 'customer_id' if 'customer_id' in df.columns else ('cust_id' if 'cust_id' in df.columns else None)
    if not cust_col:
        # Scan for key
        for col in df.columns:
            if col.lower().endswith('id') or 'customer' in col.lower() or 'cust' in col.lower():
                cust_col = col
                break
                
    if cust_col:
        # Keep customer_id but drop from clustering input matrix
        df_clustering = df.drop(columns=[cust_col])
    else:
        df_clustering = df
        
    # 2. Extract numeric columns
    numeric_cols = list(df_clustering.select_dtypes(include=[np.number]).columns)
    non_numeric_cols = [c for c in df_clustering.columns if c not in numeric_cols]
    
    for c in non_numeric_cols:
        skipped_features.append(f"{c} (non-numeric)")
    df_clustering = df_clustering[numeric_cols]
    
    if df_clustering.empty:
        raise ValueError("Feature validation failed: No numeric columns found for clustering.")
        
    # 3. Handle missing values
    missing_counts = df_clustering.isna().sum()
    if missing_counts.sum() > 0:
        logger.info("Found missing values during validation. Imputing with column averages.")
        df_clustering = df_clustering.fillna(df_clustering.mean(numeric_only=True))
        
    # 4. Handle constant columns
    stds = df_clustering.std(numeric_only=True)
    constant_cols = list(stds[stds == 0.0].index)
    if constant_cols:
        logger.info(f"Dropping constant features (variance=0): {constant_cols}")
        df_clustering = df_clustering.drop(columns=constant_cols)
        for c in constant_cols:
            skipped_features.append(f"{c} (constant)")
            
    # 5. Handle duplicate features
    dup_cols = []
    # Simple transpose comparison to find duplicate columns
    transposed = df_clustering.T
    duplicates = transposed.duplicated()
    dup_cols = list(transposed[duplicates].index)
    if dup_cols:
        logger.info(f"Dropping duplicate features: {dup_cols}")
        df_clustering = df_clustering.drop(columns=dup_cols)
        for c in dup_cols:
            skipped_features.append(f"{c} (duplicate)")
            
    # 6. Handle highly correlated features (r > 0.95)
    correlated_cols = []
    if len(df_clustering.columns) > 1:
        corr_matrix = df_clustering.corr().abs()
        # Select upper triangle of correlation matrix
        upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
        correlated_cols = [column for column in upper.columns if any(upper[column] > 0.95)]
        
        if correlated_cols:
            logger.info(f"Dropping highly correlated features (>0.95): {correlated_cols}")
            df_clustering = df_clustering.drop(columns=correlated_cols)
            for c in correlated_cols:
                skipped_features.append(f"{c} (highly correlated)")
                
    kept_features = list(df_clustering.columns)
    logger.info(f"Feature validation complete. Kept features: {kept_features}. Skipped: {skipped_features}")
    
    return df_clustering, kept_features, skipped_features

def scale_features(df: pd.DataFrame, method: str) -> np.ndarray:
    """
    Scale numeric columns using StandardScaler or MinMaxScaler.
    """
    if method == "minmax":
        scaler = MinMaxScaler()
        logger.info("Applying MinMaxScaler scaling.")
    else:
        scaler = StandardScaler()
        logger.info("Applying StandardScaler scaling.")
        
    try:
        scaled_data = scaler.fit_transform(df)
        return scaled_data
    except Exception as e:
        raise ValueError(f"Feature scaling failed using method '{method}': {str(e)}")

def run_kmeans(X: np.ndarray, min_k: int, max_k: int, random_state: int) -> Tuple[np.ndarray, int, float]:
    """
    Executes KMeans over a range of cluster sizes and picks the best K based on silhouette score.
    """
    best_k = 2
    best_score = -1.0
    best_labels = np.zeros(X.shape[0], dtype=int)
    
    # Constrain search range based on sample size
    limit_max = min(max_k, X.shape[0] - 1)
    if limit_max < min_k:
        logger.warning(f"Dataset has too few samples ({X.shape[0]}) to search K range {min_k}-{max_k}. "
                       f"Forcing K = {X.shape[0]}.")
        # Run KMeans with K = X.shape[0] if possible, or just default to 1 cluster
        k = max(1, X.shape[0])
        model = KMeans(n_clusters=k, random_state=random_state, n_init='auto')
        labels = model.fit_predict(X)
        return labels, k, 1.0
        
    for k in range(min_k, limit_max + 1):
        try:
            model = KMeans(n_clusters=k, random_state=random_state, n_init='auto')
            labels = model.fit_predict(X)
            score = metrics.silhouette_score(X, labels)
            logger.info(f"KMeans (K={k}) Silhouette Score: {score:.4f}")
            
            if score > best_score:
                best_score = score
                best_k = k
                best_labels = labels
        except Exception as e:
            logger.warning(f"KMeans failed for K={k}: {str(e)}")
            
    logger.info(f"Selected best K={best_k} with Silhouette Score={best_score:.4f}")
    return best_labels, best_k, float(best_score)

def run_dbscan(X: np.ndarray, eps: float, min_samples: int) -> Tuple[np.ndarray, int, float]:
    """
    Executes DBSCAN. Computes clusters and calculates silhouette score.
    """
    try:
        model = DBSCAN(eps=eps, min_samples=min_samples)
        labels = model.fit_predict(X)
        
        unique_labels = set(labels)
        # Exclude noise point label -1
        core_labels = [l for l in unique_labels if l != -1]
        n_clusters = len(core_labels)
        
        logger.info(f"DBSCAN detected {n_clusters} clusters (excluding noise points).")
        
        if n_clusters >= 2:
            # Silhouette score is calculated only for clustered elements or including noise as a segment?
            # Typically silhouette calculation requires at least 2 distinct clusters.
            score = float(metrics.silhouette_score(X, labels))
        else:
            score = -1.0
            
        return labels, n_clusters, score
    except Exception as e:
        logger.error(f"DBSCAN clustering failed: {str(e)}")
        raise ValueError(f"DBSCAN execution failed: {str(e)}")

def evaluate_clusters(X: np.ndarray, labels: np.ndarray) -> Dict[str, float]:
    """
    Calculates Silhouette, Davies-Bouldin, and Calinski-Harabasz metrics.
    """
    unique_labels = set(labels)
    # Filter out noise if DBSCAN
    valid_labels = [l for l in unique_labels if l != -1]
    
    if len(valid_labels) < 2:
        logger.warning("Clustering resulted in fewer than 2 valid clusters. Skipping metric calculations.")
        return {
            "silhouette_score": -1.0,
            "davies_bouldin_score": 0.0,
            "calinski_harabasz_score": 0.0
        }
        
    try:
        sil = float(metrics.silhouette_score(X, labels))
        db = float(metrics.davies_bouldin_score(X, labels))
        ch = float(metrics.calinski_harabasz_score(X, labels))
    except Exception as e:
        logger.warning(f"Error calculating evaluation metrics: {str(e)}")
        sil, db, ch = -1.0, 0.0, 0.0
        
    return {
        "silhouette_score": sil,
        "davies_bouldin_score": db,
        "calinski_harabasz_score": ch
    }

def generate_business_labels(df_orig: pd.DataFrame, labels: np.ndarray, feature_cols: List[str]) -> Tuple[List[str], Dict[int, str], List[Dict[str, Any]]]:
    """
    Analyze cluster profiles vs overall dataset statistics:
    - Generates descriptive business labels.
    - Generates z-score based top distinct characteristics for each cluster.
    """
    # Create temp df with original features and labels
    temp_df = df_orig.copy()
    temp_df['cluster'] = labels
    
    # Calculate overall dataset statistics for all numeric columns
    all_numeric = list(df_orig.select_dtypes(include=[np.number]).columns)
    overall_means = df_orig[all_numeric].mean()
    overall_stds = df_orig[all_numeric].std().replace(0, 1.0)
    
    # Identify target metric columns from ALL numeric columns in df_orig
    bal_col = next((c for c in all_numeric if 'average_balance' in c.lower() or 'current_balance' in c.lower() or 'balance' in c.lower()), None)
    spend_col = next((c for c in all_numeric if 'spend' in c.lower() or 'purchases' in c.lower() or 'amount' in c.lower()), None)
    tx_col = next((c for c in all_numeric if 'transactions' in c.lower() or 'frequency' in c.lower() or 'trx' in c.lower()), None)
    recency_col = next((c for c in all_numeric if 'recency' in c.lower() or 'days_since' in c.lower()), None)
    
    business_labels_map = {}
    cluster_stats = []
    
    unique_clusters = sorted(list(set(labels)))
    
    for c in unique_clusters:
        c_mask = temp_df['cluster'] == c
        c_df = temp_df[c_mask]
        c_size = len(c_df)
        
        # Calculate cluster means on all numeric features
        c_means = c_df[all_numeric].mean()
        
        # 1. Base label categorization
        base_label = "Standard Customers"
        
        val_bal = c_means.get(bal_col, overall_means.get(bal_col, 0)) if bal_col else 0
        val_spend = c_means.get(spend_col, overall_means.get(spend_col, 0)) if spend_col else 0
        val_tx = c_means.get(tx_col, overall_means.get(tx_col, 0)) if tx_col else 0
        val_rec = c_means.get(recency_col, overall_means.get(recency_col, 0)) if recency_col else 0
        
        ref_bal = overall_means.get(bal_col, 1) if bal_col else 1
        ref_spend = overall_means.get(spend_col, 1) if spend_col else 1
        ref_tx = overall_means.get(tx_col, 1) if tx_col else 1
        ref_rec = overall_means.get(recency_col, 1) if recency_col else 1
        
        # Avoid division by zero issues
        ref_bal = ref_bal if ref_bal != 0 else 1
        ref_spend = ref_spend if ref_spend != 0 else 1
        ref_tx = ref_tx if ref_tx != 0 else 1
        ref_rec = ref_rec if ref_rec != 0 else 1
        
        if c == -1:
            base_label = "Outliers/Unclassified"
        else:
            if bal_col and spend_col and val_bal > 1.3 * ref_bal and val_spend > 1.3 * ref_spend:
                base_label = "High-Value Premium Customers"
            elif recency_col and tx_col and val_rec > 1.3 * ref_rec and val_tx < 0.7 * ref_tx:
                base_label = "Dormant Customers"
            elif tx_col and spend_col and val_tx > 1.2 * ref_tx and val_spend < 0.8 * ref_spend:
                base_label = "Frequent Small Spenders"
            elif bal_col and tx_col and val_bal > 1.2 * ref_bal and val_tx < 0.7 * ref_tx:
                base_label = "High Income Low Activity"
            elif recency_col and tx_col and val_rec < 0.7 * ref_rec and val_tx > 1.2 * ref_tx:
                base_label = "Active Digital Transactors"
                
        # Make the label unique by appending cluster suffix
        cluster_name = f"{base_label} (Cluster {c})" if c != -1 else "Unclassified Outliers"
        business_labels_map[int(c)] = cluster_name
        
        # 2. Top Characteristics (Z-score calculation over feature_cols only)
        z_scores = (c_means[feature_cols] - overall_means[feature_cols]) / overall_stds[feature_cols]
        # Sort by absolute magnitude of z-score
        z_sorted = z_scores.abs().sort_values(ascending=False)
        top_features = list(z_sorted.index[:2])
        
        characteristics = []
        for feat in top_features:
            score = z_scores[feat]
            direction = "High" if score > 0 else "Low"
            characteristics.append(f"{direction} {feat}")
            
        # Collect stats
        cluster_stats.append({
            "cluster_id": int(c),
            "business_label": cluster_name,
            "customer_count": int(c_size),
            "percentage": float((c_size / len(df_orig)) * 100),
            "average_balance": float(val_bal) if bal_col else 0.0,
            "average_spending": float(val_spend) if spend_col else 0.0,
            "average_transactions": float(val_tx) if tx_col else 0.0,
            "recency": float(val_rec) if recency_col else 0.0,
            "top_characteristics": characteristics
        })
        
    # Generate business label list for all row mapping
    mapped_labels = [business_labels_map[int(l)] for l in labels]
    return mapped_labels, business_labels_map, cluster_stats

def run_segmentation() -> Tuple[pd.DataFrame, Dict[str, Any], str]:
    """
    Main orchestrator for Customer Segmentation Engine.
    Executes loading, feature validations, scaling, automatic algorithms, evaluations,
    label annotations, exports, and registrations.
    """
    start_time = time.time()
    
    # 1. Load config settings
    config_dict = load_config()
    cfg = config_dict["segmentation"]
    
    algorithm = cfg.get("algorithm", "auto").lower()
    scaling_method = cfg.get("scaling_method", "standard").lower()
    random_state = cfg.get("random_state", 42)
    
    # 2. Load latest customer features
    features_df = load_features()
    
    cust_col = 'customer_id' if 'customer_id' in features_df.columns else ('cust_id' if 'cust_id' in features_df.columns else None)
    if not cust_col:
        # Look for pattern fallback
        for col in features_df.columns:
            if col.lower().endswith('id') or 'customer' in col.lower() or 'cust' in col.lower():
                cust_col = col
                break
                
    if not cust_col:
        raise ValueError("Missing customer identifier column in feature table.")
        
    if len(features_df) < 2:
        raise ValueError("Customer dataset is too small to perform clustering. Minimum 2 samples are required.")
        
    # 3. Feature validation
    validated_df, feature_cols, skipped_features = validate_features(features_df)
    
    # 4. Feature scaling
    X_scaled = scale_features(validated_df, scaling_method)
    
    # 5. Algorithm selection & modeling
    selected_alg = algorithm
    if algorithm == "auto":
        # Auto mode defaults to KMeans
        selected_alg = "kmeans"
        
    logger.info(f"Executing algorithm: {selected_alg}")
    
    if selected_alg == "kmeans":
        min_k = cfg["kmeans"].get("min_clusters", 2)
        max_k = cfg["kmeans"].get("max_clusters", 8)
        labels, n_clusters, best_sil = run_kmeans(X_scaled, min_k, max_k, random_state)
    elif selected_alg == "dbscan":
        eps = cfg["dbscan"].get("eps", 0.5)
        min_samples = cfg["dbscan"].get("min_samples", 5)
        labels, n_clusters, best_sil = run_dbscan(X_scaled, eps, min_samples)
    else:
        raise ValueError(f"Unsupported clustering algorithm: '{algorithm}'")
        
    # 6. Evaluation metrics
    eval_metrics = evaluate_clusters(X_scaled, labels)
    
    # 7. Business label annotations
    mapped_labels, labels_map, cluster_summary = generate_business_labels(features_df, labels, feature_cols)
    
    # 8. Create output directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, "outputs", "segmentation")
    os.makedirs(output_dir, exist_ok=True)
    
    mapping_csv_path = os.path.join(output_dir, "segment_mapping.csv")
    scaled_csv_path = os.path.join(output_dir, "scaled_features.csv")
    summary_json_path = os.path.join(output_dir, "cluster_summary.json")
    report_json_path = os.path.join(output_dir, "evaluation_report.json")
    
    # Save segment mapping mapping customer_id -> cluster_id -> business_label
    mapping_df = pd.DataFrame({
        "customer_id": features_df[cust_col].astype(str),
        "cluster_id": labels,
        "business_label": mapped_labels
    })
    
    try:
        mapping_df.to_csv(mapping_csv_path, index=False)
        logger.info(f"Saved segment mappings to {mapping_csv_path}")
    except Exception as e:
        logger.error(f"Failed to write mapping_df: {str(e)}")
        raise IOError(f"Write permission error saving mapping file: {str(e)}") from e
        
    # Save scaled features
    try:
        scaled_df = pd.DataFrame(X_scaled, columns=feature_cols)
        # Re-attach customer ID
        scaled_df.insert(0, "customer_id", features_df[cust_col].values)
        scaled_df.to_csv(scaled_csv_path, index=False)
        logger.info(f"Saved scaled features to {scaled_csv_path}")
    except Exception as e:
        logger.error(f"Failed to write scaled_df: {str(e)}")
        raise IOError(f"Write permission error saving scaled features: {str(e)}") from e
        
    # Save cluster summary JSON
    try:
        with open(summary_json_path, "w") as f:
            json.dump(cluster_summary, f, indent=4)
        logger.info(f"Saved cluster summary to {summary_json_path}")
    except Exception as e:
        logger.error(f"Failed to write cluster summary JSON: {str(e)}")
        raise IOError(f"Write permission error saving cluster summary: {str(e)}") from e
        
    # Save evaluation report JSON
    exec_time = f"{time.time() - start_time:.2f} seconds"
    report_data = {
        "algorithm_used": selected_alg,
        "number_of_clusters": int(n_clusters),
        "best_silhouette_score": float(best_sil),
        "metrics": eval_metrics,
        "features_used": feature_cols,
        "skipped_features": skipped_features,
        "execution_time": exec_time
    }
    
    try:
        with open(report_json_path, "w") as f:
            json.dump(report_data, f, indent=4)
        logger.info(f"Saved evaluation report to {report_json_path}")
    except Exception as e:
        logger.error(f"Failed to write evaluation report JSON: {str(e)}")
        raise IOError(f"Write permission error saving evaluation report: {str(e)}") from e

    # 9. Register output artifacts using Artifact Manager
    from backend.utils.artifact_manager import register_artifact
    register_artifact("segment_mapping", mapping_csv_path)
    register_artifact("scaled_features", scaled_csv_path)
    register_artifact("cluster_summary", summary_json_path)
    register_artifact("evaluation_report", report_json_path)

    # 10. Update Metadata Manager with run details
    from backend.utils.metadata_manager import update_metadata
    from datetime import datetime, timezone
    update_metadata({
        "algorithm": selected_alg,
        "clusters": int(n_clusters),
        "silhouette": float(best_sil),
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    })

    relative_output_path = "outputs/segmentation/segment_mapping.csv"
    
    return mapping_df, report_data, relative_output_path
