"""Motor de evaluación y backtesting retrospectivo con partición temporal."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

import numpy as np

from worker.application.forecasters import Forecaster, NaivePersistenceForecaster
from worker.domain.exceptions import (
    BaselineNotBeatenError,
    InsufficientObservationsError,
    InvalidPeriodError,
)
from worker.domain.models import BacktestMetric, Observation


def compute_mae(actuals: Sequence[float], predictions: Sequence[float]) -> float:
    """Calcula el Error Absoluto Medio (MAE)."""
    if len(actuals) == 0 or len(actuals) != len(predictions):
        raise ValueError("Actuals and predictions must be non-empty and have identical length")
    err = np.abs(np.array(actuals, dtype=float) - np.array(predictions, dtype=float))
    return round(float(np.mean(err)), 4)


def compute_rmse(actuals: Sequence[float], predictions: Sequence[float]) -> float:
    """Calcula la Raíz del Error Cuadrático Medio (RMSE)."""
    if len(actuals) == 0 or len(actuals) != len(predictions):
        raise ValueError("Actuals and predictions must be non-empty and have identical length")
    err = (np.array(actuals, dtype=float) - np.array(predictions, dtype=float)) ** 2
    return round(float(math.sqrt(np.mean(err))), 4)


def compute_mape(actuals: Sequence[float], predictions: Sequence[float]) -> float:
    """Calcula el Error Porcentual Absoluto Medio (MAPE)."""
    if len(actuals) == 0 or len(actuals) != len(predictions):
        raise ValueError("Actuals and predictions must be non-empty and have identical length")
    y = np.array(actuals, dtype=float)
    y_hat = np.array(predictions, dtype=float)
    # Evitar división por cero
    denom = np.where(np.abs(y) < 1e-6, 1e-6, y)
    err = np.abs((y - y_hat) / denom) * 100.0
    return round(float(np.mean(err)), 4)


def compute_metric(metric: BacktestMetric, actuals: Sequence[float], predictions: Sequence[float]) -> float:
    if metric == BacktestMetric.MAE:
        return compute_mae(actuals, predictions)
    elif metric == BacktestMetric.RMSE:
        return compute_rmse(actuals, predictions)
    elif metric == BacktestMetric.MAPE:
        return compute_mape(actuals, predictions)
    raise ValueError(f"Unsupported metric {metric}")


def split_time_series(
    observations: Sequence[Observation], split_period: str
) -> tuple[list[Observation], list[Observation]]:
    """Divide las observaciones cronológicas en tramo de entrenamiento (<= split) y prueba (> split)."""
    train = [obs for obs in observations if obs.period <= split_period]
    test = [obs for obs in observations if obs.period > split_period]

    if not train:
        raise InvalidPeriodError(f"Split period '{split_period}' deja el conjunto de entrenamiento vacío")
    if not test:
        raise InvalidPeriodError(f"Split period '{split_period}' deja el conjunto de prueba fuera de muestra vacío")

    return train, test


@dataclass(frozen=True)
class BacktestResult:
    """Resultado determinista del backtesting retrospectivo."""

    model_name: str
    baseline_model: str
    split_period: str
    metric: BacktestMetric
    model_metric_value: float
    baseline_metric_value: float
    beats_baseline: bool
    margin: float
    test_actuals: list[float]
    test_predictions: list[float]


class BacktestEngine:
    """Motor de validación out-of-sample y forzamiento del Gate de Salida del Hito 5."""

    def __init__(self, metric: BacktestMetric = BacktestMetric.MAE):
        self.metric = metric

    def evaluate(
        self,
        observations: Sequence[Observation],
        split_period: str,
        candidate_forecaster: Forecaster,
        baseline_forecaster: Forecaster | None = None,
    ) -> BacktestResult:
        """Ejecuta backtesting retrospectivo y evalúa si el candidato supera al baseline."""
        train, test = split_time_series(observations, split_period)

        if len(test) < 1:
            raise InsufficientObservationsError("Test set must have at least 1 observation for evaluation")

        if baseline_forecaster is None:
            baseline_forecaster = NaivePersistenceForecaster()

        # Ajustar ambos modelos exclusivamente sobre el conjunto de entrenamiento
        candidate_forecaster.fit(train)
        baseline_forecaster.fit(train)

        horizon = len(test)
        cand_preds = candidate_forecaster.predict(horizon)
        base_preds = baseline_forecaster.predict(horizon)

        actuals = [obs.value for obs in test]

        model_error = compute_metric(self.metric, actuals, cand_preds)
        base_error = compute_metric(self.metric, actuals, base_preds)

        # En métricas de error, menor es mejor
        margin = round(base_error - model_error, 4)
        beats_baseline = margin > 0

        return BacktestResult(
            model_name=candidate_forecaster.name,
            baseline_model=baseline_forecaster.name,
            split_period=split_period,
            metric=self.metric,
            model_metric_value=model_error,
            baseline_metric_value=base_error,
            beats_baseline=beats_baseline,
            margin=margin,
            test_actuals=actuals,
            test_predictions=cand_preds,
        )

    def assert_beats_baseline(self, result: BacktestResult) -> None:
        """Lanza BaselineNotBeatenError si el resultado no cumple el gate de salida."""
        if not result.beats_baseline or result.margin <= 0:
            raise BaselineNotBeatenError(
                f"Gate de Salida Hito 5 rechazado: {result.model_name} "
                f"({result.model_metric_value} {result.metric.value.upper()}) "
                f"no supera a {result.baseline_model} "
                f"({result.baseline_metric_value} {result.metric.value.upper()}) "
                f"en split {result.split_period}."
            )
