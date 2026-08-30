import type { DatabaseSync } from 'node:sqlite';
import { addLedgerEntry,pointsBalance } from './ledger.js';

export const rewardCategories=['cash','game_time','movie','activity','gift'] as const;
export type RewardInput={name:string;category:typeof rewardCategories[number];requiredPoints:number;cashAmount:number|null;description:string;active:boolean};

function mapReward(row:Record<string,unknown>){
 return {id:Number(row.id),studentId:Number(row.student_id),name:String(row.name),category:String(row.category),requiredPoints:Number(row.required_points),cashAmount:row.cash_amount===null?null:Number(row.cash_amount),description:String(row.description),active:Boolean(row.active)};
}
function mapRequest(row:Record<string,unknown>){
 return {id:Number(row.id),studentId:Number(row.student_id),rewardId:row.reward_id===null?null:Number(row.reward_id),rewardName:String(row.reward_name),rewardCategory:String(row.reward_category),requestedPoints:Number(row.requested_points),status:String(row.status),note:String(row.note),createdAt:String(row.created_at),decidedAt:row.decided_at===null?null:String(row.decided_at)};
}

export function cashRateValid(requiredPoints:number,cashAmount:number|null){
 return cashAmount!==null&&requiredPoints*5===cashAmount*100;
}

export function parseReward(body:unknown):RewardInput|null{
 const value=body as Record<string,unknown>|null;
 const name=String(value?.name??'').trim();
 const category=String(value?.category??'');
 const requiredPoints=Number(value?.requiredPoints);
 const cashAmount=value?.cashAmount===undefined||value?.cashAmount===null?null:Number(value.cashAmount);
 const description=String(value?.description??'').trim();
 const active=value?.active===undefined?true:Boolean(value.active);
 if(!name||!rewardCategories.includes(category as RewardInput['category'])||!Number.isInteger(requiredPoints)||requiredPoints<=0)return null;
 if(category==='cash'&&(cashAmount===null||!Number.isInteger(cashAmount)||!cashRateValid(requiredPoints,cashAmount)))return null;
 if(category!=='cash'&&cashAmount!==null)return null;
 return {name,category:category as RewardInput['category'],requiredPoints,cashAmount,description,active};
}

export function listRewards(db:DatabaseSync,studentId:number){return db.prepare('SELECT * FROM rewards WHERE student_id=? ORDER BY id').all(studentId).map(row=>mapReward(row as Record<string,unknown>))}
export function getReward(db:DatabaseSync,studentId:number,id:number){const row=db.prepare('SELECT * FROM rewards WHERE id=? AND student_id=?').get(id,studentId);return row?mapReward(row as Record<string,unknown>):null}
export function createReward(db:DatabaseSync,studentId:number,input:RewardInput){
 const now=new Date().toISOString();
 const result=db.prepare('INSERT INTO rewards(student_id,name,category,required_points,cash_amount,description,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(studentId,input.name,input.category,input.requiredPoints,input.cashAmount,input.description,input.active?1:0,now,now);
 return getReward(db,studentId,Number(result.lastInsertRowid))!;
}
export function updateReward(db:DatabaseSync,studentId:number,id:number,input:RewardInput){
 if(!getReward(db,studentId,id))return null;
 db.prepare('UPDATE rewards SET name=?,category=?,required_points=?,cash_amount=?,description=?,active=?,updated_at=? WHERE id=? AND student_id=?').run(input.name,input.category,input.requiredPoints,input.cashAmount,input.description,input.active?1:0,new Date().toISOString(),id,studentId);
 return getReward(db,studentId,id);
}

export function listRedemptions(db:DatabaseSync,studentId:number){return db.prepare('SELECT * FROM redemption_requests WHERE student_id=? ORDER BY id').all(studentId).map(row=>mapRequest(row as Record<string,unknown>))}
export function getRedemption(db:DatabaseSync,studentId:number,id:number){const row=db.prepare('SELECT * FROM redemption_requests WHERE id=? AND student_id=?').get(id,studentId);return row?mapRequest(row as Record<string,unknown>):null}

export function createRedemption(db:DatabaseSync,studentId:number,rewardId:number){
 const reward=getReward(db,studentId,rewardId);
 if(!reward)return {status:'not_found' as const};
 if(!reward.active)return {status:'inactive' as const};
 const now=new Date().toISOString();
 const result=db.prepare('INSERT INTO redemption_requests(student_id,reward_id,reward_name,reward_category,requested_points,status,note,created_at,decided_at) VALUES (?,?,?,?,?,?,?,?,?)').run(studentId,reward.id,reward.name,reward.category,reward.requiredPoints,'pending','',now,null);
 return {status:'ok' as const,value:getRedemption(db,studentId,Number(result.lastInsertRowid))!};
}

export function decideRedemption(db:DatabaseSync,studentId:number,id:number,decision:'approved'|'rejected',note=''){
 const request=getRedemption(db,studentId,id);
 if(!request)return {status:'not_found' as const};
 if(request.status!=='pending')return {status:'ok' as const,value:request};
 if(decision==='approved'&&pointsBalance(db,studentId)<request.requestedPoints)return {status:'insufficient' as const,value:request};
 const now=new Date().toISOString();
 db.exec('BEGIN');
 try{
  db.prepare('UPDATE redemption_requests SET status=?,note=?,decided_at=? WHERE id=? AND student_id=?').run(decision,note,now,id,studentId);
  if(decision==='approved')addLedgerEntry(db,studentId,'spend',-request.requestedPoints,'redemption',id);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
 return {status:'ok' as const,value:getRedemption(db,studentId,id)!};
}
