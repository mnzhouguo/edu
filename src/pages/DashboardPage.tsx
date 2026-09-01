import { useEffect,useId,useRef,useState } from 'react';
import { api } from '../api';
import { isoDate } from '../dates';
import type { Dashboard,Student,TaskCounts } from '../types';

type MonthDay=Dashboard['monthTrend'][number];

function pct(rate:number|null|undefined){
 return rate==null?'—':`${Math.round(rate*100)}%`;
}
function num(value:number){
 return value.toLocaleString('zh-CN');
}
function compare(current:number,previous:number,label:string,unit=''){
 const diff=current-previous;
 const amount=`${num(Math.abs(diff))}${unit}`;
 if(diff===0)return {kind:'flat' as const,text:`与${label}持平`};
 if(diff>0)return {kind:'up' as const,text:`比${label}多 ${amount}`};
 return {kind:'down' as const,text:`比${label}少 ${amount}`};
}
function dayLabel(iso:string){
 const[,month,day]=iso.split('-');
 return `${Number(month)}月${Number(day)}日`;
}
function axisLabel(iso:string){
 return `${Number(iso.slice(8,10))}日`;
}
function monthStats(days:MonthDay[]){
 const planned=days.reduce((sum,day)=>sum+day.total,0);
 const completed=days.reduce((sum,day)=>sum+day.completed,0);
 const earned=days.reduce((sum,day)=>sum+day.earnedPoints,0);
 const rated=days.filter(day=>day.completionRate!=null);
 const averageRate=rated.length?rated.reduce((sum,day)=>sum+(day.completionRate??0),0)/rated.length:null;
 return {planned,completed,earned,averageRate};
}
function monthTitle(days:MonthDay[]){
 if(!days.length)return '本月';
 const start=days[0].date;
 const end=days.at(-1)!.date;
 const month=Number(start.slice(5,7));
 if(start===end)return `${month}月${Number(start.slice(8,10))}日`;
 return `${month}月${Number(start.slice(8,10))}日 — ${Number(end.slice(8,10))}日`;
}
function niceMax(value:number){
 if(value<=0)return 1;
 const exp=10**Math.floor(Math.log10(value));
 const n=value/exp;
 return (n<=1?1:n<=2?2:n<=5?5:10)*exp;
}
function clamp(value:number,min:number,max:number){
 return Math.min(max,Math.max(min,value));
}
function smoothPath(coords:{x:number;y:number}[],minY:number,maxY:number){
 if(!coords.length)return '';
 if(coords.length===1)return `M ${coords[0].x} ${coords[0].y}`;
 return coords.reduce((path,point,index)=>{
  if(index===0)return `M ${point.x} ${point.y}`;
  const prev=coords[index-1];
  const before=coords[Math.max(0,index-2)];
  const next=coords[Math.min(coords.length-1,index+1)];
  const c1x=prev.x+(point.x-before.x)/6;
  const c1y=clamp(prev.y+(point.y-before.y)/6,minY,maxY);
  const c2x=point.x-(next.x-prev.x)/6;
  const c2y=clamp(point.y-(next.y-prev.y)/6,minY,maxY);
  return `${path} C ${c1x} ${c1y} ${c2x} ${c2y} ${point.x} ${point.y}`;
 },'');
}

function TrendChart({days,valueOf,format,max,hint}:{days:MonthDay[];valueOf:(day:MonthDay)=>number;format:(value:number)=>string;max:number;hint:(day:MonthDay)=>string}){
 const[active,setActive]=useState<number|null>(null);
 const[textScale,setTextScale]=useState(1);
 const svgRef=useRef<SVGSVGElement>(null);
 const gradientId=useId().replace(/:/g,'');
 const width=720,height=200,padL=48,padR=18,padT=14,padB=32;
 const innerW=width-padL-padR,innerH=height-padT-padB;
 const peak=niceMax(max);
 const bottom=padT+innerH;
 const color='#1f6f63';
 const coords=days.map((day,index)=>{
  const value=valueOf(day);
  const x=days.length===1?padL+innerW/2:padL+(index/(days.length-1))*innerW;
  const y=padT+innerH-(value/peak)*innerH;
  return {day,value,x,y};
 });
 const line=smoothPath(coords,padT,bottom);
 const area=`${line} L ${padL+innerW} ${bottom} L ${padL} ${bottom} Z`;
 const ticks=[0,0.5,1].map(part=>({value:part*peak,y:padT+innerH-part*innerH}));
 const labels=days.length<=1?[0]:[0,Math.floor((days.length-1)/3),Math.floor((days.length-1)*2/3),days.length-1]
  .filter((index,offset,list)=>list.indexOf(index)===offset);
 const hover=active==null?null:coords[active];
 useEffect(()=>{
  const svg=svgRef.current;
  if(!svg)return;
  const update=()=>{
   const box=svg.getBoundingClientRect();
   const xScale=box.width/width;
   const yScale=box.height/height;
   setTextScale(xScale?yScale/xScale:1);
  };
  update();
  const observer=new ResizeObserver(update);
  observer.observe(svg);
  return ()=>observer.disconnect();
 },[height,width]);
 function textTransform(x:number,y:number){
  return `translate(${x} ${y}) scale(${textScale} 1) translate(${-x} ${-y})`;
 }
 function nearest(clientX:number,target:SVGSVGElement){
  const box=target.getBoundingClientRect();
  const x=((clientX-box.left)/box.width)*width;
  let best=0,distance=Infinity;
  coords.forEach((point,index)=>{
   const next=Math.abs(point.x-x);
   if(next<distance){best=index;distance=next}
  });
  setActive(best);
 }

 return <div className="dash-chart">
   <svg className="dash-line" ref={svgRef} preserveAspectRatio="none" onMouseLeave={()=>setActive(null)} onMouseMove={event=>nearest(event.clientX,event.currentTarget)} viewBox={`0 0 ${width} ${height}`} role="img">
   <defs>
    <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
     <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
     <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
    </linearGradient>
   </defs>
   <rect className="dash-chart-plot" height={innerH} rx="10" width={innerW} x={padL} y={padT}/>
   {ticks.map(tick=><g key={tick.value}>
    <line className="dash-line-grid" x1={padL} x2={padL+innerW} y1={tick.y} y2={tick.y}/>
    <text className="dash-line-axis" transform={textTransform(padL-10,tick.y+4)} x={padL-10} y={tick.y+4} textAnchor="end">{format(tick.value)}</text>
   </g>)}
   <path className="dash-line-area" d={area} fill={`url(#${gradientId})`}/>
   <path className="dash-line-path" d={line} stroke={color}/>
   {hover?<line className="dash-line-guide" x1={hover.x} x2={hover.x} y1={padT} y2={bottom}/>:null}
   {coords.filter(point=>point.value>0).map(point=>
    <circle className={hover?.day.date===point.day.date?'dash-line-dot active':'dash-line-dot'} cx={point.x} cy={point.y} fill={color} key={point.day.date} r={hover?.day.date===point.day.date?5:3.5}>
     <title>{hint(point.day)}</title>
    </circle>
   )}
   {labels.map(index=>{
    const point=coords[index];
    return <text className="dash-line-axis" key={point.day.date} transform={textTransform(point.x,height-10)} textAnchor="middle" x={point.x} y={height-10}>{axisLabel(point.day.date)}</text>;
   })}
  </svg>
  <p className={hover?'dash-chart-hover on':'dash-chart-hover'}>{hover?hint(hover.day):'把鼠标移到曲线上，查看某一天的数据'}</p>
 </div>;
}

function MetricCard({title,value,hint,delta,emphasis}:{title:string;value:string;hint:string;delta:{kind:'up'|'down'|'flat';text:string};emphasis?:boolean}){
 return <article className={emphasis?'emphasis':undefined}>
  <span>{title}</span>
  <strong>{value}</strong>
  <div className="dash-card-meta">
   <small>{hint}</small>
   <em className={`dash-delta ${delta.kind}`}>{delta.text}</em>
  </div>
 </article>;
}

function DualBarChart({
 days,leftOf,rightOf,leftLabel,rightLabel,leftColor,rightColor,format,
}:{
 days:Dashboard['weekTrend'];
 leftOf:(day:Dashboard['weekTrend'][number])=>number;
 rightOf:(day:Dashboard['weekTrend'][number])=>number;
 leftLabel:string;
 rightLabel:string;
 leftColor:string;
 rightColor:string;
 format:(value:number)=>string;
}){
 const[textScale,setTextScale]=useState(1);
 const svgRef=useRef<SVGSVGElement>(null);
 const width=720,height=188,padL=40,padR=16,padT=14,padB=34;
 const innerW=width-padL-padR,innerH=height-padT-padB;
 const peak=niceMax(Math.max(0,...days.flatMap(day=>[leftOf(day),rightOf(day)])));
 const bottom=padT+innerH;
 const groupWidth=innerW/Math.max(days.length,1);
 const barWidth=Math.min(16,groupWidth*0.28);
 const ticks=[0,0.5,1].map(part=>({value:part*peak,y:padT+innerH-part*innerH}));
 useEffect(()=>{
  const svg=svgRef.current;
  if(!svg)return;
  const update=()=>{
   const box=svg.getBoundingClientRect();
   const xScale=box.width/width;
   const yScale=box.height/height;
   setTextScale(xScale?yScale/xScale:1);
  };
  update();
  const observer=new ResizeObserver(update);
  observer.observe(svg);
  return ()=>observer.disconnect();
 },[height,width]);
 function textTransform(x:number,y:number){
  return `translate(${x} ${y}) scale(${textScale} 1) translate(${-x} ${-y})`;
 }
 return <div className="dash-bar-chart">
  <svg className="dash-bars" ref={svgRef} preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} role="img">
   <rect className="dash-chart-plot" height={innerH} rx="10" width={innerW} x={padL} y={padT}/>
   {ticks.map(tick=><g key={tick.value}>
    <line className="dash-line-grid" x1={padL} x2={padL+innerW} y1={tick.y} y2={tick.y}/>
    <text className="dash-line-axis" transform={textTransform(padL-8,tick.y+4)} x={padL-8} y={tick.y+4} textAnchor="end">{format(tick.value)}</text>
   </g>)}
   {days.map((day,index)=>{
    const center=padL+groupWidth*(index+0.5);
    const left=leftOf(day),right=rightOf(day);
    const leftH=peak?(left/peak)*innerH:0;
    const rightH=peak?(right/peak)*innerH:0;
    return <g key={day.date}>
     <rect fill={leftColor} height={Math.max(leftH,left>0?3:0)} rx="3" width={barWidth} x={center-barWidth-2} y={bottom-leftH}>
      <title>{`${day.label} ${leftLabel} ${format(left)}`}</title>
     </rect>
     <rect fill={rightColor} height={Math.max(rightH,right>0?3:0)} rx="3" width={barWidth} x={center+2} y={bottom-rightH}>
      <title>{`${day.label} ${rightLabel} ${format(right)}`}</title>
     </rect>
     <text className="dash-line-axis" transform={textTransform(center,height-10)} textAnchor="middle" x={center} y={height-10}>{day.label.replace('周','')}</text>
    </g>;
   })}
  </svg>
  <div className="dash-bar-legend">
   <span><i style={{background:leftColor}}/>{leftLabel}</span>
   <span><i style={{background:rightColor}}/>{rightLabel}</span>
  </div>
 </div>;
}

function completionHint(current:TaskCounts,previous:TaskCounts,label:string){
 return `完成率 ${pct(current.completionRate)} · ${label} ${previous.completed}/${previous.total}`;
}

export function DashboardPage({student}:{student:Student}){
 const[dashboard,setDashboard]=useState<Dashboard|null>(null),[error,setError]=useState('');
 const requestVersion=useRef(0);
 useEffect(()=>{
  const version=++requestVersion.current;
  setDashboard(null);
  setError('');
  api<{dashboard:Dashboard}>(`/api/students/${student.id}/dashboard?date=${isoDate()}`)
   .then(result=>{if(version===requestVersion.current)setDashboard(result.dashboard)})
   .catch(reason=>{if(version===requestVersion.current)setError(reason.message)});
 },[student.id]);
 const month=dashboard?monthStats(dashboard.monthTrend):null;
 const monthPointMax=dashboard?Math.max(0,...dashboard.monthTrend.map(day=>day.earnedPoints)):0;

 return <div className="dash-page">
  {error&&<p className="error">{error}</p>}
  {!dashboard&&!error?<p className="dash-muted">正在汇总学习数据…</p>:null}
  {dashboard&&<>
   <header className="dash-page-header">
    <h1>数据概览</h1>
   </header>
   {dashboard.empty?<p className="dash-empty-note">还没有可统计的学习数据</p>:null}
   <section className="dash-hero">
    <MetricCard
     title="今日完成"
     value={`${dashboard.today.completed}/${dashboard.today.total}`}
     hint={completionHint(dashboard.today,dashboard.yesterday,'昨天')}
     delta={compare(dashboard.today.completed,dashboard.yesterday.completed,'昨天',' 项')}
    />
    <MetricCard
     title="本周完成"
     value={`${dashboard.week.completed}/${dashboard.week.total}`}
     hint={completionHint(dashboard.week,dashboard.previousWeek,'上周')}
     delta={compare(dashboard.week.completed,dashboard.previousWeek.completed,'上周',' 项')}
    />
    <MetricCard
     title="今日获得"
     value={num(dashboard.today.earnedPoints)}
     hint={`昨天 ${num(dashboard.yesterday.earnedPoints)}`}
     delta={compare(dashboard.today.earnedPoints,dashboard.yesterday.earnedPoints,'昨天')}
    />
    <MetricCard
     title="本周获得"
     value={num(dashboard.week.earnedPoints)}
     hint={`上周 ${num(dashboard.previousWeek.earnedPoints)} · 可兑换 ${num(dashboard.points.balance)}`}
     delta={compare(dashboard.week.earnedPoints,dashboard.previousWeek.earnedPoints,'上周')}
    />
   </section>
   <section className="dash-charts">
    <article className="dash-section panel">
     <div className="panel-head">
      <div className="dash-section-title-row">
       <span className="eyebrow">本周统计</span>
       <h2>任务数量对比</h2>
       <p className="dash-section-lead">本周任务 {dashboard.week.total} 项，已完成 {dashboard.week.completed} 项</p>
      </div>
     </div>
     <DualBarChart
      days={dashboard.weekTrend}
      format={value=>num(Math.round(value))}
      leftColor="#8eaaa5"
      leftLabel="任务数量"
      leftOf={day=>day.total}
      rightColor="#24786d"
      rightLabel="完成数量"
      rightOf={day=>day.completed}
     />
    </article>
    <article className="dash-section panel">
     <div className="panel-head">
      <div className="dash-section-title-row">
       <span className="eyebrow">本周统计</span>
       <h2>积分对比</h2>
       <p className="dash-section-lead">基础 {num(dashboard.week.basePoints)} 分 · 实得 {num(dashboard.week.earnedPoints)} 分</p>
      </div>
     </div>
     <DualBarChart
      days={dashboard.weekTrend}
      format={value=>num(Math.round(value))}
      leftColor="#93a2b1"
      leftLabel="基础积分"
      leftOf={day=>day.basePoints}
      rightColor="#2c8878"
      rightLabel="实际获得"
      rightOf={day=>day.earnedPoints}
     />
    </article>
   </section>
   <section className="dash-charts">
    <article className="dash-section panel">
     <div className="panel-head">
      <div className="dash-section-title-row">
       <span className="eyebrow">本月 · {monthTitle(dashboard.monthTrend)}</span>
       <h2>任务完成率</h2>
       <p className="dash-section-lead">本月完成 {month?.completed??0}/{month?.planned??0}，平均完成率 {pct(month?.averageRate)}</p>
      </div>
     </div>
     <TrendChart
      days={dashboard.monthTrend}
      format={value=>`${Math.round(value)}%`}
      hint={day=>`${dayLabel(day.date)} 完成 ${day.completed}/${day.total}，完成率 ${pct(day.completionRate)}`}
      max={100}
      valueOf={day=>Math.round((day.completionRate??0)*100)}
     />
    </article>
    <article className="dash-section panel">
     <div className="panel-head">
      <div className="dash-section-title-row">
       <span className="eyebrow">本月 · {monthTitle(dashboard.monthTrend)}</span>
       <h2>积分获取</h2>
       <p className="dash-section-lead">本月共获得 {num(month?.earned??0)} 分</p>
      </div>
     </div>
     <TrendChart
      days={dashboard.monthTrend}
      format={value=>num(Math.round(value))}
      hint={day=>`${dayLabel(day.date)} 获得 ${num(day.earnedPoints)} 分`}
      max={monthPointMax}
      valueOf={day=>day.earnedPoints}
     />
    </article>
   </section>
  </>}
 </div>;
}
