import type { DatabaseSync } from 'node:sqlite';
import { dateInfo } from './dates.js';
import { defaultRubric,parseEvaluationRubric,type EvaluationRubric } from './rubric.js';
import type { WeeklyExecutionStatus } from './weekly-execution.js';

export const subjects=['chinese','math','english','physics','history'] as const;
export type Subject=string;
export type WeeklyTaskInput={
 weekStart:string;
 weekday:number;
 subject:Subject;
 content:string;
 completionStandard:string;
 suggestedDuration:number;
 basePoints:number;
 taskOrder:number;
 sourceKnowledgeArea?:string|null;
 evaluationRubric?:EvaluationRubric|null;
};
export type WeeklyTaskView={
 id:number;
 studentId:number;
 weekStart:string;
 weekday:number;
 subject:Subject;
 content:string;
 completionStandard:string;
 suggestedDuration:number;
 basePoints:number;
 taskOrder:number;
 sourceKnowledgeArea:string|null;
 executionStatus:WeeklyExecutionStatus;
 actualDuration:number|null;
 earnedPoints:number|null;
 dimensionScores:Record<string,number>|null;
 evaluationRubric:EvaluationRubric|null;
};
type ChangeResult<T>={status:'ok';value:T}|{status:'not_found'|'locked'|'completed'};

function parseScores(value:unknown):Record<string,number>|null{
 if(value==null||value==='')return null;
 try{
  const raw=typeof value==='string'?JSON.parse(value):value;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  return Object.fromEntries(Object.entries(raw as Record<string,unknown>).map(([key,score])=>[key,Number(score)]));
 }catch{return null}
}

function mapWeekly(row:Record<string,unknown>):WeeklyTaskView{
 const status=String(row.execution_status??'not_started');
 return {
  id:Number(row.id),
  studentId:Number(row.student_id),
  weekStart:String(row.week_start),
  weekday:Number(row.weekday),
  subject:String(row.subject),
  content:String(row.content),
  completionStandard:String(row.completion_standard),
  suggestedDuration:Number(row.suggested_duration),
  basePoints:Number(row.base_points),
  taskOrder:Number(row.task_order),
  sourceKnowledgeArea:row.source_knowledge_area==null?null:String(row.source_knowledge_area),
  executionStatus:(['not_started','completed','voided','deferred'].includes(status)?status:'not_started') as WeeklyExecutionStatus,
  actualDuration:row.actual_duration==null||row.actual_duration===''?null:Number(row.actual_duration),
  earnedPoints:row.earned_points==null||row.earned_points===''?null:Number(row.earned_points),
  dimensionScores:parseScores(row.dimension_scores),
  evaluationRubric:parseEvaluationRubric(row.evaluation_rubric),
 };
}
function ensureWeeklyRubric(db:DatabaseSync,task:WeeklyTaskView):WeeklyTaskView{
 if(task.evaluationRubric)return task;
 const rubric=defaultRubric(task.basePoints);
 db.prepare('UPDATE weekly_tasks SET evaluation_rubric=?,updated_at=? WHERE id=? AND student_id=?')
  .run(JSON.stringify(rubric),new Date().toISOString(),task.id,task.studentId);
 return {...task,evaluationRubric:rubric};
}
function mapDaily(row:Record<string,unknown>){return{id:Number(row.id),studentId:Number(row.student_id),sourceWeeklyTaskId:row.source_weekly_task_id===null?null:Number(row.source_weekly_task_id),taskDate:String(row.task_date),subject:String(row.subject),content:String(row.content),completionStandard:String(row.completion_standard),suggestedDuration:Number(row.suggested_duration),basePoints:Number(row.base_points),taskOrder:Number(row.task_order),status:String(row.status)}}

export function listWeeklyTasks(db:DatabaseSync,studentId:number,weekStart:string){
 return db.prepare('SELECT * FROM weekly_tasks WHERE student_id=? AND week_start=? ORDER BY weekday,task_order,id').all(studentId,weekStart)
  .map(r=>ensureWeeklyRubric(db,mapWeekly(r as Record<string,unknown>)));
}
export function listStudentWeeklyTasks(db:DatabaseSync,studentId:number,weekStart?:string){
 const rows=weekStart
  ? db.prepare('SELECT * FROM weekly_tasks WHERE student_id=? AND week_start=? ORDER BY weekday,task_order,id').all(studentId,weekStart)
  : db.prepare('SELECT * FROM weekly_tasks WHERE student_id=? ORDER BY week_start,weekday,task_order,id').all(studentId);
 return rows.map(row=>mapWeekly(row as Record<string,unknown>));
}
export function clearAllWeeklyTasks(db:DatabaseSync,studentId:number){
 db.prepare("DELETE FROM point_ledger WHERE source_type='weekly_task' AND source_id IN (SELECT id FROM weekly_tasks WHERE student_id=? AND execution_status<>'completed')").run(studentId);
 db.prepare("DELETE FROM daily_tasks WHERE student_id=? AND status='planned' AND (source_weekly_task_id IS NULL OR source_weekly_task_id IN (SELECT id FROM weekly_tasks WHERE student_id=? AND execution_status<>'completed'))").run(studentId,studentId);
 db.prepare("DELETE FROM weekly_tasks WHERE student_id=? AND execution_status<>'completed'").run(studentId);
}
export function getWeeklyTask(db:DatabaseSync,studentId:number,id:number){
 const row=db.prepare('SELECT * FROM weekly_tasks WHERE id=? AND student_id=?').get(id,studentId);
 return row?ensureWeeklyRubric(db,mapWeekly(row as Record<string,unknown>)):null;
}
export function createWeeklyTask(db:DatabaseSync,studentId:number,input:WeeklyTaskInput){
 const now=new Date().toISOString();
 const rubric=input.evaluationRubric??defaultRubric(input.basePoints);
 const result=db.prepare('INSERT INTO weekly_tasks(student_id,week_start,weekday,subject,content,completion_standard,suggested_duration,base_points,task_order,source_knowledge_area,execution_status,evaluation_rubric,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
  .run(studentId,input.weekStart,input.weekday,input.subject,input.content.trim(),input.completionStandard.trim(),input.suggestedDuration,input.basePoints,input.taskOrder,input.sourceKnowledgeArea??null,'not_started',JSON.stringify(rubric),now,now);
 return getWeeklyTask(db,studentId,Number(result.lastInsertRowid))!;
}
function isLocked(db:DatabaseSync,studentId:number,id:number){return Boolean(db.prepare("SELECT 1 FROM daily_tasks WHERE student_id=? AND source_weekly_task_id=? AND status<>'planned' LIMIT 1").get(studentId,id))}
export function updateWeeklyTask(db:DatabaseSync,studentId:number,id:number,input:WeeklyTaskInput):ChangeResult<ReturnType<typeof getWeeklyTask>>{
 if(!getWeeklyTask(db,studentId,id))return{status:'not_found'};
 if(isLocked(db,studentId,id))return{status:'locked'};
 db.prepare('UPDATE weekly_tasks SET week_start=?,weekday=?,subject=?,content=?,completion_standard=?,suggested_duration=?,base_points=?,task_order=?,source_knowledge_area=COALESCE(?,source_knowledge_area),evaluation_rubric=COALESCE(?,evaluation_rubric),updated_at=? WHERE id=? AND student_id=?')
  .run(input.weekStart,input.weekday,input.subject,input.content.trim(),input.completionStandard.trim(),input.suggestedDuration,input.basePoints,input.taskOrder,input.sourceKnowledgeArea??null,input.evaluationRubric?JSON.stringify(input.evaluationRubric):null,new Date().toISOString(),id,studentId);
 return{status:'ok',value:getWeeklyTask(db,studentId,id)};
}
export function deleteWeeklyTask(db:DatabaseSync,studentId:number,id:number):ChangeResult<null>{
 const task=getWeeklyTask(db,studentId,id);
 if(!task)return{status:'not_found'};
 if(task.executionStatus==='completed')return{status:'completed'};
 if(isLocked(db,studentId,id))return{status:'locked'};
 db.prepare("DELETE FROM point_ledger WHERE student_id=? AND source_type='weekly_task' AND source_id=?").run(studentId,id);
 db.prepare('DELETE FROM weekly_tasks WHERE id=? AND student_id=?').run(id,studentId);
 return{status:'ok',value:null};
}
export function generateDailyPlan(db:DatabaseSync,studentId:number,date:string){const info=dateInfo(date);if(!info)return null;const source=listWeeklyTasks(db,studentId,info.weekStart).filter(task=>task.weekday===info.weekday);const insert=db.prepare("INSERT OR IGNORE INTO daily_tasks(student_id,source_weekly_task_id,task_date,subject,content,completion_standard,suggested_duration,base_points,task_order,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'planned',?,?)");const now=new Date().toISOString();db.exec('BEGIN');try{for(const task of source)insert.run(studentId,task.id,date,task.subject,task.content,task.completionStandard,task.suggestedDuration,task.basePoints,task.taskOrder,now,now);db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}return listDailyTasks(db,studentId,date)}
export function getDailyTask(db:DatabaseSync,studentId:number,id:number){const row=db.prepare('SELECT * FROM daily_tasks WHERE id=? AND student_id=?').get(id,studentId);return row?mapDaily(row as Record<string,unknown>):null}
export function setDailyTaskStatus(db:DatabaseSync,studentId:number,id:number,status:string){db.prepare('UPDATE daily_tasks SET status=?,updated_at=? WHERE id=? AND student_id=?').run(status,new Date().toISOString(),id,studentId)}
export function listDailyTasks(db:DatabaseSync,studentId:number,date:string,subject?:string){const rows=subject?db.prepare('SELECT * FROM daily_tasks WHERE student_id=? AND task_date=? AND subject=? ORDER BY task_order,id').all(studentId,date,subject):db.prepare('SELECT * FROM daily_tasks WHERE student_id=? AND task_date=? ORDER BY task_order,id').all(studentId,date);return rows.map(r=>mapDaily(r as Record<string,unknown>))}
export function reorderDailyTasks(db:DatabaseSync,studentId:number,date:string,orderedIds:number[]){const current=listDailyTasks(db,studentId,date);if(current.length!==orderedIds.length||new Set(orderedIds).size!==orderedIds.length||current.some(task=>!orderedIds.includes(task.id)))return null;const update=db.prepare('UPDATE daily_tasks SET task_order=?,updated_at=? WHERE id=? AND student_id=? AND task_date=?');const now=new Date().toISOString();db.exec('BEGIN');try{orderedIds.forEach((id,index)=>update.run(index+1,now,id,studentId,date));db.exec('COMMIT')}catch(error){db.exec('ROLLBACK');throw error}return listDailyTasks(db,studentId,date)}
