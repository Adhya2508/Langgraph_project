import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("bank-segmentation-agent.capability_registry")

class Capability:
    """
    Represents an agent capability.
    Defines inputs, outputs, prerequisites, and underlying tool name.
    """
    def __init__(
        self,
        name: str,
        description: str,
        required_inputs: List[str],
        generated_outputs: List[str],
        dependencies: List[str],
        tool_name: str
    ):
        self.name = name
        self.description = description
        self.required_inputs = required_inputs
        self.generated_outputs = generated_outputs
        self.dependencies = dependencies
        self.tool_name = tool_name

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "required_inputs": self.required_inputs,
            "generated_outputs": self.generated_outputs,
            "dependencies": self.dependencies,
            "tool_name": self.tool_name
        }

# Central capability database registry map
_capabilities: Dict[str, Capability] = {}

def register_capability(cap: Capability) -> None:
    """Register a capability object in the registry."""
    _capabilities[cap.name] = cap
    logger.info(f"Registered capability: '{cap.name}'")

def get_capability(name: str) -> Capability:
    """Retrieve capability by name. Raises ValueError if unregistered."""
    if name not in _capabilities:
        raise ValueError(f"Capability '{name}' is not registered.")
    return _capabilities[name]

def list_capabilities() -> List[Capability]:
    """Retrieve all registered capabilities."""
    return list(_capabilities.values())

# Standard registration of tool capabilities
register_capability(Capability(
    name="clean_dataset",
    description="Cleans, standardizes headers, parses dates, and filters invalid rows inside transactional logs.",
    required_inputs=["raw_dataset"],
    generated_outputs=["cleaned_dataset", "invalid_records", "cleaning_report"],
    dependencies=[],
    tool_name="clean_dataset"
))

register_capability(Capability(
    name="run_eda",
    description="Generates statistical description profiles, outlier counts, and correlation reports.",
    required_inputs=["cleaned_dataset"],
    generated_outputs=["eda_statistics", "eda_correlation", "eda_outliers", "eda_report", "eda_summary"],
    dependencies=["clean_dataset"],
    tool_name="run_eda"
))

register_capability(Capability(
    name="generate_customer_features",
    description="Aggregates transaction logs into metrics (recency, frequency, balance averages, spend ratios).",
    required_inputs=["cleaned_dataset"],
    generated_outputs=["customer_features", "feature_report"],
    dependencies=["clean_dataset"],
    tool_name="generate_customer_features"
))

register_capability(Capability(
    name="run_segmentation",
    description="Scales customer features, calculates KMeans cluster sizes, and dynamically labels customer groups.",
    required_inputs=["customer_features"],
    generated_outputs=["segment_mapping", "scaled_features", "cluster_summary", "evaluation_report"],
    dependencies=["generate_customer_features"],
    tool_name="run_segmentation"
))

register_capability(Capability(
    name="run_explainability",
    description="Calculates feature deviations (z-scores) relative to overall population averages to explain cluster decisions.",
    required_inputs=["segment_mapping", "cluster_summary", "customer_features"],
    generated_outputs=["cluster_explanations", "customer_explanations", "business_summary", "feature_importance"],
    dependencies=["run_segmentation"],
    tool_name="run_explainability"
))

register_capability(Capability(
    name="run_recommendations",
    description="Determines product offerings, scores targeted priorities, and exports segment recommendations.",
    required_inputs=["customer_features", "segment_mapping", "cluster_summary"],
    generated_outputs=["customer_recommendations", "priority_customers", "segment_recommendations", "recommendation_statistics", "recommendation_summary"],
    dependencies=["run_segmentation"],
    tool_name="run_recommendations"
))
