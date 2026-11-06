"""Pruebas unitarias de modelos de dominio e invariantes epistemológicos."""

import pytest
from pydantic import ValidationError

from worker.domain.exceptions import (
    BaselineNotBeatenError,
    EpistemicViolationError,
    IntervalInversionError,
    ObservationValidationError,
)
from worker.domain.models import (
    BacktestMetric,
    ForecastIntervalPoint,
    ForecastRun,
    Observation,
    ObservationStatus,
    SeriesVintage,
)


def test_forecast_interval_point_valid():
    pt = ForecastIntervalPoint(period="2024-09", p10=5.1, p50=5.3, p90=5.5)
    assert pt.period == "2024-09"
    assert pt.p10 == 5.1
    assert pt.p50 == 5.3
    assert pt.p90 == 5.5


def test_forecast_interval_point_rejects_inversion_p10_greater_than_p50():
    with pytest.raises(IntervalInversionError):
        ForecastIntervalPoint(period="2024-09", p10=5.6, p50=5.3, p90=5.5)


def test_forecast_interval_point_rejects_inversion_p50_greater_than_p90():
    with pytest.raises(IntervalInversionError):
        ForecastIntervalPoint(period="2024-09", p10=5.1, p50=5.8, p90=5.5)


def test_forecast_interval_point_rejects_non_finite_values():
    with pytest.raises(IntervalInversionError):
        ForecastIntervalPoint(period="2024-09", p10=float("nan"), p50=5.3, p90=5.5)


def test_forecast_run_valid_and_serializes_camel_case():
    points = [
        ForecastIntervalPoint(period="2024-09", p10=5.15, p50=5.35, p90=5.55),
        ForecastIntervalPoint(period="2024-10", p10=4.95, p50=5.20, p90=5.45),
    ]

    run = ForecastRun(
        id="forecast-tpm-01",
        series_id="bcentral-tpm",
        target_vintage_id="vintage-01",
        model_name="damped_trend_v1",
        baseline_model="naive_persistence",
        split_period="2024-05",
        metric=BacktestMetric.MAE,
        model_metric_value=0.18,
        baseline_metric_value=0.35,
        beats_baseline=True,
        forecast_horizon=2,
        forecast_points=points,
        epistemic_status="forecast",
        limitations=["Evaluación de prueba."],
    )

    assert run.beats_baseline is True
    assert run.epistemic_status == "forecast"

    data = run.model_dump(by_alias=True)
    assert "seriesId" in data
    assert "targetVintageId" in data
    assert "modelName" in data
    assert "baselineModel" in data
    assert "modelMetricValue" in data
    assert "baselineMetricValue" in data
    assert "beatsBaseline" in data
    assert "forecastPoints" in data
    assert "epistemicStatus" in data
    assert data["seriesId"] == "bcentral-tpm"


def test_forecast_run_rejects_model_worse_than_baseline():
    points = [ForecastIntervalPoint(period="2024-09", p10=5.0, p50=5.3, p90=5.6)]

    # Modelo con error 0.40 mayor que baseline 0.35
    with pytest.raises(BaselineNotBeatenError):
        ForecastRun(
            id="forecast-tpm-bad",
            series_id="bcentral-tpm",
            target_vintage_id="vintage-01",
            model_name="bad_model",
            baseline_model="naive_persistence",
            split_period="2024-05",
            metric=BacktestMetric.MAE,
            model_metric_value=0.40,
            baseline_metric_value=0.35,
            beats_baseline=True,  # contradictorio con los valores
            forecast_horizon=1,
            forecast_points=points,
            epistemic_status="forecast",
            limitations=["Limitación."],
        )


def test_forecast_run_rejects_beats_baseline_false():
    points = [ForecastIntervalPoint(period="2024-09", p10=5.0, p50=5.3, p90=5.6)]

    with pytest.raises(BaselineNotBeatenError):
        ForecastRun(
            id="forecast-tpm-bad",
            series_id="bcentral-tpm",
            target_vintage_id="vintage-01",
            model_name="bad_model",
            baseline_model="naive_persistence",
            split_period="2024-05",
            metric=BacktestMetric.MAE,
            model_metric_value=0.20,
            baseline_metric_value=0.35,
            beats_baseline=False,
            forecast_horizon=1,
            forecast_points=points,
            epistemic_status="forecast",
            limitations=["Limitación."],
        )


def test_observation_validation():
    obs = Observation(period="2024-01", value=8.25, status=ObservationStatus.NORMAL, unit="%")
    assert obs.value == 8.25

    with pytest.raises(ObservationValidationError):
        Observation(period="2024-01", value=float("inf"), status=ObservationStatus.NORMAL, unit="%")


def test_series_vintage_validation():
    obs = [Observation(period="2024-01", value=8.25, unit="%")]
    valid_hash = "a" * 64

    vintage = SeriesVintage(
        id="vintage-01",
        series_id="bcentral-tpm",
        vintage_date="2024-08-15T00:00:00Z",
        coverage_start="2024-01",
        coverage_end="2024-01",
        observations=obs,
        content_hash=valid_hash,
    )
    assert vintage.content_hash == valid_hash

    with pytest.raises(ValidationError):
        SeriesVintage(
            id="vintage-01",
            series_id="bcentral-tpm",
            vintage_date="2024-08-15T00:00:00Z",
            coverage_start="2024-01",
            coverage_end="2024-01",
            observations=obs,
            content_hash="short-hash",
        )
