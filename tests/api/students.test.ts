import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/db.js';

describe('Student Profile API',()=>{
  let db:DatabaseSync; let app:ReturnType<typeof createApp>;
  beforeEach(()=>{ db=openDatabase(':memory:'); app=createApp(db); }); afterEach(()=>db.close());
  it('creates, lists, reads, and edits a student profile',async()=>{
    const created=await request(app).post('/api/students').send({name:'小周',grade:'初二',school:'长沙市实验中学',currentGoal:'数学稳定在90分以上'}).expect(201);
    const id=created.body.student.id; expect(created.body.student).toMatchObject({name:'小周',grade:'初二'});
    expect((await request(app).get('/api/students').expect(200)).body.students).toHaveLength(1);
    await request(app).put(`/api/students/${id}`).send({name:'小周同学',grade:'初二',school:'长沙市实验中学',currentGoal:'进入年级前100名'}).expect(200);
    expect((await request(app).get(`/api/students/${id}`).expect(200)).body.student).toMatchObject({name:'小周同学',currentGoal:'进入年级前100名'});
  });
  it('keeps two profiles distinct',async()=>{
    const first=await request(app).post('/api/students').send({name:'姐姐',grade:'初二'}).expect(201);
    const second=await request(app).post('/api/students').send({name:'弟弟',grade:'初一'}).expect(201);
    expect((await request(app).get(`/api/students/${first.body.student.id}`)).body.student.name).toBe('姐姐');
    expect((await request(app).get(`/api/students/${second.body.student.id}`)).body.student.name).toBe('弟弟');
  });
  it('validates names and unknown ids',async()=>{ await request(app).post('/api/students').send({name:'  '}).expect(400); await request(app).get('/api/students/999').expect(404); });
});
