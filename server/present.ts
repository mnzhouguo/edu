import type { DatabaseSync } from 'node:sqlite';
import { getEvaluationForTask } from './evaluations.js';
import { getDailyTask,listDailyTasks } from './plans.js';
import { getSubmissionForTask } from './submissions.js';

export function presentDailyTask(db:DatabaseSync,task:NonNullable<ReturnType<typeof getDailyTask>>){
 const evaluation=getEvaluationForTask(db,task.id);
 const estimatedPoints=evaluation&&!evaluation.confirmed?evaluation.earnedPoints:task.basePoints;
 return {...task,estimatedPoints,earnedPoints:evaluation?.confirmed?evaluation.earnedPoints:null,submission:getSubmissionForTask(db,task.id),evaluation};
}

export function presentDailyTasks(db:DatabaseSync,tasks:ReturnType<typeof listDailyTasks>){
 return tasks.map(task=>presentDailyTask(db,task));
}
