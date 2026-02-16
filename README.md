# Hobbys-App-Installer

Portable Electron-based Windows application for batch installing and upgrading software using Winget and Chocolatey.

---

## Overview

Hobbys-App-Installer simplifies Windows setup by allowing you to install and upgrade multiple applications from a single interface. It leverages Winget as the primary package manager with automatic Chocolatey fallback when needed, supports Microsoft Store apps, and provides real-time output visibility for upgrade operations.

---

## Features

- Winget-based software installation  
- Automatic Chocolatey fallback if Winget fails  
- Microsoft Store package support  
- "Upgrade All" functionality (`winget upgrade --all`)  
- Live streaming output log for upgrades  
- Silent install support  
- Prerequisite auto-detection (Winget / Chocolatey)  
- Portable EXE build (no installer required)  
- Category-based app listing (including duplicates where intended)  
- Catalog verification script before release  

---

## Upgrade All

Runs:

```
winget upgrade --all
```

Displays real-time Winget output directly inside the application, allowing full visibility into download and install steps.

---

## Build From Source

Install dependencies:

```
npm install
```

Build portable executable:

```
npm run build:portable:x64
```

The portable EXE will be generated inside:

```
dist/
```

---

## Verify Package Catalog

Before publishing a release, validate all package IDs:

```
npm run verify:catalog
```

This checks all Winget and Chocolatey IDs to prevent broken releases.

---

## License

MIT License
