export function isoDate(date=new Date()){const year=date.getFullYear(),month=String(date.getMonth()+1).padStart(2,'0'),day=String(date.getDate()).padStart(2,'0');return `${year}-${month}-${day}`}
export function mondayOf(value:string){const date=new Date(`${value}T12:00:00`),weekday=date.getDay()||7;date.setDate(date.getDate()-(weekday-1));return isoDate(date)}
export function defaultPlanningWeek(){return mondayOf(isoDate(new Date()))}
export function formatChineseDate(value:string){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
 if(!match)return value;
 return `${Number(match[1])}年${Number(match[2])}月${Number(match[3])}日`;
}
export function formatChineseMonth(year:number,monthIndex:number){return `${year}年${monthIndex+1}月`}
export function daysOfWeek(weekStart:string){const monday=new Date(`${weekStart}T12:00:00`);return Array.from({length:7},(_,index)=>{const date=new Date(monday);date.setDate(monday.getDate()+index);return{weekday:index+1,date:isoDate(date),label:['周一','周二','周三','周四','周五','周六','周日'][index],short:`${date.getMonth()+1}月${date.getDate()}日`}})}
