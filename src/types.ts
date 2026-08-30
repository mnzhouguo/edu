export type Student={id:number;name:string;grade:string;school:string;currentGoal:string};
export type Subject='chinese'|'math'|'english'|'physics'|'history';
export type WeeklyTask={id:number;studentId:number;weekStart:string;weekday:number;subject:Subject;content:string;completionStandard:string;suggestedDuration:number;basePoints:number;taskOrder:number};
export type DailyTask={id:number;studentId:number;sourceWeeklyTaskId:number;taskDate:string;subject:Subject;content:string;completionStandard:string;suggestedDuration:number;basePoints:number;taskOrder:number;status:string};
export const subjects:{id:Subject;label:string}[]=[{id:'chinese',label:'语文'},{id:'math',label:'数学'},{id:'english',label:'英语'},{id:'physics',label:'物理'},{id:'history',label:'历史'}];
export const subjectLabel=(subject:Subject)=>subjects.find(item=>item.id===subject)?.label??subject;
