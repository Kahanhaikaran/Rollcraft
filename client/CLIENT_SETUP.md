# Fix: "Cannot find module @rollup/rollup-win32-x64-msvc"

npm on Windows often fails to install Rollup's optional native binary. Use **pnpm** instead (it installs it correctly).

## One-time setup

1. **Remove conflicting global folder** (if it exists):
   ```powershell
   Remove-Item -Recurse -Force $env:USERPROFILE\node_modules -ErrorAction SilentlyContinue
   ```

2. **Enable pnpm** (comes with Node):
   ```powershell
   corepack enable
   corepack prepare pnpm@9.15.0 --activate
   ```

3. **Install and run** from this folder (`client`):
   ```powershell
   cd C:\Users\opkab\OneDrive\Desktop\RollCraft\client

   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   Remove-Item package-lock.json -ErrorAction SilentlyContinue

   pnpm install
   pnpm run dev
   ```

4. Open **http://localhost:5173**

If you don't have corepack, install pnpm globally: `npm install -g pnpm`, then run `pnpm install` and `pnpm run dev` in the client folder.
