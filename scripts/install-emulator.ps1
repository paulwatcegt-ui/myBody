$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$env:JAVA_HOME = (Get-ChildItem -LiteralPath "$root/.tooling/jdk" -Directory | Select-Object -First 1).FullName
$env:ANDROID_HOME = "$root/.tooling/android-sdk"
$env:ANDROID_USER_HOME = "$root/.tooling/android-user"
$env:ANDROID_AVD_HOME = "$root/.tooling/avd"
$env:Path = "$env:JAVA_HOME/bin;$env:Path"
$manager = "$env:ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager.bat"
& $manager "--sdk_root=$env:ANDROID_HOME" 'emulator' 'system-images;android-35;default;x86_64'
if ($LASTEXITCODE -ne 0) { throw 'Emulator package installation failed' }
New-Item -ItemType Directory -Force -Path $env:ANDROID_AVD_HOME | Out-Null
'no' | & "$env:ANDROID_HOME/cmdline-tools/latest/bin/avdmanager.bat" create avd --name mybody_api35 --package 'system-images;android-35;default;x86_64' --path "$env:ANDROID_AVD_HOME/mybody_api35" --force
if ($LASTEXITCODE -ne 0) { throw 'AVD creation failed' }
& "$env:ANDROID_HOME/emulator/emulator.exe" -accel-check
