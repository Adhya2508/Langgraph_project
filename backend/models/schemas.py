from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class StatusResponse(BaseModel):
    """Response model for the service health check/status endpoint."""
    status: str = Field(..., description="The status of the service, e.g., 'running'")
    service: str = Field(..., description="The name of the service")

class UploadResponse(BaseModel):
    """Response model representing the metadata of an uploaded CSV file."""
    filename: str = Field(..., description="The name of the uploaded file")
    rows: int = Field(..., description="The number of rows in the CSV file")
    columns: int = Field(..., description="The number of columns in the CSV file")
    column_names: List[str] = Field(..., description="List of column names in the CSV file")
    file_size: str = Field(..., description="The human-readable file size of the CSV")
    uploaded_at: str = Field(..., description="ISO 8601 timestamp of when the file was uploaded")

class CleaningReport(BaseModel):
    """Detailed report metrics from the data cleaning pipeline."""
    original_rows: int = Field(..., description="Total rows in the dataset before cleaning")
    clean_rows: int = Field(..., description="Total rows in the dataset after cleaning")
    duplicates_removed: int = Field(..., description="Number of duplicate rows removed")
    missing_values_filled: int = Field(..., description="Number of missing values that were imputed")
    invalid_rows: int = Field(..., description="Number of invalid records that were filtered out")
    columns_dropped: int = Field(..., description="Number of columns dropped because they were entirely empty")
    outliers_detected: Dict[str, int] = Field(..., description="Mapping of numeric columns to the count of detected outliers")
    execution_time: str = Field(..., description="Duration of the cleaning execution")

class CleanResponse(BaseModel):
    """Response structure for the POST /clean endpoint."""
    status: str = Field(..., description="Status of the operation, e.g., 'success'")
    report: CleaningReport = Field(..., description="Summary of the cleaning operation metrics")
    cleaned_dataset: str = Field(..., description="The relative path to the saved cleaned CSV file")

class EDAResponse(BaseModel):
    """Response structure for the POST /eda endpoint."""
    status: str = Field(..., description="Status of the operation, e.g., 'success'")
    summary: Dict[str, Any] = Field(..., description="Comprehensive JSON report of the dataset metrics")
    generated_reports: List[str] = Field(..., description="Paths to the exported CSV/text report files")
    visualizations: List[str] = Field(..., description="Paths to the exported interactive HTML Plotly charts")

class FeatureReport(BaseModel):
    """Detailed report metrics from the feature engineering pipeline."""
    number_of_customers: int = Field(..., description="Total unique customer records generated")
    number_of_features: int = Field(..., description="Total behavioral features generated")
    generated_features: List[str] = Field(..., description="Names of the features generated successfully")
    skipped_features: List[str] = Field(..., description="Names of the features that were skipped due to missing columns")
    execution_time: str = Field(..., description="Time taken to perform feature engineering")

class FeatureResponse(BaseModel):
    """Response structure for the POST /features endpoint."""
    status: str = Field(..., description="Status of the operation, e.g., 'success'")
    report: FeatureReport = Field(..., description="Summary report of the feature engineering pipeline execution")
    customer_features: str = Field(..., description="Relative file path of the saved customer features table")

class SegmentResponse(BaseModel):
    """Response structure for the POST /segment endpoint."""
    status: str = Field(..., description="Status of the operation, e.g., 'success'")
    algorithm_used: str = Field(..., description="The clustering algorithm selected and used")
    number_of_clusters: int = Field(..., description="Total number of clusters generated")
    best_silhouette_score: float = Field(..., description="The Silhouette metric evaluated for the best configuration")
    generated_artifacts: Dict[str, str] = Field(..., description="Pointers to all saved CSV/JSON outputs on disk")

class ExplainResponse(BaseModel):
    """Response structure for the POST /explain endpoint."""
    status: str = Field(..., description="Status of the operation, e.g., 'success'")
    clusters_explained: int = Field(..., description="Total number of clusters analyzed and explained")
    generated_artifacts: List[str] = Field(..., description="Pointers to all saved report files on disk")
    business_summary: str = Field(..., description="The non-technical executive summary report text contents")

class RecommendResponse(BaseModel):
    """Response structure for the POST /recommend endpoint."""
    status: str = Field(..., description="Status of the operation, e.g., 'success'")
    customers_processed: int = Field(..., description="Total count of customer profiles processed")
    recommendations_generated: int = Field(..., description="Total count of recommendations generated")
    high_priority_customers: int = Field(..., description="Total count of priority (High/Very High) customers targeted")
    generated_artifacts: Dict[str, str] = Field(..., description="Pointers to all saved CSV/JSON outputs on disk")

class AgentRequest(BaseModel):
    """Request structure for the POST /agent endpoint."""
    query: str = Field(..., description="Natural language query or instruction for the AI agent")

class AgentResponse(BaseModel):
    """Response structure for the POST /agent endpoint."""
    status: str = Field(..., description="Execution status, e.g., 'success', 'failure'")
    plan_id: str = Field(..., description="Unique incremental execution plan ID")
    detected_intent: str = Field(..., description="The detected customer intent mapping")
    steps_executed: List[str] = Field(..., description="Ordered list of capabilities executed in this run")
    artifacts_used: List[str] = Field(..., description="Pointers to all files read/referenced in this run")
    generated_outputs: List[str] = Field(..., description="Pointers to all newly created report/dataset outputs")
    execution_time: str = Field(..., description="Performance runtime duration metrics")
    errors: Optional[str] = Field(None, description="Detailed trace logs of any tool failures")
    final_response: str = Field(..., description="User-friendly summary explanation of tool actions")








