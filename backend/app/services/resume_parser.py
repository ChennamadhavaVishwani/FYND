"""PDF Upload -> Text extraction"""
from pypdf import PdfReader
from io import BytesIO


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts raw text from a PDF file's bytes."""
    reader = PdfReader(BytesIO(file_bytes))
    text_chunks = []

    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text_chunks.append(page_text)

    full_text = "\n".join(text_chunks).strip()

    if not full_text:
        raise ValueError("No extractable text found in PDF (it may be a scanned image).")

    return full_text