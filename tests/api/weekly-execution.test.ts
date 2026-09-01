import { mkdtempSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/db.js';
import { purgeOrphanWeeklyTaskLedger } from '../../server/ledger.js';

describe('Weekly task execution',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof createApp>;let directory:string;let studentId:number;let taskId:number;
 beforeEach(async()=>{
  directory=mkdtempSync(join(tmpdir(),'edu-exec-'));
  db=openDatabase(join(directory,'test.sqlite'));
  app=createApp(db);
  studentId=(await request(app).post('/api/students').send({name:'嘟嘟'})).body.student.id;
  const created=await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-31',weekday:1,subject:'chinese',content:'学校作业',completionStandard:'完成并订正',suggestedDuration:30,basePoints:10,taskOrder:1
  }).expect(201);
  taskId=created.body.task.id;
  expect(created.body.task.executionStatus).toBe('not_started');
  expect(created.body.task.evaluationRubric.dimensions).toHaveLength(3);
 });
 afterEach(()=>{db.close();rmSync(directory,{recursive:true,force:true})});

 it('completes a task with dimension scores and records actual duration and earned points',async()=>{
  const rubric=(await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].evaluationRubric;
  const dimensionScores=Object.fromEntries(rubric.dimensions.map((dimension:{id:string;maxPoints:number})=>[dimension.id,dimension.maxPoints+1]));
  const result=await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({
   status:'completed',actualDuration:28,dimensionScores
  }).expect(200);
  expect(result.body.task.executionStatus).toBe('completed');
  expect(result.body.task.actualDuration).toBe(28);
  expect(result.body.task.earnedPoints).toBeGreaterThan(10);
  expect(result.body.pointsBalance).toBe(result.body.task.earnedPoints);

  await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({status:'voided'}).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body.balance).toBe(0);
 });

 it('clears earned points when status returns to not_started',async()=>{
  const rubric=(await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].evaluationRubric;
  const dimensionScores=Object.fromEntries(rubric.dimensions.map((dimension:{id:string;maxPoints:number})=>[dimension.id,dimension.maxPoints]));
  const completed=await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({
   status:'completed',actualDuration:30,dimensionScores
  }).expect(200);
  expect(completed.body.task.earnedPoints).toBeGreaterThan(0);
  expect(completed.body.pointsBalance).toBe(completed.body.task.earnedPoints);

  const reset=await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({status:'not_started'}).expect(200);
  expect(reset.body.task.executionStatus).toBe('not_started');
  expect(reset.body.task.earnedPoints).toBeNull();
  expect(reset.body.task.actualDuration).toBeNull();
  expect(reset.body.task.dimensionScores).toBeNull();
  expect(reset.body.pointsBalance).toBe(0);
  expect((await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].earnedPoints).toBeNull();
 });

 it('does not count reversed weekly execution toward total earned points',async()=>{
  const rubric=(await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].evaluationRubric;
  const dimensionScores=Object.fromEntries(rubric.dimensions.map((dimension:{id:string;maxPoints:number})=>[dimension.id,dimension.maxPoints]));
  const completed=await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({
   status:'completed',actualDuration:30,dimensionScores
  }).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body.totalEarned).toBe(completed.body.task.earnedPoints);
  await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({status:'not_started'}).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body).toMatchObject({balance:0,totalEarned:0});
  const again=await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({
   status:'completed',actualDuration:30,dimensionScores
  }).expect(200);
  const points=(await request(app).get(`/api/students/${studentId}/points`).expect(200)).body;
  expect(points.totalEarned).toBe(again.body.task.earnedPoints);
  expect(points.balance).toBe(again.body.task.earnedPoints);
 });

 it('rejects deleting a completed weekly task and keeps its earned points',async()=>{
  const rubric=(await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].evaluationRubric;
  const dimensionScores=Object.fromEntries(rubric.dimensions.map((dimension:{id:string;maxPoints:number})=>[dimension.id,dimension.maxPoints]));
  const completed=await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({
   status:'completed',actualDuration:30,dimensionScores
  }).expect(200);
  const earned=completed.body.task.earnedPoints;
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body.totalEarned).toBe(earned);
  const denied=await request(app).delete(`/api/students/${studentId}/weekly-tasks/${taskId}`).expect(409);
  expect(denied.body.message).toBe('已完成的任务不能删除');
  expect((await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks).toHaveLength(1);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body).toMatchObject({balance:earned,totalEarned:earned});
 });

 it('removes leftover points when an incomplete weekly task is deleted',async()=>{
  const rubric=(await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].evaluationRubric;
  const dimensionScores=Object.fromEntries(rubric.dimensions.map((dimension:{id:string;maxPoints:number})=>[dimension.id,dimension.maxPoints]));
  const completed=await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({
   status:'completed',actualDuration:30,dimensionScores
  }).expect(200);
  expect(completed.body.task.earnedPoints).toBeGreaterThan(0);
  db.prepare("UPDATE weekly_tasks SET execution_status='not_started',earned_points=NULL WHERE id=?").run(taskId);
  await request(app).delete(`/api/students/${studentId}/weekly-tasks/${taskId}`).expect(204);
  expect((await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks).toHaveLength(0);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body).toMatchObject({balance:0,totalEarned:0});
 });

 it('drops ledger rows whose weekly task no longer exists',async()=>{
  const rubric=(await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].evaluationRubric;
  const dimensionScores=Object.fromEntries(rubric.dimensions.map((dimension:{id:string;maxPoints:number})=>[dimension.id,dimension.maxPoints]));
  await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({
   status:'completed',actualDuration:30,dimensionScores
  }).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body.totalEarned).toBeGreaterThan(0);
  db.prepare('DELETE FROM weekly_tasks WHERE id=?').run(taskId);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body.totalEarned).toBeGreaterThan(0);
  purgeOrphanWeeklyTaskLedger(db);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body).toMatchObject({balance:0,totalEarned:0});
 });

 it('defers a task and rejects negative dimension scores',async()=>{
  await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({status:'deferred'}).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].executionStatus).toBe('deferred');
  const rubric=(await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-31`).expect(200)).body.tasks[0].evaluationRubric;
  await request(app).post(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`).send({
   status:'completed',actualDuration:20,dimensionScores:{[rubric.dimensions[0].id]:-1}
  }).expect(400);
 });
});
