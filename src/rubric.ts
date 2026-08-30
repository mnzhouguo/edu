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

export function validateRubricAgainstTotal(rubric:EvaluationRubric,totalPoints:number){
 if(!Number.isInteger(totalPoints)||totalPoints<0)return '总分无效';
 const allocated=allocatedPoints(rubric);
 if(allocated>totalPoints)return `评价维度合计 ${allocated} 分，不能超过总分 ${totalPoints} 分`;
 if(!rubric.dimensions.length)return '请至少添加一个评价维度';
 for(const dimension of rubric.dimensions){
  if(!dimension.name.trim())return '请填写维度名称';
  if(!Number.isInteger(dimension.maxPoints)||dimension.maxPoints<0)return '维度满分无效';
  if(!dimension.levels.length)return `请为「${dimension.name||'未命名维度'}」添加档位`;
  if(!dimension.levels.some(level=>level.points===dimension.maxPoints))return `「${dimension.name}」需要包含一个满分档位`;
  for(const level of dimension.levels){
   if(!level.label.trim())return '请填写档位说明';
   if(!Number.isInteger(level.points)||level.points<0||level.points>dimension.maxPoints)return `「${dimension.name}」档位分不能超过维度满分`;
  }
 }
 if(allocated===0)return '请至少配置一个有分值的评价维度';
 return null;
}

let rubricSeq=0;
export function newRubricId(prefix:string){rubricSeq+=1;return `${prefix}_${Date.now()}_${rubricSeq}`}

export function defaultRubric(totalPoints=10):EvaluationRubric{
 const handwriting=Math.min(5,Math.max(0,Math.floor(totalPoints/2)));
 const accuracy=Math.max(0,totalPoints-handwriting);
 const dimensions:RubricDimension[]=[];
 if(handwriting>0)dimensions.push({
  id:newRubricId('dim'),name:'字迹',maxPoints:handwriting,
  levels:[
   {id:newRubricId('lv'),label:'字迹优美',points:handwriting},
   {id:newRubricId('lv'),label:'不够工整',points:Math.max(0,Math.round(handwriting*0.6))},
   {id:newRubricId('lv'),label:'非常潦草',points:0},
  ],
 });
 if(accuracy>0)dimensions.push({
  id:newRubricId('dim'),name:'正确率',maxPoints:accuracy,
  levels:[
   {id:newRubricId('lv'),label:'正确率高',points:accuracy},
   {id:newRubricId('lv'),label:'基本达标',points:Math.max(0,Math.round(accuracy*0.6))},
   {id:newRubricId('lv'),label:'未达标',points:0},
  ],
 });
 if(!dimensions.length)dimensions.push({
  id:newRubricId('dim'),name:'完成质量',maxPoints:0,
  levels:[{id:newRubricId('lv'),label:'按要求完成',points:0}],
 });
 return {dimensions};
}

export function rubricFromLegacy(text:string,totalPoints:number):EvaluationRubric{
 const max=Math.max(0,totalPoints);
 return {dimensions:[{
  id:newRubricId('dim'),name:text.trim()?`完成质量`:'完成质量',maxPoints:max,
  levels:[
   {id:newRubricId('lv'),label:'达标',points:max},
   {id:newRubricId('lv'),label:'未达标',points:0},
  ],
 }]};
}
