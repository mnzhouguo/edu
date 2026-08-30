import { useEffect,useMemo,useRef,useState } from 'react';
import { CirclePlus,Pencil,Trash2,X } from 'lucide-react';
import { api } from '../api';
import { allocatedPoints,defaultRubric,newRubricId,rubricFromLegacy,summarizeRubric,validateRubricAgainstTotal,type EvaluationRubric,type RubricDimension } from '../rubric';
import { subjects,type PlanCadence,type StudentSubject,type StudyMaterial,type Subject,type SubjectPlan,type SubjectPlanItem } from '../types';

const materialTypes=[{id:'workbook',label:'教辅'},{id:'course',label:'课程'},{id:'handout',label:'讲义'},{id:'other',label:'其他'}];
const cadences:{id:PlanCadence;label:string;defaultDays:number[]}[]=[
 {id:'daily',label:'每天',defaultDays:[]},
 {id:'weekdays',label:'工作日',defaultDays:[]},
 {id:'every_2_days',label:'每两天',defaultDays:[]},
 {id:'weekly',label:'每周一次',defaultDays:[6]},
 {id:'custom_weekly',label:'自定义每周',defaultDays:[1,3,5]},
];
const weekdays=[{id:1,label:'一'},{id:2,label:'二'},{id:3,label:'三'},{id:4,label:'四'},{id:5,label:'五'},{id:6,label:'六'},{id:7,label:'日'}];
type ItemDraft=Omit<SubjectPlanItem,'studentId'|'subject'|'materialName'|'evaluationRubric'|'completionStandard'>&{evaluationRubric:EvaluationRubric};
type MaterialDraft=StudyMaterial;

function RubricPreview({rubric}:{rubric:EvaluationRubric}){
 return <div className="rubric-preview">{rubric.dimensions.map(dimension=><div className="rubric-dimension-chip" key={dimension.id}><div className="rubric-dimension-head"><strong>{dimension.name}</strong><em>{dimension.maxPoints}分</em></div><div className="rubric-levels">{dimension.levels.map(level=><span key={level.id}><b>{level.points}</b>{level.label}</span>)}</div></div>)}</div>;
}

export function SubjectPlanPage({studentId}:{studentId:number}){
 const[subject,setSubject]=useState<Subject>('chinese');
 const[subjectOptions,setSubjectOptions]=useState<StudentSubject[]>(subjects.map((item,index)=>({...item,custom:false,sortOrder:index+1})));
 const[newSubjectName,setNewSubjectName]=useState('');
 const[subjectDrawer,setSubjectDrawer]=useState(false);
 const[plan,setPlan]=useState<SubjectPlan|null>(null);
 const[items,setItems]=useState<SubjectPlanItem[]>([]);
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const[materialDraft,setMaterialDraft]=useState<MaterialDraft|null>(null);
 const[goalDrawer,setGoalDrawer]=useState(false);
 const[itemDraft,setItemDraft]=useState<ItemDraft|null>(null);
 const requestVersion=useRef(0);
 const currentSubjectLabel=subjectOptions.find(item=>item.id===subject)?.label??subject;
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

 useEffect(()=>{api<{subjects:StudentSubject[]}>(`/api/students/${studentId}/subjects`).then(result=>{setSubjectOptions(result.subjects);setSubject(current=>result.subjects.some(item=>item.id===current)?current:result.subjects[0]?.id??'chinese')}).catch(reason=>setError(reason instanceof Error?reason.message:'读取科目失败'))},[studentId]);
 useEffect(()=>{setPlan(null);setItems([]);setItemDraft(null);setMaterialDraft(null);void load()},[studentId,subject]);
 async function addSubject(event:React.FormEvent){
  event.preventDefault();
  if(!newSubjectName.trim())return;
  try{
   const result=await api<{subject:StudentSubject}>(`/api/students/${studentId}/subjects`,{method:'POST',body:JSON.stringify({label:newSubjectName.trim()})});
   setSubjectOptions(current=>current.some(item=>item.id===result.subject.id)?current:[...current,result.subject]);
   setSubject(result.subject.id);setNewSubjectName('');setSubjectDrawer(false);setMessage('科目已添加');
  }catch(reason){setError(reason instanceof Error?reason.message:'新增科目失败')}
 }

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
 function patchRubric(updater:(rubric:EvaluationRubric)=>EvaluationRubric){
  setItemDraft(current=>current?{...current,evaluationRubric:updater(current.evaluationRubric)}:current);
 }
 function patchDimension(dimensionId:string,patch:Partial<RubricDimension>){
  patchRubric(rubric=>({dimensions:rubric.dimensions.map(dimension=>dimension.id===dimensionId?{...dimension,...patch}:dimension)}));
 }
 function addDimension(){
  patchRubric(rubric=>{
   const remaining=Math.max(0,itemDraft!.basePoints-allocatedPoints(rubric));
   const maxPoints=remaining>0?remaining:0;
   return {dimensions:[...rubric.dimensions,{
    id:newRubricId('dim'),
    name:'新维度',
    maxPoints,
    levels:[
     {id:newRubricId('lv'),label:'达标',points:maxPoints},
     {id:newRubricId('lv'),label:'未达标',points:0},
    ],
   }]};
  });
 }
 function removeDimension(dimensionId:string){
  patchRubric(rubric=>({dimensions:rubric.dimensions.filter(dimension=>dimension.id!==dimensionId)}));
 }
 function addLevel(dimensionId:string){
  patchRubric(rubric=>({dimensions:rubric.dimensions.map(dimension=>dimension.id===dimensionId?{...dimension,levels:[...dimension.levels,{id:newRubricId('lv'),label:'新档位',points:0}]}:dimension)}));
 }
 function patchLevel(dimensionId:string,levelId:string,patch:{label?:string;points?:number}){
  patchRubric(rubric=>({dimensions:rubric.dimensions.map(dimension=>{
   if(dimension.id!==dimensionId)return dimension;
   return {...dimension,levels:dimension.levels.map(level=>level.id===levelId?{...level,...patch}:level)};
  })}));
 }
 function removeLevel(dimensionId:string,levelId:string){
  patchRubric(rubric=>({dimensions:rubric.dimensions.map(dimension=>dimension.id===dimensionId?{...dimension,levels:dimension.levels.filter(level=>level.id!==levelId)}:dimension)}));
 }
 async function saveItem(event:React.FormEvent){
  event.preventDefault();
  if(!itemDraft||!itemDraft.name.trim()){setError('请填写事项名称');return}
  const rubricError=validateRubricAgainstTotal(itemDraft.evaluationRubric,itemDraft.basePoints);
  if(rubricError){setError(rubricError);return}
  const payload={...itemDraft,completionStandard:summarizeRubric(itemDraft.evaluationRubric),evaluationRubric:itemDraft.evaluationRubric};
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
 function openNewMaterial(){setMaterialDraft({id:0,name:'',areaId:'',type:'workbook',note:''})}
 function openEditMaterial(material:StudyMaterial){setMaterialDraft({...material})}
 function patchMaterial(patch:Partial<MaterialDraft>){setMaterialDraft(current=>current?{...current,...patch}:current)}
 async function saveMaterial(event:React.FormEvent){
  event.preventDefault();
  if(!materialDraft?.name.trim()||!materialDraft.areaId)return;
  try{
   if(materialDraft.id){
    await api(`/api/students/${studentId}/subject-plans/materials/${materialDraft.id}`,{method:'PUT',body:JSON.stringify({name:materialDraft.name.trim(),type:materialDraft.type,note:materialDraft.note.trim(),areaId:materialDraft.areaId})});
   }else{
    await api(`/api/students/${studentId}/subject-plans/${subject}/areas/${materialDraft.areaId}/materials`,{method:'POST',body:JSON.stringify({name:materialDraft.name.trim(),type:materialDraft.type,note:materialDraft.note.trim()})});
   }
   setMaterialDraft(null);
   setMessage(materialDraft.id?'教材已更新':'教材已添加');
   await load();
  }catch(reason){setError(reason instanceof Error?reason.message:'教材保存失败')}
 }
 async function removeMaterial(id=materialDraft?.id){
  if(!id)return;
  try{await api(`/api/students/${studentId}/subject-plans/materials/${id}`,{method:'DELETE'});if(materialDraft?.id===id)setMaterialDraft(null);setMessage('教材已删除');await load()}
  catch(reason){setError(reason instanceof Error?reason.message:'删除教材失败')}
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
 function executionDays(item:SubjectPlanItem){
  if(item.cadence==='daily'||item.cadence==='every_2_days')return '自动安排';
  if(item.cadence==='weekdays')return '周一至周五';
  return item.weekdays.map(day=>`周${weekdays.find(option=>option.id===day)?.label}`).join('、');
 }

 return <>
  <div className="subject-plan-page">
   <aside className="subject-rail"><div className="subject-rail-title">科目</div><div className="subject-rail-list" role="tablist">{subjectOptions.map(item=><button className={subject===item.id?'active':''} key={item.id} onClick={()=>setSubject(item.id)} role="tab"><span>{item.label}</span>{item.custom&&<small>自定义</small>}</button>)}</div><button className="subject-add-button" onClick={()=>setSubjectDrawer(true)}><CirclePlus size={17}/>新增科目</button></aside>
   <div className="subject-plan-body">
    <h1 className="subject-plan-title">{currentSubjectLabel}长期学习事项</h1>
    {error&&<p className="error">{error}</p>}{message&&<p className="success-message">{message}</p>}
    {!plan?<div className="empty-state">{error||'正在读取科目规划…'}</div>:<>
    <section className="panel subject-goal-summary">
     <div className="subject-goal-copy"><span className="eyebrow">科目总目标</span><h2>{plan.goal.narrative||'暂未设置科目总目标'}</h2></div>
     <div className="goal-summary-meta">
      <div className="goal-metric"><span>当前分</span><strong>{plan.goal.currentScore??'—'}</strong></div>
      <div className="goal-metric highlight"><span>目标分</span><strong>{plan.goal.targetScore??'—'}</strong></div>
      <div className="goal-metric"><span>目标日期</span><strong>{plan.goal.targetDate??'—'}</strong></div>
     </div>
     <button aria-label="编辑目标" className="icon-button" onClick={()=>setGoalDrawer(true)} title="编辑目标"><Pencil size={16}/></button>
    </section>

    <section className="panel compact-panel plan-items-panel">
     <div className="panel-head"><div><span className="step-number">1</span><h2>规划事项</h2></div><div className="panel-head-actions"><span className="panel-hint">例如：学校作业、一本阅读、必读书目、文言文阅读</span><button aria-label="新增事项" className="icon-button" onClick={openNewItem} title="新增事项"><CirclePlus size={17}/></button></div></div>
     <div className="table-wrap"><table className="editor-table plan-items-table display-table"><thead><tr><th>要完成的事项</th><th>执行频率</th><th>执行日</th><th>使用教材</th><th>每次时长</th><th>评价指标</th><th>总分</th><th>状态</th><th aria-label="操作"></th></tr></thead><tbody>
      {items.length?items.map(item=><tr className="interactive-row" key={item.id}><td><strong>{item.name}</strong></td><td>{cadenceText(item)}</td><td className="muted-cell">{executionDays(item)}</td><td>{item.materialName||'不指定教材'}</td><td>{item.suggestedDuration} 分钟</td><td className="rubric-cell">{item.evaluationRubric?<RubricPreview rubric={item.evaluationRubric}/>:<span className="muted-cell">{item.completionStandard}</span>}</td><td>{item.basePoints}</td><td><span className={`status-dot ${item.active?'active':'inactive'}`}>{item.active?'启用':'停用'}</span></td><td><div className="hover-actions"><button aria-label={`编辑${item.name}`} className="icon-button" onClick={()=>openEditItem(item)} title="编辑事项"><Pencil size={16}/></button><button aria-label={`删除${item.name}`} className="icon-button danger" onClick={()=>void removeItem(item.id)} title="删除事项"><Trash2 size={16}/></button></div></td></tr>):<tr><td className="empty-cell" colSpan={9}>还没有规划事项，点击“新增事项”开始添加。</td></tr>}
     </tbody></table></div>
    </section>

    <section className="panel compact-panel"><div className="panel-head"><div><span className="step-number">2</span><h2>教材</h2></div><div className="panel-head-actions"><span className="panel-hint">事项可以选择一本教材，也可以不指定</span><button aria-label="新增教材" className="icon-button" onClick={openNewMaterial} title="新增教材"><CirclePlus size={17}/></button></div></div><div className="table-wrap"><table className="editor-table display-table material-list-table"><thead><tr><th>教材名称</th><th>知识方向</th><th>教材类型</th><th>用途说明</th><th aria-label="操作"></th></tr></thead><tbody>{materials.length?materials.map(item=><tr className="interactive-row" key={item.id}><td><strong>{item.name}</strong></td><td>{item.areaLabel}</td><td>{materialTypes.find(type=>type.id===item.type)?.label??item.type}</td><td className="muted-cell">{item.note||'—'}</td><td><div className="hover-actions"><button aria-label={`编辑教材${item.name}`} className="icon-button" onClick={()=>openEditMaterial(item)} title="编辑教材"><Pencil size={16}/></button><button aria-label={`删除教材${item.name}`} className="icon-button danger" onClick={()=>void removeMaterial(item.id)} title="删除教材"><Trash2 size={16}/></button></div></td></tr>):<tr><td className="empty-cell" colSpan={5}>暂无教材，点击“新增教材”开始添加。</td></tr>}</tbody></table></div></section>
    </>}
   </div>
  </div>

  {subjectDrawer&&<div className="drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSubjectDrawer(false)}}><form className="side-drawer subject-create-drawer" onSubmit={addSubject}><div className="drawer-head"><div><span className="eyebrow">New Subject</span><h2>新增科目</h2></div><button className="icon-button" onClick={()=>setSubjectDrawer(false)} title="关闭" type="button"><X size={20}/></button></div><div className="drawer-body"><label>科目名称<input aria-label="科目名称" autoFocus required placeholder="例如：化学、生物、地理" value={newSubjectName} onChange={event=>setNewSubjectName(event.target.value)}/></label><p className="drawer-help">新增后会自动建立“综合学习”方向，可继续添加教材和规划事项。</p></div><div className="drawer-actions"><button className="secondary" onClick={()=>setSubjectDrawer(false)} type="button">取消</button><button className="primary" type="submit">保存科目</button></div></form></div>}
  {goalDrawer&&plan&&<div className="drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setGoalDrawer(false)}}><form className="side-drawer" onSubmit={saveGoal}><div className="drawer-head"><div><span className="eyebrow">Subject Goal</span><h2>设置科目总目标</h2></div><button className="icon-button" onClick={()=>setGoalDrawer(false)} title="关闭" type="button"><X size={20}/></button></div><div className="drawer-body"><label>目标说明<textarea autoFocus rows={6} placeholder="说明这个科目本阶段要达到的总体目标" value={plan.goal.narrative} onChange={event=>setPlan({...plan,goal:{...plan.goal,narrative:event.target.value}})}/></label><div className="form-row"><label>当前分<input aria-label="当前分" type="number" value={plan.goal.currentScore??''} onChange={event=>setPlan({...plan,goal:{...plan.goal,currentScore:event.target.value===''?null:Number(event.target.value)}})}/></label><label>目标分<input aria-label="目标分" type="number" value={plan.goal.targetScore??''} onChange={event=>setPlan({...plan,goal:{...plan.goal,targetScore:event.target.value===''?null:Number(event.target.value)}})}/></label></div><label>目标日期<input aria-label="目标日期" type="date" value={plan.goal.targetDate??''} onChange={event=>setPlan({...plan,goal:{...plan.goal,targetDate:event.target.value||null}})}/></label></div><div className="drawer-actions"><button className="secondary" onClick={()=>setGoalDrawer(false)} type="button">取消</button><button className="primary" type="submit">保存目标</button></div></form></div>}

  {itemDraft&&(()=>{
   const allocated=allocatedPoints(itemDraft.evaluationRubric);
   const remaining=itemDraft.basePoints-allocated;
   const rubricError=validateRubricAgainstTotal(itemDraft.evaluationRubric,itemDraft.basePoints);
   return <div className="drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setItemDraft(null)}}><form className="side-drawer item-drawer rubric-drawer" onSubmit={saveItem}>
    <div className="drawer-head"><div><span className="eyebrow">Plan Item</span><h2>{itemDraft.id?'编辑规划事项':'新增规划事项'}</h2></div><button className="icon-button" onClick={()=>setItemDraft(null)} title="关闭" type="button"><X size={20}/></button></div>
    <div className="drawer-body">
     <label>事项名称<input aria-label="事项名称" autoFocus required placeholder="例如：一本阅读" value={itemDraft.name} onChange={event=>patchDraft({name:event.target.value})}/></label>
     <label>执行频率<select aria-label="执行频率" value={itemDraft.cadence} onChange={event=>changeCadence(event.target.value as PlanCadence)}>{cadences.map(option=><option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
     {(itemDraft.cadence==='weekly'||itemDraft.cadence==='custom_weekly')&&<fieldset className="drawer-weekdays"><legend>执行日</legend><div className="weekday-picker">{weekdays.map(day=><button className={itemDraft.weekdays.includes(day.id)?'selected':''} key={day.id} onClick={()=>toggleWeekday(day.id)} type="button">{day.label}</button>)}</div></fieldset>}
     <label>使用教材<select aria-label="使用教材" value={itemDraft.materialId??''} onChange={event=>patchDraft({materialId:event.target.value?Number(event.target.value):null})}><option value="">不指定教材</option>{materials.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
     <div className="form-row"><label>每次时长（分钟）<input aria-label="每次时长" min="1" type="number" value={itemDraft.suggestedDuration} onChange={event=>patchDraft({suggestedDuration:Number(event.target.value)||1})}/></label><label>总分<input aria-label="总分" min="0" type="number" value={itemDraft.basePoints} onChange={event=>patchDraft({basePoints:Number(event.target.value)||0})}/></label></div>

     <section className="rubric-editor" aria-label="评价指标">
      <div className="rubric-editor-head">
       <div><strong>评价指标</strong><p>每个维度设满分，下面再设几档得分；评价时每维选一档，加总不能超过总分。</p></div>
       <button className="secondary compact-action" onClick={addDimension} type="button"><CirclePlus size={16}/>添加维度</button>
      </div>
      <div className={`rubric-budget ${remaining<0?'over':remaining===0?'exact':'under'}`}>已分配 <strong>{allocated}</strong> / 总分 <strong>{itemDraft.basePoints}</strong>{remaining>0?` · 还可分配 ${remaining} 分`:remaining<0?` · 超出 ${-remaining} 分`:' · 已分配完毕'}</div>
      {itemDraft.evaluationRubric.dimensions.map(dimension=><article className="rubric-dimension-card" key={dimension.id}>
       <div className="rubric-dimension-toolbar">
        <div className="rubric-field"><span>维度名称</span><input aria-label={`${dimension.name||'维度'}名称`} value={dimension.name} onChange={event=>patchDimension(dimension.id,{name:event.target.value})}/></div>
        <div className="rubric-field rubric-field-score"><span>满分</span><input aria-label={`${dimension.name||'维度'}满分`} min="0" type="number" value={dimension.maxPoints} onChange={event=>{
         const maxPoints=Number(event.target.value)||0;
         patchDimension(dimension.id,{maxPoints,levels:dimension.levels.map(level=>({...level,points:Math.min(level.points,maxPoints)}))});
        }}/></div>
        <button aria-label={`删除维度${dimension.name}`} className="icon-button danger" onClick={()=>removeDimension(dimension.id)} title="删除维度" type="button"><Trash2 size={16}/></button>
       </div>
       <div className="rubric-level-list">
        <div className="rubric-level-head"><span>档位说明</span><span>得分</span><span/></div>
        {dimension.levels.map(level=><div className="rubric-level-row" key={level.id}>
         <input aria-label={`${dimension.name}档位说明`} placeholder="例如：字迹优美" value={level.label} onChange={event=>patchLevel(dimension.id,level.id,{label:event.target.value})}/>
         <input aria-label={`${dimension.name}档位得分`} min="0" max={dimension.maxPoints} type="number" value={level.points} onChange={event=>patchLevel(dimension.id,level.id,{points:Number(event.target.value)||0})}/>
         <button aria-label={`删除档位${level.label}`} className="icon-button danger" onClick={()=>removeLevel(dimension.id,level.id)} title="删除档位" type="button"><Trash2 size={15}/></button>
        </div>)}
        <button className="text-button" onClick={()=>addLevel(dimension.id)} type="button"><CirclePlus size={15}/>添加档位</button>
       </div>
      </article>)}
      {rubricError&&<p className="form-error">{rubricError}</p>}
     </section>

     <label className="drawer-toggle"><input checked={itemDraft.active} onChange={event=>patchDraft({active:event.target.checked})} type="checkbox"/>启用这个规划事项</label>
    </div>
    <div className="drawer-actions split-actions">{itemDraft.id?<button className="text-danger" onClick={()=>void removeItem()} type="button"><Trash2 size={16}/>删除事项</button>:<span/>}<div><button className="secondary" onClick={()=>setItemDraft(null)} type="button">取消</button><button className="primary" type="submit">保存事项</button></div></div>
   </form></div>;
  })()}

  {materialDraft&&plan&&<div className="drawer-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setMaterialDraft(null)}}><form className="side-drawer material-drawer" onSubmit={saveMaterial}><div className="drawer-head"><div><span className="eyebrow">Study Material</span><h2>{materialDraft.id?'编辑教材':'新增教材'}</h2></div><button className="icon-button" onClick={()=>setMaterialDraft(null)} title="关闭" type="button"><X size={20}/></button></div><div className="drawer-body"><label>教材名称<input aria-label="教材名称" autoFocus required placeholder="例如：《教材帮》" value={materialDraft.name} onChange={event=>patchMaterial({name:event.target.value})}/></label><label>知识方向<select aria-label="知识方向" required value={materialDraft.areaId} onChange={event=>patchMaterial({areaId:event.target.value})}><option value="">选择方向</option>{plan.areas.map(area=><option key={area.id} value={area.id}>{area.label}</option>)}</select></label><label>教材类型<select aria-label="教材类型" value={materialDraft.type} onChange={event=>patchMaterial({type:event.target.value})}>{materialTypes.map(type=><option key={type.id} value={type.id}>{type.label}</option>)}</select></label><label>用途说明<textarea aria-label="用途说明" rows={5} placeholder="例如：现代文阅读专项" value={materialDraft.note} onChange={event=>patchMaterial({note:event.target.value})}/></label></div><div className="drawer-actions split-actions">{materialDraft.id?<button className="text-danger" onClick={()=>void removeMaterial()} type="button"><Trash2 size={16}/>删除教材</button>:<span/>}<div><button className="secondary" onClick={()=>setMaterialDraft(null)} type="button">取消</button><button className="primary" type="submit">保存教材</button></div></div></form></div>}
 </>;
}




