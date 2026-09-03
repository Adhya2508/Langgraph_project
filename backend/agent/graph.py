import logging
from langgraph.graph import StateGraph, END
from backend.agent.state import AgentState
from backend.agent.nodes import (
    memory_retrieval_node,
    planning_node,
    capability_validation_node,
    execution_node,
    response_node
)

logger = logging.getLogger("bank-segmentation-agent.graph")

def create_agent_graph():
    """
    Compiles the multi-step planning and reasoning workflow in LangGraph.
    Wires: retrieval -> planning -> validation -> execution -> response.
    """
    logger.info("Agent: Building Plan-based LangGraph workflow...")
    
    workflow = StateGraph(AgentState)
    
    # Register planning nodes
    workflow.add_node("memory_retrieval", memory_retrieval_node)
    workflow.add_node("planner", planning_node)
    workflow.add_node("validator", capability_validation_node)
    workflow.add_node("executor", execution_node)
    workflow.add_node("responder", response_node)
    
    # Establish entry point
    workflow.set_entry_point("memory_retrieval")
    
    # Wire node sequences
    workflow.add_edge("memory_retrieval", "planner")
    workflow.add_edge("planner", "validator")
    workflow.add_edge("validator", "executor")
    workflow.add_edge("executor", "responder")
    workflow.add_edge("responder", END)
    
    compiled_graph = workflow.compile()
    logger.info("Agent: Successfully compiled Plan-based LangGraph workflow.")
    return compiled_graph
