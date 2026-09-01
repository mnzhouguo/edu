import { useMemo } from 'react';
import { mondayOf,isoDate } from '../dates';
import { semesterRemainingDays,semesterWeekInfo } from '../semester';
import type { Student } from '../types';

export function SemesterWeekBadge({student}:{student:Student|null}){
 const info=useMemo(()=>{
  if(!student)return null;
  return semesterWeekInfo(student.semesterStart,student.semesterEnd,mondayOf(isoDate()));
 },[student?.semesterStart,student?.semesterEnd,student?.id]);

 if(!student)return null;
 if(!info){
  return <div className="semester-week-badge muted" title="请到设置页配置学期起止日期">
   <span>本学期</span>
   <strong>未设置学期</strong>
  </div>;
 }
 if(!info.inRange){
  return <div className="semester-week-badge out" title={`学期 ${student.semesterStart} 至 ${student.semesterEnd}`}>
   <span>本学期共 {info.totalWeeks} 周</span>
   <strong>当前不在学期内</strong>
  </div>;
 }
 return <div className="semester-week-badge" title={`学期 ${student.semesterStart} 至 ${student.semesterEnd}`}>
   <span>本学期共 {info.totalWeeks} 周</span>
   <strong>当前第 {info.weekNumber} 周</strong>
   <b>剩余 {semesterRemainingDays(student.semesterEnd!,isoDate())} 天</b>
 </div>;
}
