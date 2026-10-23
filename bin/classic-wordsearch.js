#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const {generate,verifyArtifact}=require('../index');
const LIMIT=2*1024*1024;
function read(file) {
  const fd=fs.openSync(file,'r');
  try {
    const stat=fs.fstatSync(fd);
    if(!stat.isFile()||stat.size>LIMIT) throw new Error('Input must be a regular JSON file at most 2 MiB');
    const bytes=Buffer.alloc(LIMIT+1);let used=0,n;
    while(used<bytes.length&&(n=fs.readSync(fd,bytes,used,bytes.length-used,null))>0)used+=n;
    if(used>LIMIT)throw new Error('Input exceeds 2 MiB');
    return JSON.parse(bytes.subarray(0,used).toString('utf8').replace(/^\uFEFF/,''));
  }finally{fs.closeSync(fd);}
}
function main(args) {
  const [mode,a,b]=args;
  if(mode==='--help'||mode==='help') {
    console.log('generate SPEC.json [NEW_ARTIFACT.json]\nverify ARTIFACT.json ORIGINAL_SPEC.json\nOutput files are never overwritten. Verification requires the external spec.');return;
  }
  if(mode==='generate'&&a&&args.length<=3) {
    const artifact=generate(read(a)),text=JSON.stringify(artifact,null,2)+'\n';
    if(b)fs.writeFileSync(b,text,{flag:'wx'});else process.stdout.write(text);
    return;
  }
  if(mode==='verify'&&a&&b&&args.length===3) {
    const result=verifyArtifact(read(a),read(b));console.log(JSON.stringify(result,null,2));
    if(result.status!=='VERIFIED')process.exitCode=1;return;
  }
  throw new Error('Usage: classic-wordsearch generate SPEC [OUTPUT] | verify ARTIFACT ORIGINAL_SPEC | --help');
}
try{main(process.argv.slice(2));}catch(e){
  // Keep stack traces and absolute local paths out of routine CLI error output.
  console.error(JSON.stringify({status:'FAILED',code:e.code||'INPUT_ERROR'}));process.exitCode=2;
}
