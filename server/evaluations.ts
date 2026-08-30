import type { DatabaseSync } from 'node:sqlite';
import { addLedgerEntry } from './ledger.js';
import { getDailyTask,setDailyTaskStatus } from './plans.js';

export const completions=['not_completed','partial','completed','high_quality'] as const;
export const accuracyBands=['unrecorded','below_60','60','80','90','100'] as const;
export const behaviorTags=['proactive','on_time','corrected','focused'] as const;
const coefficients={not_completed:0,partial:0.5,completed:1,high_quality:1.2} as const;
const scoringRuleVersion='v1';

export type EvaluationInput={completion:typeof completions[number];accuracyBand:typeof accuracyBands[number];tags:typeof behaviorTags[number][];note:string;confirm:boolean};
export type EvaluationView={id:number;dailyTaskId:number;studentId:number;completion:string;accuracyBand:string;tags:string[];note:string;earnedPoints:number;confirmed:boolean;scoringRuleVersion:string};

export function calculatePoints(basePoints:number,completion:EvaluationInput['completion'],tags:string[]){
 if(completion==='not_completed')return 0;
 return Math.round(basePoints*coefficients[completion])+tags.length*5;
}

export function parseEvaluation(body:unknown):EvaluationInput|null{
 const value=body as Record<string,unknown>|null;
 const completion=String(value?.completion??'');
 const accuracyBand=String(value?.accuracyBand??'unrecorded');
 const tags=Array.isArray(value?.tags)?value.tags.map(String):[];
 if(!completions.includes(completion as EvaluationInput['completion']))return null;
 if(!accuracyBands.includes(accuracyBand as EvaluationInput['accuracyBand']))return null;
 if(tags.some(tag=>!behaviorTags.includes(tag as EvaluationInput['tags'][number])))return null;
 return {completion:completion as EvaluationInput['completion'],accuracyBand:accuracyBand as EvaluationInput['accuracyBand'],tags:tags as EvaluationInput['tags'],note:String(value?.note??'').trim(),confirm:Boolean(value?.confirm)};
}

function mapEvaluation(row:Record<string,unknown>):EvaluationView{
 return {id:Number(row.id),dailyTaskId:Number(row.daily_task_id),studentId:Number(row.student_id),completion:String(row.completion),accuracyBand:String(row.accuracy_band),tags:JSON.parse(String(row.tags)),note:String(row.note),earnedPoints:Number(row.earned_points),confirmed:Boolean(row.confirmed),scoringRuleVersion:String(row.scoring_rule_version)};
}

export function getEvaluationForTask(db:DatabaseSync,dailyTaskId:number){
 const row=db.prepare('SELECT * FROM evaluations WHERE daily_task_id=?').get(dailyTaskId);
 return row?mapEvaluation(row as Record<string,unknown>):null;
}

export function upsertEvaluation(db:DatabaseSync,studentId:number,taskId:number,input:EvaluationInput){
 const task=getDailyTask(db,studentId,taskId);
 if(!task)return {status:'not_found' as const};
 const earned=calculatePoints(task.basePoints,input.completion,input.tags);
 const existing=getEvaluationForTask(db,taskId);
 const now=new Date().toISOString();
 db.exec('BEGIN');
 try{
  let evaluationId:number;
  if(!existing){
   const result=db.prepare('INSERT INTO evaluations(daily_task_id,student_id,completion,accuracy_band,tags,note,earned_points,confirmed,scoring_rule_version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(taskId,studentId,input.completion,input.accuracyBand,JSON.stringify(input.tags),input.note,earned,input.confirm?1:0,scoringRuleVersion,now,now);
   evaluationId=Number(result.lastInsertRowid);
   if(input.confirm){addLedgerEntry(db,studentId,'earn',earned,'evaluation',evaluationId);setDailyTaskStatus(db,studentId,taskId,'evaluated')}
  }else{
   evaluationId=existing.id;
   if(existing.confirmed){
    const delta=earned-existing.earnedPoints;
    db.prepare('UPDATE evaluations SET completion=?,accuracy_band=?,tags=?,note=?,earned_points=?,updated_at=? WHERE id=?').run(input.completion,input.accuracyBand,JSON.stringify(input.tags),input.note,earned,now,existing.id);
    if(input.confirm&&delta!==0)addLedgerEntry(db,studentId,'adjust',delta,'evaluation',existing.id);
   }else{
    db.prepare('UPDATE evaluations SET completion=?,accuracy_band=?,tags=?,note=?,earned_points=?,confirmed=?,updated_at=? WHERE id=?').run(input.completion,input.accuracyBand,JSON.stringify(input.tags),input.note,earned,input.confirm?1:0,now,existing.id);
    if(input.confirm){addLedgerEntry(db,studentId,'earn',earned,'evaluation',existing.id);setDailyTaskStatus(db,studentId,taskId,'evaluated')}
   }
  }
  db.exec('COMMIT');
  return {status:'ok' as const,evaluationId};
 }catch(error){db.exec('ROLLBACK');throw error}
}
