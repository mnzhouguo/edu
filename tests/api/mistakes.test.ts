import { readdirSync,rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,openApp,tempWorkspace,tinyPng } from './helpers.js';

describe('Mistake Notebook',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;let studentId:number;
 beforeEach(async()=>{workspace=tempWorkspace();({db,app}=openApp(workspace));studentId=await createStudent(app)});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 const mistake={subject:'math',summary:'一次函数图像题',reason:'formula',reasonNote:'把k的符号看反了',correctSolution:'先判断k的正负再画图像',redoStatus:'not_redone'};

 it('creates, filters, edits, and deletes a mistake with photo evidence',async()=>{
  const created=await request(app).post(`/api/students/${studentId}/mistakes`).field(mistake).attach('photos',tinyPng,'错题.png').expect(201);
  expect(created.body.mistake).toMatchObject({subject:'math',summary:'一次函数图像题',reason:'formula',redoStatus:'not_redone'});
  expect(created.body.mistake.photos).toHaveLength(1);
  await request(app).post(`/api/students/${studentId}/mistakes`).send({...mistake,subject:'chinese',summary:'文言文虚词'}).expect(201);
  expect((await request(app).get(`/api/students/${studentId}/mistakes?subject=math`).expect(200)).body.mistakes).toHaveLength(1);
  await request(app).put(`/api/students/${studentId}/mistakes/${created.body.mistake.id}`).send({...mistake,redoStatus:'redone_correct',correctSolution:'已订正'}).expect(200);
  await request(app).delete(`/api/students/${studentId}/mistakes/${created.body.mistake.id}`).expect(204);
  expect((await request(app).get(`/api/students/${studentId}/mistakes`).expect(200)).body.mistakes).toHaveLength(1);
 });

 it('keeps two students\' mistakes isolated and readable after reopen',async()=>{
  await request(app).post(`/api/students/${studentId}/mistakes`).field(mistake).attach('photos',tinyPng,'题.png').expect(201);
  const other=await createStudent(app,'弟弟');
  await request(app).post(`/api/students/${other}/mistakes`).send({...mistake,summary:'弟弟的错题'}).expect(201);
  expect((await request(app).get(`/api/students/${studentId}/mistakes`)).body.mistakes.map((item:{summary:string})=>item.summary)).toEqual(['一次函数图像题']);
  db.close();
  ({db,app}=openApp(workspace));
  const listed=(await request(app).get(`/api/students/${studentId}/mistakes`).expect(200)).body.mistakes;
  expect(listed[0].photos[0].originalFilename).toBe('题.png');
  expect(readdirSync(workspace.photoLibrary)).toHaveLength(1);
  await request(app).get(`/api/students/${studentId}/photos/${listed[0].photos[0].id}`).expect(200);
 });
});
