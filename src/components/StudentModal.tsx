import { useEffect,useRef,useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api';
import type { Student } from '../types';
import { StudentAvatar } from './StudentAvatar';

type Form=Omit<Student,'id'|'hasAvatar'|'updatedAt'>;
const empty:Form={name:'',grade:'初二',school:'',currentGoal:'',semesterStart:null,semesterEnd:null};

export function StudentModal({student,onClose,onSaved}:{student:Student|null;onClose:()=>void;onSaved:(student:Student)=>void}){
 const[form,setForm]=useState<Form>(student?{name:student.name,grade:student.grade,school:student.school,currentGoal:student.currentGoal,semesterStart:student.semesterStart,semesterEnd:student.semesterEnd}:empty);
 const[file,setFile]=useState<File|null>(null);
 const[previewSrc,setPreviewSrc]=useState<string|null>(null);
 const[error,setError]=useState('');
 const fileRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(!file){setPreviewSrc(null);return}
  const url=URL.createObjectURL(file);
  setPreviewSrc(url);
  return ()=>URL.revokeObjectURL(url);
 },[file]);
 async function save(event:React.FormEvent){
  event.preventDefault();
  try{
   let result=await api<{student:Student}>(student?`/api/students/${student.id}`:'/api/students',{method:student?'PUT':'POST',body:JSON.stringify(form)});
   if(file){
    const data=new FormData();
    data.append('avatar',file);
    result=await api<{student:Student}>(`/api/students/${result.student.id}/avatar`,{method:'POST',body:data});
   }
   onSaved(result.student);
  }catch(reason){setError(reason instanceof Error?reason.message:'保存失败')}
 }
 return <div className="backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="student-dialog"><div className="modal-head"><div><span className="eyebrow">Student Profile</span><h2 id="student-dialog">{student?'编辑孩子档案':'新增孩子档案'}</h2></div><button className="icon-button" onClick={onClose} title="关闭"><X size={20}/></button></div><form onSubmit={save}>
  <div className="student-avatar-field">
   <button className="student-avatar-picker" onClick={()=>fileRef.current?.click()} title="选择头像" type="button">
    <StudentAvatar previewSrc={previewSrc} size={88} student={student?{...student,...form}:form.name?{id:0,name:form.name,hasAvatar:false}:null}/>
   </button>
   <div>
    <strong>头像</strong>
    <p>点击圆形头像选择图片，保存后显示在顶部。</p>
    <button className="secondary" onClick={()=>fileRef.current?.click()} type="button">选择图片</button>
   </div>
   <input accept="image/jpeg,image/png,image/webp,image/gif" aria-label="头像" hidden onChange={event=>setFile(event.target.files?.[0]??null)} ref={fileRef} type="file"/>
  </div>
  <label>姓名或昵称<input aria-label="姓名或昵称" autoFocus required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
  <div className="form-row"><label>年级<input value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})}/></label><label>学校<input value={form.school} onChange={e=>setForm({...form,school:e.target.value})}/></label></div>
  <label>当前目标<textarea rows={3} value={form.currentGoal} onChange={e=>setForm({...form,currentGoal:e.target.value})}/></label>
  {error&&<p className="form-error">{error}</p>}
  <div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>取消</button><button className="primary" type="submit">保存档案</button></div>
 </form></div></div>;
}
