import { test } from '@japa/runner'
import { placeRepository } from '#modules/geography/infrastructure/public_places'

test.group('GET / (Web Explorer Citizen Interface)', () => {
  test('returns interactive HTML with a nonce-bound Content Security Policy', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/')

    response.assertStatus(200)
    assert.include(response.header('content-type') ?? '', 'text/html')
    response.assertHeader('x-content-type-options', 'nosniff')
    response.assertHeader('x-frame-options', 'DENY')
    response.assertHeader('referrer-policy', 'strict-origin-when-cross-origin')
    response.assertHeader(
      'permissions-policy',
      'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
    )
    response.assertHeader('cache-control', 'no-store')

    const html = response.text()
    const nonce = html.match(/<script nonce="([^"]+)">/)?.[1]
    assert.isDefined(nonce)
    assert.match(nonce!, /^[A-Za-z0-9+/]{24}$/)
    assert.include(html, `<style nonce="${nonce}">`)
    const policy = response.header('content-security-policy') ?? ''
    assert.include(policy, `script-src 'nonce-${nonce}'`)
    assert.include(policy, `style-src 'self' 'nonce-${nonce}'`)
    assert.include(policy, "style-src-attr 'none'")
    assert.notMatch(html, /\son[a-z]+\s*=/i)
    assert.notMatch(html, /\sstyle\s*=/i)
    assert.notMatch(html, /fonts\.(?:googleapis|gstatic)\.com/i)
    assert.include(html, 'font-family: system-ui, -apple-system, BlinkMacSystemFont')
    assert.include(html, '<form id="assistance-form" class="query-form">')
    assert.include(html, "document.addEventListener('submit'")

    // 1. Verificación de SEO Best Practices
    assert.include(
      html,
      '<title>Chile Historia Abierta — Explorador Ciudadano y Evidencia Histórica</title>'
    )
    assert.include(html, '<meta name="description"')
    assert.include(html, '<h1>Chile Historia Abierta</h1>')

    // 2. Verificación de Vistas Sincronizadas (ADR 0003)
    assert.include(html, 'id="tab-timeline"')
    assert.include(html, 'id="tab-map"')
    assert.include(html, 'id="tab-list"')
    assert.include(html, 'id="tab-series"')
    assert.include(html, 'id="tab-assistance"')

    // 2.b Verificación de Vista Mapa Territorial SVG y Tabla Accesible
    assert.include(html, 'id="view-map"')
    assert.include(html, 'id="chile-map-svg"')
    assert.include(html, 'Cartografía Histórica')
    assert.include(html, 'accessible-places-table')
    assert.include(html, '/v1/places/geojson')

    // 3. Verificación de contenido del corpus piloto y badges epistémicos
    assert.include(html, 'badge-documented')
    assert.include(html, 'Tasa de Política Monetaria')
    assert.include(html, 'Banco Central de Chile')

    // 4. Verificación de Gráfico SVG con incertidumbre P10-P50-P90
    assert.include(html, '<svg class="chart-svg"')
    assert.include(html, 'Abanico P10-P90')
    assert.include(html, 'MAE Modelo: 0.1822')

    // 5. Verificación de Drawer Factual y Citas
    assert.include(html, 'id="detail-drawer"')
    assert.include(html, 'id="detail-statement"')
    assert.include(html, 'id="detail-sources"')
    assert.include(html, 'id="detail-prov-link"')

    // 6. Verificación de Enlaces de Interoperabilidad
    assert.include(html, '/openapi.json')
    assert.include(html, '/v1/explore')
    assert.include(html, '/v1/mcp')

    const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1]
    assert.isString(script)
    assert.doesNotThrow(() => new Function(script!))
  })

  test('emits a fresh CSP nonce even when a client sends If-None-Match', async ({
    client,
    assert,
  }) => {
    const first = await client.get('/')
    first.assertStatus(200)

    const firstNonce = first.text().match(/<script nonce="([^"]+)">/)?.[1]
    const second = await client.get('/').header('if-none-match', '"stale-validator"')
    second.assertStatus(200)
    const secondNonce = second.text().match(/<script nonce="([^"]+)">/)?.[1]
    assert.isDefined(firstNonce)
    assert.isDefined(secondNonce)
    assert.notEqual(secondNonce, firstNonce)
    assert.include(second.header('content-security-policy') ?? '', `nonce-${secondNonce}`)
  })

  test('deja el sobre de evidencia fuera del HTML inicial y lo sirve por ruta propia', async ({
    client,
    assert,
  }) => {
    const home = await client.get('/')
    home.assertStatus(200)
    assert.notInclude(home.text(), 'a'.repeat(64))

    const claim = await client.get('/v1/claims/fixture-claim-001')
    claim.assertStatus(200)
    assert.include(claim.text(), 'a'.repeat(64))
  })

  test('renders adversarial place fields as text under a restrictive script policy', async ({
    client,
    assert,
  }) => {
    const before = await client.get('/')
    before.assertStatus(200)

    const maliciousName =
      '</script><script>window.placeInjected=1</script><img src=x onerror=alert(1)>'
    const safeId = 'place-adversarial-test'
    await placeRepository.save({
      id: safeId,
      placeId: 'synthetic-adversarial-place',
      placeName: maliciousName,
      territoryType: 'site',
      coordinates: { latitude: -33, longitude: -70 },
      timeRange: { fromYear: 2000 },
      certainty: 'disputed',
      sourceId: 'synthetic-source',
      sourceName: '<svg onload=alert(1)>',
      sourceUrl: 'javascript:alert(1)',
      evidenceStatus: 'unknown',
      license: {
        softwareLicense: 'UNLICENSED',
        datasetLicense: 'UNLICENSED',
        itemRights: 'Synthetic test only',
        redistributionPolicy: 'No redistribution',
        requiredAttribution: 'Synthetic test',
      },
    })

    const after = await client.get('/')
    after.assertStatus(200)
    const html = after.text()
    const nonce = html.match(/<script nonce="([^"]+)">/)?.[1]
    assert.isDefined(nonce)
    assert.include(after.header('content-security-policy') ?? '', `script-src 'nonce-${nonce}'`)
    assert.include(html, '&lt;/script&gt;&lt;script&gt;window.placeInjected=1')
    assert.notInclude(html, maliciousName)
    assert.notInclude(html, '<svg onload=alert(1)>')
    assert.notInclude(html, `onclick="openPlaceDrawer('${safeId}')"`)
    assert.include(html, `data-place-id="${safeId}"`)
    assert.include(html, '\\u003csvg onload=alert(1)\\u003e')
  })

  test('limita solicitudes repetidas a la portada antes de consultar el explorador', async ({
    client,
    assert,
  }) => {
    let blockedResponse: Awaited<ReturnType<typeof client.get>> | undefined

    for (let index = 0; index < 61; index++) {
      const response = await client.get('/')
      if (response.status() === 429) {
        blockedResponse = response
        break
      }
      response.assertStatus(200)
    }

    assert.isDefined(blockedResponse)
    blockedResponse!.assertStatus(429)
    assert.isAbove(Number(blockedResponse!.header('retry-after')), 0)
    const body = blockedResponse!.body() as { error?: { code?: string } }
    assert.equal(body.error?.code, 'E_RATE_LIMITED')
  })
})
