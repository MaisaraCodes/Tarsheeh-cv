# API Contract, Tarsheeh.cv

**Project:** Agenticthon 2026, Team Nexus  
**Phase:** 0 - Project Setup  
**Status:** Draft - Agreed 
**Base URL:** `https://<backend-url>`

> This document defines all endpoint names, request shapes, and response shapes agreed upon before development begins. Neither side should change this contract without informing the other teammate.

---

## Endpoints Overview

| Method | Path | Description | Owner |
|--------|------|-------------|-------|
| POST | `/job` | Submit a job description and trigger the Intake Agent | Maisara |
| POST | `/candidates` | Upload candidate CVs linked to a job and trigger CV Analyzer | Maisara |
| GET | `/status/{job_id}` | Poll current pipeline progress for a job | Osama |
| GET | `/results/{job_id}` | Retrieve full ranked results and scorecards | Osama |
| GET | `/report/{job_id}` | Download the PDF hiring report | Osama |
| GET | `/questions/{candidate_id}` | Retrieve tailored interview questions for a candidate | Maisara |

---

## POST `/job`

Accepts a job description and triggers the Intake Agent, which parses the input and returns a structured job profile.

**Request body**, `application/json`

```json
{
  "title": "string",
  "description": "string"
}
```

**Success response**, `200 OK`

```json
{
  "job_id": "string",
  "status": "processing"
}
```

**Error responses**

| Code | Reason |
|------|--------|
| 422 | Missing or invalid required fields |
| 500 | Intake Agent failure |

---

## POST `/candidates`

Accepts multiple CV file uploads linked to a job ID and triggers the CV Analyzer agent for each candidate.

**Request body**, `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `job_id` | string | The ID of the job these candidates are applying for |
| `files` | file(s) | One or more CV files in PDF format |

**Success response**, `200 OK`

```json
{
  "job_id": "string",
  "candidates_queued": 0,
  "status": "processing"
}
```

**Error responses**

| Code | Reason |
|------|--------|
| 400 | Invalid or unrecognised job_id |
| 415 | Unsupported file type, PDF only |
| 500 | CV Analyzer Agent failure |

---

## GET `/status/{job_id}`

Returns the current pipeline progress for a given job. Used by the frontend for real-time polling on the processing screen.

**Path parameter**

| Parameter | Type | Description |
|-----------|------|-------------|
| `job_id` | string | The ID of the job to check |

**Success response**, `200 OK`

```json
{
  "job_id": "string",
  "stage": "string",
  "progress": 0,
  "status": "processing | complete | failed"
}
```

> `stage` reflects the name of the currently active LangGraph node. Agreed values are: `intake`, `cv_analyzer`, `ranking`, `interview`, `report`.  
> `progress` is a number from 0 to 100 representing overall pipeline completion.  
> The frontend polls this endpoint at a regular interval until `status` is `complete` or `failed`.

**Error responses**

| Code | Reason |
|------|--------|
| 404 | Job not found |

---

## GET `/results/{job_id}`

Returns the full ranked candidate list and all individual scorecards once the pipeline has completed.

**Path parameter**

| Parameter | Type | Description |
|-----------|------|-------------|
| `job_id` | string | The ID of the completed job |

**Success response**, `200 OK`

```json
{
  "job_id": "string",
  "ranked_candidates": [
    {
      "candidate_id": "string",
      "name": "string",
      "score": 0,
      "rank": 0,
      "summary": "string"
    }
  ]
}
```

> `score` is a number from 0 to 100, as confirmed and expected by both the Ranking Agent and the frontend results display.

**Error responses**

| Code | Reason |
|------|--------|
| 404 | Job not found |
| 409 | Results not ready, pipeline still processing |

---

## GET `/report/{job_id}`

Returns a downloadable PDF report containing the full hiring pipeline output for a completed job.

**Path parameter**

| Parameter | Type | Description |
|-----------|------|-------------|
| `job_id` | string | The ID of the completed job |

**Success response**, `200 OK`

```
Content-Type: application/pdf
Body: binary PDF file stream
```

**Error responses**

| Code | Reason |
|------|--------|
| 404 | Job not found |
| 409 | Report not ready, pipeline still processing |

---

## GET `/questions/{candidate_id}`

Returns a list of tailored interview questions generated for a specific candidate based on their scorecard and the job profile.

**Path parameter**

| Parameter | Type | Description |
|-----------|------|-------------|
| `candidate_id` | string | The ID of the candidate |

**Success response**, `200 OK`

```json
{
  "candidate_id": "string",
  "job_id": "string",
  "questions": [
    "string",
    "string"
  ]
}
```

**Error responses**

| Code | Reason |
|------|--------|
| 404 | Candidate not found |
| 409 | Questions not ready, pipeline still processing |

---

## Notes and Agreements

- All request and response bodies use `application/json` unless otherwise stated.
-  All IDs are strings in UUID v4 format, generated by Supabase.
- The agreed `stage` values under `/status` are: `intake`, `cv_analyzer`, `ranking`, `interview`, `report`.
- The `score` field is a number from 0 to 100, as confirmed and expected by both the Ranking Agent and the frontend results display.
- This document is considered locked once both teammates have reviewed and signed off. Any changes must be communicated to the other teammate before implementation.

---

*Team Nexus, Agenticthon 2026, For internal planning use only*
