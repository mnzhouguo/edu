import type { DatabaseSync } from 'node:sqlite';
import { addLedgerEntry } from './ledger.js';
import { getWeeklyTask,type WeeklyTaskView } from './plans.js';
import { parseEvaluationRubric,type EvaluationRubric } from './rubric.js';

export const weeklyExecutionStatuses=['not_started','completed','voided','deferred'] as const;
export type WeeklyExecutionStatus=typeof weeklyExecutionStatuses[number];

export type CompleteWeeklyInput={status:'completed';actualDuration:number;dimensionScores:Record<string,number>};
export type SimpleStatusInput={status:'not_started'|'voided'|'deferred'};
export type WeeklyExecutionInput=CompleteWeeklyInput|SimpleStatusInput;

export function parseWeeklyExecution(body:unknown,task:WeeklyTaskView):WeeklyExecutionInput|string{
 const value=body as Record<string,unknown>|null;
 const status=String(value?.status??'');
 if(!weeklyExecutionStatuses.includes(status as WeeklyExecutionStatus))return '状态无效';
 if(status!=='completed')return {status:status as SimpleStatusInput['status']};
 const actualDuration=Number(value?.actualDuration);
 if(!Number.isInteger(actualDuration)||actualDuration<=0)return '请填写实际完成时长';
 const rubric=task.evaluationRubric;
 if(!rubric?.dimensions.length)return '缺少积分规则，无法完成打分';
 const rawScores=value?.dimensionScores;
 if(!rawScores||typeof rawScores!=='object'||Array.isArray(rawScores))return '请按维度打分';
 const scoreMap=rawScores as Record<string,unknown>;
 const dimensionScores:Record<string,number>={};
 for(const dimension of rubric.dimensions){
  const raw=scoreMap[dimension.id];
  if(raw===undefined||raw===null||raw==='')return `请填写${dimension.name}得分`;
  const score=Number(raw);
  if(!Number.isFinite(score)||!Number.isInteger(score)||score<0){
   return `${dimension.name}得分须为不小于 0 的整数`;
  }
  dimensionScores[dimension.id]=score;
 }
 return {status:'completed',actualDuration,dimensionScores};
}

export function applyWeeklyExecution(db:DatabaseSync,studentId:number,taskId:number,input:WeeklyExecutionInput){
 const task=getWeeklyTask(db,studentId,taskId);
 if(!task)return {status:'not_found' as const};
 const now=new Date().toISOString();
 const previousEarned=task.earnedPoints??0;
 const wasCompleted=task.executionStatus==='completed';

 if(input.status==='completed'){
  const earned=Object.values(input.dimensionScores).reduce((sum,score)=>sum+score,0);
  db.prepare('UPDATE weekly_tasks SET execution_status=?,actual_duration=?,earned_points=?,dimension_scores=?,updated_at=? WHERE id=? AND student_id=?')
   .run('completed',input.actualDuration,earned,JSON.stringify(input.dimensionScores),now,taskId,studentId);
  if(wasCompleted){
   const delta=earned-previousEarned;
   if(delta!==0)addLedgerEntry(db,studentId,'adjust',delta,'weekly_task',taskId);
  }else addLedgerEntry(db,studentId,'earn',earned,'weekly_task',taskId);
  return {status:'ok' as const,task:getWeeklyTask(db,studentId,taskId)!};
 }

 db.prepare('UPDATE weekly_tasks SET execution_status=?,actual_duration=NULL,earned_points=NULL,dimension_scores=NULL,updated_at=? WHERE id=? AND student_id=?')
  .run(input.status,now,taskId,studentId);
 // Leaving completed (including back to not_started) must clear earned points and reverse ledger.
 if(wasCompleted&&previousEarned!==0)addLedgerEntry(db,studentId,'adjust',-previousEarned,'weekly_task',taskId);
 return {status:'ok' as const,task:getWeeklyTask(db,studentId,taskId)!};
}

export function readStoredWeeklyRubric(value:unknown):EvaluationRubric|null{
 return parseEvaluationRubric(value);
}
