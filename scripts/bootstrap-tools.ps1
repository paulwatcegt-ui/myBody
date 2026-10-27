$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$toolsRoot = Join-Path $root '.tooling'
New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
function Download([string]$url, [string]$name) {
  $target = Join-Path $toolsRoot $name
  if (!(Test-Path -LiteralPath $target)) {
    & curl.exe -fL --retry 3 --connect-timeout 30 $url -o $target
    if ($LASTEXITCODE -ne 0) { throw "Download failed: $name" }
  }
  return $target
}
$npmDir = Join-Path $toolsRoot 'npm'
if (!(Test-Path -LiteralPath "$npmDir/package/bin/npm-cli.js")) {
  $archive = Download 'https://registry.npmjs.org/npm/-/npm-11.4.2.tgz' 'npm.tgz'
  New-Item -ItemType Directory -Force -Path $npmDir | Out-Null
  & tar.exe -xf $archive -C $npmDir
  if ($LASTEXITCODE -ne 0) { throw 'npm extraction failed' }
}
Write-Output 'NPM_READY'
$gradleExe = Join-Path $toolsRoot 'gradle-8.14.3/bin/gradle.bat'
if (!(Test-Path -LiteralPath $gradleExe)) {
  $archive = Download 'https://repo.huaweicloud.com/gradle/gradle-8.14.3-bin.zip' 'gradle-mirror.zip'
  $expected = 'bd71102213493060956ec229d946beee57158dbd89d0e62b91bca0fa2c5f3531'
  if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected) { throw 'Gradle SHA256 does not match official checksum' }
  & tar.exe -xf $archive -C $toolsRoot
  if ($LASTEXITCODE -ne 0) { throw 'Gradle extraction failed' }
}
Write-Output 'GRADLE_READY'
$jdkDir = Join-Path $toolsRoot 'jdk'
if (!(Test-Path -LiteralPath $jdkDir)) {
  $archive = Download 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse' 'jdk.zip'
  New-Item -ItemType Directory -Force -Path $jdkDir | Out-Null
  & tar.exe -xf $archive -C $jdkDir
  if ($LASTEXITCODE -ne 0) { throw 'JDK extraction failed' }
}
Write-Output 'JDK_READY'
$sdkRoot = Join-Path $toolsRoot 'android-sdk'
$cmdline = Join-Path $sdkRoot 'cmdline-tools/latest'
if (!(Test-Path -LiteralPath "$cmdline/bin/sdkmanager.bat")) {
  $archive = Download 'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip' 'android-tools.zip'
  $unpack = Join-Path $toolsRoot 'android-unpack'
  New-Item -ItemType Directory -Force -Path $unpack,$cmdline | Out-Null
  & tar.exe -xf $archive -C $unpack
  if ($LASTEXITCODE -ne 0) { throw 'Android tools extraction failed' }
  Copy-Item -Path "$unpack/cmdline-tools/*" -Destination $cmdline -Recurse -Force
}
$env:JAVA_HOME = (Get-ChildItem -LiteralPath $jdkDir -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = $sdkRoot
$env:Path = "$env:JAVA_HOME/bin;$env:Path"
1..100 | ForEach-Object { 'y' } | & "$cmdline/bin/sdkmanager.bat" "--sdk_root=$sdkRoot" --licenses
& "$cmdline/bin/sdkmanager.bat" "--sdk_root=$sdkRoot" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0' 'ndk;27.1.12297006' 'cmake;3.22.1'
if ($LASTEXITCODE -ne 0) { throw 'Android SDK installation failed' }
Write-Output 'ANDROID_READY'
