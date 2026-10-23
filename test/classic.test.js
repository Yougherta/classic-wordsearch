'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const crypto=require('node:crypto');
const {generate,verifyArtifact,resolveConfig}=require('../index');
const {specHash}=require('../lib/config');
const {scanOccurrences}=require('../lib/scan');
const {normalizeWord}=require('../lib/normalize');
const example=require('../examples/synthetic.json');
const clone=x=>JSON.parse(JSON.stringify(x));
const codes=result=>result.findings.map(f=>f.code);
let cached;
function valid(){cached??=generate(example);return clone(cached);}
function failed(change,code){
 const a=valid();change(a);
 const report=verifyArtifact(a,example);
 assert.equal(report.status,'FAILED');
 if(code)assert.ok(codes(report).includes(code),JSON.stringify(report));
}
test('same resolved request and seed reproduce the entire artifact',()=>{
 assert.deepEqual(generate(example),generate(example));
 assert.equal(verifyArtifact(valid(),example).status,'VERIFIED');
});
test('generation preserves the caller configuration',()=>{
 const spec=clone(example),before=clone(spec);generate(spec);assert.deepEqual(spec,before);
});
test('rectangular grids, direction minima and diagonals survive independent verification',()=>{
 for(let seed=0;seed<12;seed++){
  const spec={...example,rows:8,columns:13,seed:'rect-'+seed};
  const a=generate(spec);
  assert.equal(a.grid.length,8);assert.equal(a.grid[0].length,13);
  assert.equal(verifyArtifact(a,spec).status,'VERIFIED');
 }
});
test('all eight directional geometries verify with hand-constructed grids',()=>{
 const vectors={E:[0,1],W:[0,-1],N:[-1,0],S:[1,0],NE:[-1,1],NW:[-1,-1],SE:[1,1],SW:[1,-1]};
 for(const [direction,[dr,dc]]of Object.entries(vectors)){
  const spec={rows:5,columns:5,words:['ZAV'],directions:[direction],seed:'geometry'};
  const grid=Array.from({length:5},()=>Array(5).fill('Q'));
  const cells=Array.from('ZAV',(_,i)=>[2+dr*i,2+dc*i]);cells.forEach(([r,c],i)=>grid[r][c]='ZAV'[i]);
  const artifact={schema_version:'classic-wordsearch-artifact@1',spec_sha256:specHash(resolveConfig(spec)),grid,placements:[{word:'ZAV',row:2,column:2,direction,cells}]};
  assert.equal(verifyArtifact(artifact,spec).status,'VERIFIED',direction);
 }
});
test('palindrome forward and reverse scans are one physical occurrence',()=>{
 const spec={rows:3,columns:5,words:['ZAVAZ'],directions:['E'],seed:'palindrome'};
 const grid=[Array.from('ZAVAZ'),Array(5).fill('Q'),Array(5).fill('Q')];
 const artifact={schema_version:'classic-wordsearch-artifact@1',spec_sha256:specHash(resolveConfig(spec)),grid,placements:[{word:'ZAVAZ',row:0,column:0,direction:'E',cells:[[0,0],[0,1],[0,2],[0,3],[0,4]]}]};
 assert.equal(scanOccurrences(grid,'ZAVAZ').length,2);
 assert.equal(verifyArtifact(artifact,spec).status,'VERIFIED');
});
test('duplicate occurrences outside allowed placement directions fail',()=>{
 const spec={rows:5,columns:5,words:['ZAV'],directions:['E'],seed:'duplicate'};
 const grid=Array.from({length:5},()=>Array(5).fill('Q'));
 for(let i=0;i<3;i++){grid[0][i]='ZAV'[i];grid[2+i][4]='ZAV'[i];}
 const artifact={schema_version:'classic-wordsearch-artifact@1',spec_sha256:specHash(resolveConfig(spec)),grid,placements:[{word:'ZAV',row:0,column:0,direction:'E',cells:[[0,0],[0,1],[0,2]]}]};
 assert.ok(codes(verifyArtifact(artifact,spec)).includes('OCCURRENCE_COUNT_WRONG'));
});
test('normalization handles accents, ligatures and sharp s',()=>{
 assert.equal(normalizeWord('cafe\u0301'),'CAFE');
 assert.equal(normalizeWord('\u0153\u00e6\u00df'),'OEAESS');
});
for(const [name,change,code]of [
 ['unknown field',s=>s.extra=true,'CONFIG_UNKNOWN_FIELD'],
 ['duplicate normalized words',s=>s.words=['ZAV','zav'],'DUPLICATE_WORD'],
 ['unsupported letters',s=>s.words=['ZAV\u0416'],'UNSUPPORTED_LETTER'],
 ['digits',s=>s.words=['ZAV1'],'UNSUPPORTED_LETTER'],
 ['oversized grid',s=>s.rows=31,'CONFIG_INVALID'],
 ['duplicate direction',s=>s.directions=['E','E'],'CONFIG_INVALID'],
 ['unknown direction',s=>s.directions=['X'],'CONFIG_INVALID'],
 ['nonfinite attempts',s=>s.attempts=Infinity,'CONFIG_INVALID'],
 ['excessive budget',s=>s.attempts=101,'CONFIG_INVALID'],
 ['nonstring seed',s=>s.seed=1,'CONFIG_INVALID'],
 ['impossible geometry',s=>{s.rows=2;s.columns=2;s.words=['ZAVERO'];s.min_distinct_directions=1;s.min_diagonal_placements=0;},'CONFIG_INFEASIBLE'],
 ['impossible direction minimum',s=>s.min_distinct_directions=9,'CONFIG_INVALID'],
 ['diagonal request without diagonals',s=>{s.directions=['E'];s.min_distinct_directions=1;},'CONFIG_INFEASIBLE']
])test('configuration rejects '+name,()=>{
 const s=clone(example);change(s);assert.throws(()=>generate(s),e=>e.code===code);
});
test('bounded search exhaustion does not claim a proof of infeasibility',()=>{
 const spec={rows:8,columns:8,words:['ZAV','ZAVZAV'],directions:['E'],attempts:1,filler_resamples:1,seed:'forced-duplicates'};
 assert.throws(()=>generate(spec),e=>e.code==='SEARCH_EXHAUSTED'&&e.message.includes('not proof'));
});
test('verification requires the external original configuration',()=>{
 assert.deepEqual(codes(verifyArtifact(valid())),['EXPECTED_SPEC_REQUIRED']);
});
test('changed external requirements fail even if artifact claims PASS',()=>{
 const a=valid();a.status='PASS';
 assert.equal(verifyArtifact(a,{...example,seed:'different'}).status,'FAILED');
});
test('a copied or forged fingerprint cannot conceal corrupted letters',()=>{
 failed(a=>{const [r,c]=a.placements[0].cells[0];a.grid[r][c]=a.grid[r][c]==='Q'?'X':'Q';a.status='PASS';},'SPELLING_MISMATCH');
});
test('declared placement coordinates are recomputed',()=>failed(a=>a.placements[0].cells.reverse(),'CELLS_MISMATCH'));
test('out-of-bounds origins fail',()=>failed(a=>a.placements[0].row=-5,'PLACEMENT_OUT_OF_BOUNDS'));
test('disallowed placement directions fail',()=>failed(a=>a.placements[0].direction='W','DIRECTION_INVALID'));
test('wrong dimensions fail',()=>failed(a=>a.grid.pop(),'GRID_INVALID'));
test('invalid letters fail',()=>failed(a=>a.grid[0][0]='1','GRID_INVALID'));
test('duplicate placement records fail',()=>failed(a=>a.placements[1]=clone(a.placements[0]),'PLACEMENT_WORD_INVALID'));
test('missing placement records fail',()=>failed(a=>a.placements.pop(),'PLACEMENTS_INVALID'));
test('unknown schema fails',()=>failed(a=>a.schema_version='other','SCHEMA_INVALID'));
test('malformed artifacts return failure without trusting claims',()=>{
 for(const value of [null,[],{},'PASS',{grid:[]},{schema_version:'classic-wordsearch-artifact@1'}])
  assert.equal(verifyArtifact(value,example).status,'FAILED');
});
test('verifier loads without the generator or its occurrence scanner',()=>{
 const script="const Module=require('node:module');const original=Module._load;Module._load=function(id,...rest){if(/classic-core|primitives|random/.test(id))throw Error('generation dependency forbidden');return original.call(this,id,...rest)};const {verifyArtifact}=require('./lib/verify');const data=JSON.parse(require('node:fs').readFileSync(0,'utf8'));process.stdout.write(verifyArtifact(data.artifact,data.spec).status);";
 const r=spawnSync(process.execPath,['-e',script],{cwd:path.resolve(__dirname,'..'),input:JSON.stringify({artifact:valid(),spec:example}),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'VERIFIED');
});
test('CLI saves and verifies an artifact, refuses overwrite and returns failure exits',()=>{
 const parent=path.join(__dirname,'.tmp');fs.mkdirSync(parent,{recursive:true});
 const dir=fs.mkdtempSync(path.join(parent,'cli-'));
 try{
  const spec=path.join(dir,'spec.json'),out=path.join(dir,'artifact.json'),bad=path.join(dir,'bad.json');
  fs.writeFileSync(spec,JSON.stringify(example));
  const cli=path.resolve(__dirname,'../bin/classic-wordsearch.js');
  const run=args=>spawnSync(process.execPath,[cli,...args],{cwd:dir,encoding:'utf8'});
  assert.equal(run(['generate',spec,out]).status,0);
  const before=fs.readFileSync(out);assert.equal(run(['generate',spec,out]).status,2);assert.deepEqual(fs.readFileSync(out),before);
  assert.equal(run(['verify',out,spec]).status,0);
  const tampered=JSON.parse(before);tampered.grid=[];fs.writeFileSync(bad,JSON.stringify(tampered));
  assert.equal(run(['verify',bad,spec]).status,1);
  assert.equal(run(['verify',out]).status,2);
  fs.writeFileSync(bad,'{broken');assert.equal(run(['generate',bad]).status,2);
  fs.writeFileSync(bad,' '.repeat(2*1024*1024+1));assert.equal(run(['generate',bad]).status,2);
  const failure=run(['generate',path.join(dir,'missing.json')]);
  assert.equal(failure.status,2);assert.ok(!failure.stderr.includes(dir));
 }finally{
  if(!dir.startsWith(parent+path.sep))throw Error('cleanup outside test boundary');
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
