import { useEffect,useRef,useState } from 'react';
import { Check,ChevronDown } from 'lucide-react';
import type { Student } from '../types';
import { StudentAvatar } from './StudentAvatar';

function studentLabel(student:Student){
 return `${student.name} · ${student.grade||'未填写年级'}`;
}

export function StudentSwitcher({students,activeId,onChange}:{students:Student[];activeId:number|null;onChange:(id:number)=>void}){
 const rootRef=useRef<HTMLDivElement>(null);
 const[open,setOpen]=useState(false);
 const active=students.find(student=>student.id===activeId)??null;
 const label=active?studentLabel(active):'尚未创建';

 useEffect(()=>{
  if(!open)return;
  function onKey(event:KeyboardEvent){if(event.key==='Escape')setOpen(false)}
  function onPointer(event:MouseEvent){
   if(!rootRef.current?.contains(event.target as Node))setOpen(false);
  }
  document.addEventListener('keydown',onKey);
  document.addEventListener('mousedown',onPointer);
  return ()=>{
   document.removeEventListener('keydown',onKey);
   document.removeEventListener('mousedown',onPointer);
  };
 },[open]);

 function choose(id:number){
  onChange(id);
  setOpen(false);
 }

 return <div className={open?'student-switcher open':'student-switcher'} ref={rootRef}>
  <button aria-expanded={open} aria-haspopup="listbox" aria-label="当前孩子" className="student-switcher-trigger" disabled={!students.length} onClick={()=>setOpen(current=>!current)} type="button">
   <StudentAvatar size={32} student={active}/>
   <span>{label}</span>
   <ChevronDown className="chevron" size={16}/>
  </button>
  {open&&<div className="student-menu" role="listbox" aria-label="选择孩子">
   {students.map(student=><button aria-label={studentLabel(student)} aria-selected={student.id===activeId} className={student.id===activeId?'selected':''} key={student.id} onClick={()=>choose(student.id)} role="option" type="button">
    <StudentAvatar size={32} student={student}/>
    <span className="student-menu-copy"><strong>{student.name}</strong><small>{student.grade||'未填写年级'}</small></span>
    {student.id===activeId?<Check size={16}/>:null}
   </button>)}
  </div>}
 </div>;
}
