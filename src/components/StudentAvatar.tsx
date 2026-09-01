import type { Student } from '../types';

export function studentAvatarSrc(student:Pick<Student,'id'|'hasAvatar'|'updatedAt'>){
 if(!student.hasAvatar)return null;
 return `/api/students/${student.id}/avatar?v=${encodeURIComponent(student.updatedAt??'')}`;
}

export function StudentAvatar({student,previewSrc,size=32}:{student:Pick<Student,'id'|'name'|'hasAvatar'|'updatedAt'>|null;previewSrc?:string|null;size?:number}){
 const src=previewSrc||(student?studentAvatarSrc(student):null);
 const initial=(student?.name||'?').trim().slice(0,1);
 return <span className="student-avatar" style={{width:size,height:size,fontSize:Math.max(12,Math.round(size*0.4))}}>
  {src?<img alt={student?`${student.name}的头像`:'头像'} src={src}/>:<span>{initial}</span>}
 </span>;
}
