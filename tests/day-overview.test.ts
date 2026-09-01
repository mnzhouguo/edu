import { describe,expect,it } from 'vitest';
import { dayTaskOverview } from '../src/day-overview.js';

describe('day task overview',()=>{
 it('sums base points of unfinished tasks only as available points',()=>{
  const overview=dayTaskOverview([
   {executionStatus:'completed',basePoints:8,earnedPoints:6},
   {executionStatus:'completed',basePoints:10,earnedPoints:10},
   {executionStatus:'voided',basePoints:12,earnedPoints:null},
   {executionStatus:'deferred',basePoints:8,earnedPoints:null},
   {executionStatus:'not_started',basePoints:10,earnedPoints:null},
   {executionStatus:'not_started',basePoints:10,earnedPoints:null},
   {executionStatus:'not_started',basePoints:10,earnedPoints:null},
  ]);
  expect(overview).toEqual({total:7,completed:2,availablePoints:38,earnedPoints:16});
 });
});
