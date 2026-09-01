import type { DatabaseSync } from 'node:sqlite';
import { dateInfo } from './dates.js';
import { earnedBetween,earnedOnDate,listLedger,pointsOverview,spentBetween,spentOnDate } from './ledger.js';
import { listStudentWeeklyTasks,type WeeklyTaskView } from './plans.js';
import { parseEvaluationRubric } from './rubric.js';
import { listStudentSubjects } from './subjects.js';

const weekdayLabels=['周一','周二','周三','周四','周五','周六','周日'];
const qualityOrder=['字迹与过程','专注度','正确率'];

function addDays(iso:string,days:number){
 const date=new Date(`${iso}T00:00:00Z`);
 date.setUTCDate(date.getUTCDate()+days);
 return date.toISOString().slice(0,10);
}

function count(n:unknown){return Number(n??0)}

export type TaskCounts={
 total:number;
 notStarted:number;
 completed:number;
 voided:number;
 deferred:number;
 completionRate:number|null;
 plannedMinutes:number;
 actualMinutes:number;
 availablePoints:number;
 basePoints:number;
 earnedPoints:number;
};

function summarize(tasks:WeeklyTaskView[]):TaskCounts{
 const total=tasks.length;
 const notStarted=tasks.filter(task=>task.executionStatus==='not_started').length;
 const completed=tasks.filter(task=>task.executionStatus==='completed').length;
 const voided=tasks.filter(task=>task.executionStatus==='voided').length;
 const deferred=tasks.filter(task=>task.executionStatus==='deferred').length;
 const active=tasks.filter(task=>task.executionStatus!=='voided');
 return {
  total,notStarted,completed,voided,deferred,
  completionRate:active.length?completed/active.length:null,
  plannedMinutes:active.reduce((sum,task)=>sum+task.suggestedDuration,0),
  actualMinutes:tasks.filter(task=>task.executionStatus==='completed').reduce((sum,task)=>sum+(task.actualDuration??0),0),
  availablePoints:tasks.filter(task=>task.executionStatus==='not_started'||task.executionStatus==='deferred').reduce((sum,task)=>sum+task.basePoints,0),
  basePoints:active.reduce((sum,task)=>sum+task.basePoints,0),
  earnedPoints:tasks.reduce((sum,task)=>sum+(task.earnedPoints??0),0),
 };
}

type QualityBucket={id:string;name:string;score:number;max:number;count:number};
function qualityFrom(tasks:WeeklyTaskView[]){
 const buckets=new Map<string,QualityBucket>();
 for(const task of tasks.filter(item=>item.executionStatus==='completed')){
  const rubric=parseEvaluationRubric(task.evaluationRubric);
  const scores=task.dimensionScores;
  if(!rubric||!scores)continue;
  for(const dimension of rubric.dimensions){
   const score=scores[dimension.id];
   if(score===undefined)continue;
   const current=buckets.get(dimension.name)??{id:dimension.id,name:dimension.name,score:0,max:0,count:0};
   current.score+=score;
   current.max+=dimension.maxPoints;
   current.count+=1;
   buckets.set(dimension.name,current);
  }
 }
 return [...buckets.values()].sort((left,right)=>{
  const leftOrder=qualityOrder.indexOf(left.name),rightOrder=qualityOrder.indexOf(right.name);
  if(leftOrder!==-1||rightOrder!==-1)return (leftOrder===-1?99:leftOrder)-(rightOrder===-1?99:rightOrder);
  return left.name.localeCompare(right.name,'zh');
 }).map(item=>({
  id:item.id,name:item.name,
  avgScore:item.count?item.score/item.count:null,
  avgMax:item.count?item.max/item.count:null,
  rate:item.max?item.score/item.max:null,
 }));
}

export function studentDashboard(db:DatabaseSync,studentId:number,date:string){
 const info=dateInfo(date);
 if(!info)return null;
 const weekEnd=addDays(info.weekStart,6);
 const previousStart=addDays(info.weekStart,-7);
 const allTasks=listStudentWeeklyTasks(db,studentId);
 const weekTasks=allTasks.filter(task=>task.weekStart===info.weekStart);
 const todayTasks=weekTasks.filter(task=>task.weekday===info.weekday);
 const previousTasks=allTasks.filter(task=>task.weekStart===previousStart);
 const yesterdayDate=addDays(date,-1);
 const yesterdayInfo=dateInfo(yesterdayDate);
 const yesterdayTasks=yesterdayInfo?allTasks.filter(task=>task.weekStart===yesterdayInfo.weekStart&&task.weekday===yesterdayInfo.weekday):[];
 const today=summarize(todayTasks);
 const yesterday=summarize(yesterdayTasks);
 const week=summarize(weekTasks);
 const previousWeek=summarize(previousTasks);
 const allTime=summarize(allTasks);
 const catalog=listStudentSubjects(db,studentId);
 const planRows=db.prepare('SELECT subject,current_score,target_score,target_date FROM subject_plans WHERE student_id=?').all(studentId) as Array<Record<string,unknown>>;
 const plans=new Map(planRows.map(row=>[String(row.subject),row]));
 const subjects=catalog.map(subject=>{
  const slice=summarize(weekTasks.filter(task=>task.subject===subject.id));
  const plan=plans.get(subject.id);
  const currentScore=plan&&plan.current_score!=null?Number(plan.current_score):null;
  const targetScore=plan&&plan.target_score!=null?Number(plan.target_score):null;
  const gap=currentScore!=null&&targetScore!=null?targetScore-currentScore:null;
  const progress=currentScore!=null&&targetScore!=null&&targetScore>0?currentScore/targetScore:null;
  return {
   subject:subject.id,label:subject.label,
   ...slice,
   currentScore,targetScore,gap,progress,
   targetDate:plan&&plan.target_date?String(plan.target_date):null,
  };
 });
 const overview=pointsOverview(db,studentId,date);
 const points={
  balance:overview.balance,
  totalEarned:overview.totalEarned,
  todayEarned:earnedOnDate(db,studentId,date),
  todaySpent:spentOnDate(db,studentId,date),
  weekEarned:earnedBetween(db,studentId,info.weekStart,weekEnd),
  weekSpent:spentBetween(db,studentId,info.weekStart,weekEnd),
  weekRedeemed:overview.weekRedeemed,
  weekExpiring:overview.weekExpiring,
 };
 const plan={
  activeItems:count((db.prepare('SELECT COUNT(*) AS n FROM subject_plan_items WHERE student_id=? AND active=1').get(studentId) as {n:number}).n),
  materials:count((db.prepare('SELECT COUNT(*) AS n FROM study_materials WHERE student_id=?').get(studentId) as {n:number}).n),
  scoredSubjects:subjects.filter(item=>item.currentScore!=null||item.targetScore!=null).length,
 };
 const weekTrend=Array.from({length:7},(_,index)=>{
  const day=addDays(info.weekStart,index);
  const slice=summarize(weekTasks.filter(task=>task.weekday===index+1));
  return {
   date:day,weekday:index+1,label:weekdayLabels[index],
   total:slice.total,completed:slice.completed,completionRate:slice.completionRate,
   basePoints:slice.basePoints,earnedPoints:slice.earnedPoints,plannedMinutes:slice.plannedMinutes,
  };
 });
 const monthStart=`${date.slice(0,7)}-01`;
 const monthDay=Number(date.slice(8,10));
 const monthTrend=Array.from({length:monthDay},(_,index)=>{
  const day=addDays(monthStart,index);
  const dayInfo=dateInfo(day);
  const slice=summarize(dayInfo?allTasks.filter(task=>task.weekStart===dayInfo.weekStart&&task.weekday===dayInfo.weekday):[]);
  return {
   date:day,
   total:slice.total,completed:slice.completed,completionRate:slice.completionRate,
   earnedPoints:slice.earnedPoints,
  };
 });
 const empty=allTime.total===0&&listLedger(db,studentId).length===0&&plan.activeItems===0&&plan.materials===0&&plan.scoredSubjects===0;
 return {
  date,weekStart:info.weekStart,empty,
  today,yesterday,week,previousWeek,allTime,weekTrend,monthTrend,subjects,
  quality:{week:qualityFrom(weekTasks),allTime:qualityFrom(allTasks)},
  points,plan,
  planned:today.notStarted,submitted:today.deferred,evaluated:today.voided,completed:today.completed,
  todayCompletionRate:today.completionRate,
  todayEarned:points.todayEarned,todaySpent:points.todaySpent,
  weekEarned:points.weekEarned,weekSpent:points.weekSpent,
  pointsBalance:points.balance,
 };
}
