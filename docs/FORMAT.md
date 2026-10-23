# Configuration and artifact contract

## Input

Only these fields are accepted; unknown fields fail.

| Field | Default | Limits |
| --- | --- | --- |
| schema_version | classic-wordsearch-spec@1 | This version only |
| rows, columns | 12, 12 | Integers 2..30 |
| words | required | 1..64 distinct supplied strings; normalized length 2..30 |
| directions | all eight | Nonempty unique subset of E W N S NE NW SE SW |
| seed | synthetic-example-v1 | String length 1..128 |
| min_distinct_directions | 1 | 1..min(word count, direction count) |
| min_diagonal_placements | 0 | 0..word count; diagonal direction required |
| attempts | 24 | Integer 1..100 |
| filler_resamples | 40 | Integer 1..200 |

Normalization: NFKD, combining accents removed, oe/ae ligatures expanded,
uppercase, retain A-Z. Unsupported letters and digits are rejected rather than
silently dropped. Punctuation/spaces do not become grid cells. Different spellings
that normalize identically are rejected. No semantic or safety curation occurs.

Rows and columns are independent. No diagonal placement is possible when its word
exceeds either dimension. Finite search may fail for valid requests. Node budgets
are derived from dimensions and word count; attempts are not a wall-clock limit.

The same configuration/seed is intended to reproduce the same artifact for the
supported runtime. Cross-platform reproducibility has not yet been verified.
Changing direction order, word order or any budget changes the spec fingerprint.

## Artifact

JSON object with:
- schema_version = classic-wordsearch-artifact@1;
- spec_sha256 = SHA-256 of the canonical resolved configuration;
- grid = rows of single uppercase A-Z strings;
- placements = one record per normalized word, with word, row, column, direction,
  and ordered cells. Coordinates are zero-based.

This is a new schema, not the original book artifact schema.

## Verification

Call verifyArtifact(artifact, originalSpec). The result contains status
VERIFIED or FAILED, method and findings.

The checker independently scans all eight directions over actual grid letters,
deduplicates palindrome cell paths, checks each word occurs exactly once, derives
coordinates from origin/direction, compares declared cells and spelling, and
enforces shape, allowed directions and placement minima against the external spec.

The fingerprint is an identity aid, not a signature or proof of authenticity.
A party controlling both the artifact and the supplied spec can change both.
Retain trusted requirements outside the artifact. Extra artifact fields such as
PASS flags are ignored as evidence.

Verification is independent of the generation scanner and placement algorithm,
but intentionally shares the documented configuration and normalization policy.
It proves this limited mechanical contract, not content safety, visual layout,
accessibility, publication clearance or legal rights.
