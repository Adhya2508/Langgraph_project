import os
import json
import logging
from typing import Optional, Dict

logger = logging.getLogger("bank-segmentation-agent.artifact_manager")

# Resolve the backend folder as the base directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRY_PATH = os.path.join(BASE_DIR, "outputs", "artifacts.json")

def _load_registry() -> Dict[str, str]:
    """Load the JSON artifact registry from disk."""
    if not os.path.exists(REGISTRY_PATH):
        # Create output folders if they do not exist
        os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
        return {}
    try:
        with open(REGISTRY_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read artifact registry file at {REGISTRY_PATH}: {str(e)}")
        return {}

def _save_registry(registry: Dict[str, str]) -> None:
    """Save the JSON artifact registry to disk."""
    try:
        os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
        with open(REGISTRY_PATH, "w") as f:
            json.dump(registry, f, indent=4)
    except Exception as e:
        logger.error(f"Failed to write artifact registry file at {REGISTRY_PATH}: {str(e)}")

def register_artifact(name: str, path: str) -> None:
    """
    Register or update an artifact path in the JSON registry.
    Paths are converted to be relative to the backend/ folder for cross-platform portability.
    """
    registry = _load_registry()
    
    normalized_path = path
    if os.path.isabs(path):
        try:
            rel_path = os.path.relpath(path, BASE_DIR)
            if not rel_path.startswith(".."):
                normalized_path = rel_path
        except ValueError:
            # Fallback if relpath calculation fails (different drives on Windows)
            pass
            
    # Normalize backslashes to forward slashes for registry consistency
    normalized_path = normalized_path.replace("\\", "/")
    
    registry[name] = normalized_path
    _save_registry(registry)
    logger.info(f"Registered artifact '{name}' -> '{normalized_path}'")

def get_latest_artifact(name: str) -> Optional[str]:
    """
    Retrieve the absolute path of a registered artifact by name.
    Resolves stored relative paths to absolute paths.
    """
    registry = _load_registry()
    stored_path = registry.get(name)
    
    if not stored_path:
        logger.warning(f"Artifact '{name}' requested but not registered.")
        return None
        
    if not os.path.isabs(stored_path):
        # Resolve relative to the backend folder
        resolved_path = os.path.abspath(os.path.join(BASE_DIR, stored_path))
    else:
        resolved_path = os.path.abspath(stored_path)
        
    return resolved_path
