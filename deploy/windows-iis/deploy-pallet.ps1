#Requires -RunAsAdministrator
<#
  Setup + deploy PaletFaktur ke IIS sebagai virtual app "pallet" di bawah site SynteraERP
  (https://demo.arunapps.com/pallet/), meniru pola Aruna Ticketing. Idempoten; aman dijalankan ulang untuk update.
  git pull -> app pool/DB/login -> dotnet publish -> web.config -> frontend build -> service NSSM -> smoke test.
  appsettings.Production.json dibuat sekali (Jwt:Key + password admin acak) dan tidak pernah ditimpa.
#>
[CmdletBinding()]
param(
    [string]$RepoPath    = 'C:\Users\Administrator\repos\paletfaktur-app',
    [string]$SitePath    = 'C:\inetpub\ArunaPallet',
    [string]$ParentSite  = 'SynteraERP',
    [string]$AppName     = 'pallet',
    [string]$PoolName    = 'ArunaPalletPool',
    [string]$ServiceName = 'ArunaPalletFrontend',
    [string]$Nssm        = 'C:\Tools\nssm\nssm.exe',
    [string]$SqlServer   = '.\SQLEXPRESS',
    [string]$Database    = 'PaletFakturDb',
    [int]   $FrontendPort = 4030,
    [string]$BaseUrl     = 'https://demo.arunapps.com/pallet',
    [switch]$SkipPull
)
$ErrorActionPreference = 'Stop'
Import-Module WebAdministration
function Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Run($exe, [string[]]$a) { $ErrorActionPreference = 'Continue'; & $exe @a 2>&1 | ForEach-Object { "$_" } | Write-Host; if ($LASTEXITCODE -ne 0) { throw "$exe $($a -join ' ') gagal (exit $LASTEXITCODE)" } }
function Invoke-Sql([string]$Query, [string]$Db = 'master') { & SQLCMD.EXE -S $SqlServer -C -E -b -d $Db -Q $Query; if ($LASTEXITCODE -ne 0) { throw 'sqlcmd gagal' } }

$poolIdentity = "IIS APPPOOL\$PoolName"
$frontend = Join-Path $RepoPath 'frontend'
$api      = Join-Path $RepoPath 'backend\PaletFaktur.Api'

if (-not $SkipPull) { Step 'git pull'; Run git @('-C', $RepoPath, 'pull', '--ff-only') }

Step "App pool $PoolName"
if (-not (Test-Path "IIS:\AppPools\$PoolName")) { New-WebAppPool -Name $PoolName | Out-Null }
Set-ItemProperty "IIS:\AppPools\$PoolName" -Name managedRuntimeVersion -Value ''
Set-ItemProperty "IIS:\AppPools\$PoolName" -Name processModel.identityType -Value 'ApplicationPoolIdentity'

Step 'Folder dan ACL'
New-Item -ItemType Directory -Force "$SitePath\logs", "$SitePath\wwwroot\uploads" | Out-Null
icacls $SitePath /grant "${poolIdentity}:(OI)(CI)RX" | Out-Null
icacls "$SitePath\logs" /grant "${poolIdentity}:(OI)(CI)M" | Out-Null
icacls "$SitePath\wwwroot\uploads" /grant "${poolIdentity}:(OI)(CI)M" | Out-Null

Step "Database $Database + login $poolIdentity"
Invoke-Sql "IF DB_ID(N'$Database') IS NULL CREATE DATABASE [$Database];"
Invoke-Sql "IF SUSER_ID(N'$poolIdentity') IS NULL CREATE LOGIN [$poolIdentity] FROM WINDOWS;"
Invoke-Sql "IF USER_ID(N'$poolIdentity') IS NULL CREATE USER [$poolIdentity] FOR LOGIN [$poolIdentity];" $Database
Invoke-Sql "IF IS_ROLEMEMBER('db_owner', N'$poolIdentity') <> 1 ALTER ROLE db_owner ADD MEMBER [$poolIdentity];" $Database

$secrets = Join-Path $SitePath 'appsettings.Production.json'
if (-not (Test-Path $secrets)) {
    Step 'Buat appsettings.Production.json (secret acak)'
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $b = New-Object byte[] 48; $rng.GetBytes($b); $jwt = [Convert]::ToBase64String($b)
    $b = New-Object byte[] 12; $rng.GetBytes($b); $pw = ([Convert]::ToBase64String($b) -replace '[^A-Za-z0-9]', 'x') + 'aA1!'
    $rng.Dispose()
    [ordered]@{
        ConnectionStrings = [ordered]@{ DefaultConnection = "Server=$SqlServer;Database=$Database;Integrated Security=True;TrustServerCertificate=True" }
        Jwt       = [ordered]@{ Issuer = 'PaletFaktur.Api'; Audience = 'PaletFaktur.Client'; Key = $jwt }
        Bootstrap = [ordered]@{ AdminPassword = $pw }
        Cors      = [ordered]@{ AllowedOrigins = @('https://demo.arunapps.com') }
    } | ConvertTo-Json -Depth 5 | Set-Content $secrets -Encoding utf8
    icacls $secrets /inheritance:r /grant 'BUILTIN\Administrators:F' 'NT AUTHORITY\SYSTEM:F' "${poolIdentity}:R" | Out-Null
    $cred = 'C:\ArunaData\pallet-admin-credentials.txt'
    New-Item -ItemType Directory -Force (Split-Path $cred) | Out-Null
    "username: admin`npassword: $pw" | Set-Content $cred -Encoding ascii
    icacls $cred /inheritance:r /grant 'BUILTIN\Administrators:F' | Out-Null
    Write-Host "    kredensial admin: $cred"
}

$envFile = Join-Path $frontend '.env.production'
Set-Content $envFile "NEXT_PUBLIC_BASE_PATH=/$AppName`nNEXT_PUBLIC_API_BASE_URL=/$AppName/api" -Encoding ascii

Step "Stop app pool $PoolName"
if ((Get-WebAppPoolState $PoolName).Value -ne 'Stopped') {
    Stop-WebAppPool $PoolName
    for ($i = 0; $i -lt 30 -and (Get-WebAppPoolState $PoolName).Value -ne 'Stopped'; $i++) { Start-Sleep 1 }
}
try {
    Step 'dotnet publish backend'
    Run dotnet @('publish', "$api\PaletFaktur.Api.csproj", '-c', 'Release', '-o', $SitePath, '--nologo')
    Copy-Item (Join-Path $PSScriptRoot 'web.config') (Join-Path $SitePath 'web.config') -Force
}
finally { Start-WebAppPool $PoolName }

Step "Aplikasi $ParentSite/$AppName"
if (-not (Get-WebApplication -Site $ParentSite -Name $AppName)) {
    Copy-Item "$env:windir\System32\inetsrv\config\applicationHost.config" "C:\Backup\applicationHost.config.$(Get-Date -Format yyyyMMdd-HHmmss).bak"
    New-WebApplication -Site $ParentSite -Name $AppName -PhysicalPath $SitePath -ApplicationPool $PoolName | Out-Null
}

Step 'Frontend: npm ci + build'
if (Get-Service $ServiceName -ErrorAction SilentlyContinue) { Run $Nssm @('stop', $ServiceName) }
Push-Location $frontend
try { Run npm @('ci'); Run npm @('run', 'build') } finally { Pop-Location }

Step "Service $ServiceName"
if (-not (Get-Service $ServiceName -ErrorAction SilentlyContinue)) {
    $node = (Get-Command node).Source
    $next = Join-Path $frontend 'node_modules\next\dist\bin\next'
    Run $Nssm @('install', $ServiceName, $node, "`"$next`" start -p $FrontendPort")
    Run $Nssm @('set', $ServiceName, 'AppDirectory', $frontend)
    Run $Nssm @('set', $ServiceName, 'Start', 'SERVICE_AUTO_START')
    Run $Nssm @('set', $ServiceName, 'AppEnvironmentExtra', 'NODE_ENV=production')
    Run $Nssm @('set', $ServiceName, 'AppStdout', 'C:\ArunaData\logs\pallet-frontend.out.log')
    Run $Nssm @('set', $ServiceName, 'AppStderr', 'C:\ArunaData\logs\pallet-frontend.err.log')
    Run $Nssm @('set', $ServiceName, 'AppRotateFiles', '1')
}
& $Nssm start $ServiceName 2>&1 | Out-Null   # exit 1 + START_PENDING itu normal; status diverifikasi smoke test

Step 'Smoke test'
Start-Sleep 8
function Probe($url, [int]$expect) {
    try { $code = (Invoke-WebRequest $url -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 90).StatusCode }
    catch { $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 } }
    Write-Host ("    {0,-55} {1} (harap {2})" -f $url, $code, $expect)
    $code -eq $expect
}
$r = @((Probe "http://localhost:$FrontendPort/$AppName/login" 200), (Probe "$BaseUrl/login" 200), (Probe "$BaseUrl/api/settings" 401))
if ($r -contains $false) { throw 'Smoke test gagal.' }
Write-Host "LIVE: $BaseUrl" -ForegroundColor Green
