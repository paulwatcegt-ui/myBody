$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$toolsRoot = Join-Path $root '.tooling'
if ([System.IO.DriveInfo]::GetDrives() | Where-Object { $_.Name -eq 'N:\' }) { throw 'N: is occupied; leave it unchanged and choose another test drive' }
& subst.exe N: $toolsRoot
if ($LASTEXITCODE -ne 0) { throw 'Could not create emulator path' }
$ini = Join-Path $toolsRoot 'avd/mybody_api35.ini'
$original = Get-Content -LiteralPath $ini -Raw
try {
  $env:ANDROID_HOME = 'N:\android-sdk'
  $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  $env:ANDROID_AVD_HOME = 'N:\avd'
  $env:ANDROID_USER_HOME = 'N:\android-user'
  $fixed = $original -replace '(?m)^path=.*$', 'path=N:\avd\mybody_api35'
  [System.IO.File]::WriteAllText($ini,$fixed,(New-Object System.Text.UTF8Encoding $false))
  & 'N:\android-sdk\emulator\emulator.exe' -avd mybody_api35 -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect -memory 2048 -cores 2 -show-kernel -verbose
} finally {
  [System.IO.File]::WriteAllText($ini,$original,(New-Object System.Text.UTF8Encoding $false))
  & subst.exe N: /D
}
