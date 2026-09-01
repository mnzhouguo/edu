import { existsSync,readdirSync,rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,describe,expect,it } from 'vitest';
import { createStudent,generateTask,openApp,tempWorkspace,tinyPng } from './helpers.js';

describe('V1 core loop persistence and guards',()=>{
 it('completes the core loop on a freshly migrated database and keeps it after reopen',async()=>{
  const workspace=tempWorkspace();
  let {db,app}=openApp(workspace);
  try{
   const versions=(db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as {version:number}[]).map(row=>row.version);
   expect(versions).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]);
   const studentId=await createStudent(app);
   const task=await generateTask(app,studentId);
   await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/submit`).attach('photos',tinyPng,'练习.png').expect(201);
   await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/evaluations`).send({completion:'completed',confirm:true}).expect(200);
   const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'游戏30分钟',category:'game_time',requiredPoints:10}).expect(201)).body.reward;
   const redemption=(await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201)).body.request;
   await request(app).post(`/api/students/${studentId}/redemptions/${redemption.id}/approve`).expect(200);
   expect((await request(app).get(`/api/students/${studentId}/points`)).body.balance).toBe(0);
   db.close();
   ({db,app}=openApp(workspace));
   expect((await request(app).get(`/api/students/${studentId}/points`)).body.balance).toBe(0);
   const listed=(await request(app).get(`/api/students/${studentId}/daily-tasks?date=2026-08-30`)).body.tasks[0];
   expect(listed.status).toBe('evaluated');
   await request(app).get(`/api/students/${studentId}/photos/${listed.submission.photos[0].id}`).expect(200);
   expect(readdirSync(workspace.photoLibrary)).toHaveLength(1);
  }finally{db.close();rmSync(workspace.directory,{recursive:true,force:true})}
 });

 it('does not create duplicate ledger rows for repeated submit, evaluate, or approve',async()=>{
  const workspace=tempWorkspace();
  const {db,app}=openApp(workspace,200);
  try{
   const studentId=await createStudent(app);
   const task=await generateTask(app,studentId);
   await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/submit`).expect(201);
   await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/submit`).expect(200);
   await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/evaluations`).send({completion:'completed',confirm:true}).expect(200);
   await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/evaluations`).send({completion:'completed',confirm:true}).expect(200);
   const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'礼物',category:'gift',requiredPoints:10}).expect(201)).body.reward;
   const redemption=(await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201)).body.request;
   await request(app).post(`/api/students/${studentId}/redemptions/${redemption.id}/approve`).expect(200);
   await request(app).post(`/api/students/${studentId}/redemptions/${redemption.id}/approve`).expect(200);
   const entries=(await request(app).get(`/api/students/${studentId}/points`)).body.entries;
   expect(entries.filter((entry:{entryType:string})=>entry.entryType==='earn')).toHaveLength(1);
   expect(entries.filter((entry:{entryType:string})=>entry.entryType==='spend')).toHaveLength(1);
   await request(app).post(`/api/students/${studentId}/daily-tasks/${task.id}/submit`).attach('photos',Buffer.from('bad'),'x.txt').expect(409);
   expect(existsSync(workspace.photoLibrary)?readdirSync(workspace.photoLibrary):[]).toHaveLength(0);
  }finally{db.close();rmSync(workspace.directory,{recursive:true,force:true})}
 });
});


