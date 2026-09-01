import { useEffect,useState } from 'react';

const weekdays=['日','一','二','三','四','五','六'];

function pad(value:number){
 return String(value).padStart(2,'0');
}

function snapshot(now=new Date()){
 return {
  date:`${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`,
  weekday:`星期${weekdays[now.getDay()]}`,
  hours:pad(now.getHours()),
  minutes:pad(now.getMinutes()),
  seconds:pad(now.getSeconds()),
  stamp:now.toISOString(),
 };
}

function RollingDigit({digit}:{digit:string}){
 const[shown,setShown]=useState(digit);
 const[outgoing,setOutgoing]=useState(digit);
 const[rolling,setRolling]=useState(false);

 useEffect(()=>{
  if(digit===shown)return;
  setOutgoing(shown);
  setRolling(true);
  const reduced=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer=window.setTimeout(()=>{
   setShown(digit);
   setRolling(false);
  },reduced?0:460);
  return ()=>window.clearTimeout(timer);
 },[digit,shown]);

 return <span className="live-clock-digit">
  <span className={rolling?'live-clock-reel is-rolling':'live-clock-reel'}>
   <b>{rolling?outgoing:shown}</b>
   <b>{digit}</b>
  </span>
 </span>;
}

function RollingPair({value}:{value:string}){
 return <>
  <RollingDigit digit={value[0]??'0'}/>
  <RollingDigit digit={value[1]??'0'}/>
 </>;
}

export function LiveClock(){
 const[now,setNow]=useState(()=>snapshot());

 useEffect(()=>{
  let interval=0;
  const tick=()=>setNow(snapshot());
  const delay=1000-(Date.now()%1000);
  const starter=window.setTimeout(()=>{
   tick();
   interval=window.setInterval(tick,1000);
  },delay);
  return ()=>{
   window.clearTimeout(starter);
   window.clearInterval(interval);
  };
 },[]);

 const label=`${now.date}${now.weekday} ${now.hours}:${now.minutes}:${now.seconds}`;

 return <time className="live-clock" dateTime={now.stamp} aria-label={label}>
  <span className="live-clock-date">
   <strong>{now.date}</strong>
   <span>{now.weekday}</span>
  </span>
  <span className="live-clock-time" aria-hidden="true">
   <RollingPair value={now.hours}/>
   <i>:</i>
   <RollingPair value={now.minutes}/>
   <i>:</i>
   <span className="live-clock-seconds"><RollingPair value={now.seconds}/></span>
  </span>
 </time>;
}
