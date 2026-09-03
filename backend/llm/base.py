from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class BaseLLM(ABC):
    """
    Abstract base class for all LLM providers.
    Ensures provider-agnostic calling of LLMs across the workspace.
    """
    
    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        """Generate a response text from a single prompt."""
        pass
        
    @abstractmethod
    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Execute a multi-turn chat interaction."""
        pass

    @abstractmethod
    def structured_output(self, prompt: str, schema: Any, system_prompt: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Generate a response constrained to a Pydantic model or schema dictionary."""
        pass
