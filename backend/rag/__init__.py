"""
RAG (Retrieval-Augmented Generation) module for Tarsheeh.cv
Handles knowledge base ingestion and retrieval for agent context
"""

from .pdf_extractor import extract_text_from_pdf, extract_all_documents
from .text_chunker import chunk_text, chunk_documents
from .embedding_generator import generate_embedding, generate_embeddings_batch

__all__ = [
    'extract_text_from_pdf',
    'extract_all_documents',
    'chunk_text',
    'chunk_documents',
    'generate_embedding',
    'generate_embeddings_batch'
]
