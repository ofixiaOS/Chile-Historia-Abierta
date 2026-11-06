import { getExplorationReadModel } from '#modules/evidence/infrastructure/public_claims'
import { placeService } from '#modules/geography/infrastructure/public_places'
import { encodePlaceCursor } from '#modules/geography/application/place_cursor'
import { statisticsService } from '#modules/statistics/infrastructure/public_statistics'
import type { ExplorationResponse } from '#modules/evidence/application/get_exploration_read_model'
import type { PlaceAttestation } from '#modules/geography/domain/place_attestation'
import type { Observation, StatisticalSeries } from '#modules/statistics/domain/series'
import type { ForecastRun } from '#modules/statistics/domain/forecast'
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { randomBytes } from 'node:crypto'

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => {
    const escapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return escapes[character]
  })
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

export default class WebExplorerController {
  async index({ response }: HttpContext) {
    // 1. Obtener estado inicial de exploración, series y atestaciones geográficas
    const exploration = await getExplorationReadModel.execute({ limit: 50 })
    const seriesListPage = await statisticsService.listSeries()
    const seriesList = seriesListPage.items
    const placePage = await placeService.getAttestationPage({}, 100)
    const attestations = placePage.items
    const morePlacesUrl = placePage.next
      ? `/v1/places/geojson?limit=100&cursor=${encodePlaceCursor(placePage.next)}`
      : null
    const seriesId = seriesList[0]?.id ?? 'bcentral-tpm'

    let observationsData: readonly Observation[] = []
    let forecastData: ForecastRun | null = null

    try {
      const obsResult = await statisticsService.getObservations(seriesId)
      observationsData = obsResult.observations
    } catch {
      observationsData = []
    }

    try {
      forecastData = await statisticsService.getForecast('forecast-bcentral-tpm-2024')
    } catch {
      forecastData = null
    }

    // 2. Generar un nonce irrepetible para los recursos inline de esta respuesta.
    const nonce = randomBytes(18).toString('base64')
    const html = this.renderHtml({
      exploration,
      seriesList,
      observationsData,
      forecastData,
      attestations,
      morePlacesUrl,
      nonce,
    })

    response.header(
      'content-security-policy',
      `default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; connect-src 'self'; script-src 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; style-src-attr 'none'`
    )
    response.header('content-type', 'text/html; charset=utf-8')
    response.header('cache-control', 'no-store')
    return response.send(html)
  }

  private renderHtml(props: {
    exploration: ExplorationResponse
    seriesList: readonly StatisticalSeries[]
    observationsData: readonly Observation[]
    forecastData: ForecastRun | null
    attestations: readonly PlaceAttestation[]
    morePlacesUrl: string | null
    nonce: string
  }): string {
    const items = props.exploration.data.items
    const facets = props.exploration.data.facets
    const targetSeriesId = props.seriesList[0]?.id ?? 'bcentral-tpm'
    const observationsJson = serializeForScript(props.observationsData)
    const forecastJson = serializeForScript(props.forecastData)
    const attestationsJson = serializeForScript(props.attestations)
    const showFixtureVisuals = env.get('NODE_ENV') === 'test'

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chile Historia Abierta — Explorador Ciudadano y Evidencia Histórica</title>
  <meta name="description" content="Plataforma pública para explorar historia, economía y sociedad chilena mediante evidencia trazable, línea de tiempo, series macroeconómicas y gráficos reproducibles.">
  <meta name="keywords" content="Chile, historia, economía, Banco Central, evidencia histórica, series estadísticas, datos abiertos">
  <style nonce="${props.nonce}">
    :root {
      --bg-primary: #090d16;
      --bg-secondary: #0f172a;
      --bg-card: rgba(30, 41, 59, 0.65);
      --bg-card-hover: rgba(51, 65, 85, 0.75);
      --border-color: rgba(255, 255, 255, 0.08);
      --border-glow: rgba(56, 189, 248, 0.25);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent-blue: #38bdf8;
      --accent-indigo: #6366f1;

      /* Colores Epistemológicos */
      --status-documented: #10b981;
      --status-inferred: #38bdf8;
      --status-disputed: #f59e0b;
      --status-hypothesis: #a855f7;
      --status-forecast: #ec4899;
      --status-unknown: #64748b;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    .filter-control-group, .forecast-control-row, .detail-links-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .forecast-control-row, .detail-links-row { gap: 0.5rem; }
    .trailing-link { margin-left: auto; color: var(--accent-blue); }
    .view-panel-hidden, .is-hidden { display: none !important; }
    .section-heading-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .heading-compact-xl { font-size: 1.25rem; font-weight: 700; }
    .heading-compact-lg { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; }
    .heading-compact { font-size: 1.15rem; font-weight: 700; }
    .text-muted-compact { color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem; }
    .text-secondary-compact { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem; }
    .text-secondary-small { color: var(--text-secondary); font-size: 0.875rem; }
    .text-muted-small { color: var(--text-muted); font-size: 0.875rem; }
    .status-value-trailing { margin-left: auto; color: var(--status-documented); font-weight: 600; }
    .nav-btn-compact { font-size: 0.75rem; }
    .map-frame { background: rgba(15, 23, 42, 0.8); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 1rem; position: relative; overflow: hidden; }
    .map-illustration { display: block; margin: 0 auto; }
    .status-legend, .forecast-legend { display: flex; flex-wrap: wrap; color: var(--text-secondary); border-top: 1px solid var(--border-color); padding-top: 0.75rem; }
    .status-legend { gap: 1.5rem; margin-top: 1rem; font-size: 0.8rem; }
    .forecast-legend { gap: 1.5rem; margin-top: 1rem; font-size: 0.8rem; }
    .legend-item, .forecast-legend-item { display: flex; align-items: center; gap: 0.5rem; }
    .forecast-legend-item { gap: 0.4rem; }
    .legend-marker { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .legend-marker-documented { border: 1.5px solid var(--status-documented); background: rgba(16, 185, 129, 0.3); }
    .legend-marker-disputed { border: 1.5px dashed var(--status-disputed); background: rgba(245, 158, 11, 0.3); }
    .forecast-marker-observed { width: 12px; height: 3px; background: #38bdf8; display: inline-block; }
    .forecast-marker-median { width: 12px; height: 3px; background: #ec4899; display: inline-block; border-top: 2px dashed #ec4899; }
    .forecast-marker-band { width: 12px; height: 12px; background: rgba(236, 72, 153, 0.25); border: 1px solid #ec4899; display: inline-block; }
    .table-scroll { overflow-x: auto; }
    .place-primary { font-weight: 600; color: var(--text-primary); }
    .place-coordinates { font-size: 0.75rem; color: var(--text-muted); font-family: monospace; }
    .territory-badge { background: rgba(255, 255, 255, 0.06); }
    .place-time { font-size: 0.85rem; }
    .place-open { padding: 0.3rem 0.6rem; font-size: 0.75rem; }
    .series-subtitle { margin-top: 0.5rem; }
    .assistance-description { margin-bottom: 1.25rem; }
    .assistance-title { margin-bottom: 0.5rem; }
    .drawer-title { margin-top: 0.5rem; }
    .detail-statement-emphasis { font-weight: 500; }
    .detail-id-mono { font-family: monospace; font-size: 0.8rem; color: var(--accent-blue); }
    .detail-limitations { padding-left: 1.25rem; font-size: 0.85rem; color: var(--text-secondary); }
    .detail-links-section { margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 1rem; }
    .footer-note { font-size: 0.75rem; margin-top: 0.25rem; }
    .assistance-answer-abstained { color: #f59e0b; }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      position: sticky;
      top: 0;
      z-index: 40;
      padding: 1rem 1.5rem;
    }

    .header-container {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.6rem;
      background: rgba(56, 189, 248, 0.1);
      color: var(--accent-blue);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 9999px;
      font-weight: 600;
    }

    h1 {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      background: linear-gradient(135deg, #ffffff 30%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .header-links {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .nav-btn {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.4rem 0.8rem;
      border-radius: 0.375rem;
      transition: all 0.15s ease;
      border: 1px solid transparent;
    }

    .nav-btn:hover {
      color: var(--text-primary);
      background: var(--bg-card);
      border-color: var(--border-color);
    }

    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
      flex: 1;
      width: 100%;
    }

    /* Barra de control y búsqueda */
    .controls-panel {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
    }

    .controls-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
    }

    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
    }

    .search-input {
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.95rem;
      outline: none;
      transition: all 0.2s ease;
    }

    .search-input:focus {
      border-color: var(--accent-blue);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }

    .filter-select {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      outline: none;
      cursor: pointer;
    }

    /* Pestañas de Vistas Sincronizadas */
    .views-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 1.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-weight: 600;
      padding: 0.75rem 1.25rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: var(--text-primary);
    }

    .tab-btn.active {
      color: var(--accent-blue);
      border-bottom-color: var(--accent-blue);
    }

    /* Badges Epistemológicos */
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-documented {
      background: rgba(16, 185, 129, 0.15);
      color: var(--status-documented);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-inferred {
      background: rgba(56, 189, 248, 0.15);
      color: var(--status-inferred);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .badge-disputed {
      background: rgba(245, 158, 11, 0.15);
      color: var(--status-disputed);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .badge-hypothesis {
      background: rgba(168, 85, 247, 0.15);
      color: var(--status-hypothesis);
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .badge-forecast {
      background: rgba(236, 72, 153, 0.15);
      color: var(--status-forecast);
      border: 1px solid rgba(236, 72, 153, 0.3);
    }

    .badge-unknown {
      background: rgba(100, 116, 139, 0.15);
      color: var(--status-unknown);
      border: 1px solid rgba(100, 116, 139, 0.3);
    }

    /* Vista 1: Timeline */
    .timeline-container {
      position: relative;
      padding-left: 2rem;
    }

    .timeline-container::before {
      content: '';
      position: absolute;
      left: 7px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(180deg, var(--accent-blue) 0%, var(--accent-indigo) 100%);
      opacity: 0.4;
    }

    .timeline-node {
      position: relative;
      margin-bottom: 2rem;
    }

    .timeline-node::before {
      content: '';
      position: absolute;
      left: -2rem;
      top: 1.25rem;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--bg-primary);
      border: 3px solid var(--accent-blue);
      z-index: 10;
    }

    .claim-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.25rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .claim-card:hover {
      background: var(--bg-card-hover);
      border-color: var(--accent-blue);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    }

    .card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .card-date {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .card-statement {
      font-size: 1.05rem;
      font-weight: 500;
      color: var(--text-primary);
      margin-bottom: 0.75rem;
    }

    .card-footer {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      align-items: center;
    }

    /* Vista 2: Lista */
    .list-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1rem;
    }

    /* Vista 3: Series y Pronósticos */
    .series-container {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .chart-svg {
      width: 100%;
      height: 320px;
      overflow: visible;
    }

    /* Vista 4: Asistencia con Evidencia */
    .assistance-box {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 0.75rem;
      padding: 1.5rem;
    }

    .query-form {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .query-btn {
      background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-indigo) 100%);
      color: white;
      border: none;
      padding: 0.65rem 1.5rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s ease;
    }

    .query-btn:hover {
      opacity: 0.9;
    }

    .assistance-result {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1.25rem;
      min-height: 120px;
    }

    /* Drawer de Detalle Factual */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 50;
      display: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .drawer-overlay.open {
      display: block;
      opacity: 1;
    }

    .drawer {
      position: fixed;
      right: -520px;
      top: 0;
      bottom: 0;
      width: 100%;
      max-width: 500px;
      background: #0d1322;
      border-left: 1px solid var(--border-color);
      z-index: 60;
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      overflow-y: auto;
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.8);
    }

    .drawer.open {
      right: 0;
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
    }

    .close-btn:hover {
      color: var(--text-primary);
    }

    .detail-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-label {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }

    .detail-val {
      font-size: 0.95rem;
      color: var(--text-primary);
    }

    .source-box {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 0.75rem;
      margin-top: 0.5rem;
    }

    .source-title {
      font-weight: 600;
      color: var(--accent-blue);
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }

    .source-locator {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Vista Mapa Territorial (ADR 0003) */
    .map-layout {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 1.5rem;
      align-items: start;
    }

    @media (max-width: 960px) {
      .map-layout {
        grid-template-columns: 1fr;
      }
    }

    .map-node {
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }

    .map-node:hover circle:first-child {
      fill: rgba(56, 189, 248, 0.35);
      stroke: var(--accent-blue);
      stroke-width: 2.5px;
    }

    .map-node:focus-visible circle:first-child {
      stroke: var(--accent-blue);
      stroke-width: 3px;
    }

    .accessible-places-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .accessible-places-table th {
      text-align: left;
      padding: 0.75rem 0.5rem;
      border-bottom: 2px solid var(--border-color);
      color: var(--text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .accessible-places-table td {
      padding: 0.75rem 0.5rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    .accessible-places-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    footer {
      border-top: 1px solid var(--border-color);
      padding: 1.5rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      background: rgba(15, 23, 42, 0.4);
    }

    @media (max-width: 640px) {
      .header-container {
        flex-direction: column;
        align-items: flex-start;
      }
      .timeline-container {
        padding-left: 1.5rem;
      }
      .drawer {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>

  <header>
    <div class="header-container">
      <div class="brand-group">
        <h1>Chile Historia Abierta</h1>
        <span class="brand-badge">Corpus Piloto • Evidencia Trazable</span>
      </div>
      <div class="header-links">
        <a href="/openapi.json" class="nav-btn" target="_blank" rel="noopener">OpenAPI 3.1</a>
        <a href="/v1/explore" class="nav-btn" target="_blank" rel="noopener">API /v1/explore</a>
        <a href="/v1/places/geojson" class="nav-btn" target="_blank" rel="noopener">GeoJSON RFC 7946</a>
        <a href="/v1/mcp" class="nav-btn" target="_blank" rel="noopener">MCP Server</a>
      </div>
    </div>
  </header>

  <main>
    <!-- Panel de búsqueda y filtros -->
    <section class="controls-panel" aria-label="Controles de búsqueda y filtros">
      <div class="controls-row">
        <div class="search-box">
          <input
            type="text"
            id="search-input"
            class="search-input"
            placeholder="Buscar por término, concepto o institución (ej. TPM, Banco Central, Ley)..."
            aria-label="Buscar afirmaciones y series históricas"
          >
        </div>
        <div class="filter-control-group">
          <select id="filter-status" class="filter-select" aria-label="Filtrar por estado epistemológico">
            <option value="all">Todos los estados (${facets.totalMatching} registros)</option>
            <option value="documented">Documentado (documented)</option>
            <option value="inferred">Inferido (inferred)</option>
            <option value="disputed">En disputa (disputed)</option>
            <option value="hypothesis">Hipótesis (hypothesis)</option>
            <option value="forecast">Pronóstico (forecast)</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Pestañas de Vistas Coordinadas (ADR 0003) -->
    <nav class="views-tabs" role="tablist" aria-label="Vistas de exploración">
      <button id="tab-timeline" class="tab-btn active" role="tab" aria-selected="true" aria-controls="view-timeline">
        <span>⏱️</span> Línea de Tiempo
      </button>
      <button id="tab-map" class="tab-btn" role="tab" aria-selected="false" aria-controls="view-map">
        <span>🗺️</span> Mapa Territorial
      </button>
      <button id="tab-list" class="tab-btn" role="tab" aria-selected="false" aria-controls="view-list">
        <span>📋</span> Colección Accesible
      </button>
      <button id="tab-series" class="tab-btn" role="tab" aria-selected="false" aria-controls="view-series">
        <span>📈</span> Series & Pronósticos
      </button>
      <button id="tab-assistance" class="tab-btn" role="tab" aria-selected="false" aria-controls="view-assistance">
        <span>🤖</span> Asistencia con Citas
      </button>
    </nav>

    <!-- Vista 1: Línea de Tiempo -->
    <section id="view-timeline" role="tabpanel" aria-labelledby="tab-timeline">
      <div class="timeline-container" id="timeline-list">
        ${items
          .map(
            (it) => `
          <div class="timeline-node" data-id="${escapeHtml(it.id)}" data-status="${escapeHtml(it.evidenceStatus)}">
            <article class="claim-card" data-claim-id="${escapeHtml(it.id)}" tabindex="0" role="button" aria-label="Inspeccionar afirmación ${escapeHtml(it.id)}">
              <div class="card-meta">
                <span class="card-date">${escapeHtml(it.publishedAt ? it.publishedAt.slice(0, 10) : 'Fecha registrada')}</span>
                <span class="badge badge-${escapeHtml(it.evidenceStatus)}">${escapeHtml(it.evidenceStatus)}</span>
              </div>
              <p class="card-statement">${escapeHtml(it.statement)}</p>
              <div class="card-footer">
                <span>📚 ${escapeHtml(it.sourceCount)} fuente(s)</span>
                <span>🏷️ ${escapeHtml(it.sourceTypes.join(', '))}</span>
                <span class="trailing-link">Inspeccionar evidencia →</span>
              </div>
            </article>
          </div>
        `
          )
          .join('')}
      </div>
    </section>

    <!-- Vista 2: Mapa Territorial (Hito 1 & ADR 0003) -->
    <section id="view-map" class="view-panel-hidden" role="tabpanel" aria-labelledby="tab-map">
      <div class="map-layout">
        <!-- Tarjeta del Mapa SVG -->
        <div class="chart-card">
          <div class="section-heading-row">
            <div>
              <h2 class="heading-compact-xl">Cartografía Histórica y Demarcaciones Territoriales</h2>
              <p class="text-muted-compact">
                Atestaciones espaciales con intervalo de vigencia y certeza explícita conforme a RFC 7946 GeoJSON.
              </p>
            </div>
            <a href="/v1/places/geojson" target="_blank" class="nav-btn nav-btn-compact">GeoJSON RFC 7946 ↗</a>
          </div>
          ${
            props.morePlacesUrl
              ? `<p class="pagination-note">Se muestran 100 atestaciones. <a href="${escapeHtml(props.morePlacesUrl)}" target="_blank" rel="noopener">Consultar la página siguiente de datos GeoJSON</a>.</p>`
              : ''
          }

          <div class="map-svg-container map-frame">
            <svg id="chile-map-svg" class="map-illustration" viewBox="0 0 540 820" width="100%" height="520" aria-label="Mapa interactivo de atestaciones territoriales de Chile">
              <!-- Grid de paralelos con etiquetas -->
              <line x1="40" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
              <text x="50" y="85" fill="var(--text-muted)" font-size="11" font-family="monospace">18°S (Arica / Límite Norte)</text>

              <line x1="40" y1="210" x2="500" y2="210" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
              <text x="50" y="205" fill="var(--text-muted)" font-size="11" font-family="monospace">24°S (Trópico de Capricornio / Antofagasta)</text>

              <line x1="40" y1="410" x2="500" y2="410" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
              <text x="50" y="405" fill="var(--text-muted)" font-size="11" font-family="monospace">33°S (Santiago / Valparaíso)</text>

              <line x1="40" y1="520" x2="500" y2="520" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
              <text x="50" y="515" fill="var(--text-muted)" font-size="11" font-family="monospace">37°S (Concepción / Biobío / Cuenca del Carbón)</text>

              <line x1="40" y1="740" x2="500" y2="740" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
              <text x="50" y="735" fill="var(--text-muted)" font-size="11" font-family="monospace">53°S (Estrecho de Magallanes / Fuerte Bulnes)</text>

              <!-- Silueta estilizada de la costa y cordillera de Chile -->
              <path d="M 280 60 L 275 140 L 265 240 L 255 350 L 245 420 L 235 530 L 220 620 L 270 750 L 290 770 L 270 790 L 240 760 L 205 630 L 220 520 L 230 410 L 245 330 L 255 220 L 265 130 L 270 60 Z" fill="rgba(56, 189, 248, 0.05)" stroke="rgba(56, 189, 248, 0.25)" stroke-width="2" />

              <!-- Cordillera de los Andes eje oriental -->
              <path d="M 295 65 L 290 145 L 285 245 L 275 355 L 265 425 L 255 535 L 245 625 L 295 755" fill="none" stroke="rgba(245, 158, 11, 0.2)" stroke-width="1.5" stroke-dasharray="3 3" />

              <!-- Nodos de Atestaciones Históricas -->
              ${
                showFixtureVisuals
                  ? `
              <!-- 1. Tarapacá / Iquique -->
              <g class="map-node" data-cha-open-place="attestation-tarapaca-1883" tabindex="0" role="button" aria-label="Tarapacá e Iquique">
                <circle cx="270" cy="115" r="14" fill="rgba(16, 185, 129, 0.15)" stroke="var(--status-documented)" stroke-width="1.5" />
                <circle cx="270" cy="115" r="5" fill="var(--status-documented)" />
                <text x="290" y="119" fill="var(--text-primary)" font-size="12" font-weight="600">Tarapacá / Iquique (1883)</text>
                <text x="290" y="132" fill="var(--text-muted)" font-size="10">Cantón Salitrero • Certeza exacta</text>
              </g>

              <!-- 2. Antofagasta (1879) con halo de incertidumbre aproximada -->
              <g class="map-node" data-cha-open-place="attestation-antofagasta-1879" tabindex="0" role="button" aria-label="Antofagasta">
                <circle cx="265" cy="180" r="18" fill="rgba(245, 158, 11, 0.12)" stroke="var(--status-disputed)" stroke-width="1.5" stroke-dasharray="4 2" />
                <circle cx="265" cy="180" r="5" fill="var(--status-disputed)" />
                <text x="288" y="182" fill="var(--text-primary)" font-size="12" font-weight="600">Antofagasta (1879)</text>
                <text x="288" y="195" fill="var(--status-disputed)" font-size="10">Litoral • Certeza aproximada</text>
              </g>

              <!-- 3. Valparaíso (1880) -->
              <g class="map-node" data-cha-open-place="attestation-valpo-1880" tabindex="0" role="button" aria-label="Valparaíso">
                <circle cx="240" cy="385" r="14" fill="rgba(16, 185, 129, 0.15)" stroke="var(--status-documented)" stroke-width="1.5" />
                <circle cx="240" cy="385" r="5" fill="var(--status-documented)" />
                <text x="120" y="380" fill="var(--text-primary)" font-size="12" font-weight="600" text-anchor="end">Valparaíso (Puerto)</text>
                <text x="120" y="393" fill="var(--text-muted)" font-size="10" text-anchor="end">Aduana de Chile • 1830-1930</text>
                <line x1="125" y1="385" x2="225" y2="385" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="2" />
              </g>

              <!-- 4. Santiago (1810) -->
              <g class="map-node" data-cha-open-place="attestation-stgo-1810" tabindex="0" role="button" aria-label="Santiago">
                <circle cx="260" cy="400" r="16" fill="rgba(56, 189, 248, 0.2)" stroke="var(--accent-blue)" stroke-width="2" />
                <circle cx="260" cy="400" r="6" fill="var(--accent-blue)" />
                <text x="282" y="398" fill="var(--text-primary)" font-size="12" font-weight="700">Santiago (Cabildo 1810)</text>
                <text x="282" y="411" fill="var(--accent-blue)" font-size="10">Primera Junta • Centro Administrativo</text>
              </g>

              <!-- 5. Concepción / Lota (1940) -->
              <g class="map-node" data-cha-open-place="attestation-concepcion-1940" tabindex="0" role="button" aria-label="Concepción">
                <circle cx="230" cy="485" r="14" fill="rgba(16, 185, 129, 0.15)" stroke="var(--status-documented)" stroke-width="1.5" />
                <circle cx="230" cy="485" r="5" fill="var(--status-documented)" />
                <text x="250" y="485" fill="var(--text-primary)" font-size="12" font-weight="600">Concepción / Lota (1939-1940)</text>
                <text x="250" y="498" fill="var(--text-muted)" font-size="10">CORFO • Cuenca del Carbón</text>
              </g>

              <!-- 6. Magallanes / Fuerte Bulnes (1843) -->
              <g class="map-node" data-cha-open-place="attestation-magallanes-1843" tabindex="0" role="button" aria-label="Magallanes">
                <circle cx="265" cy="745" r="14" fill="rgba(16, 185, 129, 0.15)" stroke="var(--status-documented)" stroke-width="1.5" />
                <circle cx="265" cy="745" r="5" fill="var(--status-documented)" />
                <text x="285" y="742" fill="var(--text-primary)" font-size="12" font-weight="600">Fuerte Bulnes (1843)</text>
                <text x="285" y="755" fill="var(--text-muted)" font-size="10">Estrecho de Magallanes • Soberanía</text>
              </g>
              `
                  : '<text x="60" y="400" fill="var(--text-secondary)" font-size="14">Sin atestaciones geográficas aprobadas</text>'
              }
            </svg>
          </div>

          <!-- Leyenda de Incertidumbre Espacial -->
          <div class="status-legend">
            <div class="legend-item">
              <span class="legend-marker legend-marker-documented"></span>
              <span><strong>Certeza exacta:</strong> delimitación documental o cartográfica oficial confirmada.</span>
            </div>
            <div class="legend-item">
              <span class="legend-marker legend-marker-disputed"></span>
              <span><strong>Certeza aproximada:</strong> límites provisionales o demarcación estimada en conflicto.</span>
            </div>
          </div>
        </div>

        <!-- Tabla accesible complementaria -->
        <div class="chart-card">
          <h3 class="heading-compact-lg">Registro Accesible de Atestaciones Geográficas</h3>
          <p class="text-secondary-compact">
            Lista estructurada de hitos territoriales históricos conforme a WCAG 2.1 AA.
          </p>

          <div class="table-scroll">
            <table class="accessible-places-table" role="table" aria-label="Atestaciones geográficas históricas">
              <thead>
                <tr>
                  <th scope="col">Lugar / Hito</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Vigencia</th>
                  <th scope="col">Certeza</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody>
                ${props.attestations
                  .map(
                    (a) => `
                  <tr>
                    <td class="place-primary">
                      ${escapeHtml(a.placeName)}
                      <div class="place-coordinates">WGS84: ${a.coordinates.latitude.toFixed(4)}, ${a.coordinates.longitude.toFixed(4)}</div>
                    </td>
                    <td><span class="badge territory-badge">${escapeHtml(a.territoryType)}</span></td>
                    <td class="place-time">${a.timeRange.fromYear}${a.timeRange.toYear ? ` – ${a.timeRange.toYear}` : ''}</td>
                    <td><span class="badge badge-${a.certainty === 'exact' ? 'documented' : 'disputed'}">${escapeHtml(a.certainty)}</span></td>
                    <td>
                      <button class="nav-btn place-open" data-place-id="${escapeHtml(a.id)}">
                        Detalle →
                      </button>
                    </td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- Vista 2: Colección Accesible en Lista -->
    <section id="view-list" class="view-panel-hidden" role="tabpanel" aria-labelledby="tab-list">
      <div class="list-grid" id="claims-grid">
        ${items
          .map(
            (it) => `
          <article class="claim-card" data-id="${escapeHtml(it.id)}" data-status="${escapeHtml(it.evidenceStatus)}" data-claim-id="${escapeHtml(it.id)}" tabindex="0" role="button">
            <div class="card-meta">
              <span class="card-date">${escapeHtml(it.publishedAt ? it.publishedAt.slice(0, 10) : '')}</span>
              <span class="badge badge-${escapeHtml(it.evidenceStatus)}">${escapeHtml(it.evidenceStatus)}</span>
            </div>
            <p class="card-statement">${escapeHtml(it.statement)}</p>
            <div class="card-footer">
              <span>Fuentes: ${escapeHtml(it.sourceCount)}</span>
              <span class="trailing-link">Detalle →</span>
            </div>
          </article>
        `
          )
          .join('')}
      </div>
    </section>

    <!-- Vista 3: Series Macroeconómicas & Pronósticos -->
    <section id="view-series" class="view-panel-hidden" role="tabpanel" aria-labelledby="tab-series">
      <div class="series-container">
        ${
          showFixtureVisuals
            ? `
        <div class="chart-header">
          <div>
            <h2 class="heading-compact">Tasa de Política Monetaria (TPM) — Banco Central de Chile</h2>
            <p class="text-secondary-small">Frecuencia mensual con abanico de incertidumbre $P10 \\le P50 \\le P90$ (Gate Hito 5 superado)</p>
          </div>
          <div class="forecast-control-row">
            <a href="/v1/series/${encodeURIComponent(targetSeriesId)}/sdmx" class="nav-btn" target="_blank" rel="noopener">Descargar SDMX-JSON</a>
            <a href="/v1/forecasts/${props.forecastData ? encodeURIComponent(props.forecastData.id) : ''}" class="nav-btn" target="_blank" rel="noopener">Ver Sobre Forecast</a>
          </div>
        </div>

        <!-- Renderizado SVG del gráfico interactivo -->
        <svg class="chart-svg" viewBox="0 0 800 280" aria-label="Gráfico de serie temporal TPM y pronóstico con bandas de incertidumbre">
          <!-- Cuadrícula -->
          <line x1="60" y1="40" x2="760" y2="40" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
          <line x1="60" y1="100" x2="760" y2="100" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
          <line x1="60" y1="160" x2="760" y2="160" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4" />
          <line x1="60" y1="220" x2="760" y2="220" stroke="rgba(255,255,255,0.15)" />

          <!-- Ejes y Etiquetas Y -->
          <text x="25" y="45" fill="#64748b" font-size="11">9.0%</text>
          <text x="25" y="105" fill="#64748b" font-size="11">7.5%</text>
          <text x="25" y="165" fill="#64748b" font-size="11">6.0%</text>
          <text x="25" y="225" fill="#64748b" font-size="11">4.5%</text>

          <!-- Abanico de Incertidumbre Pronóstico (P10 a P90) -->
          <polygon
            points="550,180 620,186 690,195 690,165 620,158 550,180"
            fill="rgba(236, 72, 153, 0.18)"
            stroke="rgba(236, 72, 153, 0.4)"
          />

          <!-- Línea Histórica Documentada -->
          <polyline
            points="60,65 130,105 200,105 270,140 340,160 410,172 480,172 550,180"
            fill="none"
            stroke="#38bdf8"
            stroke-width="3"
            stroke-linecap="round"
          />

          <!-- Línea Central Pronóstico (P50) -->
          <polyline
            points="550,180 620,186 690,195"
            fill="none"
            stroke="#ec4899"
            stroke-width="2.5"
            stroke-dasharray="5,4"
          />

          <!-- Puntos Históricos -->
          <circle cx="60" cy="65" r="4" fill="#38bdf8" />
          <circle cx="130" cy="105" r="4" fill="#38bdf8" />
          <circle cx="200" cy="105" r="4" fill="#38bdf8" />
          <circle cx="270" cy="140" r="4" fill="#38bdf8" />
          <circle cx="340" cy="160" r="4" fill="#38bdf8" />
          <circle cx="410" cy="172" r="4" fill="#38bdf8" />
          <circle cx="480" cy="172" r="4" fill="#38bdf8" />
          <circle cx="550" cy="180" r="5" fill="#10b981" />

          <!-- Puntos Pronóstico -->
          <circle cx="620" cy="186" r="4" fill="#ec4899" />
          <circle cx="690" cy="195" r="4" fill="#ec4899" />

          <!-- Etiquetas X -->
          <text x="50" y="245" fill="#64748b" font-size="11">2024-01</text>
          <text x="190" y="245" fill="#64748b" font-size="11">2024-03</text>
          <text x="330" y="245" fill="#64748b" font-size="11">2024-05</text>
          <text x="470" y="245" fill="#64748b" font-size="11">2024-07</text>
          <text x="540" y="245" fill="#10b981" font-size="11" font-weight="600">2024-08 (Rev)</text>
          <text x="610" y="245" fill="#ec4899" font-size="11">2024-09 (P50)</text>
          <text x="680" y="245" fill="#ec4899" font-size="11">2024-10 (P50)</text>
        </svg>

        <div class="forecast-legend">
          <span class="forecast-legend-item">
            <span class="forecast-marker-observed"></span> Observado (Documented)
          </span>
          <span class="forecast-legend-item">
            <span class="forecast-marker-median"></span> Pronóstico P50 (Damped Trend)
          </span>
          <span class="forecast-legend-item">
            <span class="forecast-marker-band"></span> Abanico P10-P90 (80% confianza)
          </span>
          <span class="status-value-trailing">
            ✓ MAE Modelo: 0.1822 vs Baseline: 0.3333 (+0.1511)
          </span>
        </div>
        `
            : `<h2>Series estadísticas</h2><p>No hay series ni pronósticos aprobados para mostrar en el gráfico.</p>${props.seriesList
                .map(
                  (series) =>
                    `<p><a href="/v1/series/${encodeURIComponent(series.id)}">${escapeHtml(series.concept)}</a></p>`
                )
                .join('')}`
        }
      </div>
    </section>

    <!-- Vista 4: Asistencia con Citas Verificables -->
    <section id="view-assistance" class="view-panel-hidden" role="tabpanel" aria-labelledby="tab-assistance">
      <div class="assistance-box">
        <h2 class="heading-compact assistance-title">Consulta Asistida con Citas Verificables</h2>
        <p class="text-secondary-small assistance-description">
          Este módulo consulta la API de asistencia (FTS en español + citas canónicas). Ante consultas sin evidencia o intentos de inyección, el sistema <strong>falla cerrado</strong> y responde explícitamente <code>NO VERIFICADO</code>.
        </p>

        <form id="assistance-form" class="query-form">
          <input
            type="text"
            id="assistance-input"
            class="search-input"
            placeholder="Escriba su pregunta (ej. ¿Cuál fue la TPM en enero 2024?, ¿Qué ley creó el Ministerio de las Culturas?)..."
            required
            minlength="5"
          >
          <button type="submit" class="query-btn" id="assistance-submit-btn">Consultar</button>
        </form>

        <div id="assistance-output" class="assistance-result">
          <p class="text-muted-small">
            Ingrese una consulta para comprobar la verificación determinista de citas y el gate de abstención estricta.
          </p>
        </div>
      </div>
    </section>
  </main>

  <!-- Drawer Lateral de Detalle Factual y Evidencia Localizable -->
  <div id="drawer-overlay" class="drawer-overlay" data-cha-action="close-claim-drawer"></div>
  <aside id="detail-drawer" class="drawer" aria-labelledby="drawer-title" aria-modal="true" role="dialog">
    <div class="drawer-header">
      <div>
        <span id="detail-badge" class="badge"></span>
        <h3 id="drawer-title" class="heading-compact drawer-title">Detalle Factual</h3>
      </div>
      <button class="close-btn" data-cha-action="close-claim-drawer" aria-label="Cerrar panel de detalle">×</button>
    </div>

    <div class="detail-section">
      <span class="detail-label">Enunciado Canónico</span>
      <p id="detail-statement" class="detail-val detail-statement-emphasis"></p>
    </div>

    <div class="detail-section">
      <span class="detail-label">Identificador / Enlace</span>
      <p id="detail-id" class="detail-val detail-id-mono"></p>
    </div>

    <div class="detail-section">
      <span class="detail-label">Fuentes Localizables con Hash SHA-256</span>
      <div id="detail-sources"></div>
    </div>

    <div class="detail-section">
      <span class="detail-label">Limitaciones Epistemológicas</span>
      <ul id="detail-limitations" class="detail-limitations"></ul>
    </div>

    <div class="detail-section detail-links-section">
      <span class="detail-label">Interoperabilidad Abierta</span>
      <div class="detail-links-row">
        <a id="detail-prov-link" href="#" target="_blank" class="nav-btn nav-btn-compact">W3C PROV-O (JSON-LD)</a>
        <a href="/openapi.json" target="_blank" class="nav-btn nav-btn-compact">Contrato OpenAPI</a>
      </div>
    </div>
  </aside>

  <footer>
    <p>Chile Historia Abierta — Plataforma de Conocimiento Histórico, Estadístico y Evidencia Trazable.</p>
    <p class="footer-note">Las citas preservan licencias de software, dataset y objeto por separado. Popularidad no es evidencia.</p>
  </footer>

  <!-- Script interactivo Vanilla JS -->
  <script nonce="${props.nonce}">
    const OBSERVATIONS_DATA = ${observationsJson};
    const FORECAST_DATA = ${forecastJson};
    const PLACES_DATA = ${attestationsJson};

    function appendText(parent, tag, className, value) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      element.textContent = String(value ?? '');
      parent.appendChild(element);
      return element;
    }

    function appendSourceLine(parent, label, value, className = 'source-locator') {
      return appendText(parent, 'div', className, label + String(value ?? ''));
    }

    function safeHttpUrl(value) {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
      } catch {
        return null;
      }
    }

    // 1. Manejo de Pestañas
    const tabs = [
      { btn: document.getElementById('tab-timeline'), panel: document.getElementById('view-timeline') },
      { btn: document.getElementById('tab-map'), panel: document.getElementById('view-map') },
      { btn: document.getElementById('tab-list'), panel: document.getElementById('view-list') },
      { btn: document.getElementById('tab-series'), panel: document.getElementById('view-series') },
      { btn: document.getElementById('tab-assistance'), panel: document.getElementById('view-assistance') },
    ];

    tabs.forEach(({ btn, panel }) => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn.classList.remove('active');
          t.btn.setAttribute('aria-selected', 'false');
          t.panel.classList.add('view-panel-hidden');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        panel.classList.remove('view-panel-hidden');
      });
    });

    // 2. Buscador y Filtro por Estado Epistemológico
    const searchInput = document.getElementById('search-input');
    const filterStatus = document.getElementById('filter-status');

    function filterItems() {
      const q = searchInput.value.toLowerCase().trim();
      const status = filterStatus.value;

      document.querySelectorAll('.timeline-node, .claim-card').forEach(el => {
        const id = el.dataset.id;
        const itemStatus = el.dataset.status;
        if (!id) return;

        const statement = (el.querySelector('.card-statement')?.textContent || '').toLowerCase();

        const matchesQuery = !q || statement.includes(q) || id.toLowerCase().includes(q);
        const matchesStatus = status === 'all' || itemStatus === status;

        if (matchesQuery && matchesStatus) {
          el.classList.remove('is-hidden');
        } else {
          el.classList.add('is-hidden');
        }
      });
    }

    searchInput.addEventListener('input', filterItems);
    filterStatus.addEventListener('change', filterItems);

    document.querySelectorAll('[data-claim-id]').forEach(card => {
      card.addEventListener('click', () => openClaimDrawer(card.dataset.claimId));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openClaimDrawer(card.dataset.claimId);
        }
      });
    });
    document.querySelectorAll('[data-place-id]').forEach(button => {
      button.addEventListener('click', () => openPlaceDrawer(button.dataset.placeId));
    });
    document.addEventListener('click', event => {
      const target = event.target instanceof Element
        ? event.target.closest('[data-cha-action], [data-cha-open-place]')
        : null;
      if (!target) return;
      if (target.getAttribute('data-cha-action') === 'close-claim-drawer') closeClaimDrawer();
      const placeId = target.getAttribute('data-cha-open-place');
      if (placeId) openPlaceDrawer(placeId);
    });
    document.addEventListener('submit', event => {
      const form = event.target instanceof Element ? event.target.closest('#assistance-form') : null;
      if (!form) return;
      handleAssistanceQuery(event);
    });
    document.querySelectorAll('[data-cha-open-place]').forEach(node => {
      node.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openPlaceDrawer(node.getAttribute('data-cha-open-place'));
      });
    });

    // 3. Drawer Lateral de Detalle Factual
    const drawer = document.getElementById('detail-drawer');
    const overlay = document.getElementById('drawer-overlay');
    let detailSequence = 0;
    let pendingClaimController = null;

    function cancelPendingClaimDetail() {
      detailSequence += 1;
      if (pendingClaimController) pendingClaimController.abort();
      pendingClaimController = null;
    }

    async function openClaimDrawer(claimId) {
      if (!claimId) return;
      cancelPendingClaimDetail();
      const sequence = detailSequence;
      const controller = new AbortController();
      pendingClaimController = controller;
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const badge = document.getElementById('detail-badge');
      const sourcesDiv = document.getElementById('detail-sources');
      sourcesDiv.replaceChildren();
      const limUl = document.getElementById('detail-limitations');
      limUl.replaceChildren();
      const provLink = document.getElementById('detail-prov-link');
      badge.className = 'badge badge-unknown';
      badge.textContent = 'Cargando';
      document.getElementById('drawer-title').textContent = 'Detalle Factual';
      document.getElementById('detail-statement').textContent = 'Cargando evidencia...';
      document.getElementById('detail-id').textContent = claimId;
      appendText(sourcesDiv, 'p', 'source-locator', 'Consultando fuentes localizables...');
      provLink.classList.add('is-hidden');
      provLink.textContent = 'W3C PROV-O (JSON-LD)';

      drawer.classList.add('open');
      overlay.classList.add('open');

      try {
        const response = await fetch('/v1/claims/' + encodeURIComponent(claimId), {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const claim = await response.json();
        if (sequence !== detailSequence) return;
        if (controller.signal.aborted) throw new Error('Claim timeout');
        if (claim?.data?.id !== claimId ||
            typeof claim?.data?.attributes?.statement !== 'string' ||
            !['documented', 'inferred', 'disputed', 'hypothesis', 'forecast', 'unknown'].includes(claim.evidenceStatus) ||
            !Array.isArray(claim.sources) || !Array.isArray(claim.limitations)) {
          throw new Error('Invalid claim response');
        }

        badge.className = 'badge badge-' + claim.evidenceStatus;
        badge.textContent = claim.evidenceStatus;
        document.getElementById('detail-statement').textContent = claim.data.attributes.statement;
        sourcesDiv.replaceChildren();
        if (claim.sources.length === 0) {
          appendText(sourcesDiv, 'p', 'source-locator', 'Sin fuentes directas asociadas.');
        } else {
          claim.sources.forEach(source => {
            const sBox = document.createElement('div');
            sBox.className = 'source-box';
            appendText(sBox, 'div', 'source-title', source.sourceName || 'Fuente sin título');
            const locator = source.locator?.type && source.locator?.value
              ? source.locator.type + ':' + source.locator.value : 'No especificado';
            appendSourceLine(sBox, 'Localizador: ', locator);
            appendSourceLine(sBox, 'Tipo: ', source.sourceType || 'No especificado');
            appendSourceLine(sBox, 'Licencia dataset: ', source.rights?.datasetLicense || 'No verificada');
            appendSourceLine(sBox, 'Hash SHA-256: ', source.contentHash || 'No disponible', 'source-hash');
            sourcesDiv.appendChild(sBox);
          });
        }

        if (claim.limitations.length === 0) {
          appendText(limUl, 'li', '', 'Sin limitaciones registradas para este enunciado.');
        } else {
          claim.limitations.forEach(limit => appendText(limUl, 'li', '', limit));
        }
        provLink.href = '/v1/claims/' + encodeURIComponent(claimId) + '/prov';
        provLink.classList.remove('is-hidden');
      } catch (error) {
        if (sequence !== detailSequence) return;
        badge.className = 'badge badge-unknown';
        badge.textContent = 'No verificado';
        const limited = error instanceof Error && error.message === 'HTTP 429';
        document.getElementById('detail-statement').textContent = limited
          ? 'Se alcanzó el límite de consultas. Intente nuevamente más tarde.'
          : 'El detalle de evidencia no está disponible en este momento.';
        sourcesDiv.replaceChildren();
        appendText(sourcesDiv, 'p', 'source-locator', 'No se muestran fuentes sin una respuesta verificada.');
        limUl.replaceChildren();
        appendText(limUl, 'li', '', 'La solicitud de detalle falló o excedió el tiempo de espera.');
      } finally {
        clearTimeout(timeoutId);
        if (sequence === detailSequence) pendingClaimController = null;
      }
    }

    function closeClaimDrawer() {
      cancelPendingClaimDetail();
      drawer.classList.remove('open');
      overlay.classList.remove('open');
    }

    // 3.b Drawer para Atestaciones Territoriales
    function openPlaceDrawer(placeAttestationId) {
      const attestation = PLACES_DATA.find(p => p.id === placeAttestationId);
      if (!attestation) return;
      cancelPendingClaimDetail();

      document.getElementById('detail-badge').className = 'badge badge-' + (attestation.certainty === 'exact' ? 'documented' : 'disputed');
      document.getElementById('detail-badge').textContent = 'Territorio: ' + attestation.certainty;

      document.getElementById('drawer-title').textContent = attestation.placeName;
      document.getElementById('detail-statement').textContent = attestation.notes || 'Atestación territorial documentada en el corpus piloto.';
      document.getElementById('detail-id').textContent = 'ID: ' + attestation.id + ' | WGS84: ' + attestation.coordinates.latitude + ', ' + attestation.coordinates.longitude;

      const sourcesDiv = document.getElementById('detail-sources');
      sourcesDiv.replaceChildren();
      const sBox = document.createElement('div');
      sBox.className = 'source-box';
      appendText(sBox, 'div', 'source-title', attestation.sourceName);
      appendSourceLine(sBox, 'Demarcación: ', attestation.territoryType);
      appendSourceLine(sBox, 'Vigencia: ', attestation.timeRange.fromYear + (attestation.timeRange.toYear ? ' - ' + attestation.timeRange.toYear : ''));
      appendSourceLine(sBox, 'Derechos: ', attestation.license?.itemRights || 'No verificados');
      appendSourceLine(sBox, 'Política: ', attestation.license?.redistributionPolicy || 'No verificada');
      appendSourceLine(sBox, 'Atribución: ', attestation.license?.requiredAttribution || 'No verificada');
      const sourceUrl = safeHttpUrl(attestation.sourceUrl);
      if (sourceUrl) {
        const link = appendText(sBox, 'a', 'source-locator', 'Ver fuente cartográfica ↗');
        link.href = sourceUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      sourcesDiv.appendChild(sBox);

      const limUl = document.getElementById('detail-limitations');
      limUl.replaceChildren();
      appendText(limUl, 'li', '', 'Certeza cartográfica: ' + attestation.certainty + '. La delimitación histórica refleja la atestación de la fuente citada, no una soberanía o frontera eterna.');

      const provLink = document.getElementById('detail-prov-link');
      provLink.href = '/v1/places/geojson?placeId=' + encodeURIComponent(attestation.placeId);
      provLink.textContent = 'GeoJSON RFC 7946';
      provLink.classList.remove('is-hidden');

      drawer.classList.add('open');
      overlay.classList.add('open');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeClaimDrawer();
    });

    // 4. Asistencia con Citas
    async function handleAssistanceQuery(event) {
      event.preventDefault();
      const input = document.getElementById('assistance-input');
      const output = document.getElementById('assistance-output');
      const submitBtn = document.getElementById('assistance-submit-btn');

      const queryText = input.value.trim();
      if (!queryText) return;

      submitBtn.disabled = true;
      output.replaceChildren();
      appendText(output, 'p', 'source-locator', 'Consultando evidencia y verificando citas en el corpus canónico...');

      try {
        const res = await fetch('/v1/assistance/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryText })
        });

        const envelope = await res.json();
        submitBtn.disabled = false;
        output.replaceChildren();

        if (!res.ok) {
          appendText(output, 'p', 'source-locator', 'Error: ' + (envelope.message || envelope.code || 'Error en consulta'));
          return;
        }

        const data = envelope.data;
        if (!data || typeof data.answer !== 'string' || !Array.isArray(data.citations)) {
          appendText(output, 'p', 'source-locator', 'Respuesta de asistencia no válida.');
          return;
        }
        appendText(output, 'span', 'badge', data.evidenceStatus || 'unknown');
        const answer = appendText(output, 'p', 'assistance-answer', data.answer);
        if (data.abstained) answer.classList.add('assistance-answer-abstained');
        if (data.citations.length > 0) {
          const citations = document.createElement('div');
          appendText(citations, 'span', 'detail-label', 'Citas verificadas en documentos originales:');
          data.citations.forEach(citation => {
            const source = document.createElement('div');
            source.className = 'source-box';
            appendText(source, 'div', 'source-title', citation.sourceName || 'Fuente sin título');
            appendSourceLine(source, 'Localizador: ', citation.locator?.value || 'No especificado');
            appendText(source, 'p', 'source-locator', citation.quoteExcerpt || '');
            citations.appendChild(source);
          });
          output.appendChild(citations);
        }
      } catch (err) {
        submitBtn.disabled = false;
        output.replaceChildren();
        appendText(output, 'p', 'source-locator', 'Error de conexión con el servicio de asistencia.');
      }
    }
  </script>
</body>
</html>`
  }
}
