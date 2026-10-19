// Small project note; stays inside the model dialog and uses its existing store.
export function openSticky({host,record,save,onClose,onError}){
 const node=document.createElement('section');node.className='model-sticky';node.setAttribute('aria-label','Bilețel pe model');
 node.innerHTML=`<header><div><strong>Bilețel</strong><span>Text sau scris de mână</span></div><button type="button" data-sticky-close aria-label="Închide bilețelul">×</button></header><textarea data-sticky-text rows="3" placeholder="Ce vrei să îți amintești?" aria-label="Textul bilețelului"></textarea><canvas width="600" height="300" aria-label="Scrie pe bilețel cu Apple Pencil sau degetul"></canvas><footer><span role="status" data-sticky-status>Salvare automată</span><button type="button" data-sticky-undo>Anulează linia</button></footer>`;
 const text=node.querySelector('textarea'),canvas=node.querySelector('canvas'),status=node.querySelector('[data-sticky-status]'),undo=node.querySelector('[data-sticky-undo]'),ctx=canvas.getContext('2d');
 text.value=record?.modelSticky?.text??(record?.pages?.flatMap(p=>p.objects.filter(o=>o.type==='text'&&!o.text.startsWith('Modificări —')).map(o=>o.text)).join('\n')||'');
 let strokes=structuredClone(record?.modelSticky?.strokes||[]),id=record?.id,revision=0,saved=0,pending=null,timer=null,pointer=null,frame=null,removed=false;
 function paint(){ctx.clearRect(0,0,600,300);ctx.strokeStyle='#294c6c';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';for(const points of strokes){if(!points.length)continue;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];ctx.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}ctx.lineTo(points.at(-1).x,points.at(-1).y);if(points.length===1)ctx.lineTo(points[0].x+.01,points[0].y);ctx.stroke();}undo.disabled=!strokes.length;}
 function changed(){revision++;status.textContent='Modificări nesalvate';clearTimeout(timer);if(pointer===null)timer=setTimeout(()=>flush().catch(onError),900);}
 async function flush(){clearTimeout(timer);if(pending){await pending;return flush();}if(saved===revision)return;const current=revision,data={text:text.value,strokes:structuredClone(strokes)};status.textContent='Se salvează…';pending=save({noteId:id,sticky:data}).then(note=>{id=note.id;saved=current;if(saved===revision)status.textContent='Salvat';}).catch(error=>{status.textContent='Salvare nereușită · reîncearcă închiderea';throw error;});try{await pending;}finally{pending=null;}if(saved!==revision&&pointer===null)return flush();}
 text.addEventListener('input',changed);
 const point=e=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(600,(e.clientX-r.left)/r.width*600)),y:Math.max(0,Math.min(300,(e.clientY-r.top)/r.height*300)),p:e.pressure||.5};};
 canvas.addEventListener('pointerdown',e=>{if(pointer!==null||e.button>0)return;e.preventDefault();e.stopPropagation();pointer=e.pointerId;clearTimeout(timer);canvas.setPointerCapture(e.pointerId);strokes.push([point(e)]);changed();paint();});
 canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;e.preventDefault();const batch=e.getCoalescedEvents?.()||[];for(const sample of batch.length?batch:[e]){const p=point(sample),last=strokes.at(-1).at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)>.7)strokes.at(-1).push(p);}if(!frame)frame=requestAnimationFrame(()=>{frame=null;paint();});});
 function finish(e,cancel=false){if(e.pointerId!==pointer)return;e.preventDefault();if(cancel)strokes.pop();else strokes.at(-1).push(point(e));pointer=null;changed();paint();}
 canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));
 undo.onclick=()=>{if(pointer!==null)return;strokes.pop();changed();paint();};
 async function close(){if(pointer!==null){pointer=null;changed();}await flush();if(removed)return;removed=true;clearTimeout(timer);cancelAnimationFrame(frame);node.remove();onClose?.();}
 node.querySelector('[data-sticky-close]').onclick=()=>close().catch(onError);
 host.append(node);paint();text.focus({preventScroll:true});return{node,flush,close};
}
