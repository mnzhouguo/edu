import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/db.js';

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
});
