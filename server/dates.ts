export function parseIsoDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const date=new Date(`${value}T00:00:00Z`);return Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value?null:date}
export function isMonday(value:string){const date=parseIsoDate(value);return Boolean(date&&date.getUTCDay()===1)}
export function dateInfo(value:string){const date=parseIsoDate(value);if(!date)return null;const weekday=date.getUTCDay()||7;date.setUTCDate(date.getUTCDate()-(weekday-1));return{weekday,weekStart:date.toISOString().slice(0,10)}}
