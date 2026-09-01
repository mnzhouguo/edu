import type { DatabaseSync,SQLInputValue } from 'node:sqlite';
import { dateInfo } from './dates.js';

export const extraRewardCategories=[
 {id:'school_praise',label:'学校表扬'},
 {id:'goal_achieved',label:'目标达成'},
 {id:'housework',label:'家务'},
 {id:'excellent_homework',label:'作业优秀'},
 {id:'other',label:'其他'},
] as const;
export type ExtraRewardCategory=typeof extraRewardCategories[number]['id'];

export type LedgerEntry={
 id:number;
 studentId:number;
 entryType:string;
 amount:number;
 sourceType:string;
 sourceId:number;
 category:string;
 categoryLabel:string;
 note:string;
 sourceLabel:string;
 createdAt:string;
};

export function extraRewardCategoryLabel(category:string){
 return extraRewardCategories.find(item=>item.id===category)?.label??'';
}

function sourceLabelFor(row:Record<string,unknown>){
 const note=String(row.note??'').trim();
 const sourceType=String(row.source_type);
 const categoryLabel=extraRewardCategoryLabel(String(row.category??''));
 if(sourceType==='extra_reward')return note||categoryLabel||'额外奖励';
 if(sourceType==='weekly_task'){
  const content=row.weekly_task_content==null?'' :String(row.weekly_task_content).trim();
  return content||(note||'学习任务');
 }
 if(sourceType==='evaluation'){
  const content=row.daily_task_content==null?'' :String(row.daily_task_content).trim();
  return content||(note||'任务评价');
 }
 if(sourceType==='redemption'){
  const name=row.reward_name==null?'' :String(row.reward_name).trim();
  return name||(note||'积分兑换');
 }
 return note||sourceType;
}

function mapEntry(row:Record<string,unknown>):LedgerEntry{
 const category=String(row.category??'');
 return {
  id:Number(row.id),
  studentId:Number(row.student_id),
  entryType:String(row.entry_type),
  amount:Number(row.amount),
  sourceType:String(row.source_type),
  sourceId:Number(row.source_id),
  category,
  categoryLabel:extraRewardCategoryLabel(category),
  note:String(row.note??''),
  sourceLabel:sourceLabelFor(row),
  createdAt:String(row.created_at),
 };
}

export function pointsBalance(db:DatabaseSync,studentId:number){
 const row=db.prepare('SELECT COALESCE(SUM(amount),0) AS balance FROM point_ledger WHERE student_id=?').get(studentId) as {balance:number};
 return Number(row.balance);
}

export function listLedger(db:DatabaseSync,studentId:number){
 return db.prepare(`SELECT l.*,
  wt.content AS weekly_task_content,
  dt.content AS daily_task_content,
  rr.reward_name AS reward_name
  FROM point_ledger l
  LEFT JOIN weekly_tasks wt ON l.source_type='weekly_task' AND wt.id=l.source_id
  LEFT JOIN evaluations e ON l.source_type='evaluation' AND e.id=l.source_id
  LEFT JOIN daily_tasks dt ON e.daily_task_id=dt.id
  LEFT JOIN redemption_requests rr ON l.source_type='redemption' AND rr.id=l.source_id
  WHERE l.student_id=?
  ORDER BY l.id`).all(studentId).map(row=>mapEntry(row as Record<string,unknown>));
}

export function getLedgerEntry(db:DatabaseSync,studentId:number,id:number){
 return listLedger(db,studentId).find(entry=>entry.id===id)??null;
}

export function purgeOrphanWeeklyTaskLedger(db:DatabaseSync){
 db.exec("DELETE FROM point_ledger WHERE source_type='weekly_task' AND source_id NOT IN (SELECT id FROM weekly_tasks)");
}

export function addLedgerEntry(db:DatabaseSync,studentId:number,entryType:'earn'|'spend'|'adjust',amount:number,sourceType:string,sourceId:number,note='',category=''){
 const now=new Date().toISOString();
 const result=db.prepare('INSERT INTO point_ledger(student_id,entry_type,amount,source_type,source_id,note,category,created_at) VALUES (?,?,?,?,?,?,?,?)')
  .run(studentId,entryType,amount,sourceType,sourceId,note.trim(),category,now);
 return Number(result.lastInsertRowid);
}

export function parseExtraReward(body:unknown):{amount:number;category:ExtraRewardCategory;note:string}|null{
 const value=body as Record<string,unknown>|null;
 const amount=Number(value?.amount);
 const category=String(value?.category??'') as ExtraRewardCategory;
 const note=String(value?.note??'').trim();
 if(!Number.isInteger(amount)||amount<=0)return null;
 if(!extraRewardCategories.some(item=>item.id===category))return null;
 return {amount,category,note};
}

export function createExtraReward(db:DatabaseSync,studentId:number,input:{amount:number;category:ExtraRewardCategory;note:string}){
 const id=addLedgerEntry(db,studentId,'earn',input.amount,'extra_reward',0,input.note,input.category);
 return getLedgerEntry(db,studentId,id)!;
}

export function todayEarned(db:DatabaseSync,studentId:number,date:string){
 const row=db.prepare(`SELECT COALESCE(SUM(l.amount),0) AS total FROM point_ledger l
  JOIN evaluations e ON e.id=l.source_id AND l.source_type='evaluation'
  JOIN daily_tasks t ON t.id=e.daily_task_id
  WHERE l.student_id=? AND t.task_date=?`).get(studentId,date) as {total:number};
 return Number(row.total);
}

export function spentOnDate(db:DatabaseSync,studentId:number,date:string){
 const row=db.prepare(`SELECT COALESCE(SUM(-amount),0) AS total FROM point_ledger WHERE student_id=? AND entry_type='spend' AND date(created_at)=?`).get(studentId,date) as {total:number};
 return Number(row.total);
}

function localIsoDate(date=new Date()){
 const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');
 return `${year}-${month}-${day}`;
}

function addDays(iso:string,days:number){
 const date=new Date(`${iso}T00:00:00Z`);
 date.setUTCDate(date.getUTCDate()+days);
 return date.toISOString().slice(0,10);
}

function sumLedger(db:DatabaseSync,sql:string,params:SQLInputValue[]){
 const row=db.prepare(sql).get(...params) as {total:number};
 return Number(row.total);
}

export function totalEarned(db:DatabaseSync,studentId:number){
 return sumLedger(db,"SELECT COALESCE(SUM(amount),0) AS total FROM point_ledger WHERE student_id=? AND entry_type IN ('earn','adjust')",[studentId]);
}

export function earnedOnDate(db:DatabaseSync,studentId:number,date:string){
 return sumLedger(db,"SELECT COALESCE(SUM(amount),0) AS total FROM point_ledger WHERE student_id=? AND entry_type IN ('earn','adjust') AND date(created_at)=?",[studentId,date]);
}

export function earnedBetween(db:DatabaseSync,studentId:number,start:string,end:string){
 return sumLedger(db,"SELECT COALESCE(SUM(amount),0) AS total FROM point_ledger WHERE student_id=? AND entry_type IN ('earn','adjust') AND date(created_at) BETWEEN ? AND ?",[studentId,start,end]);
}

export function spentBetween(db:DatabaseSync,studentId:number,start:string,end:string){
 return sumLedger(db,"SELECT COALESCE(SUM(-amount),0) AS total FROM point_ledger WHERE student_id=? AND entry_type='spend' AND date(created_at) BETWEEN ? AND ?",[studentId,start,end]);
}

export function pointsOverview(db:DatabaseSync,studentId:number,today=localIsoDate()){
 const info=dateInfo(today);
 const weekStart=info?.weekStart??today;
 const weekEnd=addDays(weekStart,6);
 const balance=pointsBalance(db,studentId);
 const earned=totalEarned(db,studentId);
 const weekEarned=sumLedger(db,"SELECT COALESCE(SUM(amount),0) AS total FROM point_ledger WHERE student_id=? AND entry_type IN ('earn','adjust') AND date(created_at) BETWEEN ? AND ?",[studentId,weekStart,weekEnd]);
 const weekRedeemed=sumLedger(db,"SELECT COALESCE(SUM(-amount),0) AS total FROM point_ledger WHERE student_id=? AND entry_type='spend' AND source_type='redemption' AND date(created_at) BETWEEN ? AND ?",[studentId,weekStart,weekEnd]);
 const weekExpiring=Math.min(balance,Math.max(0,weekEarned-weekRedeemed));
 return {balance,totalEarned:earned,weekEarned,weekRedeemed,weekExpiring,weekStart,weekEnd};
}
