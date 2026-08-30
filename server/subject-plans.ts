import type { DatabaseSync } from 'node:sqlite';
import { areaLabel,DEFAULT_BASE_POINTS,DEFAULT_COMPLETION,DEFAULT_DURATION,DEFAULT_SESSIONS,isAreaId,knowledgeAreaCatalog,weekdaySlots } from './catalog.js';
import { createWeeklyTask,listWeeklyTasks,subjects,type Subject } from './plans.js';
import { isMonday } from './dates.js';

export type SubjectGoal={narrative:string;currentScore:number|null;targetScore:number|null;targetDate:string|null};
export type AreaSettingInput={id:string;enabled:boolean;sortOrder:number;sessionsPerWeek:number;suggestedDuration:number};
export type MaterialInput={name:string;type:'workbook'|'course'|'handout'|'other';note:string};

function mapMaterial(row:Record<string,unknown>){
 return {id:Number(row.id),name:String(row.name),type:String(row.material_type),note:String(row.note),areaId:String(row.area_id)};
}

function listMaterials(db:DatabaseSync,studentId:number,subject:Subject,areaId:string){
 return db.prepare('SELECT * FROM study_materials WHERE student_id=? AND subject=? AND area_id=? ORDER BY id').all(studentId,subject,areaId).map(row=>mapMaterial(row as Record<string,unknown>));
}

function ensurePlanRow(db:DatabaseSync,studentId:number,subject:Subject){
 const existing=db.prepare('SELECT id FROM subject_plans WHERE student_id=? AND subject=?').get(studentId,subject);
 if(existing)return;
 const now=new Date().toISOString();
 db.prepare('INSERT INTO subject_plans(student_id,subject,goal_narrative,current_score,target_score,target_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(studentId,subject,'',null,null,null,now,now);
}

export function getSubjectPlan(db:DatabaseSync,studentId:number,subject:Subject){
 ensurePlanRow(db,studentId,subject);
 const row=db.prepare('SELECT * FROM subject_plans WHERE student_id=? AND subject=?').get(studentId,subject) as Record<string,unknown>;
 const settings=db.prepare('SELECT * FROM knowledge_area_settings WHERE student_id=? AND subject=?').all(studentId,subject) as Array<Record<string,unknown>>;
 const byId=new Map(settings.map(item=>[String(item.area_id),item]));
 const areas=knowledgeAreaCatalog[subject].map((def,index)=>{
  const saved=byId.get(def.id);
  return {
   id:def.id,label:def.label,
   enabled:saved?Boolean(saved.enabled):false,
   sortOrder:saved?Number(saved.sort_order):index+1,
   sessionsPerWeek:saved?Number(saved.sessions_per_week):DEFAULT_SESSIONS,
   suggestedDuration:saved?Number(saved.suggested_duration):DEFAULT_DURATION,
   materials:listMaterials(db,studentId,subject,def.id)
  };
 }).sort((a,b)=>a.sortOrder-b.sortOrder||a.id.localeCompare(b.id));
 return {
  subject,
  goal:{
   narrative:String(row.goal_narrative??''),
   currentScore:row.current_score===null||row.current_score===undefined?null:Number(row.current_score),
   targetScore:row.target_score===null||row.target_score===undefined?null:Number(row.target_score),
   targetDate:row.target_date===null||row.target_date===undefined||row.target_date===''?null:String(row.target_date)
  },
  areas
 };
}

export function parseSubjectPlanUpdate(body:unknown,subject:Subject):{goal:SubjectGoal;areas:AreaSettingInput[]}|null{
 const value=body as Record<string,unknown>|null;
 const goalRaw=(value?.goal??{}) as Record<string,unknown>;
 const narrative=String(goalRaw.narrative??'').trim();
 const currentScore=goalRaw.currentScore===undefined||goalRaw.currentScore===null||goalRaw.currentScore===''?null:Number(goalRaw.currentScore);
 const targetScore=goalRaw.targetScore===undefined||goalRaw.targetScore===null||goalRaw.targetScore===''?null:Number(goalRaw.targetScore);
 const targetDate=goalRaw.targetDate===undefined||goalRaw.targetDate===null||goalRaw.targetDate===''?null:String(goalRaw.targetDate);
 if(currentScore!==null&&Number.isNaN(currentScore))return null;
 if(targetScore!==null&&Number.isNaN(targetScore))return null;
 if(!narrative)return null;
 const areasRaw=Array.isArray(value?.areas)?value.areas:[];
 const areas:AreaSettingInput[]=[];
 for(const item of areasRaw){
  const area=item as Record<string,unknown>;
  const id=String(area.id??'');
  if(!isAreaId(subject,id))return null;
  const sessionsPerWeek=Number(area.sessionsPerWeek);
  const suggestedDuration=Number(area.suggestedDuration);
  const sortOrder=Number(area.sortOrder);
  if(!Number.isInteger(sessionsPerWeek)||sessionsPerWeek<=0||!Number.isInteger(suggestedDuration)||suggestedDuration<=0||!Number.isInteger(sortOrder)||sortOrder<1)return null;
  areas.push({id,enabled:Boolean(area.enabled),sortOrder,sessionsPerWeek,suggestedDuration});
 }
 return {goal:{narrative,currentScore,targetScore,targetDate},areas};
}

export function updateSubjectPlan(db:DatabaseSync,studentId:number,subject:Subject,input:{goal:SubjectGoal;areas:AreaSettingInput[]}){
 ensurePlanRow(db,studentId,subject);
 const now=new Date().toISOString();
 db.exec('BEGIN');
 try{
  db.prepare('UPDATE subject_plans SET goal_narrative=?,current_score=?,target_score=?,target_date=?,updated_at=? WHERE student_id=? AND subject=?').run(input.goal.narrative,input.goal.currentScore,input.goal.targetScore,input.goal.targetDate,now,studentId,subject);
  const upsert=db.prepare(`INSERT INTO knowledge_area_settings(student_id,subject,area_id,enabled,sort_order,sessions_per_week,suggested_duration)
   VALUES (?,?,?,?,?,?,?) ON CONFLICT(student_id,subject,area_id) DO UPDATE SET enabled=excluded.enabled,sort_order=excluded.sort_order,sessions_per_week=excluded.sessions_per_week,suggested_duration=excluded.suggested_duration`);
  for(const area of input.areas)upsert.run(studentId,subject,area.id,area.enabled?1:0,area.sortOrder,area.sessionsPerWeek,area.suggestedDuration);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
 return getSubjectPlan(db,studentId,subject);
}

export function parseMaterial(body:unknown):MaterialInput|null{
 const value=body as Record<string,unknown>|null;
 const name=String(value?.name??'').trim();
 const type=String(value?.type??'other');
 const note=String(value?.note??'').trim();
 if(!name||!['workbook','course','handout','other'].includes(type))return null;
 return {name,type:type as MaterialInput['type'],note};
}

export function createMaterial(db:DatabaseSync,studentId:number,subject:Subject,areaId:string,input:MaterialInput){
 if(!isAreaId(subject,areaId))return null;
 const now=new Date().toISOString();
 const result=db.prepare('INSERT INTO study_materials(student_id,subject,area_id,name,material_type,note,created_at) VALUES (?,?,?,?,?,?,?)').run(studentId,subject,areaId,input.name,input.type,input.note,now);
 return mapMaterial(db.prepare('SELECT * FROM study_materials WHERE id=?').get(Number(result.lastInsertRowid)) as Record<string,unknown>);
}

export function deleteMaterial(db:DatabaseSync,studentId:number,id:number){
 return Boolean(db.prepare('DELETE FROM study_materials WHERE id=? AND student_id=?').run(id,studentId).changes);
}

export function generateFromSubjectPlans(db:DatabaseSync,studentId:number,weekStart:string){
 if(!isMonday(weekStart))return null;
 for(const subject of subjects){
  const plan=getSubjectPlan(db,studentId,subject);
  for(const area of plan.areas.filter(item=>item.enabled)){
   const sourced=listWeeklyTasks(db,studentId,weekStart).filter(task=>task.subject===subject&&task.sourceKnowledgeArea===area.id);
   const missing=area.sessionsPerWeek-sourced.length;
   if(missing<=0)continue;
   const load=new Map<number,number>();
   for(const task of sourced)load.set(task.weekday,(load.get(task.weekday)??0)+1);
   const preferred=weekdaySlots(area.sessionsPerWeek);
   const chosen:number[]=[];
   for(const day of preferred){
    if(chosen.length>=missing)break;
    if((load.get(day)??0)===0&&!chosen.includes(day))chosen.push(day);
   }
   let cursor=0;
   while(chosen.length<missing){chosen.push(preferred[cursor%preferred.length]??(cursor%5)+1);cursor++}
   const materialName=area.materials[0]?.name;
   const label=areaLabel(subject,area.id);
   const content=materialName?`${label}：${materialName}`:`${label}：练习`;
   for(const weekday of chosen){
    const maxOrder=Math.max(0,...listWeeklyTasks(db,studentId,weekStart).filter(task=>task.weekday===weekday).map(task=>task.taskOrder));
    createWeeklyTask(db,studentId,{
     weekStart,weekday,subject,content,completionStandard:DEFAULT_COMPLETION,
     suggestedDuration:area.suggestedDuration,basePoints:DEFAULT_BASE_POINTS,taskOrder:maxOrder+1,sourceKnowledgeArea:area.id
    });
   }
  }
 }
 return listWeeklyTasks(db,studentId,weekStart);
}
