import { rmSync } from 'node:fs';
import request from 'supertest';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,openApp,tempWorkspace } from './helpers.js';

async function completeWeeklyTask(app:ReturnType<typeof openApp>['app'],studentId:number,task:{id:number;evaluationRubric:{dimensions:{id:string;maxPoints:number}[]}}){
 const dimensionScores=Object.fromEntries(task.evaluationRubric.dimensions.map(dimension=>[dimension.id,dimension.maxPoints]));
 return request(app).post(`/api/students/${studentId}/weekly-tasks/${task.id}/execution`).send({status:'completed',actualDuration:40,dimensionScores}).expect(200);
}

describe('Parent Dashboard',()=>{
 let db:DatabaseSync;let app:ReturnType<typeof openApp>['app'];let workspace:ReturnType<typeof tempWorkspace>;
 beforeEach(()=>{workspace=tempWorkspace();({db,app}=openApp(workspace))});
 afterEach(()=>{db.close();rmSync(workspace.directory,{recursive:true,force:true})});

 it('shows empty-state metrics when the student has no tasks or ledger entries',async()=>{
  const studentId=await createStudent(app);
  const dashboard=(await request(app).get(`/api/students/${studentId}/dashboard?date=2026-08-30`).expect(200)).body.dashboard;
  expect(dashboard).toMatchObject({
   empty:true,completed:0,todayCompletionRate:null,todayEarned:0,todaySpent:0,weekEarned:0,weekSpent:0,pointsBalance:0,
   today:{total:0,notStarted:0,completed:0,voided:0,deferred:0,completionRate:null,earnedPoints:0},
   yesterday:{total:0,completed:0,earnedPoints:0},
   week:{total:0},previousWeek:{total:0,earnedPoints:0},allTime:{total:0},
   points:{balance:0,totalEarned:0,weekRedeemed:0,weekExpiring:0},
   plan:{activeItems:0,materials:0,scoredSubjects:0},
  });
  expect(dashboard.weekTrend).toHaveLength(7);
  expect(dashboard.weekTrend.every((day:{completionRate:null|number})=>day.completionRate===null)).toBe(true);
  expect(dashboard.monthTrend).toHaveLength(30);
  expect(dashboard.monthTrend[0].date).toBe('2026-08-01');
  expect(dashboard.monthTrend.at(-1).date).toBe('2026-08-30');
  expect(dashboard.monthTrend.every((day:{completionRate:null|number;earnedPoints:number})=>day.completionRate===null&&day.earnedPoints===0)).toBe(true);
 });

 it('counts weekly execution, points, and subject goals for the selected date',async()=>{
  const studentId=await createStudent(app);
  const now=new Date();
  const date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const weekday=new Date(`${date}T00:00:00Z`).getUTCDay()||7;
  const weekStart=(()=>{const monday=new Date(`${date}T00:00:00Z`);monday.setUTCDate(monday.getUTCDate()-(weekday-1));return monday.toISOString().slice(0,10)})();
  const first=(await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart,weekday,subject:'chinese',content:'语文默写',completionStandard:'完成并订正',suggestedDuration:45,basePoints:10,taskOrder:1,
  }).expect(201)).body.task;
  await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart,weekday,subject:'math',content:'数学练习',completionStandard:'完成练习',suggestedDuration:30,basePoints:20,taskOrder:2,
  }).expect(201);
  await completeWeeklyTask(app,studentId,first);
  await request(app).put(`/api/students/${studentId}/subject-plans/chinese`).send({
   goal:{narrative:'提高语文成绩',currentScore:90,targetScore:110,targetDate:'2026-12-31'},areas:[],
  }).expect(200);
  const reward=(await request(app).post(`/api/students/${studentId}/rewards`).send({name:'游戏',category:'game_time',requiredPoints:10}).expect(201)).body.reward;
  await request(app).post(`/api/students/${studentId}/redemptions`).send({rewardId:reward.id}).expect(201);

  const dashboard=(await request(app).get(`/api/students/${studentId}/dashboard?date=${date}`).expect(200)).body.dashboard;
  expect(dashboard.empty).toBe(false);
  expect(dashboard.today).toMatchObject({total:2,notStarted:1,completed:1,voided:0,deferred:0,completionRate:0.5,plannedMinutes:75,actualMinutes:40,availablePoints:20,earnedPoints:10});
  expect(dashboard.week).toMatchObject({total:2,completed:1,earnedPoints:10});
  expect(dashboard.points).toMatchObject({balance:0,totalEarned:10,todayEarned:10,todaySpent:10,weekEarned:10,weekSpent:10,weekRedeemed:10,weekExpiring:0});
  expect(dashboard.pointsBalance).toBe(0);
  expect(dashboard.todayCompletionRate).toBe(0.5);
  const chinese=dashboard.subjects.find((item:{subject:string})=>item.subject==='chinese');
  expect(chinese).toMatchObject({currentScore:90,targetScore:110,gap:20,completed:1,earnedPoints:10});
  expect(dashboard.quality.week).toEqual(expect.arrayContaining([
   expect.objectContaining({name:'字迹与过程',rate:1}),
   expect.objectContaining({name:'专注度',rate:1}),
   expect.objectContaining({name:'正确率',rate:1}),
  ]));
  expect(dashboard.weekTrend.find((day:{date:string})=>day.date===date)).toMatchObject({total:2,completed:1,completionRate:0.5,basePoints:30,earnedPoints:10});
  expect(dashboard.plan.scoredSubjects).toBe(1);
 });

 it('exposes weekly base points beside earned points for bar comparisons',async()=>{
  const studentId=await createStudent(app);
  const monday=(await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-31',weekday:1,subject:'chinese',content:'本周一任务',completionStandard:'完成',suggestedDuration:30,basePoints:10,taskOrder:1,
  }).expect(201)).body.task;
  await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-31',weekday:1,subject:'math',content:'本周一数学',completionStandard:'完成',suggestedDuration:20,basePoints:8,taskOrder:2,
  }).expect(201);
  const mondayDone=await completeWeeklyTask(app,studentId,monday);
  const dashboard=(await request(app).get(`/api/students/${studentId}/dashboard?date=2026-09-01`).expect(200)).body.dashboard;
  expect(dashboard.weekTrend[0]).toMatchObject({
   date:'2026-08-31',label:'周一',total:2,completed:1,basePoints:18,earnedPoints:mondayDone.body.task.earnedPoints,
  });
  expect(dashboard.weekTrend[1]).toMatchObject({date:'2026-09-01',total:0,completed:0,basePoints:0,earnedPoints:0});
 });

 it('compares today and this week with yesterday and last week',async()=>{
  const studentId=await createStudent(app);
  const previous=(await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-24',weekday:1,subject:'math',content:'上周任务',completionStandard:'完成',suggestedDuration:20,basePoints:8,taskOrder:1,
  }).expect(201)).body.task;
  const previousDone=await completeWeeklyTask(app,studentId,previous);
  const monday=(await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({
   weekStart:'2026-08-31',weekday:1,subject:'chinese',content:'本周一任务',completionStandard:'完成',suggestedDuration:30,basePoints:10,taskOrder:1,
  }).expect(201)).body.task;
  const mondayDone=await completeWeeklyTask(app,studentId,monday);
  const tuesdayDashboard=(await request(app).get(`/api/students/${studentId}/dashboard?date=2026-09-01`).expect(200)).body.dashboard;
  expect(tuesdayDashboard.yesterday).toMatchObject({total:1,completed:1,earnedPoints:mondayDone.body.task.earnedPoints});
  expect(tuesdayDashboard.week).toMatchObject({total:1,completed:1,earnedPoints:mondayDone.body.task.earnedPoints});
  expect(tuesdayDashboard.previousWeek).toMatchObject({total:1,completed:1,earnedPoints:previousDone.body.task.earnedPoints});
  expect(tuesdayDashboard.weekTrend[0]).toMatchObject({date:'2026-08-31',completed:1,earnedPoints:mondayDone.body.task.earnedPoints});
  expect(tuesdayDashboard.monthTrend).toHaveLength(1);
  expect(tuesdayDashboard.monthTrend[0]).toMatchObject({date:'2026-09-01',total:0,completed:0,earnedPoints:0});
  expect(tuesdayDashboard.monthTrend.find((day:{date:string})=>day.date==='2026-08-31')).toBeUndefined();
  const augustDashboard=(await request(app).get(`/api/students/${studentId}/dashboard?date=2026-08-31`).expect(200)).body.dashboard;
  expect(augustDashboard.monthTrend).toHaveLength(31);
  expect(augustDashboard.monthTrend[0].date).toBe('2026-08-01');
  expect(augustDashboard.monthTrend.at(-1).date).toBe('2026-08-31');
  expect(augustDashboard.monthTrend.find((day:{date:string})=>day.date==='2026-08-24')).toMatchObject({total:1,completed:1,completionRate:1,earnedPoints:previousDone.body.task.earnedPoints});
  expect(augustDashboard.monthTrend.find((day:{date:string})=>day.date==='2026-08-31')).toMatchObject({total:1,completed:1,earnedPoints:mondayDone.body.task.earnedPoints});
 });

 it('scopes every metric to the active student',async()=>{
  const first=await createStudent(app,'姐姐');
  const second=await createStudent(app,'弟弟');
  const task=(await request(app).post(`/api/students/${first}/weekly-tasks`).send({
   weekStart:'2026-08-24',weekday:7,subject:'chinese',content:'姐姐任务',completionStandard:'完成',suggestedDuration:20,basePoints:10,taskOrder:1,
  }).expect(201)).body.task;
  await completeWeeklyTask(app,first,task);
  const other=(await request(app).get(`/api/students/${second}/dashboard?date=2026-08-30`).expect(200)).body.dashboard;
  expect(other).toMatchObject({empty:true,completed:0,pointsBalance:0,today:{total:0},week:{total:0},allTime:{total:0}});
 });
});
