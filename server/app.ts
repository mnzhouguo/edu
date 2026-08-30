import { resolve } from 'node:path';
import express from 'express';
import multer from 'multer';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent,getStudent,listStudents,updateStudent } from './db.js';
import { isMonday,parseIsoDate } from './dates.js';
import { studentDashboard } from './dashboard.js';
import { parseEvaluation,upsertEvaluation } from './evaluations.js';
import { listLedger,pointsBalance,todayEarned } from './ledger.js';
import { getPhoto,readStoredPhoto,type UploadedFile } from './photos.js';
import { createWeeklyTask,deleteWeeklyTask,generateDailyPlan,getDailyTask,listDailyTasks,listWeeklyTasks,reorderDailyTasks,subjects,updateWeeklyTask,type WeeklyTaskInput } from './plans.js';
import { presentDailyTask,presentDailyTasks } from './present.js';
import { createMistake,deleteMistake,listMistakes,parseMistake,updateMistake } from './mistakes.js';
import { createRedemption,createReward,decideRedemption,listRedemptions,listRewards,parseReward,updateReward } from './rewards.js';
import { createMaterial,deleteMaterial,generateFromSubjectPlans,getSubjectPlan,parseMaterial,parseSubjectPlanUpdate,updateMaterial,updateSubjectPlan } from './subject-plans.js';
import { submitDailyTask } from './submissions.js';
import { createPlanItem,deletePlanItem,generatePlanItemTasks,listPlanItems,parsePlanItem,updatePlanItem } from './plan-items.js';
import { createStudentSubject,hasStudentSubject,listStudentSubjects } from './subjects.js';

export type AppOptions={photoLibrary?:string;maxPhotoBytes?:number};
function parseStudent(body:unknown){const value=body as Record<string,unknown>|null,input={name:String(value?.name??'').trim(),grade:String(value?.grade??'').trim(),school:String(value?.school??'').trim(),currentGoal:String(value?.currentGoal??'').trim()};return input.name?input:null}
function parseTask(body:unknown):WeeklyTaskInput|null{const value=body as Record<string,unknown>|null,input={weekStart:String(value?.weekStart??''),weekday:Number(value?.weekday),subject:String(value?.subject??''),content:String(value?.content??'').trim(),completionStandard:String(value?.completionStandard??'').trim(),suggestedDuration:Number(value?.suggestedDuration),basePoints:Number(value?.basePoints),taskOrder:Number(value?.taskOrder),sourceKnowledgeArea:value?.sourceKnowledgeArea===undefined||value.sourceKnowledgeArea===null?null:String(value.sourceKnowledgeArea)};if(!isMonday(input.weekStart)||!Number.isInteger(input.weekday)||input.weekday<1||input.weekday>7||!input.subject||!input.content||!input.completionStandard||!Number.isInteger(input.suggestedDuration)||input.suggestedDuration<=0||!Number.isInteger(input.basePoints)||input.basePoints<0||!Number.isInteger(input.taskOrder)||input.taskOrder<1)return null;return input as WeeklyTaskInput}
function uploaded(files:Express.Multer.File[]|undefined):UploadedFile[]{return (files??[]).map(file=>({buffer:file.buffer,originalname:Buffer.from(file.originalname,'latin1').toString('utf8'),mimetype:file.mimetype,size:file.size}))}

export function createApp(db:DatabaseSync,options:AppOptions={}){
 const photoLibrary=options.photoLibrary??resolve('data','photos');
 const maxPhotoBytes=options.maxPhotoBytes??5*1024*1024;
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:maxPhotoBytes,files:8}});
 const app=express();
 app.use(express.json({limit:'1mb'}));
 app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
 app.get('/api/students',(_req,res)=>res.json({students:listStudents(db)}));
 app.get('/api/students/:id',(req,res)=>{const student=getStudent(db,Number(req.params.id));return student?res.json({student}):res.status(404).json({message:'没有找到孩子档案'})});
 app.post('/api/students',(req,res)=>{const input=parseStudent(req.body);return input?res.status(201).json({student:createStudent(db,input)}):res.status(400).json({message:'姓名或昵称不能为空'})});
 app.put('/api/students/:id',(req,res)=>{const input=parseStudent(req.body);if(!input)return res.status(400).json({message:'姓名或昵称不能为空'});const student=updateStudent(db,Number(req.params.id),input);return student?res.json({student}):res.status(404).json({message:'没有找到孩子档案'})});
 app.get('/api/students/:id/weekly-tasks',(req,res)=>{const weekStart=String(req.query.weekStart??'');return isMonday(weekStart)?res.json({tasks:listWeeklyTasks(db,Number(req.params.id),weekStart)}):res.status(400).json({message:'周开始日期必须是有效的周一'})});
 app.post('/api/students/:id/weekly-tasks',(req,res)=>{const studentId=Number(req.params.id),input=parseTask(req.body);if(!input||!hasStudentSubject(db,studentId,input.subject))return res.status(400).json({message:'请完整填写任务和衡量标准'});if(!getStudent(db,studentId))return res.status(404).json({message:'没有找到孩子档案'});return res.status(201).json({task:createWeeklyTask(db,studentId,input)})});
 app.put('/api/students/:studentId/weekly-tasks/:id',(req,res)=>{const studentId=Number(req.params.studentId),input=parseTask(req.body);if(!input||!hasStudentSubject(db,studentId,input.subject))return res.status(400).json({message:'请完整填写任务和衡量标准'});const result=updateWeeklyTask(db,Number(req.params.studentId),Number(req.params.id),input);if(result.status==='locked')return res.status(409).json({message:'已提交的任务不能修改'});return result.status==='ok'?res.json({task:result.value}):res.status(404).json({message:'没有找到周计划任务'})});
 app.delete('/api/students/:studentId/weekly-tasks/:id',(req,res)=>{const result=deleteWeeklyTask(db,Number(req.params.studentId),Number(req.params.id));if(result.status==='locked')return res.status(409).json({message:'已提交的任务不能删除'});return result.status==='ok'?res.status(204).send():res.status(404).json({message:'没有找到周计划任务'})});
 app.post('/api/students/:id/daily-plan/generate',(req,res)=>{const date=String(req.body?.date??'');if(!parseIsoDate(date))return res.status(400).json({message:'日期无效'});return res.json({tasks:presentDailyTasks(db,generateDailyPlan(db,Number(req.params.id),date)??[])})});
 app.get('/api/students/:id/daily-tasks',(req,res)=>{const date=String(req.query.date??''),subject=req.query.subject?String(req.query.subject):undefined;return parseIsoDate(date)?res.json({tasks:presentDailyTasks(db,listDailyTasks(db,Number(req.params.id),date,subject))}):res.status(400).json({message:'日期无效'})});
 app.put('/api/daily-tasks/order',(req,res)=>{const studentId=Number(req.body?.studentId),date=String(req.body?.date??''),orderedIds=Array.isArray(req.body?.orderedIds)?req.body.orderedIds.map(Number):[];if(!parseIsoDate(date))return res.status(400).json({message:'日期无效'});const tasks=reorderDailyTasks(db,studentId,date,orderedIds);return tasks?res.json({tasks:presentDailyTasks(db,tasks)}):res.status(400).json({message:'任务排序数据无效'})});
 app.get('/api/students/:id/subjects',(req,res)=>res.json({subjects:listStudentSubjects(db,Number(req.params.id))}));
 app.post('/api/students/:id/subjects',(req,res)=>{
  const studentId=Number(req.params.id),label=String(req.body?.label??'').trim();
  if(!getStudent(db,studentId))return res.status(404).json({message:'没有找到孩子档案'});
  const subject=createStudentSubject(db,studentId,label);
  return subject?res.status(201).json({subject}):res.status(400).json({message:'科目名称不能为空'});
 }); app.get('/api/students/:id/subject-plans/:subject',(req,res)=>{
  const subject=String(req.params.subject);
  if(!hasStudentSubject(db,Number(req.params.id),subject))return res.status(400).json({message:'科目无效'});
  if(!getStudent(db,Number(req.params.id)))return res.status(404).json({message:'没有找到孩子档案'});
  return res.json({plan:getSubjectPlan(db,Number(req.params.id),subject as typeof subjects[number])});
 });
 app.put('/api/students/:id/subject-plans/:subject',(req,res)=>{
  const subject=String(req.params.subject);
  if(!hasStudentSubject(db,Number(req.params.id),subject))return res.status(400).json({message:'科目无效'});
  if(!getStudent(db,Number(req.params.id)))return res.status(404).json({message:'没有找到孩子档案'});
  const input=parseSubjectPlanUpdate(req.body,subject as typeof subjects[number]);
  if(!input)return res.status(400).json({message:'请完整填写科目规划'});
  return res.json({plan:updateSubjectPlan(db,Number(req.params.id),subject as typeof subjects[number],input)});
 });
 app.post('/api/students/:id/subject-plans/:subject/areas/:areaId/materials',(req,res)=>{
  const subject=String(req.params.subject);
  if(!hasStudentSubject(db,Number(req.params.id),subject))return res.status(400).json({message:'科目无效'});
  const input=parseMaterial(req.body);
  if(!input)return res.status(400).json({message:'请填写资料名称'});
  const material=createMaterial(db,Number(req.params.id),subject as typeof subjects[number],String(req.params.areaId),input);
  return material?res.status(201).json({material}):res.status(400).json({message:'知识模块无效'});
 });
 app.put('/api/students/:studentId/subject-plans/materials/:id',(req,res)=>{
  const input=parseMaterial(req.body);
  if(!input)return res.status(400).json({message:'请填写教材名称'});
  const material=updateMaterial(db,Number(req.params.studentId),Number(req.params.id),String(req.body?.areaId??''),input);
  return material?res.json({material}):res.status(404).json({message:'没有找到教材或知识方向无效'});
 }); app.delete('/api/students/:studentId/subject-plans/materials/:id',(req,res)=>{
  return deleteMaterial(db,Number(req.params.studentId),Number(req.params.id))?res.status(204).send():res.status(404).json({message:'没有找到学习资料'});
 });
 app.get('/api/students/:id/subject-plans/:subject/items',(req,res)=>{
  const subject=String(req.params.subject);
  if(!hasStudentSubject(db,Number(req.params.id),subject))return res.status(400).json({message:'科目无效'});
  return res.json({items:listPlanItems(db,Number(req.params.id),subject as typeof subjects[number])});
 });
 app.post('/api/students/:id/subject-plans/:subject/items',(req,res)=>{
  const subject=String(req.params.subject),input=parsePlanItem(req.body);
  if(!hasStudentSubject(db,Number(req.params.id),subject))return res.status(400).json({message:'科目无效'});
  if(!input)return res.status(400).json({message:'请完整填写规划事项'});
  if(!getStudent(db,Number(req.params.id)))return res.status(404).json({message:'没有找到孩子档案'});
  return res.status(201).json({item:createPlanItem(db,Number(req.params.id),subject as typeof subjects[number],input)});
 });
 app.put('/api/students/:studentId/subject-plans/items/:id',(req,res)=>{const input=parsePlanItem(req.body);if(!input)return res.status(400).json({message:'请完整填写规划事项'});const item=updatePlanItem(db,Number(req.params.studentId),Number(req.params.id),input);return item?res.json({item}):res.status(404).json({message:'没有找到规划事项'})});
 app.delete('/api/students/:studentId/subject-plans/items/:id',(req,res)=>deletePlanItem(db,Number(req.params.studentId),Number(req.params.id))?res.status(204).send():res.status(404).json({message:'没有找到规划事项'})); app.post('/api/students/:id/subject-plans/generate',(req,res)=>{
  const weekStart=String(req.body?.weekStart??'');
  if(!getStudent(db,Number(req.params.id)))return res.status(404).json({message:'没有找到孩子档案'});
  const studentId=Number(req.params.id);
  const hasItems=listStudentSubjects(db,studentId).some(subject=>listPlanItems(db,studentId,subject.id).length>0);
  const tasks=hasItems?generatePlanItemTasks(db,studentId,weekStart):generateFromSubjectPlans(db,studentId,weekStart);
  return tasks?res.json({tasks}):res.status(400).json({message:'周开始日期必须是有效的周一'});
 });
 app.post('/api/students/:studentId/daily-tasks/:id/submit',upload.array('photos',8),(req,res)=>{
  const studentId=Number(req.params.studentId);
  const result=submitDailyTask(db,photoLibrary,maxPhotoBytes,studentId,Number(req.params.id),String(req.body?.note??''),uploaded(req.files as Express.Multer.File[]|undefined));
  if(result.status==='not_found')return res.status(404).json({message:'没有找到今日任务'});
  if(result.status==='locked')return res.status(409).json({message:'已评价的任务不能再次提交'});
  if(result.status==='invalid')return res.status(400).json({message:result.message});
  return res.status(result.status==='created'?201:200).json({task:presentDailyTask(db,result.value),pointsBalance:pointsBalance(db,studentId)});
 });
 app.post('/api/students/:studentId/daily-tasks/:id/evaluations',(req,res)=>{
  const studentId=Number(req.params.studentId),input=parseEvaluation(req.body);
  if(!input)return res.status(400).json({message:'请选择完成结果'});
  const result=upsertEvaluation(db,studentId,Number(req.params.id),input);
  if(result.status==='not_found')return res.status(404).json({message:'没有找到今日任务'});
  const task=getDailyTask(db,studentId,Number(req.params.id))!;
  return res.json({task:presentDailyTask(db,task),pointsBalance:pointsBalance(db,studentId),todayEarned:todayEarned(db,studentId,task.taskDate)});
 });
 app.get('/api/students/:id/dashboard',(req,res)=>{
  const date=String(req.query.date??'');
  const dashboard=parseIsoDate(date)?studentDashboard(db,Number(req.params.id),date):null;
  return dashboard?res.json({dashboard}):res.status(400).json({message:'日期无效'});
 });
 app.get('/api/students/:id/points',(req,res)=>{
  const studentId=Number(req.params.id);
  if(!getStudent(db,studentId))return res.status(404).json({message:'没有找到孩子档案'});
  return res.json({balance:pointsBalance(db,studentId),entries:listLedger(db,studentId)});
 });
 app.get('/api/students/:id/rewards',(req,res)=>res.json({rewards:listRewards(db,Number(req.params.id))}));
 app.post('/api/students/:id/rewards',(req,res)=>{
  const input=parseReward(req.body);
  if(!input)return res.status(400).json({message:'奖励信息不完整或现金兑换比例不正确'});
  if(!getStudent(db,Number(req.params.id)))return res.status(404).json({message:'没有找到孩子档案'});
  return res.status(201).json({reward:createReward(db,Number(req.params.id),input)});
 });
 app.put('/api/students/:studentId/rewards/:id',(req,res)=>{
  const input=parseReward(req.body);
  if(!input)return res.status(400).json({message:'奖励信息不完整或现金兑换比例不正确'});
  const reward=updateReward(db,Number(req.params.studentId),Number(req.params.id),input);
  return reward?res.json({reward}):res.status(404).json({message:'没有找到奖励'});
 });
 app.get('/api/students/:id/redemptions',(req,res)=>res.json({requests:listRedemptions(db,Number(req.params.id))}));
 app.post('/api/students/:id/redemptions',(req,res)=>{
  const result=createRedemption(db,Number(req.params.id),Number(req.body?.rewardId));
  if(result.status==='not_found')return res.status(404).json({message:'没有找到奖励'});
  if(result.status==='inactive')return res.status(409).json({message:'该奖励已停用'});
  return res.status(201).json({request:result.value,pointsBalance:pointsBalance(db,Number(req.params.id))});
 });
 app.post('/api/students/:studentId/redemptions/:id/approve',(req,res)=>{
  const studentId=Number(req.params.studentId);
  const result=decideRedemption(db,studentId,Number(req.params.id),'approved');
  if(result.status==='not_found')return res.status(404).json({message:'没有找到兑换申请'});
  if(result.status==='insufficient')return res.status(409).json({message:'积分余额不足',request:result.value,pointsBalance:pointsBalance(db,studentId)});
  return res.json({request:result.value,pointsBalance:pointsBalance(db,studentId)});
 });
 app.post('/api/students/:studentId/redemptions/:id/reject',(req,res)=>{
  const studentId=Number(req.params.studentId);
  const result=decideRedemption(db,studentId,Number(req.params.id),'rejected',String(req.body?.note??''));
  if(result.status==='not_found')return res.status(404).json({message:'没有找到兑换申请'});
  return res.json({request:result.value,pointsBalance:pointsBalance(db,studentId)});
 });
 app.get('/api/students/:id/mistakes',(req,res)=>{
  const subject=req.query.subject?String(req.query.subject):undefined;
  return res.json({mistakes:listMistakes(db,Number(req.params.id),subject)});
 });
 app.post('/api/students/:id/mistakes',upload.array('photos',8),(req,res)=>{
  const input=parseMistake(req.body);
  if(!input)return res.status(400).json({message:'请完整填写错题记录'});
  if(!getStudent(db,Number(req.params.id)))return res.status(404).json({message:'没有找到孩子档案'});
  const result=createMistake(db,photoLibrary,maxPhotoBytes,Number(req.params.id),input,uploaded(req.files as Express.Multer.File[]|undefined));
  if(result.status==='invalid')return res.status(400).json({message:result.message});
  return res.status(201).json({mistake:result.value});
 });
 app.put('/api/students/:studentId/mistakes/:id',(req,res)=>{
  const input=parseMistake(req.body);
  if(!input)return res.status(400).json({message:'请完整填写错题记录'});
  const mistake=updateMistake(db,Number(req.params.studentId),Number(req.params.id),input);
  return mistake?res.json({mistake}):res.status(404).json({message:'没有找到错题记录'});
 });
 app.delete('/api/students/:studentId/mistakes/:id',(req,res)=>{
  return deleteMistake(db,photoLibrary,Number(req.params.studentId),Number(req.params.id))?res.status(204).send():res.status(404).json({message:'没有找到错题记录'});
 });
 app.get('/api/students/:studentId/photos/:id',(req,res)=>{
  const photo=getPhoto(db,Number(req.params.id),Number(req.params.studentId));
  if(!photo)return res.status(404).json({message:'没有找到照片'});
  const bytes=readStoredPhoto(photoLibrary,photo.relativePath);
  if(!bytes)return res.status(404).json({message:'照片文件不存在'});
  res.type(photo.mediaType).send(bytes);
 });
 app.use((error:unknown,_req:express.Request,res:express.Response,next:express.NextFunction)=>{
  if(error instanceof multer.MulterError&&error.code==='LIMIT_FILE_SIZE')return res.status(400).json({message:'图片超过大小限制'});
  return next(error);
 });
 app.use('/api',(_req,res)=>res.status(404).json({message:'接口不存在'}));
 return app;
}




