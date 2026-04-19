"""
RAG (Retrieval-Augmented Generation) module for Tarsheeh.cv
Handles knowledge base ingestion and retrieval for agent context
"""

from .pdf_extractor import extract_text_from_pdf, extract_all_documents
from .text_chunker import chunk_text, chunk_documents
from .embedding_generator import generate_embedding, generate_embeddings_batch
from .retriever import (
    retrieve_context,
    retrieve_context_by_category,
    format_context_for_prompt,
    embed_query
)

__all__ = [
    # Ingestion functions
    'extract_text_from_pdf',
    'extract_all_documents',
    'chunk_text',
    'chunk_documents',
    'generate_embedding',
    'generate_embeddings_batch',
    # Retrieval functions (what agents will use)
    'retrieve_context',
    'retrieve_context_by_category',
    'format_context_for_prompt',
    'embed_query'
]