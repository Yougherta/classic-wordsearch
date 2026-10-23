'use strict';

function normalizeWord(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0153/gi, 'oe')
        .replace(/\u00e6/gi, 'ae')
        .toUpperCase()
        .replace(/[^A-Z]/g, '');
}
module.exports={normalizeWord};
