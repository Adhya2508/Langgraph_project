import time
from typing import Dict, Any, List, Optional

class ExecutionContext:
    """
    Holds variables, parameters, configuration, memory, metadata,
    and prompt layouts regarding the current pipeline run.
    Ensures decoupled state transmission between tools, planning engine, and agents.
    """
    def __init__(self, target_priority_threshold: float = 70.0, config_override: Optional[Dict[str, Any]] = None):
        self.timestamp = time.time()
        self.target_priority_threshold = target_priority_threshold
        self.config_override = config_override or {}
        
        # Phase 10 centralized context fields
        self.query: str = ""
        self.memory: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self.available_artifacts: List[str] = []
        self.configurations: Dict[str, Any] = {}
        self.available_capabilities: List[Dict[str, Any]] = []
        self.prompt_context: Dict[str, str] = {}
        self.execution_plan: Optional[Dict[str, Any]] = None
        
    def add_metadata(self, key: str, value: Any) -> None:
        """Add metadata metrics or parameters to the context."""
        self.metadata[key] = value
        
    def get_metadata(self, key: str, default: Any = None) -> Any:
        """Retrieve metadata metrics from the context."""
        return self.metadata.get(key, default)
