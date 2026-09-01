import type { DatabaseSync } from 'node:sqlite';
import { addLedgerEntry,pointsBalance } from './ledger.js';

export const rewardCategories=['cash','game_time','movie','activity','gift'] as const;
export type RewardInput={name:string;category:typeof rewardCategories[number];requiredPoints:number;cashAmount:number|null;description:string;active:boolean};

function mapReward(row:Record<string,unknown>){
 return {id:Number(row.id),name:String(row.name),category:String(row.category),requiredPoints:Number(row.required_points),cashAmount:row.cash_amount===null?null:Number(row.cash_amount),description:String(row.description),active:Boolean(row.active),hasImage:Boolean(row.image_path),updatedAt:String(row.updated_at)};
}
function mapRequest(row:Record<string,unknown>){
 return {id:Number(row.id),studentId:Number(row.student_id),rewardId:row.reward_id===null?null:Number(row.reward_id),rewardName:String(row.reward_name),rewardCategory:String(row.reward_category),quantity:Number(row.quantity??1),requestedPoints:Number(row.requested_points),status:String(row.status),note:String(row.note),createdAt:String(row.created_at),decidedAt:row.decided_at===null?null:String(row.decided_at)};
}

export function parseRedemptionQuantity(value:unknown){
 if(value===undefined||value===null||value==='')return 1;
 const quantity=Number(value);
 return Number.isInteger(quantity)&&quantity>=1?quantity:null;
}

export function cashRateValid(requiredPoints:number,cashAmount:number|null){
 return cashAmount!==null&&requiredPoints*5===cashAmount*100;
}

export function parseReward(body:unknown):RewardInput|null{
 const value=body as Record<string,unknown>|null;
 const name=String(value?.name??'').trim();
 const category=String(value?.category??'gift');
 const requiredPoints=Number(value?.requiredPoints);
 const cashAmount=value?.cashAmount===undefined||value?.cashAmount===null?null:Number(value.cashAmount);
 const description=String(value?.description??'').trim();
 const active=value?.active===undefined?true:Boolean(value.active);
 if(!name||!rewardCategories.includes(category as RewardInput['category'])||!Number.isInteger(requiredPoints)||requiredPoints<=0)return null;
 if(category==='cash'&&(cashAmount===null||!Number.isInteger(cashAmount)||!cashRateValid(requiredPoints,cashAmount)))return null;
 if(category!=='cash'&&cashAmount!==null)return null;
 return {name,category:category as RewardInput['category'],requiredPoints,cashAmount,description,active};
}

export function listRewards(db:DatabaseSync){return db.prepare('SELECT * FROM rewards ORDER BY id').all().map(row=>mapReward(row as Record<string,unknown>))}
export function getReward(db:DatabaseSync,id:number){const row=db.prepare('SELECT * FROM rewards WHERE id=?').get(id);return row?mapReward(row as Record<string,unknown>):null}
export function createReward(db:DatabaseSync,input:RewardInput){
 const now=new Date().toISOString();
 const result=db.prepare('INSERT INTO rewards(name,category,required_points,cash_amount,description,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(input.name,input.category,input.requiredPoints,input.cashAmount,input.description,input.active?1:0,now,now);
 return getReward(db,Number(result.lastInsertRowid))!;
}
export function updateReward(db:DatabaseSync,id:number,input:RewardInput){
 if(!getReward(db,id))return null;
 db.prepare('UPDATE rewards SET name=?,category=?,required_points=?,cash_amount=?,description=?,active=?,updated_at=? WHERE id=?').run(input.name,input.category,input.requiredPoints,input.cashAmount,input.description,input.active?1:0,new Date().toISOString(),id);
 return getReward(db,id);
}
export function rewardImagePath(db:DatabaseSync,id:number){
 const row=db.prepare('SELECT image_path FROM rewards WHERE id=?').get(id) as {image_path:string|null}|undefined;
 return row?row.image_path:undefined;
}
export function setRewardImagePath(db:DatabaseSync,id:number,imagePath:string|null){
 const result=db.prepare('UPDATE rewards SET image_path=?,updated_at=? WHERE id=?').run(imagePath,new Date().toISOString(),id);
 return result.changes?getReward(db,id):null;
}
export function deleteReward(db:DatabaseSync,id:number){
 return Boolean(db.prepare('DELETE FROM rewards WHERE id=?').run(id).changes);
}

export function listRedemptions(db:DatabaseSync,studentId:number){return db.prepare('SELECT * FROM redemption_requests WHERE student_id=? ORDER BY datetime(COALESCE(decided_at,created_at)) DESC,id DESC').all(studentId).map(row=>mapRequest(row as Record<string,unknown>))}
export function getRedemption(db:DatabaseSync,studentId:number,id:number){const row=db.prepare('SELECT * FROM redemption_requests WHERE id=? AND student_id=?').get(id,studentId);return row?mapRequest(row as Record<string,unknown>):null}

export function createRedemption(db:DatabaseSync,studentId:number,rewardId:number,quantity=1){
 const reward=getReward(db,rewardId);
 if(!reward)return {status:'not_found' as const};
 if(!reward.active)return {status:'inactive' as const};
 const requestedPoints=reward.requiredPoints*quantity;
 if(pointsBalance(db,studentId)<requestedPoints)return {status:'insufficient' as const};
 const now=new Date().toISOString();
 db.exec('BEGIN');
 try{
  const result=db.prepare('INSERT INTO redemption_requests(student_id,reward_id,reward_name,reward_category,quantity,requested_points,status,note,created_at,decided_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(studentId,reward.id,reward.name,reward.category,quantity,requestedPoints,'approved','',now,now);
  const id=Number(result.lastInsertRowid);
  addLedgerEntry(db,studentId,'spend',-requestedPoints,'redemption',id);
  db.exec('COMMIT');
  return {status:'ok' as const,value:getRedemption(db,studentId,id)!};
 }catch(error){db.exec('ROLLBACK');throw error}
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
