"""Pipeline orquestador para la ejecución de modelos econométricos y emisión de ForecastRun."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Sequence

from worker.application.backtest_engine import BacktestEngine
from worker.application.forecasters import Forecaster, NaivePersistenceForecaster
from worker.domain.models import (
    BacktestMetric,
    ForecastIntervalPoint,
    ForecastRun,
    SeriesVintage,
)


class ForecastPipeline:
    """Orquestador integral: split temporal -> backtesting -> gate -> proyección futura -> ForecastRun."""

    def __init__(self, metric: BacktestMetric = BacktestMetric.MAE):
        self.metric = metric
        self.engine = BacktestEngine(metric=metric)

    def run(
        self,
        vintage: SeriesVintage,
        candidate_forecaster: Forecaster,
        split_period: str,
        forecast_horizon: int,
        baseline_forecaster: Forecaster | None = None,
        frequency: str = "monthly",
        limitations: Sequence[str] | None = None,
        run_id: str | None = None,
    ) -> ForecastRun:
        """Ejecuta el ciclo de vida completo del pronóstico bajo las reglas de evidencia."""
        if baseline_forecaster is None:
            baseline_forecaster = NaivePersistenceForecaster()

        # 1. Backtesting retrospectivo sobre partición temporal
        backtest_result = self.engine.evaluate(
            observations=vintage.observations,
            split_period=split_period,
            candidate_forecaster=candidate_forecaster,
            baseline_forecaster=baseline_forecaster,
        )

        # 2. Forzamiento del Gate de Salida del Hito 5 (falla cerrado si no supera al baseline)
        self.engine.assert_beats_baseline(backtest_result)

        # 3. Re-entrenamiento del modelo sobre la serie completa disponible
        candidate_forecaster.fit(vintage.observations)

        # 4. Proyección futura con intervalos de incertidumbre P10 <= P50 <= P90
        last_obs_period = vintage.observations[-1].period
        forecast_points = candidate_forecaster.predict_with_intervals(
            last_period=last_obs_period,
            horizon=forecast_horizon,
            frequency=frequency,
        )

        # 5. Documentación de limitaciones epistemológicas y metodológicas
        default_limitations = [
            f"Modelo econométrico {candidate_forecaster.name} ajustado sobre vintage {vintage.id}.",
            f"Evaluado en backtesting retrospectivo (split {split_period}) contra {baseline_forecaster.name}.",
            "Los intervalos representan un 80% de confianza estadística teórica bajo distribución de errores observada.",
            "No incorpora shocks exógenos ni cambios de política imprevistos.",
        ]
        if limitations:
            all_limitations = list(limitations) + default_limitations
        else:
            all_limitations = default_limitations

        # 6. Construcción del sobre canónico ForecastRun
        generated_id = run_id or f"forecast-{vintage.series_id}-{uuid.uuid4().hex[:8]}"

        forecast_run = ForecastRun(
            id=generated_id,
            series_id=vintage.series_id,
            target_vintage_id=vintage.id,
            model_name=candidate_forecaster.name,
            baseline_model=baseline_forecaster.name,
            split_period=split_period,
            metric=self.metric,
            model_metric_value=backtest_result.model_metric_value,
            baseline_metric_value=backtest_result.baseline_metric_value,
            beats_baseline=True,
            forecast_horizon=forecast_horizon,
            forecast_points=forecast_points,
            epistemic_status="forecast",
            limitations=all_limitations,
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        )

        return forecast_run
