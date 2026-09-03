import os
import logging
import time
from typing import Dict, Any, List
from backend.agent.state import AgentState
from backend.llm.factory import get_llm
from backend.core.execution_context import ExecutionContext
from backend.context.artifact_resolver import ArtifactResolver
from backend.context.prompt_builder import PromptBuilder
from backend.utils.artifact_manager import _load_registry
from backend.planner.planner import create_execution_plan
from backend.planner.executor import execute_plan
from backend.planner.plan import ExecutionPlan
from backend.memory.memory_manager import add_to_memory

logger = logging.getLogger("bank-segmentation-agent.nodes")

# Resolve shared LLM client
llm = get_llm()

def memory_retrieval_node(state: AgentState) -> Dict[str, Any]:
    """
    Pulls conversation summary and available files list from the centralized context.
    """
    logger.info("Agent: Running memory retrieval node...")
    context = state["context"]
    summary = context.memory.get("summary", "No conversations recorded yet.")
    available_paths = context.available_artifacts
    
    logger.info(f"Agent: Retrieved memory summary. Available artifacts count: {len(available_paths)}")
    return {
        "memory_summary": summary,
        "available_artifacts": available_paths
    }

def planning_node(state: AgentState) -> Dict[str, Any]:
    """
    Invokes the Planning Engine using the centralized context.
    """
    logger.info("Agent: Running planning node...")
    context = state["context"]
    
    # Create execution plan
    plan = create_execution_plan(state["query"], context)
    plan_dict = plan.to_dict()
    
    logger.info(f"Agent: Plan '{plan.plan_id}' constructed with sequence: {plan.steps}")
    return {
        "current_plan": plan_dict,
        "remaining_steps": plan.steps,
        "completed_steps": []
    }

def capability_validation_node(state: AgentState) -> Dict[str, Any]:
    """
    Validates capabilities using registered capabilities in context,
    and prerequisite paths from the ArtifactResolver.
    """
    logger.info("Agent: Running capability validation node...")
    plan_dict = state["current_plan"]
    if not plan_dict or not plan_dict.get("steps"):
        return {"errors": "Plan validation failed: Execution plan is empty."}
        
    steps = plan_dict.get("steps", [])
    context = state["context"]
    errors = None
    
    # Validate each step corresponds to an active capability in context
    available_caps = {c["name"] for c in context.available_capabilities}
    for step in steps:
        if step not in available_caps:
            errors = f"Validation failed: Capability '{step}' is unregistered."
            logger.error(f"Agent: {errors}")
            return {"errors": errors}
            
    # Validate raw dataset is present via ArtifactResolver
    raw_needed = any(step == "clean_dataset" for step in steps)
    if raw_needed:
        raw_path = ArtifactResolver.get_raw_dataset()
        if not raw_path or not os.path.exists(raw_path):
            errors = "Validation failed: Prerequisite raw CSV dataset not found. Please upload a file first."
            logger.error(f"Agent: {errors}")
            return {"errors": errors}
            
    logger.info("Agent: Capability validation completed successfully.")
    return {"errors": errors}

def execution_node(state: AgentState) -> Dict[str, Any]:
    """
    Executes plan steps sequentially using the Plan Executor and context.
    """
    logger.info("Agent: Running execution node...")
    if state.get("errors"):
        logger.warning("Agent: Skipping tool execution due to validation errors.")
        return {}
        
    plan_dict = state["current_plan"]
    context = state["context"]
    
    # Rebuild plan object from state dictionary
    plan = ExecutionPlan(
        query=plan_dict["query"],
        intent=plan_dict["intent"],
        steps=plan_dict["steps"],
        required_artifacts=plan_dict["required_artifacts"],
        expected_outputs=plan_dict["expected_outputs"]
    )
    plan.plan_id = plan_dict["plan_id"]
    
    # Run executor
    res = execute_plan(plan, context)
    
    # Update artifacts inside state and context
    registry = _load_registry()
    available_paths = list(registry.values())
    context.available_artifacts = available_paths
    
    return {
        "current_plan": plan.to_dict(),
        "completed_steps": res["completed_steps"],
        "remaining_steps": [s for s in plan.steps if s not in res["completed_steps"]],
        "available_artifacts": available_paths,
        "errors": res["errors"]
    }

def response_node(state: AgentState) -> Dict[str, Any]:
    """
    Formats response using the PromptBuilder and logs to conversation history.
    """
    logger.info("Agent: Running response node...")
    
    plan_dict = state.get("current_plan") or {}
    plan_id = plan_dict.get("plan_id", "unknown")
    steps = state.get("completed_steps", [])
    artifacts = state.get("available_artifacts", [])
    errors = state.get("errors", "None")
    
    # Build responder prompt layout using PromptBuilder
    system_prompt = PromptBuilder.build_response_generation_prompt(
        intent=plan_dict.get("intent", "Unknown"),
        completed_steps=steps,
        artifacts=artifacts,
        errors=errors
    )
    
    user_prompt = f"User Request: '{state['query']}'"
    
    try:
        response_text = llm.generate(user_prompt, system_prompt=system_prompt)
    except Exception as e:
        logger.error(f"Agent: Response prompt generation failed: {str(e)}")
        response_text = f"Planner completed. Plan ID: {plan_id}. Executed steps: {steps}."
        if state.get("errors"):
            response_text += f" Error: {state.get('errors')}"
            
    # Save the turn details in Memory Manager (serializes memory.json)
    try:
        add_to_memory(
            query=state["query"],
            plan_id=plan_id,
            steps=steps,
            artifacts=artifacts,
            summary=response_text
        )
    except Exception as e:
        logger.error(f"Agent: Memory logging turn failed: {str(e)}")
        
    return {
        "response": response_text,
        "plan_history": state.get("plan_history", []) + [plan_dict] if plan_dict else []
    }
