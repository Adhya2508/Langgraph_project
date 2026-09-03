import logging
from backend.utils.artifact_manager import get_latest_artifact

logger = logging.getLogger("bank-segmentation-agent.artifact_resolver")

class ArtifactResolver:
    """
    Utility service responsible for resolving physical file paths 
    for datasets and summaries via the central Artifact Manager.
    Removes hardcoded file paths from pipeline routines.
    """
    @staticmethod
    def get_raw_dataset() -> str:
        """Resolve the path to the raw dataset uploaded by the user."""
        return get_latest_artifact("raw_dataset") or ""

    @staticmethod
    def get_cleaned_dataset() -> str:
        """Resolve the path to the cleaned dataset."""
        return get_latest_artifact("cleaned_dataset") or ""

    @staticmethod
    def get_customer_features() -> str:
        """Resolve the path to the engineered customer features CSV."""
        return get_latest_artifact("customer_features") or ""

    @staticmethod
    def get_segment_mapping() -> str:
        """Resolve the path to the cluster mapping file."""
        return get_latest_artifact("segment_mapping") or ""

    @staticmethod
    def get_cluster_summary() -> str:
        """Resolve the path to the cluster statistics summary."""
        return get_latest_artifact("cluster_summary") or ""

    @staticmethod
    def get_cluster_explanations() -> str:
        """Resolve the path to the cluster explainability JSON."""
        return get_latest_artifact("cluster_explanations") or ""

    @staticmethod
    def get_customer_recommendations() -> str:
        """Resolve the path to the customer product recommendations CSV."""
        return get_latest_artifact("customer_recommendations") or ""
