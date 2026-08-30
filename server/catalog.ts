import type { Subject } from './plans.js';

export type AreaDef={id:string;label:string};
export const knowledgeAreaCatalog:Record<string,AreaDef[]>={
 chinese:[{id:'basics',label:'基础知识'},{id:'poetry_recitation',label:'古诗词默写'},{id:'classical_in_class',label:'课内文言文'},{id:'modern_reading',label:'现代文阅读'},{id:'composition',label:'作文'}],
 math:[{id:'lesson_review',label:'课内知识复习'},{id:'basic_drills',label:'基础题'},{id:'mid_drills',label:'中档题'},{id:'mistake_redo',label:'错题重做'},{id:'topic_training',label:'专题训练'}],
 english:[{id:'vocabulary',label:'单词短语'},{id:'sentence_patterns',label:'课文句型'},{id:'reading',label:'阅读理解'},{id:'cloze',label:'完形填空'},{id:'listening',label:'听力'},{id:'writing_sentences',label:'作文句子'}],
 physics:[{id:'concepts',label:'概念理解'},{id:'formulas',label:'公式记忆'},{id:'typical_problems',label:'典型题'},{id:'experiments',label:'实验题'},{id:'mistake_correction',label:'错题订正'}],
 history:[{id:'timeline',label:'时间线'},{id:'figures_events',label:'人物事件'},{id:'memorization',label:'知识背诵'},{id:'multiple_choice',label:'选择题'},{id:'material_questions',label:'材料题'}]
};

export const DEFAULT_SESSIONS=3;
export const DEFAULT_DURATION=20;
export const DEFAULT_BASE_POINTS=10;
export const DEFAULT_COMPLETION='按要求完成练习，并订正错题';

export function areaLabel(subject:Subject,areaId:string){
 return (knowledgeAreaCatalog[subject]??[{id:'general',label:'综合学习'}]).find(area=>area.id===areaId)?.label??areaId;
}

export function isAreaId(subject:Subject,areaId:string){
 return (knowledgeAreaCatalog[subject]??[{id:'general',label:'综合学习'}]).some(area=>area.id===areaId);
}

/** Deterministic weekday slots: prefer Mon–Fri, then Sat/Sun when n>5. */
export function weekdaySlots(sessions:number){
 const weekdays=[1,2,3,4,5];
 const weekend=[6,7];
 if(sessions<=5){
  if(sessions===1)return [1];
  if(sessions===2)return [1,3];
  if(sessions===3)return [1,3,5];
  if(sessions===4)return [1,2,4,5];
  return [...weekdays];
 }
 const slots=[...weekdays];
 for(let i=0;i<sessions-5;i++)slots.push(weekend[i%2]);
 return slots.slice(0,sessions);
}

