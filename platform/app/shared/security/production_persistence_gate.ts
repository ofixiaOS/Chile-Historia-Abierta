import ApiError from '#shared/errors/api_error'

export interface RepositoryConfiguration {
  readonly claims: string
  readonly publications?: string
  readonly community?: string
  readonly assistance?: string
  readonly statistics?: string
  readonly places?: string
}

export function databaseTlsOptions(
  nodeEnvironment: string,
  ca?: string
): false | { rejectUnauthorized: true; ca?: string } {
  if (nodeEnvironment !== 'production') return false
  return { rejectUnauthorized: true, ...(ca ? { ca } : {}) }
}

export function databaseAccessPolicy(
  nodeEnvironment: string,
  processRole: string | undefined
): {
  readonly defaultConnection: 'admin' | 'public'
  readonly includeAdminConnection: boolean
  readonly includePublicConnection: boolean
} {
  const productionWeb = nodeEnvironment === 'production' && processRole === 'web'
  const productionMigration = nodeEnvironment === 'production' && processRole === 'migration'
  return {
    defaultConnection: productionWeb ? 'public' : 'admin',
    includeAdminConnection: !productionWeb,
    includePublicConnection: !productionMigration,
  }
}

export function assertProductionHttpProcessRole(
  nodeEnvironment: string,
  processRole: string | undefined
): void {
  if (nodeEnvironment === 'production' && processRole !== 'web') {
    throw new ApiError(
      'E_PRODUCTION_HTTP_ROLE_REQUIRED',
      'El servidor HTTP de producción requiere CHA_PROCESS_ROLE=web',
      500
    )
  }
}

export function assertDatabaseCredentialPolicy(
  nodeEnvironment: string,
  processRole: string | undefined,
  adminUser: string | undefined,
  adminPassword: string | undefined,
  publicUser: string | undefined,
  publicPassword: string | undefined
): void {
  const hasAdminCredentials = Boolean(adminUser || adminPassword)
  const hasPublicCredentials = Boolean(publicUser || publicPassword)

  if (nodeEnvironment === 'production' && !['web', 'migration'].includes(processRole ?? '')) {
    throw new ApiError(
      'E_PRODUCTION_PROCESS_ROLE_REQUIRED',
      'Producción requiere CHA_PROCESS_ROLE=web o CHA_PROCESS_ROLE=migration',
      500
    )
  }

  if (nodeEnvironment === 'production' && processRole === 'web' && hasAdminCredentials) {
    throw new ApiError(
      'E_PRODUCTION_ADMIN_CREDENTIALS_FORBIDDEN',
      'El proceso web de producción no debe recibir credenciales administrativas de base de datos',
      500
    )
  }

  if (nodeEnvironment === 'production' && processRole === 'migration' && hasPublicCredentials) {
    throw new ApiError(
      'E_PRODUCTION_PUBLIC_CREDENTIALS_FORBIDDEN',
      'El proceso de migración de producción no debe recibir credenciales públicas de base de datos',
      500
    )
  }

  if (nodeEnvironment === 'production' && processRole === 'web' && !publicUser && !publicPassword) {
    throw new ApiError(
      'E_PUBLIC_CREDENTIALS_REQUIRED',
      'El proceso web de producción requiere credenciales PostgreSQL públicas',
      500
    )
  }

  if (hasPublicCredentials && (!publicUser || !publicPassword)) {
    throw new ApiError(
      'E_PUBLIC_CREDENTIALS_INCOMPLETE',
      'DB_PUBLIC_USER y DB_PUBLIC_PASSWORD deben configurarse juntos',
      500
    )
  }

  if (nodeEnvironment !== 'production' && (!publicUser || !publicPassword)) {
    throw new ApiError(
      'E_PUBLIC_CREDENTIALS_REQUIRED',
      'Este proceso requiere credenciales PostgreSQL públicas',
      500
    )
  }

  if (
    (nodeEnvironment !== 'production' || processRole === 'migration') &&
    (!adminUser || !adminPassword)
  ) {
    throw new ApiError(
      'E_ADMIN_CREDENTIALS_REQUIRED',
      'Este proceso requiere credenciales administrativas para migraciones',
      500
    )
  }
}

export function assertEditorialWritesAllowed(nodeEnvironment: string): void {
  if (nodeEnvironment === 'production') {
    throw new ApiError(
      'E_WRITE_DISABLED',
      'La escritura editorial HTTP está deshabilitada en producción hasta aislar el proceso escritor',
      503
    )
  }
}

export function assertReleaseOperationsAllowed(nodeEnvironment: string): void {
  if (nodeEnvironment === 'production') {
    throw new ApiError(
      'E_RELEASE_OPERATIONS_DISABLED',
      'Los comandos de publicación requieren un proceso escritor autorizado, aún no disponible en producción',
      503
    )
  }
}

export function assertProductionPersistence(
  nodeEnvironment: string,
  repositories: RepositoryConfiguration
): void {
  if (nodeEnvironment !== 'production') return

  const nonPersistent = Object.entries(repositories)
    .filter(([, repository]) => repository !== 'postgres')
    .map(([name]) => name)

  if (nonPersistent.length > 0) {
    throw new ApiError(
      'E_PRODUCTION_PERSISTENCE_REQUIRED',
      `Producción requiere PostgreSQL para todos los módulos públicos: ${nonPersistent.join(', ')}`,
      500,
      { modules: nonPersistent }
    )
  }
}
