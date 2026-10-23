'use strict';
const crypto = require('node:crypto');
const {normalizeWord} = require('./normalize');
const VECTORS = {E:[0,1],W:[0,-1],N:[-1,0],S:[1,0],NE:[-1,1],NW:[-1,-1],SE:[1,1],SW:[1,-1]};
const FIELDS = new Set(['schema_version','rows','columns','words','directions','seed','min_distinct_directions','min_diagonal_placements','attempts','filler_resamples']);
function error(code,message) { return Object.assign(new Error(message),{code}); }
function integer(value,min,max,name) {
  if (!Number.isInteger(value)||value<min||value>max) throw error('CONFIG_INVALID',name+' is out of range');
  return value;
}
function resolveConfig(input) {
  if (!input||typeof input!=='object'||Array.isArray(input)) throw error('CONFIG_INVALID','Configuration must be an object');
  for (const key of Object.keys(input)) if (!FIELDS.has(key)) throw error('CONFIG_UNKNOWN_FIELD','Unknown field: '+key);
  if (input.schema_version!==undefined&&input.schema_version!=='classic-wordsearch-spec@1') throw error('CONFIG_INVALID','Unsupported schema');
  const rows=integer(input.rows??12,2,30,'rows'), columns=integer(input.columns??12,2,30,'columns');
  if (!Array.isArray(input.words)||input.words.length<1||input.words.length>64) throw error('CONFIG_INVALID','Supply 1 to 64 words');
  const words=input.words.map(value=>{
    if(typeof value!=='string'||value.length>128) throw error('CONFIG_INVALID','Words must be strings of at most 128 characters');
    for(const ch of value) if(/\p{L}/u.test(ch)&&!normalizeWord(ch)) throw error('UNSUPPORTED_LETTER','Only letters representable by the Latin A-Z policy are supported');
    if(/\p{N}/u.test(value)) throw error('UNSUPPORTED_LETTER','Digits are not word letters');
    const normalized=normalizeWord(value);
    if(normalized.length<2||normalized.length>30) throw error('CONFIG_INVALID','Normalized words must contain 2 to 30 letters');
    return {display_text:value,normalized};
  });
  if(new Set(words.map(x=>x.normalized)).size!==words.length) throw error('DUPLICATE_WORD','Words must be distinct after normalization');
  const directions=input.directions??Object.keys(VECTORS);
  if(!Array.isArray(directions)||!directions.length||directions.length>8||directions.some(x=>typeof x!=='string'||!Object.hasOwn(VECTORS,x))||new Set(directions).size!==directions.length) throw error('CONFIG_INVALID','Invalid or duplicate directions');
  const seed=input.seed??'synthetic-example-v1';
  if(typeof seed!=='string'||!seed.length||seed.length>128) throw error('CONFIG_INVALID','Seed must contain 1 to 128 characters');
  const minimum=integer(input.min_distinct_directions??1,1,Math.min(directions.length,words.length),'min_distinct_directions');
  const diagonals=integer(input.min_diagonal_placements??0,0,words.length,'min_diagonal_placements');
  if(diagonals&&!directions.some(d=>VECTORS[d].every(x=>x!==0))) throw error('CONFIG_INFEASIBLE','Diagonal placements require diagonal directions');
  for(const word of words) if(!directions.some(d=>(VECTORS[d][0]===0||word.normalized.length<=rows)&&(VECTORS[d][1]===0||word.normalized.length<=columns))) throw error('CONFIG_INFEASIBLE','A word cannot fit the requested grid and directions');
  return {schema_version:'classic-wordsearch-spec@1',rows,columns,words,directions:[...directions],seed,min_distinct_directions:minimum,min_diagonal_placements:diagonals,attempts:integer(input.attempts??24,1,100,'attempts'),filler_resamples:integer(input.filler_resamples??40,1,200,'filler_resamples')};
}
function specHash(resolved) { return crypto.createHash('sha256').update(JSON.stringify(resolved)).digest('hex'); }
module.exports={resolveConfig,specHash,error};
