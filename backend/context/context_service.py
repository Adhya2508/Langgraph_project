import logging
import os
import yaml
from typing import Dict, Any, List, Optional
from backend.core.execution_context import ExecutionContext
from backend.memory.memory_manager import load_memory
from backend.utils.metadata_manager import load_metadata
from backend.utils.artifact_manager import _load_registry
from backend.core.capability_registry import list_capabilities
from backend.context.prompt_builder import PromptBuilder

logger = logging.getLogger("bank-segmentation-agent.context_service")

# Resolve base backend directory path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class ContextService:
    """
    Central service responsible for assembling conversation summaries, 
    configs, metadata, prompt templates, and registries into a unified ExecutionContext.
    """
    @staticmethod
    def build_execution_context(query: str = "", target_priority_threshold: float = 70.0) -> ExecutionContext:
        """
        Assembles all parameters required for Agent runtime runs.
        
        Args:
            query (str): Current query input.
            target_priority_threshold (float): Default rule threshold.
            
        Returns:
            ExecutionContext: Unified and loaded execution context class object.
        """
        logger.info("ContextService: Starting Context preparation...")
        
        # 1. Load memory details
        memory = load_memory()
        memory_summary = memory.get("summary", "No conversations recorded yet.")
        
        # 2. Load run metadata
        metadata = load_metadata()
        
        # 3. Load registered files list
        registry = _load_registry()
        available_artifacts = list(registry.values())
        
        # 4. Load YAML configs from outputs/config folders
        configurations: Dict[str, Any] = {}
        config_override: Dict[str, Any] = {}
        
        # Load segmentation config override values
        seg_config_path = os.path.join(BASE_DIR, "config", "segmentation_config.yaml")
        if os.path.exists(seg_config_path):
            try:
                with open(seg_config_path, "r") as f:
                    configurations["segmentation"] = yaml.safe_load(f) or {}
                logger.info(f"ContextService: Loaded K-Means config from {seg_config_path}")
            except Exception as e:
                logger.warning(f"ContextService: Failed to parse segmentation config: {str(e)}")
                configurations["segmentation"] = {}
        else:
            configurations["segmentation"] = {}

        # Load recommendation rules config values
        rec_rules_path = os.path.join(BASE_DIR, "config", "recommendation_rules.yaml")
        if os.path.exists(rec_rules_path):
            try:
                with open(rec_rules_path, "r") as f:
                    configurations["recommendations"] = yaml.safe_load(f) or {}
                logger.info(f"ContextService: Loaded Recommendation rules from {rec_rules_path}")
                
                # Check for customized priority threshold override
                scoring = configurations["recommendations"].get("scoring_rules", {})
                if "priority_threshold" in scoring:
                    target_priority_threshold = float(scoring["priority_threshold"])
                    logger.info(f"ContextService: Overriding priority threshold to {target_priority_threshold} from config")
            except Exception as e:
                logger.warning(f"ContextService: Failed to parse recommendation config: {str(e)}")
                configurations["recommendations"] = {}
        else:
            configurations["recommendations"] = {}
            
        # 5. Load capabilities list
        caps = list_capabilities()
        capabilities_list = [c.to_dict() for c in caps]
        
        # 6. Build prompt context using PromptBuilder
        prompt_context = {
            "system_prompt": PromptBuilder.build_system_prompt(metadata, memory_summary, available_artifacts),
            "planning_prompt": PromptBuilder.build_planning_prompt(query, capabilities_list)
        }
        
        # 7. Assemble Unified ExecutionContext Object
        context = ExecutionContext(
            target_priority_threshold=target_priority_threshold,
            config_override=config_override
        )
        context.query = query
        context.memory = memory
        context.metadata = metadata
        context.available_artifacts = available_artifacts
        context.configurations = configurations
        context.available_capabilities = capabilities_list
        context.prompt_context = prompt_context
        
        logger.info("ContextService: Successfully assembled ExecutionContext.")
        return context
