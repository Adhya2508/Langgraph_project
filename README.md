# Bank Customer Segmentation System

> AI Agent-based Bank Customer Segmentation — Backend API

The backend is a production-ready FastAPI + LangGraph application supporting:

- **CSV Upload** → **Data Cleaning** → **Automated EDA** → **Feature Engineering** → **Customer Segmentation** → **Explainability** → **Recommendations**
- **Multi-step AI Agent** that maps natural language queries to tool pipelines
- **Centralized configuration** via pydantic-settings and `.env`
- **Secure secrets management** — no API keys in source code

---

## Quick Start

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd bank-segmentation-agent

# 2. Create a virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up your environment
cp .env.example .env
# Edit .env and add your MISTRAL_API_KEY

# 5. Start the backend
uvicorn backend.main:app --reload
```

The API will be live at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

## Configuration

All configuration is centralized in `backend/config/settings.py` using **pydantic-settings**.

### Configuration Files

| File | Purpose | Committed? |
|---|---|---|
| `.env` | Your local secrets and environment overrides | ❌ Never |
| `.env.example` | Template with all variables (no secrets) | ✅ Yes |
| `backend/config/settings.py` | Type-safe settings loader (pydantic-settings) | ✅ Yes |
| `backend/config/llm_config.yaml` | LLM model behaviour defaults | ✅ Yes |
| `backend/config/segmentation_config.yaml` | K-Means / DBSCAN hyperparameters | ✅ Yes |
| `backend/config/recommendation_rules.yaml` | Business rules and scoring thresholds | ✅ Yes |

### Importing Settings

```python
# Every module uses this import — never os.getenv() directly
from backend.config.settings import settings

api_key  = settings.mistral_api_key
model    = settings.model_name
temp     = settings.temperature
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `APP_ENV` | `development` | Environment: `development`, `staging`, `production` |
| `DEBUG` | `True` | Enable debug mode |
| `HOST` | `0.0.0.0` | Uvicorn bind host |
| `PORT` | `8000` | Uvicorn bind port |
| `LOG_LEVEL` | `INFO` | Log level: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` |
| `OUTPUT_DIRECTORY` | `backend/outputs` | Base directory for all tool outputs |
| `UPLOAD_DIRECTORY` | `backend/uploads` | Directory where uploaded CSVs are stored |
| `LLM_PROVIDER` | `mistral` | Active LLM provider |
| `MODEL_NAME` | `mistral-small-latest` | LLM model identifier |
| `TEMPERATURE` | `0.2` | Sampling temperature (0.0–2.0) |
| `MAX_TOKENS` | `2048` | Maximum completion tokens |
| `TOP_P` | `0.95` | Top-p nucleus sampling |
| `MISTRAL_API_KEY` | *(empty)* | **Secret** — your Mistral AI API key |

---

## Secrets Management

- API keys **must** be placed in `.env` — never in Python files or YAML
- `.env` is listed in `.gitignore` and will never be committed
- `.env.example` contains placeholder values and is safe to commit
- `settings.display()` logs all configuration with secrets redacted (`***`)

If `MISTRAL_API_KEY` is not set, the system degrades gracefully to a built-in rule-based mock engine — all endpoints remain functional.

---

## Application Startup

On startup, `backend/main.py` automatically:

1. Loads and validates all settings from `.env`
2. Configures centralized logging (console + `logs/application.log`)
3. Creates all required runtime directories:
   - `backend/uploads/`
   - `backend/outputs/cleaned/`
   - `backend/outputs/eda/`
   - `backend/outputs/features/`
   - `backend/outputs/segmentation/`
   - `backend/outputs/explainability/`
   - `backend/outputs/recommendations/`
   - `logs/`
4. Logs the loaded configuration (secrets redacted)

No manual directory creation is needed.

---

## Logging

- All modules use the `logging` module with the `bank-segmentation-agent.*` namespace
- Zero `print()` statements in production code
- Log output goes to both the console and `logs/application.log`
- Log file rotates at 5 MB with 3 backup files
- Log level is controlled by `LOG_LEVEL` in `.env`

---

## Folder Structure

```text
bank-segmentation-agent/
│
├── .env                    # Local secrets (gitignored)
├── .env.example            # Template — safe to commit
├── .gitignore
├── requirements.txt
├── README.md
│
├── backend/
│     ├── main.py                  # FastAPI app, startup handler, routes
│     │
│     ├── config/
│     │     ├── __init__.py
│     │     ├── settings.py              # Centralized pydantic-settings loader
│     │     ├── logging_config.py        # Centralized logging setup
│     │     ├── llm_config.yaml          # LLM model behaviour defaults
│     │     ├── segmentation_config.yaml # Clustering hyperparameters
│     │     └── recommendation_rules.yaml # Business rules & scoring thresholds
│     │
│     ├── llm/
│     │     ├── base.py            # Abstract BaseLLM interface
│     │     ├── factory.py         # Reads settings + llm_config.yaml → provider
│     │     └── mistral_provider.py # Mistral REST API provider (no os.getenv)
│     │
│     ├── agent/
│     │     ├── graph.py           # LangGraph StateGraph compilation
│     │     ├── nodes.py           # Planning, execution, response nodes
│     │     ├── prompts.py         # Fallback prompt templates
│     │     └── state.py           # AgentState TypedDict
│     │
│     ├── context/
│     │     ├── context_service.py  # Assembles unified ExecutionContext
│     │     ├── artifact_resolver.py # Dynamic artifact path resolution
│     │     └── prompt_builder.py   # Prompt template formatter
│     │
│     ├── core/
│     │     ├── execution_context.py # Unified context object
│     │     ├── agent_runtime.py     # Agent entry point
│     │     ├── capability_registry.py
│     │     ├── decision_engine.py
│     │     └── tool_registry.py
│     │
│     ├── planner/
│     │     ├── planner.py         # Intent → step plan
│     │     ├── executor.py        # Sequential step runner
│     │     └── plan.py            # ExecutionPlan model
│     │
│     ├── memory/
│     │     ├── memory_manager.py
│     │     └── summarizer.py
│     │
│     ├── models/
│     │     └── schemas.py         # Pydantic request/response schemas
│     │
│     ├── pipeline/
│     │     └── pipeline_manager.py
│     │
│     ├── tools/
│     │     ├── cleaning.py
│     │     ├── eda.py
│     │     ├── feature_engineering.py
│     │     ├── segmentation.py
│     │     ├── explainability.py
│     │     └── recommendation.py
│     │
│     ├── utils/
│     │     ├── artifact_manager.py
│     │     ├── metadata_manager.py
│     │     └── file_helpers.py
│     │
│     ├── uploads/                 # Uploaded CSVs (gitignored)
│     └── outputs/                 # All tool outputs (gitignored)
│
├── frontend/                      # Placeholder for React UI
├── data/                          # Sample datasets
└── logs/                          # Application logs (gitignored)
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/upload` | Upload a CSV dataset |
| `POST` | `/clean` | Run Data Cleaning Tool |
| `POST` | `/eda` | Run Automated EDA |
| `POST` | `/features` | Run Feature Engineering |
| `POST` | `/segment` | Run Customer Segmentation |
| `POST` | `/explain` | Run Explainability Engine |
| `POST` | `/recommend` | Run Recommendation Engine |
| `POST` | `/agent` | Run AI Agent (multi-step planner) |

### Agent Query Example

```bash
curl -X POST http://localhost:8000/agent \
     -H "Content-Type: application/json" \
     -d '{"query": "Segment my customers, explain the clusters, and recommend actions."}'
```

---

## Running in Production

```bash
# Set production environment
APP_ENV=production
DEBUG=False
LOG_LEVEL=WARNING

# Start with multiple workers
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```


This project forms the backend foundation for an AI Agent based Bank Customer Segmentation System.

In Phase 10, the system adds a centralized **Context Layer** (`backend/context/`) featuring a **Context Service** (`context_service.py`), an **Artifact Resolver** (`artifact_resolver.py`), and a **Prompt Builder** (`prompt_builder.py`). This context layer unifies metadata, conversation summaries, yaml configurations, artifact registries, and capability parameters under a single `ExecutionContext` object.

No React dashboard is implemented in this phase.

## Folder Structure

The project directory structure is:

```text
bank-segmentation-agent/
│
├── backend/
│     ├── main.py            # FastAPI main application & routes
│     ├── agent/
│     │     ├── __init__.py
│     │     ├── graph.py     # Compiles and runs the planning LangGraph StateGraph
│     │     ├── nodes.py     # Node execution tasks utilizing the Context Service
│     │     ├── prompts.py   # Fallback decoupled prompts
│     │     └── state.py     # TypedDict defining AgentState parameters
│     ├── config/
│     │     ├── segmentation_config.yaml # Holds hyperparameters for scaling/models
│     │     └── recommendation_rules.yaml # Configurable business rules & offers
│     ├── context/
│     │     ├── __init__.py
│     │     ├── context_service.py # Central Context builder service
│     │     ├── artifact_resolver.py # Resolves output artifacts path dynamically
│     │     └── prompt_builder.py    # Builds planning/responder prompts
│     ├── core/
│     │     ├── __init__.py
│     │     ├── execution_context.py # Unified variables & configuration context class
│     │     ├── decision_engine.py # Core scoring and product mapping engine
│     │     ├── capability_registry.py # Registers inputs, outputs, and dependencies for tools
│     │     └── tool_registry.py   # Central registry mapping tools to functions
│     ├── llm/
│     │     ├── __init__.py
│     │     ├── base.py            # Abstract BaseLLM interface
│     │     ├── factory.py         # Factory instantiating active LLM providers
│     │     └── mistral_provider.py # Mistral API provider using HTTP requests
│     ├── memory/
│     │     ├── __init__.py
│     │     ├── memory_manager.py  # Central manager for tracking conversation turns
│     │     └── summarizer.py      # LLM-backed period context summarizer
│     ├── models/
│     │     ├── __init__.py
│     │     └── schemas.py   # Pydantic request/response models
│     ├── pipeline/
│     │     ├── __init__.py
│     │     └── pipeline_manager.py # Orchestrates explainability and recommendation runs
│     ├── planner/
│     │     ├── __init__.py
│     │     ├── planner.py         # Analytical step planning engine
│     │     ├── executor.py        # Sequential step executor
│     │     └── plan.py            # ExecutionPlan tracking model
│     ├── outputs/           # Destination for all tool outputs
│     │     ├── cleaned/     # Holds cleaned_dataset.csv
│     │     ├── eda/         # Holds all generated EDA reports & charts
│     │     ├── features/    # Holds customer_features.csv and feature_report.json
│     │     ├── segmentation/# Holds segment mappings, summary reports, and scaled profiles
│     │     ├── explainability/ # Holds segment descriptions, customer explanations, and charts
│     │     ├── recommendations/ # Holds customer and segment-level recommendations reports
│     │     ├── artifacts.json # Central artifact registry catalog
│     │     ├── metadata.json  # Central segmentation run metadata catalog
│     │     └── memory.json    # Conversation memory turn catalog
│     ├── uploads/           # Directory where uploaded CSVs are saved
│     ├── tools/
│     │     ├── __init__.py
│     │     ├── cleaning.py  # Standalone, reusable Data Cleaning Tool
│     │     ├── eda.py       # Standalone, reusable Automated EDA Tool
│     │     ├── feature_engineering.py # Standalone, reusable Feature Engineering Tool
│     │     ├── segmentation.py # Reusable Customer Segmentation Engine
│     │     ├── explainability.py # Reusable Model Explainability Engine
│     │     └── recommendation.py # Reusable Recommendation Engine Tool
│     └── utils/
│           ├── __init__.py
│           ├── artifact_manager.py # central manager for tracking generated files
│           ├── metadata_manager.py # central manager for tracking pipeline runs
│           └── file_helpers.py # Helper functions for file sizing and parsing
│
├── frontend/                # Placeholder for future React UI
│
├── data/                    # Placeholder for original datasets
│
├── requirements.txt         # Project package dependencies
│
└── README.md                # System documentation
```

---

## Centralized Context Service (Phase 10)

The **Context Service** (`backend/context/context_service.py`) prepares all necessary context variables for the AI Agent execution.

Instead of each component manually assembling file mappings or parsing memory paths:
1. **Unification**: The Agent Runtime calls `ContextService.build_execution_context(query)`.
2. **Context Propagation**: The resulting `ExecutionContext` travels through the LangGraph State, Planning Engine, and down to the specific Tools.
3. **Decoupling**: Business logic modules fetch configs and templates directly from the context.

---

## Artifact Resolver (Phase 10)

The **Artifact Resolver** (`backend/context/artifact_resolver.py`) wraps the Artifact Manager to dynamically resolve files:
- `ArtifactResolver.get_raw_dataset()`
- `ArtifactResolver.get_cleaned_dataset()`
- `ArtifactResolver.get_customer_features()`
- `ArtifactResolver.get_segment_mapping()`
- `ArtifactResolver.get_cluster_summary()`
- `ArtifactResolver.get_cluster_explanations()`
- `ArtifactResolver.get_customer_recommendations()`

No modules hardcode file paths or directory mappings, preventing environment configuration errors.

---

## Prompt Builder (Phase 10)

The **Prompt Builder** (`backend/context/prompt_builder.py`) manages formatting prompt layouts dynamically:
- `PromptBuilder.build_system_prompt(metadata, memory_summary, available_artifacts)`: Injects overall status logs.
- `PromptBuilder.build_planning_prompt(query, capabilities)`: Formulates plan generation instructions.
- `PromptBuilder.build_response_generation_prompt(intent, completed_steps, artifacts, errors)`: Formulates response templates.

---

## API Endpoints

### 1. Health Check
* **Endpoint**: `GET /`
* **Response Model**: `StatusResponse`

### 2. Upload CSV
* **Endpoint**: `POST /upload`
* **Response Model**: `UploadResponse`

### 3. Clean Dataset
* **Endpoint**: `POST /clean`
* **Response Model**: `CleanResponse`

### 4. Run Automated EDA
* **Endpoint**: `POST /eda`
* **Response Model**: `EDAResponse`

### 5. Generate Customer Features
* **Endpoint**: `POST /features`
* **Response Model**: `FeatureResponse`

### 6. Run Customer Segmentation
* **Endpoint**: `POST /segment`
* **Response Model**: `SegmentResponse`

### 7. Run Segmentation Explainability
* **Endpoint**: `POST /explain`
* **Response Model**: `ExplainResponse`

### 8. Generate Business Recommendations
* **Endpoint**: `POST /recommend`
* **Response Model**: `RecommendResponse`

### 9. AI Agent Planner & Executor
* **Endpoint**: `POST /agent`
* **Description**: Processes natural language query strings, loads unified context settings, routes sequential plan actions, runs pipeline steps, and updates memory summaries.
* **Request Payload**: `AgentRequest`
  ```json
  {
      "query": "Segment my bank customers, explain cluster traits, and recommend actions."
  }
  ```
* **Response Model**: `AgentResponse`
* **Response Status**: `200 OK`
