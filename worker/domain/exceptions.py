"""Excepciones de Dominio para el Worker de Estadística y Modelado."""


class DomainError(Exception):
    """Excepción base de dominio."""

    def __init__(self, message: str, code: str = "E_DOMAIN_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class BaselineNotBeatenError(DomainError):
    """Lanzada cuando el modelo no supera deterministamente al baseline (Gate Hito 5)."""

    def __init__(self, message: str):
        super().__init__(message, code="E_BASELINE_NOT_BEATEN")


class IntervalInversionError(DomainError):
    """Lanzada cuando los intervalos de incertidumbre violan p10 <= p50 <= p90."""

    def __init__(self, message: str):
        super().__init__(message, code="E_INTERVAL_INVERSION")


class EpistemicViolationError(DomainError):
    """Lanzada cuando se intenta asignar un epistemicStatus distinto de 'forecast'."""

    def __init__(self, message: str):
        super().__init__(message, code="E_EPISTEMIC_VIOLATION")


class InsufficientObservationsError(DomainError):
    """Lanzada cuando no hay suficientes observaciones para realizar split y modelado."""

    def __init__(self, message: str):
        super().__init__(message, code="E_INSUFFICIENT_OBSERVATIONS")


class InvalidPeriodError(DomainError):
    """Lanzada cuando un identificador de periodo es inválido o no sigue orden temporal."""

    def __init__(self, message: str):
        super().__init__(message, code="E_INVALID_PERIOD")


class ObservationValidationError(DomainError):
    """Lanzada cuando los datos de una observación histórica son inválidos."""

    def __init__(self, message: str):
        super().__init__(message, code="E_INVALID_OBSERVATION")


class DocumentExtractionError(DomainError):
    """Lanzada cuando ocurre un error durante la extracción de contenido documental."""

    def __init__(self, message: str, code: str = "E_DOCUMENT_EXTRACTION_ERROR"):
        super().__init__(message, code=code)


class EmptyDocumentError(DocumentExtractionError):
    """Lanzada cuando un documento o página no contiene texto extraíble."""

    def __init__(self, message: str = "Document contains no extractable text"):
        super().__init__(message, code="E_EMPTY_DOCUMENT")


class DocumentLimitError(DocumentExtractionError):
    """Lanzada cuando un documento excede un presupuesto de recursos."""

    def __init__(self, message: str = "Document exceeds configured processing limits"):
        super().__init__(message, code="E_DOCUMENT_LIMIT")


class CorruptDocumentError(DocumentExtractionError):
    """Lanzada cuando un documento binario (PDF) está corrupto o ilegible."""

    def __init__(self, message: str = "Document file is corrupted or unreadable"):
        super().__init__(message, code="E_CORRUPT_DOCUMENT")


class InvalidLocatorError(DomainError):
    """Lanzada cuando un localizador de evidencia es inválido o está incompleto."""

    def __init__(self, message: str = "Evidence locator value cannot be empty"):
        super().__init__(message, code="E_INVALID_LOCATOR")


class InvalidChunkError(DomainError):
    """Lanzada cuando un chunk de evidencia no cumple con los invariantes requeridos."""

    def __init__(self, message: str):
        super().__init__(message, code="E_INVALID_CHUNK")
