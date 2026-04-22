# Database Schema Documentation

## jobs
Stores job posting information and intake agent output.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| title | VARCHAR | Job title |
| description | TEXT | Full job description |
| parsed_profile | JSONB | Output from Intake Agent (skills, requirements, etc.) |
| status | VARCHAR | Pipeline status (intake_pending, candidates_pending, completed) |
| created_at | TIMESTAMP | Record creation time |

## candidates
Stores candidate CV data and analysis results.

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| job_id | UUID | Foreign key to jobs |
| file_name | VARCHAR | Original CV file name |
| cv_text | TEXT | Extracted text from CV |
| score | FLOAT | Final composite score (0-100) |
| scorecard | JSONB | Detailed breakdown from CV Analyzer |
| ranking_position | INTEGER | Final rank among all candidates |
| interview_questions | JSONB | Output from Interview Agent |
| status | VARCHAR | Analysis status (pending_analysis, completed, error) |

## documents & embeddings
Store the RAG knowledge base.

| Column | Type | Purpose |
|--------|------|---------|
| documents.id | UUID | Primary key |
| documents.title | VARCHAR | Document title (e.g., "Competency Framework") |
| embeddings.embedding | vector(1536) | Vector embedding (text-embedding-3-small) |

## job_results
Stores final pipeline output.

| Column | Type | Purpose |
|--------|------|---------|
| job_id | UUID | Foreign key to jobs |
| ranked_candidates | JSONB | Full ranked list with all data |
| generated_pdf_url | VARCHAR | URL to downloadable report |
| status | VARCHAR | Generation status |
| error_message | TEXT | Short, single-line failure reason captured when `status='failed'` (analyzer/ranker exception). Surfaced by `/status` and shown on the processing page. Cleared at the start of each new pipeline run. |
