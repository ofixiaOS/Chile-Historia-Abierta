"""Pruebas unitarias para el motor de backtesting y verificación de Gate del Hito 5."""

import pytest

from worker.application.backtest_engine import (
    BacktestEngine,
    compute_mae,
    compute_mape,
    compute_rmse,
    split_time_series,
)
from worker.application.forecasters import Forecaster, NaivePersistenceForecaster
from worker.domain.exceptions import BaselineNotBeatenError, InvalidPeriodError
from worker.domain.models import BacktestMetric, ForecastIntervalPoint, Observation


class MockBadForecaster(Forecaster):
    """Modelo deliberadamente deficiente para probar rechazo de gate."""

    def __init__(self, fixed_pred: float = 100.0):
        super().__init__("mock_bad_forecaster")
        self.fixed_pred = fixed_pred

    def fit(self, observations):
        self.is_fitted = True

    def predict(self, horizon: int) -> list[float]:
        return [self.fixed_pred] * horizon

    def predict_with_intervals(self, last_period: str, horizon: int, frequency: str = "monthly"):
        return [ForecastIntervalPoint(period="9999", p10=90.0, p50=100.0, p90=110.0)] * horizon


@pytest.fixture
def tpm_series() -> list[Observation]:
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


def test_metric_computations():
    actuals = [10.0, 12.0, 14.0]
    preds = [11.0, 11.0, 16.0]

    # Errores: |10-11|=1, |12-11|=1, |14-16|=2. MAE = 4/3 = 1.3333
    mae = compute_mae(actuals, preds)
    assert mae == 1.3333

    # Errores^2: 1, 1, 4. Media = 2. RMSE = sqrt(2) = 1.4142
    rmse = compute_rmse(actuals, preds)
    assert rmse == 1.4142

    mape = compute_mape(actuals, preds)
    assert mape > 0


def test_metric_computations_reject_mismatched_lengths():
    with pytest.raises(ValueError):
        compute_mae([1.0, 2.0], [1.0])


def test_split_time_series(tpm_series):
    train, test = split_time_series(tpm_series, "2024-05")
    assert len(train) == 5
    assert train[-1].period == "2024-05"
    assert len(test) == 3
    assert test[0].period == "2024-06"
    assert test[-1].period == "2024-08"


def test_split_time_series_rejects_empty_train_or_test(tpm_series):
    # Split anterior al primer dato
    with pytest.raises(InvalidPeriodError):
        split_time_series(tpm_series, "2023-12")

    # Split posterior al último dato
    with pytest.raises(InvalidPeriodError):
        split_time_series(tpm_series, "2024-08")


def test_backtest_gate_rejects_inferior_model(tpm_series):
    engine = BacktestEngine(metric=BacktestMetric.MAE)
    bad_model = MockBadForecaster(fixed_pred=25.0)  # valor absurdo lejano a ~5.75%
    baseline = NaivePersistenceForecaster()

    result = engine.evaluate(
        observations=tpm_series,
        split_period="2024-05",
        candidate_forecaster=bad_model,
        baseline_forecaster=baseline,
    )

    assert result.beats_baseline is False
    assert result.margin < 0

    with pytest.raises(BaselineNotBeatenError) as exc_info:
        engine.assert_beats_baseline(result)

    assert "Gate de Salida Hito 5 rechazado" in str(exc_info.value)
