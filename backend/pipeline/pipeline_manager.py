import logging
from typing import Tuple, Dict, Any, List
import pandas as pd
from backend.core.execution_context import ExecutionContext
from backend.tools.explainability import run_explainability
from backend.tools.recommendation import run_recommendations

logger = logging.getLogger("bank-segmentation-agent.pipeline_manager")

def run_explainability_pipeline() -> Tuple[Dict[str, Any], List[str], List[str], str]:
    """
    Orchestrates the execution of the Explainability Engine:
    1. Loads the latest segmentation CSV and summary artifacts.
    2. Executes Z-score analysis and dynamic text constructions.
    3. Exports reports and Plotly charts to disk.
    4. Registers artifacts with the Artifact Manager.
    5. Updates execution indicators in the Metadata Manager.
    
    Returns:
        Tuple[Dict[str, Any], List[str], List[str], str]:
            1. Cluster explanations map details.
            2. List of generated report file paths.
            3. List of generated visualization HTML paths.
            4. Non-technical business summary text contents.
    """
    logger.info("Pipeline Manager: Starting explainability pipeline...")
    cluster_explanations, generated_reports, visualizations, summary_text = run_explainability()
    logger.info("Pipeline Manager: Explainability pipeline execution successfully finished.")
    return cluster_explanations, generated_reports, visualizations, summary_text

def run_recommendations_pipeline(context: ExecutionContext) -> Tuple[pd.DataFrame, Dict[str, Any], str]:
    """
    Orchestrates the execution of the Recommendation Engine:
    1. Loads features and segmentations.
    2. Runs scoring evaluations via the Decision Engine.
    3. Saves customer priorities and summaries.
    4. Registers all reports with the Artifact and Metadata Managers.
    """
    logger.info("Pipeline Manager: Starting recommendations pipeline...")
    recs_df, stats, path = run_recommendations(context)
    logger.info("Pipeline Manager: Recommendations pipeline successfully finished.")
    return recs_df, stats, path
