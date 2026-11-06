$ErrorActionPreference = 'Stop'

function Invoke-Docker {
  param([string[]]$Arguments)
  $output = & docker @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: $output"
  }
  return $output
}

$containerName = 'cha_restore_probe_' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$password = [guid]::NewGuid().ToString('N')
$started = $false
$timer = [System.Diagnostics.Stopwatch]::StartNew()

try {
  Invoke-Docker -Arguments @('run', '--detach', '--rm', '--network', 'none', '--name', $containerName, '--env', "POSTGRES_PASSWORD=$password", 'postgres:16-alpine') | Out-Null
  $started = $true

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    & docker exec $containerName pg_isready -U postgres -q 2>$null
    if ($LASTEXITCODE -eq 0) {
      $ready = $true
      break
    }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) {
    throw 'PostgreSQL did not become ready within 30 seconds'
  }

  Invoke-Docker -Arguments @('exec', $containerName, 'createdb', '-U', 'postgres', 'cha_backup_probe_source') | Out-Null
  Invoke-Docker -Arguments @('exec', $containerName, 'createdb', '-U', 'postgres', 'cha_backup_probe_restored') | Out-Null
  $seedSql = 'CREATE TABLE probe (id integer PRIMARY KEY, payload text NOT NULL); INSERT INTO probe SELECT i, md5(i::text) FROM generate_series(1, 1000) AS i;'
  Invoke-Docker -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'cha_backup_probe_source', '-v', 'ON_ERROR_STOP=1', '-c', $seedSql) | Out-Null

  $dumpTimer = [System.Diagnostics.Stopwatch]::StartNew()
  Invoke-Docker -Arguments @('exec', $containerName, 'pg_dump', '-U', 'postgres', '-d', 'cha_backup_probe_source', '-Fc', '-f', '/tmp/cha_backup_probe.dump') | Out-Null
  $dumpTimer.Stop()

  $restoreTimer = [System.Diagnostics.Stopwatch]::StartNew()
  Invoke-Docker -Arguments @('exec', $containerName, 'pg_restore', '-U', 'postgres', '-d', 'cha_backup_probe_restored', '--exit-on-error', '/tmp/cha_backup_probe.dump') | Out-Null
  $restoreTimer.Stop()

  $verifySql = "SELECT count(*) || ':' || md5(string_agg(id::text || ':' || payload, ',' ORDER BY id)) FROM probe;"
  $sourceDigest = (Invoke-Docker -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'cha_backup_probe_source', '-t', '-A', '-c', $verifySql) | Out-String).Trim()
  $restoredDigest = (Invoke-Docker -Arguments @('exec', $containerName, 'psql', '-U', 'postgres', '-d', 'cha_backup_probe_restored', '-t', '-A', '-c', $verifySql) | Out-String).Trim()
  if ($sourceDigest -ne $restoredDigest -or -not $sourceDigest.StartsWith('1000:')) {
    throw "Restore mismatch: source=$sourceDigest restored=$restoredDigest"
  }

  $timer.Stop()
  Write-Output "RESTORE_SMOKE_PASS rows_and_digest=$restoredDigest dump_ms=$($dumpTimer.ElapsedMilliseconds) restore_ms=$($restoreTimer.ElapsedMilliseconds) total_ms=$($timer.ElapsedMilliseconds)"
} finally {
  if ($started) {
    & docker stop $containerName >$null 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "Could not stop temporary container $containerName"
    }
  }
}
