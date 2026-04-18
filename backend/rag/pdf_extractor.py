"""
PDF text extraction utility for Tarsheeh.cv RAG pipeline
Extracts clean text from PDF documents in the knowledge base
"""

import pdfplumber
from pathlib import Path
from typing import Dict, List, Optional


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract all text from a PDF file
    
    Args:
        pdf_path: Path to the PDF file
    
    Returns:
        Extracted text as a single string
    """
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text_parts = []
            
            for page in pdf.pages:
                # Extract text from page
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            
            # Join all pages with double newline
            full_text = "\n\n".join(text_parts)
            
            # Clean up the text
            full_text = clean_text(full_text)
            
            return full_text
    
    except Exception as e:
        raise Exception(f"Error extracting text from {pdf_path}: {str(e)}")


def clean_text(text: str) -> str:
    """
    Clean extracted text by removing extra whitespace and formatting issues
    
    Args:
        text: Raw extracted text
    
    Returns:
        Cleaned text
    """
    # Remove multiple spaces
    text = " ".join(text.split())
    
    # Remove multiple newlines (keep max 2)
    lines = text.split("\n")
    cleaned_lines = []
    prev_empty = False
    
    for line in lines:
        line = line.strip()
        if line:
            cleaned_lines.append(line)
            prev_empty = False
        elif not prev_empty:
            cleaned_lines.append("")
            prev_empty = True
    
    return "\n".join(cleaned_lines)


def extract_all_documents(knowledge_base_path: str) -> Dict[str, str]:
    """
    Extract text from all PDF documents in the knowledge base
    
    Args:
        knowledge_base_path: Path to the knowledge_base directory
    
    Returns:
        Dictionary mapping document names to extracted text
    """
    knowledge_base = Path(knowledge_base_path)
    documents = {}
    
    # Get all PDF files recursively
    pdf_files = list(knowledge_base.rglob("*.pdf"))
    
    print(f"Found {len(pdf_files)} PDF files in knowledge base")
    
    for pdf_file in pdf_files:
        print(f"Extracting: {pdf_file.name}...")
        
        try:
            text = extract_text_from_pdf(str(pdf_file))
            
            # Use filename without extension as document name
            doc_name = pdf_file.stem
            
            # Add category from parent folder
            category = pdf_file.parent.name
            
            # Store with metadata in name
            full_name = f"{category}/{doc_name}"
            documents[full_name] = text
            
            print(f"  ✓ Extracted {len(text)} characters")
        
        except Exception as e:
            print(f"  ✗ Failed: {str(e)}")
    
    print(f"\nSuccessfully extracted {len(documents)} documents")
    return documents


if __name__ == "__main__":
    # Test extraction
    import sys
    
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        text = extract_text_from_pdf(pdf_path)
        print(f"Extracted {len(text)} characters")
        print("\nFirst 500 characters:")
        print(text[:500])
    else:
        print("Usage: python pdf_extractor.py <path_to_pdf>")
