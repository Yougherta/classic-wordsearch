'use strict';

const DIRECTION_VECTORS = { E: [0, 1], W: [0, -1], N: [-1, 0], S: [1, 0], NE: [-1, 1], NW: [-1, -1], SE: [1, 1], SW: [1, -1] };
function wordFits(word, rows, columns, direction) { const [dr, dc] = DIRECTION_VECTORS[direction]; return (dr === 0 || word.length <= rows) && (dc === 0 || word.length <= columns); }
function findRawOccurrences(grid, word) {
    const found = [];
    if (!word)
        return found;
    for (let row = 0; row < grid.length; row += 1)
        for (let column = 0; column < grid[0].length; column += 1) {
            for (const [dr, dc] of Object.values(DIRECTION_VECTORS)) {
                const endRow = row + dr * (word.length - 1);
                const endColumn = column + dc * (word.length - 1);
                if (endRow < 0 || endColumn < 0 || endRow >= grid.length || endColumn >= grid[0].length)
                    continue;
                const cells = [];
                let matched = true;
                for (let index = 0; index < word.length; index += 1) {
                    const r = row + dr * index;
                    const c = column + dc * index;
                    if (grid[r][c] !== word[index]) {
                        matched = false;
                        break;
                    }
                    cells.push([r, c]);
                }
                if (matched)
                    found.push(cells);
            }
        }
    return found;
}
function reverseWord(value) { return [...value].reverse().join(''); }
function isPalindrome(value) { return value === reverseWord(value); }
module.exports={DIRECTION_VECTORS,wordFits,findRawOccurrences,isPalindrome};
