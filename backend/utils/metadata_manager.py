import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger("bank-segmentation-agent.metadata_manager")

# Resolve the backend folder as the base directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
METADATA_PATH = os.path.join(BASE_DIR, "outputs", "metadata.json")

def load_metadata() -> Dict[str, Any]:
    """Load the JSON run metadata from outputs/metadata.json."""
    if not os.path.exists(METADATA_PATH):
        # Create output folders if they do not exist
        os.makedirs(os.path.dirname(METADATA_PATH), exist_ok=True)
        return {}
    try:
        with open(METADATA_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read metadata file at {METADATA_PATH}: {str(e)}")
        return {}

def update_metadata(data: Dict[str, Any]) -> None:
    """
    Update the run metadata JSON file with new key-value pairs.
    Appends or overrides fields dynamically.
    """
    metadata = load_metadata()
    metadata.update(data)
    try:
        os.makedirs(os.path.dirname(METADATA_PATH), exist_ok=True)
        with open(METADATA_PATH, "w") as f:
            json.dump(metadata, f, indent=4)
        logger.info(f"Successfully updated metadata parameters in: {METADATA_PATH}")
    except Exception as e:
        logger.error(f"Failed to write metadata file at {METADATA_PATH}: {str(e)}")
