import { mkdtempSync,readdirSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/db.js';
import { openApp,tempWorkspace,tinyPng } from './helpers.js';

describe('Student Profile API',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof createApp>;let directory:string;let databasePath:string;
 beforeEach(()=>{directory=mkdtempSync(join(tmpdir(),'edu-api-'));databasePath=join(directory,'test.sqlite');db=openDatabase(databasePath);app=createApp(db)});
 afterEach(()=>{db.close();rmSync(directory,{recursive:true,force:true})});
 it('creates, persists, lists, reads, and edits a student profile',async()=>{
  const created=await request(app).post('/api/students').send({name:'小周',grade:'初二',school:'长沙市实验中学',currentGoal:'数学稳定在90分以上'}).expect(201);const id=created.body.student.id;
  db.close();db=openDatabase(databasePath);app=createApp(db);
  expect((await request(app).get('/api/students').expect(200)).body.students).toHaveLength(1);
  await request(app).put(`/api/students/${id}`).send({name:'小周同学',grade:'初二',school:'长沙市实验中学',currentGoal:'进入年级前100名'}).expect(200);
  expect((await request(app).get(`/api/students/${id}`).expect(200)).body.student).toMatchObject({name:'小周同学',currentGoal:'进入年级前100名'});
 });
 it('keeps two profiles distinct while one is edited',async()=>{
  const first=await request(app).post('/api/students').send({name:'姐姐',grade:'初二',school:'一中',currentGoal:'前100名'}).expect(201);const second=await request(app).post('/api/students').send({name:'弟弟',grade:'初一',school:'二中',currentGoal:'前200名'}).expect(201);
  await request(app).put(`/api/students/${first.body.student.id}`).send({name:'姐姐',grade:'初三',school:'一中',currentGoal:'前50名'}).expect(200);
  expect((await request(app).get(`/api/students/${second.body.student.id}`).expect(200)).body.student).toMatchObject({name:'弟弟',grade:'初一',school:'二中',currentGoal:'前200名'});
  const listed=(await request(app).get('/api/students').expect(200)).body.students;expect(listed.map((item:{name:string})=>item.name)).toEqual(['姐姐','弟弟']);
 });
 it('validates names and unknown ids',async()=>{await request(app).post('/api/students').send({name:'  '}).expect(400);await request(app).get('/api/students/999').expect(404)});
 it('stores semester start and end dates for weekly plan labeling',async()=>{
  const created=await request(app).post('/api/students').send({name:'嘟嘟',grade:'初二'}).expect(201);
  expect(created.body.student).toMatchObject({semesterStart:null,semesterEnd:null});
  const updated=await request(app).put(`/api/students/${created.body.student.id}`).send({
   name:'嘟嘟',grade:'初二',school:'',currentGoal:'',semesterStart:'2026-08-31',semesterEnd:'2027-01-15'
  }).expect(200);
  expect(updated.body.student).toMatchObject({semesterStart:'2026-08-31',semesterEnd:'2027-01-15'});
  await request(app).put(`/api/students/${created.body.student.id}`).send({
   name:'嘟嘟',grade:'初二',school:'',currentGoal:'',semesterStart:'2027-01-15',semesterEnd:'2026-08-31'
  }).expect(400);
 });
});

describe('Student Profile avatar',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;
 beforeEach(()=>{workspace=tempWorkspace();({db,app}=openApp(workspace))});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 it('uploads a circular avatar and serves it on the student profile',async()=>{
  const created=(await request(app).post('/api/students').send({name:'嘟嘟',grade:'初二'}).expect(201)).body.student;
  expect(created.hasAvatar).toBe(false);
  await request(app).get(`/api/students/${created.id}/avatar`).expect(404);
  const uploaded=await request(app).post(`/api/students/${created.id}/avatar`).attach('avatar',tinyPng,'头像.png').expect(200);
  expect(uploaded.body.student).toMatchObject({id:created.id,name:'嘟嘟',hasAvatar:true});
  const image=await request(app).get(`/api/students/${created.id}/avatar`).expect(200);
  expect(image.headers['content-type']).toMatch(/image\/png/);
  expect((await request(app).get('/api/students').expect(200)).body.students[0].hasAvatar).toBe(true);
  await request(app).post(`/api/students/${created.id}/avatar`).attach('avatar',tinyPng,'新头像.png').expect(200);
  expect(readdirSync(workspace.photoLibrary)).toHaveLength(1);
 });
});

