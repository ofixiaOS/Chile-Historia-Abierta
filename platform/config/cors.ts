import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  /**
   * Enable or disable CORS handling globally.
   */
  enabled: true,

  /**
   * In development, allow every origin to simplify local front/backend setup.
   * In production, keep an explicit allowlist (empty by default, so no
   * cross-origin browser access is allowed until configured).
   */
  origin: app.inDev ? true : [],

  /**
   * HTTP methods exposed by this API.
   */
  methods: ['GET', 'HEAD', 'POST'],

  /**
   * Allow only headers used by JSON requests, Bearer auth and cache
   * validators.
   */
  headers: ['Content-Type', 'Authorization', 'If-None-Match', 'If-Match'],

  /**
   * Response headers exposed to the browser.
   */
  exposeHeaders: [],

  /**
   * The application does not authenticate users with cookies.
   */
  credentials: false,

  /**
   * Cache CORS preflight response for N seconds.
   */
  maxAge: 90,
})

export default corsConfig
