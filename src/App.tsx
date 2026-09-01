import { useEffect,useMemo,useState } from 'react';
import { BookMarked,CalendarDays,CirclePlus,ClipboardCheck,Gift,LayoutDashboard,Settings,Target,UserRound } from 'lucide-react';
import { api } from './api';
import { LiveClock } from './components/LiveClock';
import { MathBackdrop } from './components/MathBackdrop';
import { SemesterWeekBadge } from './components/SemesterWeekBadge';
import { StudentModal } from './components/StudentModal';
import { StudentSwitcher } from './components/StudentSwitcher';
import { DashboardPage } from './pages/DashboardPage';
import { MistakesPage } from './pages/MistakesPage';
import { RewardsPage } from './pages/RewardsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SubjectPlanPage } from './pages/SubjectPlanPage';
import { TodayBoardPage } from './pages/TodayBoardPage';
import { WeeklyPlanPage } from './pages/WeeklyPlanPage';
import { SubjectCatalogProvider } from './subject-catalog';
import type { Student } from './types';

type Page='today'|'plan'|'week'|'mistakes'|'rewards'|'dashboard'|'settings';
const nav:[Page,string,typeof ClipboardCheck][]=[
 ['today','今日任务',ClipboardCheck],
 ['plan','学习规划',BookMarked],
 ['week','每周计划',CalendarDays],
 ['rewards','积分兑换',Gift],
 ['dashboard','数据概览',LayoutDashboard],
 ['settings','基础设置',Settings],
];

export function App(){
 const[students,setStudents]=useState<Student[]>([]);
 const[activeId,setActiveId]=useState<number|null>(()=>Number(localStorage.getItem('activeStudentId'))||null);
 const[page,setPage]=useState<Page>('today');
 const[studentModal,setStudentModal]=useState<'create'|'edit'|null>(null);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState('');
 const active=useMemo(()=>students.find(student=>student.id===activeId)??null,[students,activeId]);
 useEffect(()=>{api<{students:Student[]}>('/api/students').then(({students:next})=>{setStudents(next);const stored=Number(localStorage.getItem('activeStudentId'));setActiveId(next.some(student=>student.id===stored)?stored:next[0]?.id??null)}).catch(reason=>setError(reason.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{if(activeId)localStorage.setItem('activeStudentId',String(activeId))},[activeId]);
 function saved(student:Student){setStudents(current=>current.some(item=>item.id===student.id)?current.map(item=>item.id===student.id?student:item):[...current,student]);setActiveId(student.id);setStudentModal(null)}
 return <div className="app-shell">
  <aside className="sidebar">
   <MathBackdrop/>
   <div className="brand"><span className="brand-mark">成</span><div><strong>成长计划</strong><small>学习进度管理</small></div></div>
   <nav>{nav.map(([id,label,Icon])=><button className={page===id?'nav-item active':'nav-item'} key={id} onClick={()=>setPage(id)}><Icon size={19}/><span>{label}</span></button>)}</nav>
   <div className="sidebar-note"><Target size={18}/><div><strong>本学期目标</strong><p>{active?.currentGoal||'创建档案后填写目标'}</p></div></div>
  </aside>
  <main>
   <header className="topbar">
    <StudentSwitcher activeId={activeId} onChange={setActiveId} students={students}/>
    <SemesterWeekBadge student={active}/>
    <div className="topbar-end">
     <LiveClock/>
    </div>
   </header>
   <section className="content">
    {loading?<div className="empty-state">正在读取本地学习数据…</div>:active?<SubjectCatalogProvider studentId={active.id}>
     {page==='dashboard'&&<DashboardPage student={active}/>}
     {page==='plan'&&<SubjectPlanPage studentId={active.id} onOpenWeeklyPlan={()=>setPage('week')}/>}
     {page==='week'&&<WeeklyPlanPage student={active}/>}
     {page==='today'&&<TodayBoardPage studentId={active.id} onOpenWeeklyPlan={()=>setPage('week')}/>}
     {page==='mistakes'&&<MistakesPage studentId={active.id}/>}
     {page==='rewards'&&<RewardsPage studentId={active.id}/>}
     {page==='settings'&&<SettingsPage onCreateStudent={()=>setStudentModal('create')} onEditStudent={()=>setStudentModal('edit')} onSaved={saved} student={active}/>}
    </SubjectCatalogProvider>:<div className="empty-state"><div className="empty-icon"><UserRound size={32}/></div><h2>还没有孩子档案</h2><p>创建后即可为每个孩子独立管理学习计划。</p><button className="primary" onClick={()=>setStudentModal('create')}><CirclePlus size={18}/>创建孩子档案</button></div>}
    {error&&<p className="error">{error}</p>}
   </section>
  </main>
  <nav className="mobile-nav">{nav.map(([id,label,Icon])=><button className={page===id?'active':''} key={id} onClick={()=>setPage(id)}><Icon size={19}/><span>{label}</span></button>)}</nav>
  {studentModal&&<StudentModal student={studentModal==='edit'?active:null} onClose={()=>setStudentModal(null)} onSaved={saved}/>}
 </div>;
}
