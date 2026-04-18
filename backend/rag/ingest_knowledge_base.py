"""
RAG Knowledge Base Ingestion Script
Orchestrates the complete pipeline: PDF extraction -> Chunking -> Embedding -> Database storage

Usage:
    python ingest_knowledge_base.py
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import from database module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pdf_extractor import extract_all_documents
from text_chunker import chunk_documents, get_chunk_statistics
from embedding_generator import embed_chunked_documents
from database import create_document, create_embedding
from datetime import datetime


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
    print("\n[STEP 1/5] Extracting text from PDF documents...")
    print("-" * 70)
    documents = extract_all_documents(knowledge_base_path)
    
    if not documents:
        print("✗ No documents found. Exiting.")
        return
    
    print(f"✓ Extracted {len(documents)} documents")
    
    # Step 2: Chunk the documents
    print("\n[STEP 2/5] Chunking documents...")
    print("-" * 70)
    chunked_documents = chunk_documents(documents, chunk_size=chunk_size)
    
    stats = get_chunk_statistics(chunked_documents)
    print("\nChunk Statistics:")
    print(f"  Total documents: {stats['total_documents']}")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  Average chunk size: {stats['average_chunk_size']} chars")
    print(f"  Chunk size range: {stats['min_chunk_size']} - {stats['max_chunk_size']} chars")
    
    # Step 3: Generate embeddings
    print("\n[STEP 3/5] Generating embeddings with OpenAI...")
    print("-" * 70)
    embedded_documents = embed_chunked_documents(chunked_documents)
    
    # Step 4: Store in database
    print("\n[STEP 4/5] Storing documents and embeddings in database...")
    print("-" * 70)
    
    total_stored = 0
    failed_count = 0
    
    for doc_name, chunks in embedded_documents.items():
        print(f"\nStoring: {doc_name}")
        
        # Extract category and title from doc_name (format: "category/title")
        parts = doc_name.split("/")
        if len(parts) == 2:
            category = parts[0]
            title = parts[1]
        else:
            category = "general"
            title = doc_name
        
        try:
            # Get the full text for this document
            full_text = documents[doc_name]
            
            # Create document record with metadata
            document_id = create_document(
                title=title,
                content=full_text,
                metadata={
                    "category": category,
                    "chunk_count": len(chunks),
                    "total_chars": len(full_text),
                    "ingested_at": datetime.now().isoformat()
                }
            )
            
            print(f"  ✓ Created document: {document_id}")
            
            # Store all chunks with their embeddings
            for chunk in chunks:
                try:
                    embedding_id = create_embedding(
                        document_id=document_id,
                        chunk_index=chunk["chunk_index"],
                        chunk_text=chunk["chunk_text"],
                        embedding=chunk["embedding"]
                    )
                    total_stored += 1
                
                except Exception as e:
                    print(f"  ✗ Failed to store chunk {chunk['chunk_index']}: {str(e)}")
                    failed_count += 1
            
            print(f"  ✓ Stored {len(chunks)} embeddings")
        
        except Exception as e:
            print(f"  ✗ Failed to store document: {str(e)}")
            failed_count += len(chunks)
    
    # Step 5: Summary
    print("\n[STEP 5/5] Ingestion Summary")
    print("=" * 70)
    print(f"Documents processed: {len(documents)}")
    print(f"Total chunks created: {stats['total_chunks']}")
    print(f"Embeddings stored: {total_stored}")
    print(f"Failed: {failed_count}")
    print(f"Success rate: {(total_stored / stats['total_chunks'] * 100):.1f}%")
    print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    if failed_count == 0:
        print("\n✓ ALL DOCUMENTS SUCCESSFULLY INGESTED!")
    else:
        print(f"\n⚠ Completed with {failed_count} errors")


if __name__ == "__main__":
    # Path to knowledge base (relative to this script)
    # This script should be in backend/rag/
    script_dir = Path(__file__).parent
    knowledge_base_path = script_dir / "knowledge_base"
    
    if not knowledge_base_path.exists():
        print(f"✗ Knowledge base directory not found: {knowledge_base_path}")
        print("Please ensure the knowledge_base directory exists with PDF files")
        sys.exit(1)
    
    # Run ingestion
    try:
        ingest_knowledge_base(str(knowledge_base_path), chunk_size=1000)
    except KeyboardInterrupt:
        print("\n\n✗ Ingestion interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n✗ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
