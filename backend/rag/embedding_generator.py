"""
Embedding generation utility for Tarsheeh.cv RAG pipeline
Uses OpenAI's text-embedding-3-small model to generate vector embeddings
"""

import os
from typing import List, Dict
from openai import OpenAI
from dotenv import load_dotenv
import time

load_dotenv()

# Model configuration
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536

_client = None

def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        _client = OpenAI(api_key=api_key)
    return _client


def generate_embedding(text: str) -> List[float]:
    """
    Generate embedding for a single text chunk
    
    Args:
        text: Text to embed
    
    Returns:
        List of 1536 float values representing the embedding
    """
    try:
        response = _get_client().embeddings.create(
            model=EMBEDDING_MODEL,
            input=text
        )
        
        return response.data[0].embedding
    
    except Exception as e:
        raise Exception(f"Error generating embedding: {str(e)}")


def generate_embeddings_batch(
    texts: List[str],
    batch_size: int = 100,
    delay: float = 0.1
) -> List[List[float]]:
    """
    Generate embeddings for multiple texts with batching and rate limiting
    
    Args:
        texts: List of texts to embed
        batch_size: Number of texts to process in each API call
        delay: Delay between batches in seconds
    
    Returns:
        List of embeddings (each is a list of 1536 floats)
    """
    embeddings = []
    total = len(texts)
    
    print(f"Generating embeddings for {total} chunks...")
    
    for i in range(0, total, batch_size):
        batch = texts[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (total + batch_size - 1) // batch_size
        
        print(f"  Processing batch {batch_num}/{total_batches} ({len(batch)} items)...")
        
        try:
            response = _get_client().embeddings.create(
                model=EMBEDDING_MODEL,
                input=batch
            )
            
            # Extract embeddings from response
            batch_embeddings = [item.embedding for item in response.data]
            embeddings.extend(batch_embeddings)
            
            # Rate limiting delay
            if i + batch_size < total:
                time.sleep(delay)
        
        except Exception as e:
            print(f"  ✗ Error in batch {batch_num}: {str(e)}")
            raise
    
    print(f"✓ Generated {len(embeddings)} embeddings")
    return embeddings


def embed_chunked_documents(
    chunked_documents: Dict[str, List[Dict]]
) -> Dict[str, List[Dict]]:
    """
    Generate embeddings for all chunks in all documents
    
    Args:
        chunked_documents: Dictionary mapping document names to lists of chunks
    
    Returns:
        Same dictionary with embeddings added to each chunk
    """
    embedded_documents = {}
    
    for doc_name, chunks in chunked_documents.items():
        print(f"\nProcessing: {doc_name}")
        
        # Extract just the text from chunks
        texts = [chunk["chunk_text"] for chunk in chunks]
        
        # Generate embeddings
        embeddings = generate_embeddings_batch(texts)
        
        # Add embeddings to chunks
        embedded_chunks = []
        for chunk, embedding in zip(chunks, embeddings):
            embedded_chunk = chunk.copy()
            embedded_chunk["embedding"] = embedding
            embedded_chunks.append(embedded_chunk)
        
        embedded_documents[doc_name] = embedded_chunks
        print(f"  ✓ {len(embedded_chunks)} chunks embedded")
    
    return embedded_documents


def test_embedding_similarity(text1: str, text2: str) -> float:
    """
    Test similarity between two texts using cosine similarity
    
    Args:
        text1: First text
        text2: Second text
    
    Returns:
        Cosine similarity score (0-1, higher is more similar)
    """
    import numpy as np
    
    emb1 = generate_embedding(text1)
    emb2 = generate_embedding(text2)
    
    # Cosine similarity
    dot_product = np.dot(emb1, emb2)
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    
    similarity = dot_product / (norm1 * norm2)
    
    return similarity


if __name__ == "__main__":
    # Test embedding generation
    sample_text = "This is a test document about software engineering and Python programming."
    
    print("Testing embedding generation...")
    embedding = generate_embedding(sample_text)
    
    print(f"Generated embedding with {len(embedding)} dimensions")
    print(f"First 5 values: {embedding[:5]}")
    
    # Test similarity
    text1 = "Python programming and software development"
    text2 = "Cooking recipes and food preparation"
    
    print("\nTesting similarity...")
    print(f"Text 1: {text1}")
    print(f"Text 2: {text2}")
    
    similarity = test_embedding_similarity(text1, text2)
    print(f"Similarity score: {similarity:.4f}")
