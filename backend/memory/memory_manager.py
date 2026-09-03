import os
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger("bank-segmentation-agent.memory_manager")

# Resolve the backend folder as base path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEMORY_PATH = os.path.join(BASE_DIR, "outputs", "memory.json")

def load_memory() -> Dict[str, Any]:
    """Load conversation memory from outputs/memory.json."""
    if not os.path.exists(MEMORY_PATH):
        os.makedirs(os.path.dirname(MEMORY_PATH), exist_ok=True)
        return {
            "summary": "Initial conversation memory context. No activities logged yet.",
            "history": []
        }
    try:
        with open(MEMORY_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read memory file at {MEMORY_PATH}: {str(e)}")
        return {
            "summary": "Initial conversation memory context. No activities logged yet.",
            "history": []
        }

def add_to_memory(query: str, plan_id: str, steps: List[str], artifacts: List[str], summary: str) -> None:
    """
    Appends a query turn to history, triggers summarization, and saves to disk.
    """
    memory = load_memory()
    turn = {
        "query": query,
        "plan_id": plan_id,
        "steps": steps,
        "artifacts": artifacts,
        "summary": summary
    }
    memory["history"].append(turn)
    
    # Dynamically trigger the summarizer to condense conversation details
    from backend.memory.summarizer import summarize_conversation
    try:
        updated_summary = summarize_conversation(memory)
        memory["summary"] = updated_summary
    except Exception as e:
        logger.error(f"Memory summarization trigger failed: {str(e)}")
        
    try:
        os.makedirs(os.path.dirname(MEMORY_PATH), exist_ok=True)
        with open(MEMORY_PATH, "w") as f:
            json.dump(memory, f, indent=4)
        logger.info(f"Successfully serialized conversation history turn in: {MEMORY_PATH}")
    except Exception as e:
        logger.error(f"Failed to write memory file at {MEMORY_PATH}: {str(e)}")

def get_memory_summary() -> str:
    """Fetch the condensed conversation text summary."""
    memory = load_memory()
    return memory.get("summary", "No activities logged yet.")
