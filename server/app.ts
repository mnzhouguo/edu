import express from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { createStudent, getStudent, listStudents, updateStudent } from './db.js';

function parseStudent(body:unknown) {
  const value=body as Record<string,unknown>|null;
  const input={ name:String(value?.name??'').trim(), grade:String(value?.grade??'').trim(), school:String(value?.school??'').trim(), currentGoal:String(value?.currentGoal??'').trim() };
  return input.name ? input : null;
}
export function createApp(db:DatabaseSync) {
  const app=express();
  app.use(express.json({limit:'1mb'}));
  app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
  app.get('/api/students',(_req,res)=>res.json({students:listStudents(db)}));
  app.get('/api/students/:id',(req,res)=>{ const student=getStudent(db,Number(req.params.id)); return student ? res.json({student}) : res.status(404).json({message:'没有找到孩子档案'}); });
  app.post('/api/students',(req,res)=>{ const input=parseStudent(req.body); return input ? res.status(201).json({student:createStudent(db,input)}) : res.status(400).json({message:'姓名或昵称不能为空'}); });
  app.put('/api/students/:id',(req,res)=>{ const input=parseStudent(req.body); if(!input) return res.status(400).json({message:'姓名或昵称不能为空'}); const student=updateStudent(db,Number(req.params.id),input); return student ? res.json({student}) : res.status(404).json({message:'没有找到孩子档案'}); });
  app.use('/api',(_req,res)=>res.status(404).json({message:'接口不存在'}));
  return app;
}
