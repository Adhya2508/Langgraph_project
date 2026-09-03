import logging
from typing import Dict, Any, List

logger = logging.getLogger("bank-segmentation-agent.prompt_builder")

class PromptBuilder:
    """
    Service responsible for building dynamic system, planning,
    and responder prompt layouts for the AI Agent.
    """
    @staticmethod
    def build_system_prompt(metadata: Dict[str, Any], memory_summary: str, available_artifacts: List[str]) -> str:
        """
        Builds a general system context prompt incorporating pipeline status and history summaries.
        """
        artifacts_str = ", ".join(available_artifacts) if available_artifacts else "None"
        return (
            "You are a Bank Customer Segmentation AI Agent.\n"
            f"Conversation Summary context: {memory_summary}\n"
            f"Active run metadata: {metadata}\n"
            f"Available Artifacts on disk: {artifacts_str}\n"
        )
        
    @staticmethod
    def build_planning_prompt(query: str, capabilities: List[Dict[str, Any]]) -> str:
        """
        Builds instructions for the planning LLM node, mapping query requests to capability parameters.
        """
        caps_desc = []
        for idx, cap in enumerate(capabilities):
            caps_desc.append(
                f"{idx+1}. \"{cap['name']}\" - {cap['description']} "
                f"(Inputs: {cap['required_inputs']}, Outputs: {cap['generated_outputs']}, Prerequisites: {cap['dependencies']})"
            )
        caps_str = "\n".join(caps_desc)
        
        return (
            "You are the central Planning Engine for a Bank Customer Segmentation AI Agent.\n"
            "Your role is to analyze a user's request and construct a step-by-step ordered list of capability tools required.\n\n"
            f"Available Capabilities:\n{caps_str}\n\n"
            f"User Request: '{query}'\n\n"
            "You must return ONLY a raw JSON block matching this structure:\n"
            "{\n"
            "    \"intent\": \"A concise description of detected query goal.\",\n"
            "    \"steps\": [\"step_name_1\", \"step_name_2\", ...],\n"
            "    \"reasoning\": \"Reason why these steps and sequence are chosen.\"\n"
            "}"
        )

    @staticmethod
    def build_response_generation_prompt(intent: str, completed_steps: List[str], artifacts: List[str], errors: str) -> str:
        """
        Formats instructions for response construction nodes compiling user replies.
        """
        steps_str = ", ".join(completed_steps) if completed_steps else "None"
        artifacts_str = ", ".join(artifacts) if artifacts else "None"
        
        return (
            "You are a professional banking Customer Segmentation Analyst AI Agent.\n"
            "Review the executed analytical pipeline details:\n"
            f" - Detected User Intent: {intent}\n"
            f" - Capabilities Executed: {steps_str}\n"
            f" - Output Artifacts Generated: {artifacts_str}\n"
            f" - Errors Occurred: {errors if errors else 'None'}\n\n"
            "Provide a concise, professional business summary explanation of what was achieved."
        )
