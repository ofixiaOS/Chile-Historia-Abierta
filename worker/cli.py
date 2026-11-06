"""Interfaz de Línea de Comandos (CLI) para ejecución desatendida del Worker."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from worker.application.backtest_engine import BacktestEngine
from worker.application.document_pipeline import DocumentExtractor, DocumentPipeline, TextChunker
from worker.application.forecasters import DampedTrendForecaster, LinearTrendForecaster, NaivePersistenceForecaster
from worker.application.pipeline import ForecastPipeline
from worker.domain.exceptions import BaselineNotBeatenError, DomainError
from worker.domain.models import BacktestMetric, ChunkLicense, EvidenceStatus, SeriesVintage, SourceType
from worker.infrastructure.sdmx_parser import parse_sdmx_json



def load_vintage_from_file(file_path: str) -> SeriesVintage:
    """Carga un SeriesVintage desde archivo JSON (SDMX-JSON o formato nativo)."""
    p = Path(file_path)
    if not p.exists():
        raise FileNotFoundError(f"Archivo no encontrado: {file_path}")

    raw_text = p.read_text(encoding="utf-8")
    data = json.loads(raw_text)

    # Detectar si es SDMX-JSON 2.1
    if "meta" in data and "data" in data:
        return parse_sdmx_json(data)
    else:
        # Formato nativo de SeriesVintage
        return SeriesVintage.model_validate(data)


def build_forecaster(model_name: str):
    if model_name in ("damped_trend", "damped_trend_v1"):
        return DampedTrendForecaster(name="damped_trend_v1")
    elif model_name in ("linear_trend", "linear_trend_v1"):
        return LinearTrendForecaster(name="linear_trend_v1")
    elif model_name in ("naive", "naive_persistence"):
        return NaivePersistenceForecaster(name="naive_persistence")
    raise ValueError(f"Modelo desconocido: {model_name}. Opciones: damped_trend, linear_trend, naive")


def run_forecast_command(args: argparse.Namespace) -> int:
    try:
        vintage = load_vintage_from_file(args.input_file)
        model = build_forecaster(args.model)
        metric = BacktestMetric(args.metric)

        pipeline = ForecastPipeline(metric=metric)
        forecast_run = pipeline.run(
            vintage=vintage,
            candidate_forecaster=model,
            split_period=args.split_period,
            forecast_horizon=args.horizon,
            frequency=args.frequency,
        )

        output_json = forecast_run.model_dump_json(by_alias=True, indent=2)

        if args.output_file:
            Path(args.output_file).write_text(output_json, encoding="utf-8")
            print(f"[OK] Pronóstico generado exitosamente en {args.output_file}")
        else:
            print(output_json)

        return 0

    except BaselineNotBeatenError as e:
        print(f"[ERROR GATE HITO 5] {e}", file=sys.stderr)
        return 2
    except DomainError as e:
        print(f"[ERROR DOMINIO] {e.code}: {e.message}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"[ERROR INESPERADO] {type(e).__name__}: {e}", file=sys.stderr)
        return 1


def evaluate_command(args: argparse.Namespace) -> int:
    try:
        vintage = load_vintage_from_file(args.input_file)
        model = build_forecaster(args.model)
        metric = BacktestMetric(args.metric)

        engine = BacktestEngine(metric=metric)
        result = engine.evaluate(
            observations=vintage.observations,
            split_period=args.split_period,
            candidate_forecaster=model,
        )

        print(f"=== Evaluación Backtesting: {result.model_name} vs {result.baseline_model} ===")
        print(f"Serie:            {vintage.series_id} (Vintage: {vintage.id})")
        print(f"Split Period:     {result.split_period}")
        print(f"Métrica:          {result.metric.value.upper()}")
        print(f"Error Modelo:     {result.model_metric_value}")
        print(f"Error Baseline:   {result.baseline_metric_value}")
        print(f"Margen a favor:   {result.margin}")
        print(f"Supera Baseline:  {'SI (Aprobado)' if result.beats_baseline else 'NO (Rechazado)'}")

        if not result.beats_baseline:
            return 2
        return 0

    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {e}", file=sys.stderr)
        return 1


def extract_chunks_command(args: argparse.Namespace) -> int:
    try:
        license_obj = ChunkLicense(
            software_license=args.software_license or "",
            dataset_license=args.dataset_license or "",
            item_rights=args.item_rights,
            redistribution_policy=args.redistribution_policy,
            required_attribution=args.required_attribution,
        )

        chunker = TextChunker(
            max_chunk_size=args.chunk_size,
            min_chunk_size=args.min_chunk_size,
            overlap=args.overlap,
        )
        pipeline = DocumentPipeline(chunker=chunker)

        file_hash, chunks = pipeline.process_file(
            file_path=args.input_file,
            source_id=args.source_id,
            source_name=args.source_name,
            source_type=SourceType(args.source_type),
            license=license_obj,
            epistemic_status=EvidenceStatus(args.epistemic_status),
            retrieved_at=args.retrieved_at,
        )

        print(f"=== Documento procesado: {args.source_name} ===", file=sys.stderr)
        print(f"File SHA-256: {file_hash}", file=sys.stderr)
        print(f"Total Chunks: {len(chunks)}", file=sys.stderr)

        if args.format == "jsonl":
            output_lines = [chunk.model_dump_json(by_alias=True) for chunk in chunks]
            output_str = "\n".join(output_lines)
        else:
            dumped = [chunk.model_dump(by_alias=True, mode="json") for chunk in chunks]
            output_str = json.dumps(dumped, indent=2, ensure_ascii=False)

        if args.output_file:
            Path(args.output_file).write_text(output_str, encoding="utf-8")
            print(f"[OK] Chunks guardados en {args.output_file}", file=sys.stderr)
        else:
            print(output_str)

        return 0

    except DomainError as e:
        print(f"[ERROR DOMINIO] {e.code}: {e.message}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"[ERROR INESPERADO] {type(e).__name__}: {e}", file=sys.stderr)
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="worker",
        description="Chile Historia Abierta — Worker de Cómputo Econométrico, Backtesting y Chunking Documental",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcomando run-forecast
    p_run = subparsers.add_parser("run-forecast", help="Ejecuta backtesting y genera un ForecastRun verificado")
    p_run.add_argument("--input-file", required=True, help="Ruta al archivo JSON (SDMX o SeriesVintage)")
    p_run.add_argument("--split-period", required=True, help="Periodo de corte para split de backtesting (ej. 2024-05)")
    p_run.add_argument("--horizon", type=int, default=3, help="Horizonte de pronóstico hacia el futuro (default: 3)")
    p_run.add_argument("--model", default="damped_trend", help="Modelo: damped_trend o linear_trend")
    p_run.add_argument("--metric", choices=["mae", "rmse", "mape"], default="mae", help="Métrica de error")
    p_run.add_argument("--frequency", default="monthly", help="Frecuencia temporal (monthly, annual)")
    p_run.add_argument("--output-file", help="Ruta de salida para guardar el JSON del ForecastRun")

    # Subcomando evaluate
    p_eval = subparsers.add_parser("evaluate", help="Evalúa backtesting retrospectivo sin generar pronóstico futuro")
    p_eval.add_argument("--input-file", required=True, help="Ruta al archivo JSON (SDMX o SeriesVintage)")
    p_eval.add_argument("--split-period", required=True, help="Periodo de corte para split de backtesting")
    p_eval.add_argument("--model", default="damped_trend", help="Modelo a evaluar")
    p_eval.add_argument("--metric", choices=["mae", "rmse", "mape"], default="mae", help="Métrica de error")

    # Subcomando extract-chunks
    p_chunk = subparsers.add_parser("extract-chunks", help="Extrae y segmenta texto de un documento preservando localizadores y licencias")
    p_chunk.add_argument("--input-file", required=True, help="Ruta al documento (PDF, TXT, MD)")
    p_chunk.add_argument("--source-id", required=True, help="Identificador canónico de la fuente (ej. bcn-ley-17336)")
    p_chunk.add_argument("--source-name", required=True, help="Nombre legible de la fuente")
    p_chunk.add_argument("--source-type", choices=[s.value for s in SourceType], default="official_administrative", help="Tipo de fuente")
    p_chunk.add_argument("--epistemic-status", choices=[e.value for e in EvidenceStatus], default="documented", help="Estado epistemológico inicial")

    p_chunk.add_argument("--item-rights", default="Public Domain (Ley 17.336 Art. 8)", help="Derechos del objeto fuente")
    p_chunk.add_argument("--redistribution-policy", default="open_public_with_attribution", help="Política de redistribución")
    p_chunk.add_argument("--required-attribution", default="Biblioteca del Congreso Nacional de Chile", help="Atribución requerida")
    p_chunk.add_argument("--software-license", default="", help="Licencia de software (si aplica)")
    p_chunk.add_argument("--dataset-license", default="", help="Licencia de dataset (si aplica)")
    p_chunk.add_argument("--retrieved-at", help="Fecha ISO de recuperación (default: actual)")
    p_chunk.add_argument("--chunk-size", type=int, default=500, help="Tamaño máximo en caracteres del chunk")
    p_chunk.add_argument("--min-chunk-size", type=int, default=80, help="Tamaño mínimo en caracteres para fusión")
    p_chunk.add_argument("--overlap", type=int, default=50, help="Solapamiento en caracteres entre chunks contiguos")
    p_chunk.add_argument("--format", choices=["json", "jsonl"], default="json", help="Formato de exportación")
    p_chunk.add_argument("--output-file", help="Ruta de archivo destino")

    args = parser.parse_args()

    if args.command == "run-forecast":
        return run_forecast_command(args)
    elif args.command == "evaluate":
        return evaluate_command(args)
    elif args.command == "extract-chunks":
        return extract_chunks_command(args)

    return 0


if __name__ == "__main__":
    sys.exit(main())
