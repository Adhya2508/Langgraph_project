from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """
    Defines the structural state passed between nodes in the LangGraph workflow.
    Supports multi-step planning, capability validation, memory summarizations,
    and references the centralized ExecutionContext.
    """
    query: str
    current_plan: Optional[Dict[str, Any]]
    plan_history: List[Dict[str, Any]]
    memory_summary: str
    available_artifacts: List[str]
    completed_steps: List[str]
    remaining_steps: List[str]
    response: Optional[str]
    errors: Optional[str]
    execution_time: float
    context: Optional[Any]  # Reference to ExecutionContext
