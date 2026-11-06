"""Pruebas de integración de extremo a extremo para el pipeline y CLI del Worker."""

import json
from pathlib import Path

import pytest

from worker.application.forecasters import DampedTrendForecaster, LinearTrendForecaster
from worker.application.pipeline import ForecastPipeline
from worker.cli import main
from worker.domain.exceptions import BaselineNotBeatenError
from worker.domain.models import BacktestMetric, Observation, SeriesVintage
from worker.infrastructure.sdmx_parser import compute_observations_sha256


@pytest.fixture
def bcentral_tpm_vintage() -> SeriesVintage:
    """Vintage completo de TPM 2024 con 8 observaciones (enero a agosto)."""
    data = [
        ("2024-01", 8.25),
        ("2024-02", 7.25),
        ("2024-03", 7.25),
        ("2024-04", 6.50),
        ("2024-05", 6.00),
        ("2024-06", 5.75),
        ("2024-07", 5.75),
        ("2024-08", 5.50),
    ]
    observations = [Observation(period=p, value=v, unit="%", locator=f"obs-{i:02d}") for i, (p, v) in enumerate(data, start=1)]
    content_hash = compute_observations_sha256(observations)

    return SeriesVintage(
        id="vintage-bcentral-tpm-2024-v2",
        series_id="bcentral-tpm",
        vintage_date="2024-08-15T00:00:00.000Z",
        coverage_start="2024-01",
        coverage_end="2024-08",
        observations=observations,
        content_hash=content_hash,
        publication_notes="Serie histórica verificada de TPM del Banco Central de Chile.",
    )


def test_forecast_pipeline_end_to_end(bcentral_tpm_vintage):
    pipeline = ForecastPipeline(metric=BacktestMetric.MAE)
    # Modelo de tendencia lineal amortiguada (Holt damped) adaptado a desaceleración de recortes
    model = DampedTrendForecaster(name="damped_trend_v1")

    forecast_run = pipeline.run(
        vintage=bcentral_tpm_vintage,
        candidate_forecaster=model,
        split_period="2024-05",
        forecast_horizon=3,
        frequency="monthly",
    )

    assert forecast_run.series_id == "bcentral-tpm"
    assert forecast_run.target_vintage_id == "vintage-bcentral-tpm-2024-v2"
    assert forecast_run.beats_baseline is True
    assert forecast_run.epistemic_status == "forecast"
    assert forecast_run.forecast_horizon == 3
    assert len(forecast_run.forecast_points) == 3

    # El modelo amortiguado capturó la desaceleración del ciclo de tasas mejor que persistencia ingenua
    assert forecast_run.model_metric_value < forecast_run.baseline_metric_value

    # Verificar intervalos ordenados y periodos correctos
    p1 = forecast_run.forecast_points[0]
    assert p1.period == "2024-09"
    assert p1.p10 <= p1.p50 <= p1.p90

    p3 = forecast_run.forecast_points[2]
    assert p3.period == "2024-11"
    assert p3.p10 <= p3.p50 <= p3.p90


def test_gate_rejects_linear_trend_when_it_fails_to_beat_baseline(bcentral_tpm_vintage):
    """Prueba negativa de Gate: Regresión lineal OLS sobreajusta a la baja y es rechazada por el gate."""
    pipeline = ForecastPipeline(metric=BacktestMetric.MAE)
    linear_model = LinearTrendForecaster(name="linear_trend_v1")

    # Debe fallar cerrado rechazando la emisión del pronóstico
    with pytest.raises(BaselineNotBeatenError) as exc_info:
        pipeline.run(
            vintage=bcentral_tpm_vintage,
            candidate_forecaster=linear_model,
            split_period="2024-05",
            forecast_horizon=3,
        )

    assert "Gate de Salida Hito 5 rechazado" in str(exc_info.value)
    assert "no supera a naive_persistence" in str(exc_info.value)


def test_forecast_run_json_compatibility_with_openapi(bcentral_tpm_vintage):
    pipeline = ForecastPipeline(metric=BacktestMetric.MAE)
    model = DampedTrendForecaster(name="damped_trend_v1")

    forecast_run = pipeline.run(
        vintage=bcentral_tpm_vintage,
        candidate_forecaster=model,
        split_period="2024-05",
        forecast_horizon=2,
    )

    # Serializar con alias camelCase exactos para compatibilidad con la API TypeScript
    serialized = forecast_run.model_dump(by_alias=True)
    json_str = forecast_run.model_dump_json(by_alias=True)
    deserialized = json.loads(json_str)

    required_keys = [
        "id",
        "seriesId",
        "targetVintageId",
        "modelName",
        "baselineModel",
        "splitPeriod",
        "metric",
        "modelMetricValue",
        "baselineMetricValue",
        "beatsBaseline",
        "forecastHorizon",
        "forecastPoints",
        "epistemicStatus",
        "limitations",
        "generatedAt",
    ]

    for key in required_keys:
        assert key in serialized, f"Falta clave obligatoria {key} en el contrato JSON de ForecastRun"
        assert key in deserialized

    assert serialized["epistemicStatus"] == "forecast"
    assert serialized["beatsBaseline"] is True
    assert len(serialized["forecastPoints"]) == 2
    assert "p10" in serialized["forecastPoints"][0]
    assert "p50" in serialized["forecastPoints"][0]
    assert "p90" in serialized["forecastPoints"][0]


def test_cli_end_to_end(bcentral_tpm_vintage, tmp_path, monkeypatch):
    # Guardar el vintage como archivo JSON temporal
    vintage_file = tmp_path / "tpm_vintage.json"
    vintage_file.write_text(bcentral_tpm_vintage.model_dump_json(by_alias=True), encoding="utf-8")

    output_file = tmp_path / "tpm_forecast_output.json"

    # Simular argumentos CLI con damped_trend
    test_args = [
        "worker",
        "run-forecast",
        "--input-file",
        str(vintage_file),
        "--split-period",
        "2024-05",
        "--horizon",
        "3",
        "--model",
        "damped_trend",
        "--metric",
        "mae",
        "--output-file",
        str(output_file),
    ]

    monkeypatch.setattr("sys.argv", test_args)
    exit_code = main()

    assert exit_code == 0
    assert output_file.exists()

    output_data = json.loads(output_file.read_text(encoding="utf-8"))
    assert output_data["seriesId"] == "bcentral-tpm"
    assert output_data["beatsBaseline"] is True
    assert output_data["epistemicStatus"] == "forecast"
    assert len(output_data["forecastPoints"]) == 3
