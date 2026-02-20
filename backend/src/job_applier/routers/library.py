from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from job_applier.models.document import Document, DocumentType
from job_applier.services.parser import parser
from job_applier.services.storage import generate_id, storage

router = APIRouter(prefix="/api/library", tags=["library"])


@router.post("/upload", response_model=Document)
async def upload_document(file: UploadFile, doc_type: str = "cv"):
    if doc_type not in ("cv", "letter"):
        raise HTTPException(400, "doc_type must be 'cv' or 'letter'")

    doc_id = generate_id()
    filename = file.filename or "unknown"
    suffix = Path(filename).suffix

    # Save original file
    subdir = "cvs" if doc_type == "cv" else "letters"
    original_path = Path("library") / subdir / "originals" / f"{doc_id}{suffix}"
    content = await file.read()
    storage.save_file(original_path, content)

    # Extract text
    full_path = storage.base_dir / original_path
    extracted_text = await parser.parse_file(full_path)

    # Save metadata
    doc = Document(
        id=doc_id,
        type=doc_type,  # type: ignore[arg-type]
        filename=filename,
        original_path=str(original_path),
        extracted_text=extracted_text,
    )
    metadata_path = Path("library") / subdir / "metadata" / f"{doc_id}.json"
    storage.save_model(metadata_path, doc)

    return doc


@router.get("/documents", response_model=list[Document])
async def list_documents(doc_type: str | None = None):
    docs: list[Document] = []
    for subdir in (["cvs", "letters"] if doc_type is None else
                   ["cvs"] if doc_type == "cv" else ["letters"]):
        metadata_dir = Path("library") / subdir / "metadata"
        for f in storage.list_json_files(metadata_dir):
            doc = storage.load_model(f, Document)
            if doc:
                docs.append(doc)
    docs.sort(key=lambda d: d.created_at, reverse=True)
    return docs


@router.get("/documents/{doc_id}", response_model=Document)
async def get_document(doc_id: str):
    doc = _find_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    doc = _find_document(doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    # Delete original file
    storage.delete_path(Path(doc.original_path))

    # Delete metadata
    subdir = "cvs" if doc.type == "cv" else "letters"
    storage.delete_path(Path("library") / subdir / "metadata" / f"{doc_id}.json")

    return {"deleted": True}


def _find_document(doc_id: str) -> Document | None:
    for subdir in ("cvs", "letters"):
        path = Path("library") / subdir / "metadata" / f"{doc_id}.json"
        doc = storage.load_model(path, Document)
        if doc:
            return doc
    return None
