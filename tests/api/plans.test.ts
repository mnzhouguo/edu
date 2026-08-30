import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/db.js';

describe('Weekly Plan and Daily Plan API',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof createApp>;let directory:string;let studentId:number;
 beforeEach(async()=>{directory=mkdtempSync(join(tmpdir(),'edu-plan-'));db=openDatabase(join(directory,'test.sqlite'));app=createApp(db);studentId=(await request(app).post('/api/students').send({name:'小周',grade:'初二'})).body.student.id});
 afterEach(()=>{db.close();rmSync(directory,{recursive:true,force:true})});
 const task={weekStart:'2026-08-24',weekday:7,subject:'chinese',content:'复习《桃花源记》并完成练习',completionStandard:'完成教材练习，正确率达到80%',suggestedDuration:45,basePoints:10,taskOrder:1};
 it('creates a weekly task and materializes one stable daily snapshot',async()=>{
  const created=await request(app).post(`/api/students/${studentId}/weekly-tasks`).send(task).expect(201);expect(created.body.task).toMatchObject({subject:'chinese',suggestedDuration:45});
  const first=await request(app).post(`/api/students/${studentId}/daily-plan/generate`).send({date:'2026-08-30'}).expect(200);expect(first.body.tasks).toHaveLength(1);expect(first.body.tasks[0]).toMatchObject({content:task.content,completionStandard:task.completionStandard});
  await request(app).put(`/api/students/${studentId}/weekly-tasks/${created.body.task.id}`).send({...task,content:'已修改的周计划内容'}).expect(200);
  const second=await request(app).post(`/api/students/${studentId}/daily-plan/generate`).send({date:'2026-08-30'}).expect(200);expect(second.body.tasks).toHaveLength(1);expect(second.body.tasks[0].content).toBe(task.content);
 });
 it('lists by week, validates subjects, and deletes a weekly task',async()=>{
  const created=await request(app).post(`/api/students/${studentId}/weekly-tasks`).send(task).expect(201);
  expect((await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-24`).expect(200)).body.tasks).toHaveLength(1);
  await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({...task,subject:'chemistry'}).expect(400);
  await request(app).delete(`/api/students/${studentId}/weekly-tasks/${created.body.task.id}`).expect(204);
  expect((await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-24`)).body.tasks).toHaveLength(0);
 });
  it('keeps a generated snapshot when its planned weekly source is deleted',async()=>{
   const created=await request(app).post(`/api/students/${studentId}/weekly-tasks`).send(task).expect(201);
   await request(app).post(`/api/students/${studentId}/daily-plan/generate`).send({date:'2026-08-30'}).expect(200);
   await request(app).delete(`/api/students/${studentId}/weekly-tasks/${created.body.task.id}`).expect(204);
   const daily=(await request(app).get(`/api/students/${studentId}/daily-tasks?date=2026-08-30`).expect(200)).body.tasks;
   expect(daily).toHaveLength(1);expect(daily[0]).toMatchObject({content:task.content,sourceWeeklyTaskId:null});
  });
  it('rejects invalid dates, non-Monday week starts, and cross-student edits',async()=>{
   await request(app).post(`/api/students/${studentId}/daily-plan/generate`).send({date:'2026-02-31'}).expect(400);
   await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({...task,weekStart:'2026-08-25'}).expect(400);
   const created=await request(app).post(`/api/students/${studentId}/weekly-tasks`).send(task).expect(201);
   const other=(await request(app).post('/api/students').send({name:'另一个孩子'}).expect(201)).body.student.id;
   await request(app).put(`/api/students/${other}/weekly-tasks/${created.body.task.id}`).send(task).expect(404);
  }); it('persists task ordering and keeps hidden subject positions stable',async()=>{
  for(const [content,subject,order] of [['语文','chinese',1],['数学','math',2],['英语','english',3]] as const){await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({...task,content,subject,taskOrder:order}).expect(201)}
  const generated=(await request(app).post(`/api/students/${studentId}/daily-plan/generate`).send({date:'2026-08-30'}).expect(200)).body.tasks;
  const [chinese,math,english]=generated;
  await request(app).put('/api/daily-tasks/order').send({studentId,date:'2026-08-30',orderedIds:[english.id,math.id,chinese.id]}).expect(200);
  const listed=(await request(app).get(`/api/students/${studentId}/daily-tasks?date=2026-08-30`).expect(200)).body.tasks;
  expect(listed.map((item:{content:string})=>item.content)).toEqual(['英语','数学','语文']);
 });
});


