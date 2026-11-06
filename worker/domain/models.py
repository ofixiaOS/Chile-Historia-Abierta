"""Modelos de dominio del Worker de Estadística y Modelado."""

from __future__ import annotations

import hashlib
import math
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from worker.domain.exceptions import (
    BaselineNotBeatenError,
    EpistemicViolationError,
    IntervalInversionError,
    InvalidChunkError,
    InvalidLocatorError,
    ObservationValidationError,
)

SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")



class ObservationStatus(str, Enum):
    NORMAL = "normal"
    PROVISIONAL = "provisional"
    REVISED = "revised"
    ESTIMATED = "estimated"
    IMPUTED = "imputed"


class StatisticalFrequency(str, Enum):
    DAILY = "daily"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


class BacktestMetric(str, Enum):
    MAE = "mae"
    RMSE = "rmse"
    MAPE = "mape"


class CamelModel(BaseModel):
    """Modelo base con serialización camelCase por defecto."""

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
        extra="forbid",
    )


class Observation(CamelModel):
    """Observación histórica documentada de una serie temporal."""

    period: str = Field(..., min_length=1, description="Periodo temporal (ej. 2024-01)")
    value: float = Field(..., description="Valor numérico de la observación")
    status: ObservationStatus = Field(default=ObservationStatus.NORMAL)
    unit: str = Field(..., min_length=1, description="Unidad de medida (ej. %)")
    locator: Optional[str] = Field(default=None, description="Localizador documental o tabla")

    @field_validator("value")
    @classmethod
    def validate_finite_value(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ObservationValidationError("Observation value must be a finite number")
        return v


class SeriesVintage(CamelModel):
    """Versión inmutable de una serie estadística con fecha y hash de contenido."""

    id: str = Field(..., min_length=1)
    series_id: str = Field(..., min_length=1)
    vintage_date: str = Field(..., min_length=1, description="Fecha ISO 8601 de publicación")
    coverage_start: str = Field(..., min_length=1)
    coverage_end: str = Field(..., min_length=1)
    observations: list[Observation] = Field(..., min_length=1)
    content_hash: str = Field(..., min_length=64, max_length=64)
    publication_notes: Optional[str] = Field(default=None)

    @field_validator("content_hash")
    @classmethod
    def validate_sha256(cls, v: str) -> str:
        if not SHA256_PATTERN.match(v):
            raise ValueError("content_hash must be a 64-character lowercase hex SHA-256 string")
        return v


class StatisticalSeries(CamelModel):
    """Definición canónica de una serie temporal."""

    id: str = Field(..., min_length=1)
    concept: str = Field(..., min_length=1)
    provider_agency: str = Field(..., min_length=1)
    source_id: str = Field(..., min_length=1)
    frequency: StatisticalFrequency = Field(default=StatisticalFrequency.MONTHLY)
    base_unit: str = Field(..., min_length=1)
    methodology: str = Field(..., min_length=1)
    current_vintage_id: str = Field(..., min_length=1)
    limitations: list[str] = Field(default_factory=list)


class ForecastIntervalPoint(CamelModel):
    """Punto proyectado en el tiempo con abanico de percentiles p10 <= p50 <= p90."""

    period: str = Field(..., min_length=1)
    p10: float = Field(..., description="Percentil 10 (límite inferior)")
    p50: float = Field(..., description="Percentil 50 (mediana / pronóstico central)")
    p90: float = Field(..., description="Percentil 90 (límite superior)")

    @model_validator(mode="after")
    def validate_monotonic_quantiles(self) -> ForecastIntervalPoint:
        for val, name in [(self.p10, "p10"), (self.p50, "p50"), (self.p90, "p90")]:
            if not math.isfinite(val):
                raise IntervalInversionError(f"Forecast intervals for period {self.period} must be finite")
        if not (self.p10 <= self.p50 <= self.p90):
            raise IntervalInversionError(
                f"Inversión de intervalos en periodo {self.period}: se requiere p10 <= p50 <= p90 (obtenido p10={self.p10}, p50={self.p50}, p90={self.p90})"
            )
        return self


class ForecastRun(CamelModel):
    """Sobre canónico de pronóstico delimitado con verificación estricta de baseline."""

    id: str = Field(..., min_length=1)
    series_id: str = Field(..., min_length=1)
    target_vintage_id: str = Field(..., min_length=1)
    model_name: str = Field(..., min_length=1)
    baseline_model: str = Field(..., min_length=1)
    split_period: str = Field(..., min_length=1)
    metric: BacktestMetric = Field(...)
    model_metric_value: float = Field(...)
    baseline_metric_value: float = Field(...)
    beats_baseline: bool = Field(...)
    forecast_horizon: int = Field(..., gt=0)
    forecast_points: list[ForecastIntervalPoint] = Field(..., min_length=1)
    epistemic_status: Literal["forecast"] = Field(default="forecast")
    limitations: list[str] = Field(..., min_length=1)
    generated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )

    @model_validator(mode="after")
    def validate_epistemic_and_baseline_gate(self) -> ForecastRun:
        if self.epistemic_status != "forecast":
            raise EpistemicViolationError(
                f"Forecast epistemicStatus must be strictly 'forecast' (got '{self.epistemic_status}')"
            )

        if not math.isfinite(self.model_metric_value) or not math.isfinite(self.baseline_metric_value):
            raise ValueError("Backtest metrics must be finite numbers")

        # Gate de Salida Hito 5: En métricas de error (menor es mejor), el modelo debe batir al baseline
        margin = self.baseline_metric_value - self.model_metric_value
        if margin <= 0 or not self.beats_baseline:
            raise BaselineNotBeatenError(
                f"El modelo ({self.model_name}: {self.model_metric_value} {self.metric.value.upper()}) "
                f"no supera al baseline ({self.baseline_model}: {self.baseline_metric_value} {self.metric.value.upper()}). "
                "Gate de Salida Hito 5 incumplido: publicación rechazada."
            )

        return self


class ChunkLocatorType(str, Enum):
    PAGE = "page"
    TABLE = "table"
    ROW = "row"
    SELECTOR = "selector"
    FRAGMENT = "fragment"
    TIMECODE = "timecode"


class EvidenceStatus(str, Enum):
    DOCUMENTED = "documented"
    INFERRED = "inferred"
    DISPUTED = "disputed"
    HYPOTHESIS = "hypothesis"
    FORECAST = "forecast"
    UNKNOWN = "unknown"


class SourceType(str, Enum):
    PRIMARY_ARCHIVE = "primary_archive"
    OFFICIAL_STATISTICAL = "official_statistical"
    OFFICIAL_ADMINISTRATIVE = "official_administrative"
    ACADEMIC_RESEARCH = "academic_research"
    SECONDARY_HISTORIOGRAPHY = "secondary_historiography"
    PRESS = "press"
    TESTIMONY = "testimony"
    COMMUNITY_POST = "community_post"
    AI_OUTPUT = "ai_output"



class ChunkLocator(CamelModel):
    """Localizador exacto dentro de una fuente documental o estadística."""

    type: ChunkLocatorType = Field(default=ChunkLocatorType.PAGE)
    value: str = Field(..., min_length=1)

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: str) -> str:
        if not v or not v.strip():
            raise InvalidLocatorError("Chunk locator value cannot be empty")
        return v.strip()


class ChunkLicense(CamelModel):
    """Licencias desagregadas para un fragmento de evidencia."""

    software_license: str = Field(default="")
    dataset_license: str = Field(default="")
    item_rights: str = Field(..., min_length=1)
    redistribution_policy: str = Field(..., min_length=1)
    required_attribution: str = Field(..., min_length=1)

    @field_validator("item_rights", "redistribution_policy", "required_attribution")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("License fields (itemRights, redistributionPolicy, requiredAttribution) cannot be empty")
        return v.strip()


def compute_chunk_hash(text: str) -> str:
    """Calcula el hash SHA-256 canónico en minúsculas sobre el texto normalizado."""
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


class EvidenceChunk(CamelModel):
    """Fragmento textual verificable de evidencia con procedencia, hash y localizador."""

    id: str = Field(..., min_length=1)
    source_id: str = Field(..., min_length=1)
    source_name: str = Field(..., min_length=1)
    source_type: SourceType = Field(...)
    content_hash: str = Field(..., min_length=64, max_length=64)
    text: str = Field(..., min_length=1)
    locator: ChunkLocator = Field(...)
    epistemic_status: EvidenceStatus = Field(default=EvidenceStatus.DOCUMENTED)
    license: ChunkLicense = Field(...)
    retrieved_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    )

    @field_validator("content_hash")
    @classmethod
    def validate_content_hash(cls, v: str) -> str:
        if not SHA256_PATTERN.match(v):
            raise InvalidChunkError("Chunk content hash must be a valid 64-char hex SHA-256")
        return v

    @model_validator(mode="after")
    def validate_chunk_integrity(self) -> EvidenceChunk:
        if not self.id.strip():
            raise InvalidChunkError("Chunk ID cannot be empty")
        if not self.source_id.strip() or not self.source_name.strip():
            raise InvalidChunkError("Source identity is missing from chunk")
        if not self.text.strip():
            raise InvalidChunkError("Chunk text content cannot be empty")
        return self
