import type { DatabaseSync } from 'node:sqlite';
import { getDailyTask,setDailyTaskStatus } from './plans.js';
import { insertPhoto,listPhotos,removeWritten,validatePhoto,writePhoto,type UploadedFile } from './photos.js';

export type SubmissionView={id:number;dailyTaskId:number;studentId:number;submittedAt:string;note:string;photos:ReturnType<typeof listPhotos>};

function mapSubmission(row:Record<string,unknown>,photos:SubmissionView['photos']):SubmissionView{
 return {id:Number(row.id),dailyTaskId:Number(row.daily_task_id),studentId:Number(row.student_id),submittedAt:String(row.submitted_at),note:String(row.note),photos};
}

export function getSubmissionForTask(db:DatabaseSync,dailyTaskId:number){
 const row=db.prepare('SELECT * FROM submissions WHERE daily_task_id=?').get(dailyTaskId);
 return row?mapSubmission(row as Record<string,unknown>,listPhotos(db,'submission',Number((row as {id:number}).id))):null;
}

export function submitDailyTask(db:DatabaseSync,library:string,maxBytes:number,studentId:number,taskId:number,note:string,files:UploadedFile[]){
 const task=getDailyTask(db,studentId,taskId);
 if(!task)return {status:'not_found' as const};
 if(task.status==='evaluated')return {status:'locked' as const};
 const existing=getSubmissionForTask(db,taskId);
 if(existing)return {status:'exists' as const,value:task};
 for(const file of files){const error=validatePhoto(file,maxBytes);if(error)return {status:'invalid' as const,message:error}}
 const stored=files.map(file=>writePhoto(library,file));
 const now=new Date().toISOString();
 db.exec('BEGIN');
 try{
  const result=db.prepare('INSERT INTO submissions(daily_task_id,student_id,submitted_at,note) VALUES (?,?,?,?)').run(taskId,studentId,now,note.trim());
  const submissionId=Number(result.lastInsertRowid);
  for(const photo of stored)insertPhoto(db,studentId,'submission',submissionId,photo);
  setDailyTaskStatus(db,studentId,taskId,'submitted');
  db.exec('COMMIT');
 }catch(error){
  db.exec('ROLLBACK');
  removeWritten(library,stored.map(item=>item.relativePath));
  throw error;
 }
 return {status:'created' as const,value:getDailyTask(db,studentId,taskId)!};
}
