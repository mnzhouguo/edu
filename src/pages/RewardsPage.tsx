import { useEffect,useRef,useState } from 'react';
import { CirclePlus,Gift,ImagePlus,Pencil,Trash2,X } from 'lucide-react';
import { api } from '../api';
import { Drawer } from '../components/Drawer';
import { type Redemption,type Reward } from '../types';

type RewardForm={name:string;requiredPoints:number|'';description:string;active:boolean};
type PointsOverview={balance:number;totalEarned:number;weekEarned:number;weekRedeemed:number};
type LedgerEntry={id:number;entryType:string;amount:number;sourceType:string;category:string;categoryLabel:string;note:string;sourceLabel:string;createdAt:string};
type ExtraCategory='school_praise'|'goal_achieved'|'housework'|'excellent_homework'|'other';
type ExtraForm={amount:number|'';category:ExtraCategory;note:string};
const emptyPoints:PointsOverview={balance:0,totalEarned:0,weekEarned:0,weekRedeemed:0};
const emptyForm:RewardForm={name:'',requiredPoints:50,description:'',active:true};
const extraCategories:{id:ExtraCategory;label:string}[]=[
 {id:'school_praise',label:'学校表扬'},
 {id:'goal_achieved',label:'目标达成'},
 {id:'housework',label:'家务'},
 {id:'excellent_homework',label:'作业优秀'},
 {id:'other',label:'其他'},
];
const emptyExtra:ExtraForm={amount:10,category:'school_praise',note:''};

function parseNumberInput(raw:string):number|''{
 if(raw==='')return '';
 const value=Number(raw);
 return Number.isFinite(value)?value:'';
}

function formatRedeemedAt(value:string){
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return {date:value,time:''};
 return {
  date:`${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`,
  time:`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`,
 };
}

function redemptionLabel(status:string){
 if(status==='approved')return '已兑换';
 if(status==='rejected')return '已取消';
 return '待处理';
}

function earnSourceKind(entry:Pick<LedgerEntry,'sourceType'|'categoryLabel'>){
 if(entry.sourceType==='extra_reward')return entry.categoryLabel||'额外奖励';
 if(entry.sourceType==='weekly_task')return '学习任务';
 if(entry.sourceType==='evaluation')return '任务评价';
 return '其他';
}

function rewardImageSrc(studentId:number,reward:Pick<Reward,'id'|'hasImage'|'updatedAt'>){
 if(!reward.hasImage)return null;
 return `/api/students/${studentId}/rewards/${reward.id}/image?v=${encodeURIComponent(reward.updatedAt??'')}`;
}

function RewardAction({reward,balance,onRedeem}:{reward:Reward;balance:number;onRedeem:(reward:Reward)=>void}){
 const shortage=reward.requiredPoints-balance;
 const disabled=!reward.active||shortage>0;
 const hint=!reward.active?'已停用':shortage>0?`还差 ${shortage} 分`:'兑换这个奖品';
 return <div className="reward-foot">
  <button className="primary compact-action" disabled={disabled} onClick={()=>onRedeem(reward)} title={hint} type="button">兑换</button>
  {disabled?<span className="reward-status">{!reward.active?'已停用':`还差 ${shortage} 分`}</span>:null}
 </div>;
}

export function RewardsPage({studentId}:{studentId:number}){
 const[rewards,setRewards]=useState<Reward[]>([]);
 const[records,setRecords]=useState<Redemption[]>([]);
 const[earns,setEarns]=useState<LedgerEntry[]>([]);
 const[points,setPoints]=useState<PointsOverview>(emptyPoints);
 const[tab,setTab]=useState<'prizes'|'earns'|'records'>('prizes');
 const[draft,setDraft]=useState<(RewardForm&{id:number})|null>(null);
 const[extraDraft,setExtraDraft]=useState<ExtraForm|null>(null);
 const[redeemDraft,setRedeemDraft]=useState<{reward:Reward;quantity:number|''}|null>(null);
 const[imageFile,setImageFile]=useState<File|null>(null);
 const[imagePreview,setImagePreview]=useState<string|null>(null);
 const[error,setError]=useState('');
 const[message,setMessage]=useState('');
 const requestVersion=useRef(0);
 const imageRef=useRef<HTMLInputElement>(null);

 async function load(){
  const version=++requestVersion.current;
  try{
   const[rewardResult,recordResult,points]=await Promise.all([
    api<{rewards:Reward[]}>(`/api/students/${studentId}/rewards`),
    api<{requests:Redemption[]}>(`/api/students/${studentId}/redemptions`),
    api<{balance:number;totalEarned:number;weekEarned:number;weekRedeemed:number;entries:LedgerEntry[]}>(`/api/students/${studentId}/points`),
   ]);
   if(version!==requestVersion.current)return;
   setRewards(rewardResult.rewards);
   setRecords([...recordResult.requests].sort((left,right)=>{
    const leftTime=Date.parse(left.decidedAt||left.createdAt);
    const rightTime=Date.parse(right.decidedAt||right.createdAt);
    return rightTime-leftTime||right.id-left.id;
   }));
   setEarns([...points.entries]
    .filter(entry=>entry.entryType==='earn'||(entry.entryType==='adjust'&&entry.amount>0))
    .sort((left,right)=>Date.parse(right.createdAt)-Date.parse(left.createdAt)||right.id-left.id));
   setPoints({balance:points.balance,totalEarned:points.totalEarned??0,weekEarned:points.weekEarned??0,weekRedeemed:points.weekRedeemed??0});
   setError('');
  }catch(reason){setError(reason instanceof Error?reason.message:'读取失败')}
 }

 useEffect(()=>{setRewards([]);setRecords([]);setEarns([]);setPoints(emptyPoints);setDraft(null);setExtraDraft(null);setRedeemDraft(null);setImageFile(null);setTab('prizes');void load()},[studentId]);
 useEffect(()=>{
  if(!imageFile){setImagePreview(null);return}
  const url=URL.createObjectURL(imageFile);
  setImagePreview(url);
  return ()=>URL.revokeObjectURL(url);
 },[imageFile]);

 function closeDraft(){setDraft(null);setImageFile(null);setImagePreview(null)}
 function openCreate(){setDraft({id:0,...emptyForm});setImageFile(null);setImagePreview(null);setError('')}
 function openEdit(reward:Reward){
  setDraft({id:reward.id,name:reward.name,requiredPoints:reward.requiredPoints,description:reward.description,active:reward.active});
  setImageFile(null);
  setImagePreview(rewardImageSrc(studentId,reward));
  setError('');
 }
 function patchDraft(patch:Partial<RewardForm>){setDraft(current=>current?{...current,...patch}:current)}
 function openExtra(){setExtraDraft({...emptyExtra});setError('')}
 function patchExtra(patch:Partial<ExtraForm>){setExtraDraft(current=>current?{...current,...patch}:current)}

 async function save(event:React.FormEvent){
  event.preventDefault();
  if(!draft)return;
  if(!draft.name.trim()){setError('请填写奖励名称');return}
  if(draft.requiredPoints===''||draft.requiredPoints<1){setError('请填写所需积分');return}
  const current=draft.id?rewards.find(item=>item.id===draft.id):null;
  const payload={
   name:draft.name.trim(),
   category:current?.category??'gift',
   requiredPoints:draft.requiredPoints,
   cashAmount:current?.category==='cash'?draft.requiredPoints*5/100:null,
   description:draft.description.trim(),
   active:draft.active,
  };
  try{
   const result=await api<{reward:Reward}>(draft.id?`/api/students/${studentId}/rewards/${draft.id}`:`/api/students/${studentId}/rewards`,{method:draft.id?'PUT':'POST',body:JSON.stringify(payload)});
   if(imageFile){
    const data=new FormData();
    data.append('image',imageFile);
    await api(`/api/students/${studentId}/rewards/${result.reward.id}/image`,{method:'POST',body:data});
   }
   closeDraft();
   setMessage(draft.id?'奖励已更新':'奖励已添加');
   await load();
  }catch(reason){setError(reason instanceof Error?reason.message:'保存失败')}
 }

 async function saveExtra(event:React.FormEvent){
  event.preventDefault();
  if(!extraDraft)return;
  if(extraDraft.amount===''||extraDraft.amount<1){setError('请填写正整数积分');return}
  if(!extraDraft.category){setError('请选择奖励类型');return}
  try{
   await api(`/api/students/${studentId}/points/extra-rewards`,{method:'POST',body:JSON.stringify({
    amount:extraDraft.amount,
    category:extraDraft.category,
    note:extraDraft.note.trim(),
   })});
   setExtraDraft(null);
   setMessage(`已登记额外奖励 +${extraDraft.amount} 分`);
   await load();
  }catch(reason){setError(reason instanceof Error?reason.message:'登记失败')}
 }

 function openRedeem(reward:Reward){
  if(points.balance<reward.requiredPoints){setError(`积分不足，还差 ${reward.requiredPoints-points.balance} 分`);return}
  setRedeemDraft({reward,quantity:1});
  setError('');
 }

 async function confirmRedeem(event:React.FormEvent){
  event.preventDefault();
  if(!redeemDraft)return;
  const quantity=redeemDraft.quantity;
  if(quantity===''||quantity<1){setError('请填写兑换数量');return}
  const cost=redeemDraft.reward.requiredPoints*quantity;
  if(points.balance<cost){setError(`积分不足，还差 ${cost-points.balance} 分`);return}
  try{
   const result=await api<{pointsBalance:number}>(`/api/students/${studentId}/redemptions`,{method:'POST',body:JSON.stringify({rewardId:redeemDraft.reward.id,quantity})});
   setPoints(current=>({...current,balance:result.pointsBalance}));
   setRedeemDraft(null);
   setMessage(quantity===1?`已兑换「${redeemDraft.reward.name}」`:`已兑换「${redeemDraft.reward.name}」×${quantity}`);
   await load();
  }catch(reason){setError(reason instanceof Error?reason.message:'兑换失败')}
 }

 async function remove(reward:Reward){
  if(!confirm(`删除「${reward.name}」？`))return;
  try{
   await api(`/api/students/${studentId}/rewards/${reward.id}`,{method:'DELETE'});
   setMessage(`已删除「${reward.name}」`);
   await load();
  }catch(reason){setError(reason instanceof Error?reason.message:'删除失败')}
 }

 return <div className="rewards-page">
  <div className="rewards-head">
   <div>
    <span className="eyebrow">Points Exchange</span>
    <h1>积分兑换</h1>
    <p>奖品目录全家共用；积分与兑换记录仍按当前孩子分开。</p>
   </div>
   <div className="rewards-points">
    <article><span>累计获得</span><strong>{points.totalEarned}</strong></article>
    <article className="emphasis"><span>可兑换</span><strong>{points.balance}</strong></article>
    <article><span>本周获得</span><strong>{points.weekEarned}</strong></article>
    <article><span>本周已兑</span><strong>{points.weekRedeemed}</strong></article>
   </div>
  </div>
  {error&&<p className="error">{error}</p>}
  {message&&<p className="success-message">{message}</p>}

  <div className="rewards-toolbar">
   <div className="rewards-tabs" role="tablist">
    <button aria-selected={tab==='prizes'} onClick={()=>setTab('prizes')} role="tab" type="button">奖品<span className="rewards-count">{rewards.length}</span></button>
    <button aria-selected={tab==='earns'} onClick={()=>setTab('earns')} role="tab" type="button">积分获取<span className="rewards-count">{earns.length}</span></button>
    <button aria-selected={tab==='records'} onClick={()=>setTab('records')} role="tab" type="button">兑换记录<span className="rewards-count">{records.length}</span></button>
   </div>
   {tab==='prizes'&&<button className="primary" onClick={openCreate} type="button"><CirclePlus size={16}/>新增奖励</button>}
   {tab==='earns'&&<button className="primary" onClick={openExtra} type="button"><CirclePlus size={16}/>登记额外奖励</button>}
  </div>

  {tab==='prizes'?<section className="rewards-panel" role="tabpanel">
   {rewards.length?<div className="reward-grid">
    {rewards.map(reward=>{
     const imageSrc=rewardImageSrc(studentId,reward);
     return <article className={reward.active?'reward-card':'reward-card inactive'} key={reward.id}>
     <div className={imageSrc?'reward-visual has-image':'reward-visual'}>
      {imageSrc?<img alt={reward.name} src={imageSrc}/>:<Gift size={36}/>}
      <div className="reward-cost"><strong>{reward.requiredPoints}</strong><span>积分</span></div>
     </div>
     <div className="reward-body">
      <div className="reward-title-row">
       <h3>{reward.name}</h3>
       <RewardAction balance={points.balance} onRedeem={openRedeem} reward={reward}/>
      </div>
      {reward.description?<p>{reward.description}</p>:null}
     </div>
     <div className="hover-actions">
      <button aria-label={`编辑${reward.name}`} className="icon-button" onClick={()=>openEdit(reward)} title="编辑" type="button"><Pencil size={16}/></button>
      <button aria-label={`删除${reward.name}`} className="icon-button danger" onClick={()=>void remove(reward)} title="删除" type="button"><Trash2 size={16}/></button>
     </div>
    </article>;
    })}
    {rewards.length%2===1&&<button className="reward-add-tile" onClick={openCreate} type="button"><CirclePlus size={22}/>新增奖励</button>}
   </div>:<div className="rewards-empty"><Gift size={28}/><strong>还没有奖品</strong><p>先新增一个，再用积分兑换。</p></div>}
  </section>:tab==='earns'?<section className="rewards-panel" role="tabpanel">
   {earns.length?<div className="table-wrap earn-table-wrap">
    <table className="editor-table display-table earn-table">
     <thead>
      <tr><th>获得时间</th><th>来源说明</th><th>类型</th><th>积分</th></tr>
     </thead>
     <tbody>
      {earns.map(item=>{
       const when=formatRedeemedAt(item.createdAt);
       return <tr key={item.id}>
        <td>{when.date} {when.time}</td>
        <td><strong>{item.sourceLabel}</strong></td>
        <td>{earnSourceKind(item)}</td>
        <td>+{item.amount}</td>
       </tr>;
      })}
     </tbody>
    </table>
   </div>:<div className="rewards-empty"><strong>还没有积分获取记录</strong><p>完成学习任务会自动入账；也可登记微信群表扬等额外奖励。</p></div>}
  </section>:<section className="rewards-panel" role="tabpanel">
   {records.length?<div className="record-list">
    <div className="record-head"><span>兑换时间</span><span>奖品</span><span>数量</span><span>积分</span><span>状态</span></div>
    {records.map(item=>{
     const when=formatRedeemedAt(item.decidedAt||item.createdAt);
     return <article className="record-row" key={item.id}>
      <div className="record-time"><strong>{when.time}</strong><span>{when.date}</span></div>
      <div className="record-copy"><strong>{item.rewardName}</strong></div>
      <div className="record-qty"><strong>{item.quantity}</strong><span>份</span></div>
      <div className="record-cost"><strong>{item.requestedPoints}</strong><span>积分</span></div>
      <span className={`record-pill ${item.status==='approved'?'':item.status}`}>{redemptionLabel(item.status)}</span>
     </article>;
    })}
   </div>:<div className="rewards-empty"><strong>还没有兑换记录</strong><p>兑换成功后，会按时间出现在这里。</p></div>}
  </section>}

  {draft&&<Drawer onClose={closeDraft}>
   <form className="side-drawer" onSubmit={save}>
    <div className="drawer-head"><div><span className="eyebrow">Reward</span><h2>{draft.id?'编辑奖励':'新增奖励'}</h2></div><button className="icon-button" onClick={closeDraft} title="关闭" type="button"><X size={20}/></button></div>
    <div className="drawer-body">
     <button className="reward-image-picker" onClick={()=>imageRef.current?.click()} type="button">
      {imagePreview?<img alt="奖品图片预览" src={imagePreview}/>:<span><ImagePlus size={28}/><strong>上传诱惑图片</strong><em>让孩子一眼就想兑换</em></span>}
     </button>
     <input accept="image/jpeg,image/png,image/webp,image/gif" aria-label="奖品图片" hidden onChange={event=>setImageFile(event.target.files?.[0]??null)} ref={imageRef} type="file"/>
     <label>名称<input aria-label="名称" autoFocus required placeholder="例如：周末游戏 30 分钟" value={draft.name} onChange={event=>patchDraft({name:event.target.value})}/></label>
     <label>所需积分<input aria-label="所需积分" min="1" type="number" value={draft.requiredPoints} onChange={event=>patchDraft({requiredPoints:parseNumberInput(event.target.value)})}/></label>
     <label>描述<textarea aria-label="描述" rows={4} placeholder="说明兑换后可以得到什么" value={draft.description} onChange={event=>patchDraft({description:event.target.value})}/></label>
     <label className="drawer-toggle"><input checked={draft.active} onChange={event=>patchDraft({active:event.target.checked})} type="checkbox"/>启用这个奖励</label>
    </div>
    <div className="drawer-actions">
     <button className="secondary" onClick={closeDraft} type="button">取消</button>
     <button className="primary" type="submit">保存奖励</button>
    </div>
   </form>
  </Drawer>}

  {extraDraft&&<Drawer onClose={()=>setExtraDraft(null)}>
   <form className="side-drawer" onSubmit={saveExtra}>
    <div className="drawer-head"><div><span className="eyebrow">Extra Reward</span><h2>登记额外奖励</h2></div><button className="icon-button" onClick={()=>setExtraDraft(null)} title="关闭" type="button"><X size={20}/></button></div>
    <div className="drawer-body">
     <p className="drawer-help">用于记录学习任务以外的积分奖励，例如学校表扬、目标达成、家务等。</p>
     <label>奖励类型
      <select aria-label="奖励类型" value={extraDraft.category} onChange={event=>patchExtra({category:event.target.value as ExtraCategory})}>
       {extraCategories.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
     </label>
     <label>奖励积分<input aria-label="奖励积分" autoFocus min="1" type="number" value={extraDraft.amount} onChange={event=>patchExtra({amount:parseNumberInput(event.target.value)})}/></label>
     <label>补充说明<textarea aria-label="补充说明" rows={4} placeholder="选填，例如：微信群老师表扬课堂表演" value={extraDraft.note} onChange={event=>patchExtra({note:event.target.value})}/></label>
    </div>
    <div className="drawer-actions">
     <button className="secondary" onClick={()=>setExtraDraft(null)} type="button">取消</button>
     <button className="primary" type="submit">确认入账</button>
    </div>
   </form>
  </Drawer>}

  {redeemDraft&&<Drawer onClose={()=>setRedeemDraft(null)}>
   <form className="side-drawer" onSubmit={confirmRedeem}>
    <div className="drawer-head"><div><span className="eyebrow">Redeem</span><h2>兑换奖励</h2></div><button className="icon-button" onClick={()=>setRedeemDraft(null)} title="关闭" type="button"><X size={20}/></button></div>
    <div className="drawer-body">
     <p className="drawer-help">「{redeemDraft.reward.name}」每份 {redeemDraft.reward.requiredPoints} 分，当前可兑换 {points.balance} 分。</p>
     <label>兑换数量<input aria-label="兑换数量" autoFocus min="1" type="number" value={redeemDraft.quantity} onChange={event=>setRedeemDraft(current=>current?{...current,quantity:parseNumberInput(event.target.value)}:current)}/></label>
     <p className="redeem-cost-note">将消耗 {redeemDraft.quantity===''?'—':redeemDraft.reward.requiredPoints*redeemDraft.quantity} 分</p>
    </div>
    <div className="drawer-actions">
     <button className="secondary" onClick={()=>setRedeemDraft(null)} type="button">取消</button>
     <button className="primary" type="submit">确认兑换</button>
    </div>
   </form>
  </Drawer>}
 </div>;
}
