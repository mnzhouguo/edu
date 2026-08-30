import { useEffect,useMemo,useState } from 'react';
import { BookOpenCheck,CalendarDays,ChevronDown,CirclePlus,ClipboardCheck,Gift,LayoutDashboard,Pencil,Target,UserRound } from 'lucide-react';
import { api } from './api';
import { StudentModal } from './components/StudentModal';
import { DashboardPage } from './pages/DashboardPage';
import { MistakesPage } from './pages/MistakesPage';
import { RewardsPage } from './pages/RewardsPage';
import { TodayBoardPage } from './pages/TodayBoardPage';
import { WeeklyPlanPage } from './pages/WeeklyPlanPage';
import type { Student } from './types';

type Page='today'|'week'|'mistakes'|'rewards'|'dashboard';
const nav:[Page,string,typeof ClipboardCheck][]=[['today','今日看板',ClipboardCheck],['week','周计划',CalendarDays],['mistakes','错题本',BookOpenCheck],['rewards','积分奖励',Gift],['dashboard','数据概览',LayoutDashboard]];

export function App(){
 const[students,setStudents]=useState<Student[]>([]),[activeId,setActiveId]=useState<number|null>(()=>Number(localStorage.getItem('activeStudentId'))||null),[page,setPage]=useState<Page>('dashboard'),[studentModal,setStudentModal]=useState<'create'|'edit'|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const active=useMemo(()=>students.find(student=>student.id===activeId)??null,[students,activeId]);
 useEffect(()=>{api<{students:Student[]}>('/api/students').then(({students:next})=>{setStudents(next);const stored=Number(localStorage.getItem('activeStudentId'));setActiveId(next.some(student=>student.id===stored)?stored:next[0]?.id??null)}).catch(reason=>setError(reason.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{if(activeId)localStorage.setItem('activeStudentId',String(activeId))},[activeId]);
 function saved(student:Student){setStudents(current=>current.some(item=>item.id===student.id)?current.map(item=>item.id===student.id?student:item):[...current,student]);setActiveId(student.id);setStudentModal(null)}
 return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">成</span><div><strong>成长计划</strong><small>学习进度管理</small></div></div><nav>{nav.map(([id,label,Icon])=><button className={page===id?'nav-item active':'nav-item'} key={id} onClick={()=>setPage(id)}><Icon size={19}/><span>{label}</span></button>)}</nav><div className="sidebar-note"><Target size={18}/><div><strong>本学期目标</strong><p>{active?.currentGoal||'创建档案后填写目标'}</p></div></div></aside><main><header className="topbar"><div><span className="eyebrow">当前孩子</span><div className="student-switcher"><UserRound size={19}/><select aria-label="当前孩子" value={activeId??''} onChange={event=>setActiveId(Number(event.target.value))} disabled={!students.length}>{students.length?students.map(student=><option key={student.id} value={student.id}>{student.name} · {student.grade||'未填写年级'}</option>):<option value="">尚未创建</option>}</select><ChevronDown size={16}/></div></div><div className="actions"><button className="icon-button" onClick={()=>setStudentModal('edit')} disabled={!active} title="编辑当前孩子"><Pencil size={18}/></button><button className="primary" onClick={()=>setStudentModal('create')}><CirclePlus size={18}/>新增孩子</button></div></header><section className="content">{loading?<div className="empty-state">正在读取本地学习数据…</div>:active?<>{page==='dashboard'&&<DashboardPage student={active} onNavigate={setPage}/>}{page==='week'&&<WeeklyPlanPage studentId={active.id}/>}{page==='today'&&<TodayBoardPage studentId={active.id}/>}{page==='mistakes'&&<MistakesPage studentId={active.id}/>}{page==='rewards'&&<RewardsPage studentId={active.id}/>}</>:<div className="empty-state"><div className="empty-icon"><UserRound size={32}/></div><h2>还没有孩子档案</h2><p>创建后即可为每个孩子独立管理学习计划。</p><button className="primary" onClick={()=>setStudentModal('create')}><CirclePlus size={18}/>创建孩子档案</button></div>}{error&&<p className="error">{error}</p>}</section></main><nav className="mobile-nav">{nav.map(([id,label,Icon])=><button className={page===id?'active':''} key={id} onClick={()=>setPage(id)}><Icon size={19}/><span>{label}</span></button>)}</nav>{studentModal&&<StudentModal student={studentModal==='edit'?active:null} onClose={()=>setStudentModal(null)} onSaved={saved}/>}</div>
}
