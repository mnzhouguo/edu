import { useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays,ChevronLeft,ChevronRight } from 'lucide-react';
import { formatChineseDate,isoDate } from '../dates';

type DateFieldProps={
 ariaLabel:string;
 value:string;
 onChange:(value:string)=>void;
 allowEmpty?:boolean;
 compact?:boolean;
 className?:string;
};

const WEEKDAYS=['一','二','三','四','五','六','日'];

function parseIso(value:string){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(!match)return null;
 return new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12);
}

function monthMatrix(year:number,monthIndex:number){
 const first=new Date(year,monthIndex,1,12);
 const startOffset=(first.getDay()+6)%7;
 const daysInMonth=new Date(year,monthIndex+1,0).getDate();
 const cells:Array<{date:string;day:number;inMonth:boolean}>=[];
 for(let index=0;index<42;index+=1){
  const dayNumber=index-startOffset+1;
  const date=new Date(year,monthIndex,dayNumber,12);
  cells.push({date:isoDate(date),day:date.getDate(),inMonth:dayNumber>=1&&dayNumber<=daysInMonth});
 }
 return cells;
}

export function DateField({ariaLabel,value,onChange,allowEmpty=false,compact=false,className=''}:DateFieldProps){
 const today=isoDate();
 const rootRef=useRef<HTMLDivElement>(null);
 const pickerRef=useRef<HTMLDivElement>(null);
 const[open,setOpen]=useState(false);
 const[coords,setCoords]=useState({top:0,left:0,width:320});
 const selected=value||today;
 const selectedDate=parseIso(selected)??new Date();
 const[viewYear,setViewYear]=useState(selectedDate.getFullYear());
 const[viewMonth,setViewMonth]=useState(selectedDate.getMonth());

 useEffect(()=>{
  if(!open)return;
  const anchor=parseIso(value||today)??new Date();
  setViewYear(anchor.getFullYear());
  setViewMonth(anchor.getMonth());
 },[open,value,today]);

 useLayoutEffect(()=>{
  if(!open||!rootRef.current)return;
  function place(){
   const rect=rootRef.current!.getBoundingClientRect();
   const width=Math.min(320,Math.max(280,rect.width));
   const estimatedHeight=360;
   const gap=8;
   const below=rect.bottom+gap;
   const above=rect.top-estimatedHeight-gap;
   const top=below+estimatedHeight<=window.innerHeight-8?below:Math.max(8,above);
   const left=Math.min(Math.max(8,rect.left),window.innerWidth-width-8);
   setCoords({top,left,width});
  }
  place();
  window.addEventListener('resize',place);
  window.addEventListener('scroll',place,true);
  return ()=>{
   window.removeEventListener('resize',place);
   window.removeEventListener('scroll',place,true);
  };
 },[open]);

 useEffect(()=>{
  if(!open)return;
  function onPointerDown(event:MouseEvent){
   const target=event.target as Node;
   if(rootRef.current?.contains(target)||pickerRef.current?.contains(target))return;
   setOpen(false);
  }
  function onKey(event:KeyboardEvent){
   if(event.key==='Escape')setOpen(false);
  }
  document.addEventListener('mousedown',onPointerDown);
  document.addEventListener('keydown',onKey);
  return ()=>{
   document.removeEventListener('mousedown',onPointerDown);
   document.removeEventListener('keydown',onKey);
  };
 },[open]);

 const cells=useMemo(()=>monthMatrix(viewYear,viewMonth),[viewYear,viewMonth]);
 const yearOptions=useMemo(()=>{
  const base=new Date().getFullYear();
  return Array.from({length:21},(_,index)=>base-10+index);
 },[]);
 const display=value?formatChineseDate(value):'请选择日期';

 function shiftMonth(offset:number){
  const next=new Date(viewYear,viewMonth+offset,1,12);
  setViewYear(next.getFullYear());
  setViewMonth(next.getMonth());
 }

 function pick(date:string){
  onChange(date);
  setOpen(false);
 }

 const picker=open?createPortal(
  <div className="date-picker" ref={pickerRef} role="dialog" aria-label={`${ariaLabel}选择器`} style={{top:coords.top,left:coords.left,width:coords.width}}>
   <div className="date-picker-head">
    <button aria-label="上个月" className="icon-button" onClick={()=>shiftMonth(-1)} type="button"><ChevronLeft size={18}/></button>
    <div className="date-picker-title">
     <label className="date-picker-select">
      <span className="sr-only">年份</span>
      <select aria-label="年份" value={viewYear} onChange={event=>setViewYear(Number(event.target.value))}>
       {yearOptions.map(year=><option key={year} value={year}>{year}年</option>)}
      </select>
     </label>
     <label className="date-picker-select">
      <span className="sr-only">月份</span>
      <select aria-label="月份" value={viewMonth} onChange={event=>setViewMonth(Number(event.target.value))}>
       {Array.from({length:12},(_,index)=><option key={index} value={index}>{index+1}月</option>)}
      </select>
     </label>
    </div>
    <button aria-label="下个月" className="icon-button" onClick={()=>shiftMonth(1)} type="button"><ChevronRight size={18}/></button>
   </div>
   <div className="date-picker-weekdays">{WEEKDAYS.map(day=><span key={day}>{day}</span>)}</div>
   <div className="date-picker-grid">
    {cells.map((cell,index)=><button
     className={[
      'date-picker-day',
      cell.inMonth?'':'muted',
      cell.date===today?'today':'',
      value&&cell.date===value?'selected':'',
      !value&&cell.date===today?'selected':'',
     ].filter(Boolean).join(' ')}
     key={`${cell.date}-${index}`}
     onClick={()=>pick(cell.date)}
     type="button"
    >{cell.day}</button>)}
   </div>
   <div className="date-picker-actions">
    <button className="secondary" onClick={()=>pick(today)} type="button">今天</button>
    {allowEmpty&&<button className="secondary" onClick={()=>{onChange('');setOpen(false)}} type="button">清空</button>}
    <button className="secondary" onClick={()=>{setViewYear(new Date().getFullYear());setViewMonth(new Date().getMonth())}} type="button">回到本月</button>
   </div>
  </div>,
  document.body,
 ):null;

 return <div className={`date-field ${compact?'compact':''} ${open?'open':''} ${value?'has-value':'is-default'} ${className}`.trim()} ref={rootRef}>
  <input aria-label={ariaLabel} className="date-field-native" onChange={event=>onChange(event.target.value)} type="date" value={value||''}/>
  <button aria-expanded={open} aria-haspopup="dialog" className="date-field-trigger" onClick={()=>setOpen(current=>!current)} type="button">
   <CalendarDays size={compact?16:18}/>
   <span>{display}</span>
   {!value&&<em>必选</em>}
  </button>
  {picker}
 </div>;
}
