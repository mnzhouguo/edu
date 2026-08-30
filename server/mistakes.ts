import type { DatabaseSync } from 'node:sqlite';
import { subjects } from './plans.js';
import { insertPhoto,listPhotos,removeWritten,validatePhoto,writePhoto,type UploadedFile } from './photos.js';

export const mistakeReasons=['concept','formula','calculation','misread','steps','memory','method','time','other'] as const;
export const redoStatuses=['not_redone','redone_wrong','redone_correct'] as const;
export type MistakeInput={subject:typeof subjects[number];summary:string;reason:typeof mistakeReasons[number];reasonNote:string;correctSolution:string;redoStatus:typeof redoStatuses[number]};

function mapMistake(row:Record<string,unknown>,photos:ReturnType<typeof listPhotos>){
 return {id:Number(row.id),studentId:Number(row.student_id),subject:String(row.subject),summary:String(row.summary),reason:String(row.reason),reasonNote:String(row.reason_note),correctSolution:String(row.correct_solution),redoStatus:String(row.redo_status),createdAt:String(row.created_at),updatedAt:String(row.updated_at),photos};
}

export function parseMistake(body:unknown):MistakeInput|null{
 const value=body as Record<string,unknown>|null;
 const input={subject:String(value?.subject??''),summary:String(value?.summary??'').trim(),reason:String(value?.reason??''),reasonNote:String(value?.reasonNote??'').trim(),correctSolution:String(value?.correctSolution??'').trim(),redoStatus:String(value?.redoStatus??'not_redone')};
 if(!subjects.includes(input.subject as typeof subjects[number])||!input.summary||!mistakeReasons.includes(input.reason as MistakeInput['reason'])||!redoStatuses.includes(input.redoStatus as MistakeInput['redoStatus']))return null;
 return input as MistakeInput;
}

export function getMistake(db:DatabaseSync,studentId:number,id:number){
 const row=db.prepare('SELECT * FROM mistakes WHERE id=? AND student_id=?').get(id,studentId);
 return row?mapMistake(row as Record<string,unknown>,listPhotos(db,'mistake',id)):null;
}

export function listMistakes(db:DatabaseSync,studentId:number,subject?:string){
 const rows=subject?db.prepare('SELECT * FROM mistakes WHERE student_id=? AND subject=? ORDER BY id').all(studentId,subject):db.prepare('SELECT * FROM mistakes WHERE student_id=? ORDER BY id').all(studentId);
 return rows.map(row=>{const record=row as Record<string,unknown>;return mapMistake(record,listPhotos(db,'mistake',Number(record.id)))});
}

export function createMistake(db:DatabaseSync,library:string,maxBytes:number,studentId:number,input:MistakeInput,files:UploadedFile[]){
 for(const file of files){const error=validatePhoto(file,maxBytes);if(error)return {status:'invalid' as const,message:error}}
 const stored=files.map(file=>writePhoto(library,file));
 const now=new Date().toISOString();
 db.exec('BEGIN');
 try{
  const result=db.prepare('INSERT INTO mistakes(student_id,subject,summary,reason,reason_note,correct_solution,redo_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(studentId,input.subject,input.summary,input.reason,input.reasonNote,input.correctSolution,input.redoStatus,now,now);
  const id=Number(result.lastInsertRowid);
  for(const photo of stored)insertPhoto(db,studentId,'mistake',id,photo);
  db.exec('COMMIT');
  return {status:'ok' as const,value:getMistake(db,studentId,id)!};
 }catch(error){db.exec('ROLLBACK');removeWritten(library,stored.map(item=>item.relativePath));throw error}
}

export function updateMistake(db:DatabaseSync,studentId:number,id:number,input:MistakeInput){
 if(!getMistake(db,studentId,id))return null;
 db.prepare('UPDATE mistakes SET subject=?,summary=?,reason=?,reason_note=?,correct_solution=?,redo_status=?,updated_at=? WHERE id=? AND student_id=?').run(input.subject,input.summary,input.reason,input.reasonNote,input.correctSolution,input.redoStatus,new Date().toISOString(),id,studentId);
 return getMistake(db,studentId,id);
}

export function deleteMistake(db:DatabaseSync,library:string,studentId:number,id:number){
 const existing=getMistake(db,studentId,id);
 if(!existing)return false;
 db.exec('BEGIN');
 try{
  db.prepare('DELETE FROM photos WHERE owner_type=? AND owner_id=?').run('mistake',id);
  db.prepare('DELETE FROM mistakes WHERE id=? AND student_id=?').run(id,studentId);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
 removeWritten(library,existing.photos.map(photo=>photo.relativePath));
 return true;
}
