import { rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,generateTask,openApp,tempWorkspace } from './helpers.js';

describe('Reward and Redemption Request',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;let studentId:number;
 beforeEach(async()=>{workspace=tempWorkspace();({db,app}=openApp(workspace));studentId=await createStudent(app)});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 async function earn(points=100){
  const task=await generateTask(app,studentId,{content:`任务${points}`,basePoints:points,taskOrder:points});
  await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/submit`).expect(201);
  await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/evaluations`).send({completion:'completed',confirm:true}).expect(200);
 }

 it('lets a parent maintain rewards and validates the cash conversion rate',async()=>{
  const created=await request(app).post(`/api/students/${studentId}/rewards`).send({name:'5元零钱',category:'cash',requiredPoints:100,cashAmount:5,description:'现金奖励'}).expect(201);
  expect(created.body.reward).toMatchObject({name:'5元零钱',category:'cash',requiredPoints:100,cashAmount:5,active:true});
  await request(app).post(`/api/students/${studentId}/rewards`).send({name:'错价现金',category:'cash',requiredPoints:100,cashAmount:10}).expect(400);
  await request(app).put(`/api/students/${studentId}/rewards/${created.body.reward.id}`).send({name:'周末游戏30分钟',category:'game_time',requiredPoints:120,description:'非现金',active:true}).expect(200);
  await request(app).put(`/api/students/${studentId}/rewards/${created.body.reward.id}`).send({name:'周末游戏30分钟',category:'game_time',requiredPoints:120,active:false}).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/rewards`).expect(200)).body.rewards[0].active).toBe(false);
 });

 it('creates a pending request without deducting points and rejects without changing balance',async()=>{
  await earn(100);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'看电影',category:'movie',requiredPoints:80}).expect(201)).body.reward;
  const requested=await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201);
  expect(requested.body.request.status).toBe('pending');
  expect(requested.body.pointsBalance).toBe(100);
  const rejected=await request(app).post(`/api/students/${studentId}/redemptions/${requested.body.request.id}/reject`).send({note:'今晚有作业'}).expect(200);
  expect(rejected.body.request.status).toBe('rejected');
  expect(rejected.body.pointsBalance).toBe(100);
 });

 it('approves a request once in the same transaction as the spending entry',async()=>{
  await earn(100);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'5元零钱',category:'cash',requiredPoints:100,cashAmount:5}).expect(201)).body.reward;
  const requested=await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201);
  const approved=await request(app).post(`/api/students/${studentId}/redemptions/${requested.body.request.id}/approve`).expect(200);
  expect(approved.body.request.status).toBe('approved');
  expect(approved.body.pointsBalance).toBe(0);
  await request(app).post(`/api/students/${studentId}/redemptions/${requested.body.request.id}/approve`).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/points`)).body.balance).toBe(0);
  const spends=(await request(app).get(`/api/students/${studentId}/points`)).body.entries.filter((entry:{entryType:string})=>entry.entryType==='spend');
  expect(spends).toHaveLength(1);
  expect(spends[0].amount).toBe(-100);
 });

 it('keeps a pending request unchanged when the balance is insufficient',async()=>{
  await earn(10);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'礼物',category:'gift',requiredPoints:80}).expect(201)).body.reward;
  const requested=await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201);
  const failed=await request(app).post(`/api/students/${studentId}/redemptions/${requested.body.request.id}/approve`).expect(409);
  expect(failed.body.request.status).toBe('pending');
  expect(failed.body.pointsBalance).toBe(10);
 });
});
