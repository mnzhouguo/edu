import { useEffect,useMemo,useRef,useState } from 'react';
import { CalendarDays,CirclePlus,Pencil,Trash2,X } from 'lucide-react';
import { api } from '../api';
import { DateField } from '../components/DateField';
import { Drawer } from '../components/Drawer';
import { defaultPlanningWeek,formatChineseDate } from '../dates';
import { defaultRubric,newRubricId,rescaleRubric,rubricFromLegacy,summarizeRubric,validateRubricAgainstTotal,type EvaluationRubric,type RubricDimension } from '../rubric';
import { useSubjectCatalog } from '../subject-catalog';
import { type PlanCadence,type StudyMaterial,type Subject,type SubjectPlan,type SubjectPlanItem } from '../types';

const cadences:{id:PlanCadence;label:string;defaultDays:number[]}[]=[
 {id:'daily',label:'每天',defaultDays:[]},
 {id:'weekdays',label:'工作日',defaultDays:[]},
 {id:'every_2_days',label:'每两天',defaultDays:[]},
 {id:'weekly',label:'每周一次',defaultDays:[6]},
 {id:'custom_weekly',label:'自定义每周',defaultDays:[1,3,5]},
];
const weekdays=[{id:1,label:'一'},{id:2,label:'二'},{id:3,label:'三'},{id:4,label:'四'},{id:5,label:'五'},{id:6,label:'六'},{id:7,label:'日'}];
type DraftDimension=Omit<RubricDimension,'maxPoints'>&{maxPoints:number|''};
type DraftRubric={dimensions:DraftDimension[]};
type ItemDraft=Omit<SubjectPlanItem,'studentId'|'subject'|'materialName'|'evaluationRubric'|'completionStandard'|'suggestedDuration'|'basePoints'>&{
 suggestedDuration:number|'';
 basePoints:number|'';
 evaluationRubric:DraftRubric;
};
type PlanTab='items'|'materials';
type MaterialDraft=StudyMaterial;

function parseNumberInput(raw:string):number|''{
 if(raw==='')return '';
 const value=Number(raw);
 return Number.isFinite(value)?value:'';
}

function GoalMark(){
 return <span className="subject-goal-icon" aria-hidden="true">
  <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
   <circle cx="11" cy="15" r="6.6" stroke="currentColor" strokeWidth="1.7"/>
   <circle cx="11" cy="15" r="3.3" stroke="currentColor" strokeWidth="1.7"/>
   <circle cx="11" cy="15" fill="currentColor" r="1.15"/>
   <path d="M11 8.4V2.6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7"/>
   <path d="M11 2.5h7.1L16.4 5.15 18.1 7.8H11Z" fill="currentColor"/>
  </svg>
 </span>;
}

function RubricPreview({rubric}:{rubric:EvaluationRubric}){
 return <div className="rubric-preview">{rubric.dimensions.map(dimension=><div className="rubric-dimension-chip" key={dimension.id}><strong>{dimension.name}</strong><em>{dimension.maxPoints}分</em></div>)}</div>;
}

export function SubjectPlanPage({studentId,onOpenWeeklyPlan}:{studentId:number;onOpenWeeklyPlan?:()=>void}){
 const{subjects:subjectOptions,label:subjectName}=useSubjectCatalog();
 const planSubjects=useMemo(()=>subjectOptions.filter(item=>!item.custom),[subjectOptions]);
 const[subject,setSubject]=useState<Subject>('chinese');
 const[plan,setPlan]=useState<SubjectPlan|null>(null);
 const[items,setItems]=useState<SubjectPlanItem[]>([]);
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[materialDraft,setMaterialDraft]=useState<MaterialDraft|null>(null);
 const[goalDrawer,setGoalDrawer]=useState(false);
 const[itemDraft,setItemDraft]=useState<ItemDraft|null>(null);
 const[planTab,setPlanTab]=useState<PlanTab>('items');
 const requestVersion=useRef(0);
 const currentSubjectLabel=subjectName(subject);
 const materials=useMemo(()=>plan?.areas.flatMap(area=>area.materials.map(item=>({...item,areaLabel:area.label})))??[],[plan]);

 async function load(){
  const version=++requestVersion.current;
  try{
   const[planResult,itemResult]=await Promise.all([
    api<{plan:SubjectPlan}>(`/api/students/${studentId}/subject-plans/${subject}`),
    api<{items:SubjectPlanItem[]}>(`/api/students/${studentId}/subject-plans/${subject}/items`),
   ]);
   if(version!==requestVersion.current)return;
   setPlan(planResult.plan);
   setItems(itemResult.items);
   setError('');
  }catch(reason){setError(reason instanceof Error?reason.message:'读取失败')}
 }

 useEffect(()=>{
  if(!planSubjects.length)return;
  setSubject(current=>planSubjects.some(item=>item.id===current)?current:planSubjects[0].id);
 },[studentId,planSubjects]);
 useEffect(()=>{setPlan(null);setItems([]);setItemDraft(null);setMaterialDraft(null);setPlanTab('items');void load()},[studentId,subject]);

 function openNewItem(){
  const basePoints=10;
  setItemDraft({id:0,name:'',cadence:'daily',weekdays:[],materialId:null,suggestedDuration:20,evaluationRubric:defaultRubric(basePoints),basePoints,active:true,sortOrder:Math.max(0,...items.map(item=>item.sortOrder))+1});
 }
 function openEditItem(item:SubjectPlanItem){
  setItemDraft({id:item.id,name:item.name,cadence:item.cadence,weekdays:item.weekdays,materialId:item.materialId,suggestedDuration:item.suggestedDuration,evaluationRubric:item.evaluationRubric??rubricFromLegacy(item.completionStandard,item.basePoints),basePoints:item.basePoints,active:item.active,sortOrder:item.sortOrder});
 }
 function patchDraft(patch:Partial<ItemDraft>){setItemDraft(current=>current?{...current,...patch}:current)}
 function changeCadence(cadence:PlanCadence){patchDraft({cadence,weekdays:cadences.find(option=>option.id===cadence)?.defaultDays??[]})}
 function toggleWeekday(day:number){
  if(!itemDraft)return;
  const multiple=itemDraft.cadence==='custom_weekly';
  const selected=multiple?(itemDraft.weekdays.includes(day)?itemDraft.weekdays.filter(value=>value!==day):[...itemDraft.weekdays,day].sort()):[day];
  patchDraft({weekdays:selected});
 }
 function changeTotalPoints(raw:string){
  const basePoints=parseNumberInput(raw);
  if(basePoints===''){patchDraft({basePoints:''});return}
  setItemDraft(current=>current?{...current,basePoints,evaluationRubric:rescaleRubric(current.evaluationRubric as EvaluationRubric,basePoints)}:current);
 }
 function patchRubric(updater:(rubric:DraftRubric)=>DraftRubric){
  setItemDraft(current=>current?{...current,evaluationRubric:updater(current.evaluationRubric)}:current);
 }
 function patchDimension(dimensionId:string,patch:Partial<DraftDimension>){
  patchRubric(rubric=>({dimensions:rubric.dimensions.map(dimension=>dimension.id===dimensionId?{...dimension,...patch}:dimension)}));
 }
 function addDimension(){
  patchRubric(rubric=>{
   const total=typeof itemDraft!.basePoints==='number'?itemDraft!.basePoints:0;
   const remaining=Math.max(0,total-rubric.dimensions.reduce((sum,dimension)=>sum+(dimension.maxPoints===''?0:dimension.maxPoints),0));
   return {dimensions:[...rubric.dimensions,{id:newRubricId('dim'),name:'新维度',weightPercent:0,maxPoints:remaining}]};
  });
 }
 function removeDimension(dimensionId:string){
  patchRubric(rubric=>({dimensions:rubric.dimensions.filter(dimension=>dimension.id!==dimensionId)}));
 }
 async function saveItem(event:React.FormEvent){
  event.preventDefault();
  if(!itemDraft||!itemDraft.name.trim()){setError('请填写事项名称');return}
  if(itemDraft.suggestedDuration===''||itemDraft.suggestedDuration<1){setError('请填写每次时长');return}
  if(itemDraft.basePoints===''){setError('请填写总分');return}
  if(itemDraft.evaluationRubric.dimensions.some(dimension=>dimension.maxPoints==='')){setError('请填写维度满分');return}
  const evaluationRubric:EvaluationRubric={dimensions:itemDraft.evaluationRubric.dimensions.map(dimension=>({
   id:dimension.id,
   name:dimension.name,
   weightPercent:dimension.weightPercent,
   maxPoints:dimension.maxPoints as number,
  }))};
  const rubricError=validateRubricAgainstTotal(evaluationRubric,itemDraft.basePoints);
  if(rubricError){setError(rubricError);return}
  const payload={...itemDraft,suggestedDuration:itemDraft.suggestedDuration,basePoints:itemDraft.basePoints,completionStandard:summarizeRubric(evaluationRubric),evaluationRubric};
  try{
   const result=await api<{item:SubjectPlanItem}>(itemDraft.id?`/api/students/${studentId}/subject-plans/items/${itemDraft.id}`:`/api/students/${studentId}/subject-plans/${subject}/items`,{method:itemDraft.id?'PUT':'POST',body:JSON.stringify(payload)});
   setItems(current=>itemDraft.id?current.map(item=>item.id===result.item.id?result.item:item):[...current,result.item].sort((a,b)=>a.sortOrder-b.sortOrder));
   setItemDraft(null);
   setMessage('规划事项已保存');
   setError('');
  }catch(reason){setError(reason instanceof Error?reason.message:'规划事项保存失败')}
 }
 async function removeItem(id=itemDraft?.id){
  if(!id)return;
  try{
   await api(`/api/students/${studentId}/subject-plans/items/${id}`,{method:'DELETE'});
   setItems(current=>current.filter(item=>item.id!==id));
   if(itemDraft?.id===id)setItemDraft(null);
   setMessage('规划事项已删除');
  }catch(reason){setError(reason instanceof Error?reason.message:'规划事项删除失败')}
 }
 function openNewMaterial(){setMaterialDraft({id:0,name:'',areaId:plan?.areas[0]?.id??'general',type:'other',note:''})}
 function openEditMaterial(material:StudyMaterial){setMaterialDraft({...material})}
 function patchMaterial(patch:Partial<MaterialDraft>){setMaterialDraft(current=>current?{...current,...patch}:current)}
 async function saveMaterial(event:React.FormEvent){
  event.preventDefault();
  if(!materialDraft?.name.trim()||!plan)return;
  const areaId=materialDraft.areaId||plan.areas[0]?.id||'general';
  try{
   if(materialDraft.id){
    await api(`/api/students/${studentId}/subject-plans/materials/${materialDraft.id}`,{method:'PUT',body:JSON.stringify({name:materialDraft.name.trim(),type:materialDraft.type||'other',note:materialDraft.note.trim(),areaId})});
   }else{
    await api(`/api/students/${studentId}/subject-plans/${subject}/areas/${areaId}/materials`,{method:'POST',body:JSON.stringify({name:materialDraft.name.trim(),type:'other',note:materialDraft.note.trim()})});
   }
   setMaterialDraft(null);
   setMessage(materialDraft.id?'辅导资料已更新':'辅导资料已添加');
   await load();
  }catch(reason){setError(reason instanceof Error?reason.message:'辅导资料保存失败')}
 }
 async function removeMaterial(id=materialDraft?.id){
  if(!id)return;
  try{await api(`/api/students/${studentId}/subject-plans/materials/${id}`,{method:'DELETE'});if(materialDraft?.id===id)setMaterialDraft(null);setMessage('辅导资料已删除');await load()}
  catch(reason){setError(reason instanceof Error?reason.message:'删除辅导资料失败')}
 }
 async function generateWeeklyPlan(){
  try{
   const result=await api<{tasks:unknown[]}>(`/api/students/${studentId}/subject-plans/generate`,{method:'POST',body:JSON.stringify({weekStart:defaultPlanningWeek(),replace:true})});
   setMessage(`周计划已生成，共 ${result.tasks.length} 项任务`);
   setError('');
   onOpenWeeklyPlan?.();
  }catch(reason){setError(reason instanceof Error?reason.message:'生成周计划失败')}
 }
 async function saveGoal(event?:React.FormEvent){
  event?.preventDefault();
  if(!plan)return;
  const narrative=plan.goal.narrative.trim()||`${currentSubjectLabel}长期学习规划`;
  try{
   const result=await api<{plan:SubjectPlan}>(`/api/students/${studentId}/subject-plans/${subject}`,{method:'PUT',body:JSON.stringify({goal:{...plan.goal,narrative},areas:plan.areas.map(area=>({id:area.id,enabled:area.enabled,sortOrder:area.sortOrder,sessionsPerWeek:area.sessionsPerWeek,suggestedDuration:area.suggestedDuration}))})});
   setPlan(result.plan);setGoalDrawer(false);setMessage('目标已保存');setError('');
  }catch(reason){setError(reason instanceof Error?reason.message:'目标保存失败')}
 }
 function cadenceText(item:SubjectPlanItem){return cadences.find(option=>option.id===item.cadence)?.label??item.cadence}
 function scheduleText(item:SubjectPlanItem){
  const label=cadenceText(item);
  if(item.cadence==='daily'||item.cadence==='every_2_days')return label;
  if(item.cadence==='weekdays')return `${label} · 周一至周五`;
  const days=item.weekdays.map(day=>`周${weekdays.find(option=>option.id===day)?.label}`).join('、');
  if(item.cadence==='custom_weekly')return days||label;
  return days?`${label} · ${days}`:label;
 }

 return <>
  <div className="subject-plan-page">
   <aside className="subject-rail"><div className="subject-rail-title">科目</div><div className="subject-rail-list" role="tablist">{planSubjects.map(item=><button className={subject===item.id?'active':''} key={item.id} onClick={()=>setSubject(item.id)} role="tab"><span>{item.label}</span></button>)}</div></aside>
   <div className="subject-plan-body">
    <div className="subject-plan-title-row">
     <h1 className="subject-plan-title">{currentSubjectLabel}长期学习事项</h1>
     <button aria-label="生成周计划" className="secondary generate-week-button" onClick={()=>void generateWeeklyPlan()} type="button"><CalendarDays size={16}/>生成周计划</button>
    </div>
    {error&&<p className="error">{error}</p>}{message&&<p className="success-message">{message}</p>}
    {!plan?<div className="empty-state">{error||'正在读取科目规划…'}</div>:<>
    <section className="panel subject-goal-summary" onClick={()=>setGoalDrawer(true)} title="编辑目标">
     <div className="subject-goal-copy"><GoalMark/><div><span className="subject-goal-label">科目总目标</span><h2 className={plan.goal.narrative?'':'is-empty'}>{plan.goal.narrative||'暂未设置科目总目标'}</h2></div></div>
     <div className="goal-summary-meta">
      <div className="goal-metric"><span>当前分</span><strong>{plan.goal.currentScore??'—'}</strong></div>
      <div className="goal-metric highlight"><span>目标分</span><strong>{plan.goal.targetScore??'—'}</strong></div>
      <div className="goal-metric"><span>目标日期</span><strong>{plan.goal.targetDate?formatChineseDate(plan.goal.targetDate):'—'}</strong></div>
     </div>
     <button aria-label="编辑目标" className="icon-button" onClick={event=>{event.stopPropagation();setGoalDrawer(true)}} title="编辑目标" type="button"><Pencil size={16}/></button>
    </section>

    <section className="panel compact-panel plan-section plan-items-panel">
     <div className="plan-section-toolbar">
      <div className="subject-tabs" role="tablist" aria-label="规划内容">
       <button aria-selected={planTab==='items'} className={planTab==='items'?'active':''} onClick={()=>setPlanTab('items')} role="tab" type="button">规划事项<span className="plan-tab-count">{items.length}</span></button>
       <button aria-selected={planTab==='materials'} className={planTab==='materials'?'active':''} onClick={()=>setPlanTab('materials')} role="tab" type="button">辅导资料<span className="plan-tab-count">{materials.length}</span></button>
      </div>
      <div className="panel-head-actions">
       <span className="panel-hint">{planTab==='items'?'例如：学校作业、一本阅读、必读书目、文言文阅读':'事项可以选择一份资料，也可以不指定'}</span>
       {planTab==='items'
        ?<button aria-label="新增事项" className="icon-button" onClick={openNewItem} title="新增事项" type="button"><CirclePlus size={17}/></button>
        :<button aria-label="新增辅导资料" className="icon-button" onClick={openNewMaterial} title="新增辅导资料" type="button"><CirclePlus size={17}/></button>}
      </div>
     </div>
     {planTab==='items'?<div className="table-wrap" role="tabpanel"><table className="editor-table plan-items-table display-table"><thead><tr><th>要完成的事项</th><th>执行频率</th><th>辅导资料</th><th>每次时长</th><th>积分规则</th><th>总分</th><th>状态</th><th aria-label="操作"></th></tr></thead><tbody>
      {items.length?items.map(item=><tr className="interactive-row" key={item.id} onDoubleClick={event=>{if((event.target as HTMLElement).closest('button'))return;openEditItem(item)}} title="双击编辑">
       <td><strong>{item.name}</strong></td><td>{scheduleText(item)}</td><td>{item.materialName||'不指定'}</td><td>{item.suggestedDuration} 分钟</td><td className="rubric-cell">{item.evaluationRubric?<RubricPreview rubric={item.evaluationRubric}/>:<span className="muted-cell">{item.completionStandard}</span>}</td><td>{item.basePoints}</td><td><span className={`status-dot ${item.active?'active':'inactive'}`}>{item.active?'启用':'停用'}</span></td><td><div className="hover-actions"><button aria-label={`编辑${item.name}`} className="icon-button" onClick={()=>openEditItem(item)} title="编辑事项"><Pencil size={16}/></button><button aria-label={`删除${item.name}`} className="icon-button danger" onClick={()=>void removeItem(item.id)} title="删除事项"><Trash2 size={16}/></button></div></td>
      </tr>):<tr><td className="empty-cell" colSpan={8}><button className="list-empty-action" onClick={openNewItem} type="button"><CirclePlus size={18}/>还没有规划事项，点击添加</button></td></tr>}
     </tbody></table></div>:<div className="plan-materials" role="tabpanel">{materials.length?<div className="material-card-grid">{materials.map(item=><article className="material-card" key={item.id} onDoubleClick={event=>{if((event.target as HTMLElement).closest('button'))return;openEditMaterial(item)}} title="双击编辑">
      <div className="material-card-actions">
       <button aria-label={`编辑辅导资料${item.name}`} className="icon-button" onClick={()=>openEditMaterial(item)} title="编辑"><Pencil size={16}/></button>
       <button aria-label={`删除辅导资料${item.name}`} className="icon-button danger" onClick={()=>void removeMaterial(item.id)} title="删除"><Trash2 size={16}/></button>
      </div>
      <div className="material-card-body"><h3>{item.name}</h3><p>{item.note||'暂无用途说明'}</p></div>
     </article>)}</div>:<button className="material-card-empty" onClick={openNewMaterial} type="button"><CirclePlus size={18}/>暂无辅导资料，点击添加</button>}</div>}
    </section>
    </>}
   </div>
  </div>

  {goalDrawer&&plan&&<Drawer onClose={()=>setGoalDrawer(false)}><form className="side-drawer" onSubmit={saveGoal}><div className="drawer-head"><div><span className="eyebrow">Subject Goal</span><h2>设置科目总目标</h2></div><button className="icon-button" onClick={()=>setGoalDrawer(false)} title="关闭" type="button"><X size={20}/></button></div><div className="drawer-body"><label>目标说明<textarea autoFocus rows={6} placeholder="说明这个科目本阶段要达到的总体目标" value={plan.goal.narrative} onChange={event=>setPlan({...plan,goal:{...plan.goal,narrative:event.target.value}})}/></label><div className="form-row"><label>当前分<input aria-label="当前分" type="number" value={plan.goal.currentScore??''} onChange={event=>setPlan({...plan,goal:{...plan.goal,currentScore:event.target.value===''?null:Number(event.target.value)}})}/></label><label>目标分<input aria-label="目标分" type="number" value={plan.goal.targetScore??''} onChange={event=>setPlan({...plan,goal:{...plan.goal,targetScore:event.target.value===''?null:Number(event.target.value)}})}/></label></div><label>目标日期<DateField allowEmpty ariaLabel="目标日期" value={plan.goal.targetDate??''} onChange={value=>setPlan({...plan,goal:{...plan.goal,targetDate:value||null}})}/></label></div><div className="drawer-actions"><button className="secondary" onClick={()=>setGoalDrawer(false)} type="button">取消</button><button className="primary" type="submit">保存目标</button></div></form></Drawer>}

  {itemDraft&&(()=>{
   const allocated=itemDraft.evaluationRubric.dimensions.reduce((sum,dimension)=>sum+(dimension.maxPoints===''?0:dimension.maxPoints),0);
   const totalPoints=itemDraft.basePoints===''?0:itemDraft.basePoints;
   const remaining=totalPoints-allocated;
   const rubricError=itemDraft.basePoints===''||itemDraft.evaluationRubric.dimensions.some(dimension=>dimension.maxPoints==='')?null:validateRubricAgainstTotal({dimensions:itemDraft.evaluationRubric.dimensions.map(dimension=>({...dimension,maxPoints:dimension.maxPoints as number}))},itemDraft.basePoints);
   return <Drawer onClose={()=>setItemDraft(null)}><form className="side-drawer item-drawer rubric-drawer" onSubmit={saveItem}>
    <div className="drawer-head"><div><span className="eyebrow">Plan Item</span><h2>{itemDraft.id?'编辑规划事项':'新增规划事项'}</h2></div><button className="icon-button" onClick={()=>setItemDraft(null)} title="关闭" type="button"><X size={20}/></button></div>
    <div className="drawer-body">
     <label>事项名称<input aria-label="事项名称" autoFocus required placeholder="例如：一本阅读" value={itemDraft.name} onChange={event=>patchDraft({name:event.target.value})}/></label>
     <label>执行频率<select aria-label="执行频率" value={itemDraft.cadence} onChange={event=>changeCadence(event.target.value as PlanCadence)}>{cadences.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
     {(itemDraft.cadence==='weekly'||itemDraft.cadence==='custom_weekly')&&<fieldset className="drawer-weekdays"><legend>执行日</legend><div className="weekday-picker">{weekdays.map(day=><button className={itemDraft.weekdays.includes(day.id)?'selected':''} key={day.id} onClick={()=>toggleWeekday(day.id)} type="button">{day.label}</button>)}</div></fieldset>}
     <label>辅导资料<select aria-label="辅导资料" value={itemDraft.materialId??''} onChange={event=>patchDraft({materialId:event.target.value?Number(event.target.value):null})}><option value="">不指定</option>{materials.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
     <div className="form-row"><label>每次时长（分钟）<input aria-label="每次时长" min="1" type="number" value={itemDraft.suggestedDuration} onChange={event=>patchDraft({suggestedDuration:parseNumberInput(event.target.value)})}/></label><label>总分<input aria-label="总分" min="0" type="number" value={itemDraft.basePoints} onChange={event=>changeTotalPoints(event.target.value)}/></label></div>

     <section className="rubric-editor" aria-label="积分规则">
      <div className="rubric-editor-head">
       <strong>积分规则</strong>
       <div className="rubric-editor-tools">
        <span className={`rubric-budget ${remaining<0?'over':remaining===0&&itemDraft.basePoints!==''?'exact':'under'}`}>{allocated}/{itemDraft.basePoints===''?'—':itemDraft.basePoints}分{itemDraft.basePoints!==''&&remaining>0?` · 剩${remaining}`:remaining<0?` · 超${-remaining}`:''}</span>
        <button aria-label="添加维度" className="icon-button" onClick={addDimension} title="添加维度" type="button"><CirclePlus size={16}/></button>
       </div>
      </div>
      <div className="rubric-simple-list">
       <div className="rubric-simple-head"><span>维度</span><span>满分</span><span/></div>
       {itemDraft.evaluationRubric.dimensions.map(dimension=><div className="rubric-simple-row" key={dimension.id}>
        <input aria-label={`${dimension.name||'维度'}名称`} value={dimension.name} onChange={event=>patchDimension(dimension.id,{name:event.target.value})}/>
        <input aria-label={`${dimension.name||'维度'}满分`} min="0" type="number" value={dimension.maxPoints} onChange={event=>patchDimension(dimension.id,{maxPoints:parseNumberInput(event.target.value)})}/>
        <button aria-label={`删除维度${dimension.name}`} className="icon-button danger" onClick={()=>removeDimension(dimension.id)} title="删除维度" type="button"><Trash2 size={16}/></button>
       </div>)}
      </div>
      {rubricError&&<p className="form-error">{rubricError}</p>}
     </section>

     <label className="drawer-toggle"><input checked={itemDraft.active} onChange={event=>patchDraft({active:event.target.checked})} type="checkbox"/>启用这个规划事项</label>
    </div>
    <div className="drawer-actions split-actions">{itemDraft.id?<button className="text-danger" onClick={()=>void removeItem()} type="button"><Trash2 size={16}/>删除事项</button>:<span/>}<div><button className="secondary" onClick={()=>setItemDraft(null)} type="button">取消</button><button className="primary" type="submit">保存事项</button></div></div>
   </form></Drawer>;
  })()}

  {materialDraft&&plan&&<Drawer onClose={()=>setMaterialDraft(null)}><form className="side-drawer material-drawer" onSubmit={saveMaterial}><div className="drawer-head"><div><span className="eyebrow">Study Material</span><h2>{materialDraft.id?'编辑辅导资料':'新增辅导资料'}</h2></div><button className="icon-button" onClick={()=>setMaterialDraft(null)} title="关闭" type="button"><X size={20}/></button></div><div className="drawer-body"><label>资料名称<input aria-label="资料名称" autoFocus required placeholder="例如：《一本阅读》" value={materialDraft.name} onChange={event=>patchMaterial({name:event.target.value})}/></label><label>用途说明<textarea aria-label="用途说明" rows={5} placeholder="例如：现代文阅读专项" value={materialDraft.note} onChange={event=>patchMaterial({note:event.target.value})}/></label></div><div className="drawer-actions split-actions">{materialDraft.id?<button className="text-danger" onClick={()=>void removeMaterial()} type="button"><Trash2 size={16}/>删除资料</button>:<span/>}<div><button className="secondary" onClick={()=>setMaterialDraft(null)} type="button">取消</button><button className="primary" type="submit">保存资料</button></div></div></form></Drawer>}
 </>;
}

