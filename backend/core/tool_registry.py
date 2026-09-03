import logging
from typing import Dict, Any, Callable
from backend.tools.cleaning import clean_dataset
from backend.tools.eda import run_eda
from backend.tools.feature_engineering import generate_customer_features
from backend.tools.segmentation import run_segmentation
from backend.tools.explainability import run_explainability
from backend.tools.recommendation import run_recommendations

logger = logging.getLogger("bank-segmentation-agent.tool_registry")

# Central in-memory registry map mapping tool strings to callable objects
_registry: Dict[str, Callable[..., Any]] = {}

def register_tool(name: str, func: Callable[..., Any]) -> None:
    """Register a new tool function in the Tool Registry."""
    _registry[name] = func
    logger.info(f"Successfully registered tool: '{name}'")

def get_tool(name: str) -> Callable[..., Any]:
    """Retrieve a tool function from the registry. Raises ValueError if unregistered."""
    if name not in _registry:
        raise ValueError(f"Tool '{name}' is not registered in the Tool Registry. "
                         f"Available tools: {list(_registry.keys())}")
    return _registry[name]

# Standard registration
register_tool("clean_dataset", clean_dataset)
register_tool("run_eda", run_eda)
register_tool("generate_customer_features", generate_customer_features)
register_tool("run_segmentation", run_segmentation)
register_tool("run_explainability", run_explainability)
register_tool("run_recommendations", run_recommendations)
