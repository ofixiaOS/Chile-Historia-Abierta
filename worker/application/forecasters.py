"""Modelos de pronóstico econométrico para series temporales."""

from __future__ import annotations

import math
from abc import ABC, abstractmethod
from typing import Sequence

import numpy as np

from worker.domain.exceptions import InsufficientObservationsError, IntervalInversionError
from worker.domain.models import ForecastIntervalPoint, Observation


def generate_future_periods(last_period: str, horizon: int, frequency: str = "monthly") -> list[str]:
    """Genera periodos futuros secuenciales a partir del último periodo observado."""
    periods: list[str] = []

    if frequency == "monthly" or ("-" in last_period and len(last_period.split("-")[1]) == 2):
        parts = last_period.split("-")
        year = int(parts[0])
        month = int(parts[1])

        for _ in range(horizon):
            month += 1
            if month > 12:
                month = 1
                year += 1
            periods.append(f"{year:04d}-{month:02d}")
    elif frequency == "annual" or (last_period.isdigit() and len(last_period) == 4):
        year = int(last_period)
        for _ in range(horizon):
            year += 1
            periods.append(f"{year:04d}")
    else:
        # Fallback para periodos indexados
        for i in range(1, horizon + 1):
            periods.append(f"{last_period}+h{i}")

    return periods


class Forecaster(ABC):
    """Interfaz base para modelos de pronóstico."""

    def __init__(self, name: str):
        self.name = name
        self.is_fitted = False

    @abstractmethod
    def fit(self, observations: Sequence[Observation]) -> None:
        """Ajusta el modelo a la serie histórica."""
        pass

    @abstractmethod
    def predict(self, horizon: int) -> list[float]:
        """Produce predicciones puntuales para un horizonte h."""
        pass

    @abstractmethod
    def predict_with_intervals(
        self, last_period: str, horizon: int, frequency: str = "monthly"
    ) -> list[ForecastIntervalPoint]:
        """Produce puntos proyectados con intervalos de incertidumbre p10 <= p50 <= p90."""
        pass


class NaivePersistenceForecaster(Forecaster):
    """Baseline canónico de persistencia ingenua (último valor observado)."""

    def __init__(self, name: str = "naive_persistence"):
        super().__init__(name)
        self.last_value: float = 0.0
        self.residual_std: float = 0.1

    def fit(self, observations: Sequence[Observation]) -> None:
        if len(observations) < 2:
            raise InsufficientObservationsError("Naive forecaster requires at least 2 observations to compute residual variance")

        values = [obs.value for obs in observations]
        self.last_value = float(values[-1])

        # Varianza de las diferencias primeras para la incertidumbre acumulativa
        diffs = np.diff(values)
        std = float(np.std(diffs, ddof=1)) if len(diffs) > 1 else 0.1
        self.residual_std = max(std, 0.01)
        self.is_fitted = True

    def predict(self, horizon: int) -> list[float]:
        if not self.is_fitted:
            raise ValueError("Forecaster must be fitted before predict")
        return [round(self.last_value, 4) for _ in range(horizon)]

    def predict_with_intervals(
        self, last_period: str, horizon: int, frequency: str = "monthly"
    ) -> list[ForecastIntervalPoint]:
        if not self.is_fitted:
            raise ValueError("Forecaster must be fitted before predict_with_intervals")

        periods = generate_future_periods(last_period, horizon, frequency)
        points: list[ForecastIntervalPoint] = []

        # z-score para 80% de confianza (P10 y P90): ~1.28155
        z_80 = 1.28155

        for step, period in enumerate(periods, start=1):
            p50 = round(self.last_value, 4)
            # La incertidumbre de random walk crece con sqrt(step)
            margin = z_80 * self.residual_std * math.sqrt(step)
            p10 = round(p50 - margin, 4)
            p90 = round(p50 + margin, 4)

            # Invariante p10 <= p50 <= p90
            if p10 > p50 or p50 > p90:
                raise IntervalInversionError(f"Interval inversion in naive forecaster at step {step}")

            points.append(ForecastIntervalPoint(period=period, p10=p10, p50=p50, p90=p90))

        return points


class DampedTrendForecaster(Forecaster):
    """Modelo econométrico de tendencia lineal amortiguada (Gardner-McKenzie / Holt damped)."""

    def __init__(
        self,
        name: str = "damped_trend_v1",
        alpha: float = 0.6,
        beta: float = 0.1,
        phi: float = 0.8,
    ):
        super().__init__(name)
        self.alpha = alpha
        self.beta = beta
        self.phi = phi
        self.level: float = 0.0
        self.trend: float = 0.0
        self.residual_variance: float = 0.01

    def fit(self, observations: Sequence[Observation]) -> None:
        n = len(observations)
        if n < 4:
            raise InsufficientObservationsError("Damped trend forecaster requires at least 4 observations")

        values = np.array([obs.value for obs in observations], dtype=float)

        # Inicialización de nivel y tendencia
        self.level = float(values[0])
        self.trend = float(values[1] - values[0])

        levels = [self.level]
        trends = [self.trend]
        fitted = [self.level]

        # Ajuste iterativo
        curr_l = self.level
        curr_b = self.trend

        for t in range(1, n):
            y_t = values[t]
            prev_l = curr_l
            prev_b = curr_b

            curr_l = self.alpha * y_t + (1.0 - self.alpha) * (prev_l + self.phi * prev_b)
            curr_b = self.beta * (curr_l - prev_l) + (1.0 - self.beta) * self.phi * prev_b

            levels.append(curr_l)
            trends.append(curr_b)
            fitted.append(prev_l + self.phi * prev_b)

        self.level = curr_l
        self.trend = curr_b

        # Varianza residual de los errores de un paso
        residuals = values[1:] - np.array(fitted[1:])
        var = float(np.var(residuals, ddof=1)) if len(residuals) > 1 else 0.01
        self.residual_variance = max(var, 0.001)
        self.is_fitted = True

    def predict(self, horizon: int) -> list[float]:
        if not self.is_fitted:
            raise ValueError("Forecaster must be fitted before predict")

        predictions: list[float] = []
        l = self.level
        b = self.trend

        for h in range(1, horizon + 1):
            # Suma de potencias amortiguadas phi + phi^2 + ... + phi^h
            damped_sum = sum(self.phi**i for i in range(1, h + 1))
            y_hat = l + damped_sum * b
            predictions.append(round(float(y_hat), 4))

        return predictions

    def predict_with_intervals(
        self, last_period: str, horizon: int, frequency: str = "monthly"
    ) -> list[ForecastIntervalPoint]:
        if not self.is_fitted:
            raise ValueError("Forecaster must be fitted before predict_with_intervals")

        periods = generate_future_periods(last_period, horizon, frequency)
        p50_values = self.predict(horizon)
        points: list[ForecastIntervalPoint] = []

        std = math.sqrt(self.residual_variance)
        z_80 = 1.28155

        for h, (period, p50) in enumerate(zip(periods, p50_values), start=1):
            # Factor de inflación de varianza por acumulación de incertidumbre en tendencia
            damped_factor = 1.0 + (h - 1) * (self.phi ** (h // 2)) * 0.2
            margin = round(z_80 * std * math.sqrt(damped_factor), 4)

            p10 = round(p50 - margin, 4)
            p90 = round(p50 + margin, 4)

            if p10 > p50 or p50 > p90:
                raise IntervalInversionError(f"Interval inversion in damped trend at step {h}")

            points.append(ForecastIntervalPoint(period=period, p10=p10, p50=p50, p90=p90))

        return points


class LinearTrendForecaster(Forecaster):
    """Modelo econométrico de regresión lineal OLS sobre índice temporal."""

    def __init__(self, name: str = "linear_trend_v1"):
        super().__init__(name)
        self.slope: float = 0.0
        self.intercept: float = 0.0
        self.n_obs: int = 0
        self.residual_std: float = 0.1

    def fit(self, observations: Sequence[Observation]) -> None:
        if len(observations) < 3:
            raise InsufficientObservationsError("Linear trend forecaster requires at least 3 observations")

        y = np.array([obs.value for obs in observations], dtype=float)
        self.n_obs = len(y)
        x = np.arange(self.n_obs, dtype=float)

        # OLS regression
        A = np.vstack([x, np.ones(self.n_obs)]).T
        slope, intercept = np.linalg.lstsq(A, y, rcond=None)[0]
        self.slope = float(slope)
        self.intercept = float(intercept)

        fitted = self.slope * x + self.intercept
        residuals = y - fitted
        std = float(np.std(residuals, ddof=2)) if self.n_obs > 2 else 0.1
        self.residual_std = max(std, 0.01)
        self.is_fitted = True

    def predict(self, horizon: int) -> list[float]:
        if not self.is_fitted:
            raise ValueError("Forecaster must be fitted before predict")

        predictions: list[float] = []
        for h in range(horizon):
            future_x = self.n_obs + h
            y_hat = self.slope * future_x + self.intercept
            predictions.append(round(float(y_hat), 4))

        return predictions

    def predict_with_intervals(
        self, last_period: str, horizon: int, frequency: str = "monthly"
    ) -> list[ForecastIntervalPoint]:
        if not self.is_fitted:
            raise ValueError("Forecaster must be fitted before predict_with_intervals")

        periods = generate_future_periods(last_period, horizon, frequency)
        p50_values = self.predict(horizon)
        points: list[ForecastIntervalPoint] = []
        z_80 = 1.28155

        for h, (period, p50) in enumerate(zip(periods, p50_values), start=1):
            margin = round(z_80 * self.residual_std * math.sqrt(1.0 + h * 0.15), 4)
            p10 = round(p50 - margin, 4)
            p90 = round(p50 + margin, 4)

            if p10 > p50 or p50 > p90:
                raise IntervalInversionError(f"Interval inversion in linear trend at step {h}")

            points.append(ForecastIntervalPoint(period=period, p10=p10, p50=p50, p90=p90))

        return points
