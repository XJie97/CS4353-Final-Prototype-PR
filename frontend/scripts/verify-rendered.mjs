import assert from 'node:assert/strict';
import { build } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const entry=join(root,'node_modules/.cache/cs4353-rendered-entry.ts');
const out=join(root,'node_modules/.cache/cs4353-rendered');
await mkdir(dirname(entry),{recursive:true});
// One bundle keeps the production provider and consumers on the same context.
await writeFile(entry,`export { AppProvider } from ${JSON.stringify(join(root,'src/app/context.tsx'))};\nexport { RouteContent } from ${JSON.stringify(join(root,'src/App.tsx'))};\nexport { QrCode } from ${JSON.stringify(join(root,'src/components/ui/QrCode.tsx'))};\n`);
await build({root,logLevel:'warn',build:{ssr:entry,outDir:out,emptyOutDir:true}});
await writeFile(join(out,'package.json'),'{"type":"module"}\n');
const module=await import(pathToFileURL(join(out,'cs4353-rendered-entry.js')).href);
const noop=()=>{};const htmls=[];
for(const [route,expected] of [
 [{page:'loans'},['Borrowing','Sharing','Portable projector']],
 [{page:'loans',id:'demo-active'},['Weighing scale','Show QR','Loan Start']],
 [{page:'share'},['Your items','Portable projector']],
 [{page:'friends'},['Friend requests','Your friends','Find people']],
 [{page:'me'},['About this preview','Version:','Edit profile','Reset preview data']],
 [{page:'chats'},['Messages','New chat','Sarah']],
 [{page:'chats',id:'sarah'},['Type a message','Modify plan']],
 [{page:'notifications'},['Updates','Portable projector']],
]){
 const html=renderToStaticMarkup(createElement(module.AppProvider,null,createElement(module.RouteContent,{route,navigate:noop,onItem:noop,onHandover:noop,onReview:noop,onReset:noop})));
 for(const text of expected)assert.ok(html.includes(text),`${JSON.stringify(route)} must render ${text}`);
 assert.ok(!html.includes('Your community is ready to share.'),'A real page must replace the staging placeholder');htmls.push(html);
}
for(const src of new Set(htmls.flatMap(html=>[...html.matchAll(/src="(\/assets\/[^\"]+)"/g)].map(match=>match[1]))))assert.ok((await stat(join(root,'public',src))).size>0,src);
const qr=renderToStaticMarkup(createElement(module.QrCode,{value:'CS4353:demo-active:borrowerPickup:DEMO-ACTIVE'}));assert.ok(qr.includes('Handover QR code'));assert.ok((qr.match(/h1v1h-1z/g)||[]).length>100);
console.log('Rendered UI checks passed: all 8 routed views, local assets, and generated QR matrix.');
