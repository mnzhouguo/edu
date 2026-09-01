import { useMemo,useState } from 'react';
import { Ban,CalendarClock,CheckCircle2,CircleDashed,CirclePlus,Columns3,List,Pencil,Trash2,X } from 'lucide-react';
import { api } from '../api';
import { defaultRubric,newRubricId,rescaleRubric,rubricFromLegacy,summarizeRubric,validateRubricAgainstTotal,type EvaluationRubric,type RubricDimension } from '../rubric';
import { dayTaskOverview } from '../day-overview';
import { weeklyExecutionLabel,weeklyExecutionStatuses,type StudentSubject,type Subject,type WeeklyExecutionStatus,type WeeklyTask } from '../types';
import { Drawer } from './Drawer';

type DraftDimension=Omit<RubricDimension,'maxPoints'>&{maxPoints:number|''};
type DraftRubric={dimensions:DraftDimension[]};
type TaskForm={weekday:number;subject:Subject;content:string;completionStandard:string;suggestedDuration:number|'';basePoints:number|'';taskOrder:number|'';evaluationRubric:DraftRubric};
type ScoreDraft={taskId:number;actualDuration:number|'';scores:Record<string,number|''>};

function parseNumberInput(raw:string):number|''{
 if(raw==='')return '';
 const value=Number(raw);
 return Number.isFinite(value)?value:'';
}

function finalizeRubric(rubric:DraftRubric):EvaluationRubric|null{
 if(rubric.dimensions.some(dimension=>dimension.maxPoints===''))return null;
 return {dimensions:rubric.dimensions.map(dimension=>({
  id:dimension.id,
  name:dimension.name,
  weightPercent:dimension.weightPercent,
  maxPoints:dimension.maxPoints as number,
 }))};
}

function StatusIcon({status}:{status:WeeklyExecutionStatus}){
 if(status==='completed')return <CheckCircle2 size={16}/>;
 if(status==='voided')return <Ban size={16}/>;
 if(status==='deferred')return <CalendarClock size={16}/>;
 return <CircleDashed size={16}/>;
}

const emptyForm=(weekday:number,taskOrder:number,subject:Subject='chinese'):TaskForm=>{
 const basePoints=10;
 const evaluationRubric=defaultRubric(basePoints);
 return{weekday,subject,content:'',completionStandard:summarizeRubric(evaluationRubric),suggestedDuration:30,basePoints,taskOrder,evaluationRubric};
};

export function DayTaskWorkspace({
 addAriaLabel,
 days,
 emptyHint,
 lockWeekday=false,
 onReload,
 onSubjectFilterChange,
 setTasks,
 showSubjectFilter=true,
 studentId,
 subjectFilter,
 subjectLabel,
 subjectOptions,
 tasks,
 title,
 weekday,
 weekStart,
}:{
 addAriaLabel:string;
 days:{weekday:number;label:string}[];
 emptyHint?:React.ReactNode;
 lockWeekday?:boolean;
 onReload:()=>Promise<void>;
 onSubjectFilterChange?:(value:Subject|'all')=>void;
 setTasks:React.Dispatch<React.SetStateAction<WeeklyTask[]>>;
 showSubjectFilter?:boolean;
 studentId:number;
 subjectFilter:Subject|'all';
 subjectLabel:(id:Subject)=>string;
 subjectOptions:StudentSubject[];
 tasks:WeeklyTask[];
 title:React.ReactNode;
 weekday:number;
 weekStart:string;
}){
 const[viewMode,setViewMode]=useState<'list'|'board'>('board');
 const[statusFilter,setStatusFilter]=useState<'all'|WeeklyExecutionStatus>('all');
 const[internalSubject,setInternalSubject]=useState<Subject|'all'>('all');
 const[draft,setDraft]=useState<(TaskForm&{id:number})|null>(null);
 const[scoreDraft,setScoreDraft]=useState<ScoreDraft|null>(null);
 const[error,setError]=useState('');
 const[scoreError,setScoreError]=useState('');
 const[message,setMessage]=useState('');
 const[draggedTaskId,setDraggedTaskId]=useState<number|null>(null);
 const[dropTarget,setDropTarget]=useState<WeeklyExecutionStatus|null>(null);
 const activeSubject=onSubjectFilterChange?subjectFilter:internalSubject;
 const setActiveSubject=onSubjectFilterChange??setInternalSubject;
 const allDayTasks=useMemo(()=>tasks.filter(task=>task.weekday===weekday),[tasks,weekday]);
 const filteredBySubject=useMemo(()=>activeSubject==='all'?allDayTasks:allDayTasks.filter(task=>task.subject===activeSubject),[allDayTasks,activeSubject]);
 const dayTasks=useMemo(()=>filteredBySubject.filter(task=>statusFilter==='all'||task.executionStatus===statusFilter),[filteredBySubject,statusFilter]);
 const boardColumns=useMemo(()=>weeklyExecutionStatuses.map(item=>({
  ...item,
  tasks:filteredBySubject.filter(task=>task.executionStatus===item.id),
 })),[filteredBySubject]);
 const overview=useMemo(()=>dayTaskOverview(allDayTasks),[allDayTasks]);
 const scoringTask=scoreDraft?tasks.find(task=>task.id===scoreDraft.taskId)??null:null;
 const scoreMax=scoringTask?(scoringTask.evaluationRubric?.dimensions??[]).reduce((sum,dimension)=>sum+dimension.maxPoints,0):0;
 const scoreTotal=scoringTask&&scoreDraft
  ?(scoringTask.evaluationRubric?.dimensions??[]).reduce((sum,dimension)=>sum+(scoreDraft.scores[dimension.id]===''?0:Number(scoreDraft.scores[dimension.id])),0)
  :0;

 function openCreate(){
  const subject=activeSubject!=='all'?activeSubject:subjectOptions[0]?.id??'chinese';
  setDraft({id:0,...emptyForm(weekday,allDayTasks.length+1,subject)});
  setError('');
 }
 function openEdit(task:WeeklyTask){
  const evaluationRubric=task.evaluationRubric??rubricFromLegacy(task.completionStandard,task.basePoints);
  setDraft({id:task.id,weekday:task.weekday,subject:task.subject,content:task.content,completionStandard:task.completionStandard||summarizeRubric(evaluationRubric),suggestedDuration:task.suggestedDuration,basePoints:task.basePoints,taskOrder:task.taskOrder,evaluationRubric});
  setError('');
 }
 function patchDraft(patch:Partial<TaskForm>){setDraft(current=>current?{...current,...patch}:current)}
 function changeBasePoints(value:number|''){
  if(value===''){patchDraft({basePoints:''});return}
  setDraft(current=>current?{...current,basePoints:value,evaluationRubric:rescaleRubric(current.evaluationRubric as EvaluationRubric,value)}:current);
 }
 function patchRubric(updater:(rubric:DraftRubric)=>DraftRubric){
  setDraft(current=>current?{...current,evaluationRubric:updater(current.evaluationRubric)}:current);
 }
 function patchDimension(dimensionId:string,patch:Partial<DraftDimension>){
  patchRubric(rubric=>({dimensions:rubric.dimensions.map(dimension=>dimension.id===dimensionId?{...dimension,...patch}:dimension)}));
 }
 function addDimension(){
  setDraft(current=>{
   if(!current)return current;
   const total=typeof current.basePoints==='number'?current.basePoints:0;
   const remaining=Math.max(0,total-current.evaluationRubric.dimensions.reduce((sum,dimension)=>sum+(dimension.maxPoints===''?0:dimension.maxPoints),0));
   return {...current,evaluationRubric:{dimensions:[...current.evaluationRubric.dimensions,{id:newRubricId('dim'),name:'新维度',weightPercent:0,maxPoints:remaining}]}};
  });
 }
 function removeDimension(dimensionId:string){
  patchRubric(rubric=>({dimensions:rubric.dimensions.filter(dimension=>dimension.id!==dimensionId)}));
 }
 function openComplete(task:WeeklyTask){
  const rubric=task.evaluationRubric;
  if(!rubric?.dimensions.length){setError('该任务缺少挑战积分，无法打分完成');return}
  setScoreDraft({
   taskId:task.id,
   actualDuration:task.actualDuration??task.suggestedDuration,
   scores:Object.fromEntries(rubric.dimensions.map(dimension=>[dimension.id,task.dimensionScores?.[dimension.id]??''])),
  });
  setScoreError('');
  setError('');
 }
 async function setExecution(taskId:number,status:Exclude<WeeklyExecutionStatus,'completed'>){
  try{
   const result=await api<{task:WeeklyTask}>(`/api/students/${studentId}/weekly-tasks/${taskId}/execution`,{method:'POST',body:JSON.stringify({status})});
   const cleared={...result.task,actualDuration:null,earnedPoints:null,dimensionScores:null,executionStatus:status};
   setTasks(current=>current.map(task=>task.id===cleared.id?cleared:task));
   if(scoreDraft?.taskId===taskId){setScoreDraft(null);setScoreError('')}
   setMessage(status==='voided'?'任务已作废':status==='deferred'?'任务已延期':'任务已恢复为未开始，积分已清空');
   setError('');
   await onReload();
  }catch(reason){setError(reason instanceof Error?reason.message:'更新状态失败')}
 }
 async function moveTaskToStatus(taskId:number,status:WeeklyExecutionStatus){
  const task=tasks.find(item=>item.id===taskId);
  if(!task||task.executionStatus===status)return;
  if(status==='completed'){openComplete(task);return}
  await setExecution(taskId,status);
 }
 async function saveScore(event:React.FormEvent){
  event.preventDefault();
  if(!scoreDraft||!scoringTask)return;
  if(scoreDraft.actualDuration===''||scoreDraft.actualDuration<1){setScoreError('请填写实际完成时长');return}
  const dimensionScores:Record<string,number>={};
  for(const dimension of scoringTask.evaluationRubric?.dimensions??[]){
   const score=scoreDraft.scores[dimension.id];
   if(score===''||score===undefined||score===null){setScoreError(`请填写${dimension.name}得分`);return}
   if(!Number.isInteger(score)||score<0){setScoreError(`${dimension.name}得分须为不小于 0 的整数`);return}
   dimensionScores[dimension.id]=score;
  }
  try{
   const result=await api<{task:WeeklyTask}>(`/api/students/${studentId}/weekly-tasks/${scoreDraft.taskId}/execution`,{method:'POST',body:JSON.stringify({status:'completed',actualDuration:scoreDraft.actualDuration,dimensionScores})});
   setTasks(current=>current.map(task=>task.id===result.task.id?result.task:task));
   setScoreDraft(null);
   setScoreError('');
   setMessage(`任务已完成，实得 ${result.task.earnedPoints??0} 分`);
   setError('');
   await onReload();
  }catch(reason){setScoreError(reason instanceof Error?reason.message:'完成打分失败')}
 }
 async function save(event:React.FormEvent){
  event.preventDefault();
  if(!draft)return;
  if(!draft.content.trim()){setError('请填写学习内容');return}
  if(draft.suggestedDuration===''||draft.suggestedDuration<1){setError('请填写建议时长');return}
  if(draft.basePoints===''){setError('请填写基础积分');return}
  if(draft.evaluationRubric.dimensions.some(dimension=>dimension.maxPoints==='')){setError('请填写维度满分');return}
  const evaluationRubric=finalizeRubric(draft.evaluationRubric);
  if(!evaluationRubric){setError('请配置挑战积分');return}
  const rubricError=validateRubricAgainstTotal(evaluationRubric,draft.basePoints);
  if(rubricError){setError(rubricError);return}
  const completionStandard=summarizeRubric(evaluationRubric);
  const taskOrder=draft.id
   ?(draft.taskOrder===''?1:draft.taskOrder)
   :Math.max(0,...tasks.filter(task=>task.weekday===draft.weekday).map(task=>task.taskOrder))+1;
  const payload={
   weekStart,
   weekday:draft.weekday,
   subject:draft.subject,
   content:draft.content.trim(),
   completionStandard,
   suggestedDuration:draft.suggestedDuration,
   basePoints:draft.basePoints,
   taskOrder,
   evaluationRubric,
  };
  try{
   await api(draft.id?`/api/students/${studentId}/weekly-tasks/${draft.id}`:`/api/students/${studentId}/weekly-tasks`,{method:draft.id?'PUT':'POST',body:JSON.stringify(payload)});
   setDraft(null);
   setMessage(draft.id?'任务已更新':'任务已添加');
   setError('');
   await onReload();
  }catch(reason){setError(reason instanceof Error?reason.message:'保存失败')}
 }
 async function remove(id=draft?.id){
  if(!id)return;
  const target=tasks.find(task=>task.id===id);
  if(target?.executionStatus==='completed'){setError('已完成的任务不能删除');return}
  try{
   await api(`/api/students/${studentId}/weekly-tasks/${id}`,{method:'DELETE'});
   if(draft?.id===id)setDraft(null);
   setMessage('任务已删除');
   await onReload();
  }catch(reason){setError(reason instanceof Error?reason.message:'删除失败')}
 }

 return <>
  {error&&<p className="error">{error}</p>}
  {message&&<p className="success-message">{message}</p>}
  <section className="panel compact-panel week-day-panel">
   <div className="panel-head week-day-overview-head">
    {title}
    <div className="view-mode-switch" role="tablist" aria-label="展示方式">
     <button aria-selected={viewMode==='list'} className={viewMode==='list'?'active':''} onClick={()=>setViewMode('list')} role="tab" title="列表展示" type="button"><List size={16}/><span>列表</span></button>
     <button aria-selected={viewMode==='board'} className={viewMode==='board'?'active':''} onClick={()=>setViewMode('board')} role="tab" title="卡片看板" type="button"><Columns3 size={16}/><span>卡片</span></button>
    </div>
    <div className="week-overview" aria-label="当日总览">
     <div className="week-overview-metric"><span>任务总数</span><strong>{overview.total}</strong></div>
     <div className="week-overview-metric"><span>已完成</span><strong>{overview.completed}</strong></div>
     <div className="week-overview-metric"><span>可获积分</span><strong>{overview.availablePoints}</strong></div>
     <div className="week-overview-metric highlight"><span>已获积分</span><strong>{overview.earnedPoints}</strong></div>
    </div>
    <button aria-label={addAriaLabel} className="icon-button" onClick={openCreate} title={addAriaLabel} type="button"><CirclePlus size={17}/></button>
   </div>
   <div className="week-task-filters" aria-label="任务筛选">
    {viewMode==='list'&&<div className="week-filter-row" role="tablist" aria-label="按状态筛选">
     <span>状态</span>
     <button className={statusFilter==='all'?'active':''} onClick={()=>setStatusFilter('all')} role="tab" type="button">全部</button>
     {weeklyExecutionStatuses.map(item=><button className={statusFilter===item.id?'active':''} key={item.id} onClick={()=>setStatusFilter(item.id)} role="tab" type="button">{item.label}</button>)}
    </div>}
    {showSubjectFilter&&<div className="week-filter-row" role="tablist" aria-label="按科目筛选">
     <span>科目</span>
     <button className={activeSubject==='all'?'active':''} onClick={()=>setActiveSubject('all')} role="tab" type="button">全部</button>
     {subjectOptions.map(item=><button className={activeSubject===item.id?'active':''} key={item.id} onClick={()=>setActiveSubject(item.id)} role="tab" type="button">{item.label}</button>)}
    </div>}
   </div>
   {viewMode==='list'?(dayTasks.length?<div className="table-wrap"><table className="editor-table week-day-table display-table execution-table"><thead><tr><th>状态</th><th>科目</th><th>学习内容</th><th>计划时长</th><th>实际时长</th><th>基础积分</th><th>实得积分</th><th aria-label="操作"></th></tr></thead><tbody>
    {dayTasks.map(task=><tr className={`interactive-row status-${task.executionStatus}`} key={task.id} onDoubleClick={event=>{if((event.target as HTMLElement).closest('button'))return;openEdit(task)}} title="双击编辑内容">
     <td><span className={`execution-status ${task.executionStatus}`}><StatusIcon status={task.executionStatus}/>{weeklyExecutionLabel(task.executionStatus)}</span></td>
     <td><span className={`subject-pill subject-${task.subject}`}>{subjectLabel(task.subject)}</span></td>
     <td><strong>{task.content}</strong></td>
     <td>{task.suggestedDuration} 分钟</td>
     <td>{task.actualDuration==null?'—':`${task.actualDuration} 分钟`}</td>
     <td>{task.basePoints}</td>
     <td>{task.earnedPoints==null?'—':task.earnedPoints}</td>
     <td><div className="row-actions">
      <div className="status-actions">
       {task.executionStatus==='not_started'&&<>
        <button aria-label={`完成${task.content}`} className="icon-button" onClick={()=>openComplete(task)} title="完成并打分" type="button"><CheckCircle2 size={16}/></button>
        <button aria-label={`延期${task.content}`} className="icon-button" onClick={()=>void setExecution(task.id,'deferred')} title="延期" type="button"><CalendarClock size={16}/></button>
        <button aria-label={`作废${task.content}`} className="icon-button danger" onClick={()=>void setExecution(task.id,'voided')} title="作废" type="button"><Ban size={16}/></button>
       </>}
       {task.executionStatus==='deferred'&&<>
        <button aria-label={`完成${task.content}`} className="icon-button" onClick={()=>openComplete(task)} title="完成并打分" type="button"><CheckCircle2 size={16}/></button>
        <button aria-label={`作废${task.content}`} className="icon-button danger" onClick={()=>void setExecution(task.id,'voided')} title="作废" type="button"><Ban size={16}/></button>
        <button aria-label={`重置${task.content}`} className="icon-button" onClick={()=>void setExecution(task.id,'not_started')} title="恢复未开始" type="button"><CircleDashed size={16}/></button>
       </>}
       {(task.executionStatus==='completed'||task.executionStatus==='voided')&&<>
        <button aria-label={`重置${task.content}`} className="icon-button" onClick={()=>void setExecution(task.id,'not_started')} title="恢复未开始" type="button"><CircleDashed size={16}/></button>
       </>}
      </div>
      <div className="hover-actions">
       <button aria-label={`编辑${task.content}`} className="icon-button" onClick={()=>openEdit(task)} title="编辑任务" type="button"><Pencil size={16}/></button>
       {task.executionStatus!=='completed'&&<button aria-label={`删除${task.content}`} className="icon-button danger" onClick={()=>void remove(task.id)} title="删除任务" type="button"><Trash2 size={16}/></button>}
      </div>
     </div></td>
    </tr>)}
   </tbody></table></div>:<div className="week-day-empty">{allDayTasks.length?'没有符合筛选条件的任务。':(emptyHint??'这一天还没有任务，点击右上角添加。')}</div>)
    :(<div className="status-board" role="region" aria-label="状态看板">
     {boardColumns.map(column=><section
      className={`status-board-column status-${column.id}${dropTarget===column.id?' drop-active':''}`}
      key={column.id}
      onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDropTarget(current=>current===column.id?null:current)}}
      onDragOver={event=>{event.preventDefault();setDropTarget(column.id)}}
      onDrop={event=>{
       event.preventDefault();
       const taskId=Number(event.dataTransfer.getData('text/task-id')||draggedTaskId||'');
       setDraggedTaskId(null);
       setDropTarget(null);
       if(Number.isInteger(taskId)&&taskId>0)void moveTaskToStatus(taskId,column.id);
      }}
     >
      <header><span className={`execution-status ${column.id}`}><StatusIcon status={column.id}/>{column.label}</span><em>{column.tasks.length}</em></header>
      <div className="status-board-list">
       {column.tasks.length?column.tasks.map(task=><article
        className={`status-task-card${draggedTaskId===task.id?' dragging':''}`}
        draggable
        key={task.id}
        onDoubleClick={event=>{if((event.target as HTMLElement).closest('button'))return;openEdit(task)}}
        onDragEnd={()=>{setDraggedTaskId(null);setDropTarget(null)}}
        onDragStart={event=>{
         setDraggedTaskId(task.id);
         event.dataTransfer.setData('text/task-id',String(task.id));
         event.dataTransfer.effectAllowed='move';
        }}
        title="拖到其他状态栏，或双击编辑"
       >
        <div className="status-task-top">
         <span className={`subject-pill subject-${task.subject}`}>{subjectLabel(task.subject)}</span>
         <div className="status-task-actions">
          <button aria-label={`编辑${task.content}`} className="icon-button" onClick={()=>openEdit(task)} title="编辑" type="button"><Pencil size={14}/></button>
          {task.executionStatus!=='completed'&&<button aria-label={`删除${task.content}`} className="icon-button danger" onClick={()=>void remove(task.id)} title="删除" type="button"><Trash2 size={14}/></button>}
         </div>
        </div>
        <strong>{task.content}</strong>
        <div className="status-task-meta">
         <span>{task.suggestedDuration} 分钟</span>
         <span>{task.earnedPoints==null?`${task.basePoints} 分`:`实得 ${task.earnedPoints}`}</span>
        </div>
       </article>):<div className="status-board-empty">拖到这里</div>}
      </div>
     </section>)}
    </div>)}
  </section>

  {scoreDraft&&scoringTask&&<Drawer onClose={()=>{setScoreDraft(null);setScoreError('')}}>
   <form className="side-drawer week-task-drawer" onSubmit={saveScore}>
    <div className="drawer-head"><div><span className="eyebrow">Complete Task</span><h2>完成并打分</h2></div><button className="icon-button" onClick={()=>{setScoreDraft(null);setScoreError('')}} title="关闭" type="button"><X size={20}/></button></div>
    <div className="drawer-body">
     <p className="drawer-help">{scoringTask.content} · 标准总分 {scoringTask.basePoints}（可超标准）</p>
     <label>实际完成时长（分钟）<input aria-label="实际完成时长" autoFocus min="1" type="number" value={scoreDraft.actualDuration} onChange={event=>setScoreDraft({...scoreDraft,actualDuration:parseNumberInput(event.target.value)})}/></label>
     <section className="rubric-editor" aria-label="挑战积分打分">
      <div className="rubric-editor-head">
       <strong>按维度打分</strong>
       <span className="rubric-budget exact">合计 <strong>{scoreTotal}</strong> / 标准 {scoreMax}</span>
      </div>
      <div className="rubric-simple-list">
       <div className="rubric-simple-head"><span>维度</span><span>标准</span><span>得分</span></div>
       {scoringTask.evaluationRubric?.dimensions.map(dimension=><div className="rubric-simple-row score-row" key={dimension.id}>
        <span>{dimension.name}</span>
        <span className="muted-cell">{dimension.maxPoints}</span>
        <input aria-label={`${dimension.name}得分`} min="0" type="number" value={scoreDraft.scores[dimension.id]??''} onChange={event=>setScoreDraft({...scoreDraft,scores:{...scoreDraft.scores,[dimension.id]:parseNumberInput(event.target.value)}})}/>
       </div>)}
      </div>
     </section>
    </div>
    {scoreError&&<p className="form-error" style={{margin:'0 20px'}}>{scoreError}</p>}
    <div className="drawer-actions">
     <button className="secondary" onClick={()=>{setScoreDraft(null);setScoreError('')}} type="button">取消</button>
     <button className="primary" type="submit">确认完成</button>
    </div>
   </form>
  </Drawer>}

  {draft&&(()=>{
   const allocated=draft.evaluationRubric.dimensions.reduce((sum,dimension)=>sum+(dimension.maxPoints===''?0:dimension.maxPoints),0);
   const totalPoints=draft.basePoints===''?0:draft.basePoints;
   const remaining=totalPoints-allocated;
   const rubricError=draft.basePoints===''||draft.evaluationRubric.dimensions.some(dimension=>dimension.maxPoints==='')?null:validateRubricAgainstTotal(finalizeRubric(draft.evaluationRubric)!,draft.basePoints);
   return <Drawer onClose={()=>setDraft(null)}>
   <form className="side-drawer week-task-drawer rubric-drawer" onSubmit={save}>
    <div className="drawer-head"><div><span className="eyebrow">Study Task</span><h2>{draft.id?'编辑学习任务':'新增学习任务'}</h2></div><button className="icon-button" onClick={()=>setDraft(null)} title="关闭" type="button"><X size={20}/></button></div>
    <div className="drawer-body">
     <div className="form-row">
      {lockWeekday
       ?<label>星期<span className="readonly-field" aria-label="星期">{days.find(day=>day.weekday===draft.weekday)?.label??''}</span></label>
       :<label>星期<select aria-label="星期" value={draft.weekday} onChange={event=>patchDraft({weekday:Number(event.target.value)})}>{days.map(day=><option key={day.weekday} value={day.weekday}>{day.label}</option>)}</select></label>}
      {draft.id
       ?<label>科目<span className="readonly-field" aria-label="科目">{subjectLabel(draft.subject)}</span></label>
       :<label>科目<select aria-label="科目" value={draft.subject} onChange={event=>{const subject=event.target.value as Subject;const evaluationRubric=defaultRubric(draft.basePoints===''?10:draft.basePoints);patchDraft({subject,evaluationRubric,completionStandard:summarizeRubric(evaluationRubric)})}}>{subjectOptions.map(subject=><option key={subject.id} value={subject.id}>{subject.label}</option>)}</select></label>}
     </div>
     <label>学习内容<input aria-label="学习内容" autoFocus required placeholder="例如：复习当天数学错题并订正" value={draft.content} onChange={event=>patchDraft({content:event.target.value})}/></label>
     <div className="form-row">
      <label>建议时长（分钟）<input aria-label="建议时长" min="1" type="number" value={draft.suggestedDuration} onChange={event=>patchDraft({suggestedDuration:parseNumberInput(event.target.value)})}/></label>
      <label>基础积分<input aria-label="基础积分" min="0" type="number" value={draft.basePoints} onChange={event=>changeBasePoints(parseNumberInput(event.target.value))}/></label>
     </div>
     <section className="rubric-editor" aria-label="挑战积分">
      <div className="rubric-editor-head">
       <strong>挑战积分</strong>
       <div className="rubric-editor-tools">
        <span className={`rubric-budget ${remaining<0?'over':remaining===0&&draft.basePoints!==''?'exact':'under'}`}>{allocated}/{draft.basePoints===''?'—':draft.basePoints}分{draft.basePoints!==''&&remaining>0?` · 剩${remaining}`:remaining<0?` · 超${-remaining}`:''}</span>
        <button aria-label="添加维度" className="icon-button" onClick={addDimension} title="添加维度" type="button"><CirclePlus size={16}/></button>
       </div>
      </div>
      <div className="rubric-simple-list">
       <div className="rubric-simple-head"><span>维度</span><span>满分</span><span/></div>
       {draft.evaluationRubric.dimensions.map(dimension=><div className="rubric-simple-row" key={dimension.id}>
        <input aria-label={`${dimension.name||'维度'}名称`} value={dimension.name} onChange={event=>patchDimension(dimension.id,{name:event.target.value})}/>
        <input aria-label={`${dimension.name||'维度'}满分`} min="0" type="number" value={dimension.maxPoints} onChange={event=>patchDimension(dimension.id,{maxPoints:parseNumberInput(event.target.value)})}/>
        <button aria-label={`删除维度${dimension.name}`} className="icon-button danger" onClick={()=>removeDimension(dimension.id)} title="删除维度" type="button"><Trash2 size={16}/></button>
       </div>)}
      </div>
      {rubricError&&<p className="form-error">{rubricError}</p>}
     </section>
    </div>
    <div className="drawer-actions split-actions">
     {draft.id&&tasks.find(task=>task.id===draft.id)?.executionStatus!=='completed'?<button className="text-danger" onClick={()=>void remove()} type="button"><Trash2 size={16}/>删除任务</button>:<span/>}
     <div><button className="secondary" onClick={()=>setDraft(null)} type="button">取消</button><button className="primary" type="submit">保存任务</button></div>
    </div>
   </form>
  </Drawer>;
  })()}
 </>;
}
