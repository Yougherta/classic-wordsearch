'use strict';

const crypto=require('node:crypto');
function makeRandom(seed) {
    let state = crypto.createHash('sha256').update(seed).digest().readUInt32LE(0) || 1;
    return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 0x100000000; };
}
module.exports={makeRandom};
