import os
import shutil
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

# ── Centralized configuration & logging ──────────────────────────────────────
# Import settings FIRST so that every subsequent module that also imports
# settings gets the same already-loaded singleton.
from backend.config.settings import settings
from backend.config.logging_config import configure_logging

# Bootstrap logging immediately so every import below already has a logger.
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_LOG_FILE = os.path.join(_PROJECT_ROOT, "logs", "application.log")
configure_logging(level=settings.log_level, log_file=_LOG_FILE)

from backend.models.schemas import StatusResponse, UploadResponse, CleanResponse, EDAResponse, FeatureResponse, SegmentResponse, ExplainResponse, RecommendResponse, AgentRequest, AgentResponse
from backend.tools.cleaning import clean_dataset
from backend.tools.eda import run_eda
from backend.tools.feature_engineering import generate_customer_features
from backend.tools.segmentation import run_segmentation
from backend.pipeline.pipeline_manager import run_explainability_pipeline, run_recommendations_pipeline
from backend.core.execution_context import ExecutionContext
from backend.core.agent_runtime import run_agent
from backend.utils.file_helpers import format_file_size, validate_and_parse_csv

logger = logging.getLogger("bank-segmentation-agent")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager (replaces deprecated @app.on_event).

    Startup responsibilities:
    - Log loaded configuration (secrets redacted)
    - Auto-create all required runtime directories
    """
    # ── STARTUP ──────────────────────────────────────────────────────
    logger.info("=" * 60)
    logger.info("Bank Customer Segmentation Agent — Starting Up")
    logger.info(f"Environment : {settings.app_env}")
    logger.info(f"Debug mode  : {settings.debug}")
    logger.info("=" * 60)

    # Log safe config summary (secrets redacted)
    cfg = settings.display()
    for key, value in cfg.items():
        logger.info("  {:<25} = {}".format(key, value))

    # Auto-create all required runtime directories
    required_dirs = [
        settings.upload_directory,
        settings.output_directory,
        settings.get_output_subdir("cleaned"),
        settings.get_output_subdir("eda"),
        settings.get_output_subdir("features"),
        settings.get_output_subdir("segmentation"),
        settings.get_output_subdir("explainability"),
        settings.get_output_subdir("recommendations"),
        os.path.join(_PROJECT_ROOT, "logs"),
    ]
    for d in required_dirs:
        os.makedirs(d, exist_ok=True)
        logger.debug(f"  Directory ready: {d}")

    logger.info("All required directories verified / created.")
    logger.info("Startup complete. Backend is ready to accept requests.")
    logger.info("=" * 60)

    yield  # Application runs here

    # ── SHUTDOWN ─────────────────────────────────────────────────────
    logger.info("Bank Customer Segmentation Agent — Shutting Down.")


app = FastAPI(
    title="Bank Customer Segmentation System",
    description="AI Agent-based Bank Customer Segmentation — Backend API.",
    version="1.0.0",
    lifespan=lifespan,
)

# Derive UPLOAD_DIR from settings (absolute path, auto-created at startup)
UPLOAD_DIR = settings.upload_directory

# ── CORS ─────────────────────────────────────────────────────────────────────
# Allow the Vite dev server and any same-origin production frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # CRA / alt dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_model=StatusResponse, tags=["Health Check"])
async def get_status() -> StatusResponse:
    """
    Returns the status and name of the service to verify it is running.
    """
    logger.info("Health check endpoint '/' called.")
    return StatusResponse(
        status="running",
        service="Bank Segmentation Agent"
    )

@app.post("/upload", response_model=UploadResponse, tags=["Upload"], status_code=status.HTTP_201_CREATED)
async def upload_csv(file: UploadFile = File(...)) -> UploadResponse:
    """
    Accepts a CSV file, saves it to the backend/uploads/ directory, 
    and returns metadata including filename, rows, columns, column names, 
    file size, and the upload timestamp.
    """
    filename = file.filename
    logger.info(f"Upload request received for file: {filename}")

    # 1. Validation: Check if a file was actually provided and check extension
    if not filename:
        logger.warning("Upload failed: No file name provided.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File upload failed: Filename is missing."
        )
        
    if not filename.lower().endswith('.csv'):
        logger.warning(f"Upload failed: File '{filename}' is not a CSV file.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only CSV files (.csv) are allowed."
        )

    # 2. Validation: Check for duplicate filename
    target_path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(target_path):
        logger.warning(f"Upload failed: File '{filename}' already exists.")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A file named '{filename}' already exists. Please rename the file and try again."
        )

    # 3. Save the file to disk
    logger.info(f"Saving '{filename}' to uploads directory...")
    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Error saving uploaded file '{filename}' to disk: {str(e)}")
        # Remove partial/corrupted file if it was created
        if os.path.exists(target_path):
            os.remove(target_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to storage: {str(e)}"
        )

    # 4. Parse the CSV file and validate content using pandas helper
    try:
        rows, columns, column_names = validate_and_parse_csv(target_path)
    except pd.errors.EmptyDataError as e:
        # Clean up empty file
        if os.path.exists(target_path):
            os.remove(target_path)
        logger.warning(f"Upload failed: Saved file '{filename}' is empty. Detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Empty file error: {str(e)}"
        )
    except (pd.errors.ParserError, ValueError) as e:
        # Clean up corrupted file
        if os.path.exists(target_path):
            os.remove(target_path)
        logger.warning(f"Upload failed: Saved file '{filename}' is corrupted or invalid. Detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Parsing error: {str(e)}"
        )
    except Exception as e:
        # Catch-all cleanup and server error propagation
        if os.path.exists(target_path):
            os.remove(target_path)
        logger.error(f"Unexpected error validating CSV '{filename}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected parsing error occurred: {str(e)}"
        )

    # 5. Retrieve final metadata
    file_size_bytes = os.path.getsize(target_path)
    file_size_str = format_file_size(file_size_bytes)
    uploaded_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    logger.info(f"File '{filename}' successfully validated and saved. Size: {file_size_str}")

    # Register raw dataset with Artifact Manager
    from backend.utils.artifact_manager import register_artifact
    register_artifact("raw_dataset", target_path)

    return UploadResponse(
        filename=filename,
        rows=rows,
        columns=columns,
        column_names=column_names,
        file_size=file_size_str,
        uploaded_at=uploaded_at_str
    )

@app.post("/clean", response_model=CleanResponse, tags=["Data Cleaning"])
async def clean_latest_dataset() -> CleanResponse:
    """
    Locates the most recently uploaded CSV file in the uploads folder,
    runs the dataset through the data cleaning pipeline, saves the results,
    and returns a summary report along with the path to the cleaned dataset.
    """
    logger.info("Clean dataset endpoint '/clean' called.")
    
    # 1. Locate the latest uploaded CSV file via Artifact Manager
    from backend.utils.artifact_manager import get_latest_artifact, register_artifact
    latest_file_path = get_latest_artifact("raw_dataset")
    
    if not latest_file_path or not os.path.exists(latest_file_path):
        logger.info("raw_dataset not registered in Artifact Manager or file missing, falling back to directory scan.")
        if not os.path.exists(UPLOAD_DIR):
            logger.warning("Uploads directory does not exist.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No uploaded files directory found. Please upload a dataset first."
            )
            
        try:
            csv_files = [
                os.path.join(UPLOAD_DIR, f) 
                for f in os.listdir(UPLOAD_DIR) 
                if f.lower().endswith('.csv')
            ]
        except Exception as e:
            logger.error(f"Error accessing uploads directory: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to scan uploads directory: {str(e)}"
            )
            
        if not csv_files:
            logger.warning("No CSV files found in uploads directory.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No uploaded CSV files found. Please upload a dataset first."
            )
            
        latest_file_path = max(csv_files, key=os.path.getmtime)
        register_artifact("raw_dataset", latest_file_path)
        
    logger.info(f"Latest uploaded file identified: {latest_file_path}")
    
    # 2. Read the latest CSV file
    try:
        if os.path.getsize(latest_file_path) == 0:
            raise pd.errors.EmptyDataError("The CSV file is empty.")
        df = pd.read_csv(latest_file_path)
    except pd.errors.EmptyDataError as e:
        logger.warning(f"File '{latest_file_path}' is empty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The latest uploaded CSV file is empty: {str(e)}"
        )
    except pd.errors.ParserError as e:
        logger.warning(f"File '{latest_file_path}' is corrupted: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse the latest CSV file: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error reading file '{latest_file_path}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading CSV file: {str(e)}"
        )
        
    if df.empty:
        logger.warning(f"Loaded DataFrame from '{latest_file_path}' is empty.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The dataset contains no records or rows to clean."
        )
        
    # 3. Pass DataFrame to the cleaning tool
    try:
        cleaned_df, report, cleaned_rel_path = clean_dataset(df)
    except PermissionError as e:
        logger.error(f"Permission error during cleaning save operation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save cleaned outputs due to server file permission error: {str(e)}"
        )
    except ValueError as e:
        logger.warning(f"Validation/value error during cleaning: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cleaning failed on input data error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during data cleaning: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during data cleaning: {str(e)}"
        )
        
    logger.info("Latest dataset successfully cleaned.")
    return CleanResponse(
        status="success",
        report=report,
        cleaned_dataset=cleaned_rel_path
    )

@app.post("/eda", response_model=EDAResponse, tags=["Exploratory Data Analysis"])
async def run_exploratory_data_analysis() -> EDAResponse:
    """
    Locates the most recently saved cleaned dataset, executes the Automated EDA tool,
    and returns comprehensive statistical summaries, reports, and visualization paths.
    """
    logger.info("EDA endpoint '/eda' called.")
    
    # 1. Resolve path to cleaned dataset via Artifact Manager
    from backend.utils.artifact_manager import get_latest_artifact, register_artifact
    cleaned_file_path = get_latest_artifact("cleaned_dataset")
    
    if not cleaned_file_path or not os.path.exists(cleaned_file_path):
        logger.info("cleaned_dataset not registered in Artifact Manager or file missing, falling back to default path.")
        cleaned_dir = settings.get_output_subdir("cleaned")
        cleaned_file_path = os.path.join(cleaned_dir, "cleaned_dataset.csv")
        
        if not os.path.exists(cleaned_file_path):
            logger.warning(f"Cleaned dataset not found at {cleaned_file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cleaned dataset not found. Please run the data cleaning tool (/clean) first."
            )
        register_artifact("cleaned_dataset", cleaned_file_path)
        
    # 2. Read cleaned CSV
    try:
        if os.path.getsize(cleaned_file_path) == 0:
            raise pd.errors.EmptyDataError("The cleaned dataset is empty.")
        df = pd.read_csv(cleaned_file_path)
    except pd.errors.EmptyDataError as e:
        logger.warning(f"Cleaned dataset is empty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The cleaned dataset is empty: {str(e)}"
        )
    except pd.errors.ParserError as e:
        logger.warning(f"Failed to parse cleaned dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse the cleaned dataset: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error reading cleaned dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading cleaned dataset file: {str(e)}"
        )
        
    if df.empty:
        logger.warning("Loaded cleaned DataFrame is empty.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The cleaned dataset contains no records or rows to perform EDA on."
        )
        
    # 3. Call stand-alone run_eda tool
    try:
        report_data, generated_reports, visualizations = run_eda(df)
    except ValueError as e:
        logger.warning(f"Validation error during EDA tool execution: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"EDA tool validation failed: {str(e)}"
        )
    except IOError as e:
        logger.error(f"File writing or permission error during EDA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server file permission error saving EDA outputs: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during EDA tool execution: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during EDA execution: {str(e)}"
        )
        
    logger.info("Exploratory Data Analysis completed successfully.")
    return EDAResponse(
        status="success",
        summary=report_data,
        generated_reports=generated_reports,
        visualizations=visualizations
    )

@app.post("/features", response_model=FeatureResponse, tags=["Feature Engineering"])
async def run_feature_engineering() -> FeatureResponse:
    """
    Locates the most recently saved cleaned dataset, executes the Feature Engineering tool,
    and returns a summary report of generated features alongside the customer feature table path.
    """
    logger.info("Feature engineering endpoint '/features' called.")
    
    # 1. Resolve path to cleaned dataset via Artifact Manager
    from backend.utils.artifact_manager import get_latest_artifact, register_artifact
    cleaned_file_path = get_latest_artifact("cleaned_dataset")
    
    if not cleaned_file_path or not os.path.exists(cleaned_file_path):
        logger.info("cleaned_dataset not registered in Artifact Manager or file missing, falling back to default path.")
        cleaned_dir = settings.get_output_subdir("cleaned")
        cleaned_file_path = os.path.join(cleaned_dir, "cleaned_dataset.csv")
        
        if not os.path.exists(cleaned_file_path):
            logger.warning(f"Cleaned dataset not found at {cleaned_file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cleaned dataset not found. Please run the data cleaning tool (/clean) first."
            )
        register_artifact("cleaned_dataset", cleaned_file_path)
        
    # 2. Read cleaned CSV
    try:
        if os.path.getsize(cleaned_file_path) == 0:
            raise pd.errors.EmptyDataError("The cleaned dataset is empty.")
        df = pd.read_csv(cleaned_file_path)
    except pd.errors.EmptyDataError as e:
        logger.warning(f"Cleaned dataset is empty: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The cleaned dataset is empty: {str(e)}"
        )
    except pd.errors.ParserError as e:
        logger.warning(f"Failed to parse cleaned dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse the cleaned dataset: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error reading cleaned dataset: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading cleaned dataset file: {str(e)}"
        )
        
    if df.empty:
        logger.warning("Loaded cleaned DataFrame is empty.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The cleaned dataset contains no records or rows to build features from."
        )
        
    # 3. Call stand-alone generate_customer_features tool
    try:
        features_df, report, features_rel_path = generate_customer_features(df)
    except ValueError as e:
        logger.warning(f"Validation error during feature engineering: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Feature engineering failed on validation: {str(e)}"
        )
    except IOError as e:
        logger.error(f"File writing or permission error during features creation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server file permission error saving feature tables: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during feature engineering: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during feature engineering: {str(e)}"
        )
        
    logger.info("Customer feature engineering completed successfully.")
    return FeatureResponse(
        status="success",
        report=report,
        customer_features=features_rel_path
    )

@app.post("/segment", response_model=SegmentResponse, tags=["Customer Segmentation"])
async def run_customer_segmentation() -> SegmentResponse:
    """
    Locates the latest customer features, executes the Customer Segmentation Engine,
    saves modeling files, and registers outputs inside the Artifact Manager registry.
    """
    logger.info("Segmentation endpoint '/segment' called.")
    
    # 1. Resolve path to customer features via Artifact Manager
    from backend.utils.artifact_manager import get_latest_artifact
    features_file_path = get_latest_artifact("customer_features")
    
    if not features_file_path or not os.path.exists(features_file_path):
        logger.warning("customer_features dataset artifact is missing.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer features table not found. Please run the feature engineering tool (/features) first."
        )
        
    # 2. Call stand-alone run_segmentation tool
    try:
        mapping_df, report_data, mapping_rel_path = run_segmentation()
    except ValueError as e:
        logger.warning(f"Validation or execution error during segmentation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Segmentation failed on validation: {str(e)}"
        )
    except IOError as e:
        logger.error(f"File writing or permission error during segmentation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server file permission error saving segmentation outputs: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during segmentation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during segmentation: {str(e)}"
        )
        
    logger.info("Customer segmentation completed successfully.")
    
    # Collect registered artifacts maps from registry to output in response
    from backend.utils.artifact_manager import _load_registry
    registry = _load_registry()
    artifacts_subset = {
        "segment_mapping": registry.get("segment_mapping", "outputs/segmentation/segment_mapping.csv"),
        "cluster_summary": registry.get("cluster_summary", "outputs/segmentation/cluster_summary.json"),
        "evaluation_report": registry.get("evaluation_report", "outputs/segmentation/evaluation_report.json"),
        "scaled_features": registry.get("scaled_features", "outputs/segmentation/scaled_features.csv")
    }
    
    return SegmentResponse(
        status="success",
        algorithm_used=report_data["algorithm_used"],
        number_of_clusters=report_data["number_of_clusters"],
        best_silhouette_score=report_data["best_silhouette_score"],
        generated_artifacts=artifacts_subset
    )

@app.post("/explain", response_model=ExplainResponse, tags=["Model Explainability"])
async def explain_customer_segments() -> ExplainResponse:
    """
    Executes the Pipeline Manager's Explainability process to analyze segments,
    generate dynamic z-score statistics, construct personalized reasons,
    output Plotly charts, and compile non-technical business summaries.
    """
    logger.info("Explainability endpoint '/explain' called.")
    
    # 1. Resolve path to segment mapping via Artifact Manager
    from backend.utils.artifact_manager import get_latest_artifact
    mapping_file = get_latest_artifact("segment_mapping")
    
    if not mapping_file or not os.path.exists(mapping_file):
        logger.warning("segment_mapping.csv artifact is missing.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment mapping not found. Please run the segmentation engine (/segment) first."
        )
        
    # 2. Call Pipeline Manager's orchestrator
    try:
        cluster_explanations, generated_reports, visualizations, summary_text = run_explainability_pipeline()
    except ValueError as e:
        logger.warning(f"Validation or reference error during explainability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Explainability execution failed: {str(e)}"
        )
    except IOError as e:
        logger.error(f"File writing or permission error during explainability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server file permission error saving explainability reports: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during explainability pipeline: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during explainability execution: {str(e)}"
        )
        
    logger.info("Customer segmentation explainability successfully finalized.")
    
    # Clean output path formats
    reports_rel = [f"outputs/explainability/{os.path.basename(r)}" for r in generated_reports]
    visuals_rel = [f"outputs/explainability/{os.path.basename(v)}" for v in visualizations]
    
    return ExplainResponse(
        status="success",
        clusters_explained=len(cluster_explanations),
        generated_artifacts=reports_rel + visuals_rel,
        business_summary=summary_text
    )

@app.post("/recommend", response_model=RecommendResponse, tags=["Recommendation Engine"])
async def recommend_business_strategies() -> RecommendResponse:
    """
    Executes the Pipeline Manager's Recommendation process using the Decision Engine
    and YAML rules. Generates customer-level scoring prioritizations and registers outputs.
    """
    logger.info("Recommendation endpoint '/recommend' called.")
    
    # 1. Resolve path to segment mapping via Artifact Manager
    from backend.utils.artifact_manager import get_latest_artifact
    mapping_file = get_latest_artifact("segment_mapping")
    
    if not mapping_file or not os.path.exists(mapping_file):
        logger.warning("segment_mapping.csv artifact is missing.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment mapping not found. Please run the segmentation engine (/segment) first."
        )
        
    # 2. Boot up Execution Context
    context = ExecutionContext()
    
    # 3. Call Pipeline Manager's orchestrator
    try:
        recs_df, stats, path = run_recommendations_pipeline(context)
    except ValueError as e:
        logger.warning(f"Validation or reference error during recommendation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Recommendation failed on validation: {str(e)}"
        )
    except IOError as e:
        logger.error(f"File writing or permission error during recommendations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server file permission error saving recommendation files: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during recommendations pipeline: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during recommendations execution: {str(e)}"
        )
        
    logger.info("Customer segmentation recommendations successfully finalized.")
    
    # Collect registered artifacts maps from registry to output in response
    from backend.utils.artifact_manager import _load_registry
    registry = _load_registry()
    artifacts_subset = {
        "customer_recommendations": registry.get("customer_recommendations", "outputs/recommendations/customer_recommendations.csv"),
        "segment_recommendations": registry.get("segment_recommendations", "outputs/recommendations/segment_recommendations.json"),
        "priority_customers": registry.get("priority_customers", "outputs/recommendations/priority_customers.csv"),
        "recommendation_summary": registry.get("recommendation_summary", "outputs/recommendations/recommendation_summary.txt"),
        "recommendation_statistics": registry.get("recommendation_statistics", "outputs/recommendations/recommendation_statistics.json")
    }
    
    return RecommendResponse(
        status="success",
        customers_processed=stats["total_customers"],
        recommendations_generated=stats["total_customers"],
        high_priority_customers=stats["high_priority_customers_count"],
        generated_artifacts=artifacts_subset
    )

@app.post("/agent", response_model=AgentResponse, tags=["AI Agent Orchestration"])
async def run_ai_agent(request: AgentRequest) -> AgentResponse:
    """
    Main entry point for AI Agent orchestration.
    Resolves natural language queries, maps them to intents, executes corresponding tools,
    and returns standardized responses.
    """
    logger.info(f"AI Agent route received query: '{request.query}'")
    
    try:
        response_data = run_agent(request.query)
        
        if response_data["status"] == "error":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=response_data.get("errors", "AI Agent execution error.")
            )
            
        return AgentResponse(
            status=response_data["status"],
            plan_id=response_data["plan_id"],
            detected_intent=response_data["detected_intent"],
            steps_executed=response_data["steps_executed"],
            artifacts_used=response_data["artifacts_used"],
            generated_outputs=response_data["generated_outputs"],
            execution_time=response_data["execution_time"],
            errors=response_data.get("errors"),
            final_response=response_data["final_response"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected crash in AI Agent route: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during agent runtime execution: {str(e)}"
        )

