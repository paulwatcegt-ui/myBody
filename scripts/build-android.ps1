$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
& node (Join-Path $PSScriptRoot 'prepare-npm.cjs')
& node (Join-Path $PSScriptRoot 'patch-toolchain.cjs')
$mapped = $false
# Android's native CMake toolchain needs an ASCII project path on Windows.
if (!([System.IO.DriveInfo]::GetDrives() | Where-Object { $_.Name -eq 'M:\' })) {
  & subst.exe M: $root
  if ($LASTEXITCODE -ne 0) { throw 'Cannot create temporary M: build path' }
  $mapped = $true
}
try {
  if (!(Test-Path -LiteralPath 'M:\package.json') -or (Get-Content -Raw -LiteralPath 'M:\package.json' | ConvertFrom-Json).name -ne 'mybody') { throw 'M: is in use by another project' }
  $env:JAVA_HOME = (Get-ChildItem -LiteralPath 'M:\.tooling\jdk' -Directory | Select-Object -First 1).FullName
  $env:ANDROID_HOME = 'M:\.tooling\android-sdk'
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  $env:ANDROID_USER_HOME = 'M:\.tooling\android-user'
  $env:GRADLE_USER_HOME = 'M:\.tooling\gradle'
  $env:JAVA_TOOL_OPTIONS = '-Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8'
  $env:MYBODY_PROJECT_ROOT = $root
  $env:MYBODY_BUILD_ROOT = 'M:\'
  $env:MYBODY_AUTOLINK_SCRIPT = 'M:\scripts\native-autolinking.cjs'
  $env:EXPO_NO_TELEMETRY = '1'
  $env:CI = '1'
  $env:NODE_ENV = 'production'
  $env:TEMP = 'M:\.tooling\tmp'
  $env:TMP = $env:TEMP
  New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null
  $env:Path = "M:\.tooling\bin;$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
  Push-Location 'M:\'
  try {
    & node --no-warnings --eval "require('expo/bin/autolinking')" expo-modules-autolinking react-native-config --platform android --json > .verification/native-preflight.json 2> .verification/native-preflight-error.log
    if ($LASTEXITCODE -ne 0) { Get-Content .verification/native-preflight-error.log; throw 'Native autolinking preflight failed' }
  } finally { Pop-Location }
  Push-Location 'M:\android'
  try {
    $gradle = if (Test-Path -LiteralPath 'M:\.tooling\gradle-8.14.3\bin\gradle.bat') { 'M:\.tooling\gradle-8.14.3\bin\gradle.bat' } else { '.\gradlew.bat' }
    & $gradle :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' --max-workers=1 '-Dorg.gradle.parallel=false' --no-watch-fs --no-daemon --console=plain --stacktrace
    if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }
  } finally { Pop-Location }
  $delivery = Join-Path $root 'delivery'
  New-Item -ItemType Directory -Force -Path $delivery | Out-Null
  Copy-Item -LiteralPath 'M:\android\app\build\outputs\apk\release\app-release.apk' -Destination (Join-Path $delivery 'myBody-0.6.0-internal.apk') -Force
  Get-FileHash -LiteralPath (Join-Path $delivery 'myBody-0.6.0-internal.apk') -Algorithm SHA256
} finally {
  if ($mapped) { & subst.exe M: /D }
}
