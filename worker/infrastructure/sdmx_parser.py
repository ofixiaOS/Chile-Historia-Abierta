"""Parser de mensajes SDMX-JSON 2.1 para ingesta canónica de SeriesVintage."""

from __future__ import annotations

import hashlib
import json
from typing import Any

from worker.domain.exceptions import ObservationValidationError
from worker.domain.models import Observation, ObservationStatus, SeriesVintage


STATUS_INDEX_REVERSE = {
    0: ObservationStatus.NORMAL,
    1: ObservationStatus.PROVISIONAL,
    2: ObservationStatus.REVISED,
    3: ObservationStatus.ESTIMATED,
    4: ObservationStatus.IMPUTED,
}


def compute_observations_sha256(observations: list[Observation]) -> str:
    """Calcula el hash SHA-256 canónico determinista de una lista de observaciones."""
    normalized_list = [
        {"period": obs.period, "value": obs.value, "status": obs.status.value, "unit": obs.unit}
        for obs in observations
    ]
    serialized = json.dumps(normalized_list, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def parse_sdmx_json(sdmx_payload: str | dict[str, Any], default_unit: str = "%") -> SeriesVintage:
    """Parsea un mensaje SDMX-JSON 2.1 conforme al estándar y genera un SeriesVintage."""
    if isinstance(sdmx_payload, str):
        data = json.loads(sdmx_payload)
    else:
        data = sdmx_payload

    meta = data.get("meta", {})
    body = data.get("data", {})
    structure = body.get("structure", {})
    datasets = body.get("dataSets", [])

    if not datasets:
        raise ObservationValidationError("SDMX-JSON must contain at least one dataSet")

    series_block = datasets[0].get("series", {}).get("0", {})
    obs_dict = series_block.get("observations", {})

    # Extraer dimensiones de periodos temporales
    obs_dimensions = structure.get("dimensions", {}).get("observation", [])
    time_values: list[dict[str, str]] = []
    for dim in obs_dimensions:
        if dim.get("id") == "TIME_PERIOD":
            time_values = dim.get("values", [])
            break

    # Extraer ID de la serie
    series_id = "unknown-series"
    series_dimensions = structure.get("dimensions", {}).get("series", [])
    for s_dim in series_dimensions:
        if s_dim.get("id") == "SERIES_ID" and s_dim.get("values"):
            series_id = s_dim["values"][0].get("id", series_id)
            break

    # Reconstruir observaciones ordenadas
    observations: list[Observation] = []
    for i in range(len(time_values)):
        key = str(i)
        if key in obs_dict:
            raw_val, status_idx = obs_dict[key]
            period = time_values[i].get("id", "")
            status = STATUS_INDEX_REVERSE.get(status_idx, ObservationStatus.NORMAL)

            observations.append(
                Observation(
                    period=period,
                    value=float(raw_val),
                    status=status,
                    unit=default_unit,
                    locator=f"obs-{i:02d}",
                )
            )

    if not observations:
        raise ObservationValidationError(f"No valid observations found in SDMX message for series {series_id}")

    vintage_date = meta.get("prepared", "2026-09-22T00:00:00.000Z")
    coverage_start = observations[0].period
    coverage_end = observations[-1].period
    vintage_id = f"vintage-{series_id}-{coverage_end}"

    content_hash = compute_observations_sha256(observations)

    return SeriesVintage(
        id=vintage_id,
        series_id=series_id,
        vintage_date=vintage_date,
        coverage_start=coverage_start,
        coverage_end=coverage_end,
        observations=observations,
        content_hash=content_hash,
        publication_notes=f"Ingerido desde SDMX-JSON 2.1 ({meta.get('id', '')})",
    )
