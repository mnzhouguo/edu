import type { DatabaseSync } from 'node:sqlite';
import { createWeeklyTask,listWeeklyTasks,type Subject } from './plans.js';
import { listStudentSubjects } from './subjects.js';
import { isMonday } from './dates.js';
import { allocatedPoints,parseEvaluationRubric,readStoredRubric,summarizeRubric,validateRubricAgainstTotal,type EvaluationRubric } from './rubric.js';

export const planCadences=['daily','weekdays','every_2_days','weekly','custom_weekly'] as const;
export type PlanCadence=typeof planCadences[number];
export type PlanItemInput={name:string;cadence:PlanCadence;weekdays:number[];materialId:number|null;suggestedDuration:number;completionStandard:string;evaluationRubric:EvaluationRubric|null;basePoints:number;active:boolean;sortOrder:number};

function normalizeWeekdays(value:unknown){
 if(!Array.isArray(value))return [];
 return [...new Set(value.map(Number).filter(day=>Number.isInteger(day)&&day>=1&&day<=7))].sort((a,b)=>a-b);
}
function mapItem(row:Record<string,unknown>){
 let weekdays:number[]=[];try{weekdays=normalizeWeekdays(JSON.parse(String(row.weekdays)))}catch{weekdays=[]}
 const evaluationRubric=readStoredRubric(row.evaluation_rubric);
 return {id:Number(row.id),studentId:Number(row.student_id),subject:String(row.subject),name:String(row.name),cadence:String(row.cadence),weekdays,materialId:row.material_id===null?null:Number(row.material_id),materialName:row.material_name===null||row.material_name===undefined?null:String(row.material_name),suggestedDuration:Number(row.suggested_duration),completionStandard:String(row.completion_standard),evaluationRubric,basePoints:Number(row.base_points),active:Boolean(row.active),sortOrder:Number(row.sort_order)};
}
export function parsePlanItem(body:unknown):PlanItemInput|null{
 const value=body as Record<string,unknown>|null;
 const name=String(value?.name??'').trim(),cadence=String(value?.cadence??'');
 const weekdays=normalizeWeekdays(value?.weekdays),materialId=value?.materialId===undefined||value?.materialId===null||value?.materialId===''?null:Number(value.materialId);
 const suggestedDuration=Number(value?.suggestedDuration),basePoints=Number(value?.basePoints),sortOrder=Number(value?.sortOrder),active=value?.active===undefined?true:Boolean(value.active);
 let evaluationRubric:EvaluationRubric|null=null;
 if(value?.evaluationRubric!==undefined&&value?.evaluationRubric!==null){
  evaluationRubric=parseEvaluationRubric(value.evaluationRubric);
  if(!evaluationRubric||validateRubricAgainstTotal(evaluationRubric,basePoints))return null;
 }
 const completionStandard=evaluationRubric?summarizeRubric(evaluationRubric):String(value?.completionStandard??'').trim();
 if(!name||!planCadences.includes(cadence as PlanCadence)||!Number.isInteger(suggestedDuration)||suggestedDuration<=0||!completionStandard||!Number.isInteger(basePoints)||basePoints<0||!Number.isInteger(sortOrder)||sortOrder<1)return null;
 if(materialId!==null&&!Number.isInteger(materialId))return null;
 if((cadence==='weekly'||cadence==='custom_weekly')&&!weekdays.length)return null;
 return {name,cadence:cadence as PlanCadence,weekdays,materialId,suggestedDuration,completionStandard,evaluationRubric,basePoints,active,sortOrder};
}
export function listPlanItems(db:DatabaseSync,studentId:number,subject:Subject){return db.prepare(`SELECT i.*,m.name material_name FROM subject_plan_items i LEFT JOIN study_materials m ON m.id=i.material_id WHERE i.student_id=? AND i.subject=? ORDER BY i.sort_order,i.id`).all(studentId,subject).map(row=>mapItem(row as Record<string,unknown>))}
export function getPlanItem(db:DatabaseSync,studentId:number,id:number){const row=db.prepare(`SELECT i.*,m.name material_name FROM subject_plan_items i LEFT JOIN study_materials m ON m.id=i.material_id WHERE i.student_id=? AND i.id=?`).get(studentId,id);return row?mapItem(row as Record<string,unknown>):null}
export function createPlanItem(db:DatabaseSync,studentId:number,subject:Subject,input:PlanItemInput){
 const now=new Date().toISOString();
 const result=db.prepare('INSERT INTO subject_plan_items(student_id,subject,name,cadence,weekdays,material_id,suggested_duration,completion_standard,evaluation_rubric,base_points,active,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
  .run(studentId,subject,input.name,input.cadence,JSON.stringify(input.weekdays),input.materialId,input.suggestedDuration,input.completionStandard,input.evaluationRubric?JSON.stringify(input.evaluationRubric):null,input.basePoints,input.active?1:0,input.sortOrder,now,now);
 return getPlanItem(db,studentId,Number(result.lastInsertRowid))!;
}
export function updatePlanItem(db:DatabaseSync,studentId:number,id:number,input:PlanItemInput){
 if(!getPlanItem(db,studentId,id))return null;
 db.prepare('UPDATE subject_plan_items SET name=?,cadence=?,weekdays=?,material_id=?,suggested_duration=?,completion_standard=?,evaluation_rubric=?,base_points=?,active=?,sort_order=?,updated_at=? WHERE id=? AND student_id=?')
  .run(input.name,input.cadence,JSON.stringify(input.weekdays),input.materialId,input.suggestedDuration,input.completionStandard,input.evaluationRubric?JSON.stringify(input.evaluationRubric):null,input.basePoints,input.active?1:0,input.sortOrder,new Date().toISOString(),id,studentId);
 return getPlanItem(db,studentId,id);
}
export function deletePlanItem(db:DatabaseSync,studentId:number,id:number){return Boolean(db.prepare('DELETE FROM subject_plan_items WHERE id=? AND student_id=?').run(id,studentId).changes)}
function cadenceDays(cadence:PlanCadence,weekdays:number[]){if(cadence==='daily')return[1,2,3,4,5,6,7];if(cadence==='weekdays')return[1,2,3,4,5];if(cadence==='every_2_days')return[1,3,5,7];return weekdays}
export function generatePlanItemTasks(db:DatabaseSync,studentId:number,weekStart:string){
 if(!isMonday(weekStart))return null;
 for(const {id:subject} of listStudentSubjects(db,studentId)){for(const item of listPlanItems(db,studentId,subject).filter(item=>item.active)){
  const marker=`plan_item:${item.id}`;
  const existing=listWeeklyTasks(db,studentId,weekStart).filter(task=>task.sourceKnowledgeArea===marker);
  const existingDays=new Set(existing.map(task=>task.weekday));
  for(const weekday of cadenceDays(item.cadence as PlanCadence,item.weekdays).filter(day=>!existingDays.has(day))){const maxOrder=Math.max(0,...listWeeklyTasks(db,studentId,weekStart).filter(task=>task.weekday===weekday).map(task=>task.taskOrder));createWeeklyTask(db,studentId,{weekStart,weekday,subject,content:item.materialName?`${item.materialName}：${item.name}`:item.name,completionStandard:item.completionStandard,suggestedDuration:item.suggestedDuration,basePoints:item.basePoints,taskOrder:maxOrder+1,sourceKnowledgeArea:marker,evaluationRubric:item.evaluationRubric})}
 }}
 return listWeeklyTasks(db,studentId,weekStart);
}

export {allocatedPoints};
