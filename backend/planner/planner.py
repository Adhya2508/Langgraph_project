import logging
import json
from typing import List, Dict, Any
from backend.planner.plan import ExecutionPlan
from backend.llm.factory import get_llm
from backend.core.capability_registry import get_capability, list_capabilities
from backend.core.execution_context import ExecutionContext

logger = logging.getLogger("bank-segmentation-agent.planner")

# Resolve LLM provider client
llm = get_llm()

PLANNER_SYSTEM_PROMPT = """
You are the central Planning Engine for a Bank Customer Segmentation AI Agent.
Your role is to analyze a user's request and construct a step-by-step ordered list of capability tools required to execute and fulfill their goal.

Available Capabilities inside the registry:
1. "clean_dataset" (Prerequisite: raw_dataset) - standardize column headers, parse dates, handles null values.
2. "run_eda" (Prerequisite: cleaned_dataset) - compute descriptive stats, correlation matrix, outlier checks.
3. "generate_customer_features" (Prerequisite: cleaned_dataset) - build RFM metrics, spending averages, active active indicators.
4. "run_segmentation" (Prerequisite: customer_features) - preprocess features and runs customer clustering.
5. "run_explainability" (Prerequisite: segment_mapping, cluster_summary) - execute z-score deviation characteristics.
6. "run_recommendations" (Prerequisite: customer_features, segment_mapping) - evaluate decision rules to offer items.

You must return ONLY a raw JSON block matching this structure:
{
    "intent": "A concise description of detected query goal.",
    "steps": ["step_name_1", "step_name_2", ...],
    "reasoning": "Reason why these steps and sequence are chosen."
}
"""

def resolve_dependencies(steps: List[str]) -> List[str]:
    """
    Validates and resolves dependencies dynamically based on the Capability Registry.
    Appends missing dependencies to the list in correct prerequisite order.
    """
    resolved: List[str] = []
    
    def visit(cap_name: str):
        if cap_name in resolved:
            return
        try:
            cap = get_capability(cap_name)
        except ValueError:
            logger.warning(f"Planner: Attempted to resolve unregistered capability: '{cap_name}'")
            return
            
        # Visit dependencies first
        for dep in cap.dependencies:
            visit(dep)
        resolved.append(cap_name)
        
    for step in steps:
        visit(step)
        
    return resolved

def create_execution_plan(query: str, context: ExecutionContext) -> ExecutionPlan:
    """
    Constructs an ExecutionPlan by mapping natural language prompts to capability tools.
    Supports structured LLM parsing and resolves dependencies dynamically.
    """
    logger.info(f"Planner: Generating plan for query: '{query}'")
    
    prompt = f"User Request: '{query}'"
    schema = {
        "type": "object",
        "properties": {
            "intent": {"type": "string"},
            "steps": {
                "type": "array",
                "items": {"type": "string"}
            },
            "reasoning": {"type": "string"}
        },
        "required": ["intent", "steps", "reasoning"]
    }
    
    # 1. Generate plan using LLM
    system_prompt = context.prompt_context.get("planning_prompt", PLANNER_SYSTEM_PROMPT)
    try:
        result = llm.structured_output(prompt, schema, system_prompt=system_prompt)
        intent = result.get("intent", "Analyze Query")
        raw_steps = result.get("steps", [])
        logger.info(f"Planner: LLM suggested raw steps: {raw_steps}")
    except Exception as e:
        logger.error(f"Planner: LLM structured plan generation failed: {str(e)}. Falling back to keyword rules.")
        # Rule-based fallback
        query_lower = query.lower()
        intent = "Process Pipeline Request"
        
        # Determine raw steps based on keywords
        if "segment" in query_lower and "explain" in query_lower and "recommend" in query_lower:
            raw_steps = ["run_segmentation", "run_explainability", "run_recommendations"]
        elif "segment" in query_lower and "explain" in query_lower:
            raw_steps = ["run_segmentation", "run_explainability"]
        elif "eda" in query_lower and "summary" in query_lower:
            raw_steps = ["run_eda"]
        elif "feature" in query_lower and "segment" in query_lower:
            raw_steps = ["generate_customer_features", "run_segmentation"]
        elif "recommend" in query_lower or "action" in query_lower:
            raw_steps = ["run_recommendations"]
        elif "explain" in query_lower:
            raw_steps = ["run_explainability"]
        elif "segment" in query_lower or "cluster" in query_lower:
            raw_steps = ["run_segmentation"]
        elif "feature" in query_lower:
            raw_steps = ["generate_customer_features"]
        elif "eda" in query_lower or "explore" in query_lower:
            raw_steps = ["run_eda"]
        elif "clean" in query_lower or "standardize" in query_lower:
            raw_steps = ["clean_dataset"]
        else:
            raw_steps = []
            
    # 2. Resolve dependencies dynamically via registry
    ordered_steps = resolve_dependencies(raw_steps)
    logger.info(f"Planner: Resolved execution sequence: {ordered_steps}")
    
    # 3. Collect required input files and expected output files from registry capabilities
    required_artifacts = []
    expected_outputs = []
    
    for step in ordered_steps:
        try:
            cap = get_capability(step)
            for req in cap.required_inputs:
                if req not in required_artifacts and req not in expected_outputs:
                    required_artifacts.append(req)
            for out in cap.generated_outputs:
                if out not in expected_outputs:
                    expected_outputs.append(out)
        except ValueError:
            pass
            
    return ExecutionPlan(
        query=query,
        intent=intent,
        steps=ordered_steps,
        required_artifacts=required_artifacts,
        expected_outputs=expected_outputs
    )
