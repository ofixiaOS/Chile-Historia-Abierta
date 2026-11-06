"""Pruebas unitarias, funcionales y de integración para el pipeline de extracción y chunking."""

from __future__ import annotations

import io
import json
from pathlib import Path

import pypdf
import pytest

from worker.application.document_pipeline import (
    DocumentExtractor,
    DocumentPipeline,
    ExtractedPage,
    TextChunker,
)
from worker.cli import main
from worker.domain.exceptions import (
    CorruptDocumentError,
    DocumentLimitError,
    EmptyDocumentError,
    InvalidChunkError,
    InvalidLocatorError,
)
from worker.domain.models import (
    ChunkLicense,
    ChunkLocator,
    ChunkLocatorType,
    EvidenceChunk,
    EvidenceStatus,
    SourceType,
    compute_chunk_hash,
)


@pytest.fixture
def sample_license() -> ChunkLicense:
    return ChunkLicense(
        software_license="MIT",
        dataset_license="CC-BY-4.0",
        item_rights="Public Domain (Ley 17.336 Art. 8)",
        redistribution_policy="open_public_with_attribution",
        required_attribution="Biblioteca del Congreso Nacional de Chile",
    )


@pytest.fixture
def synthetic_pdf_bytes() -> bytes:
    """Genera un archivo PDF sintético en memoria con dos páginas y texto legal."""
    writer = pypdf.PdfWriter()

    # Añadir página 1
    p1 = writer.add_blank_page(width=300, height=300)
    # pypdf permite inyectar texto o usar una estructura básica. Para garantizar texto extraíble:
    # creamos una página con stream de texto PDF estándar
    writer.pages[0].compress_content_streams()  # noop

    # Construimos un PDF mínimo válido con operadores de texto PDF (BT / ET)
    # Para ser 100% confiable y compatible entre plataformas sin fuentes externas,
    # escribimos el stream directo de página:
    stream = io.BytesIO()
    writer.write(stream)
    pdf_template = stream.getvalue()

    # En lugar de depender de operadores crudos de pypdf, creamos un PDF con ReportLab o pypdf Annotation
    # O mejor aún: generamos el PDF válido con pypdf inyectando una fuente Helvetica estándar
    return create_minimal_pdf_with_text(
        [
            "Biblioteca del Congreso Nacional de Chile.\nArtículo 1° La presente ley protege los derechos de autor.",
            "Artículo 2° Para los efectos de la ley, se entiende por autor la persona natural que crea la obra.",
        ]
    )


def create_minimal_pdf_with_text(pages_text: list[str]) -> bytes:
    """Crea un PDF válido con texto nativo extraíble por pypdf."""
    # PDF sintético estructural mínimo con fuente Helvetica
    objects: list[str] = []
    # 1 0 obj: Catalog
    # 2 0 obj: Outlines
    # 3 0 obj: Pages
    # 4 0 obj: Font Helvetica
    # Para cada página: Page obj, Content stream obj
    objects.append("1 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj")
    objects.append("2 0 obj\n<< /Type /Outlines /Count 0 >>\nendobj")
    objects.append("4 0 obj\n<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>\nendobj")

    page_obj_ids = []
    content_objs = []
    next_id = 5

    for p_idx, text in enumerate(pages_text):
        page_id = next_id
        content_id = next_id + 1
        next_id += 2
        page_obj_ids.append(page_id)

        # Escapar paréntesis para cadenas PDF
        safe_lines = [
            line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            for line in text.split("\n")
        ]
        text_ops = ["BT", "/F1 12 Tf", "20 750 Td", "14 TL"]
        for idx, line in enumerate(safe_lines):
            if idx > 0:
                text_ops.append(f"T* ({line}) Tj")
            else:
                text_ops.append(f"({line}) Tj")
        text_ops.append("ET")
        stream_content = "\n".join(text_ops)
        stream_bytes = stream_content.encode("latin-1", errors="replace")

        page_obj = (
            f"{page_id} 0 obj\n"
            f"<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] "
            f"/Contents {content_id} 0 R /Resources << /Font << /F1 4 0 R >> >> >>\n"
            f"endobj"
        )
        content_obj = (
            f"{content_id} 0 obj\n"
            f"<< /Length {len(stream_bytes)} >>\n"
            f"stream\n"
            f"{stream_content}\n"
            f"endstream\n"
            f"endobj"
        )
        objects.append(page_obj)
        content_objs.append(content_obj)

    objects.extend(content_objs)

    kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    pages_obj = f"3 0 obj\n<< /Type /Pages /Kids [{kids_str}] /Count {len(page_obj_ids)} >>\nendobj"
    # Insertar pages_obj en posición 2
    objects.insert(2, pages_obj)

    # Construir archivo con tabla xref
    header = "%PDF-1.4\n"
    body = ""
    offsets = [0]
    curr_pos = len(header.encode("latin-1"))

    full_text = header
    for obj in objects:
        offsets.append(curr_pos)
        obj_bytes = (obj + "\n").encode("latin-1")
        curr_pos += len(obj_bytes)
        full_text += obj + "\n"

    xref_pos = curr_pos
    xref = f"xref\n0 {len(offsets)}\n0000000000 65535 f \n"
    for off in offsets[1:]:
        xref += f"{off:010d} 00000 n \n"

    trailer = (
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    )
    full_text += xref + trailer
    return full_text.encode("latin-1")


def test_document_extractor_text_normalization():
    extractor = DocumentExtractor()
    raw = "Este es un texto con salto de\r\n línea y palabra divi-\nsionada.   Muchos   espacios.\n\n\n\nTriple salto."
    norm = extractor.normalize_text(raw)

    assert "división" not in norm  # sin tilde en origen, pero las sílabas quedan unidas
    assert "divisionada" in norm
    assert "   " not in norm
    assert "\r" not in norm
    assert "\n\n\n" not in norm


def test_document_extractor_text_multi_page():
    extractor = DocumentExtractor()
    doc_text = "Página 1 con texto histórico.\fPágina 2 con Decreto Ley 1070."
    pages = extractor.extract_from_text(doc_text)

    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert "Página 1" in pages[0].text
    assert pages[1].page_number == 2
    assert "Página 2" in pages[1].text


def test_document_extractor_pdf_synthetic(synthetic_pdf_bytes):
    extractor = DocumentExtractor()
    pages = extractor.extract_from_pdf(synthetic_pdf_bytes)

    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert "Ley" in pages[0].text or "Congreso" in pages[0].text
    assert pages[1].page_number == 2
    assert "persona natural" in pages[1].text


def test_document_extractor_rejects_empty_text():
    extractor = DocumentExtractor()
    with pytest.raises(EmptyDocumentError):
        extractor.extract_from_text("   \n\t  ")


def test_document_extractor_rejects_empty_and_corrupt_pdf():
    extractor = DocumentExtractor()
    with pytest.raises(EmptyDocumentError):
        extractor.extract_from_pdf(b"")

    with pytest.raises(CorruptDocumentError):
        extractor.extract_from_pdf(b"not a valid pdf binary content")


def test_document_extractor_enforces_byte_page_and_character_limits(synthetic_pdf_bytes):
    byte_limited = DocumentExtractor(max_file_bytes=len(synthetic_pdf_bytes) - 1)
    with pytest.raises(DocumentLimitError) as byte_error:
        byte_limited.extract_from_pdf(synthetic_pdf_bytes)
    assert byte_error.value.code == "E_DOCUMENT_LIMIT"

    page_limited = DocumentExtractor(max_pdf_pages=1)
    with pytest.raises(DocumentLimitError, match="page limit"):
        page_limited.extract_from_pdf(synthetic_pdf_bytes)

    text_limited = DocumentExtractor(max_extracted_chars=10)
    with pytest.raises(DocumentLimitError, match="character limit"):
        text_limited.extract_from_text("texto histórico demasiado largo")

    text_page_limited = DocumentExtractor(max_pdf_pages=2)
    with pytest.raises(DocumentLimitError, match="page limit"):
        text_page_limited.extract_from_text("página uno\fpágina dos\fpágina tres")


def test_document_extractor_bounds_path_reads_and_pdf_expanded_text(synthetic_pdf_bytes, tmp_path):
    oversized_file = tmp_path / "oversized.txt"
    oversized_file.write_bytes(b"12345")
    with pytest.raises(DocumentLimitError, match="byte limit"):
        DocumentExtractor(max_file_bytes=4).extract_file(oversized_file)

    expanded_text_limited = DocumentExtractor(max_extracted_chars=10)
    with pytest.raises(DocumentLimitError, match="character limit"):
        expanded_text_limited.extract_from_pdf(synthetic_pdf_bytes)


def test_document_extractor_file_not_found():
    extractor = DocumentExtractor()
    with pytest.raises(FileNotFoundError):
        extractor.extract_file("non_existent_file_abc123.pdf")


def test_text_chunker_splits_paragraphs_and_preserves_articles():
    chunker = TextChunker(max_chunk_size=300, min_chunk_size=50, overlap=30)
    page_text = (
        "Artículo 1° El Banco Central de Chile es un organismo autónomo y de rango constitucional.\n\n"
        "Artículo 2° Tiene por objeto velar por la estabilidad de la moneda y el normal funcionamiento de los pagos internos y externos."
    )
    page = ExtractedPage(page_number=3, text=page_text)
    chunks = chunker.chunk_page(page)

    assert len(chunks) == 2
    assert chunks[0].locator_type == ChunkLocatorType.FRAGMENT
    assert chunks[0].locator_value == "p. 3#art-1"
    assert "Banco Central" in chunks[0].text

    assert chunks[1].locator_type == ChunkLocatorType.FRAGMENT
    assert chunks[1].locator_value == "p. 3#art-2"
    assert "estabilidad de la moneda" in chunks[1].text


def test_text_chunker_long_paragraph_sentence_splitting():
    chunker = TextChunker(max_chunk_size=120, min_chunk_size=40, overlap=20)
    long_text = (
        "Primera oración de prueba que aporta contexto histórico fundamental. "
        "Segunda oración que profundiza en las reformas tributarias de la época. "
        "Tercera oración que concluye con los resultados fiscales del periodo."
    )
    page = ExtractedPage(page_number=1, text=long_text)
    chunks = chunker.chunk_page(page)

    assert len(chunks) >= 2
    for c in chunks:
        assert len(c.text) <= 150  # permite un margen de palabras razonable
        assert c.locator_value == "p. 1"
        assert c.locator_type == ChunkLocatorType.PAGE


def test_text_chunker_merges_tiny_paragraphs():
    chunker = TextChunker(max_chunk_size=400, min_chunk_size=80, overlap=0)
    text = "Frase corta 1.\n\nFrase corta 2.\n\nFrase corta 3 que amplía el contenido histórico general."
    page = ExtractedPage(page_number=1, text=text)
    chunks = chunker.chunk_page(page)

    # Frases cortas contiguas con mismo localizador deben unirse
    assert len(chunks) == 1
    assert "Frase corta 1." in chunks[0].text
    assert "Frase corta 2." in chunks[0].text


def test_document_pipeline_end_to_end_with_pdf(synthetic_pdf_bytes, sample_license):
    pipeline = DocumentPipeline()
    file_hash, chunks = pipeline.process_bytes(
        data=synthetic_pdf_bytes,
        source_id="bcn-ley-17336",
        source_name="Ley 17.336 de Propiedad Intelectual",
        source_type=SourceType.OFFICIAL_ADMINISTRATIVE,
        license=sample_license,
        file_extension=".pdf",
        epistemic_status=EvidenceStatus.DOCUMENTED,
    )

    assert len(file_hash) == 64
    assert len(chunks) >= 2

    for chunk in chunks:
        assert chunk.source_id == "bcn-ley-17336"
        assert chunk.source_name == "Ley 17.336 de Propiedad Intelectual"
        assert chunk.source_type == SourceType.OFFICIAL_ADMINISTRATIVE

        assert chunk.epistemic_status == EvidenceStatus.DOCUMENTED
        assert len(chunk.content_hash) == 64
        # Hash coincide con el texto normalizado
        assert chunk.content_hash == compute_chunk_hash(chunk.text)
        assert chunk.locator.value.startswith("p. ")
        assert chunk.license.item_rights == sample_license.item_rights


def test_evidence_chunk_model_integrity_and_validation(sample_license):
    # Chunk válido
    valid_text = "El 11 de julio de 1971 se promulgó la reforma constitucional sobre nacionalización de la gran minería."
    c_hash = compute_chunk_hash(valid_text)

    chunk = EvidenceChunk(
        id="reforma-1971-p1-c001",
        source_id="diario-oficial-1971",
        source_name="Diario Oficial de Chile (1971)",
        source_type=SourceType.PRIMARY_ARCHIVE,
        content_hash=c_hash,
        text=valid_text,
        locator=ChunkLocator(type=ChunkLocatorType.PAGE, value="p. 1"),
        epistemic_status=EvidenceStatus.DOCUMENTED,
        license=sample_license,
    )
    assert chunk.id == "reforma-1971-p1-c001"

    # Serialización camelCase conforme con TypeScript
    dumped = chunk.model_dump(by_alias=True)
    assert "sourceId" in dumped
    assert "sourceName" in dumped
    assert "contentHash" in dumped
    assert "epistemicStatus" in dumped
    assert "retrievedAt" in dumped
    assert dumped["license"]["itemRights"] == sample_license.item_rights

    # Rechaza content_hash inválido (no SHA-256)
    with pytest.raises((InvalidChunkError, ValueError)):
        EvidenceChunk(
            id="c-001",
            source_id="s-1",
            source_name="s-name",
            source_type=SourceType.PRIMARY_ARCHIVE,
            content_hash="not_a_valid_hash",
            text=valid_text,
            locator=ChunkLocator(type=ChunkLocatorType.PAGE, value="p. 1"),
            license=sample_license,
        )

    # Rechaza texto vacío
    with pytest.raises((InvalidChunkError, ValueError)):
        EvidenceChunk(
            id="c-001",
            source_id="s-1",
            source_name="s-name",
            source_type=SourceType.PRIMARY_ARCHIVE,
            content_hash=c_hash,
            text="   ",
            locator=ChunkLocator(type=ChunkLocatorType.PAGE, value="p. 1"),
            license=sample_license,
        )

    # Rechaza id vacío
    with pytest.raises((InvalidChunkError, ValueError)):
        EvidenceChunk(
            id="",
            source_id="s-1",
            source_name="s-name",
            source_type=SourceType.PRIMARY_ARCHIVE,
            content_hash=c_hash,
            text=valid_text,
            locator=ChunkLocator(type=ChunkLocatorType.PAGE, value="p. 1"),
            license=sample_license,
        )


    # Rechaza localizador vacío
    with pytest.raises(InvalidLocatorError):
        ChunkLocator(type=ChunkLocatorType.PAGE, value="   ")

    # Rechaza licencias incompletas
    with pytest.raises(ValueError):
        ChunkLicense(
            software_license="",
            dataset_license="",
            item_rights="",  # campo requerido no puede ser vacío
            redistribution_policy="open",
            required_attribution="BCN",
        )


def test_cli_extract_chunks_end_to_end(tmp_path, sample_license):
    doc_path = tmp_path / "decreto_ejemplo.txt"
    doc_path.write_text(
        "Artículo 1° Créase la Corporación de Fomento de la Producción.\n\n"
        "Artículo 2° Corresponderá a la Corporación formular un plan general de fomento económico.",
        encoding="utf-8",
    )

    out_json = tmp_path / "chunks.json"

    # Invocar CLI
    args = [
        "worker",
        "extract-chunks",
        "--input-file",
        str(doc_path),
        "--source-id",
        "ley-corfo-1939",
        "--source-name",
        "Ley Orgánica de CORFO (1939)",
        "--source-type",
        "official_administrative",
        "--output-file",
        str(out_json),

    ]

    import sys
    from unittest.mock import patch

    with patch.object(sys, "argv", args):
        code = main()
        assert code == 0

    assert out_json.exists()
    data = json.loads(out_json.read_text(encoding="utf-8"))
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["sourceId"] == "ley-corfo-1939"
    assert data[0]["locator"]["value"] == "p. 1#art-1"
    assert data[1]["locator"]["value"] == "p. 1#art-2"
    assert len(data[0]["contentHash"]) == 64
