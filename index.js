'use strict';
const {resolveConfig,specHash,error}=require('./lib/config');
const {classicPlace}=require('./lib/classic-core');
const {makeRandom}=require('./lib/random');
const {verifyArtifact}=require('./lib/verify');
function generate(spec) {
  const config=resolveConfig(spec);
  const placed=classicPlace(config.words,{grid_size:{rows:config.rows,columns:config.columns},directions:config.directions,min_distinct_directions:config.min_distinct_directions,min_diagonal_placements:config.min_diagonal_placements},makeRandom(config.seed),{attempts:config.attempts,fillerResamples:config.filler_resamples});
  if(!placed) throw error('SEARCH_EXHAUSTED','No verified arrangement found within the configured search budget; this is not proof of infeasibility');
  const artifact={schema_version:'classic-wordsearch-artifact@1',spec_sha256:specHash(config),grid:placed.grid,placements:placed.placements.map(p=>({word:p.normalized,row:p.row,column:p.column,direction:p.direction,cells:p.cells}))};
  const verification=verifyArtifact(artifact,spec);
  if(verification.status!=='VERIFIED') throw error('INTERNAL_VERIFICATION_FAILED','Generated artifact did not pass independent verification');
  return artifact;
}
module.exports={generate,verifyArtifact,resolveConfig};
