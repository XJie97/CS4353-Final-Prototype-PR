import { allItems } from '../pages/borrow/items.ts';
import { addDays, type Store, type Item, type Loan, type ProofStep } from './domain.ts';
export function createSeed(today: string): Store {
 const people = [
  {id:'eric',name:'Eric',username:'eric',location:'Clementi',bio:'Happy to share things with my neighbours.',colour:'#6750a4'},
  {id:'sarah',name:'Sarah',username:'sarah',location:'Clementi',bio:'Baking, gardening and sharing a little joy.',colour:'#b5618b'},
  {id:'ben',name:'Ben',username:'ben',location:'Toa Payoh',bio:'A toolbox is better when it is shared.',colour:'#587963'},
  {id:'maya',name:'Maya',username:'maya',location:'Kent Ridge',bio:'Always planning the next outdoor adventure.',colour:'#b57632'},
 ];
 const items:Item[]=allItems.map(item=>({...item,ownerId:item.id.startsWith('cake')||item.id==='jacket'?'sarah':item.category==='Outdoors'?'maya':'ben',listed:true,images:[item.image]}));
 items.push({id:'my-projector',name:'Portable projector',description:'A compact projector for movie nights. Please return with the remote and cable.',category:'Electronics',location:'Clementi',isFriend:false,image:'/assets/item-placeholder.png',images:['/assets/item-placeholder.png'],ownerId:'eric',owner:'Eric',listed:true});
 const loan=(id:string,itemId:string,borrowerId:string,start:number,end:number,status:Loan['status']):Loan=>({id,itemId,borrowerId,ownerId:items.find(i=>i.id===itemId)!.ownerId,start:addDays(today,start),end:addDays(today,end),lockerId:'clementi',status,approvals:status==='requested'?[borrowerId]:[borrowerId,items.find(i=>i.id===itemId)!.ownerId],proofs:{},code:id.toUpperCase(),createdAt:today+'T02:00:00Z'});
 const pending=loan('demo-pending','tent','eric',8,10,'requested');
 const incoming=loan('demo-incoming','my-projector','sarah',5,6,'requested');
 const active=loan('demo-active','weighing-scale','eric',0,2,'ready');active.proofs.ownerDropoff={at:today+'T03:00:00Z',photo:'/assets/item-placeholder.png',actor:active.ownerId,lockerNumber:'12'};
 const complete=loan('demo-complete','cordless-drill','eric',-7,-3,'complete');for(const step of ['ownerDropoff','borrowerPickup','borrowerDropoff','ownerPickup'] as ProofStep[])complete.proofs[step]={at:today+'T01:00:00Z',photo:'/assets/item-placeholder.png',actor:step==='ownerDropoff'||step==='ownerPickup'?complete.ownerId:complete.borrowerId,lockerNumber:'12'};complete.condition={result:'good',note:'Returned in good condition.',at:today+'T02:00:00Z'};
 return {version:1,helpRequests:[],offers:[],activeUserId:'eric',people,items,loans:[pending,incoming,active,complete],friends:[{id:'friends-sarah',from:'eric',to:'sarah',status:'accepted'},{id:'friends-maya',from:'eric',to:'maya',status:'accepted'},{id:'request-ben',from:'ben',to:'eric',status:'pending'}],messages:[{id:'welcome',from:'sarah',to:'eric',text:'Hi Eric! Happy to help with your next baking day. You can send me a request from the cake stand listing.',at:today+'T02:30:00Z',read:false}],notices:[{id:'notice-incoming',to:'eric',text:'Sarah would like to borrow your Portable projector.',loanId:incoming.id,at:today+'T03:00:00Z',read:false}]};
}
