import { rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,generateTask,openApp,tempWorkspace,weeklyTask } from './helpers.js';

describe('Evaluation and Points ledger',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;let studentId:number;let taskId:number;
 beforeEach(async()=>{workspace=tempWorkspace();({db,app}=openApp(workspace));studentId=await createStudent(app);taskId=(await generateTask(app,studentId)).id;await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).expect(201)});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 async function evaluate(body:Record<string,unknown>,expected=200){
  return request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/evaluations`).send(body).expect(expected);
 }

 it('scores the four completion outcomes with whole-point rounding',async()=>{
  expect((await evaluate({completion:'not_completed',confirm:true})).body.task.earnedPoints).toBe(0);
  await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/evaluations`).send({completion:'partial',confirm:true}).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/daily-tasks?date=2026-08-30`)).body.tasks[0].earnedPoints).toBe(5);
  const second=await generateTask(app,studentId,{content:'第二项',taskOrder:2,basePoints:7});
  await request(app).post(`/api/students/${studentId}/daily-tasks/${second.id}/submit`).expect(201);
  const high=await request(app).post(`/api/students/${studentId}/daily-tasks/${second.id}/evaluations`).send({completion:'high_quality',confirm:true}).expect(200);
  expect(high.body.task.earnedPoints).toBe(8);
 });

 it('adds behavior bonuses and ignores Accuracy Band',async()=>{
  const result=await evaluate({completion:'completed',accuracyBand:'90',tags:['proactive','focused'],confirm:true});
  expect(result.body.task.earnedPoints).toBe(20);
  expect(result.body.task.evaluation.accuracyBand).toBe('90');
 });

 it('keeps a draft evaluation off the official balance',async()=>{
  const draft=await evaluate({completion:'high_quality',confirm:false});
  expect(draft.body.task.status).toBe('submitted');
  expect(draft.body.task.estimatedPoints).toBe(12);
  expect(draft.body.task.earnedPoints).toBeNull();
  expect(draft.body.pointsBalance).toBe(0);
 });

 it('posts one earning entry and ignores a repeated confirmation',async()=>{
  await evaluate({completion:'completed',confirm:true});
  const again=await evaluate({completion:'completed',confirm:true});
  expect(again.body.pointsBalance).toBe(10);
  expect(again.body.todayEarned).toBe(10);
  const points=(await request(app).get(`/api/students/${studentId}/points`).expect(200)).body;
  expect(points.balance).toBe(10);
  expect(points.entries.filter((entry:{entryType:string})=>entry.entryType==='earn')).toHaveLength(1);
 });

 it('records an adjustment when a confirmed evaluation is changed',async()=>{
  await evaluate({completion:'completed',confirm:true});
  const changed=await evaluate({completion:'high_quality',confirm:true});
  expect(changed.body.task.earnedPoints).toBe(12);
  expect(changed.body.pointsBalance).toBe(12);
  const points=(await request(app).get(`/api/students/${studentId}/points`)).body;
  expect(points.entries.map((entry:{entryType:string;amount:number})=>[entry.entryType,entry.amount])).toEqual([['earn',10],['adjust',2]]);
 });

 it('keeps two students\' official points isolated',async()=>{
  await evaluate({completion:'completed',confirm:true});
  const other=await createStudent(app,'弟弟');
  const otherTask=await generateTask(app,other,{content:'弟弟的任务'});
  await request(app).post(`/api/students/${other}/daily-tasks/${otherTask.id}/submit`).expect(201);
  await request(app).post(`/api/students/${other}/daily-tasks/${otherTask.id}/evaluations`).send({completion:'high_quality',tags:['on_time'],confirm:true}).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/points`)).body.balance).toBe(10);
  expect((await request(app).get(`/api/students/${other}/points`)).body.balance).toBe(17);
 });
});
