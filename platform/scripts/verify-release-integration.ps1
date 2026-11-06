$ErrorActionPreference = 'Stop'
$containerName = 'cha_release_test_' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$started = $false
$temporaryCertificateDirectory = Join-Path $env:TEMP ('cha-release-tls-' + [guid]::NewGuid().ToString('N'))
$certificatePath = Join-Path $temporaryCertificateDirectory 'server.crt'
$untrustedCertificatePath = Join-Path $temporaryCertificateDirectory 'untrusted-root.crt'
$privateKeyPath = Join-Path $temporaryCertificateDirectory 'server.key'
$resolvedTempRoot = [System.IO.Path]::GetFullPath($env:TEMP)
$resolvedCertificateDirectory = [System.IO.Path]::GetFullPath($temporaryCertificateDirectory)
if (-not $resolvedCertificateDirectory.StartsWith($resolvedTempRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Temporary certificate path escaped TEMP'
}
$environmentNames = @(
  'NODE_ENV', 'CHA_PROCESS_ROLE', 'CLAIM_REPOSITORY', 'PUBLICATION_REPOSITORY',
  'COMMUNITY_REPOSITORY', 'ASSISTANCE_RETRIEVER', 'STATISTICS_REPOSITORY', 'PLACE_REPOSITORY',
  'DB_ADMIN_USER', 'DB_ADMIN_PASSWORD', 'DB_PUBLIC_USER', 'DB_PUBLIC_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_SSL_CA'
)
$savedEnvironment = @{}
foreach ($name in $environmentNames) {
  $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

function Invoke-Checked {
  param([string]$Program, [string[]]$Arguments)
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Program failed with exit code $LASTEXITCODE"
  }
}

if (Get-NetTCPConnection -LocalPort 55432 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Port 55432 is already in use; refusing to touch an existing database'
}

try {
  [System.IO.Directory]::CreateDirectory($resolvedCertificateDirectory) | Out-Null
  $rsa = [System.Security.Cryptography.RSA]::Create(2048)
  $certificateRequest = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
    'CN=127.0.0.1', $rsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256,
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
  )
  $subjectAltNames = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
  $subjectAltNames.AddIpAddress([System.Net.IPAddress]::Parse('127.0.0.1'))
  $subjectAltNames.AddDnsName('localhost')
  $certificateRequest.CertificateExtensions.Add($subjectAltNames.Build())
  $certificateRequest.CertificateExtensions.Add(
    [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($true, $false, 0, $true)
  )
  $certificateRequest.CertificateExtensions.Add(
    [System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new(
      [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor
        [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment -bor
        [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyCertSign,
      $true
    )
  )
  $certificate = $certificateRequest.CreateSelfSigned(
    [DateTimeOffset]::UtcNow.AddMinutes(-1), [DateTimeOffset]::UtcNow.AddHours(1)
  )
  [System.IO.File]::WriteAllText($certificatePath, $certificate.ExportCertificatePem(), [System.Text.Encoding]::ASCII)
  [System.IO.File]::WriteAllText($privateKeyPath, $rsa.ExportPkcs8PrivateKeyPem(), [System.Text.Encoding]::ASCII)
  $env:DB_SSL_CA = Get-Content -LiteralPath $certificatePath -Raw
  $certificate.Dispose()
  $rsa.Dispose()

  $untrustedRsa = [System.Security.Cryptography.RSA]::Create(2048)
  $untrustedRequest = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new(
    'CN=untrusted-test-root', $untrustedRsa, [System.Security.Cryptography.HashAlgorithmName]::SHA256,
    [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
  )
  $untrustedRequest.CertificateExtensions.Add(
    [System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($true, $false, 0, $true)
  )
  $untrustedCertificate = $untrustedRequest.CreateSelfSigned(
    [DateTimeOffset]::UtcNow.AddMinutes(-1), [DateTimeOffset]::UtcNow.AddHours(1)
  )
  [System.IO.File]::WriteAllText($untrustedCertificatePath, $untrustedCertificate.ExportCertificatePem(), [System.Text.Encoding]::ASCII)
  $untrustedCa = Get-Content -LiteralPath $untrustedCertificatePath -Raw
  $untrustedCertificate.Dispose()
  $untrustedRsa.Dispose()

  Invoke-Checked -Program 'docker' -Arguments @('run', '--detach', '--rm', '--name', $containerName, '--publish', '127.0.0.1:55432:5432', '--env', 'POSTGRES_DB=chile_historia_abierta', '--env', 'POSTGRES_USER=postgres', '--env', 'POSTGRES_PASSWORD=isolated_release_test_password', 'postgres:16-alpine')
  $started = $true

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    & docker exec $containerName pg_isready -U postgres -d chile_historia_abierta -q 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Isolated PostgreSQL did not become ready' }

  Invoke-Checked -Program 'docker' -Arguments @('cp', 'database/bootstrap/001_roles.sql', "${containerName}:/tmp/001_roles.sql")
  Invoke-Checked -Program 'docker' -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'chile_historia_abierta', '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/001_roles.sql')
  # Reproduce the permissive PUBLIC schema grant found in legacy PostgreSQL databases.
  Invoke-Checked -Program 'docker' -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'chile_historia_abierta', '-v', 'ON_ERROR_STOP=1', '-c', 'GRANT CREATE ON SCHEMA public TO PUBLIC')

  # Enable real PostgreSQL TLS for the production migration-mode connection test.
  Invoke-Checked -Program 'docker' -Arguments @('cp', $certificatePath, "${containerName}:/tmp/cha-server.crt")
  Invoke-Checked -Program 'docker' -Arguments @('cp', $privateKeyPath, "${containerName}:/tmp/cha-server.key")
  Invoke-Checked -Program 'docker' -Arguments @('exec', $containerName, 'sh', '-c', 'chown postgres:postgres /tmp/cha-server.crt /tmp/cha-server.key && chmod 600 /tmp/cha-server.key')
  Invoke-Checked -Program 'docker' -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'chile_historia_abierta', '-v', 'ON_ERROR_STOP=1', '-c', "ALTER SYSTEM SET ssl = 'on'")
  Invoke-Checked -Program 'docker' -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'chile_historia_abierta', '-v', 'ON_ERROR_STOP=1', '-c', "ALTER SYSTEM SET ssl_cert_file = '/tmp/cha-server.crt'")
  Invoke-Checked -Program 'docker' -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'chile_historia_abierta', '-v', 'ON_ERROR_STOP=1', '-c', "ALTER SYSTEM SET ssl_key_file = '/tmp/cha-server.key'")
  Invoke-Checked -Program 'docker' -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'chile_historia_abierta', '-v', 'ON_ERROR_STOP=1', '-c', 'SELECT pg_reload_conf()')

  # Exercise production migration mode against this temporary container with
  # the disposable credentials defined by database/bootstrap/001_roles.sql.
  $env:NODE_ENV = 'production'
  $env:CHA_PROCESS_ROLE = 'migration'
  $env:DB_ADMIN_USER = 'cha_owner'
  $env:DB_ADMIN_PASSWORD = 'local_owner_password'
  # Empty process values override local .env values so migration-mode verifies
  # that no public credentials are present in the child process.
  $env:DB_PUBLIC_USER = ''
  $env:DB_PUBLIC_PASSWORD = ''
  $env:CLAIM_REPOSITORY = 'postgres'
  $env:PUBLICATION_REPOSITORY = 'postgres'
  $env:COMMUNITY_REPOSITORY = 'postgres'
  $env:ASSISTANCE_RETRIEVER = 'postgres'
  $env:STATISTICS_REPOSITORY = 'postgres'
  $env:PLACE_REPOSITORY = 'postgres'
  $env:DB_HOST = '127.0.0.1'
  $env:DB_PORT = '55432'
  $trustedCa = $env:DB_SSL_CA
  $env:DB_SSL_CA = $untrustedCa
  & node ace migration:run --force
  if ($LASTEXITCODE -eq 0) {
    throw 'Production PostgreSQL connection accepted an untrusted CA'
  }
  $env:DB_SSL_CA = $trustedCa
  Invoke-Checked -Program 'node' -Arguments @('ace', 'migration:run', '--force')

  $env:NODE_ENV = 'test'
  $env:CHA_PROCESS_ROLE = 'web'
  $env:DB_PUBLIC_USER = 'cha_public'
  $env:DB_PUBLIC_PASSWORD = 'local_public_password'
  Invoke-Checked -Program 'node' -Arguments @('ace', 'test', 'integration')
} finally {
  if ($started) {
    & docker stop $containerName >$null 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Warning "Could not stop temporary container $containerName" }
  }
  foreach ($name in $environmentNames) {
    [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
  }
  if (Test-Path -LiteralPath $resolvedCertificateDirectory) {
    $resolved = (Resolve-Path -LiteralPath $resolvedCertificateDirectory).Path
    if ($resolved.StartsWith($resolvedTempRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $resolved) -like 'cha-release-tls-*') {
      Remove-Item -LiteralPath $resolved -Recurse -Force
    } else {
      throw 'Refusing to remove path outside the named temporary TLS certificate directory'
    }
  }
}
