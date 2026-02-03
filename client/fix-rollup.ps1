# Fix: "Cannot find module @rollup/rollup-win32-x64-msvc"
# Node is loading rollup from your USER folder (C:\Users\opkab\node_modules) instead of this project.
# This script removes that folder so the project's node_modules is used.

$userModules = "$env:USERPROFILE\node_modules"
if (Test-Path $userModules) {
  Write-Host "Removing $userModules (this is causing the conflict)..."
  Remove-Item -Recurse -Force $userModules
  Write-Host "Done. Now run: npm install && npm run dev"
} else {
  Write-Host "No conflicting folder found at $userModules"
  Write-Host "Try: Remove-Item -Recurse -Force node_modules; Remove-Item package-lock.json; npm install; npm run dev"
}
