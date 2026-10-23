'use strict';

const DIRECTION_VECTORS={E:[0,1],W:[0,-1],N:[-1,0],S:[1,0],NE:[-1,1],NW:[-1,-1],SE:[1,1],SW:[1,-1]};
function scanOccurrences(letters, word, directions = Object.keys(DIRECTION_VECTORS)) {
    const rows = letters.length;
    const columns = letters[0].length;
    const found = [];
    const allowed = new Set(directions || []);
    for (const [direction, [dr, dc]] of Object.entries(DIRECTION_VECTORS)) {
        if (!allowed.has(direction))
            continue;
        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                const endRow = row + dr * (word.length - 1);
                const endColumn = column + dc * (word.length - 1);
                if (endRow < 0 || endColumn < 0 || endRow >= rows || endColumn >= columns)
                    continue;
                let match = true;
                const cells = [];
                for (let index = 0; index < word.length; index += 1) {
                    const r = row + dr * index;
                    const c = column + dc * index;
                    if (letters[r][c] !== word[index]) {
                        match = false;
                        break;
                    }
                    cells.push([r, c]);
                }
                if (match)
                    found.push({ direction, cells });
            }
        }
    }
    return found;
}
module.exports={scanOccurrences};
