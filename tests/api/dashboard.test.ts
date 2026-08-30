import { rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,generateTask,openApp,tempWorkspace } from './helpers.js';

describe('Parent Dashboard',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;
 beforeEach(()=>{workspace=tempWorkspace();({db,app}=openApp(workspace))});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 it('shows empty-state metrics when the student has no tasks or ledger entries',async()=>{
  const studentId=await createStudent(app);
  const dashboard=(await request(app).get(`/api/students/${studentId}/dashboard?date=2026-08-30`).expect(200)).body.dashboard;
  expect(dashboard).toMatchObject({planned:0,submitted:0,evaluated:0,completed:0,todayCompletionRate:null,todayEarned:0,todaySpent:0,weekEarned:0,weekSpent:0,pointsBalance:0,empty:true});
  expect(dashboard.weekTrend).toHaveLength(7);
  expect(dashboard.weekTrend.every((day:{completionRate:null|number})=>day.completionRate===null)).toBe(true);
 });

 it('counts today and this week from official daily tasks and ledger entries',async()=>{
  const studentId=await createStudent(app);
  const first=await generateTask(app,studentId,{content:'语文',subject:'chinese',taskOrder:1,basePoints:10});
  const second=await generateTask(app,studentId,{content:'数学',subject:'math',taskOrder:2,basePoints:20});
  await request(app).post(`/api/students/${studentId}/daily-tasks/${first.id}/submit`).expect(201);
  await request(app).post(`/api/students/${studentId}/daily-tasks/${first.id}/evaluations`).send({completion:'completed',confirm:true}).expect(200);
  await request(app).post(`/api/students/${studentId}/daily-tasks/${second.id}/submit`).expect(201);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'游戏',category:'game_time',requiredPoints:10}).expect(201)).body.reward;
  const redemption=(await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201)).body.request;
  await request(app).post(`/api/students/${studentId}/redemptions/${redemption.id}/approve`).expect(200);
  const dashboard=(await request(app).get(`/api/students/${studentId}/dashboard?date=2026-08-30`).expect(200)).body.dashboard;
  expect(dashboard).toMatchObject({planned:0,submitted:1,evaluated:1,completed:1,todayCompletionRate:0.5,todayEarned:10,todaySpent:10,weekEarned:10,weekSpent:10,pointsBalance:0,empty:false});
  expect(dashboard.weekTrend.find((day:{date:string})=>day.date==='2026-08-30').completionRate).toBe(0.5);
 });

 it('scopes every metric to the active student',async()=>{
  const first=await createStudent(app,'姐姐');
  const second=await createStudent(app,'弟弟');
  const task=await generateTask(app,first,{content:'姐姐任务'});
  await request(app).post(`/api/students/${first}/daily-tasks/${task.id}/submit`).expect(201);
  await request(app).post(`/api/students/${first}/daily-tasks/${task.id}/evaluations`).send({completion:'high_quality',confirm:true}).expect(200);
  const other=(await request(app).get(`/api/students/${second}/dashboard?date=2026-08-30`).expect(200)).body.dashboard;
  expect(other).toMatchObject({planned:0,submitted:0,evaluated:0,completed:0,pointsBalance:0,empty:true});
 });
});
