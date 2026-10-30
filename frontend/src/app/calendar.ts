import { addDays } from './domain.ts';
export function calendarDays(month:string) {
 const first=month+'-01';const offset=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;
 return Array.from({length:42},(_,index)=>addDays(first,index-offset));
}
