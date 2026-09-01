import { useEffect,useMemo,useRef,useState } from 'react';
import { api } from '../api';
import { DayTaskWorkspace } from '../components/DayTaskWorkspace';
import { daysOfWeek,isoDate,mondayOf } from '../dates';
import { useSubjectCatalog } from '../subject-catalog';
import { type Subject,type WeeklyTask } from '../types';

function weekdayOf(value:string){
 const date=new Date(`${value}T12:00:00`);
 return date.getDay()||7;
}

function weekdayLabel(value:string){
 return ['周日','周一','周二','周三','周四','周五','周六'][new Date(`${value}T12:00:00`).getDay()];
}

function subjectProgress(tasks:WeeklyTask[]){
 const total=tasks.length;
 const completed=tasks.filter(task=>task.executionStatus==='completed').length;
 return {total,completed,rate:total?completed/total:0};
}

function SubjectFilterCard({
 label,active,onClick,tasks,
}:{label:string;active:boolean;onClick:()=>void;tasks:WeeklyTask[]}){
 const progress=subjectProgress(tasks);
 const percent=Math.round(progress.rate*100);
 const allDone=progress.total>0&&progress.completed===progress.total;
 return <button
  className={['today-subject-card',active?'active':'',allDone?'is-done':''].filter(Boolean).join(' ')}
  onClick={onClick}
  type="button"
 >
  <span className="today-subject-top">
   <strong>{label}</strong>
   <em>{progress.completed}/{progress.total} 项</em>
  </span>
  <span className="today-subject-percent">{percent}%</span>
  <span className="today-subject-bar" aria-label={`${label}完成 ${percent}%`}><i style={{width:`${percent}%`}}/></span>
 </button>;
}

export function TodayBoardPage({studentId,onOpenWeeklyPlan}:{studentId:number;onOpenWeeklyPlan?:()=>void}){
 const{subjects,label:subjectLabel}=useSubjectCatalog();
 const date=isoDate();
 const[tasks,setTasks]=useState<WeeklyTask[]>([]);
 const[filter,setFilter]=useState<Subject|'all'>('all');
 const[error,setError]=useState('');
 const weekStart=mondayOf(date);
 const weekday=weekdayOf(date);
 const days=useMemo(()=>daysOfWeek(weekStart),[weekStart]);
 const dayTasks=useMemo(()=>tasks.filter(task=>task.weekday===weekday),[tasks,weekday]);
 const subjectsWithTasks=useMemo(()=>subjects.filter(subject=>dayTasks.some(task=>task.subject===subject.id)),[subjects,dayTasks]);
 const requestVersion=useRef(0);

 async function load(){
  const version=++requestVersion.current;
  try{
   const taskResult=await api<{tasks:WeeklyTask[]}>(`/api/students/${studentId}/weekly-tasks?weekStart=${weekStart}`);
   if(version!==requestVersion.current)return;
   setTasks(taskResult.tasks);
   setError('');
  }catch(reason){setError(reason instanceof Error?reason.message:'读取失败')}
 }

 useEffect(()=>{setFilter('all');void load()},[studentId]);
 useEffect(()=>{if(filter!=='all'&&!dayTasks.some(task=>task.subject===filter))setFilter('all')},[dayTasks,filter]);

 return <div className="today-board-page">
  <aside className="subject-rail today-subject-rail">
   <div className="subject-rail-title">科目进度</div>
   <div className="subject-rail-list today-subject-list">
    <SubjectFilterCard active={filter==='all'} label="全部任务" onClick={()=>setFilter('all')} tasks={dayTasks}/>
    {subjectsWithTasks.map(subject=>{
     const subjectTasks=dayTasks.filter(task=>task.subject===subject.id);
     return <SubjectFilterCard
      active={filter===subject.id}
      key={subject.id}
      label={subject.label}
      onClick={()=>setFilter(subject.id)}
      tasks={subjectTasks}
     />;
    })}
   </div>
  </aside>

  <div className="today-board-body">
   {error&&<p className="error">{error}</p>}
   <DayTaskWorkspace
    addAriaLabel={`添加${weekdayLabel(date)}任务`}
    days={days}
    emptyHint={<>今天还没有任务，点击右上角添加{onOpenWeeklyPlan?<>，或<button className="text-button" onClick={onOpenWeeklyPlan} type="button">去每周计划</button></>:null}。</>}
    lockWeekday
    onReload={load}
    onSubjectFilterChange={setFilter}
    setTasks={setTasks}
    showSubjectFilter={false}
    studentId={studentId}
    subjectFilter={filter}
    subjectLabel={subjectLabel}
    subjectOptions={subjects}
    tasks={tasks}
    title={<strong className="week-day-label">任务清单</strong>}
    weekday={weekday}
    weekStart={weekStart}
   />
  </div>
 </div>;
}
