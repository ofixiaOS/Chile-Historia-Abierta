"""Pruebas unitarias para algoritmos de pronóstico y estimación de intervalos."""

import pytest

from worker.application.forecasters import (
    DampedTrendForecaster,
    LinearTrendForecaster,
    NaivePersistenceForecaster,
    generate_future_periods,
)
from worker.domain.exceptions import InsufficientObservationsError
from worker.domain.models import Observation


@pytest.fixture
def tpm_sample_observations() -> list[Observation]:
    """Serie de TPM en descenso durante 2024."""
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
    return [Observation(period=p, value=v, unit="%") for p, v in data]


def test_generate_future_periods_monthly():
    periods = generate_future_periods("2024-11", horizon=3, frequency="monthly")
    assert periods == ["2024-12", "2025-01", "2025-02"]


def test_generate_future_periods_annual():
    periods = generate_future_periods("2023", horizon=3, frequency="annual")
    assert periods == ["2024", "2025", "2026"]


def test_naive_forecaster(tpm_sample_observations):
    model = NaivePersistenceForecaster()
    model.fit(tpm_sample_observations)

    preds = model.predict(horizon=3)
    assert len(preds) == 3
    # Debe ser igual al último valor observado (5.50)
    assert all(p == 5.50 for p in preds)

    points = model.predict_with_intervals("2024-08", horizon=3)
    assert len(points) == 3
    assert points[0].period == "2024-09"
    assert points[0].p50 == 5.50
    assert points[0].p10 < points[0].p50 < points[0].p90

    # La incertidumbre crece con el horizonte
    margin_1 = points[0].p90 - points[0].p10
    margin_3 = points[2].p90 - points[2].p10
    assert margin_3 > margin_1


def test_naive_forecaster_rejects_insufficient_observations():
    model = NaivePersistenceForecaster()
    with pytest.raises(InsufficientObservationsError):
        model.fit([Observation(period="2024-01", value=8.25, unit="%")])


def test_damped_trend_forecaster(tpm_sample_observations):
    model = DampedTrendForecaster()
    model.fit(tpm_sample_observations)

    preds = model.predict(horizon=3)
    assert len(preds) == 3
    # Dado que la serie es descendente, los pronósticos deben continuar la tendencia decreciente
    assert preds[0] <= 5.50
    assert preds[1] <= preds[0]
    assert preds[2] <= preds[1]

    points = model.predict_with_intervals("2024-08", horizon=3)
    assert len(points) == 3
    for pt in points:
        assert pt.p10 <= pt.p50 <= pt.p90


def test_damped_trend_rejects_insufficient_observations():
    model = DampedTrendForecaster()
    with pytest.raises(InsufficientObservationsError):
        model.fit([
            Observation(period="2024-01", value=8.25, unit="%"),
            Observation(period="2024-02", value=7.25, unit="%"),
        ])


def test_linear_trend_forecaster(tpm_sample_observations):
    model = LinearTrendForecaster()
    model.fit(tpm_sample_observations)

    preds = model.predict(horizon=2)
    assert len(preds) == 2
    # Pendiente negativa
    assert preds[1] < preds[0]

    points = model.predict_with_intervals("2024-08", horizon=2)
    assert len(points) == 2
    for pt in points:
        assert pt.p10 <= pt.p50 <= pt.p90
