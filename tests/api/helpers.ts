import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../server/app.js';
import { openDatabase } from '../../server/db.js';

export const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
export const weeklyTask = {weekStart:'2026-08-24',weekday:7,subject:'chinese',content:'复习《桃花源记》并完成练习',completionStandard:'完成教材练习，正确率达到80%',suggestedDuration:45,basePoints:10,taskOrder:1};

export function tempWorkspace(){
 const directory=mkdtempSync(join(tmpdir(),'edu-'));
 return {directory,databasePath:join(directory,'test.sqlite'),photoLibrary:join(directory,'photos')};
}

export function openApp(directory:{databasePath:string;photoLibrary:string},maxPhotoBytes=1024*1024){
 const db=openDatabase(directory.databasePath);
 return {db,app:createApp(db,{photoLibrary:directory.photoLibrary,maxPhotoBytes})};
}

export async function createStudent(app:Express,name='小周'){
 return (await request(app).post('/api/students').send({name,grade:'初二'}).expect(201)).body.student.id as number;
}

export async function generateTask(app:Express,studentId:number,overrides:Partial<typeof weeklyTask>={}){
 await request(app).post(`/api/students/${studentId}/weekly-tasks`).send({...weeklyTask,...overrides}).expect(201);
 const tasks=(await request(app).post(`/api/students/${studentId}/daily-plan/generate`).send({date:'2026-08-30'}).expect(200)).body.tasks;
 return tasks.find((task:{content:string})=>task.content===(overrides.content??weeklyTask.content)) as {id:number;basePoints:number;status:string};
}
