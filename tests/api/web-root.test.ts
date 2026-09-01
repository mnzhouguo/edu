import { mkdirSync,mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/db.js';

describe('Local Web App static shell',()=>{
 let db:DatabaseSync;let directory:string;let webRoot:string;
 beforeEach(()=>{
  directory=mkdtempSync(join(tmpdir(),'edu-web-'));
  webRoot=join(directory,'dist');
  mkdirSync(join(webRoot,'assets'),{recursive:true});
  writeFileSync(join(webRoot,'index.html'),'<!doctype html><title>成长计划</title><p>shell</p>');
  writeFileSync(join(webRoot,'assets','app.js'),'window.ready=true');
  db=openDatabase(join(directory,'test.sqlite'));
 });
 afterEach(()=>{db.close();rmSync(directory,{recursive:true,force:true})});
 it('keeps / as an empty 404 when no web root is configured',async()=>{
  const app=createApp(db);
  await request(app).get('/').expect(404);
  await request(app).get('/api/health').expect(200).expect({status:'ok'});
 });
 it('serves the built frontend and SPA fallback from the same origin as the API',async()=>{
  const app=createApp(db,{webRoot});
  const home=await request(app).get('/').expect(200);
  expect(home.text).toContain('成长计划');
  expect((await request(app).get('/assets/app.js').expect(200)).text).toContain('window.ready=true');
  expect((await request(app).get('/today').expect(200)).text).toContain('成长计划');
  await request(app).get('/api/health').expect(200).expect({status:'ok'});
  await request(app).get('/api/missing').expect(404).expect({message:'接口不存在'});
 });
});
