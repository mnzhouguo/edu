import { existsSync,readdirSync,rmSync,unlinkSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,generateTask,openApp,tempWorkspace,tinyPng } from './helpers.js';

describe('Student Submission and Photo Evidence',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;let studentId:number;let taskId:number;
 beforeEach(async()=>{workspace=tempWorkspace();({db,app}=openApp(workspace,200));studentId=await createStudent(app);taskId=(await generateTask(app,studentId)).id});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 it('submits a planned study task with note and photos without changing points balance',async()=>{
  const submitted=await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).field('note','已完成课后练习').attach('photos',tinyPng,'练习页.png').expect(201);
  expect(submitted.body.task).toMatchObject({status:'submitted',estimatedPoints:10});
  expect(submitted.body.task.submission).toMatchObject({note:'已完成课后练习'});
  expect(submitted.body.task.submission.photos).toHaveLength(1);
  expect(submitted.body.task.submission.photos[0]).toMatchObject({originalFilename:'练习页.png',mediaType:'image/png'});
  expect(submitted.body.task.submission.photos[0].relativePath).not.toMatch(/\.\.|\\\\|\//);
  expect(submitted.body.pointsBalance).toBe(0);
  const listed=(await request(app).get(`/api/students/${studentId}/daily-tasks?date=2026-08-30`).expect(200)).body.tasks[0];
  expect(listed.status).toBe('submitted');
  expect(listed.estimatedPoints).toBe(10);
 });

 it('keeps submissions and photos after the database is reopened',async()=>{
  await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).attach('photos',tinyPng,'work.png').expect(201);
  const stored=readdirSync(workspace.photoLibrary);
  expect(stored).toHaveLength(1);
  db.close();
  ({db,app}=openApp(workspace,200));
  const listed=(await request(app).get(`/api/students/${studentId}/daily-tasks?date=2026-08-30`).expect(200)).body.tasks[0];
  expect(listed.status).toBe('submitted');
  expect(listed.submission.photos[0].originalFilename).toBe('work.png');
  await request(app).get(`/api/students/${studentId}/photos/${listed.submission.photos[0].id}`).expect(200);
 });

 it('rejects unsupported types, oversized files, and path-escaping names without writing files',async()=>{
  await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).attach('photos',Buffer.from('not-an-image'),'notes.txt').expect(400);
  await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).attach('photos',Buffer.alloc(201),{filename:'big.png',contentType:'image/png'}).expect(400);
  await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).attach('photos',tinyPng,'../../escape.png').expect(201);
  const files=existsSync(workspace.photoLibrary)?readdirSync(workspace.photoLibrary):[];
  expect(files.every(name=>!name.includes('..'))).toBe(true);
  expect(files).toHaveLength(1);
 });

 it('does not leave orphan files when the task cannot be submitted',async()=>{
  await request(app).post(`/api/students/${studentId}/daily-tasks/999/submit`).attach('photos',tinyPng,'lost.png').expect(404);
  expect(existsSync(workspace.photoLibrary)?readdirSync(workspace.photoLibrary):[]).toHaveLength(0);
 });

 it('lists a task when its photo file is missing',async()=>{
  const submitted=await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).attach('photos',tinyPng,'gone.png').expect(201);
  unlinkSync(join(workspace.photoLibrary,submitted.body.task.submission.photos[0].relativePath));
  const listed=(await request(app).get(`/api/students/${studentId}/daily-tasks?date=2026-08-30`).expect(200)).body.tasks[0];
  expect(listed.submission.photos[0].originalFilename).toBe('gone.png');
  await request(app).get(`/api/students/${studentId}/photos/${listed.submission.photos[0].id}`).expect(404);
 });

 it('treats a repeated submit as the same submission',async()=>{
  await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).field('note','第一次').expect(201);
  const again=await request(app).post(`/api/students/${studentId}/daily-tasks/${taskId}/submit`).field('note','第二次').expect(200);
  expect(again.body.task.submission.note).toBe('第一次');
 });
});
