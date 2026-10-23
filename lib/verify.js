'use strict';
const {resolveConfig,specHash}=require('./config');
const {scanOccurrences}=require('./scan');
// Geometry is deliberately local: verification imports no generation or placement code.
const VECTORS={E:[0,1],W:[0,-1],N:[-1,0],S:[1,0],NE:[-1,1],NW:[-1,-1],SE:[1,1],SW:[1,-1]};
const key=cells=>cells.map(([r,c])=>r+':'+c).sort().join('|');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function verifyArtifact(artifact,expectedSpec) {
  const findings=[];
  const add=(code,message)=>findings.push({code,message});
  const result=()=>({status:findings.length?'FAILED':'VERIFIED',method:'INDEPENDENT_GRID_RESCAN_AGAINST_EXTERNAL_SPEC',findings});
  if(expectedSpec===undefined) {add('EXPECTED_SPEC_REQUIRED','Supply the original external configuration');return result();}
  let config;
  try {config=resolveConfig(expectedSpec);} catch(e) {add('EXPECTED_SPEC_INVALID',e.code||'Invalid configuration');return result();}
  if(!artifact||typeof artifact!=='object'||Array.isArray(artifact)) {add('ARTIFACT_INVALID','Artifact must be an object');return result();}
  if(artifact.schema_version!=='classic-wordsearch-artifact@1') add('SCHEMA_INVALID','Unsupported artifact schema');
  if(artifact.spec_sha256!==specHash(config)) add('SPEC_MISMATCH','Artifact does not bind to the supplied configuration');
  const grid=artifact.grid;
  if(!Array.isArray(grid)||grid.length!==config.rows||grid.some(row=>!Array.isArray(row)||row.length!==config.columns||row.some(letter=>typeof letter!=='string'||!/^[A-Z]$/.test(letter)))) {add('GRID_INVALID','Grid dimensions or letters disagree with the external specification');return result();}
  if(!Array.isArray(artifact.placements)||artifact.placements.length!==config.words.length) {add('PLACEMENTS_INVALID','There must be exactly one placement record per supplied word');return result();}
  const wanted=new Set(config.words.map(x=>x.normalized)),seen=new Set(),used=new Set();
  let diagonalCount=0;
  for(const p of artifact.placements) {
    if(!p||typeof p!=='object'||!wanted.has(p.word)||seen.has(p.word)) {add('PLACEMENT_WORD_INVALID','Unexpected or duplicate placement word');continue;}
    seen.add(p.word);
    if(!config.directions.includes(p.direction)) {add('DIRECTION_INVALID','Placement direction is not allowed');continue;}
    if(!Number.isInteger(p.row)||!Number.isInteger(p.column)) {add('ORIGIN_INVALID','Placement origin must use integer coordinates');continue;}
    const [dr,dc]=VECTORS[p.direction];
    const cells=Array.from(p.word,(_,i)=>[p.row+dr*i,p.column+dc*i]);
    if(cells.some(([r,c])=>r<0||c<0||r>=config.rows||c>=config.columns)) {add('PLACEMENT_OUT_OF_BOUNDS','Placement leaves the grid');continue;}
    if(!Array.isArray(p.cells)||!same(p.cells,cells)) add('CELLS_MISMATCH','Declared cells disagree with the origin and direction');
    if(cells.some(([r,c],i)=>grid[r][c]!==p.word[i])) add('SPELLING_MISMATCH','Grid does not spell the declared word');
    used.add(p.direction);if(dr&&dc)diagonalCount++;
    // Scan ALL eight directions, including directions not allowed for placement.
    const occurrences=scanOccurrences(grid,p.word);
    const distinct=new Set(occurrences.map(x=>key(x.cells)));
    if(distinct.size!==1||!distinct.has(key(cells))) add('OCCURRENCE_COUNT_WRONG','Word must occur exactly once over one physical cell path');
  }
  if(seen.size!==wanted.size) add('WORDS_MISSING','Not every supplied word has a placement');
  if(used.size<config.min_distinct_directions) add('DIRECTION_MINIMUM_FAILED','Too few distinct placement directions');
  if(diagonalCount<config.min_diagonal_placements) add('DIAGONAL_MINIMUM_FAILED','Too few diagonal placements');
  return result();
}
module.exports={verifyArtifact};
