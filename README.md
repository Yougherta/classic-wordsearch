# classic-wordsearch

[![CI](https://github.com/Yougherta/classic-wordsearch/actions/workflows/ci.yml/badge.svg)](https://github.com/Yougherta/classic-wordsearch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Generate word-search puzzles from your own word list, then **independently verify**
the saved grid against the original request.

**Try it free in your browser: https://yougherta.github.io/classic-wordsearch/**
(type words, print the puzzle and answer key, nothing is uploaded).

- Deterministic: the same seed always gives the same grid.
- Rectangular grids, all 8 directions, overlaps, palindromes.
- Rejects grids where a word appears twice by accident.
- Latin normalization (accents like é, ç, ñ are handled).
- Separate verifier that rescans the grid and never trusts the generator's own report.
- Zero runtime dependencies. Library + CLI.

Used to produce printed puzzle books; this package is the general-purpose core.

## Install

Requires Node.js 22 or newer.

    npm install classic-wordsearch

Or from a clone:

    npm ci
    npm test

## CLI

    npx classic-wordsearch generate examples/synthetic.json puzzle.json
    npx classic-wordsearch verify puzzle.json examples/synthetic.json

Generation refuses to overwrite an existing output file. Omit the output argument
to write JSON to stdout.

Verification always needs the original spec: a puzzle file cannot vouch for its
own requirements, so keep your spec.

Exit status: `0` success, `1` verification failed, `2` input/configuration/I/O or
generation error. `SEARCH_EXHAUSTED` means the search budget ran out, not that the
word set is mathematically impossible. JSON inputs are limited to regular files of
at most 2 MiB.

## Library

```js
const fs = require('node:fs');
const { generate, verifyArtifact } = require('classic-wordsearch');

const spec = JSON.parse(fs.readFileSync('examples/synthetic.json', 'utf8'));
const puzzle = generate(spec);
console.log(verifyArtifact(puzzle, spec));
```

The library is synchronous and works on plain JSON values. It does no file or
network I/O; only the CLI reads and writes files. `generate` runs the separate
verifier on its own output before returning it.

Spec fields, defaults and limits: [docs/FORMAT.md](docs/FORMAT.md).

## Scope

Included: seeded backtracking placement with overlaps, weighted filler letters,
duplicate-occurrence resampling, normalization, bounded configuration, and an
independent eight-direction scanner. A palindrome read both ways on the same cells
counts once. Duplicates in disallowed directions still fail verification.

Not included: word lists, profanity filtering, PDF/image rendering, themed or
deduction puzzles, multi-puzzle book planning. There is no content-safety
guarantee: you supply the words.

## Tests

    npm test

Tests cover deterministic replay, rectangular grids, all directions, palindromes,
duplicate detection, malformed and tampered inputs, spec binding, verifier
isolation, search exhaustion and CLI behavior.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
