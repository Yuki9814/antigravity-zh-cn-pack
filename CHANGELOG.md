# Changelog

## Unreleased

- Added `install.command` for double-click macOS installation.
- Added `npm run first-run`, `npm run repair`, `npm run open-reports`, and `npm run package:release`.
- Improved `setup.sh` Node.js 22+ preflight with actionable install guidance.
- Made setup launch Antigravity with a fixed DevTools port when possible.
- Reworked README for download-to-use flow and added troubleshooting/screenshot docs.
- Added a release workflow that builds and uploads the ready-to-use zip package.

## 0.3.0

- Added `bash setup.sh` as the fastest download-to-install entry.
- Added `scripts/setup.mjs` for dependency setup, installation, checks, tests, and diagnostics.
- Added `scripts/doctor.mjs` with readable normal and strict verification reports.
- Made `verify` default to first-run friendly checks; `--strict` keeps post-restart injection requirements.
- Added repository maintenance files for issue reports, pull requests, CI, and contribution flow.

## 0.2.0

- Upgraded the translation dictionary to exact phrases, variable patterns, attributes, and protected rules.
- Added UI auditing for live DOM and local bundle text.
- Improved sidecar injection coverage for dynamic UI and attributes.

## 0.1.0

- Initial Antigravity Agent mode Simplified Chinese pack.
