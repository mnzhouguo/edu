export type Student={id:number;name:string;grade:string;school:string;currentGoal:string;semesterStart:string|null;semesterEnd:string|null;hasAvatar:boolean;updatedAt?:string};
export type Subject=string;
export type StudentSubject={id:string;label:string;custom:boolean;sortOrder:number};
export type WeeklyTask={
 id:number;
 studentId:number;
 weekStart:string;
 weekday:number;
 subject:Subject;
 content:string;
 completionStandard:string;
 suggestedDuration:number;
 basePoints:number;
 taskOrder:number;
 sourceKnowledgeArea:string|null;
 executionStatus:'not_started'|'completed'|'voided'|'deferred';
 actualDuration:number|null;
 earnedPoints:number|null;
 dimensionScores:Record<string,number>|null;
 evaluationRubric:EvaluationRubric|null;
};
export type WeeklyExecutionStatus=WeeklyTask['executionStatus'];
export type PlanCadence='daily'|'weekdays'|'every_2_days'|'weekly'|'custom_weekly';
export type RubricDimension={id:string;name:string;weightPercent:number;maxPoints:number};
export type EvaluationRubric={dimensions:RubricDimension[]};
export type SubjectPlanItem={id:number;studentId:number;subject:Subject;name:string;cadence:PlanCadence;weekdays:number[];materialId:number|null;materialName:string|null;suggestedDuration:number;completionStandard:string;evaluationRubric:EvaluationRubric|null;basePoints:number;active:boolean;sortOrder:number};

export type StudyMaterial={id:number;name:string;type:string;note:string;areaId:string};
export type KnowledgeAreaState={id:string;label:string;enabled:boolean;sortOrder:number;sessionsPerWeek:number;suggestedDuration:number;materials:StudyMaterial[]};
export type SubjectPlan={subject:Subject;goal:{narrative:string;currentScore:number|null;targetScore:number|null;targetDate:string|null};areas:KnowledgeAreaState[]};
export type Photo={id:number;relativePath:string;mediaType:string;originalFilename:string;size:number};
export type Submission={id:number;submittedAt:string;note:string;photos:Photo[]};
export type Evaluation={id:number;completion:string;accuracyBand:string;tags:string[];note:string;earnedPoints:number;confirmed:boolean};
export type DailyTask={id:number;studentId:number;sourceWeeklyTaskId:number|null;taskDate:string;subject:Subject;content:string;completionStandard:string;suggestedDuration:number;basePoints:number;taskOrder:number;status:string;estimatedPoints:number;earnedPoints:number|null;submission:Submission|null;evaluation:Evaluation|null};
export type Reward={id:number;name:string;category:string;requiredPoints:number;cashAmount:number|null;description:string;active:boolean;hasImage:boolean;updatedAt?:string};
export type Redemption={id:number;rewardName:string;rewardCategory:string;quantity:number;requestedPoints:number;status:string;note:string;createdAt:string;decidedAt:string|null};
export type Mistake={id:number;subject:Subject;summary:string;reason:string;reasonNote:string;correctSolution:string;redoStatus:string;photos:Photo[]};
export type TaskCounts={
 total:number;
 notStarted:number;
 completed:number;
 voided:number;
 deferred:number;
 completionRate:number|null;
 plannedMinutes:number;
 actualMinutes:number;
 availablePoints:number;
 basePoints:number;
 earnedPoints:number;
};
export type DashboardQuality={id:string;name:string;avgScore:number|null;avgMax:number|null;rate:number|null};
export type DashboardSubject=TaskCounts&{
 subject:Subject;
 label:string;
 currentScore:number|null;
 targetScore:number|null;
 gap:number|null;
 progress:number|null;
 targetDate:string|null;
};
export type Dashboard={
 date:string;
 weekStart:string;
 empty:boolean;
 today:TaskCounts;
 yesterday:TaskCounts;
 week:TaskCounts;
 previousWeek:TaskCounts;
 allTime:TaskCounts;
 weekTrend:{date:string;weekday:number;label:string;total:number;completed:number;completionRate:number|null;basePoints:number;earnedPoints:number;plannedMinutes:number}[];
 monthTrend:{date:string;total:number;completed:number;completionRate:number|null;earnedPoints:number}[];
 subjects:DashboardSubject[];
 quality:{week:DashboardQuality[];allTime:DashboardQuality[]};
 points:{balance:number;totalEarned:number;todayEarned:number;todaySpent:number;weekEarned:number;weekSpent:number;weekRedeemed:number;weekExpiring:number};
 plan:{activeItems:number;materials:number;scoredSubjects:number};
 planned:number;
 submitted:number;
 evaluated:number;
 completed:number;
 todayCompletionRate:number|null;
 todayEarned:number;
 todaySpent:number;
 weekEarned:number;
 weekSpent:number;
 pointsBalance:number;
};
export const subjects:{id:Subject;label:string}[]=[{id:'chinese',label:'语文'},{id:'math',label:'数学'},{id:'english',label:'英语'}];
const legacySubjectLabels:Record<string,string>={physics:'物理',history:'历史'};
export const subjectLabel=(subject:Subject)=>subjects.find(item=>item.id===subject)?.label??legacySubjectLabels[subject]??(subject.startsWith('custom_')?subject.slice(7):subject);
export const completions=[{id:'not_completed',label:'未完成'},{id:'partial',label:'部分完成'},{id:'completed',label:'已完成'},{id:'high_quality',label:'高质量完成'}];
export const accuracyBands=[{id:'unrecorded',label:'未记录'},{id:'below_60',label:'60%以下'},{id:'60',label:'60%'},{id:'80',label:'80%'},{id:'90',label:'90%'},{id:'100',label:'100%'}];
export const behaviorTags=[{id:'proactive',label:'主动'},{id:'on_time',label:'按时'},{id:'corrected',label:'订正'},{id:'focused',label:'专注'}];
export const rewardCategories=[{id:'cash',label:'现金'},{id:'game_time',label:'游戏时间'},{id:'movie',label:'电影'},{id:'activity',label:'活动'},{id:'gift',label:'礼物'}];
export const mistakeReasons=[{id:'concept',label:'概念不会'},{id:'formula',label:'公式不会'},{id:'calculation',label:'计算粗心'},{id:'misread',label:'审题错误'},{id:'steps',label:'步骤不规范'},{id:'memory',label:'记忆不牢'},{id:'method',label:'方法不熟'},{id:'time',label:'时间不够'},{id:'other',label:'其他'}];
export const redoStatuses=[{id:'not_redone',label:'未重做'},{id:'redone_wrong',label:'已重做仍错'},{id:'redone_correct',label:'已重做正确'}];
export const statusLabel=(status:string)=>status==='submitted'?'待评价':status==='evaluated'?'已评价':'未开始';
export const weeklyExecutionStatuses:{id:WeeklyExecutionStatus;label:string}[]=[
 {id:'not_started',label:'未开始'},
 {id:'completed',label:'已完成'},
 {id:'voided',label:'已作废'},
 {id:'deferred',label:'已延期'},
];
export const weeklyExecutionLabel=(status:WeeklyExecutionStatus)=>weeklyExecutionStatuses.find(item=>item.id===status)?.label??status;


