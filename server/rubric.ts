export type RubricDimension={id:string;name:string;weightPercent:number;maxPoints:number};
export type EvaluationRubric={dimensions:RubricDimension[]};

export const defaultDimensionWeights=[{name:'字迹与过程',weightPercent:40},{name:'专注度',weightPercent:30},{name:'正确率',weightPercent:30}] as const;

export function allocateByWeight(totalPoints:number,weights:number[]){
 if(!weights.length)return [];
 const safeTotal=Math.max(0,Math.floor(totalPoints));
 const raw=weights.map(weight=>safeTotal*weight/100);
 const floors=raw.map(Math.floor);
 let remain=safeTotal-floors.reduce((sum,value)=>sum+value,0);
 const order=raw.map((value,index)=>({index,fraction:value-floors[index]})).sort((a,b)=>b.fraction-a.fraction);
 const points=[...floors];
 for(let step=0;step<remain;step+=1)points[order[step%order.length].index]+=1;
 return points;
}

export function allocatedPoints(rubric:EvaluationRubric){
 return rubric.dimensions.reduce((sum,dimension)=>sum+dimension.maxPoints,0);
}

export function summarizeRubric(rubric:EvaluationRubric){
 return rubric.dimensions.map(dimension=>`${dimension.name} ${dimension.maxPoints}分`).join('；');
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
  const weightPercent=item.weightPercent===undefined?Math.round(Number(item.maxPoints)||0):Number(item.weightPercent);
  if(!id||!name||!Number.isInteger(maxPoints)||maxPoints<0||!Number.isInteger(weightPercent)||weightPercent<0)return null;
  dimensions.push({id,name,weightPercent,maxPoints});
 }
 if(!dimensions.length)return null;
 return {dimensions};
}

export function validateRubricAgainstTotal(rubric:EvaluationRubric,totalPoints:number){
 if(!Number.isInteger(totalPoints)||totalPoints<0)return '总分无效';
 const allocated=allocatedPoints(rubric);
 if(allocated>totalPoints)return `评价维度合计 ${allocated} 分，不能超过总分 ${totalPoints} 分`;
 if(!rubric.dimensions.length)return '请至少配置一个评价维度';
 if(rubric.dimensions.some(dimension=>!dimension.name.trim()))return '请填写维度名称';
 if(allocated===0&&totalPoints>0)return '请为评价维度分配分值';
 return null;
}

export function readStoredRubric(raw:unknown):EvaluationRubric|null{
 if(raw==null||raw==='')return null;
 return parseEvaluationRubric(raw);
}

export function defaultRubric(totalPoints=10):EvaluationRubric{
 const points=allocateByWeight(totalPoints,defaultDimensionWeights.map(item=>item.weightPercent));
 return {dimensions:defaultDimensionWeights.map((item,index)=>({
  id:`default_${['handwriting','focus','accuracy'][index]}`,
  name:item.name,
  weightPercent:item.weightPercent,
  maxPoints:points[index]??0,
 }))};
}
