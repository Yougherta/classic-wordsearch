'use strict';

const {DIRECTION_VECTORS,findRawOccurrences,isPalindrome,wordFits}=require('./primitives');
const FILLER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DEFAULT_ATTEMPTS = 24;
const DEFAULT_FILLER_RESAMPLES = 40;
const FILLER_SMOOTHING = 1.5;
function letterWeights(words, smoothing = FILLER_SMOOTHING) {
    const counts = new Array(26).fill(0);
    for (const word of words) {
        for (const character of String(word || '')) {
            const index = character.charCodeAt(0) - 65;
            if (index >= 0 && index < 26)
                counts[index] += 1;
        }
    }
    const cumulative = new Array(26);
    let running = 0;
    for (let index = 0; index < 26; index += 1) {
        running += counts[index] + smoothing;
        cumulative[index] = running;
    }
    return { cumulative, total: running };
}
function drawLetter(weights, random) {
    if (!weights)
        return FILLER_ALPHABET[Math.floor(random() * FILLER_ALPHABET.length)];
    const target = random() * weights.total;
    for (let index = 0; index < 26; index += 1)
        if (target < weights.cumulative[index])
            return FILLER_ALPHABET[index];
    return FILLER_ALPHABET[25];
}
function shuffle(values, random) {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1));
        [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
}
function cellPathKey(cells) {
    return cells.map(([row, column]) => `${row}:${column}`).sort().join('|');
}
function candidateSlots(word, rows, columns, directions) {
    const slots = [];
    for (const direction of directions) {
        if (!wordFits(word, rows, columns, direction))
            continue;
        const [dr, dc] = DIRECTION_VECTORS[direction];
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const endRow = row + dr * (word.length - 1);
                const endColumn = column + dc * (word.length - 1);
                if (endRow < 0 || endColumn < 0 || endRow >= rows || endColumn >= columns)
                    continue;
                const cells = [];
                for (let index = 0; index < word.length; index += 1)
                    cells.push([row + dr * index, column + dc * index]);
                slots.push({ direction, row, column, cells });
            }
        }
    }
    return slots;
}
function slotFits(grid, word, slot) {
    let overlap = 0;
    for (let index = 0; index < word.length; index += 1) {
        const [r, c] = slot.cells[index];
        const existing = grid[r][c];
        if (existing === null)
            continue;
        if (existing !== word[index])
            return null;
        overlap += 1;
    }
    return { overlap };
}
function writeSlot(grid, word, slot) {
    const written = [];
    for (let index = 0; index < word.length; index += 1) {
        const [r, c] = slot.cells[index];
        if (grid[r][c] === null) {
            grid[r][c] = word[index];
            written.push([r, c]);
        }
    }
    return written;
}
function eraseCells(grid, cells) {
    for (const [r, c] of cells)
        grid[r][c] = null;
}
function placementOrder(words, rows, columns, directions, random) {
    return shuffle(words, random)
        .map((word) => ({ word, slotCount: candidateSlots(word.normalized, rows, columns, directions).length }))
        .sort((left, right) => right.word.normalized.length - left.word.normalized.length
        || left.slotCount - right.slotCount
        || left.word.normalized.localeCompare(right.word.normalized));
}
function placeAll(grid, ordered, directions, random, budget) {
    const rows = grid.length;
    const columns = grid[0].length;
    const slotsByWord = ordered.map(({ word }) => shuffle(candidateSlots(word.normalized, rows, columns, directions), random));
    const chosen = [];
    let nodes = 0;
    const step = (index) => {
        if (index === ordered.length)
            return true;
        const { word } = ordered[index];
        const ranked = slotsByWord[index]
            .map((slot) => ({ slot, fit: slotFits(grid, word.normalized, slot) }))
            .filter((item) => item.fit)
            .sort((left, right) => right.fit.overlap - left.fit.overlap);
        for (const { slot } of ranked) {
            nodes += 1;
            if (nodes > budget)
                return false;
            const written = writeSlot(grid, word.normalized, slot);
            chosen.push({ word, slot });
            if (step(index + 1))
                return true;
            chosen.pop();
            eraseCells(grid, written);
        }
        return false;
    };
    return step(0) ? chosen : null;
}
function fillAndVerify(grid, placedWords, random, resampleBudget, weights = null) {
    const rows = grid.length;
    const columns = grid[0].length;
    const empty = [];
    for (let row = 0; row < rows; row += 1)
        for (let column = 0; column < columns; column += 1)
            if (grid[row][column] === null)
                empty.push([row, column]);
    for (const [row, column] of empty)
        grid[row][column] = drawLetter(weights, random);
    const intended = new Map(placedWords.map(({ word, slot }) => [word.normalized, cellPathKey(slot.cells)]));
    for (let attempt = 0; attempt <= resampleBudget; attempt += 1) {
        const offending = new Set();
        const violations = [];
        for (const { word, slot } of placedWords) {
            const occurrences = findRawOccurrences(grid, word.normalized);
            const intendedKey = intended.get(word.normalized);
            const distinct = new Set(occurrences.map(cellPathKey));
            if (distinct.size === 1 && distinct.has(intendedKey))
                continue;
            if (!isPalindrome(word.normalized) && occurrences.length === 1 && cellPathKey(occurrences[0]) === intendedKey)
                continue;
            for (const cells of occurrences) {
                if (cellPathKey(cells) === intendedKey)
                    continue;
                violations.push({ code: 'DUPLICATE_OCCURRENCE', word: word.normalized });
                for (const [r, c] of cells)
                    if (!isIntendedCell(placedWords, r, c))
                        offending.add(`${r}:${c}`);
            }
        }
        if (!violations.length)
            return { status: 'CLEAN' };
        if (!offending.size)
            return { status: 'ARRANGEMENT_CONFLICT', violations };
        for (const key of [...offending].sort()) {
            const [row, column] = key.split(':').map(Number);
            grid[row][column] = drawLetter(weights, random);
        }
    }
    return { status: 'FILLER_BUDGET_EXHAUSTED' };
}
function isIntendedCell(placedWords, row, column) {
    for (const { slot } of placedWords)
        for (const [r, c] of slot.cells)
            if (r === row && c === column)
                return true;
    return false;
}
function classicPlace(words, caseValue, random, options = {}) {
    const rows = Number(caseValue.grid_size?.rows);
    const columns = Number(caseValue.grid_size?.columns);
    if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1)
        return null;
    const directions = caseValue.directions || [];
    if (!directions.length)
        return null;
    if (!words.length)
        return null;
    if (words.some((word) => !directions.some((direction) => wordFits(word.normalized, rows, columns, direction))))
        return null;
    const attempts = Math.max(1, Number(options.attempts ?? DEFAULT_ATTEMPTS));
    const resampleBudget = Math.max(1, Number(options.fillerResamples ?? DEFAULT_FILLER_RESAMPLES));
    const nodeBudget = Math.max(1000, rows * columns * words.length * 40);
    const weights = letterWeights(words.map(word => word.normalized));
    const outcomes = [];
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const grid = Array.from({ length: rows }, () => Array(columns).fill(null));
        const ordered = placementOrder(words, rows, columns, directions, random);
        const placed = placeAll(grid, ordered, directions, random, nodeBudget);
        if (!placed)
            continue;
        const used = new Set(placed.map(({ slot }) => slot.direction));
        const minimum = Number(caseValue.min_distinct_directions || 0);
        if (minimum && used.size < minimum)
            continue;
        const diagonalMinimum = Number(caseValue.min_diagonal_placements || 0);
        const diagonalCount = placed.filter(({ slot }) => ['NE', 'NW', 'SE', 'SW'].includes(slot.direction)).length;
        if (diagonalMinimum && diagonalCount < diagonalMinimum) {
            outcomes.push({ attempt: attempt + 1, status: 'DIAGONAL_COUNT_BELOW_REQUIREMENT', diagonal_count: diagonalCount, required: diagonalMinimum });
            continue;
        }
        const fill = fillAndVerify(grid, placed, random, resampleBudget, weights);
        if (fill.status !== 'CLEAN') {
            outcomes.push({ attempt: attempt + 1, status: fill.status, violations: (fill.violations || []).slice(0, 4) });
            continue;
        }
        const placements = placed
            .map(({ word, slot }) => ({
            id: word.id || null,
            display_text: word.display_text,
            normalized: word.normalized,
            category: word.category || null,
            row: slot.row,
            column: slot.column,
            direction: slot.direction,
            cells: slot.cells,
        }))
            .sort((left, right) => left.normalized.localeCompare(right.normalized));
        const intendedCells = new Set();
        for (const { slot } of placed)
            for (const [r, c] of slot.cells)
                intendedCells.add(`${r}:${c}`);
        return { grid: grid.map(row => row.slice()), placements, attempts_used: attempt + 1 };
    }
    classicPlace.lastFailure = {
        reason: outcomes.length ? outcomes.at(-1).status : 'NO_PLACEMENT_FOUND',
        proof: null,
        decided_before_search: false,
        attempts_exhausted: attempts,
        outcomes: outcomes.slice(0, 8),
    };
    return null;
}

module.exports={classicPlace};
