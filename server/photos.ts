import { getStudent,setStudentAvatarPath,studentAvatarPath } from './db.js';
import { getReward,rewardImagePath,setRewardImagePath } from './rewards.js';
import { randomBytes } from 'node:crypto';
import { existsSync,mkdirSync,readFileSync,unlinkSync,writeFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

export const allowedTypes={ 'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif' } as const;
export type UploadedFile={buffer:Buffer;originalname:string;mimetype:string;size:number};
export type PhotoRecord={id:number;studentId:number;ownerType:string;ownerId:number;relativePath:string;mediaType:string;originalFilename:string;size:number;createdAt:string};

export function validatePhoto(file:UploadedFile,maxBytes:number){
 if(!(file.mimetype in allowedTypes))return '不支持的图片类型';
 if(file.size>maxBytes)return '图片超过大小限制';
 return null;
}

export function writePhoto(library:string,file:UploadedFile){
 mkdirSync(library,{recursive:true});
 const ext=allowedTypes[file.mimetype as keyof typeof allowedTypes];
 const relativePath=`${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;
 writeFileSync(join(library,relativePath),file.buffer);
 return {relativePath,mediaType:file.mimetype,originalFilename:file.originalname.replace(/[/\\]/g,'_'),size:file.size};
}

export function removeWritten(library:string,relativePaths:string[]){
 const root=resolve(library);
 for(const name of relativePaths){const full=resolve(library,name);if(full.startsWith(root)&&existsSync(full))unlinkSync(full)}
}

export function readStoredPhoto(library:string,relativePath:string){
 const root=resolve(library),full=resolve(library,relativePath);
 if(!full.startsWith(root)||!existsSync(full))return null;
 return readFileSync(full);
}

function mapPhoto(row:Record<string,unknown>):PhotoRecord{
 return {id:Number(row.id),studentId:Number(row.student_id),ownerType:String(row.owner_type),ownerId:Number(row.owner_id),relativePath:String(row.relative_path),mediaType:String(row.media_type),originalFilename:String(row.original_filename),size:Number(row.size),createdAt:String(row.created_at)};
}

export function insertPhoto(db:DatabaseSync,studentId:number,ownerType:'submission'|'mistake',ownerId:number,stored:ReturnType<typeof writePhoto>){
 const now=new Date().toISOString();
 const result=db.prepare('INSERT INTO photos(student_id,owner_type,owner_id,relative_path,media_type,original_filename,size,created_at) VALUES (?,?,?,?,?,?,?,?)').run(studentId,ownerType,ownerId,stored.relativePath,stored.mediaType,stored.originalFilename,stored.size,now);
 return getPhoto(db,Number(result.lastInsertRowid));
}

export function getPhoto(db:DatabaseSync,id:number,studentId?:number){const row=studentId===undefined?db.prepare('SELECT * FROM photos WHERE id=?').get(id):db.prepare('SELECT * FROM photos WHERE id=? AND student_id=?').get(id,studentId);return row?mapPhoto(row as Record<string,unknown>):null}
export function listPhotos(db:DatabaseSync,ownerType:'submission'|'mistake',ownerId:number){return db.prepare('SELECT * FROM photos WHERE owner_type=? AND owner_id=? ORDER BY id').all(ownerType,ownerId).map(row=>mapPhoto(row as Record<string,unknown>))}

export function mediaTypeForPath(relativePath:string){
 const lower=relativePath.toLowerCase();
 if(lower.endsWith('.jpg')||lower.endsWith('.jpeg'))return 'image/jpeg';
 if(lower.endsWith('.png'))return 'image/png';
 if(lower.endsWith('.webp'))return 'image/webp';
 if(lower.endsWith('.gif'))return 'image/gif';
 return 'application/octet-stream';
}

export function replaceStudentAvatar(db:DatabaseSync,library:string,studentId:number,file:UploadedFile,maxBytes:number){
 if(!getStudent(db,studentId))return {status:'not_found' as const};
 const message=validatePhoto(file,maxBytes);
 if(message)return {status:'invalid' as const,message};
 const previous=studentAvatarPath(db,studentId);
 const stored=writePhoto(library,file);
 const student=setStudentAvatarPath(db,studentId,stored.relativePath);
 if(previous)removeWritten(library,[previous]);
 return {status:'ok' as const,student:student!};
}

export function replaceRewardImage(db:DatabaseSync,library:string,rewardId:number,file:UploadedFile,maxBytes:number){
 if(!getReward(db,rewardId))return {status:'not_found' as const};
 const message=validatePhoto(file,maxBytes);
 if(message)return {status:'invalid' as const,message};
 const previous=rewardImagePath(db,rewardId);
 const stored=writePhoto(library,file);
 const reward=setRewardImagePath(db,rewardId,stored.relativePath);
 if(previous)removeWritten(library,[previous]);
 return {status:'ok' as const,reward:reward!};
}
