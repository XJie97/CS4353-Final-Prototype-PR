export type Page = 'borrow'|'share'|'loans'|'friends'|'me'|'chats'|'notifications';
export type Route = { page:Page; id?:string };
export function parseRoute(hash:string):Route {
 try{const [page,id]=hash.replace(/^#/,'').split('/').map(decodeURIComponent);if(!['borrow','share','loans','friends','me','chats','notifications'].includes(page))return {page:'borrow'};return {page:page as Page,...(id&&page!=='borrow'?{id}:{})};}catch{return {page:'borrow'};}
}
export function routeHash(route:Route) { return `#${route.page}${route.id?'/'+encodeURIComponent(route.id):''}`; }

/** The five bottom tabs. Opened from the tab bar, these pages have no back button. */
export const TAB_PAGES:Page[]=['borrow','share','loans','friends','me'];
export function isTabRoot(route:Route) { return TAB_PAGES.includes(route.page)&&!route.id; }

/** Pages that show no top bar (notifications and chats). None at the moment; add a check here to hide it. */
export function hidesTopBar(_route:Route) { return false; }

/**
 * Where "back" goes when there's no in-app history to return to (e.g. the page was
 * opened from a link or after a refresh): the page this one naturally sits under.
 */
export function parentRoute(route:Route):Route {
 if(route.id&&route.page!=='notifications')return {page:route.page};
 return {page:'borrow'};
}
