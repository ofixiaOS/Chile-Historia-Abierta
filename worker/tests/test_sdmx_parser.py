"""Pruebas unitarias para el parser de mensajes SDMX-JSON 2.1."""

import json
import pytest

from worker.domain.exceptions import ObservationValidationError
from worker.domain.models import ObservationStatus
from worker.infrastructure.sdmx_parser import parse_sdmx_json


@pytest.fixture
def sample_sdmx_json() -> dict:
    return {
        "meta": {
            "schema": "https://raw.githubusercontent.com/sdmx-twg/sdmx-json/master/data-message/tools/schemas/2.0.0/sdmx-json-data-schema.json",
            "id": "SDMX_BCENTRAL_TPM_VINTAGE_2024",
            "prepared": "2024-08-15T00:00:00.000Z",
            "sender": {"id": "CL_HISTORIA_ABIERTA", "name": "Chile Historia Abierta"},
        },
        "data": {
            "dataSets": [
                {
                    "action": "Information",
                    "series": {
                        "0": {
                            "attributes": [0],
                            "observations": {
                                "0": [8.25, 0],
                                "1": [7.25, 0],
                                "2": [6.50, 0],
                                "3": [5.50, 1],  # 1 = provisional
                            },
                        }
                    },
                }
            ],
            "structure": {
                "name": "Tasa de Política Monetaria (TPM)",
                "dimensions": {
                    "series": [
                        {
                            "id": "SERIES_ID",
                            "name": "Series Identifier",
                            "values": [{"id": "bcentral-tpm", "name": "TPM"}],
                        }
                    ],
                    "observation": [
                        {
                            "id": "TIME_PERIOD",
                            "name": "Time Period",
                            "values": [
                                {"id": "2024-01", "name": "2024-01"},
                                {"id": "2024-02", "name": "2024-02"},
                                {"id": "2024-03", "name": "2024-03"},
                                {"id": "2024-04", "name": "2024-04"},
                            ],
                        }
                    ],
                },
                "attributes": {
                    "series": [],
                    "observation": [
                        {
                            "id": "OBS_STATUS",
                            "name": "Observation Status",
                            "values": [
                                {"id": "normal", "name": "Normal"},
                                {"id": "provisional", "name": "Provisional"},
                            ],
                        }
                    ],
                },
            },
        },
    }


def test_parse_sdmx_json_valid(sample_sdmx_json):
    vintage = parse_sdmx_json(sample_sdmx_json, default_unit="%")

    assert vintage.series_id == "bcentral-tpm"
    assert vintage.coverage_start == "2024-01"
    assert vintage.coverage_end == "2024-04"
    assert len(vintage.observations) == 4

    obs0 = vintage.observations[0]
    assert obs0.period == "2024-01"
    assert obs0.value == 8.25
    assert obs0.status == ObservationStatus.NORMAL

    obs3 = vintage.observations[3]
    assert obs3.period == "2024-04"
    assert obs3.value == 5.50
    assert obs3.status == ObservationStatus.PROVISIONAL

    assert len(vintage.content_hash) == 64


def test_parse_sdmx_json_string_input(sample_sdmx_json):
    raw_str = json.dumps(sample_sdmx_json)
    vintage = parse_sdmx_json(raw_str)
    assert vintage.series_id == "bcentral-tpm"


def test_parse_sdmx_json_rejects_empty_datasets():
    with pytest.raises(ObservationValidationError):
        parse_sdmx_json({"data": {"dataSets": []}})
