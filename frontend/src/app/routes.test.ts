import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRoute } from './routes.ts';
import { calendarDays } from './calendar.ts';
test('routes support loan and chat deep links and tolerate malformed or unknown hashes',()=>{
 assert.deepEqual(parseRoute('#loans/demo-active'),{page:'loans',id:'demo-active'});assert.deepEqual(parseRoute('#chats/sarah'),{page:'chats',id:'sarah'});assert.deepEqual(parseRoute('#borrow/item/cake-stand'),{page:'borrow'});assert.deepEqual(parseRoute('#unknown'),{page:'borrow'});assert.deepEqual(parseRoute('#loans/%'),{page:'borrow'});
});
test('calendar starts on Monday, includes leap day, and has exactly six weeks',()=>{const dates=calendarDays('2028-02');assert.equal(dates.length,42);assert.ok(dates.includes('2028-02-29'));assert.equal(new Date(dates[0]+'T12:00:00Z').getUTCDay(),1);assert.equal(new Set(dates).size,42);});
