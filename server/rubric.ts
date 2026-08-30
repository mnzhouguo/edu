export type RubricLevel={id:string;label:string;points:number};
export type RubricDimension={id:string;name:string;maxPoints:number;levels:RubricLevel[]};
export type EvaluationRubric={dimensions:RubricDimension[]};

export function allocatedPoints(rubric:EvaluationRubric){
 return rubric.dimensions.reduce((sum,dimension)=>sum+dimension.maxPoints,0);
}

export function summarizeRubric(rubric:EvaluationRubric){
 return rubric.dimensions.map(dimension=>{
  const levels=dimension.levels.map(level=>`${level.label}${level.points}分`).join(' / ');
  return `${dimension.name}（${dimension.maxPoints}分）：${levels}`;
 }).join('；');
}

export function parseEvaluationRubric(value:unknown):EvaluationRubric|null{
 if(value==null)return null;
 const raw=typeof value==='string'?(()=>{try{return JSON.parse(value)}catch{return null}})():value;
 if(!raw||typeof raw!=='object'||!Array.isArray((raw as {dimensions?:unknown}).dimensions))return null;
 const dimensions:RubricDimension[]=[];
 for(const entry of (raw as {dimensions:unknown[]}).dimensions){
  if(!entry||typeof entry!=='object')return null;
  const item=entry as Record<string,unknown>;
  const id=String(item.id??'').trim(),name=String(item.name??'').trim(),maxPoints=Number(item.maxPoints);
  if(!id||!name||!Number.isInteger(maxPoints)||maxPoints<0||!Array.isArray(item.levels)||!item.levels.length)return null;
  const levels:RubricLevel[]=[];
  for(const levelEntry of item.levels){
   if(!levelEntry||typeof levelEntry!=='object')return null;
   const level=levelEntry as Record<string,unknown>;
   const levelId=String(level.id??'').trim(),label=String(level.label??'').trim(),points=Number(level.points);
   if(!levelId||!label||!Number.isInteger(points)||points<0||points>maxPoints)return null;
   levels.push({id:levelId,label,points});
  }
  if(!levels.some(level=>level.points===maxPoints))return null;
  dimensions.push({id,name,maxPoints,levels});
 }
 if(!dimensions.length)return null;
 return {dimensions};
}

export function validateRubricAgainstTotal(rubric:EvaluationRubric,totalPoints:number){
 if(!Number.isInteger(totalPoints)||totalPoints<0)return '总分无效';
 const allocated=allocatedPoints(rubric);
 if(allocated>totalPoints)return `评价维度合计 ${allocated} 分，不能超过总分 ${totalPoints} 分`;
 if(allocated===0)return '请至少配置一个有分值的评价维度';
 return null;
}

export function readStoredRubric(raw:unknown):EvaluationRubric|null{
 if(raw==null||raw==='')return null;
 return parseEvaluationRubric(raw);
}
