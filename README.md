Hobby’s App Installer
Electron + Vite desktop app that batch-installs popular PC software.
Auto-elevates, detects winget/Chocolatey, and falls back to direct URLs when needed.

Features
- One-click installs with clear toasts
- “Get App Installer” pill in top bar
- URL fallbacks for machines showing No installer
- Clean, fast UI with crisp sidebar icons

Backends
- winget (App Installer)
- Chocolatey
- Direct URL (fallback for 4 items below)

System Requirements
- Windows 10/11 (x64), admin rights, internet

End-User (Portable)
- Download the EXE from Releases.
- Run as Administrator.
- If prompted, click Install Chocolatey / Get App Installer once.
- Click Install on the apps you want.

Build From Source
- powershell
- Copy
- Edit
- git clone https://github.com/<you>/<repo>.git
- cd <repo>
- npm ci
- npm run dev          # dev (Electron + Vite)
- npm run build:portable  # portable EXE in /dist

Troubleshooting (quick)
- Blank UI / slow first paint → re-run as admin; clear %APPDATA%/HobbyInstaller/Cache; try --disable-gpu once.
- winget missing → ensure App Installer from Microsoft Store; winget --version should work.
  
License
MIT. Third-party installers are invoked—verify sources before use.
