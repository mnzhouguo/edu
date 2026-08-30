import type { DatabaseSync } from 'node:sqlite';
import { dateInfo } from './dates.js';
import { getEvaluationForTask } from './evaluations.js';
import { listLedger,pointsBalance,spentOnDate,todayEarned } from './ledger.js';
import { listDailyTasks } from './plans.js';

function addDays(iso:string,days:number){const date=new Date(`${iso}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)}
function isCompleted(database:DatabaseSync,taskId:number){
 const evaluation=getEvaluationForTask(database,taskId);
 return Boolean(evaluation?.confirmed&&(evaluation.completion==='completed'||evaluation.completion==='high_quality'));
}

function dayCounts(database:DatabaseSync,studentId:number,date:string){
 const tasks=listDailyTasks(database,studentId,date);
 const completed=tasks.filter(task=>isCompleted(database,task.id)).length;
 return {total:tasks.length,planned:tasks.filter(task=>task.status==='planned').length,submitted:tasks.filter(task=>task.status==='submitted').length,evaluated:tasks.filter(task=>task.status==='evaluated').length,completed,completionRate:tasks.length?completed/tasks.length:null};
}

export function studentDashboard(db:DatabaseSync,studentId:number,date:string){
 const info=dateInfo(date);
 if(!info)return null;
 const today=dayCounts(db,studentId,date);
 const weekTrend=Array.from({length:7},(_,index)=>{const day=addDays(info.weekStart,index);return {date:day,completionRate:dayCounts(db,studentId,day).completionRate}});
 const weekEarned=weekTrend.reduce((sum,day)=>sum+todayEarned(db,studentId,day.date),0);
 const weekSpent=weekTrend.reduce((sum,day)=>sum+spentOnDate(db,studentId,day.date),0);
 const balance=pointsBalance(db,studentId);
 return {
  date,weekStart:info.weekStart,
  planned:today.planned,submitted:today.submitted,evaluated:today.evaluated,completed:today.completed,
  todayCompletionRate:today.completionRate,
  todayEarned:todayEarned(db,studentId,date),todaySpent:spentOnDate(db,studentId,date),
  weekEarned,weekSpent,pointsBalance:balance,weekTrend,
  empty:weekTrend.every(day=>day.completionRate===null)&&listLedger(db,studentId).length===0
 };
}
