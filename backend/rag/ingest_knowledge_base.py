"""
RAG Knowledge Base Ingestion Script for Tarsheeh.cv
Orchestrates the complete pipeline: PDF extraction -> Chunking -> Embedding -> Database storage

Schema: Flat pattern (each row in documents = one chunk)
- documents table: id, title, source, chunk_text, chunk_index, document_category
- embeddings table: id, document_id, chunk_text, embedding

Usage:
    python ingest_knowledge_base.py
"""

import sys
import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Local module imports
from pdf_extractor import extract_all_documents
from text_chunker import chunk_documents, get_chunk_statistics
from embedding_generator import embed_chunked_documents

# Load environment variables from backend/.env
backend_dir = Path(__file__).parent.parent
load_dotenv(backend_dir / ".env")

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials in .env file")
    print("Expected: SUPABASE_URL and SUPABASE_ANON_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def insert_chunk_with_embedding(
    title: str,
    source: str,
    chunk_text: str,
    chunk_index: int,
    document_category: str,
    embedding: list
) -> bool:
    """
    Insert one chunk into documents table and its vector into embeddings table
    
    Args:
        title: Document title (cleaned filename)
        source: Original filename
        chunk_text: The text chunk content
        chunk_index: Position of chunk within the document
        document_category: Category folder name
        embedding: 1536-dimensional vector
    
    Returns:
        True if both inserts succeeded, False otherwise
    """
    try:
        # Step 1: Insert into documents table
        doc_response = supabase.table("documents").insert({
            "title": title,
            "source": source,
            "chunk_text": chunk_text,
            "chunk_index": chunk_index,
            "document_category": document_category
        }).execute()
        
        if not doc_response.data:
            return False
        
        document_id = doc_response.data[0]["id"]
        
        # Step 2: Insert into embeddings table, linked by document_id
        emb_response = supabase.table("embeddings").insert({
            "document_id": document_id,
            "chunk_text": chunk_text,
            "embedding": embedding
        }).execute()
        
        return bool(emb_response.data)
    
    except Exception as e:
        print(f"    ERROR inserting chunk {chunk_index}: {str(e)}")
        return False


def ingest_knowledge_base(knowledge_base_path: str, chunk_size: int = 1000):
    """
    Complete RAG ingestion pipeline
    
    Args:
        knowledge_base_path: Path to knowledge_base directory
        chunk_size: Size of text chunks in characters
    """
    print("=" * 70)
    print("TARSHEEH.CV RAG KNOWLEDGE BASE INGESTION")
    print("=" * 70)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Knowledge base path: {knowledge_base_path}")
    print(f"Chunk size: {chunk_size} characters")
    print("=" * 70)
    
    # Step 1: Extract text from all PDFs
    print("\n[STEP 1/4] Extracting text from PDF documents...")
    print("-" * 70)
    documents = extract_all_documents(knowledge_base_path)
    
    if not documents:
        print("No documents found. Exiting.")
        return
    
    print(f"Extracted {len(documents)} documents")
    
    # Step 2: Chunk the documents
    print("\n[STEP 2/4] Chunking documents...")
    print("-" * 70)
    chunked_documents = chunk_documents(documents, chunk_size=chunk_size)
    
    stats = get_chunk_statistics(chunked_documents)
    print("\nChunk Statistics:")
    print(f"  Total documents: {stats['total_documents']}")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  Average chunk size: {stats['average_chunk_size']} chars")
    print(f"  Chunk size range: {stats['min_chunk_size']} - {stats['max_chunk_size']} chars")
    
    # Step 3: Generate embeddings
    print("\n[STEP 3/4] Generating embeddings with OpenAI...")
    print("-" * 70)
    embedded_documents = embed_chunked_documents(chunked_documents)
    
    # Step 4: Store in database
    print("\n[STEP 4/4] Storing chunks and embeddings in database...")
    print("-" * 70)
    
    total_stored = 0
    failed_count = 0
    
    for doc_name, chunks in embedded_documents.items():
        # Parse doc_name format: "category/title"
        parts = doc_name.split("/")
        if len(parts) == 2:
            document_category = parts[0]
            title = parts[1]
        else:
            document_category = "general"
            title = doc_name
        
        # Use the title as the source filename (with .pdf for traceability)
        source = f"{title}.pdf"
        
        print(f"\nStoring: {doc_name} ({len(chunks)} chunks)")
        
        doc_success = 0
        doc_failed = 0
        
        for chunk in chunks:
            success = insert_chunk_with_embedding(
                title=title,
                source=source,
                chunk_text=chunk["chunk_text"],
                chunk_index=chunk["chunk_index"],
                document_category=document_category,
                embedding=chunk["embedding"]
            )
            
            if success:
                doc_success += 1
                total_stored += 1
            else:
                doc_failed += 1
                failed_count += 1
        
        status_icon = "OK" if doc_failed == 0 else "PARTIAL"
        print(f"  [{status_icon}] Stored {doc_success}/{len(chunks)} chunks")
    
    # Final Summary
    print("\n" + "=" * 70)
    print("INGESTION SUMMARY")
    print("=" * 70)
    print(f"Documents processed: {len(documents)}")
    print(f"Total chunks created: {stats['total_chunks']}")
    print(f"Successfully stored: {total_stored}")
    print(f"Failed: {failed_count}")
    
    if stats['total_chunks'] > 0:
        success_rate = (total_stored / stats['total_chunks'] * 100)
        print(f"Success rate: {success_rate:.1f}%")
    
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    if failed_count == 0:
        print("\nSUCCESS: All documents ingested successfully!")
        print("\nNext step: verify in Supabase dashboard")
        print(f"  - documents table should have {total_stored} rows")
        print(f"  - embeddings table should have {total_stored} rows")
    else:
        print(f"\nWARNING: Completed with {failed_count} errors")
        print("Review the error messages above to diagnose the issue")


if __name__ == "__main__":
    # Path to knowledge base (relative to this script location: backend/rag/)
    script_dir = Path(__file__).parent
    knowledge_base_path = script_dir / "knowledge_base"
    
    if not knowledge_base_path.exists():
        print(f"ERROR: Knowledge base directory not found: {knowledge_base_path}")
        print("Please ensure the knowledge_base directory exists with PDF files")
        sys.exit(1)
    
    try:
        ingest_knowledge_base(str(knowledge_base_path), chunk_size=1000)
    except KeyboardInterrupt:
        print("\n\nIngestion interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nFATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
