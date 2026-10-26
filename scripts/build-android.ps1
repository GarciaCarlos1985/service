# Compila um APK/AAB assinado localmente. Nenhum segredo vai para o código ou para argumentos.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$projectPath = Join-Path $taskRoot 'mobile/android'
$signingPath = Join-Path $taskRoot '.wrangler/mobile-signing'
$outputPath = Join-Path $taskRoot 'artifacts/mobile'
$javaTempPath = Join-Path $taskRoot '.wrangler/jtmp'
$priorJavaOptions = $env:JDK_JAVA_OPTIONS
$priorJavaHome = $env:JAVA_HOME
$priorAndroidHome = $env:ANDROID_HOME
$priorTemp = $env:TEMP
$priorTmp = $env:TMP
$javaPath = Join-Path ${env:ProgramFiles} 'Android/Android Studio/jbr'
$sdkPath = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
if (!(Test-Path -LiteralPath "$javaPath/bin/java.exe")) { throw 'Instale o Android Studio com seu JDK antes de compilar.' }
if (!(Test-Path -LiteralPath $sdkPath)) { throw 'Android SDK ausente.' }
New-Item -ItemType Directory -Path $signingPath, $outputPath, $javaTempPath -Force | Out-Null
$keyPath = Join-Path $signingPath 'service-guide.jks'
$passwordPath = Join-Path $signingPath 'password.dpapi.xml'
if ((Test-Path -LiteralPath $keyPath) -ne (Test-Path -LiteralPath $passwordPath)) {
    throw 'A chave e a senha protegida devem existir juntas. Restaure o backup; não gere outra chave por cima.'
}
try {
    $env:JAVA_HOME = $javaPath
    $env:ANDROID_HOME = $sdkPath
    # O caminho 8.3 de TEMP quebra os sockets AF_UNIX do JDK no Windows.
    $env:TEMP = $javaTempPath
    $env:TMP = $javaTempPath
    $env:JDK_JAVA_OPTIONS = "$priorJavaOptions -Djava.io.tmpdir=$javaTempPath"
    $env:SG_ANDROID_KEYSTORE = $keyPath
    if (!(Test-Path -LiteralPath $keyPath)) {
        $randomBytes = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
        $env:SG_ANDROID_STORE_PASSWORD = [Convert]::ToHexString($randomBytes)
        ConvertTo-SecureString $env:SG_ANDROID_STORE_PASSWORD -AsPlainText -Force | Export-Clixml -LiteralPath $passwordPath
        & "$javaPath/bin/keytool.exe" -genkeypair -keystore $keyPath -alias service-guide -keyalg RSA -keysize 3072 -validity 10000 -storepass:env SG_ANDROID_STORE_PASSWORD -keypass:env SG_ANDROID_STORE_PASSWORD -dname 'CN=Service Guide, OU=Mobile, O=Service Guide, L=Cacoal, ST=Rondonia, C=BR' -noprompt
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar a chave Android.' }
    } else {
        $secure = Import-Clixml -LiteralPath $passwordPath
        $env:SG_ANDROID_STORE_PASSWORD = [System.Net.NetworkCredential]::new('', $secure).Password
    }
    & "$javaPath/bin/keytool.exe" -exportcert -keystore $keyPath -alias service-guide -storepass:env SG_ANDROID_STORE_PASSWORD -file "$signingPath/certificate.der"
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao exportar o certificado público.' }
    $fingerprint = (Get-FileHash -LiteralPath "$signingPath/certificate.der" -Algorithm SHA256).Hash -replace '(..)(?=.)', '$1:'
    $assetLinksPath = Join-Path $taskRoot 'public/.well-known'
    New-Item -ItemType Directory -Path $assetLinksPath -Force | Out-Null
    $links = @(@{
        relation = @('delegate_permission/common.handle_all_urls')
        target = @{
            namespace = 'android_app'
            package_name = 'dev.serviceguide.cacoal'
            sha256_cert_fingerprints = @($fingerprint)
        }
    })
    if (!(Test-Path -LiteralPath "$assetLinksPath/assetlinks.json")) {
        ConvertTo-Json -InputObject $links -Depth 6 | Set-Content -LiteralPath "$assetLinksPath/assetlinks.json" -Encoding utf8
    } else {
        $approvedLinks = Get-Content -LiteralPath "$assetLinksPath/assetlinks.json" -Raw | ConvertFrom-Json
        if (!($approvedLinks | Where-Object { $_.target.package_name -eq 'dev.serviceguide.cacoal' -and $_.target.sha256_cert_fingerprints -contains $fingerprint })) {
            Write-Warning 'Esta assinatura local não consta da associação publicada. O build não altera os certificados aprovados.'
        }
    }
    $sdkProperty = $sdkPath.Replace('\','/').Replace(':','\:')
    [System.IO.File]::WriteAllText("$projectPath/local.properties", "sdk.dir=$sdkProperty`n")
    Push-Location $projectPath
    try {
        & ./gradlew.bat --no-daemon --console=plain :app:assembleRelease :app:bundleRelease :app:lintRelease
        if ($LASTEXITCODE -ne 0) { throw 'A compilação Android falhou.' }
    } finally { Pop-Location }
    $apkPath = Join-Path $outputPath 'service-guide-0.1.0.apk'
    $aabPath = Join-Path $outputPath 'service-guide-0.1.0.aab'
    Copy-Item -LiteralPath "$projectPath/app/build/outputs/apk/release/app-release.apk" -Destination $apkPath
    Copy-Item -LiteralPath "$projectPath/app/build/outputs/bundle/release/app-release.aab" -Destination $aabPath
    $signer = Get-ChildItem -LiteralPath "$sdkPath/build-tools" -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName 'apksigner.bat' } | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (!$signer) { throw 'apksigner ausente no Android SDK.' }
    & $signer verify --print-certs $apkPath
    if ($LASTEXITCODE -ne 0) { throw 'Assinatura do APK inválida.' }
    $receipt = @{
        package = 'dev.serviceguide.cacoal'
        version = '0.1.0'
        certificate_sha256 = $fingerprint
        apk_sha256 = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash
        aab_sha256 = (Get-FileHash -LiteralPath $aabPath -Algorithm SHA256).Hash
        built_at_utc = [DateTime]::UtcNow.ToString('o')
        physical_device_tested = $false
        store_published = $false
    }
    $receipt | ConvertTo-Json | Set-Content -LiteralPath "$outputPath/build-receipt.json" -Encoding utf8
    Write-Output "APK e AAB em $outputPath. Preserve a chave e a senha protegida de .wrangler/mobile-signing."
} finally {
    $env:JAVA_HOME = $priorJavaHome
    $env:ANDROID_HOME = $priorAndroidHome
    $env:JDK_JAVA_OPTIONS = $priorJavaOptions
    $env:TEMP = $priorTemp
    $env:TMP = $priorTmp
    Remove-Item Env:SG_ANDROID_STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:SG_ANDROID_KEYSTORE -ErrorAction SilentlyContinue
}
