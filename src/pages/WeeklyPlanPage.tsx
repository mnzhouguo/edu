import { useEffect,useMemo,useRef,useState } from 'react';
import { ChevronLeft,ChevronRight } from 'lucide-react';
import { api } from '../api';
import { DayTaskWorkspace } from '../components/DayTaskWorkspace';
import { daysOfWeek,defaultPlanningWeek,isoDate } from '../dates';
import { chineseWeekLabel,semesterWeekInfo } from '../semester';
import { useSubjectCatalog } from '../subject-catalog';
import { type Student,type Subject,type WeeklyTask } from '../types';

function todayWeekday(){
 const day=new Date().getDay();
 return day===0?7:day;
}

export function WeeklyPlanPage({student}:{student:Student}){
 const studentId=student.id;
 const{subjects:subjectOptions,label:subjectLabel}=useSubjectCatalog();
 const[weekStart,setWeekStart]=useState(defaultPlanningWeek);
 const[activeWeekday,setActiveWeekday]=useState(todayWeekday);
 const[tasks,setTasks]=useState<WeeklyTask[]>([]);
 const[subjectFilter,setSubjectFilter]=useState<Subject|'all'>('all');
 const[error,setError]=useState('');
 const days=daysOfWeek(weekStart);
 const activeDay=useMemo(()=>days.find(day=>day.weekday===activeWeekday)??days[0],[days,activeWeekday]);
 const semester=useMemo(()=>semesterWeekInfo(student.semesterStart,student.semesterEnd,weekStart),[student.semesterStart,student.semesterEnd,weekStart]);
 const requestVersion=useRef(0);

 async function load(){
  const version=++requestVersion.current;
  try{
   const result=await api<{tasks:WeeklyTask[]}>(`/api/students/${studentId}/weekly-tasks?weekStart=${weekStart}`);
   if(version!==requestVersion.current)return;
   setTasks(result.tasks);
   setError('');
  }catch(reason){setError(reason instanceof Error?reason.message:'读取失败')}
 }

 useEffect(()=>{
  setWeekStart(defaultPlanningWeek());
  setActiveWeekday(todayWeekday());
 },[studentId]);
 useEffect(()=>{void load()},[studentId,weekStart]);
 useEffect(()=>{if(!days.some(day=>day.weekday===activeWeekday))setActiveWeekday(days[0]?.weekday??1)},[days,activeWeekday]);
 useEffect(()=>{if(subjectFilter!=='all'&&!subjectOptions.some(item=>item.id===subjectFilter))setSubjectFilter('all')},[subjectOptions,subjectFilter]);

 function changeWeek(offset:number){
  const date=new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate()+offset*7);
  setWeekStart(isoDate(date));
 }

 return <div className="week-plan-page">
  <aside className="week-day-rail">
   <div className="week-rail-controls">
    <div className="week-rail-switcher">
     <button aria-label="上一周" className="icon-button" onClick={()=>changeWeek(-1)} title="上一周" type="button"><ChevronLeft size={18}/></button>
     <div className={`week-rail-week ${semester?semester.inRange?'':'out':'muted'}`} title={student.semesterStart&&student.semesterEnd?`学期 ${student.semesterStart} 至 ${student.semesterEnd}`:'请到设置页配置学期时间'}>
      {semester
       ?semester.inRange?<><strong>{chineseWeekLabel(semester.weekNumber)}</strong><span>共 {semester.totalWeeks} 周</span></>:<><strong>学期外</strong><span>共 {semester.totalWeeks} 周</span></>
       :<><strong>{!student.semesterStart&&!student.semesterEnd?'未设置学期':!student.semesterStart?'缺开始日期':'缺结束日期'}</strong><span>请到设置保存</span></>}
     </div>
     <button aria-label="下一周" className="icon-button" onClick={()=>changeWeek(1)} title="下一周" type="button"><ChevronRight size={18}/></button>
    </div>
   </div>
   <div className="week-day-tabs week-day-tabs-rail" role="tablist" aria-label="本周日期">
    {days.map(day=>{
     const dayItems=tasks.filter(task=>task.weekday===day.weekday);
     const count=dayItems.length;
     const planned=dayItems.reduce((sum,task)=>sum+task.suggestedDuration,0);
     const isToday=day.date===isoDate();
     return <button aria-selected={day.weekday===activeDay.weekday} className={[day.weekday===activeDay.weekday?'active':'',isToday?'is-today':''].filter(Boolean).join(' ')} key={day.date} onClick={()=>setActiveWeekday(day.weekday)} role="tab" type="button">
      {isToday&&<em className="today-badge">今天</em>}
      <strong>{day.label}</strong>
      <span>{count?`${count} 项 · ${planned} 分钟`:'暂无任务'}</span>
     </button>;
    })}
   </div>
  </aside>

  <div className="week-plan-body">
   {error&&<p className="error">{error}</p>}
   <DayTaskWorkspace
    addAriaLabel={`添加${activeDay.label}任务`}
    days={days}
    emptyHint="这一天还没有任务，点击右上角添加，或到学习规划生成整周计划。"
    onReload={load}
    onSubjectFilterChange={setSubjectFilter}
    setTasks={setTasks}
    studentId={studentId}
    subjectFilter={subjectFilter}
    subjectLabel={subjectLabel}
    subjectOptions={subjectOptions}
    tasks={tasks}
    title={<strong className="week-day-label">{activeDay.label}积分挑战<span className="week-day-date">{activeDay.short}</span></strong>}
    weekday={activeDay.weekday}
    weekStart={weekStart}
   />
  </div>
 </div>;
}
