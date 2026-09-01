import { readdirSync,rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,generateTask,openApp,tempWorkspace,tinyPng } from './helpers.js';

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
  await request(app).delete(`/api/students/${studentId}/rewards/${created.body.reward.id}`).expect(204);
  expect((await request(app).get(`/api/students/${studentId}/rewards`).expect(200)).body.rewards).toHaveLength(0);
 });

 it('redeems a reward immediately and records the spend once',async()=>{
  await earn(100);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'看电影',category:'movie',requiredPoints:80,description:'周末一起看'}).expect(201)).body.reward;
  const redeemed=await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201);
  expect(redeemed.body.request).toMatchObject({rewardName:'看电影',quantity:1,requestedPoints:80,status:'approved'});
  expect(redeemed.body.pointsBalance).toBe(20);
  const records=(await request(app).get(`/api/students/${studentId}/redemptions`).expect(200)).body.requests;
  expect(records).toHaveLength(1);
  expect(records[0].rewardName).toBe('看电影');
  const spends=(await request(app).get(`/api/students/${studentId}/points`)).body.entries.filter((entry:{entryType:string})=>entry.entryType==='spend');
  expect(spends).toHaveLength(1);
  expect(spends[0].amount).toBe(-80);
  const points=(await request(app).get(`/api/students/${studentId}/points`).expect(200)).body;
  expect(points).toMatchObject({balance:20,totalEarned:100,weekEarned:100,weekRedeemed:80});
 });

 it('redeems a chosen quantity and records how many were exchanged',async()=>{
  await earn(100);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'1块钱',category:'gift',requiredPoints:10}).expect(201)).body.reward;
  const redeemed=await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id,quantity:3}).expect(201);
  expect(redeemed.body.request).toMatchObject({rewardName:'1块钱',quantity:3,requestedPoints:30,status:'approved'});
  expect(redeemed.body.pointsBalance).toBe(70);
  const records=(await request(app).get(`/api/students/${studentId}/redemptions`).expect(200)).body.requests;
  expect(records[0]).toMatchObject({rewardName:'1块钱',quantity:3,requestedPoints:30});
  const points=(await request(app).get(`/api/students/${studentId}/points`).expect(200)).body;
  expect(points).toMatchObject({balance:70,weekRedeemed:30});
 });

 it('rejects a quantity the balance cannot cover',async()=>{
  await earn(20);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'零食',category:'gift',requiredPoints:10}).expect(201)).body.reward;
  const failed=await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id,quantity:3}).expect(409);
  expect(failed.body.pointsBalance).toBe(20);
  expect((await request(app).get(`/api/students/${studentId}/redemptions`).expect(200)).body.requests).toHaveLength(0);
 });

 it('rejects a non-positive redemption quantity',async()=>{
  await earn(20);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'零食',category:'gift',requiredPoints:10}).expect(201)).body.reward;
  await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id,quantity:0}).expect(400);
  await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id,quantity:1.5}).expect(400);
 });

 it('does not create a record when the balance is insufficient',async()=>{
  await earn(10);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'礼物',category:'gift',requiredPoints:80}).expect(201)).body.reward;
  const failed=await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(409);
  expect(failed.body.pointsBalance).toBe(10);
  expect((await request(app).get(`/api/students/${studentId}/redemptions`).expect(200)).body.requests).toHaveLength(0);
 });

 it('shares the reward catalog across children while keeping points and redemptions separate',async()=>{
  const siblingId=await createStudent(app,'小希');
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'周末电影',category:'movie',requiredPoints:50,description:'全家共享奖品'}).expect(201)).body.reward;
  await request(app).post(`/api/students/${studentId}/rewards/${reward.id}/image`).attach('image',tinyPng,'电影.png').expect(200);

  const forSibling=(await request(app).get(`/api/students/${siblingId}/rewards`).expect(200)).body.rewards;
  expect(forSibling).toHaveLength(1);
  expect(forSibling[0]).toMatchObject({id:reward.id,name:'周末电影',requiredPoints:50,hasImage:true});
  await request(app).get(`/api/students/${siblingId}/rewards/${reward.id}/image`).expect(200);

  await earn(50);
  await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201);
  expect((await request(app).get(`/api/students/${siblingId}/redemptions`).expect(200)).body.requests).toHaveLength(0);
  expect((await request(app).get(`/api/students/${siblingId}/points`).expect(200)).body.balance).toBe(0);

  await request(app).put(`/api/students/${siblingId}/rewards/${reward.id}`).send({name:'周末电影加长版',category:'movie',requiredPoints:60,description:'仍共享',active:true}).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/rewards`).expect(200)).body.rewards[0]).toMatchObject({name:'周末电影加长版',requiredPoints:60});
 });

 it('uploads a reward image and serves it as the temptation photo',async()=>{
  const created=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'周末游戏30分钟',category:'game_time',requiredPoints:50}).expect(201)).body.reward;
  expect(created.hasImage).toBe(false);
  await request(app).get(`/api/students/${studentId}/rewards/${created.id}/image`).expect(404);
  const uploaded=await request(app).post(`/api/students/${studentId}/rewards/${created.id}/image`).attach('image',tinyPng,'游戏.png').expect(200);
  expect(uploaded.body.reward).toMatchObject({id:created.id,name:'周末游戏30分钟',hasImage:true});
  const image=await request(app).get(`/api/students/${studentId}/rewards/${created.id}/image`).expect(200);
  expect(image.headers['content-type']).toMatch(/image\/png/);
  expect((await request(app).get(`/api/students/${studentId}/rewards`).expect(200)).body.rewards[0].hasImage).toBe(true);
  await request(app).post(`/api/students/${studentId}/rewards/${created.id}/image`).attach('image',tinyPng,'新图.png').expect(200);
  expect(readdirSync(workspace.photoLibrary)).toHaveLength(1);
 });
});
