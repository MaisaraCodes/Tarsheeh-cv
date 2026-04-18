"""
Text chunking utility for Tarsheeh.cv RAG pipeline
Splits documents into manageable chunks for embedding generation
"""

from typing import List, Dict


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200
) -> List[Dict[str, any]]:
    """
    Split text into overlapping chunks for better context preservation
    
    Args:
        text: Full text to chunk
        chunk_size: Maximum characters per chunk
        overlap: Number of characters to overlap between chunks
    
    Returns:
        List of dictionaries with chunk_index, chunk_text, and char_count
    """
    if not text or len(text) == 0:
        return []
    
    chunks = []
    start = 0
    chunk_index = 0
    
    while start < len(text):
        # Calculate end position
        end = start + chunk_size
        
        # If this isn't the last chunk, try to break at a sentence or paragraph
        if end < len(text):
            # Look for paragraph break first (double newline)
            paragraph_break = text.rfind("\n\n", start, end)
            if paragraph_break != -1 and paragraph_break > start + (chunk_size // 2):
                end = paragraph_break + 2
            else:
                # Look for sentence break (period followed by space)
                sentence_break = text.rfind(". ", start, end)
                if sentence_break != -1 and sentence_break > start + (chunk_size // 2):
                    end = sentence_break + 2
        
        # Extract chunk
        chunk_text = text[start:end].strip()
        
        if chunk_text:
            chunks.append({
                "chunk_index": chunk_index,
                "chunk_text": chunk_text,
                "char_count": len(chunk_text),
                "start_pos": start,
                "end_pos": end
            })
            chunk_index += 1
        
        # Move start position (with overlap)
        start = end - overlap if end < len(text) else len(text)
    
    return chunks


def chunk_documents(documents: Dict[str, str], chunk_size: int = 1000) -> Dict[str, List[Dict]]:
    """
    Chunk all documents in the knowledge base
    
    Args:
        documents: Dictionary mapping document names to full text
        chunk_size: Maximum characters per chunk
    
    Returns:
        Dictionary mapping document names to lists of chunks
    """
    chunked_documents = {}
    total_chunks = 0
    
    print(f"Chunking {len(documents)} documents...")
    
    for doc_name, text in documents.items():
        chunks = chunk_text(text, chunk_size=chunk_size)
        chunked_documents[doc_name] = chunks
        total_chunks += len(chunks)
        
        print(f"  {doc_name}: {len(chunks)} chunks ({len(text)} chars)")
    
    print(f"\nTotal chunks created: {total_chunks}")
    return chunked_documents


def get_chunk_statistics(chunked_documents: Dict[str, List[Dict]]) -> Dict:
    """
    Get statistics about the chunked documents
    
    Args:
        chunked_documents: Dictionary of chunked documents
    
    Returns:
        Dictionary with statistics
    """
    total_chunks = 0
    total_chars = 0
    chunk_sizes = []
    
    for doc_name, chunks in chunked_documents.items():
        for chunk in chunks:
            total_chunks += 1
            total_chars += chunk["char_count"]
            chunk_sizes.append(chunk["char_count"])
    
    avg_chunk_size = total_chars / total_chunks if total_chunks > 0 else 0
    
    return {
        "total_documents": len(chunked_documents),
        "total_chunks": total_chunks,
        "total_characters": total_chars,
        "average_chunk_size": int(avg_chunk_size),
        "min_chunk_size": min(chunk_sizes) if chunk_sizes else 0,
        "max_chunk_size": max(chunk_sizes) if chunk_sizes else 0
    }


if __name__ == "__main__":
    # Test chunking
    sample_text = """
    This is a sample document for testing the chunking functionality.
    
    It has multiple paragraphs and sentences. The chunking algorithm should
    try to break at natural boundaries like paragraphs or sentences.
    
    This helps preserve context and meaning when the chunks are later
    embedded and used for retrieval.
    
    Let's see how it performs with this sample text.
    """ * 10  # Repeat to make it longer
    
    chunks = chunk_text(sample_text, chunk_size=200, overlap=50)
    
    print(f"Created {len(chunks)} chunks from {len(sample_text)} characters")
    print("\nFirst chunk:")
    print(chunks[0]["chunk_text"])
