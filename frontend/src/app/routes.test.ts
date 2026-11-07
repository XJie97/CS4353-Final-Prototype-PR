import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRoute, isTabRoot, parentRoute, hidesTopBar, routeHash } from './routes.ts';
import { calendarDays } from './calendar.ts';
test('routes support loan and chat deep links and tolerate malformed or unknown hashes',()=>{
 assert.deepEqual(parseRoute('#loans/demo-active'),{page:'loans',id:'demo-active'});assert.deepEqual(parseRoute('#chats/sarah'),{page:'chats',id:'sarah'});assert.deepEqual(parseRoute('#borrow/item/cake-stand'),{page:'borrow'});assert.deepEqual(parseRoute('#unknown'),{page:'borrow'});assert.deepEqual(parseRoute('#loans/%'),{page:'borrow'});
});
test('calendar starts on Monday, includes leap day, and has exactly six weeks',()=>{const dates=calendarDays('2028-02');assert.equal(dates.length,42);assert.ok(dates.includes('2028-02-29'));assert.equal(new Date(dates[0]+'T12:00:00Z').getUTCDay(),1);assert.equal(new Set(dates).size,42);});
test('tab pages are roots; other pages fall back to the page they sit under',()=>{
 for(const page of ['borrow','share','loans','friends','me'] as const)assert.ok(isTabRoot({page}));
 assert.ok(!isTabRoot({page:'loans',id:'x'}));assert.ok(!isTabRoot({page:'chats'}));assert.ok(!isTabRoot({page:'notifications'}));
 assert.deepEqual(parentRoute({page:'loans',id:'x'}),{page:'loans'});assert.deepEqual(parentRoute({page:'friends',id:'network'}),{page:'friends'});
 assert.deepEqual(parentRoute({page:'me',id:'avatar'}),{page:'me'});assert.deepEqual(parentRoute({page:'chats'}),{page:'borrow'});
 assert.ok(!hidesTopBar({page:'me',id:'avatar'}));assert.ok(!hidesTopBar({page:'me'}));
 assert.equal(routeHash({page:'chats',id:'a b'}),'#chats/a%20b');
});
