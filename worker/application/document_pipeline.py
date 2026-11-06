"""Pipeline de Extracción Documental, Normalización y Chunking con Preservación de Procedencia."""

from __future__ import annotations

import hashlib
import io
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import BinaryIO, Optional, Union

import pypdf
from pypdf.errors import PdfReadError

from worker.domain.exceptions import (
    CorruptDocumentError,
    DocumentLimitError,
    DocumentExtractionError,
    EmptyDocumentError,
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

# Patrón para detectar artículos normativos chilenos (ej. 'Artículo 1°', 'Art. 2', 'Artículo 12.')
ARTICLE_PATTERN = re.compile(
    r"(?:Artículo|Articulo|Art\.)\s*(\d+[°º]?|\b[a-zA-Z]+\b)",
    re.IGNORECASE,
)

MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
MAX_PDF_PAGES = 500
MAX_EXTRACTED_CHARS = 2_000_000


@dataclass(frozen=True)
class ExtractedPage:
    """Página extraída de un documento con localizador y metadatos."""

    page_number: int
    text: str
    char_count: int = field(init=False)

    def __post_init__(self):
        object.__setattr__(self, "char_count", len(self.text))


class DocumentExtractor:
    """Extractor robusto de texto página a página para PDFs y documentos textuales."""

    def __init__(
        self,
        max_file_bytes: int = MAX_DOCUMENT_BYTES,
        max_pdf_pages: int = MAX_PDF_PAGES,
        max_extracted_chars: int = MAX_EXTRACTED_CHARS,
    ):
        if max_file_bytes <= 0 or max_pdf_pages <= 0 or max_extracted_chars <= 0:
            raise ValueError("Document extraction limits must be positive")
        self.max_file_bytes = max_file_bytes
        self.max_pdf_pages = max_pdf_pages
        self.max_extracted_chars = max_extracted_chars

    def read_file_bounded(self, path: Union[str, Path]) -> bytes:
        """Read once and reject oversized input before retaining it in memory."""
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"Documento no encontrado: {file_path}")
        if file_path.stat().st_size > self.max_file_bytes:
            raise DocumentLimitError(f"Document exceeds {self.max_file_bytes} byte limit")
        with file_path.open("rb") as stream:
            data = stream.read(self.max_file_bytes + 1)
        self._ensure_bytes_size(data)
        return data

    def _ensure_bytes_size(self, data: bytes) -> None:
        if len(data) > self.max_file_bytes:
            raise DocumentLimitError(f"Document exceeds {self.max_file_bytes} byte limit")

    def extract_from_pdf(self, source: Union[str, Path, BinaryIO, bytes]) -> list[ExtractedPage]:
        """Extrae texto página a página desde un archivo o flujo PDF.

        Lanza CorruptDocumentError si el archivo está corrupto o ilegible.
        Lanza EmptyDocumentError si el documento no tiene páginas o carece de texto extraíble.
        """
        stream: BinaryIO
        if isinstance(source, (str, Path)):
            p = Path(source)
            data = self.read_file_bounded(p)
            if len(data) == 0:
                raise EmptyDocumentError(f"El archivo PDF está vacío (0 bytes): {p}")
            stream = io.BytesIO(data)
        elif isinstance(source, bytes):
            self._ensure_bytes_size(source)
            if len(source) == 0:
                raise EmptyDocumentError("Los datos binarios del PDF están vacíos (0 bytes)")
            stream = io.BytesIO(source)
        else:
            data = source.read(self.max_file_bytes + 1)
            if not isinstance(data, bytes):
                raise CorruptDocumentError("PDF input stream must return bytes")
            self._ensure_bytes_size(data)
            stream = io.BytesIO(data)

        try:
            reader = pypdf.PdfReader(stream)
            if reader.is_encrypted:
                try:
                    # Intentar desencriptar con contraseña vacía (muy común en PDFs públicos)
                    reader.decrypt("")
                except Exception as e:
                    raise CorruptDocumentError(f"El documento PDF está protegido por contraseña: {e}") from e

            num_pages = len(reader.pages)
            if num_pages == 0:
                raise EmptyDocumentError("El documento PDF no contiene páginas")
            if num_pages > self.max_pdf_pages:
                raise DocumentLimitError(f"PDF exceeds {self.max_pdf_pages} page limit")

            extracted: list[ExtractedPage] = []
            total_chars = 0

            for idx, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text() or ""
                cleaned = self.normalize_text(page_text)
                total_chars += len(cleaned)
                if total_chars > self.max_extracted_chars:
                    raise DocumentLimitError(
                        f"Extracted text exceeds {self.max_extracted_chars} character limit"
                    )
                extracted.append(ExtractedPage(page_number=idx, text=cleaned))

            if total_chars == 0:
                raise EmptyDocumentError("El documento PDF no contiene texto legible (posible escaneo sin OCR)")

            return extracted

        except DocumentLimitError:
            raise
        except (PdfReadError, ValueError) as e:
            raise CorruptDocumentError(f"Archivo PDF malformado o corrupto: {e}") from e
        except EmptyDocumentError:
            raise
        except Exception as e:
            raise DocumentExtractionError(f"Falla inesperada en extracción PDF: {e}") from e

    def extract_from_text(self, text: str, source_name: str = "document.txt") -> list[ExtractedPage]:
        """Extrae texto estructurado desde un string o texto plano."""
        if len(text) > self.max_extracted_chars:
            raise DocumentLimitError(
                f"Input text exceeds {self.max_extracted_chars} character limit"
            )
        cleaned = self.normalize_text(text)
        if not cleaned:
            raise EmptyDocumentError(f"El documento de texto está vacío: {source_name}")

        # Si el texto contiene saltos de página explícitos ('\f' o '--- Page N ---')
        if "\f" in cleaned:
            page_count = cleaned.count("\f") + 1
            if page_count > self.max_pdf_pages:
                raise DocumentLimitError(f"Text document exceeds {self.max_pdf_pages} page limit")
            raw_pages = cleaned.split("\f")
            pages: list[ExtractedPage] = []
            for idx, p_text in enumerate(raw_pages, start=1):
                norm = self.normalize_text(p_text)
                if norm:
                    pages.append(ExtractedPage(page_number=idx, text=norm))
            if pages:
                return pages

        # Documento único página 1
        return [ExtractedPage(page_number=1, text=cleaned)]

    def extract_file(self, file_path: Union[str, Path]) -> list[ExtractedPage]:
        """Extrae páginas según la extensión del archivo."""
        path = Path(file_path)
        data = self.read_file_bounded(path)
        ext = path.suffix.lower()
        if ext == ".pdf":
            return self.extract_from_pdf(data)
        elif ext in (".txt", ".md", ".json", ".csv"):
            raw = data.decode("utf-8")
            return self.extract_from_text(raw, source_name=path.name)
        else:
            # Intentar como texto UTF-8
            try:
                raw = data.decode("utf-8")
                return self.extract_from_text(raw, source_name=path.name)
            except UnicodeDecodeError:
                raise DocumentExtractionError(f"Tipo de archivo no soportado o codificación binaria no PDF: {ext}")

    @staticmethod
    def normalize_text(text: str) -> str:
        """Normaliza espacios en blanco, guiones de salto de línea y saltos de carro."""
        if not text:
            return ""
        # Reemplazar retornos de carro Windows \r\n por \n
        t = text.replace("\r\n", "\n").replace("\r", "\n")
        # Eliminar guiones de división silábica al final de línea (ej. 'revolu-\nción' -> 'revolución')
        t = re.sub(r"(\w+)-\n(\w+)", r"\1\2", t)
        # Reemplazar múltiples espacios en blanco horizontales por un solo espacio
        t = re.sub(r"[ \t]+", " ", t)
        # Eliminar espacios antes y después de cada línea
        lines = [line.strip() for line in t.split("\n")]
        # Reducir triples saltos de línea a dobles
        joined = "\n".join(lines)
        return re.sub(r"\n{3,}", "\n\n", joined).strip()


@dataclass
class RawChunk:
    """Fragmento intermedio antes de construir el sobre de evidencia completo."""

    text: str
    page_number: int
    locator_type: ChunkLocatorType
    locator_value: str


class TextChunker:
    """Segmentador de texto determinista que respeta límites de oraciones, párrafos y artículos."""

    def __init__(
        self,
        max_chunk_size: int = 500,
        min_chunk_size: int = 80,
        overlap: int = 50,
    ):
        if min_chunk_size <= 0:
            raise ValueError("min_chunk_size must be positive")
        if max_chunk_size <= min_chunk_size:
            raise ValueError(f"max_chunk_size ({max_chunk_size}) must be greater than min_chunk_size ({min_chunk_size})")
        if overlap < 0 or overlap >= max_chunk_size:
            raise ValueError("overlap must be non-negative and less than max_chunk_size")

        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size
        self.overlap = overlap

    def chunk_page(self, page: ExtractedPage) -> list[RawChunk]:
        """Segmenta una página de texto en bloques citables conservando localizadores."""
        if not page.text.strip():
            return []

        # Separar en bloques por párrafos (\n\n)
        paragraphs = [p.strip() for p in page.text.split("\n\n") if p.strip()]
        if not paragraphs:
            return []

        raw_chunks: list[RawChunk] = []
        current_article: Optional[str] = None

        for para in paragraphs:
            # Detectar si el párrafo comienza con o contiene una referencia a artículo
            art_match = ARTICLE_PATTERN.search(para[:60])
            if art_match:
                current_article = art_match.group(1).lower().replace("°", "").replace("º", "")

            # Si el párrafo cabe en el tamaño máximo, considerarlo directamente
            if len(para) <= self.max_chunk_size:
                loc_type, loc_val = self._build_locator(page.page_number, current_article)
                raw_chunks.append(
                    RawChunk(
                        text=para,
                        page_number=page.page_number,
                        locator_type=loc_type,
                        locator_value=loc_val,
                    )
                )
            else:
                # El párrafo excede el tamaño máximo: dividir en oraciones
                sub_chunks = self._split_paragraph(para, page.page_number, current_article)
                raw_chunks.extend(sub_chunks)

        # Si hay chunks pequeños consecutivos que se puedan fusionar sin exceder max_chunk_size
        return self._merge_tiny_chunks(raw_chunks)

    def _build_locator(self, page_number: int, article: Optional[str]) -> tuple[ChunkLocatorType, str]:
        if article:
            return (ChunkLocatorType.FRAGMENT, f"p. {page_number}#art-{article}")
        return (ChunkLocatorType.PAGE, f"p. {page_number}")

    def _split_paragraph(self, para: str, page_number: int, article: Optional[str]) -> list[RawChunk]:
        """Divide un párrafo largo respetando límites de oraciones."""
        # Separación por punto seguido o punto y coma
        sentences = re.split(r"(?<=[.;])\s+", para)
        chunks: list[RawChunk] = []
        current_buf: list[str] = []
        current_len = 0

        for sent in sentences:
            sent_len = len(sent)
            if current_len + sent_len + 1 <= self.max_chunk_size:
                current_buf.append(sent)
                current_len += sent_len + 1
            else:
                if current_buf:
                    chunk_text = " ".join(current_buf).strip()
                    loc_type, loc_val = self._build_locator(page_number, article)
                    chunks.append(
                        RawChunk(
                            text=chunk_text,
                            page_number=page_number,
                            locator_type=loc_type,
                            locator_value=loc_val,
                        )
                    )
                    # Solapamiento: conservar la última oración si cabe en el overlap
                    if self.overlap > 0 and len(current_buf[-1]) <= self.overlap:
                        current_buf = [current_buf[-1], sent]
                        current_len = len(current_buf[0]) + sent_len + 1
                    else:
                        current_buf = [sent]
                        current_len = sent_len
                else:
                    # Una sola oración excede max_chunk_size: corte forzado por palabras
                    words = sent.split(" ")
                    w_buf: list[str] = []
                    w_len = 0
                    for w in words:
                        if w_len + len(w) + 1 <= self.max_chunk_size:
                            w_buf.append(w)
                            w_len += len(w) + 1
                        else:
                            if w_buf:
                                loc_type, loc_val = self._build_locator(page_number, article)
                                chunks.append(
                                    RawChunk(
                                        text=" ".join(w_buf).strip(),
                                        page_number=page_number,
                                        locator_type=loc_type,
                                        locator_value=loc_val,
                                    )
                                )
                            w_buf = [w]
                            w_len = len(w)
                    if w_buf:
                        current_buf = w_buf
                        current_len = w_len

        if current_buf:
            chunk_text = " ".join(current_buf).strip()
            if chunk_text:
                loc_type, loc_val = self._build_locator(page_number, article)
                chunks.append(
                    RawChunk(
                        text=chunk_text,
                        page_number=page_number,
                        locator_type=loc_type,
                        locator_value=loc_val,
                    )
                )

        return chunks

    def _merge_tiny_chunks(self, chunks: list[RawChunk]) -> list[RawChunk]:
        """Fusiona chunks contiguos que sean menores que min_chunk_size si comparten página y artículo."""
        if not chunks:
            return []

        merged: list[RawChunk] = []
        acc: Optional[RawChunk] = None

        for c in chunks:
            if acc is None:
                acc = c
                continue

            # Si el chunk acumulado es menor que min_chunk_size y fusionarlo no excede max_chunk_size
            same_loc = acc.locator_value == c.locator_value
            combined_len = len(acc.text) + len(c.text) + 1
            if same_loc and (len(acc.text) < self.min_chunk_size or combined_len <= self.max_chunk_size):
                acc = RawChunk(
                    text=f"{acc.text} {c.text}".strip(),
                    page_number=acc.page_number,
                    locator_type=acc.locator_type,
                    locator_value=acc.locator_value,
                )
            else:
                merged.append(acc)
                acc = c

        if acc:
            merged.append(acc)

        return merged


class DocumentPipeline:
    """Orquestador integral de ingestión, extracción, chunking y emisión de EvidenceChunks."""

    def __init__(
        self,
        extractor: Optional[DocumentExtractor] = None,
        chunker: Optional[TextChunker] = None,
    ):
        self.extractor = extractor or DocumentExtractor()
        self.chunker = chunker or TextChunker()

    def process_file(
        self,
        file_path: Union[str, Path],
        source_id: str,
        source_name: str,
        source_type: SourceType,
        license: ChunkLicense,
        epistemic_status: EvidenceStatus = EvidenceStatus.DOCUMENTED,
        retrieved_at: Optional[str] = None,
    ) -> tuple[str, list[EvidenceChunk]]:
        """Procesa un archivo documental y genera lista de EvidenceChunk con hash de origen.

        Retorna:
            (file_sha256, list[EvidenceChunk])
        """
        p = Path(file_path)
        if not p.exists():
            raise FileNotFoundError(f"Archivo no encontrado: {p}")

        file_bytes = self.extractor.read_file_bounded(p)
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        ext = p.suffix.lower()
        if ext == ".pdf":
            pages = self.extractor.extract_from_pdf(file_bytes)
        else:
            try:
                raw = file_bytes.decode("utf-8")
            except UnicodeDecodeError as e:
                raise DocumentExtractionError(
                    f"Tipo de archivo no soportado o codificación binaria no PDF: {ext}"
                ) from e
            pages = self.extractor.extract_from_text(raw, source_name=p.name)
        return file_hash, self._process_pages(
            pages=pages,
            source_id=source_id,
            source_name=source_name,
            source_type=source_type,
            license=license,
            epistemic_status=epistemic_status,
            retrieved_at=retrieved_at,
        )

    def process_bytes(
        self,
        data: bytes,
        source_id: str,
        source_name: str,
        source_type: SourceType,
        license: ChunkLicense,
        file_extension: str = ".pdf",
        epistemic_status: EvidenceStatus = EvidenceStatus.DOCUMENTED,
        retrieved_at: Optional[str] = None,
    ) -> tuple[str, list[EvidenceChunk]]:
        """Procesa bytes en memoria y genera lista de EvidenceChunk con hash de origen."""
        self.extractor._ensure_bytes_size(data)
        file_hash = hashlib.sha256(data).hexdigest()

        if file_extension.lower() == ".pdf":
            pages = self.extractor.extract_from_pdf(data)
        else:
            text = data.decode("utf-8", errors="replace")
            pages = self.extractor.extract_from_text(text, source_name=source_name)

        return file_hash, self._process_pages(
            pages=pages,
            source_id=source_id,
            source_name=source_name,
            source_type=source_type,
            license=license,
            epistemic_status=epistemic_status,
            retrieved_at=retrieved_at,
        )

    def _process_pages(
        self,
        pages: list[ExtractedPage],
        source_id: str,
        source_name: str,
        source_type: SourceType,
        license: ChunkLicense,
        epistemic_status: EvidenceStatus,
        retrieved_at: Optional[str],
    ) -> list[EvidenceChunk]:
        evidence_chunks: list[EvidenceChunk] = []
        global_chunk_idx = 1

        for page in pages:
            raw_chunks = self.chunker.chunk_page(page)
            for rc in raw_chunks:
                chunk_hash = compute_chunk_hash(rc.text)
                chunk_id = f"{source_id}-p{rc.page_number}-c{global_chunk_idx:03d}"

                chunk_obj = EvidenceChunk(
                    id=chunk_id,
                    source_id=source_id,
                    source_name=source_name,
                    source_type=source_type,
                    content_hash=chunk_hash,
                    text=rc.text,
                    locator=ChunkLocator(type=rc.locator_type, value=rc.locator_value),
                    epistemic_status=epistemic_status,
                    license=license,
                    **( {"retrieved_at": retrieved_at} if retrieved_at else {} ),
                )
                evidence_chunks.append(chunk_obj)
                global_chunk_idx += 1

        if not evidence_chunks:
            raise EmptyDocumentError(f"No se pudieron generar fragmentos de evidencia para la fuente {source_id}")

        return evidence_chunks
