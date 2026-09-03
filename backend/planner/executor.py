import logging
import os
import time
import pandas as pd
from typing import Dict, Any, List
from backend.planner.plan import ExecutionPlan
from backend.core.tool_registry import get_tool
from backend.utils.artifact_manager import _load_registry, get_latest_artifact

logger = logging.getLogger("bank-segmentation-agent.executor")

def execute_plan(plan: ExecutionPlan, context: Any) -> Dict[str, Any]:
    """
    Executes the ordered steps in an ExecutionPlan sequentially.
    Resolves inputs, calls registries, aggregates outputs, and handles failures.
    
    Args:
        plan (ExecutionPlan): The plan detailing steps to execute.
        context (Any): Current ExecutionContext.
        
    Returns:
        Dict[str, Any]: Status summary containing execution lists and error logs.
    """
    plan.status = "running"
    start_time = time.time()
    
    completed_steps: List[str] = []
    
    # Cache artifacts registered before this plan run
    registry_before = set(_load_registry().values())
    
    for step in plan.steps:
        logger.info(f"Executor: Executing plan step '{step}'...")
        try:
            tool_func = get_tool(step)
            
            # Inject positional arguments dynamically based on tool properties
            if step == "clean_dataset":
                raw_path = get_latest_artifact("raw_dataset")
                if not raw_path or not os.path.exists(raw_path):
                    raise ValueError("Prerequisite artifact 'raw_dataset' is missing. Please upload a dataset first.")
                df = pd.read_csv(raw_path)
                logger.info(f"Executor: Invoking clean_dataset with raw DataFrame from {raw_path}...")
                tool_func(df)
                
            elif step in ["run_eda", "generate_customer_features"]:
                cleaned_path = get_latest_artifact("cleaned_dataset")
                if not cleaned_path or not os.path.exists(cleaned_path):
                    raise ValueError("Prerequisite artifact 'cleaned_dataset' is missing. Run clean_dataset first.")
                df = pd.read_csv(cleaned_path)
                logger.info(f"Executor: Invoking '{step}' with cleaned DataFrame from {cleaned_path}...")
                tool_func(df)
                
            elif step == "run_recommendations":
                logger.info("Executor: Invoking run_recommendations with ExecutionContext...")
                tool_func(context)
                
            else:
                # run_segmentation, run_explainability
                logger.info(f"Executor: Invoking standard tool '{step}' with no arguments...")
                tool_func()
                
            completed_steps.append(step)
            logger.info(f"Executor: Plan step '{step}' completed successfully.")
            
        except Exception as e:
            error_msg = f"Plan execution failed at step '{step}': {str(e)}"
            logger.error(f"Executor: {error_msg}")
            
            plan.status = "failed"
            plan.errors = error_msg
            plan.execution_time = time.time() - start_time
            
            # Detect any artifacts that did compile before the failure
            registry_after = _load_registry()
            new_artifacts = [v for k, v in registry_after.items() if v not in registry_before]
            
            return {
                "status": "failure",
                "completed_steps": completed_steps,
                "artifacts_generated": new_artifacts,
                "errors": error_msg
            }
            
    # Success completion tracking
    registry_after = _load_registry()
    new_artifacts = [v for k, v in registry_after.items() if v not in registry_before]
    
    plan.status = "completed"
    plan.execution_time = time.time() - start_time
    logger.info(f"Executor: Full execution plan successfully completed in {plan.execution_time:.2f}s")
    
    return {
        "status": "success",
        "completed_steps": completed_steps,
        "artifacts_generated": new_artifacts,
        "errors": None
    }
