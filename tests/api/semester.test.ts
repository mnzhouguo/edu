import { describe,expect,it } from 'vitest';
import { semesterTotalWeeks,semesterWeekInfo } from '../../src/semester';

describe('semester weeks',()=>{
 it('counts natural weeks from Monday of start through Monday of end',()=>{
  expect(semesterTotalWeeks('2026-08-31','2026-08-31')).toBe(1);
  expect(semesterTotalWeeks('2026-08-31','2026-09-07')).toBe(2);
  expect(semesterTotalWeeks('2026-08-31','2026-09-14')).toBe(3);
  expect(semesterTotalWeeks('2026-08-31','2027-01-15')).toBe(20);
 });

 it('returns the 1-based week number for a weekly plan Monday',()=>{
  expect(semesterWeekInfo('2026-08-31','2027-01-15','2026-08-31')).toEqual({totalWeeks:20,weekNumber:1,inRange:true});
  expect(semesterWeekInfo('2026-08-31','2027-01-15','2026-09-07')).toEqual({totalWeeks:20,weekNumber:2,inRange:true});
  expect(semesterWeekInfo('2026-08-31','2027-01-15','2026-08-24')).toEqual({totalWeeks:20,weekNumber:0,inRange:false});
 });

 it('returns null when semester dates are missing',()=>{
  expect(semesterWeekInfo(null,null,'2026-08-31')).toBeNull();
  expect(semesterWeekInfo('2026-08-31',null,'2026-08-31')).toBeNull();
 });
});
