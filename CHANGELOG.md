# Changelog

## Unreleased

- Free browser demo on GitHub Pages: difficulty levels, answer key, print/PDF,
  shareable links, JSON download. Built from the same library code
  (`scripts/build-web.js`), tested to give identical grids.

## 0.1.0 (2026-10-24)

First public release.

- Seeded word-search generation with overlaps, all 8 directions and rectangular grids.
- Duplicate-occurrence detection and filler resampling.
- Independent verifier that rescans the grid against the original spec.
- CLI (`generate`, `verify`) and synchronous library API.
- MIT license.
