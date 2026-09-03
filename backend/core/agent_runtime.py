import logging
import time
from typing import Dict, Any
from backend.agent.graph import create_agent_graph
from backend.core.execution_context import ExecutionContext
from backend.utils.artifact_manager import _load_registry
from backend.utils.metadata_manager import load_metadata

logger = logging.getLogger("bank-segmentation-agent.agent_runtime")

# Initialize graph compiled flow
app_graph = create_agent_graph()

def run_agent(query: str) -> Dict[str, Any]:
    """
    Orchestrates user prompt execution through the compiled planning LangGraph.
    Sets up contexts, triggers step nodes, and returns standardized plan summaries.
    
    Args:
        query (str): The natural language query from the user.
        
    Returns:
        Dict[str, Any]: Standardized response dictionary containing execution plan, summary, and artifacts.
    """
    start_time = time.time()
    logger.info(f"Agent Runtime: Processing incoming query: '{query}'")
    
    # 1. Build unified execution context via ContextService
    from backend.context.context_service import ContextService
    context = ContextService.build_execution_context(query)
    
    # Attach tracking variables to context
    context.add_metadata("latest_algorithm", context.metadata.get("algorithm", "unknown"))
    context.add_metadata("total_artifacts_registered", len(context.available_artifacts))
    
    # 2. Prepare initial state matching extended AgentState
    initial_state = {
        "query": query,
        "current_plan": None,
        "plan_history": [],
        "memory_summary": "",
        "available_artifacts": [],
        "completed_steps": [],
        "remaining_steps": [],
        "response": None,
        "errors": None,
        "execution_time": 0.0,
        "context": context
    }
    
    # 3. Execute LangGraph workflow
    try:
        final_state = app_graph.invoke(initial_state)
        elapsed = time.time() - start_time
        
        status = "success" if not final_state.get("errors") else "failure"
        
        plan_dict = final_state.get("current_plan") or {}
        plan_id = plan_dict.get("plan_id", "unknown")
        detected_intent = plan_dict.get("intent", "Unknown Request")
        
        response_data = {
            "status": status,
            "plan_id": plan_id,
            "detected_intent": detected_intent,
            "steps_executed": final_state.get("completed_steps", []),
            "artifacts_used": plan_dict.get("required_artifacts", []),
            "generated_outputs": plan_dict.get("expected_outputs", []),
            "execution_time": f"{elapsed:.2f} seconds",
            "errors": final_state.get("errors"),
            "final_response": final_state.get("response", "Pipeline execution completed.")
        }
        logger.info(f"Agent Runtime: Plan successfully finalized in {elapsed:.2f}s with status '{status}'")
        return response_data
        
    except Exception as e:
        elapsed = time.time() - start_time
        error_msg = f"LangGraph planning execution crashed: {str(e)}"
        logger.error(f"Agent Runtime: {error_msg}")
        return {
            "status": "error",
            "plan_id": "unknown",
            "detected_intent": "Unknown Request",
            "steps_executed": [],
            "artifacts_used": [],
            "generated_outputs": [],
            "execution_time": f"{elapsed:.2f} seconds",
            "errors": error_msg,
            "final_response": "AI Agent execution crashed during graph execution node runs."
        }
