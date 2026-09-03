import logging
from typing import Dict, Any, Optional
from backend.core.execution_context import ExecutionContext

logger = logging.getLogger("bank-segmentation-agent.decision_engine")

def make_decision(
    customer_profile: Dict[str, Any],
    segment_label: str,
    rules: Dict[str, Any],
    overall_stats: Dict[str, Any],
    context: ExecutionContext
) -> Dict[str, Any]:
    """
    Evaluates individual customer profiles and assigned segments to generate 
    a normalized recommendation score, priority classification, products list, and expected benefits.
    
    Args:
        customer_profile (Dict[str, Any]): Dictionary of customer's behavioral features.
        segment_label (str): Mapped segment business label (e.g. "High-Value Premium Customers (Cluster 0)").
        rules (Dict[str, Any]): Parsed rules dictionary from recommendation_rules.yaml.
        overall_stats (Dict[str, Any]): Dictionary of dataset-wide numeric feature averages.
        context (ExecutionContext): ExecutionContext holding variables.
        
    Returns:
        Dict[str, Any]: Recommendation dictionary with recommendation, reason, priority, score, and benefits.
    """
    # 1. Resolve matching rule by key matching
    # Strip cluster suffix from segment_label if present to find matching key
    clean_label = segment_label
    if " (Cluster " in segment_label:
        clean_label = segment_label.split(" (Cluster ")[0]
        
    rule = rules.get(clean_label)
    if not rule:
        # Fallback to substring matching
        matched_key = None
        for key in rules.keys():
            if key.lower() in clean_label.lower() or clean_label.lower() in key.lower():
                matched_key = key
                break
        if matched_key:
            rule = rules[matched_key]
        else:
            # Absolute fallback to Standard Customers
            rule = rules.get("Standard Customers", {
                "recommendation": "Maintain standard banking relationships and offer savings tools.",
                "expected_benefit": "Maintain baseline deposit balances and loyalty rates.",
                "products": ["Savings Planner Dashboard Tool"]
            })
            
    # 2. Extract customer-specific financial attributes
    balance = float(customer_profile.get("current_balance", customer_profile.get("average_balance", 0.0)))
    spend = float(customer_profile.get("average_transaction_amount", customer_profile.get("monetary_value", 0.0)))
    txs = float(customer_profile.get("total_transactions", 1.0))
    recency = float(customer_profile.get("recency", customer_profile.get("days_since_last_transaction", 0.0)))
    income_ratio = float(customer_profile.get("income_to_spending_ratio", 1.0))
    
    # 3. Calculate ratios against global means for normalization
    ref_bal = float(overall_stats.get("current_balance", overall_stats.get("average_balance", 1.0)))
    ref_spend = float(overall_stats.get("average_transaction_amount", overall_stats.get("monetary_value", 1.0)))
    ref_txs = float(overall_stats.get("total_transactions", 1.0))
    ref_rec = float(overall_stats.get("recency", overall_stats.get("days_since_last_transaction", 1.0)))
    
    ref_bal = ref_bal if ref_bal != 0 else 1.0
    ref_spend = ref_spend if ref_spend != 0 else 1.0
    ref_txs = ref_txs if ref_txs != 0 else 1.0
    ref_rec = ref_rec if ref_rec != 0 else 1.0
    
    balance_ratio = balance / ref_bal
    spend_ratio = spend / ref_spend
    txs_ratio = txs / ref_txs
    rec_ratio = recency / ref_rec
    
    # 4. Score calculation: normalized between 0 and 100
    raw_score = 50.0
    seg_lower = clean_label.lower()
    
    if "premium" in seg_lower or "high-value" in seg_lower:
        raw_score += 15.0
        if balance_ratio > 1.0: raw_score += 10.0 * min(2.0, balance_ratio)
        if spend_ratio > 1.0: raw_score += 10.0 * min(2.0, spend_ratio)
    elif "dormant" in seg_lower:
        raw_score += 10.0
        # High recency increases marketing attention priority
        if rec_ratio > 1.0: raw_score += 15.0 * min(2.0, rec_ratio)
        if txs_ratio < 1.0: raw_score += 5.0
    elif "frequent" in seg_lower:
        raw_score += 5.0
        if txs_ratio > 1.0: raw_score += 15.0 * min(2.0, txs_ratio)
    elif "high income" in seg_lower or "low activity" in seg_lower:
        raw_score += 15.0
        if balance_ratio > 1.0: raw_score += 15.0 * min(2.0, balance_ratio)
        if rec_ratio > 1.0: raw_score += 5.0
    elif "digital" in seg_lower or "active" in seg_lower:
        raw_score += 10.0
        if txs_ratio > 1.0: raw_score += 10.0 * min(2.0, txs_ratio)
        if spend_ratio > 1.0: raw_score += 10.0 * min(2.0, spend_ratio)
        
    # Apply minor cross-segment bonuses
    if balance_ratio > 1.5: raw_score += 5.0
    if spend_ratio > 1.5: raw_score += 5.0
    if income_ratio > 1.5: raw_score += 5.0
    
    # Limit score between 0 and 100
    score = float(max(0.0, min(100.0, raw_score)))
    
    # 5. Priority classification
    if score >= 80.0:
        priority_label = "Very High Priority"
    elif score >= 65.0:
        priority_label = "High Priority"
    elif score >= 50.0:
        priority_label = "Medium Priority"
    else:
        priority_label = "Low Priority"
        
    # 6. Customize dynamic reason text
    reason = (
        f"Customer is assigned to '{segment_label}' segment with a current balance of {balance:.2f} "
        f"and average spending of {spend:.2f} over {int(txs)} transactions."
    )
    if "dormant" in seg_lower:
        reason += f" Customer has been inactive for {int(recency)} days."
        
    return {
        "recommendation": rule["recommendation"],
        "reason": reason,
        "priority": priority_label,
        "confidence_score": round(score, 2),
        "expected_benefit": rule["expected_benefit"],
        "products": rule["products"]
    }
