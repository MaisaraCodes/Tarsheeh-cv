# RAG Pipeline Setup Guide

**Date:** April 19, 2026  
**Task:** Set up and run the RAG knowledge base ingestion pipeline

---

## Files to Add to Your Project

Copy these files into your `backend/rag/` directory:

1. `pdf_extractor.py` - Extracts text from PDFs
2. `text_chunker.py` - Splits text into chunks
3. `embedding_generator.py` - Generates OpenAI embeddings
4. `ingest_knowledge_base.py` - Main ingestion script
5. `__init__.py` - Module initialization (rename from rag_init.py)

---

## Setup Steps

### 1. Install Dependencies

Open PowerShell in your project root:

```powershell
cd M:\projects\Tarsheeh-cv\backend
.\venv\Scripts\activate
pip install pdfplumber openai
pip freeze > requirements.txt
```

### 2. Verify Your Folder Structure

Your structure should look like this:

```
backend/
├── rag/
│   ├── __init__.py                 (new - from rag_init.py)
│   ├── pdf_extractor.py            (new)
│   ├── text_chunker.py             (new)
│   ├── embedding_generator.py      (new)
│   ├── ingest_knowledge_base.py    (new)
│   └── knowledge_base/
│       ├── competency_frameworks/
│       │   ├── Competency-Modeling-Best-Practices-Workitect.pdf
│       │   ├── SFIA-9-Summary-Chart.pdf
│       │   └── Competency-Framework-CPHR.pdf
│       ├── resume_evaluation/
│       │   ├── Resume-Assessment-Checklist-ULM.pdf
│       │   └── Employment-Best-Practices-FADV.pdf
│       ├── interview_scorecards/
│       │   ├── Interview-Confidence-Cheat-Sheet-Techbridge.pdf
│       │   └── Hiring-Scorecard-Template-Techbridge.pdf
│       └── startup_hiring/
│           ├── How-to-Hire-the-Right-Person-firstround.pdf
│           └── The-40-Best-Questions-to-Ask-in-an-Interview-firstround.pdf
```

### 3. Verify Environment Variables

Make sure your `.env` file has:

```bash
OPENAI_API_KEY=your_openai_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
```

### 4. Run the Ingestion Pipeline

```powershell
cd M:\projects\Tarsheeh-cv\backend\rag
python ingest_knowledge_base.py
```

---

## What the Script Does

The ingestion pipeline performs 5 steps:

**Step 1: Extract Text from PDFs**
- Scans all PDFs in knowledge_base folders
- Extracts clean text from each document
- Reports how many characters extracted per file

**Step 2: Chunk Documents**
- Splits each document into ~1000 character chunks
- Uses smart breaking at paragraph/sentence boundaries
- Adds 200 character overlap between chunks for context

**Step 3: Generate Embeddings**
- Sends each chunk to OpenAI's `text-embedding-3-small` model
- Receives back 1536-dimensional vectors
- Processes in batches to avoid rate limits

**Step 4: Store in Database**
- Creates a record in `documents` table for each PDF
- Creates records in `embeddings` table for each chunk
- Stores vectors in pgvector format for similarity search

**Step 5: Summary Report**
- Shows success/failure statistics
- Reports total chunks created and stored

---

## Expected Output

You should see output like this:

```
======================================================================
TARSHEEH.CV RAG KNOWLEDGE BASE INGESTION
======================================================================
Started at: 2026-04-19 14:30:00
Knowledge base path: M:\projects\Tarsheeh-cv\backend\rag\knowledge_base
Chunk size: 1000 characters
======================================================================

[STEP 1/5] Extracting text from PDF documents...
----------------------------------------------------------------------
Found 9 PDF files in knowledge base
Extracting: Competency-Modeling-Best-Practices-Workitect.pdf...
  ✓ Extracted 45123 characters
Extracting: SFIA-9-Summary-Chart.pdf...
  ✓ Extracted 32456 characters
...

✓ Extracted 9 documents

[STEP 2/5] Chunking documents...
----------------------------------------------------------------------
Chunking 9 documents...
  competency_frameworks/Competency-Modeling-Best-Practices-Workitect: 52 chunks (45123 chars)
  competency_frameworks/SFIA-9-Summary-Chart: 38 chunks (32456 chars)
...

Total chunks created: 245

Chunk Statistics:
  Total documents: 9
  Total chunks: 245
  Average chunk size: 985 chars
  Chunk size range: 512 - 1198 chars

[STEP 3/5] Generating embeddings with OpenAI...
----------------------------------------------------------------------

Processing: competency_frameworks/Competency-Modeling-Best-Practices-Workitect
  Processing batch 1/1 (52 items)...
✓ Generated 52 embeddings
  ✓ 52 chunks embedded
...

[STEP 4/5] Storing documents and embeddings in database...
----------------------------------------------------------------------

Storing: competency_frameworks/Competency-Modeling-Best-Practices-Workitect
  ✓ Created document: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  ✓ Stored 52 embeddings
...

[STEP 5/5] Ingestion Summary
======================================================================
Documents processed: 9
Total chunks created: 245
Embeddings stored: 245
Failed: 0
Success rate: 100.0%

Completed at: 2026-04-19 14:32:15
======================================================================

✓ ALL DOCUMENTS SUCCESSFULLY INGESTED!
```

---

## Verification

After running the script, verify in Supabase:

1. **Documents Table**
   - Should have 9 rows (one per PDF)
   - Check the `metadata` column shows category and chunk_count

2. **Embeddings Table**
   - Should have ~200-300 rows (depends on document sizes)
   - Each row has a 1536-dimension vector in the `embedding` column
   - `chunk_text` column shows the actual text content

---

## Troubleshooting

**Error: "Module not found"**
- Make sure you're in the correct directory
- Verify virtual environment is activated
- Check all files are in `backend/rag/`

**Error: "OPENAI_API_KEY not found"**
- Check your `.env` file has the key
- Make sure `.env` is in `backend/` directory
- Verify the key is valid

**Error: "No documents found"**
- Verify PDFs are in `backend/rag/knowledge_base/` subfolders
- Check folder names match: `competency_frameworks`, `resume_evaluation`, etc.
- Ensure files have `.pdf` extension

**Error: "Failed to create document"**
- Check Supabase connection is working
- Verify `documents` and `embeddings` tables exist
- Run the health check: `curl http://localhost:8000/api/health/database`

---

## Next Steps

After successful ingestion:

1. ✅ Your knowledge base is ready for retrieval
2. You can now build the retrieval function for agents
3. Agents will query this knowledge base for context
4. No need to re-run unless you add new documents

---

## Cost Estimate

**OpenAI Embeddings Cost:**
- Model: text-embedding-3-small
- Cost: $0.02 per 1M tokens
- Estimated chunks: ~250
- Estimated tokens: ~200,000
- **Estimated cost: $0.004 (less than half a cent)**

Very affordable for your hackathon project!
