import { rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,openApp,tempWorkspace } from './helpers.js';

describe('Extra channel points reward',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;let studentId:number;
 beforeEach(async()=>{workspace=tempWorkspace();({db,app}=openApp(workspace));studentId=await createStudent(app)});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 it('records an extra-channel points reward with a reason note',async()=>{
  const created=await request(app).post(`/api/students/${studentId}/points/extra-rewards`)
   .send({amount:15,note:'微信群老师表扬表演'})
   .expect(201);
  expect(created.body.entry).toMatchObject({
   entryType:'earn',
   amount:15,
   sourceType:'extra_reward',
   note:'微信群老师表扬表演',
   sourceLabel:'微信群老师表扬表演',
  });
  expect(created.body.pointsBalance).toBe(15);

  const points=(await request(app).get(`/api/students/${studentId}/points`).expect(200)).body;
  expect(points).toMatchObject({balance:15,totalEarned:15,weekEarned:15});
  const earns=points.entries.filter((entry:{entryType:string})=>entry.entryType==='earn');
  expect(earns).toHaveLength(1);
  expect(earns[0]).toMatchObject({amount:15,note:'微信群老师表扬表演',sourceLabel:'微信群老师表扬表演',sourceType:'extra_reward'});
 });

 it('rejects invalid extra rewards',async()=>{
  await request(app).post(`/api/students/${studentId}/points/extra-rewards`).send({amount:0,note:'表扬'}).expect(400);
  await request(app).post(`/api/students/${studentId}/points/extra-rewards`).send({amount:10,note:'   '}).expect(400);
  await request(app).post(`/api/students/${studentId}/points/extra-rewards`).send({amount:1.5,note:'表扬'}).expect(400);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body.balance).toBe(0);
 });

 it('labels weekly task earns with the task content',async()=>{
  const created=(await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-31',weekday:1,subject:'chinese',content:'每天学校作业',completionStandard:'完成并订正',suggestedDuration:30,basePoints:10,taskOrder:1,
  }).expect(201)).body.task;
  const rubric=created.evaluationRubric;
  const dimensionScores=Object.fromEntries(rubric.dimensions.map((dimension:{id:string;maxPoints:number})=>[dimension.id,dimension.maxPoints]));
  await request(app).post(`/api/students/${studentId}/weekly-tasks/${created.id}/execution`)
   .send({status:'completed',actualDuration:20,dimensionScores})
   .expect(200);
  const points=(await request(app).get(`/api/students/${studentId}/points`).expect(200)).body;
  const earn=points.entries.find((entry:{entryType:string})=>entry.entryType==='earn');
  expect(earn).toMatchObject({sourceType:'weekly_task',sourceLabel:'每天学校作业'});
  expect(earn.amount).toBeGreaterThan(0);
 });
});
