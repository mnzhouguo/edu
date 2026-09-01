export function dayTaskOverview(tasks:{executionStatus:string;basePoints:number;earnedPoints:number|null}[]){
 const unfinished=tasks.filter(task=>task.executionStatus==='not_started'||task.executionStatus==='deferred');
 return {
  total:tasks.length,
  completed:tasks.filter(task=>task.executionStatus==='completed').length,
  availablePoints:unfinished.reduce((sum,task)=>sum+task.basePoints,0),
  earnedPoints:tasks.reduce((sum,task)=>sum+(task.earnedPoints??0),0),
 };
}
