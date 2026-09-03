"""
backend/llm/mistral_provider.py
────────────────────────────────
Mistral AI REST API LLM provider.

All configuration (api_key, model, temperature, timeout) is injected
by the LLM factory — this module never reads os.getenv() directly.
"""

import json
import logging
import time
from typing import Dict, Any, List, Optional

from backend.llm.base import BaseLLM

logger = logging.getLogger("bank-segmentation-agent.mistral_provider")


class MistralProvider(BaseLLM):
    """
    Mistral AI API LLM provider.
    Implements BaseLLM interface. Uses requests to post completions.

    All parameters are explicit — no environment variable access.
    """

    _COMPLETIONS_URL = "https://api.mistral.ai/v1/chat/completions"

    def __init__(
        self,
        api_key: str = "",
        model: str = "mistral-small-latest",
        temperature: float = 0.2,
        timeout: int = 60,
        retry_attempts: int = 3,
        retry_delay: float = 2.0,
    ) -> None:
        """
        Args:
            api_key:        Mistral API key. Empty string → mock engine.
            model:          Model identifier (e.g. "mistral-small-latest").
            temperature:    Sampling temperature 0.0–2.0.
            timeout:        HTTP request timeout in seconds.
            retry_attempts: Number of retries on transient failures.
            retry_delay:    Base delay between retries (exponential backoff).
        """
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay

    # ── Public interface ──────────────────────────────────────────────

    def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return self.chat(messages, **kwargs)

    def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        if not self.api_key:
            logger.warning(
                "MISTRAL_API_KEY is not configured. "
                "Falling back to rule-based mock engine."
            )
            return self._mock_chat(messages)

        temperature = kwargs.get("temperature", self.temperature)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        import requests

        last_error: Exception = RuntimeError("No attempts made")
        for attempt in range(1, self.retry_attempts + 1):
            try:
                response = requests.post(
                    self._COMPLETIONS_URL,
                    headers=headers,
                    json=payload,
                    timeout=self.timeout,
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
            except Exception as exc:
                last_error = exc
                if attempt < self.retry_attempts:
                    wait = self.retry_delay * (2 ** (attempt - 1))
                    logger.warning(
                        f"Mistral API attempt {attempt}/{self.retry_attempts} failed: {exc}. "
                        f"Retrying in {wait:.1f}s..."
                    )
                    time.sleep(wait)

        logger.error(
            f"Mistral API failed after {self.retry_attempts} attempts: {last_error}. "
            "Falling back to rule-based mock engine."
        )
        return self._mock_chat(messages)

    def structured_output(
        self,
        prompt: str,
        schema: Any,
        system_prompt: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        full_prompt = (
            f"{prompt}\n\nYou must return ONLY a raw JSON object matching the schema below. "
            f"Do NOT wrap in markdown blocks, formatting tags, or backticks.\n"
            f"Schema:\n{json.dumps(schema) if isinstance(schema, dict) else str(schema)}"
        )
        content = self.generate(full_prompt, system_prompt=system_prompt, **kwargs)

        # Strip markdown code fences if present
        clean = content.strip()
        if clean.startswith("```"):
            lines = clean.split("\n")
            if lines[0].startswith("```"):
                clean = "\n".join(lines[1:-1]).strip()

        try:
            return json.loads(clean)
        except Exception as exc:
            logger.error(
                f"Failed to parse structured JSON from LLM: {exc}. "
                f"Original response: {content}"
            )
            is_planning = isinstance(schema, dict) and "steps" in schema.get("properties", {})
            return self._mock_structured(prompt, is_planning=is_planning)

    # ── Mock fallback engine ──────────────────────────────────────────

    def _mock_chat(self, messages: List[Dict[str, str]]) -> str:
        user_msg = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"), ""
        )
        if "summary" in user_msg.lower() or "explain" in user_msg.lower():
            return (
                "Segmentation execution successfully completed. "
                "Segment characteristics have been processed and actions recommended."
            )
        return "Mock provider chat completion response."

    def _mock_structured(self, prompt: str, is_planning: bool = False) -> Dict[str, Any]:
        pl = prompt.lower()

        intent = "Unknown Request"
        tool = "unknown"
        steps: List[str] = []
        summary = "Could not map query to any capability."
        reasoning = "Query did not match any standard system keywords."

        if "clean" in pl or "standardize" in pl:
            intent, tool, steps = "Clean Dataset", "clean_dataset", ["clean_dataset"]
            summary = "Standardize and clean the uploaded dataset."
            reasoning = "User requested data cleaning actions."
        elif "eda" in pl or "analyze" in pl or "explore" in pl:
            intent, tool, steps = "Run EDA", "run_eda", ["run_eda"]
            summary = "Run automated exploratory data analysis."
            reasoning = "User requested statistical data exploratory summary."
        elif "feature" in pl or "rfm" in pl:
            intent, tool, steps = "Generate Features", "generate_customer_features", ["generate_customer_features"]
            summary = "Extract RFM behavioral customer features."
            reasoning = "User requested customer feature engineering."
        elif "explain" in pl or "why" in pl:
            intent, tool, steps = "Explain Clusters", "run_explainability", ["run_explainability"]
            summary = "Compute Z-score distinguishing features."
            reasoning = "User requested cluster profiling explanations."
        elif "segment" in pl or "cluster" in pl or "group" in pl:
            intent, tool, steps = "Segment Customers", "run_segmentation", ["run_segmentation"]
            summary = "Run K-Means segmentation profiling."
            reasoning = "User requested customer segmentation."
        elif "recommend" in pl or "action" in pl or "offer" in pl:
            intent, tool, steps = "Recommend Actions", "run_recommendations", ["run_recommendations"]
            summary = "Evaluate business cross-sell recommendations."
            reasoning = "User requested segment-level product recommendations."

        # Compound multi-step queries
        if "segment" in pl and "explain" in pl and "recommend" in pl:
            intent = "Segment, Explain and Recommend"
            steps = ["run_segmentation", "run_explainability", "run_recommendations"]
            reasoning = "Query requests customer segments, cluster explanations, and offerings recommendations."
        elif "eda" in pl and "summary" in pl:
            intent = "Run EDA and Summary"
            steps = ["run_eda"]
            reasoning = "Query requests statistical description reports."

        if is_planning:
            return {"intent": intent, "steps": steps, "reasoning": reasoning}
        return {"intent": intent, "tool_used": tool, "confidence": 0.95, "summary": summary}
