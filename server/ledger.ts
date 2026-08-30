import type { DatabaseSync } from 'node:sqlite';

export type LedgerEntry={id:number;studentId:number;entryType:string;amount:number;sourceType:string;sourceId:number;createdAt:string};

function mapEntry(row:Record<string,unknown>):LedgerEntry{
 return {id:Number(row.id),studentId:Number(row.student_id),entryType:String(row.entry_type),amount:Number(row.amount),sourceType:String(row.source_type),sourceId:Number(row.source_id),createdAt:String(row.created_at)};
}

export function pointsBalance(db:DatabaseSync,studentId:number){
 const row=db.prepare('SELECT COALESCE(SUM(amount),0) AS balance FROM point_ledger WHERE student_id=?').get(studentId) as {balance:number};
 return Number(row.balance);
}

export function listLedger(db:DatabaseSync,studentId:number){
 return db.prepare('SELECT * FROM point_ledger WHERE student_id=? ORDER BY id').all(studentId).map(row=>mapEntry(row as Record<string,unknown>));
}

export function addLedgerEntry(db:DatabaseSync,studentId:number,entryType:'earn'|'spend'|'adjust',amount:number,sourceType:string,sourceId:number){
 const now=new Date().toISOString();
 db.prepare('INSERT INTO point_ledger(student_id,entry_type,amount,source_type,source_id,created_at) VALUES (?,?,?,?,?,?)').run(studentId,entryType,amount,sourceType,sourceId,now);
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
