import logging
from typing import Dict, Any
from backend.llm.factory import get_llm

logger = logging.getLogger("bank-segmentation-agent.summarizer")

# Resolve LLM provider client
llm = get_llm()

SUMMARIZER_PROMPT = """
You are a Conversation Memory Summarizer for a Bank Customer Segmentation Agent.
Your job is to read the conversation history log and write a concise business summary paragraph.

Retain:
- Important user goals (e.g., cleaning dataset, running segmentation)
- Completed analyses
- Generated output artifacts
- Previous recommendations

Discard:
- Unimportant chit-chat and technical JSON parameters.

Return ONLY the summary paragraph.
"""

def summarize_conversation(memory: Dict[str, Any]) -> str:
    """
    Summarizes conversation history log records.
    Uses LLM client or rule-based fallback if offline.
    """
    history = memory.get("history", [])
    if not history:
        return "No conversation history logged yet."
        
    # Build text history log representation
    history_str_list = []
    for idx, turn in enumerate(history):
        history_str_list.append(
            f"Turn {idx+1}:\n"
            f" - Query: '{turn.get('query')}'\n"
            f" - Plan ID: {turn.get('plan_id')}\n"
            f" - Executed Steps: {', '.join(turn.get('steps', []))}\n"
            f" - Artifacts Generated: {', '.join(turn.get('artifacts', []))}\n"
        )
    history_log = "\n".join(history_str_list)
    
    # 1. Execute LLM summarization
    try:
        prompt = f"Conversation History Log:\n{history_log}\n\nSummarize the history."
        summary = llm.generate(prompt, system_prompt=SUMMARIZER_PROMPT)
        return summary.strip()
    except Exception as e:
        logger.warning(f"Memory summarizer: LLM generation failed: {str(e)}. Falling back to rule-based indexing.")
        
        # Rule-based fallback summary builder
        intents_run = set(turn.get('query') for turn in history)
        steps_run = set()
        for turn in history:
            steps_run.update(turn.get('steps', []))
            
        latest_turn = history[-1]
        summary_text = (
            f"The user has executed analytical queries including: {list(intents_run)}. "
            f"Capabilities executed so far: {list(steps_run)}. "
            f"Latest execution generated plan ID {latest_turn.get('plan_id')} running steps {latest_turn.get('steps')}. "
            f"Latest artifacts created: {latest_turn.get('artifacts')}."
        )
        return summary_text
