import { useEffect,useMemo,useState } from 'react';
import { CirclePlus,Pencil } from 'lucide-react';
import { api } from '../api';
import { DateField } from '../components/DateField';
import { StudentAvatar } from '../components/StudentAvatar';
import { isoDate } from '../dates';
import { semesterTotalWeeks } from '../semester';
import type { Student } from '../types';

function defaultSemesterEnd(start:string){
 const date=new Date(`${start}T12:00:00`);
 date.setDate(date.getDate()+18*7-1);
 return isoDate(date);
}

export function SettingsPage({student,onSaved,onCreateStudent,onEditStudent}:{student:Student;onSaved:(student:Student)=>void;onCreateStudent:()=>void;onEditStudent:()=>void}){
 const[semesterStart,setSemesterStart]=useState(student.semesterStart??isoDate());
 const[semesterEnd,setSemesterEnd]=useState(student.semesterEnd??defaultSemesterEnd(student.semesterStart??isoDate()));
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const totalWeeks=useMemo(()=>{
  if(!semesterStart||!semesterEnd||semesterEnd<semesterStart)return null;
  return semesterTotalWeeks(semesterStart,semesterEnd);
 },[semesterStart,semesterEnd]);

 useEffect(()=>{
  const start=student.semesterStart??isoDate();
  setSemesterStart(start);
  setSemesterEnd(student.semesterEnd??defaultSemesterEnd(start));
  setError('');
  setMessage('');
 },[student.id,student.semesterStart,student.semesterEnd]);

 async function save(event:React.FormEvent){
  event.preventDefault();
  if(!semesterStart||!semesterEnd){setError('请选择学期开始和结束日期');return}
  if(semesterEnd<semesterStart){setError('结束日期不能早于开始日期');return}
  try{
   const result=await api<{student:Student}>(`/api/students/${student.id}`,{method:'PUT',body:JSON.stringify({
    name:student.name,
    grade:student.grade,
    school:student.school,
    currentGoal:student.currentGoal,
    semesterStart,
    semesterEnd,
   })});
   onSaved(result.student);
   setMessage(`学期设置已保存，本学期共 ${totalWeeks} 周`);
   setError('');
  }catch(reason){setError(reason instanceof Error?reason.message:'保存失败')}
 }

 return <div className="settings-page">
  <div className="week-plan-head">
   <div>
    <h1 className="subject-plan-title">基础设置</h1>
    <p className="week-plan-subtitle">管理孩子档案，并配置本学期时间。</p>
   </div>
  </div>
  {error&&<p className="error">{error}</p>}
  {message&&<p className="success-message">{message}</p>}
  <section className="panel settings-panel">
   <div className="settings-panel-head">
    <strong>孩子档案</strong>
    <span className="panel-hint">当前孩子：{student.name}</span>
   </div>
   <div className="drawer-body settings-body settings-student-body">
    <StudentAvatar size={56} student={student}/>
    <div>
     <p className="settings-student-meta">{[student.name,student.grade||'年级未填写',student.school||'学校未填写'].join(' · ')}</p>
     <p className="settings-student-goal">{student.currentGoal||'还没有填写当前目标'}</p>
    </div>
   </div>
   <div className="drawer-actions">
    <button className="secondary" onClick={onEditStudent} type="button"><Pencil size={16}/>编辑当前孩子</button>
    <button className="primary" onClick={onCreateStudent} type="button"><CirclePlus size={16}/>新增孩子</button>
   </div>
  </section>
  <form className="panel settings-panel" onSubmit={save}>
   <div className="settings-panel-head">
    <strong>学期时间</strong>
    <span className="panel-hint">当前孩子：{student.name}</span>
   </div>
   <div className="drawer-body settings-body">
    <div className="form-row">
     <label>学期开始日期<DateField ariaLabel="学期开始日期" value={semesterStart} onChange={setSemesterStart}/></label>
     <label>学期结束日期<DateField ariaLabel="学期结束日期" value={semesterEnd} onChange={setSemesterEnd}/></label>
    </div>
    <div className={`rubric-budget ${totalWeeks?'exact':'under'}`}>
     {totalWeeks?<>本学期共 <strong>{totalWeeks}</strong> 周（按自然周周一至周日计算）</>:<>填写开始与结束日期后，将自动计算本学期周数</>}
    </div>
   </div>
   <div className="drawer-actions">
    <button className="primary" type="submit">保存学期设置</button>
   </div>
  </form>
 </div>;
}
