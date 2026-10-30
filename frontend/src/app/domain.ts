import type { BorrowItem } from '../pages/borrow/items.ts';
export type Person = { id: string; name: string; username: string; location: string; bio: string; avatar?: string; colour: string };
export type Item = BorrowItem & { ownerId: string; listed: boolean; images: string[] };
export type ProofStep = 'ownerDropoff' | 'borrowerPickup' | 'borrowerDropoff' | 'ownerPickup';
export type LoanStatus = 'requested' | 'arranging' | 'ready' | 'active' | 'returning' | 'verifying' | 'complete' | 'declined' | 'cancelled';
export type Proof = { at: string; photo: string; actor: string; lockerNumber: string };
export type Review = { rating: number; text: string; compliments: string[]; photo?: string; at: string };
export type Loan = {
 id: string; itemId: string; ownerId: string; borrowerId: string; start: string; end: string; lockerId: string;
 status: LoanStatus; approvals: string[]; proofs: Partial<Record<ProofStep, Proof>>; code: string; createdAt: string;
 condition?: { result: 'good' | 'issue'; note: string; at: string; resolution?: string }; review?: Review;
};
export type Message = { id: string; from: string; to: string; text: string; at: string; read: boolean; loanId?: string };
export type Friendship = { id: string; from: string; to: string; status: 'pending' | 'accepted' };
export type Notice = { id: string; to: string; text: string; at: string; read: boolean; loanId?: string; peerId?: string };
export type Store = { version: 1; activeUserId: string; people: Person[]; items: Item[]; loans: Loan[]; messages: Message[]; friends: Friendship[]; notices: Notice[] };
export const LOCKERS = [
 { id: 'clementi', name: 'Clementi', label: 'Clementi Locker', number: '12' },
 { id: 'toa-payoh', name: 'Toa Payoh', label: 'Toa Payoh Locker', number: '08' },
 { id: 'kent-ridge', name: 'Kent Ridge', label: 'Kent Ridge Locker', number: '21' },
] as const;
export const COMPLIMENTS = ['Great communication', 'Returned on time', 'Careful with items'];
export const PROOF_STEPS: ProofStep[] = ['ownerDropoff', 'borrowerPickup', 'borrowerDropoff', 'ownerPickup'];
export const PROOF_LABELS: Record<ProofStep, string> = { ownerDropoff: 'Drop off item', borrowerPickup: 'Pick up item', borrowerDropoff: 'Return item', ownerPickup: 'Collect returned item' };
export function todayLocal() {
 const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
 return ['year','month','day'].map(key => parts.find(p=>p.type===key)!.value).join('-');
}
export function addDays(value: string, days: number) { const date=new Date(value+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10); }
export function dateLabel(value: string) { return new Intl.DateTimeFormat('en-SG',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z')); }
export function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value; }
export function duration(start: string,end: string) { return Math.round((Date.parse(end)-Date.parse(start))/86400000)+1; }
export function nextProof(loan: Loan) { return PROOF_STEPS.find(step=>!loan.proofs[step]); }
export function proofActor(loan: Loan, step: ProofStep) { return step==='ownerDropoff'||step==='ownerPickup'?loan.ownerId:loan.borrowerId; }
export function handoverCode(loan: Loan,step: ProofStep) { return `CS4353:${loan.id}:${step}:${loan.code}`; }
export function loanGroup(loan: Loan): 'Pending'|'Active'|'Complete' { return ['requested','arranging'].includes(loan.status)?'Pending':['complete','declined','cancelled'].includes(loan.status)?'Complete':'Active'; }
export function areFriends(s: Store,a: string,b: string) { return s.friends.some(f=>f.status==='accepted'&&((f.from===a&&f.to===b)||(f.to===a&&f.from===b))); }
export function photoValid(photo: string) { return photo.length<=2_000_000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo); }
export class AppError extends Error {}
function requireValue(ok: unknown, message: string): asserts ok { if(!ok)throw new AppError(message); }
export type PlanInput = { start: string; end: string; lockerId: string };
export type Command =
 | {type:'switch-account';id:string}
 | ({type:'request-loan';id:string;itemId:string}&PlanInput)
 | ({type:'edit-plan';loanId:string}&PlanInput)
 | {type:'approve-plan'|'cancel-loan'|'decline-loan';loanId:string}
 | {type:'record-proof';loanId:string;step:ProofStep;photo:string;code:string;lockerNumber:string}
 | {type:'verify-condition';loanId:string;condition:'good'|'issue';note:string}
 | {type:'resolve-condition';loanId:string;note:string}
 | {type:'submit-review';loanId:string;rating:number;text:string;compliments:string[];photo?:string}
 | {type:'send-message';to:string;text:string;loanId?:string}
 | {type:'read-thread';peerId:string}
 | {type:'read-notices';id?:string}
 | {type:'create-item';id:string;name:string;description:string;category:string;location:string;images:string[]}
 | {type:'edit-item';id:string;name:string;description:string;category:string;location:string;images:string[]}
 | {type:'toggle-item';id:string}
 | {type:'request-friend';id:string;to:string}
 | {type:'accept-friend'|'decline-friend'|'remove-friend';id:string}
 | {type:'update-profile';name:string;username:string;location:string;bio:string;avatar?:string};
export type CommandEnv = { id: string; now: string; today: string };
export function applyCommand(original: Store, command: Command, env: CommandEnv): Store {
 const s=structuredClone(original), me=s.activeUserId;
 const person=(id:string)=>s.people.find(p=>p.id===id);
 const notify=(to:string,text:string,loanId?:string,peerId?:string)=>{s.notices.unshift({id:`${env.id}-${s.notices.length}`,to,text,...(loanId?{loanId}:{}),...(peerId?{peerId}:{}),at:env.now,read:false});};
 const name=person(me)?.name??'A member';
 const loanFor=(id:string)=>{const l=s.loans.find(l=>l.id===id);requireValue(l,'This loan could not be found.');requireValue(l.ownerId===me||l.borrowerId===me,'Only a loan participant can do this.');return l;};
 const validatePlan=(itemId:string,p:PlanInput,ignore?:string)=>{
  requireValue(validDate(p.start)&&validDate(p.end),'Choose valid receive and return dates.');requireValue(p.start>=env.today,'The receive date cannot be in the past.');requireValue(p.end>=p.start,'The return date must be on or after the receive date.');
  requireValue(LOCKERS.some(l=>l.id===p.lockerId),'Choose a locker location.');
  requireValue(!s.loans.some(l=>l.id!==ignore&&l.itemId===itemId&&!['cancelled','declined','complete'].includes(l.status)&&p.start<=l.end&&p.end>=l.start),'These dates overlap another loan. Choose different dates.');
 };
 switch(command.type){
  case 'switch-account':requireValue(person(command.id),'This account could not be found.');s.activeUserId=command.id;break;
  case 'request-loan':{
   const item=s.items.find(i=>i.id===command.itemId);requireValue(item?.listed,'This item is not available to borrow.');requireValue(item.ownerId!==me,'You cannot borrow your own item.');requireValue(!s.loans.some(l=>l.id===command.id),'This request already exists.');validatePlan(item.id,command);
   s.loans.unshift({id:command.id,itemId:item.id,ownerId:item.ownerId,borrowerId:me,start:command.start,end:command.end,lockerId:command.lockerId,status:'requested',approvals:[me],proofs:{},code:env.id.replace(/[^a-z0-9]/gi,'').slice(-8).toUpperCase(),createdAt:env.now});notify(item.ownerId,`${name} requested ${item.name}.`,command.id);break;
  }
  case 'approve-plan':{
   const l=loanFor(command.loanId);requireValue(['requested','arranging','ready'].includes(l.status)&&!l.proofs.ownerDropoff,'This plan can no longer be approved.');if(l.status==='requested')requireValue(me===l.ownerId,'The owner must accept this request.');
   if(!l.approvals.includes(me))l.approvals.push(me);l.status=l.approvals.includes(l.ownerId)&&l.approvals.includes(l.borrowerId)?'ready':'arranging';notify(me===l.ownerId?l.borrowerId:l.ownerId,`${name} approved the exchange plan.`,l.id);break;
  }
  case 'edit-plan':{
   const l=loanFor(command.loanId);requireValue(['requested','arranging','ready'].includes(l.status)&&!l.proofs.ownerDropoff,'The exchange plan can no longer be edited.');validatePlan(l.itemId,command,l.id);
   if(l.start===command.start&&l.end===command.end&&l.lockerId===command.lockerId)return original;
   Object.assign(l,{start:command.start,end:command.end,lockerId:command.lockerId,approvals:[me],status:'arranging'});notify(me===l.ownerId?l.borrowerId:l.ownerId,`${name} proposed a new exchange plan.`,l.id);break;
  }
  case 'cancel-loan':case 'decline-loan':{
   const l=loanFor(command.loanId);requireValue(['requested','arranging','ready'].includes(l.status)&&!l.proofs.ownerDropoff,'This loan cannot be cancelled after handover has started.');
   if(command.type==='decline-loan')requireValue(me===l.ownerId&&l.status==='requested','Only the owner can decline a pending request.');l.status=command.type==='cancel-loan'?'cancelled':'declined';notify(me===l.ownerId?l.borrowerId:l.ownerId,`${name} ${l.status} the loan.`,l.id);break;
  }
  case 'record-proof':{
   const l=loanFor(command.loanId);requireValue(['ready','active','returning'].includes(l.status),'This loan is not ready for a handover.');requireValue(nextProof(l)===command.step,'Complete the next handover step in order.');requireValue(proofActor(l,command.step)===me,'Only the designated participant can complete this step.');
   requireValue(command.code.trim()===handoverCode(l,command.step),'That code does not match this loan and handover step.');requireValue(photoValid(command.photo),'Add a valid item photo before continuing.');requireValue(/^\d{1,2}$/.test(command.lockerNumber)&&Number(command.lockerNumber)>0,'Enter a valid locker number.');
   if(command.step==='borrowerPickup'||command.step==='ownerPickup'){const previous=command.step==='borrowerPickup'?l.proofs.ownerDropoff:l.proofs.borrowerDropoff;requireValue(previous&&Number(previous.lockerNumber)===Number(command.lockerNumber),'Use the locker number from the drop-off confirmation.');}
   l.proofs[command.step]={at:env.now,photo:command.photo,actor:me,lockerNumber:command.lockerNumber};
   l.status=command.step==='ownerDropoff'?'ready':command.step==='borrowerPickup'?'active':command.step==='borrowerDropoff'?'returning':'verifying';notify(me===l.ownerId?l.borrowerId:l.ownerId,`${name} completed: ${PROOF_LABELS[command.step].toLowerCase()}.`,l.id);break;
  }
  case 'verify-condition':{
   const l=loanFor(command.loanId);requireValue(me===l.ownerId&&l.status==='verifying','Only the owner can verify a returned item.');requireValue(command.condition==='good'||command.condition==='issue','Choose the item condition.');requireValue(command.condition==='good'||command.note.trim().length>=5,'Describe the condition issue.');
   l.condition={result:command.condition,note:command.note.trim().slice(0,2000),at:env.now};if(command.condition==='good')l.status='complete';notify(l.borrowerId,command.condition==='good'?'Your return was verified. You can now leave a review.':`${name} reported an item condition issue. Please discuss it in chat.`,l.id);break;
  }
  case 'resolve-condition':{
   const l=loanFor(command.loanId);requireValue(me===l.ownerId&&l.status==='verifying'&&l.condition?.result==='issue','Only the owner can resolve this condition issue.');requireValue(command.note.trim().length>=5,'Add a short resolution note.');l.condition.resolution=command.note.trim().slice(0,2000);l.status='complete';notify(l.borrowerId,'The condition issue has been resolved. You can now leave a review.',l.id);break;
  }
  case 'submit-review':{
   const l=loanFor(command.loanId);requireValue(me===l.borrowerId&&l.status==='complete','Only the borrower can review a completed loan.');requireValue(!l.review,'You have already reviewed this loan.');requireValue(Number.isInteger(command.rating)&&command.rating>=1&&command.rating<=5,'Choose a rating from 1 to 5.');requireValue(command.text.trim().length>0&&command.text.length<=2000,'Write a review of up to 2000 characters.');requireValue(command.compliments.every(c=>COMPLIMENTS.includes(c)),'Choose one of the available compliments.');requireValue(!command.photo||photoValid(command.photo),'Choose a valid review photo.');l.review={rating:command.rating,text:command.text.trim(),compliments:[...new Set(command.compliments)],...(command.photo?{photo:command.photo}:{}),at:env.now};notify(l.ownerId,`${name} left a review.`,l.id);break;
  }
  case 'send-message':{
   requireValue(command.text.trim().length>0&&command.text.length<=2000,'Write a message of up to 2000 characters.');requireValue(command.to!==me,'You cannot message yourself.');requireValue(person(command.to),'This person could not be found.');
   if(command.loanId){const loan=s.loans.find(l=>l.id===command.loanId);requireValue(loan&&[loan.ownerId,loan.borrowerId].includes(me)&&[loan.ownerId,loan.borrowerId].includes(command.to),'Only the loan participants can discuss this loan.');}
   s.messages.push({id:env.id,from:me,to:command.to,text:command.text.trim(),at:env.now,read:false,...(command.loanId?{loanId:command.loanId}:{})});notify(command.to,`${name} sent you a message.`,undefined,me);break;
  }
  case 'read-thread':{
   requireValue(person(command.peerId),'This person could not be found.');s.messages.forEach(m=>{if(m.to===me&&m.from===command.peerId)m.read=true;});s.notices.forEach(n=>{if(n.to===me&&n.peerId===command.peerId)n.read=true;});break;
  }
  case 'read-notices':s.notices.forEach(n=>{if(n.to===me&&(!command.id||command.id===n.id))n.read=true;});break;
  default:throw new AppError('This action is not available.');
 }
 return s;
}
