import type { DatabaseSync } from 'node:sqlite';

export const defaultSubjects=[
 {id:'chinese',label:'语文'},
 {id:'math',label:'数学'},
 {id:'english',label:'英语'},
 {id:'physics',label:'物理'},
 {id:'history',label:'历史'},
] as const;

export type StudentSubject={id:string;label:string;custom:boolean;sortOrder:number};

export function listStudentSubjects(db:DatabaseSync,studentId:number):StudentSubject[]{
 const custom=db.prepare('SELECT subject_key,label,sort_order FROM student_subjects WHERE student_id=? ORDER BY sort_order,id').all(studentId) as Array<Record<string,unknown>>;
 return [
  ...defaultSubjects.map((item,index)=>({id:item.id,label:item.label,custom:false,sortOrder:index+1})),
  ...custom.map(item=>({id:String(item.subject_key),label:String(item.label),custom:true,sortOrder:Number(item.sort_order)})),
 ];
}

export function hasStudentSubject(db:DatabaseSync,studentId:number,subject:string){
 return defaultSubjects.some(item=>item.id===subject)||Boolean(db.prepare('SELECT 1 FROM student_subjects WHERE student_id=? AND subject_key=?').get(studentId,subject));
}

export function createStudentSubject(db:DatabaseSync,studentId:number,label:string){
 const clean=label.trim();
 if(!clean)return null;
 const duplicate=listStudentSubjects(db,studentId).find(item=>item.label===clean);
 if(duplicate)return duplicate;
 const subjectKey=`custom_${clean}`;
 const max=Number((db.prepare('SELECT COALESCE(MAX(sort_order),5) value FROM student_subjects WHERE student_id=?').get(studentId) as {value:number}).value);
 db.prepare('INSERT INTO student_subjects(student_id,subject_key,label,sort_order,created_at) VALUES (?,?,?,?,?)').run(studentId,subjectKey,clean,max+1,new Date().toISOString());
 return listStudentSubjects(db,studentId).find(item=>item.id===subjectKey)!;
}
