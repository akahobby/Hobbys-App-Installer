# Hobbys App Installer

Portable Windows app for batch-installing software with WinGet, Chocolatey fallbacks, and a few direct-download entries. Output from installs streams in the panel below the catalog.

## Run from source

```bash
npm install
npm start
```

## Build portable exe

```bash
npm run build
```

Output goes to `dist/` as `Bulk App Installer-*-portable.exe`.

## Catalog

`apps.json` lists package ids and optional direct-download metadata. For the portable build you can drop a custom `apps.json` next to the exe.

## License

MIT — see [LICENSE](LICENSE).
