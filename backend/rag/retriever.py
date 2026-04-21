"""
RAG Retrieval Module for Tarsheeh.cv
Provides semantic search over the knowledge base for agent use

Usage from an agent:
    from rag.retriever import retrieve_context
    
    results = retrieve_context("What skills should a backend developer have?")
    for chunk in results:
        print(chunk["chunk_text"])
"""

import os
from pathlib import Path
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI

# Load environment variables from project root then backend/.env
backend_dir = Path(__file__).parent.parent
load_dotenv(backend_dir.parent / ".env")
load_dotenv(backend_dir / ".env")

# Embedding model configuration (must match what was used for ingestion)
EMBEDDING_MODEL = "text-embedding-3-small"

# Quality thresholds
DEFAULT_MATCH_COUNT = 5
MIN_SIMILARITY_THRESHOLD = 0.3

_supabase_client: Optional[Client] = None
_openai_client: Optional[OpenAI] = None


def _get_supabase() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            raise ValueError("Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_ANON_KEY in .env")
        _supabase_client = create_client(url, key)
    return _supabase_client


def _get_openai() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("Missing OpenAI credentials. Check OPENAI_API_KEY in .env")
        _openai_client = OpenAI(api_key=api_key)
    return _openai_client


def embed_query(query_text: str) -> List[float]:
    """
    Convert a text query into a 1536-dimensional embedding vector
    
    Args:
        query_text: The text to embed
    
    Returns:
        A list of 1536 floats representing the embedding
    """
    try:
        response = _get_openai().embeddings.create(
            model=EMBEDDING_MODEL,
            input=query_text
        )
        return response.data[0].embedding
    except Exception as e:
        raise Exception(f"Error generating query embedding: {str(e)}")


def retrieve_context(
    query_text: str,
    match_count: int = DEFAULT_MATCH_COUNT,
    category_filter: Optional[str] = None,
    min_similarity: float = MIN_SIMILARITY_THRESHOLD
) -> List[Dict[str, Any]]:
    """
    Retrieve the most relevant knowledge base chunks for a given query
    
    Args:
        query_text: The question or search query
        match_count: Maximum number of chunks to return (default 5)
        category_filter: Optional category to restrict search to
                        Valid values: 'competency_frameworks', 'resume_evaluation',
                        'interview_scorecards', 'startup_hiring'
        min_similarity: Minimum similarity score to include a result (default 0.3)
                       Results below this threshold are filtered out
    
    Returns:
        List of dictionaries, each containing:
            - chunk_text: The actual text content
            - title: Source document title
            - source: Source filename
            - document_category: Category folder name
            - chunk_index: Position within source document
            - similarity: Cosine similarity score (0 to 1, higher is more similar)
    
    Example:
        >>> results = retrieve_context("What makes a good backend engineer?")
        >>> for r in results:
        ...     print(f"[{r['similarity']:.2f}] {r['chunk_text'][:100]}...")
    """
    # Validate inputs
    if not query_text or not query_text.strip():
        raise ValueError("query_text cannot be empty")
    
    if match_count < 1:
        raise ValueError("match_count must be at least 1")
    
    # Generate embedding for the query
    query_embedding = embed_query(query_text)
    
    # Call the Postgres function via Supabase RPC
    try:
        response = _get_supabase().rpc(
            "match_knowledge_base",
            {
                "query_embedding": query_embedding,
                "match_count": match_count,
                "filter_category": category_filter
            }
        ).execute()
        
        if not response.data:
            return []
        
        # Filter by similarity threshold
        filtered_results = [
            result for result in response.data
            if result.get("similarity", 0) >= min_similarity
        ]
        
        return filtered_results
    
    except Exception as e:
        raise Exception(f"Error retrieving context: {str(e)}")


def retrieve_context_by_category(
    query_text: str,
    category: str,
    match_count: int = DEFAULT_MATCH_COUNT
) -> List[Dict[str, Any]]:
    """
    Convenience function for category-filtered retrieval
    
    Args:
        query_text: The question or search query
        category: One of 'competency_frameworks', 'resume_evaluation',
                 'interview_scorecards', 'startup_hiring'
        match_count: Maximum number of chunks to return
    
    Returns:
        List of matching chunks from the specified category only
    """
    valid_categories = [
        "competency_frameworks",
        "resume_evaluation",
        "interview_scorecards",
        "startup_hiring"
    ]
    
    if category not in valid_categories:
        raise ValueError(
            f"Invalid category: {category}. "
            f"Must be one of: {', '.join(valid_categories)}"
        )
    
    return retrieve_context(
        query_text=query_text,
        match_count=match_count,
        category_filter=category
    )


def format_context_for_prompt(results: List[Dict[str, Any]]) -> str:
    """
    Format retrieval results as a clean context string for LLM prompts
    
    Args:
        results: Output from retrieve_context()
    
    Returns:
        Formatted string ready to inject into an agent prompt
    
    Example:
        >>> results = retrieve_context("hiring best practices")
        >>> context = format_context_for_prompt(results)
        >>> prompt = f"Given this knowledge:\\n{context}\\n\\nAnswer: ..."
    """
    if not results:
        return "No relevant context found in knowledge base."
    
    formatted_parts = []
    for i, result in enumerate(results, 1):
        chunk_text = result.get("chunk_text", "").strip()
        title = result.get("title", "Unknown")
        category = result.get("document_category", "general")
        similarity = result.get("similarity", 0)
        
        formatted_parts.append(
            f"[Source {i}: {title} | Category: {category} | Relevance: {similarity:.2f}]\n"
            f"{chunk_text}"
        )
    
    return "\n\n---\n\n".join(formatted_parts)


# Standalone test function
if __name__ == "__main__":
    print("=" * 70)
    print("RAG RETRIEVER TEST")
    print("=" * 70)
    
    # Test query
    test_query = "How should I evaluate a candidate's competencies during a structured interview?"
    
    print(f"\nQuery: {test_query}\n")
    print("-" * 70)
    
    try:
        results = retrieve_context(test_query, match_count=3)
        
        if not results:
            print("No results found above similarity threshold.")
        else:
            print(f"Found {len(results)} relevant chunks:\n")
            
            for i, result in enumerate(results, 1):
                print(f"Result {i}:")
                print(f"  Source: {result['title']}")
                print(f"  Category: {result['document_category']}")
                print(f"  Similarity: {result['similarity']:.4f}")
                print(f"  Preview: {result['chunk_text'][:200]}...")
                print()
    
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("=" * 70)
    
    # Test category filtering
    print("\nTesting category filter (startup_hiring only)...\n")
    print("-" * 70)
    
    try:
        filtered_results = retrieve_context_by_category(
            query_text="how to evaluate a candidate during an interview",
            category="startup_hiring",
            match_count=2
        )
        
        for i, result in enumerate(filtered_results, 1):
            print(f"Result {i}:")
            print(f"  Source: {result['title']}")
            print(f"  Category: {result['document_category']}")
            print(f"  Similarity: {result['similarity']:.4f}")
            print(f"  Preview: {result['chunk_text'][:200]}...")
            print()
    
    except Exception as e:
        print(f"ERROR: {str(e)}")
    
    print("=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)
