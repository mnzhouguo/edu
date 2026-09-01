import { mondayOf } from './dates';

function daysBetween(start:string,end:string){
 const a=new Date(`${start}T12:00:00`).getTime();
 const b=new Date(`${end}T12:00:00`).getTime();
 return Math.round((b-a)/(24*60*60*1000));
}

export type SemesterWeekInfo={totalWeeks:number;weekNumber:number;inRange:boolean};

export function semesterTotalWeeks(semesterStart:string,semesterEnd:string){
 const startMonday=mondayOf(semesterStart);
 const endMonday=mondayOf(semesterEnd);
 if(endMonday<startMonday)return 0;
 return Math.floor(daysBetween(startMonday,endMonday)/7)+1;
}

export function semesterRemainingDays(semesterEnd:string,currentDate:string){
 return Math.max(0,daysBetween(currentDate,semesterEnd));
}

export function semesterWeekInfo(semesterStart:string|null|undefined,semesterEnd:string|null|undefined,weekStart:string):SemesterWeekInfo|null{
 if(!semesterStart||!semesterEnd)return null;
 const totalWeeks=semesterTotalWeeks(semesterStart,semesterEnd);
 if(totalWeeks<=0)return null;
 const startMonday=mondayOf(semesterStart);
 const currentMonday=mondayOf(weekStart);
 const weekNumber=Math.floor(daysBetween(startMonday,currentMonday)/7)+1;
 return {totalWeeks,weekNumber,inRange:weekNumber>=1&&weekNumber<=totalWeeks};
}

const CHINESE_DIGITS=['零','一','二','三','四','五','六','七','八','九'];

export function chineseWeekLabel(weekNumber:number){
 if(!Number.isFinite(weekNumber)||weekNumber<=0)return `第${weekNumber}周`;
 if(weekNumber<10)return `第${CHINESE_DIGITS[weekNumber]}周`;
 if(weekNumber===10)return '第十周';
 if(weekNumber<20)return `第十${CHINESE_DIGITS[weekNumber%10]}周`;
 if(weekNumber<100){
  const tens=Math.floor(weekNumber/10);
  const ones=weekNumber%10;
  return `第${CHINESE_DIGITS[tens]}十${ones?CHINESE_DIGITS[ones]:''}周`;
 }
 return `第${weekNumber}周`;
}
