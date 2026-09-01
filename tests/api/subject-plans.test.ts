import { rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,openApp,tempWorkspace } from './helpers.js';

describe('Subject Plan and Subject Plan Generation',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;let studentId:number;
 beforeEach(async()=>{workspace=tempWorkspace();({db,app}=openApp(workspace));studentId=await createStudent(app)});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 it('adds a custom student subject with a general study area and generates its plan items',async()=>{
  const custom=(await request(app).post(`/api/students/${studentId}/subjects`).send({label:'化学'}).expect(201)).body.subject;
  expect(custom).toMatchObject({label:'化学',custom:true});
  const subjects=(await request(app).get(`/api/students/${studentId}/subjects`).expect(200)).body.subjects;
  expect(subjects.map((item:{label:string})=>item.label)).toContain('化学');
  const plan=(await request(app).get(`/api/students/${studentId}/subject-plans/${encodeURIComponent(custom.id)}`).expect(200)).body.plan;
  expect(plan.areas).toEqual([expect.objectContaining({id:'general',label:'综合学习'})]);
  const item=(await request(app).post(`/api/students/${studentId}/subject-plans/${encodeURIComponent(custom.id)}/items`).send({name:'化学方程式',cadence:'weekly',weekdays:[6],materialId:null,suggestedDuration:30,completionStandard:'完成方程式练习并订正',basePoints:10,active:true,sortOrder:1}).expect(201)).body.item;
  const tasks=(await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-31'}).expect(200)).body.tasks;
  expect(tasks.find((task:{sourceKnowledgeArea:string})=>task.sourceKnowledgeArea===`plan_item:${item.id}`)).toMatchObject({subject:custom.id,content:'化学方程式'});
 });
 it('rejects an empty Subject Goal narrative',async()=>{
  await request(app).put(`/api/students/${studentId}/subject-plans/english`).send({goal:{narrative:'  '},areas:[]}).expect(400);
 });

 it('returns the fixed Knowledge Area catalog with defaults and persists goal, enable, intensity, and materials',async()=>{
  const plan=(await request(app).get(`/api/students/${studentId}/subject-plans/english`).expect(200)).body.plan;
  expect(plan.subject).toBe('english');
  expect(plan.goal).toMatchObject({narrative:'',currentScore:null,targetScore:null,targetDate:null});
  expect(plan.areas.map((area:{id:string})=>area.id)).toEqual(['vocabulary','sentence_patterns','reading','cloze','listening','writing_sentences']);
  expect(plan.areas[0]).toMatchObject({enabled:false,sessionsPerWeek:3,suggestedDuration:20,materials:[]});

  await request(app).put(`/api/students/${studentId}/subject-plans/english`).send({
   goal:{narrative:'英语从95提到110',currentScore:95,targetScore:110,targetDate:'2026-12-31'},
   areas:[{id:'vocabulary',enabled:true,sortOrder:1,sessionsPerWeek:5,suggestedDuration:15},{id:'reading',enabled:true,sortOrder:2,sessionsPerWeek:3,suggestedDuration:25}]
  }).expect(200);

  const material=(await request(app).post(`/api/students/${studentId}/subject-plans/english/areas/vocabulary/materials`).send({name:'中考词汇手册',type:'workbook',note:'每天20个'}).expect(201)).body.material;
  expect(material).toMatchObject({name:'中考词汇手册',type:'workbook'});
  const updatedMaterial=(await request(app).put(`/api/students/${studentId}/subject-plans/materials/${material.id}`).send({name:'新版中考词汇手册',type:'handout',note:'每天30个',areaId:'reading'}).expect(200)).body.material;
  expect(updatedMaterial).toMatchObject({name:'新版中考词汇手册',type:'handout',note:'每天30个',areaId:'reading'});

  db.close();
  ({db,app}=openApp(workspace));
  const saved=(await request(app).get(`/api/students/${studentId}/subject-plans/english`).expect(200)).body.plan;
  expect(saved.goal).toMatchObject({narrative:'英语从95提到110',currentScore:95,targetScore:110,targetDate:'2026-12-31'});
  const vocabulary=saved.areas.find((area:{id:string})=>area.id==='vocabulary');
  expect(vocabulary).toMatchObject({enabled:true,sessionsPerWeek:5,suggestedDuration:15});
  const reading=saved.areas.find((area:{id:string})=>area.id==='reading');
  expect(vocabulary.materials).toHaveLength(0);
  expect(reading.materials[0].name).toBe('新版中考词汇手册');
 });

 it('generates missing Weekly Plan tasks from enabled areas and gap-fills without overwriting',async()=>{
  await request(app).put(`/api/students/${studentId}/subject-plans/english`).send({
   goal:{narrative:'提分'},
   areas:[{id:'vocabulary',enabled:true,sortOrder:1,sessionsPerWeek:5,suggestedDuration:15}]
  }).expect(200);
  await request(app).post(`/api/students/${studentId}/subject-plans/english/areas/vocabulary/materials`).send({name:'词汇手册',type:'workbook'}).expect(201);

  const first=await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-24'}).expect(200);
  const sourced=first.body.tasks.filter((task:{sourceKnowledgeArea:string|null})=>task.sourceKnowledgeArea==='vocabulary');
  expect(sourced).toHaveLength(5);
  expect(sourced.every((task:{weekday:number})=>task.weekday>=1&&task.weekday<=5)).toBe(true);
  expect(sourced[0]).toMatchObject({subject:'english',suggestedDuration:15,basePoints:10,sourceKnowledgeArea:'vocabulary'});
  expect(sourced[0].content).toContain('词汇手册');

  await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-24',weekday:1,subject:'english',content:'学校临时听写',completionStandard:'完成听写',suggestedDuration:10,basePoints:5,taskOrder:99
  }).expect(201);

  const editedId=sourced[0].id;
  await request(app).put(`/api/students/${studentId}/weekly-tasks/${editedId}`).send({
   weekStart:'2026-08-24',weekday:sourced[0].weekday,subject:'english',content:'已手改的单词任务',completionStandard:sourced[0].completionStandard,suggestedDuration:15,basePoints:10,taskOrder:sourced[0].taskOrder
  }).expect(200);

  const second=await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-24'}).expect(200);
  const again=second.body.tasks.filter((task:{sourceKnowledgeArea:string|null})=>task.sourceKnowledgeArea==='vocabulary');
  expect(again).toHaveLength(5);
  expect(again.find((task:{id:number})=>task.id===editedId).content).toBe('已手改的单词任务');
  expect(second.body.tasks.some((task:{content:string})=>task.content==='学校临时听写')).toBe(true);
 });

 it('does not write Daily Plan rows and keeps two students isolated',async()=>{
  await request(app).put(`/api/students/${studentId}/subject-plans/math`).send({
   goal:{narrative:'数学稳90'},
   areas:[{id:'basic_drills',enabled:true,sortOrder:1,sessionsPerWeek:2,suggestedDuration:20}]
  }).expect(200);
  await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-24'}).expect(200);
  expect((await request(app).get(`/api/students/${studentId}/daily-tasks?date=2026-08-24`).expect(200)).body.tasks).toHaveLength(0);
  const daily=(await request(app).post(`/api/students/${studentId}/daily-plan/generate`).send({date:'2026-08-24'}).expect(200)).body.tasks;
  expect(daily.length).toBeGreaterThan(0);

  const other=await createStudent(app,'弟弟');
  const otherPlan=(await request(app).get(`/api/students/${other}/subject-plans/math`).expect(200)).body.plan;
  expect(otherPlan.areas.find((area:{id:string})=>area.id==='basic_drills').enabled).toBe(false);
  expect((await request(app).get(`/api/students/${other}/weekly-tasks?weekStart=2026-08-24`).expect(200)).body.tasks).toHaveLength(0);
 });

 it('skips disabled areas on the next generation',async()=>{
  await request(app).put(`/api/students/${studentId}/subject-plans/chinese`).send({
   goal:{narrative:'语文'},
   areas:[{id:'composition',enabled:true,sortOrder:1,sessionsPerWeek:2,suggestedDuration:30}]
  }).expect(200);
  await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-24'}).expect(200);
  await request(app).put(`/api/students/${studentId}/subject-plans/chinese`).send({
   goal:{narrative:'语文'},
   areas:[{id:'composition',enabled:false,sortOrder:1,sessionsPerWeek:2,suggestedDuration:30},{id:'basics',enabled:true,sortOrder:1,sessionsPerWeek:1,suggestedDuration:15}]
  }).expect(200);
  const generated=await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-24'}).expect(200);
  expect(generated.body.tasks.filter((task:{sourceKnowledgeArea:string|null})=>task.sourceKnowledgeArea==='composition')).toHaveLength(2);
  expect(generated.body.tasks.filter((task:{sourceKnowledgeArea:string|null})=>task.sourceKnowledgeArea==='basics')).toHaveLength(1);
 });

 it('stores recurring subject plan items and generates their weekly occurrences without duplicates',async()=>{
  const daily=(await request(app).post(`/api/students/${studentId}/subject-plans/chinese/items`).send({name:'学校作业',cadence:'weekdays',weekdays:[],materialId:null,suggestedDuration:30,completionStandard:'完成并订正',basePoints:10,active:true,sortOrder:1}).expect(201)).body.item;
  const alternate=(await request(app).post(`/api/students/${studentId}/subject-plans/chinese/items`).send({name:'一本阅读',cadence:'every_2_days',weekdays:[],materialId:null,suggestedDuration:20,completionStandard:'完成1篇并记录正确率',basePoints:8,active:true,sortOrder:2}).expect(201)).body.item;
  const weekly=(await request(app).post(`/api/students/${studentId}/subject-plans/chinese/items`).send({name:'必读书目',cadence:'weekly',weekdays:[6],materialId:null,suggestedDuration:40,completionStandard:'完成本周阅读页数',basePoints:12,active:true,sortOrder:3}).expect(201)).body.item;
  expect((await request(app).get(`/api/students/${studentId}/subject-plans/chinese/items`).expect(200)).body.items.map((item:{name:string})=>item.name)).toEqual(['学校作业','一本阅读','必读书目']);
  const first=(await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-31'}).expect(200)).body.tasks;
  expect(first.filter((task:{sourceKnowledgeArea:string})=>task.sourceKnowledgeArea===`plan_item:${daily.id}`)).toHaveLength(5);
  expect(first.filter((task:{sourceKnowledgeArea:string})=>task.sourceKnowledgeArea===`plan_item:${alternate.id}`).map((task:{weekday:number})=>task.weekday)).toEqual([1,3,5,7]);
  expect(first.filter((task:{sourceKnowledgeArea:string})=>task.sourceKnowledgeArea===`plan_item:${weekly.id}`).map((task:{weekday:number})=>task.weekday)).toEqual([6]);
  const second=(await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-31'}).expect(200)).body.tasks;
  expect(second.filter((task:{sourceKnowledgeArea:string})=>task.sourceKnowledgeArea.startsWith('plan_item:'))).toHaveLength(10);
 });

 it('stores evaluation rubrics for plan items and rejects dimensions over the total points',async()=>{
  const rubric={dimensions:[{id:'handwriting',name:'字迹与过程',weightPercent:40,maxPoints:4},{id:'focus',name:'专注度',weightPercent:30,maxPoints:3},{id:'accuracy',name:'正确率',weightPercent:30,maxPoints:3}]};
  const created=(await request(app).post(`/api/students/${studentId}/subject-plans/chinese/items`).send({name:'作文誊写',cadence:'weekly',weekdays:[6],materialId:null,suggestedDuration:40,evaluationRubric:rubric,basePoints:10,active:true,sortOrder:1}).expect(201)).body.item;
  expect(created.evaluationRubric).toEqual(rubric);
  expect(created.completionStandard).toContain('字迹与过程 4分');
  expect(created.basePoints).toBe(10);
  await request(app).post(`/api/students/${studentId}/subject-plans/chinese/items`).send({name:'超分事项',cadence:'daily',weekdays:[],materialId:null,suggestedDuration:20,evaluationRubric:{dimensions:[{id:'a',name:'字迹与过程',weightPercent:100,maxPoints:8}]},basePoints:5,active:true,sortOrder:2}).expect(400);
 });

 it('replace mode clears previous Weekly Plan tasks before regenerating',async()=>{
  await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-24',weekday:1,subject:'math',content:'旧的手工任务',completionStandard:'旧标准',suggestedDuration:15,basePoints:5,taskOrder:1
  }).expect(201);
  await request(app).post(`/api/students/${studentId}/subject-plans/chinese/items`).send({
   name:'学校作业',cadence:'weekdays',weekdays:[],materialId:null,suggestedDuration:30,completionStandard:'完成并订正',basePoints:10,active:true,sortOrder:1
  }).expect(201);
  const generated=await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-31',replace:true}).expect(200);
  expect(generated.body.replaced).toBe(true);
  expect(generated.body.tasks.some((task:{content:string})=>task.content==='旧的手工任务')).toBe(false);
  expect(generated.body.tasks.filter((task:{content:string})=>task.content==='学校作业')).toHaveLength(5);
  expect((await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-24`).expect(200)).body.tasks).toHaveLength(0);
 });

 it('replace mode keeps completed Weekly Plan tasks and their earned points',async()=>{
  const previous=(await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-24',weekday:1,subject:'math',content:'已完成的上周任务',completionStandard:'完成并订正',suggestedDuration:20,basePoints:8,taskOrder:1
  }).expect(201)).body.task;
  const previousScores=Object.fromEntries(previous.evaluationRubric.dimensions.map((dimension:{id:string;maxPoints:number})=>[dimension.id,dimension.maxPoints]));
  const previousCompleted=(await request(app).post(`/api/students/${studentId}/weekly-tasks/${previous.id}/execution`).send({status:'completed',actualDuration:20,dimensionScores:previousScores}).expect(200)).body;
  await request(app).post(`/api/students/${studentId}/subject-plans/chinese/items`).send({
   name:'学校作业',cadence:'weekdays',weekdays:[],materialId:null,suggestedDuration:30,completionStandard:'完成并订正',basePoints:10,active:true,sortOrder:1
  }).expect(201);
  const first=(await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-31'}).expect(200)).body.tasks as {id:number;weekday:number;content:string;evaluationRubric:{dimensions:{id:string;maxPoints:number}[]}}[];
  const monday=first.find(task=>task.content==='学校作业'&&task.weekday===1)!;
  const dimensionScores=Object.fromEntries(monday.evaluationRubric.dimensions.map(dimension=>[dimension.id,dimension.maxPoints]));
  const completed=(await request(app).post(`/api/students/${studentId}/weekly-tasks/${monday.id}/execution`).send({status:'completed',actualDuration:30,dimensionScores}).expect(200)).body;
  const replaced=await request(app).post(`/api/students/${studentId}/subject-plans/generate`).send({weekStart:'2026-08-31',replace:true}).expect(200);
  const kept=replaced.body.tasks.find((task:{id:number})=>task.id===monday.id);
  expect(kept).toMatchObject({executionStatus:'completed',earnedPoints:completed.task.earnedPoints,weekday:1,content:'学校作业'});
  expect(replaced.body.tasks.filter((task:{content:string})=>task.content==='学校作业')).toHaveLength(5);
  expect((await request(app).get(`/api/students/${studentId}/weekly-tasks?weekStart=2026-08-24`).expect(200)).body.tasks).toEqual([
   expect.objectContaining({id:previous.id,executionStatus:'completed',earnedPoints:previousCompleted.task.earnedPoints,content:'已完成的上周任务'})
  ]);
  expect((await request(app).get(`/api/students/${studentId}/points`).expect(200)).body.balance).toBe(previousCompleted.task.earnedPoints+completed.task.earnedPoints);
 });
});




