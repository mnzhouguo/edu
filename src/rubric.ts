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

export function validateRubricAgainstTotal(rubric:EvaluationRubric,totalPoints:number){
 if(!Number.isInteger(totalPoints)||totalPoints<0)return '总分无效';
 const allocated=allocatedPoints(rubric);
 if(allocated>totalPoints)return `评价维度合计 ${allocated} 分，不能超过总分 ${totalPoints} 分`;
 if(!rubric.dimensions.length)return '请至少配置一个评价维度';
 if(rubric.dimensions.some(dimension=>!dimension.name.trim()))return '请填写维度名称';
 if(allocated===0&&totalPoints>0)return '请为评价维度分配分值';
 return null;
}

let rubricSeq=0;
export function newRubricId(prefix:string){rubricSeq+=1;return `${prefix}_${Date.now()}_${rubricSeq}`}

export function defaultRubric(totalPoints=10):EvaluationRubric{
 const points=allocateByWeight(totalPoints,defaultDimensionWeights.map(item=>item.weightPercent));
 return {dimensions:defaultDimensionWeights.map((item,index)=>({
  id:newRubricId('dim'),
  name:item.name,
  weightPercent:item.weightPercent,
  maxPoints:points[index]??0,
 }))};
}

export function rescaleRubric(rubric:EvaluationRubric,totalPoints:number):EvaluationRubric{
 const relative=rubric.dimensions.map(dimension=>dimension.maxPoints||dimension.weightPercent||0);
 const sum=relative.reduce((total,value)=>total+value,0);
 const weights=sum>0
  ?relative.map(value=>value*100/sum)
  :rubric.dimensions.map(()=>100/Math.max(1,rubric.dimensions.length));
 const points=allocateByWeight(totalPoints,weights);
 return {dimensions:rubric.dimensions.map((dimension,index)=>({
  ...dimension,
  maxPoints:points[index]??0,
  weightPercent:Math.round(weights[index]??0),
 }))};
}

export function rubricFromLegacy(_text:string,totalPoints:number):EvaluationRubric{
 return defaultRubric(totalPoints);
}
