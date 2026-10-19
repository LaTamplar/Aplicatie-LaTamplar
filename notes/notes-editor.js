/* Atelier Notes — editable A4 documents. No network dependency. */
(() => {
  'use strict';
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const copy = v => JSON.parse(JSON.stringify(v));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const normalizeAngle = value => {let normalized=((Number(value)+180)%360+360)%360-180;if(Math.abs(normalized+180)<1e-9&&Number(value)>0)normalized=180;return normalized;};
  const now = () => new Date().toISOString();
  const date = value => new Date(value).toLocaleString('ro-RO', {dateStyle:'short', timeStyle:'short'});
  const size = page => page.orientation === 'landscape' ? [1123, 794] : [794, 1123];
  const pageData = (orientation = 'portrait', paper = 'blank') => ({id:uid(), orientation, paper, objects:[]});
  const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
  const icons = {
    select:'M4 3v17l5-5 4 7 3-2-4-7h8Z', text:'M4 5h16M12 5v15M8 20h8', pencil:'m4 20 4-1L20 7l-4-4L4 15Z M13 6l5 5',
    marker:'m5 14 9-11 6 5-9 11Z M5 14l6 5-6 2-3-3Z', shape:'M4 4h16v16H4Z', image:'M3 3h18v18H3Z M3 17l6-6 4 4 3-3 5 5 M15 7h.01', pdf:'M6 2h8l4 4v16H6Z M14 2v5h5 M9 12h6M9 16h6', crop:'M8 3v13a2 2 0 0 0 2 2h11 M3 8h13a2 2 0 0 1 2 2v11',
    undo:'M9 5 4 10l5 5 M4 10h10a6 6 0 0 1 6 6', redo:'m15 5 5 5-5 5 M20 10H10a6 6 0 0 0-6 6',
    plus:'M12 4v16M4 12h16', back:'m12 4-8 8 8 8M4 12h16', trash:'M4 7h16M9 7V3h6v4M6 7l1 14h10l1-14M10 11v6M14 11v6',
    copy:'M8 8h13v13H8ZM3 16V3h13', pen:'m5 19 3-7L17 3l4 4-9 9Z M5 19l4-4', eraser:'m4 15 8-10a2 2 0 0 1 3-.3l5 4.2a2 2 0 0 1 .3 2.8L14 19H7l-3-2.5a2 2 0 0 1 0-1.5Z M10 8l7 6 M7 19h14', more:'M5 12h.01M12 12h.01M19 12h.01', sidebar:'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z M10 3v18M5 7h3M5 11h3M5 15h3', pages:'M5 3h14v18H5ZM8 7h8M8 11h8M8 15h5', focus:'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
    pan:'M5 12V8a2 2 0 0 1 4 0v4-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v8l-4 5H9l-6-7a2 2 0 0 1 2-3Z',
    line:'M4 20 20 4', dashed:'m4 20 3-3m3-3 4-4m3-3 3-3', highlighter:'m4 16 9-13 8 7-12 10Z M4 16l5 4-6 1Z',
    ellipse:'M12 4C7.1 4 4 7.6 4 12s3.1 8 8 8 8-3.6 8-8-3.1-8-8-8Z', arrow:'M4 12h15M12 5l7 7-7 7',
    close:'m5 5 14 14M5 19 19 5', star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9Z', export:'M12 15V3m-5 5 5-5 5 5M4 14v7h16v-7', edit:'m4 20 4-1L20 7l-4-4L4 15Z',
    lock:'M5 10h14v11H5ZM8 10V6a4 4 0 0 1 8 0v4', up:'m5 14 7-7 7 7', down:'m5 10 7 7 7-7', minus:'M5 12h14', move:'M12 2v20M2 12h20m-7-7-3-3-3 3m6 14-3 3-3-3M5 9l-3 3 3 3m14-6 3 3-3 3', fitPage:'M4 4h16v16H4ZM8 8h8v8H8Z',
    alignLeft:'M4 6h16M4 10h10M4 14h16M4 18h10', alignCenter:'M4 6h16M7 10h10M4 14h16M7 18h10', alignRight:'M4 6h16M10 10h10M4 14h16M10 18h10', alignJustify:'M4 6h16M4 10h16M4 14h16M4 18h16', listBullet:'M5 7h.01M9 7h10M5 12h.01M9 12h10M5 17h.01M9 17h10', listNumber:'M4 7h2M4 12h2M4 17h2M9 7h10M9 12h10M9 17h10'
  };
  function button(label, action, icon, cls = '') {
    const b = el('button', `an-button ${cls}`); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
    if (icon && icons[icon]) { const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true'); const p = document.createElementNS(svg.namespaceURI,'path'); p.setAttribute('d',icons[icon]); svg.append(p); b.append(svg); }
    b.append(el('span','',label)); if (action) b.addEventListener('click',action); return b;
  }
  function field(label, control) { const l = el('label','an-field'); control.setAttribute('aria-label',label); l.append(el('span','',label),control); return l; }
  function input(value = '', type = 'text') { const i=el('input'); i.type=type; i.value=value; return i; }
  function select(values, value, change) { const s=el('select'); for (const [id,label] of values) { const o=el('option','',label); o.value=id; s.append(o); } s.value=value; if(change)s.addEventListener('change',()=>change(s.value)); return s; }
  function download(blob, name) { const url=URL.createObjectURL(blob), a=el('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000); }
  const filename = name => (name || 'Notita').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-');
  let pdfRendererPromise;
  function loadPdfRenderer() {
    if (!pdfRendererPromise) {
      pdfRendererPromise = import('../pdfjs-6.3.289.min.mjs').then(pdfjs => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('../pdfjs-worker-6.3.289.min.mjs', document.baseURI).href;
        return pdfjs;
      }).catch(error => { pdfRendererPromise = null; throw error; });
    }
    return pdfRendererPromise;
  }
  const pageFilename = (page,index) => `pagina-${index+1}${String(page.title||'').trim()?'-'+filename(page.title.trim()):''}`;
  function dialog(title, content, submit, label='Salvează') {
    const d=el('dialog','an-dialog'), form=el('form'); form.method='dialog';
    const actions=el('div','an-dialog-actions'); const cancel=button('Anulează',()=>d.close());
    const ok=button(label); ok.type='submit'; ok.classList.add('an-primary'); actions.append(cancel,ok);
    form.append(el('h2','',title),content,actions); d.append(form); document.body.append(d);
    form.addEventListener('submit',async event=>{event.preventDefault(); ok.disabled=true; try { await submit(); d.close(); } catch(error){ok.disabled=false; const msg=el('p','an-error',error.message); form.append(msg);} });
    d.addEventListener('close',()=>d.remove()); d.showModal(); return d;
  }
  const confirmAction = (title, action) => dialog(title,el('p','','Această acțiune poate fi anulată în editor cu butonul „Anulează”.'),action,'Șterge');

  const TOOL_SETTINGS_KEY='atelier-note-tool-settings-v1';
  const TOOL_WIDTHS={pencil:3,line:3,dashed:3,highlighter:20,eraser:24,rect:3,ellipse:3,arrow:3};
  const widthLimit=key=>key==='eraser'?80:['rect','ellipse','arrow'].includes(key)?24:40;
  const COLOR_HISTORY_KEY='atelier-note-color-history-v1';
  const DEFAULT_COLORS=['#111827','#d94a4a','#e88b24','#f2c94c','#287dc4'];
  function loadColorHistory(){try{const saved=JSON.parse(localStorage.getItem(COLOR_HISTORY_KEY));return Array.isArray(saved)?saved.filter(color=>typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color)).slice(0,8):[];}catch{return[];}}
  function rememberColor(color){if(!/^#[0-9a-f]{6}$/i.test(String(color)))return;const normalized=String(color).toLowerCase();const next=[normalized,...loadColorHistory().filter(item=>item!==normalized)].slice(0,8);try{localStorage.setItem(COLOR_HISTORY_KEY,JSON.stringify(next));}catch{}}

  function buildColorPanel(value,apply){
    const panel=el('div','an-color-picker-panel an-palette-panel'),layout=el('div','an-palette-layout'),selected=el('div','an-palette-selected'),sample=el('div','an-palette-sample'),options=el('div','an-palette-options');
    const presets=[['Negru','#111827'],['Roșu','#d94a4a'],['Portocaliu','#e88b24'],['Galben','#f2c94c'],['Albastru','#287dc4'],['Alb','#ffffff'],['Verde','#22a65a'],['Bleu','#8dccfa'],['Lavandă','#9395fa'],['Violet','#a94ef0'],['Roz','#f78fc5'],['Gri','#9baabd']];
    const choose=color=>{rememberColor(color);apply(color);};sample.style.background=value;selected.append(sample,el('span','','Culoare selectată'),el('strong','',presets.find(p=>p[1]===value)?.[0]||'Personalizată'),el('code','',value.toUpperCase()));
    const grid=el('div','an-palette-presets'),recent=el('div','an-color-picker-history');
    const swatch=(name,color)=>{const b=button(name,()=>choose(color),null,'an-palette-swatch');b.style.background=color;b.setAttribute('aria-pressed',String(color.toLowerCase()===value.toLowerCase()));return b;};
    presets.forEach(([name,color])=>grid.append(swatch(name,color)));loadColorHistory().forEach((color,index)=>recent.append(swatch('Culoare recentă '+(index+1),color)));if(!recent.children.length)recent.append(el('span','an-palette-empty','Culorile alese apar aici.'));
    options.append(el('strong','an-width-caption','Preseturi'),grid,el('strong','an-width-caption','Recente'),recent);layout.append(selected,options);
    const custom=el('details','an-palette-custom'),summary=el('summary','','＋ Alege o culoare personalizată…');custom.append(summary);custom.addEventListener('toggle',()=>{if(custom.open&&custom.children.length===1)custom.append(buildCustomColorPanel(value,choose));});panel.append(layout,custom);return panel;
  }

  function buildCustomColorPanel(value,apply){
    const panel=el('div','an-color-picker-panel');
    const rgb=value.match(/[a-f0-9]{2}/ig)?.slice(0,3).map(v=>parseInt(v,16)/255)||[0,0,0];
    const max=Math.max(...rgb),min=Math.min(...rgb),delta=max-min;
    let hue=delta===0?0:max===rgb[0]?60*((rgb[1]-rgb[2])/delta%6):max===rgb[1]?60*((rgb[2]-rgb[0])/delta+2):60*((rgb[0]-rgb[1])/delta+4);
    hue=(hue+360)%360;let saturation=max?delta/max:0,brightness=max;
    const area=el('div','an-color-plane'),cursor=el('span','an-color-cursor');area.append(cursor);area.setAttribute('aria-label','Saturație și luminozitate');
    const hueInput=input(hue,'range');hueInput.min=0;hueInput.max=360;hueInput.className='an-hue-slider';hueInput.setAttribute('aria-label','Nuanță');
    const sat=input(Math.round(saturation*100),'range'),light=input(Math.round(brightness*100),'range');for(const control of [sat,light]){control.min=0;control.max=100;}
    const preview=el('span','an-color-preview');let chosen=value;
    const sync=()=>{const c=brightness*saturation,x=c*(1-Math.abs((hue/60)%2-1)),m=brightness-c;const values=hue<60?[c,x,0]:hue<120?[x,c,0]:hue<180?[0,c,x]:hue<240?[0,x,c]:hue<300?[x,0,c]:[c,0,x];chosen='#'+values.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');area.style.backgroundColor='hsl('+hue+' 100% 50%)';cursor.style.left=saturation*100+'%';cursor.style.top=(1-brightness)*100+'%';preview.style.background=chosen;sat.value=Math.round(saturation*100);light.value=Math.round(brightness*100);};
    const point=event=>{const rect=area.getBoundingClientRect();saturation=clamp((event.clientX-rect.left)/rect.width,0,1);brightness=1-clamp((event.clientY-rect.top)/rect.height,0,1);sync();};
    area.addEventListener('pointerdown',event=>{event.preventDefault();area.setPointerCapture(event.pointerId);point(event);});area.addEventListener('pointermove',event=>{if(area.hasPointerCapture(event.pointerId))point(event);});
    hueInput.addEventListener('input',()=>{hue=Number(hueInput.value);sync();});sat.addEventListener('input',()=>{saturation=Number(sat.value)/100;sync();});light.addEventListener('input',()=>{brightness=Number(light.value)/100;sync();});
    const footer=el('div','an-color-picker-footer');footer.append(preview,button('Aplică',()=>apply(chosen),null,'an-primary'));
    area.tabIndex=0;area.setAttribute('role','group');area.setAttribute('aria-label','Saturație și luminozitate. Folosește săgețile pentru reglare.');area.addEventListener('keydown',event=>{const step=event.shiftKey?.1:.01;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();saturation=clamp(saturation+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0),0,1);brightness=clamp(brightness+(event.key==='ArrowUp'?step:event.key==='ArrowDown'?-step:0),0,1);sync();}});panel.append(area,hueInput,footer);sync();return panel;
  }

  function loadToolSettings(){
    const settings={widths:{...TOOL_WIDTHS},textSize:22,highlighterOpacity:.25};
    try{const saved=JSON.parse(localStorage.getItem(TOOL_SETTINGS_KEY));
      for(const key of Object.keys(TOOL_WIDTHS)){const value=saved?.widths?.[key];if(typeof value==='number'&&Number.isFinite(value))settings.widths[key]=clamp(Math.round(value),1,widthLimit(key));}
      if(Number.isFinite(saved?.highlighterOpacity))settings.highlighterOpacity=clamp(saved.highlighterOpacity,.01,1);
      if(typeof saved?.textSize==='number'&&Number.isFinite(saved.textSize))settings.textSize=clamp(saved.textSize,8,144);
    }catch{}return settings;
  }
  class NotesStore {
    async open() {
      this.db = await new Promise((resolve,reject)=>{ const r=indexedDB.open('atelier-a4-notes',1); r.onupgradeneeded=()=>{r.result.createObjectStore('notes',{keyPath:'id'}); r.result.createObjectStore('meta');}; r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
      this.db.onversionchange=()=>this.db.close();
      if (!await this.get('meta','legacyImported')) {
        const raw=localStorage.getItem('atelier-fisa-general-notes-v1');
        const legacy=raw ? JSON.parse(raw) : [];
        if (!Array.isArray(legacy) || legacy.some(n=>typeof n?.title!=='string'||typeof n?.content!=='string')) throw Error('Notițele vechi nu pot fi importate. Originalele au fost păstrate.');
        const tx=this.db.transaction(['notes','meta'],'readwrite');
        for (let i=0;i<legacy.length;i++) {
          const n=legacy[i], pages=[];
          // Preserve every character of long legacy notes across editable A4 pages.
          const chunks=n.content.match(/[\s\S]{1,1800}/g)||[''];
          for (const chunk of chunks) { const p=pageData(); p.objects.push(TextObject.create(55,65,chunk,684,950)); pages.push(p); }
          tx.objectStore('notes').put({id:`legacy-${i}`,schema:1,title:n.title||'Notiță importată',description:'',projectId:'',projectName:'',createdAt:now(),updatedAt:now(),pages});
        }
        tx.objectStore('meta').put(true,'legacyImported'); await this.done(tx);
      }
      return this;
    }
    done(tx) { return new Promise((resolve,reject)=>{ tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error||Error('Salvare întreruptă')); }); }
    request(request) {return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
    get(store,key) { return new Promise((resolve,reject)=>{const r=this.db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); }
    all() { return new Promise((resolve,reject)=>{const r=this.db.transaction('notes').objectStore('notes').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}); }
    async setMeta(key,value) {const tx=this.db.transaction('meta','readwrite');tx.objectStore('meta').put(copy(value),key);await this.done(tx);}
    async pending() {const tx=this.db.transaction('meta','readonly'),meta=tx.objectStore('meta');const [notes,deletes]=await Promise.all([this.request(meta.get('syncPending')),this.request(meta.get('syncDeletes'))]);return {notes:notes||{},deletes:deletes||{}};}
    async updateQueue({note,id,deletedAt,removeLocal=false,clearNoteAt,clearDeleteAt}={}) {
      const tx=this.db.transaction(removeLocal||note?['notes','meta']:['meta'],'readwrite'),finished=this.done(tx),meta=tx.objectStore('meta');
      const [queuedNotes,queuedDeletes]=await Promise.all([this.request(meta.get('syncPending')),this.request(meta.get('syncDeletes'))]);
      const pending=queuedNotes||{},deletes=queuedDeletes||{};
      if(note){tx.objectStore('notes').put(note);pending[note.id]=note;delete deletes[note.id];}
      else if(removeLocal){tx.objectStore('notes').delete(id);delete pending[id];deletes[id]=deletedAt;}
      else if(clearNoteAt!==undefined){const current=pending[id],matches=typeof clearNoteAt==='object'?JSON.stringify(current)===JSON.stringify(clearNoteAt):current?.updatedAt===clearNoteAt;if(!matches)return finished;delete pending[id];}
      else if(clearDeleteAt!==undefined){if(deletes[id]!==clearDeleteAt)return finished;delete deletes[id];}
      meta.put(pending,'syncPending');meta.put(deletes,'syncDeletes');
      await finished;
    }
    async queueNote(note) {await this.updateQueue({note});}
    async queueDelete(id,deletedAt) {await this.updateQueue({id,deletedAt,removeLocal:true});}
    async clearPendingNote(id,updatedAt) {await this.updateQueue({id,clearNoteAt:updatedAt});}
    async clearPendingDelete(id,deletedAt) {await this.updateQueue({id,clearDeleteAt:deletedAt});}
    async put(note,{sync=true}={}) {if(sync){await this.queueNote(note);window.dispatchEvent(new CustomEvent('atelier-notes-local-change'));}else{const tx=this.db.transaction('notes','readwrite'),finished=this.done(tx);tx.objectStore('notes').put(copy(note));await finished;}}
    async remove(id,{sync=true,deletedAt=now()}={}) {if(sync){await this.queueDelete(id,deletedAt);window.dispatchEvent(new CustomEvent('atelier-notes-local-change'));}else{const tx=this.db.transaction('notes','readwrite'),finished=this.done(tx);tx.objectStore('notes').delete(id);await finished;}}
  }

  class TextObject {
    static cache=new WeakMap();
    static textures=new Map();
    static create(x,y,text='',w=240,h=40){return {id:uid(),type:'text',x,y,w,h,rotation:0,opacity:1,locked:false,text,font:'Arial',fontSize:22,bold:false,italic:false,underline:false,color:'#25384b',align:'left',list:'none',lineHeight:1.35,letterSpacing:0,indent:0,paragraphBefore:0,paragraphAfter:0};}
    static font(s){return `${s.italic?'italic ':''}${s.bold?'700':'400'} ${s.fontSize}px "${s.font}"`;}
    static chars(o){const out=[],runs=o.runs||[],ordered=runs.every((r,i)=>!i||runs[i-1].end<=r.start);let ri=0;for(const match of o.text.matchAll(/\r\n|\r|\n|[\s\S]/gu)){const c=match[0],offset=match.index;while(ordered&&ri<runs.length&&runs[ri].end<=offset)ri++;const run=ordered?(runs[ri]?.start<=offset?runs[ri]:null):runs.find(r=>offset>=r.start&&offset<r.end);out.push({c,start:offset,style:{...o,...run?.style}});}return out;}
    static listGutter(o){return o.list==='bullet'||o.list==='number'?Math.max(o.fontSize*1.4,String(o.text.split(/\r\n|\r|\n/).length).length*o.fontSize*.65+o.fontSize*.8):0;}
    static layout(ctx,o){
      const rows=[],gutter=this.listGutter(o),available=Math.max(12,o.w-12-(o.indent||0)-gutter);let row=[],width=0,y=6+(o.paragraphBefore||0),paragraph=0,first=true;
      const push=(last=false)=>{const height=Math.max(o.fontSize,...row.map(g=>g.style.fontSize))*(o.lineHeight||1.35);rows.push({glyphs:row,width,y,height,last,paragraph,first,marker:first?(o.list==='bullet'?'•':o.list==='number'?(paragraph+1)+'.':''):''});y+=height;row=[];width=0;first=false;};
      const chars=this.chars(o);
      for(let i=0;i<chars.length;i++){const g=chars[i];if(/^(?:\r\n|\r|\n)$/.test(g.c)){push(true);y+=(o.paragraphAfter||0)+(o.paragraphBefore||0);paragraph++;first=true;continue;}ctx.font=this.font(g.style);g.advance=ctx.measureText(g.c).width+(o.letterSpacing||0);
        if(!/\s/.test(g.c)&&(i===0||/\s/.test(chars[i-1].c))){let word=0;for(let j=i;j<chars.length&&!/\s/.test(chars[j].c);j++){ctx.font=this.font(chars[j].style);word+=ctx.measureText(chars[j].c).width+(o.letterSpacing||0);}if(width&&width+word>available&&word<=available)push();}
        if(width+g.advance>available&&row.length)push();row.push(g);width+=g.advance;
      }push(true);for(const r of rows){let x=6+(o.indent||0)+gutter+(o.align==='center'?(available-r.width)/2:o.align==='right'?available-r.width:0);const spaces=r.glyphs.filter(g=>g.c===' ').length,extra=o.align==='justify'&&!r.last&&spaces?Math.max(0,(available-r.width)/spaces):0;for(const g of r.glyphs){g.x=x;g.y=r.y;x+=g.advance+(g.c===' '?extra:0);}}
      return {rows,height:y+6,gutter};
    }
    static fit(o,maxWidth=Infinity){o.w=clamp(o.w||240,42,Math.max(42,maxWidth));const ctx=this.measureContext||(this.measureContext=document.createElement('canvas').getContext('2d'));o.h=Math.max(32,this.layout(ctx,o).height);return o;}
    static texture(kind,color='#25384b'){
      const key=kind+color;if(this.textures.has(key))return this.textures.get(key);const c=el('canvas');c.width=c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#edf1f4';ctx.fillRect(0,0,160,160);ctx.strokeStyle=color;let seed=73;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
      if(kind==='metal'){const g=ctx.createLinearGradient(0,0,160,160);[['0','#25384b'],['.35','#edf1f4'],['.5','#94a6b6'],['.7','#fff'],['1','#59718c']].forEach(([p,v])=>g.addColorStop(+p,v));ctx.fillStyle=g;ctx.fillRect(0,0,160,160);}
      for(let i=0;i<180;i++){ctx.globalAlpha=.08+rnd()*.25;ctx.lineWidth=.3+rnd();ctx.beginPath();const y=rnd()*160;if(kind==='wood'||kind==='marble'){ctx.moveTo(0,y);for(let x=0;x<=160;x+=4)ctx.lineTo(x,y+Math.sin(x/(kind==='wood'?22:42)+i)* (kind==='wood'?5:26));ctx.stroke();}else if(kind==='fiber'||kind==='metal'){ctx.moveTo(0,y);ctx.lineTo(160,y+3);ctx.stroke();}else{ctx.fillStyle=color;ctx.fillRect(rnd()*160,y,kind==='pattern'?3:1,kind==='pattern'?3:1);}}
      this.textures.set(key,c);return c;
    }
    static fill(ctx,o,w,h){const a=o.appearance||{};if(a.type==='gradient'){const angle=(a.angle||0)*Math.PI/180,dx=Math.cos(angle)*w/2,dy=Math.sin(angle)*h/2;const g=a.kind==='radial'?ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)/2):ctx.createLinearGradient(w/2-dx,h/2-dy,w/2+dx,h/2+dy);for(const s of (a.stops||[{at:0,color:o.color},{at:1,color:'#94a6b6'}]))g.addColorStop(clamp(s.at,0,1),s.color);return g;}
      if(a.type==='texture'){const img=a.src?ImageObject.resolved.get(a.src):this.texture(a.kind,o.color);if(img){const p=ctx.createPattern(img,a.repeat==='repeat'||!a.repeat?'repeat':'no-repeat');const ratio=a.repeat==='cover'?Math.max(w/img.width,h/img.height):a.repeat==='contain'?Math.min(w/img.width,h/img.height):1;const matrix=new DOMMatrix().translate(a.x||0,a.y||0).rotate(a.rotation||0).scale((a.scale||1)*ratio);p.setTransform(matrix);return p;}}return o.color;
    }
    static paint(ctx,o){
      const signature=JSON.stringify({...o,x:0,y:0,rotation:0,opacity:1,locked:false});let saved=this.cache.get(o);if(saved?.signature===signature){ctx.drawImage(saved.canvas,0,0,o.w,o.h);return;}
      const c=el('canvas');c.width=Math.ceil(o.w*2);c.height=Math.ceil(o.h*2);const p=c.getContext('2d');p.scale(2,2);p.textBaseline='top';const {rows}=this.layout(p,o);const draw=(target,stroke=false,mask=false)=>{target.textBaseline='top';for(const r of rows){if(r.marker){target.font=this.font(o);target.fillStyle=mask?'#fff':o.color;target.textAlign='right';const x=6+(o.indent||0)+this.listGutter(o)-o.fontSize*.35;stroke?target.strokeText(r.marker,x,r.y):target.fillText(r.marker,x,r.y);target.textAlign='left';}for(const g of r.glyphs){target.font=this.font(g.style);target.fillStyle=mask?'#fff':g.style.color;stroke?target.strokeText(g.c,g.x,g.y):target.fillText(g.c,g.x,g.y);if(g.style.underline&&!stroke)target.fillRect(g.x,g.y+g.style.fontSize+1,g.advance,Math.max(1,g.style.fontSize/18));}}};
      const fx=o.effects||{},highlight=fx.highlight;if(highlight?.enabled){p.save();p.globalAlpha=highlight.opacity??.3;p.fillStyle=highlight.color||'#f2c94c';for(const r of rows){const pad=highlight.padding??3;p.beginPath();p.roundRect(Math.max(0,6-pad),Math.max(0,r.y-pad),Math.min(o.w,r.width+pad*2),r.height+pad*2,highlight.radius||0);p.fill();}p.restore();}
      const mask=el('canvas');mask.width=c.width;mask.height=c.height;const m=mask.getContext('2d');m.scale(2,2);draw(m,false,true);
      for(const name of ['shadow','glow']){const effect=fx[name];if(effect?.enabled){p.save();p.globalAlpha=effect.opacity??.4;p.shadowColor=effect.color||o.color;p.shadowBlur=(effect.blur??8)*2;p.shadowOffsetX=(effect.x||0)*2;p.shadowOffsetY=(effect.y||0)*2;const shade=el('canvas');shade.width=mask.width;shade.height=mask.height;const q=shade.getContext('2d');q.drawImage(mask,0,0);q.globalCompositeOperation='source-in';q.fillStyle=effect.color||o.color;q.fillRect(0,0,shade.width,shade.height);p.drawImage(shade,0,0,o.w,o.h);p.restore();}}
      if(fx.outline?.enabled){p.save();p.globalAlpha=fx.outline.opacity??1;p.strokeStyle=fx.outline.color||o.color;p.lineWidth=(fx.outline.width||1)*2;p.lineJoin='round';draw(p,true);p.restore();}
      if(o.appearance&&o.appearance.type!=='solid'){const layer=el('canvas');layer.width=c.width;layer.height=c.height;const q=layer.getContext('2d');q.scale(2,2);q.fillStyle=o.color;q.fillRect(0,0,o.w,o.h);q.globalAlpha=o.appearance.intensity??1;q.fillStyle=this.fill(q,o,o.w,o.h);q.fillRect(0,0,o.w,o.h);q.globalAlpha=1;q.globalCompositeOperation='destination-in';q.drawImage(mask,0,0,o.w,o.h);p.drawImage(layer,0,0,o.w,o.h);}else draw(p);
      this.cache.set(o,{signature,canvas:c});ctx.drawImage(c,0,0,o.w,o.h);
    }
  }

  class ImageObject {
    static cache = new Map();
    static resolved = new Map();
    static async load(src) {if(this.cache.has(src))return this.cache.get(src); const image=new Image(); const promise=new Promise((resolve,reject)=>{image.onload=()=>{this.resolved.set(src,image);resolve(image);};image.onerror=()=>{this.cache.delete(src);reject(Error('Imaginea nu poate fi încărcată.'));};}); image.src=src;this.cache.set(src,promise);return promise;}
    static async fromFile(file) {if(!file?.type.startsWith('image/'))throw Error('Alege un fișier imagine.'); const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);}); const img=await this.load(src); const scale=Math.min(1,2200/Math.max(img.width,img.height)); const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);const data=c.toDataURL('image/png');return {id:uid(),type:'image',x:70,y:80,w:Math.min(430,c.width),h:Math.min(430,c.width)*c.height/c.width,rotation:0,opacity:1,locked:false,src:data,crop:{x:0,y:0,w:1,h:1}};}
    static paint(ctx,o,image) {const c=o.crop;ctx.drawImage(image,c.x*image.width,c.y*image.height,c.w*image.width,c.h*image.height,0,0,o.w,o.h);}
  }
  class DrawingLayer {
    static paint(ctx,o) {
      ctx.strokeStyle=o.color;ctx.fillStyle=o.color;ctx.lineCap='round';ctx.lineJoin='round';
      const points=o.points, sx=o.w/(o.baseW||o.w||1), sy=o.h/(o.baseH||o.h||1);
      if(o.kind==='highlighter'&&points.length>1){ctx.lineWidth=o.width;ctx.beginPath();ctx.moveTo(points[0].x*sx,points[0].y*sy);for(let i=1;i<points.length;i++){const p=points[i],next=points[i+1]||p;ctx.quadraticCurveTo(p.x*sx,p.y*sy,(p.x+next.x)*sx/2,(p.y+next.y)*sy/2);}const last=points.at(-1);ctx.lineTo(last.x*sx,last.y*sy);ctx.stroke();return;}
      if(o.kind==='line'||o.kind==='dashed'){ctx.lineWidth=o.width;ctx.setLineDash(o.kind==='dashed'?[o.width*2,o.width*2.5]:[]);ctx.beginPath();ctx.moveTo(points[0].x*sx,points[0].y*sy);ctx.lineTo(points.at(-1).x*sx,points.at(-1).y*sy);ctx.stroke();ctx.setLineDash([]);return;}
      if(points.length===1){ctx.beginPath();ctx.arc(points[0].x*sx,points[0].y*sy,o.width/2,0,Math.PI*2);ctx.fill();return;}
      let start={x:points[0].x*sx,y:points[0].y*sy};ctx.lineWidth=o.width;ctx.beginPath();ctx.arc(start.x,start.y,o.width/2,0,Math.PI*2);ctx.fill();for(let i=1;i<points.length;i++){const current=points[i],previous=points[i-1],mid={x:(previous.x+current.x)*sx/2,y:(previous.y+current.y)*sy/2};ctx.lineWidth=o.width*(o.pressure?(.35+.65*((previous.p+current.p)/2)):1);ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo(previous.x*sx,previous.y*sy,mid.x,mid.y);ctx.stroke();start=mid;}if(points.length>1){const last=points.at(-1);ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(last.x*sx,last.y*sy);ctx.stroke();}
    }
    static normalize(o) {let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of o.points){minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);}const x=minX-o.width,y=minY-o.width;o.w=maxX-x+o.width;o.h=maxY-y+o.width;o.baseW=o.w;o.baseH=o.h;o.x=x;o.y=y;o.points=o.points.map(p=>({...p,x:p.x-x,y:p.y-y}));return o;}
  }
  class A4Canvas {
    static paper(ctx,page) {const [w,h]=size(page);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.lineWidth=.6;ctx.strokeStyle='#dce7ee';ctx.beginPath();if(page.paper==='grid'){for(let x=0;x<w;x+=20){ctx.moveTo(x,0);ctx.lineTo(x,h);}for(let y=0;y<h;y+=20){ctx.moveTo(0,y);ctx.lineTo(w,y);}}else if(page.paper==='ruled'){for(let y=65;y<h-35;y+=28){ctx.moveTo(40,y);ctx.lineTo(w-40,y);}}ctx.stroke();}
    static paint(ctx,page,images,except) {
      this.paper(ctx,page);
      for(const o of page.objects){if(o.id!==except)this.object(ctx,o,images);}
    }
    static object(ctx,o,images) {ctx.save();ctx.translate(o.x+o.w/2,o.y+o.h/2);ctx.rotate(o.rotation*Math.PI/180);ctx.translate(-o.w/2,-o.h/2);ctx.globalAlpha=o.opacity??1;ctx.globalCompositeOperation=o.blendMode||'source-over';
      if(o.type==='text'){ctx.beginPath();ctx.rect(0,0,o.w,o.h);ctx.clip();TextObject.paint(ctx,o);}
      else if(o.type==='image'&&images.get(o.src))ImageObject.paint(ctx,o,images.get(o.src));
      else if(o.type==='drawing')DrawingLayer.paint(ctx,o);
      else if(o.type==='shape'){ctx.strokeStyle=o.color;ctx.fillStyle=o.fill||'transparent';ctx.lineWidth=o.width;ctx.beginPath();if(o.shape==='ellipse')ctx.ellipse(o.w/2,o.h/2,Math.max(1,o.w/2-2),Math.max(1,o.h/2-2),0,0,Math.PI*2);else if(o.shape==='arrow'){ctx.moveTo(0,o.h/2);ctx.lineTo(o.w,o.h/2);ctx.moveTo(o.w-o.w*.25,0);ctx.lineTo(o.w,o.h/2);ctx.lineTo(o.w-o.w*.25,o.h);}else ctx.rect(1,1,o.w-2,o.h-2);ctx.fill();ctx.stroke();}ctx.restore();}
    static async render(page,scale=1) {const images=new Map(); await document.fonts.ready;await Promise.all(page.objects.flatMap(o=>o.type==='image'?[o.src]:o.type==='text'&&o.appearance?.src?[o.appearance.src]:[]).map(async src=>images.set(src,await ImageObject.load(src))));const [w,h]=size(page),c=el('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale);const ctx=c.getContext('2d');ctx.scale(scale,scale);this.paint(ctx,page,images);return c;}
  }
  class Export {
    static async pdf(note) {if(!window.PDFLib)throw Error('Biblioteca PDF lipsește. Încarcă și folderul notes pe site.');const pdf=await PDFLib.PDFDocument.create();for(const p of note.pages){const c=await A4Canvas.render(p,2),bytes=await (await fetch(c.toDataURL('image/png'))).arrayBuffer(),img=await pdf.embedPng(bytes);const dims=p.orientation==='landscape'?[841.89,595.28]:[595.28,841.89];pdf.addPage(dims).drawImage(img,{x:0,y:0,width:dims[0],height:dims[1]});}pdf.setTitle(note.title);return new Blob([await pdf.save()],{type:'application/pdf'});}
    static async png(page) {return new Promise(async(resolve,reject)=>{try{const c=await A4Canvas.render(page,2);c.toBlob(b=>b?resolve(b):reject(Error('Exportul imaginii a eșuat.')),'image/png');}catch(e){reject(e);}});}
    static async zip(note,pageIndexes=note.pages.map((_,index)=>index)) {
      // ZIP STORE, with CRC32; each page is an independently usable PNG.
      const chunks=[],entries=[];let offset=0;
      const u16=(v,n)=>new DataView(v.buffer).setUint16(n[0],n[1],true),u32=(v,n)=>new DataView(v.buffer).setUint32(n[0],n[1]>>>0,true);
      for(let i=0;i<note.pages.length;i++){const bytes=new Uint8Array(await (await this.png(note.pages[i])).arrayBuffer()),name=new TextEncoder().encode(pageFilename(note.pages[i],pageIndexes[i]??i)+'.png');let crc=0xffffffff;for(const b of bytes){crc^=b;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
        const h=new Uint8Array(30);[[0,0x04034b50],[14,crc],[18,bytes.length],[22,bytes.length]].forEach(n=>u32(h,n));[[4,20],[26,name.length]].forEach(n=>u16(h,n));chunks.push(h,name,bytes);entries.push({name,crc,length:bytes.length,offset});offset+=30+name.length+bytes.length;}
      const start=offset;for(const e of entries){const h=new Uint8Array(46);[[0,0x02014b50],[16,e.crc],[20,e.length],[24,e.length],[42,e.offset]].forEach(n=>u32(h,n));[[4,20],[6,20],[28,e.name.length]].forEach(n=>u16(h,n));chunks.push(h,e.name);offset+=46+e.name.length;}
      const end=new Uint8Array(22);[[0,0x06054b50],[12,offset-start],[16,start]].forEach(n=>u32(end,n));[[8,entries.length],[10,entries.length]].forEach(n=>u16(end,n));chunks.push(end);return new Blob(chunks,{type:'application/zip'});
    }
    static async print(note) {const frame=el('iframe','an-print-frame');frame.title='Tipărire notiță A4';document.body.append(frame);const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head><title>Notiță A4</title><style>@page portrait{size:A4 portrait;margin:0}@page landscape{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0}section{break-after:page}section:last-child{break-after:auto}img{display:block;width:100%;height:100%}</style></head><body></body></html>');doc.close();for(const p of note.pages){const section=doc.createElement('section'),img=doc.createElement('img');section.style.cssText=`page:${p.orientation};width:${p.orientation==='landscape'?297:210}mm;height:${p.orientation==='landscape'?210:297}mm`;img.src=(await A4Canvas.render(p,1.5)).toDataURL('image/png');section.append(img);doc.body.append(section);await img.decode();}frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print();setTimeout(()=>frame.remove(),120000);}
  }

  class SelectionLayer {
    constructor(editor) {this.e=editor;this.node=el('div','an-selection');this.node.hidden=true;editor.sheet.append(this.node);}
    render() {
      const o=this.e.object;this.node.hidden=!o||this.e.cropSession?.objectId===o.id;if(!o){this.node.replaceChildren();this.objectId=null;return;}
      Object.assign(this.node.style,{left:`${o.x}px`,top:`${o.y}px`,width:`${o.w}px`,height:`${o.h}px`,transform:`rotate(${o.rotation}deg)`});
      this.node.classList.toggle('is-locked',!!o.locked);this.node.classList.toggle('is-text',o.type==='text');this.node.classList.toggle('is-editing',!!this.e.textEditor);this.node.classList.toggle('is-near-left',o.x<48);
      if(this.objectId===o.id&&this.locked===o.locked)return;
      this.objectId=o.id;this.locked=o.locked;this.node.replaceChildren();if(o.locked)return;
      for(const name of (o.type==='text'?['nw','ne','sw','se','rotate']:['nw','ne','sw','se','rotate'])){const h=el('button',`an-handle an-${name}`);h.type='button';h.setAttribute('aria-label',name==='rotate'?'Rotește obiectul':`Redimensionează ${name}`);h.dataset.handle=name;h.addEventListener('pointerdown',event=>this.e.beginTransform(event,name));this.node.append(h);}
      if(o.type==='text'){const move=button('Mută textul',null,'move','an-text-move-handle an-icon');move.addEventListener('pointerdown',event=>this.e.beginTextMove(event,o));this.node.append(move);}
      const readout=el('output','an-rotation-readout');readout.setAttribute('aria-live','polite');readout.innerHTML='<span aria-hidden="true">⌖</span><strong>0°</strong>';this.node.append(readout);this.updateRotation(o.rotation);
    }
    updateRotation(value,snapped=false){const output=this.node.querySelector('.an-rotation-readout');if(!output)return;const normalized=normalizeAngle(Math.round(value));output.querySelector('strong').textContent=normalized+'°';output.style.transform=`rotate(${-value}deg)`;output.classList.toggle('is-snapped',snapped);}
    showRotation(value,snapped=false){this.node.classList.add('is-rotating');this.updateRotation(value,snapped);}
    hideRotation(){this.node.classList.remove('is-rotating');this.node.querySelector('.an-rotation-readout')?.classList.remove('is-snapped');}
  }
  class PageManager {
    constructor(editor) {this.e=editor;this.node=el('aside','an-pages');this.node.setAttribute('aria-label','Paginile notiței');this.node.id='an-note-pages';}
    render() {
      this.node.replaceChildren();const e=this.e,head=el('div','an-pages-head');const title=el('strong','an-pages-title','Pagini');title.append(el('span','an-pages-count',String(e.note.pages.length)));head.append(title,button('Închide panoul de pagini',()=>e.togglePages(),'close','an-icon'));this.node.append(head);const add=button('Adaugă pagină',()=>this.add(),'plus','an-page-add');this.node.append(add);
      e.note.pages.forEach((p,i)=>{
        const wrap=el('div','an-page-item'),name=String(p.title||'').trim()||`Pagina ${i+1}`;
        const card=button(name,()=>e.switchPage(i));card.classList.add('an-page-thumb');card.setAttribute('aria-current',String(i===e.pageIndex));
        const c=el('canvas');c.width=120;c.height=Math.round(120*size(p)[1]/size(p)[0]);card.prepend(c);
        const rename=button('Redenumește pagina',()=>this.rename(i),'edit','an-icon an-page-rename'),meta=el('div','an-page-meta');
        meta.append(card.lastElementChild,rename);wrap.append(card,meta);this.node.append(wrap);
        A4Canvas.render(p,.18).then(render=>{if(card.isConnected)c.getContext('2d').drawImage(render,0,0,c.width,c.height);}).catch(error=>e.status(error.message,true));
      });
    }
    rename(index){
      const e=this.e,page=e.note.pages[index];if(!page)return;
      const content=el('div','an-form-grid'),name=input(page.title||'');
      name.maxLength=60;name.placeholder=`Pagina ${index+1}`;name.setAttribute('aria-label','Denumirea paginii');
      content.append(field('Denumirea paginii',name),el('p','an-hint','Lasă gol pentru denumirea automată.'));
      dialog('Redenumește pagina',content,()=>e.edit(()=>{page.title=name.value.trim();}), 'Salvează');
      requestAnimationFrame(()=>{name.focus();name.select();});
    }
    add() {const e=this.e,template=e.manager.pageTemplates('Pagina nouă');dialog('Adaugă pagină A4',template.node,()=>{const {orientation,paper}=template.value;e.edit(()=>{e.note.pages.splice(e.pageIndex+1,0,pageData(orientation,paper));e.pageIndex++;});e.fit();},'Adaugă');}
    duplicate() {const e=this.e;e.edit(()=>{const p=copy(e.page);p.id=uid();p.objects.forEach(o=>o.id=uid());e.note.pages.splice(e.pageIndex+1,0,p);e.pageIndex++;});}
    remove() {const e=this.e;if(e.note.pages.length===1){e.status('Păstrează cel puțin o pagină.');return;}confirmAction('Ștergi pagina?',()=>e.edit(()=>{e.note.pages.splice(e.pageIndex,1);e.pageIndex=Math.max(0,e.pageIndex-1);}));}
    move(delta) {const e=this.e,index=e.pageIndex+delta;if(index<0||index>=e.note.pages.length)return;e.edit(()=>{const [p]=e.note.pages.splice(e.pageIndex,1);e.note.pages.splice(index,0,p);e.pageIndex=index;});}
  }

  class Toolbar {
    constructor(editor) {this.e=editor;this.node=el('div','an-toolbar');this.modes=el('div','an-modes');this.contextToggle=button('Opțiuni instrument',()=>this.toggleContext(),'more','an-context-toggle an-icon');this.contextToggle.setAttribute('aria-expanded','false');this.context=el('div','an-context');this.top=el('div','an-tools-row');this.objectActions=el('div','an-object-actions');this.top.append(this.modes,this.objectActions,this.contextToggle);this.node.append(this.top,this.context);this.render();}
    toggleContext() {if(this.context.hidden)return;const expanded=this.context.classList.toggle('is-expanded');this.contextToggle.setAttribute('aria-expanded',String(expanded));}
    closePopover(){if(!this.activePopover)return;this.activePopover.trigger.setAttribute('aria-expanded','false');const {content,parent,next,placeholder}=this.activePopover;placeholder?.remove();if(parent?.isConnected)parent.insertBefore(content,next?.parentNode===parent?next:null);this.activePopover.node.remove();document.removeEventListener('pointerdown',this.popoverDismiss,true);this.activePopover=null;}
    openPopover(trigger,title,content){this.closePopover();const parent=content.parentNode,next=content.nextSibling;let placeholder=null;if(parent?.isConnected){const rect=content.getBoundingClientRect();placeholder=el('span','an-popover-placeholder');placeholder.style.cssText=`width:${rect.width}px;height:${rect.height}px;flex:0 0 ${rect.width}px`;parent.insertBefore(placeholder,content);}const node=el('section','an-toolbar-popover');node.setAttribute('role','dialog');node.setAttribute('aria-label',title);node.append(el('strong','an-toolbar-popover-title',title),content);this.node.append(node);const host=this.node.getBoundingClientRect(),rect=trigger.getBoundingClientRect(),left=clamp(rect.left-host.left,8,Math.max(8,this.node.clientWidth-300));node.style.left=`${left}px`;node.style.top=`${rect.bottom-host.top+8}px`;if(this.node.classList.contains('an-text-toolbar')){node.style.setProperty('left',`${left}px`,'important');node.style.setProperty('top',`${rect.bottom-host.top+8}px`,'important');}if(content.classList.contains('an-color-picker-panel')){node.style.setProperty('--picker-left',rect.left+'px');node.style.setProperty('--picker-top',Math.max(8,Math.min(rect.bottom+8,window.innerHeight-420))+'px');}node.classList.add('an-floating-panel');const panelWidth=node.getBoundingClientRect().width||360;node.style.setProperty('left',Math.max(8,Math.min(rect.left,window.innerWidth-panelWidth-8))+'px','important');node.style.setProperty('top',(rect.bottom+8)+'px','important');node.style.setProperty('max-height',Math.max(120,window.innerHeight-rect.bottom-16)+'px','important');trigger.setAttribute('aria-expanded','true');this.activePopover={node,trigger,content,parent,next,placeholder};this.popoverDismiss=event=>{if(this.activePopover&&!node.contains(event.target)&&!trigger.contains(event.target))this.closePopover();};requestAnimationFrame(()=>{if(this.activePopover?.node!==node)return;const width=node.getBoundingClientRect().width;node.style.setProperty('left',Math.max(8,Math.min(rect.left,window.innerWidth-width-8))+'px','important');document.addEventListener('pointerdown',this.popoverDismiss,true);});}
    togglePopover(trigger,title,content){if(this.activePopover?.trigger===trigger){this.closePopover();return;}this.openPopover(trigger,title,content());}
    destroy(){this.closePopover();}
    render() {
      const e=this.e;this.modes.replaceChildren();
      for(const [id,name,icon] of [['select','Selectare','select'],['text','Text','text'],['pencil','Desen','pencil'],['shape','Forme','shape']]){const b=button(name,()=>e.setTool(id),icon);b.dataset.mode=id;b.setAttribute('aria-pressed',String(e.tool===id));this.modes.append(b);}
      let mediaButton;
      mediaButton=button('Imagine / PDF',()=>this.togglePopover(mediaButton,'Adaugă imagine sau PDF',()=>{
        const menu=el('div','an-media-import-menu');
        const option=(label,description,icon,action)=>{const item=button(label,()=>{this.closePopover();action();},icon,'an-media-import-option');item.append(el('small','',description));return item;};
        menu.append(
          option('Adaugă imagine','Inserează o fotografie sau o schiță pe pagina curentă.','image',()=>e.chooseImage()),
          option('Importă PDF','Creează automat câte o pagină A4 pentru fiecare pagină din PDF.','pdf',()=>e.choosePdf())
        );
        return menu;
      }),'image','an-media-import-trigger');
      mediaButton.dataset.mode='media';mediaButton.setAttribute('aria-pressed','false');mediaButton.setAttribute('aria-expanded','false');mediaButton.setAttribute('aria-haspopup','dialog');this.modes.append(mediaButton);
      this.renderContext();
    }
    openWidthPanel(trigger,name,key,max){
      const e=this.e,panel=el('div','an-width-panel'),heading=el('div','an-width-panel-heading'),value=el('output','',String(e[key])),range=input(e[key],'range'),presets=el('div','an-width-presets'),preview=el('div','an-width-preview'),stroke=el('span');
      heading.append(el('span','','Grosime'),value);range.min=1;range.max=max;range.step=1;range.setAttribute('aria-label','Grosime '+name);preview.append(stroke);
      const sync=()=>{const width=Number(range.value),kind=e.tool==='shape'?'shape':e.drawKind;value.textContent=String(width);stroke.style.height=Math.min(width,40)+'px';stroke.style.background=kind==='eraser'?'#94a3b8':e.drawColor;stroke.style.opacity=kind==='highlighter'?String(e.highlighterOpacity):'1';stroke.style.borderTop=kind==='dashed'?Math.min(width,12)+'px dashed '+e.drawColor:'';if(kind==='dashed'){stroke.style.height='0';stroke.style.background='none';}for(const b of presets.children)b.setAttribute('aria-pressed',String(Number(b.dataset.width)===width));if(trigger.classList.contains('an-shape-width-trigger')){trigger.querySelector('strong').textContent=width+' px';trigger.querySelector('.an-shape-width-mark').style.borderTopWidth=Math.min(width,8)+'px';trigger.setAttribute('aria-label',`Grosime contur: ${width} pixeli`);}};
      for(const width of (max===80?[5,10,20,40,80]:[1,2,3,5,8])){const b=button(String(width),()=>{range.value=width;e[key]=width;sync();},null,'an-width-preset'),dot=el('i');dot.style.width=dot.style.height=Math.min(20,Math.max(4,width*2))+'px';b.prepend(dot);b.dataset.width=width;presets.append(b);}
      range.addEventListener('input',()=>{e[key]=Number(range.value);sync();});panel.append(heading,range);if(e.tool!=='shape'&&e.drawKind==='highlighter'){const opacityHeading=el('div','an-width-panel-heading'),opacityValue=el('output','',Math.round(e.highlighterOpacity*100)+'%'),opacity=input(Math.round(e.highlighterOpacity*100),'range');opacity.min=1;opacity.max=100;opacity.step=1;opacity.setAttribute('aria-label','Opacitate evidențiator');opacityHeading.append(el('span','','Opacitate'),opacityValue);opacity.addEventListener('input',()=>{e.highlighterOpacity=Number(opacity.value)/100;opacityValue.textContent=opacity.value+'%';sync();});panel.append(opacityHeading,opacity);}panel.append(el('span','an-width-caption','Presetări rapide'),presets,el('span','an-width-caption','Previzualizare'),preview);sync();this.openPopover(trigger,name,panel);
      const rect=trigger.getBoundingClientRect();this.activePopover.node.classList.add('an-width-popover');this.activePopover.node.style.setProperty('left',Math.max(8,Math.min(rect.left,window.innerWidth-312))+'px','important');this.activePopover.node.style.setProperty('top',Math.max(8,Math.min(rect.bottom+8,window.innerHeight-310))+'px','important');
    }
    historyControls(){const e=this.e,history=el('div','an-history an-context-history');history.setAttribute('aria-label','Istoric modificări');const label=el('span','an-history-label','Istoric'),undo=button('Anulează',()=>e.undo(),'undo','an-icon'),redo=button('Refă',()=>e.redo(),'redo','an-icon');undo.disabled=!e.past.length;redo.disabled=!e.future.length;history.append(label,undo,redo);return history;}
    renderContext() {
      this.closePopover();this.objectActions.replaceChildren();const e=this.e,o=e.object;this.node.classList.toggle('an-text-toolbar',o?.type==='text'||e.tool==='text');this.context.hidden=false;this.context.classList.remove('is-expanded');this.contextToggle.hidden=false;this.contextToggle.setAttribute('aria-expanded','false');this.context.replaceChildren();
      this.context.dataset.mode=o&&e.tool==='select'?o.type:e.tool;e.updateTextHelp?.();
      const add=(label,control,target=this.context)=>target.append(field(label,control));
      const addChoices=(label,choices,value,change)=>{
        const wrap=el('div','an-choice-field');wrap.setAttribute('role','group');wrap.setAttribute('aria-label',label);
        wrap.append(el('span','an-choice-heading',label));
        const buttons=el('div','an-choice-buttons');
        for(const [id,name,icon] of choices){const b=button(name,()=>change(id),icon,'an-choice-button');b.dataset.choice=id;b.setAttribute('aria-pressed',String(id===value));buttons.append(b);}
        wrap.append(buttons);this.context.append(wrap);
      };
      const addRange=(label,value,min,max,change,suffix='px',changeEvent='input',target=this.context)=>{const wrap=el(suffix==='px'?'div':'label','an-field an-range-field'),top=el('span','an-field-heading'),name=el('span','',label),out=el('output','an-range-value',`${value} ${suffix}`),range=input(value,'range');range.min=min;range.max=max;range.setAttribute('aria-label',label);range.addEventListener('input',()=>out.textContent=`${range.value} ${suffix}`);range.addEventListener(changeEvent,()=>change(Number(range.value)));top.append(name,out);wrap.append(top,range);
        if(suffix==='px'){
          wrap.classList.add('an-width-field');range.hidden=true;out.hidden=true;
          const control=el('div','an-width-control'),valueBox=el('div','an-width-value'),manual=input(value,'number');manual.min=min;manual.max=max;manual.step=1;manual.setAttribute('aria-label',label);manual.inputMode='numeric';
          const sync=()=>{manual.value=range.value;minus.disabled=Number(range.value)<=min;plus.disabled=Number(range.value)>=max;};
          const set=value=>{range.value=String(clamp(Number(value)||min,min,max));range.dispatchEvent(new Event(changeEvent,{bubbles:true}));sync();};
          const minus=button('Micșorează '+label.toLocaleLowerCase('ro-RO'),()=>set(Number(range.value)-1),'minus','an-icon'),plus=button('Mărește '+label.toLocaleLowerCase('ro-RO'),()=>set(Number(range.value)+1),'plus','an-icon');manual.addEventListener('change',()=>set(manual.value));range.addEventListener('input',sync);valueBox.append(manual);control.append(minus,valueBox,plus);wrap.append(control);sync();
        }
        target.append(wrap);return range;};
      const addPalette=(label,value,change,target=this.context)=>{const wrap=el('div','an-color-field');wrap.setAttribute('role','group');wrap.setAttribute('aria-label',label);const heading=el('span','an-choice-heading',label),current=el('span','an-current-color');current.style.setProperty('--an-current',value);current.setAttribute('aria-label',`Culoare selectată: ${value}`);heading.append(current);const colors=DEFAULT_COLORS;const swatches=el('div','an-color-swatches');const colorNames=['Negru','Roșu','Portocaliu','Galben','Albastru'];for(const color of colors){const swatch=button(colorNames[colors.indexOf(color)],()=>{rememberColor(color);change(color);},null,'an-color-swatch');swatch.style.setProperty('--an-swatch',color);swatch.style.backgroundColor=color;swatch.setAttribute('aria-pressed',String(color.toLowerCase()===String(value).toLowerCase()));swatches.append(swatch);}const customWrap=button('Culori personalizate și istoric',()=>this.togglePopover(customWrap,label,()=>buildColorPanel(value,color=>{rememberColor(color);change(color);this.closePopover();})),'plus','an-custom-color');customWrap.style.setProperty('--an-current',value);const rgb=String(value).match(/[a-f0-9]{2}/ig)?.slice(0,3).map(v=>parseInt(v,16))||[0,0,0];customWrap.style.setProperty('--an-plus-ink',rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>155?'#25384b':'#fff');customWrap.setAttribute('aria-expanded','false');wrap.append(heading,swatches,customWrap);target.append(wrap);};
      const group=className=>el('div',`an-toolbar-group ${className}`);
      const addPopover=(label,summary,icon,build,target=this.context)=>{let trigger;trigger=button(label,()=>this.togglePopover(trigger,label,build),icon,'an-popover-trigger');trigger.setAttribute('aria-expanded','false');trigger.lastElementChild.textContent=summary||'';if(!summary)trigger.classList.add('an-popover-icon-trigger');if(label==='Aliniere'||label==='Listă')trigger.classList.add('an-text-options-trigger');target.append(field(label,trigger));return trigger;};
      const popoverOption=(label,action,icon,cls='')=>button(label,()=>{action();this.closePopover();},icon,`an-popover-option ${cls}`);
      let textFormatGroup=null,textAppearanceGroup=null,contextHistoryPlaced=false;
      if(o&&e.tool==='select') {
        if(o.type==='text'){
          const objectGroup=group('an-text-zone an-text-object-group'),state=group('an-text-state-group'),properties=group('an-text-zone an-text-properties-group'),transform=group('an-text-transform-group'),actions=group('an-text-actions-group');
          state.append(el('span','an-context-title','Text'),button('Editează',()=>e.editText(o),'edit','an-toolbar-icon-button'));
          const rotation=input(normalizeAngle(o.rotation),'number');rotation.min=-180;rotation.max=180;rotation.step=1;rotation.addEventListener('change',()=>e.changeObject({rotation:normalizeAngle(Number(rotation.value)||0)}));rotation.disabled=!!o.locked;add('Rotație °',rotation,transform);
          const opacity=addRange('Opacitate',Math.round(o.opacity*100),5,100,value=>e.changeObject({opacity:value/100}),'%','change',transform);opacity.disabled=!!o.locked;
          let arrangeTrigger;arrangeTrigger=button('Aranjare',()=>this.togglePopover(arrangeTrigger,'Aranjare',()=>{const content=el('div','an-popover-options');content.append(popoverOption('În față',()=>e.order(1),'up'),popoverOption('În spate',()=>e.order(-1),'down'));return content;}),'more','an-icon an-toolbar-icon-button an-arrange-trigger');arrangeTrigger.setAttribute('aria-expanded','false');
          actions.append(button('Duplică',()=>e.duplicate(),'copy','an-icon an-toolbar-icon-button'),button(o.locked?'Deblochează':'Blochează',()=>e.changeObject({locked:!o.locked},true),'lock','an-toolbar-icon-button'),arrangeTrigger,button('Șterge',()=>e.removeObject(),'trash','an-danger an-icon an-toolbar-icon-button'));
          objectGroup.append(state,actions);properties.append(transform);this.context.append(objectGroup,properties);textFormatGroup=group('an-text-zone an-text-format-group');textAppearanceGroup=group('an-text-zone an-text-appearance-group');this.context.append(textFormatGroup,textAppearanceGroup);
        }else{
          const primary=group('an-object-primary-actions'),adjustments=group('an-object-adjustments'),secondary=group('an-object-secondary-actions');
          if(o.type==='image'&&!o.locked){primary.append(button('Decupează',()=>e.cropImage(o),'crop','an-object-primary-button'),button('Înlocuiește',()=>e.chooseImage(o.id),'image','an-object-primary-button'));}
          const opacity=addRange('Opacitate',Math.round(o.opacity*100),5,100,value=>e.changeObject({opacity:value/100}),'%','change',adjustments);opacity.disabled=!!o.locked;
          secondary.append(button('Duplică',()=>e.duplicate(),'copy','an-icon an-toolbar-icon-button'),button(o.locked?'Deblochează':'Blochează',()=>e.changeObject({locked:!o.locked},true),'lock','an-icon an-toolbar-icon-button'),button('Șterge',()=>e.removeObject(),'trash','an-danger an-icon an-toolbar-icon-button'));
          if(primary.children.length)this.context.append(primary);
          this.context.append(adjustments,secondary);
        }
      }
      if((o?.type==='text'&&!o.locked)||e.tool==='text') {
        if(!textFormatGroup){const objectGroup=group('an-text-zone an-text-object-group'),state=group('an-text-state-group');state.append(el('span','an-context-title','Text nou'));objectGroup.append(state);textFormatGroup=group('an-text-zone an-text-format-group');textAppearanceGroup=group('an-text-zone an-text-appearance-group');this.context.append(objectGroup,textFormatGroup,textAppearanceGroup);}
        const style=e.textSelectionStyle(),target=textFormatGroup,update=patch=>e.applyTextPatch(patch);
        const presets=[['body','Corp de text',22,false,'Adaugă text'],['subtitle','Subtitlu',28,true,'Adaugă un subtitlu'],['title','Titlu',36,true,'Adaugă un titlu'],['heading','Titlu principal',44,true,'Adaugă un titlu principal']],currentPreset=presets.find(item=>item[2]===style.fontSize&&item[3]===style.bold)?.[0]||'body';
        const presetTrigger=addPopover('Stil text',presets.find(item=>item[0]===currentPreset)[1],null,()=>{const content=el('div','an-style-popover');for(const [id,label,fontSize,bold,placeholder] of presets){const apply=()=>e.object?update({fontSize,bold,italic:id==='quote',textPreset:id}):e.insertPresetText({id,fontSize,bold,italic:id==='quote',placeholder});const option=popoverOption(label,apply,'',`an-style-preview${id===currentPreset?' is-selected':''}`);option.style.fontSize=`${Math.min(fontSize,24)}px`;option.style.fontWeight=bold?'700':'400';content.append(option);}return content;},target);presetTrigger.classList.add('an-primary-text-style');
        const fonts=[['Arial','Arial'],['Georgia','Georgia'],['Verdana','Verdana'],['Courier New','Monospace']];
        addPopover('Font',style.font,null,()=>{const content=el('div','an-font-popover'),search=input('','search');search.placeholder='Caută un font';search.setAttribute('aria-label','Caută un font');const options=el('div','an-popover-options');for(const [value,label] of fonts){const option=popoverOption(label,()=>update({font:value}),'',`an-font-option${value===style.font?' is-selected':''}`);option.style.fontFamily=value;options.append(option);}search.addEventListener('input',()=>{const query=search.value.trim().toLocaleLowerCase('ro-RO');for(const option of options.children)option.hidden=!option.textContent.toLocaleLowerCase('ro-RO').includes(query);});content.append(search,options);return content;},target).style.fontFamily=style.font;
        addPopover('Mărime',`${style.fontSize}px`,null,()=>{
          const content=el('div','an-size-popover an-size-studio'),readout=el('div','an-size-readout'),manual=input(style.fontSize,'number'),unit=el('span','','px'),preview=el('div','an-size-preview','Aa'),range=input(style.fontSize,'range'),presets=el('div','an-size-presets');
          manual.min=8;manual.max=144;manual.step=1;manual.setAttribute('aria-label','Mărime text în pixeli');manual.inputMode='numeric';
          range.min=8;range.max=144;range.step=1;range.setAttribute('aria-label','Reglează mărimea textului');
          const set=value=>{const next=clamp(Math.round(Number(value)||22),8,144);style.fontSize=next;manual.value=String(next);range.value=String(next);preview.style.fontSize=Math.min(54,Math.max(16,next))+'px';for(const option of presets.children)option.classList.toggle('is-selected',Number(option.dataset.size)===next);e.applyTextPatch({fontSize:next},{live:true});};
          readout.append(el('span','','Mărime text'),manual,unit);
          for(const value of [12,16,22,32,48]){const option=button(String(value),()=>set(value),null,'an-size-preset');option.dataset.size=String(value);presets.append(option);}
          range.addEventListener('input',()=>set(range.value));manual.addEventListener('change',()=>set(manual.value));manual.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();set(manual.value);manual.blur();}});
          content.append(readout,preview,range,el('span','an-width-caption','Mărimi rapide'),presets);preview.style.fontSize=Math.min(54,Math.max(16,style.fontSize))+'px';for(const option of presets.children)option.classList.toggle('is-selected',Number(option.dataset.size)===style.fontSize);return content;
        },target);
        const textStyles=group('an-text-style-group');for(const [key,name] of [['bold','Bold'],['italic','Italic'],['underline','Subliniat']]){const b=button(name,()=>update({[key]:!style[key]}));b.classList.add('an-text-style-button',`an-text-style-${key}`);b.setAttribute('aria-pressed',String(!!style[key]));textStyles.append(b);}target.append(field('Stil',textStyles));
        const aligns=[['left','Stânga','alignLeft'],['center','Centru','alignCenter'],['right','Dreapta','alignRight'],['justify','Justificat','alignJustify']],alignIcon=aligns.find(item=>item[0]===style.align)?.[2]||'alignLeft';
        addPopover('Aliniere','',alignIcon,()=>{const content=el('div','an-icon-popover-grid');for(const [value,label,icon] of aligns){const option=popoverOption(label,()=>update({align:value}),icon,`an-icon-popover-option${value===style.align?' is-selected':''}`);content.append(option);}return content;},target);
        const lists=[['none','Fără listă','close'],['bullet','Cu puncte','listBullet'],['number','Numerotată','listNumber']],listIcon=lists.find(item=>item[0]===style.list)?.[2]||'close';
        addPopover('Listă','',listIcon,()=>{const content=el('div','an-icon-popover-grid an-list-popover');for(const [value,label,icon] of lists)content.append(popoverOption(label,()=>update({list:value}),icon,`an-icon-popover-option${value===style.list?' is-selected':''}`));return content;},target);
        addPalette('Culoare text',style.color,color=>{e.applyTextPatch({color});if(e.object?.appearance?.type&&e.object.appearance.type!=='solid')e.applyTextPatch({appearance:{type:'solid'}},{whole:true});},textAppearanceGroup);textAppearanceGroup.append(this.historyControls());contextHistoryPlaced=true;
      } else if(e.tool==='pencil') {
        const choices=[['pencil','Creion','pencil'],['highlighter','Evidențiator','highlighter'],['line','Linie','line'],['dashed','Linie punctată','dashed'],['eraser','Gumă','eraser']];
        addChoices('Instrument',choices,e.drawKind,v=>{if(e.drawKind!==v){e.drawKind=v;this.renderContext();return;}if(this.activePopover?.trigger?.dataset.choice===v){this.closePopover();return;}this.renderContext();const key=v==='highlighter'?'highlighterWidth':v==='eraser'?'eraserWidth':'drawWidth';this.openWidthPanel(this.context.querySelector('[data-choice="'+v+'"]'),choices.find(item=>item[0]===v)[1],key,v==='eraser'?80:40);});
        addPalette('Culoare',e.drawColor,color=>{e.drawColor=color;this.renderContext();});
        this.context.append(button('Șterge desenele',()=>confirmAction('Ștergi toate trasările de pe pagină?',()=>e.edit(()=>{e.page.objects=e.page.objects.filter(o=>o.type!=='drawing');})),'trash','an-danger an-clear-drawing'));
      } else if(e.tool==='shape') {
        const shapes=[['rect','Dreptunghi','shape'],['ellipse','Elipsă','ellipse'],['arrow','Săgeată','arrow']];
        addChoices('Formă',shapes,e.shapeKind,v=>{e.shapeKind=v;this.renderContext();const trigger=this.context.querySelector(`[data-choice="${v}"]`),label=shapes.find(item=>item[0]===v)?.[1]||'Formă';trigger?.setAttribute('title',`Ajustează grosimea conturului · ${label}`);if(trigger)this.openWidthPanel(trigger,`Contur · ${label}`,'drawWidth',24);});
        addPalette('Culoare contur',e.drawColor,color=>{e.drawColor=color;this.renderContext();});
        this.context.append(button('Șterge formele',()=>confirmAction('Ștergi toate formele de pe pagina curentă?',()=>e.edit(()=>{e.page.objects=e.page.objects.filter(o=>o.type!=='shape');})),'trash','an-danger an-clear-shapes'));
      } else if(!o) {if(e.tool==='select'){this.objectActions.append(this.historyControls());this.context.hidden=true;this.contextToggle.hidden=true;return;}this.context.append(el('span','an-hint',e.tool==='pan'?'Trage pentru deplasare. Două degete pentru zoom.':'Alege instrumentul și lucrează direct pe foaia A4.'));}
      if(!contextHistoryPlaced){const history=this.historyControls();if(textAppearanceGroup){textAppearanceGroup.append(history);contextHistoryPlaced=true;}else this.context.append(history);}
      if(this.node.classList.contains('an-text-toolbar')){
        // Reparent existing controls; their handlers and editor commands remain intact.
        const objectGroup=this.context.querySelector('.an-text-object-group'),properties=this.context.querySelector('.an-text-properties-group');
        if(objectGroup&&o){const actions=objectGroup.querySelector('.an-text-actions-group');
          if(actions){for(const action of [...actions.children]){if(action.classList.contains('an-arrange-trigger'))continue;action.classList.add('an-icon');this.objectActions.append(action);}}

        }
        objectGroup?.remove();
        if(textFormatGroup){const controls=[...textFormatGroup.children];controls.forEach((control,index)=>control.dataset.textControl=['preset','font','size','style','alignment','list'][index]);this.context.append(...controls);textFormatGroup.remove();}
        if(textAppearanceGroup){this.context.append(...textAppearanceGroup.children);textAppearanceGroup.remove();}properties?.remove();
        this.contextToggle.hidden=true;
      }

    }
  }

  class NoteEditor {
    constructor(manager,note,options={}) {
      this.onClose=options.onClose;
      this.manager=manager;this.note=copy(note);this.pageIndex=clamp(note.activePage||0,0,note.pages.length-1);this.selected=null;this.tool='select';this.drawKind='pencil';this.drawColor='#25384b';this.toolSettings=loadToolSettings();this.shapeKind='rect';this.textStyle=TextObject.create(0,0);this.textStyle.fontSize=this.toolSettings.textSize;this.past=[];this.future=[];this.images=new Map();this.pointers=new Map();this.zoom=1;this.saveChain=Promise.resolve();this.dirty=false;this.revision=0;this.suppressClickUntil=0;this.pagesCollapsed=false;this.focusMode=false;
      this.root=el('section','an-editor');this.root.setAttribute('aria-label','Editor de notițe A4');this.root.id='atelierNoteEditor';
      const header=el('header','an-editor-header');const titleBlock=el('div','an-document-name');this.title=el('strong','',this.note.title);this.saveStatus=el('span','an-save-status','Salvat pe acest dispozitiv');this.saveStatus.setAttribute('role','status');titleBlock.append(this.title,this.saveStatus);
      this.pagesToggle=button('Pagini',()=>this.togglePages(),'sidebar','an-pages-toggle');this.pagesToggle.setAttribute('aria-expanded','true');this.pagesToggle.setAttribute('aria-controls','an-note-pages');this.pagesToggle.title='Ascunde paginile';
      this.zoomLabel=el('output','an-footer-zoom-value','100%');this.zoomLabel.setAttribute('aria-label','Zoom pagină');const zoomControls=el('div','an-footer-zoom');zoomControls.setAttribute('role','group');zoomControls.setAttribute('aria-label','Zoom pagină');zoomControls.append(button('Micșorează pagina',()=>this.zoomCentered(this.zoom/1.2),'minus','an-icon'),this.zoomLabel,button('Mărește pagina',()=>this.zoomCentered(this.zoom*1.2),'plus','an-icon'),button('Încadrează pagina',()=>this.fit(),'fitPage','an-fit-page'));
      header.append(button(options.backLabel||'Notițe',()=>this.close(),'back'),titleBlock,this.pagesToggle,button('Detalii',()=>manager.details(this.note,updated=>{this.edit(()=>Object.assign(this.note,updated));this.title.textContent=this.note.title;}),'edit'),button('Exportă',()=>this.exportMenu(),'export'));
      this.sheet=el('div','an-sheet');this.canvas=el('canvas','an-canvas');this.canvas.setAttribute('aria-label','Pagina A4. Alege un instrument pentru a edita.');this.liveCanvas=el('canvas','an-live-canvas');this.liveCanvas.setAttribute('aria-hidden','true');this.sheet.append(this.canvas,this.liveCanvas);this.canvas.tabIndex=0;this.canvas.draggable=false;
      this.board=el('div','an-board');this.space=el('div','an-sheet-space');this.space.append(this.sheet);this.board.append(this.space);
      this.pages=new PageManager(this);this.selection=new SelectionLayer(this);this.toolbar=new Toolbar(this);this.toolbar.top.prepend(this.pagesToggle);
      const body=el('div','an-editor-body');body.append(this.pages.node,this.board);
      this.footer=el('footer','an-editor-footer');this.pageLabel=el('span');this.textHelp=el('span','an-text-help');
      this.footer.append(this.pageLabel,this.textHelp,zoomControls,button('Șterge pagina',()=>this.pages.remove(),'trash','an-danger an-delete-page'));
      this.root.append(header,this.toolbar.node,body,this.footer);document.body.append(this.root);this.oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
      this.abort=new AbortController();const signal=this.abort.signal;
      this.canvas.addEventListener('pointerdown',event=>this.down(event),{signal});this.board.addEventListener('pointermove',event=>this.move(event),{signal});this.board.addEventListener('pointerup',event=>this.up(event),{signal});this.board.addEventListener('pointercancel',event=>this.up(event,true),{signal});
      this.root.addEventListener('click',event=>{if(event.target===this.canvas&&performance.now()<this.suppressClickUntil){event.preventDefault();event.stopPropagation();}},{capture:true,signal});
      this.board.addEventListener('pointerdown',event=>{if(event.target===this.board||event.target===this.space)this.down(event,true);},{signal});
      this.board.addEventListener('scroll',()=>this.rememberViewportAnchor(),{passive:true,signal});
      this.board.addEventListener('wheel',event=>{if(event.ctrlKey||event.metaKey){event.preventDefault();this.zoomAt(this.zoom*Math.exp(-event.deltaY*.008),event.clientX,event.clientY);}},{passive:false,signal});
      this.board.addEventListener('contextmenu',event=>{if(event.target!==this.textEditor)event.preventDefault();},{signal});
      const editable=target=>target instanceof Element&&Boolean(target.closest('input,textarea,select,[contenteditable]'));
      for(const type of ['selectstart','dragstart'])this.root.addEventListener(type,event=>{if(!editable(event.target))event.preventDefault();},{signal});
      for(const type of ['touchstart','touchmove'])this.board.addEventListener(type,event=>{if(!editable(event.target)&&event.cancelable)event.preventDefault();},{passive:false,signal});
      this.root.addEventListener('keydown',event=>this.key(event),{signal});document.addEventListener('selectionchange',()=>this.captureTextRange(),{signal});this.toolbar.node.addEventListener('pointerdown',event=>{this.captureTextRange();if(this.textEditor&&event.target.closest('button,summary'))event.preventDefault();},{signal});
      window.addEventListener('beforeunload',event=>{if(this.dirty){this.flush().catch(()=>{});event.preventDefault();event.returnValue='';}},{signal});
      document.addEventListener('visibilitychange',()=>{if(document.hidden)this.flush().catch(()=>{});},{signal});
      this.resize=new ResizeObserver(()=>this.preserveDocumentPositionOnResize());this.resize.observe(this.board);
      this.refresh();requestAnimationFrame(()=>this.fit());this.canvas.focus({preventScroll:true});
    }
    get activeWidthKey(){return this.tool==='shape'?this.shapeKind:(Object.hasOwn(TOOL_WIDTHS,this.drawKind)?this.drawKind:'pencil');}
    get drawWidth(){return this.toolSettings.widths[this.activeWidthKey];}
    set drawWidth(value){this.setToolWidth(this.activeWidthKey,value);}
    get highlighterOpacity(){return this.toolSettings.highlighterOpacity??.25;}
    set highlighterOpacity(value){if(Number.isFinite(value)){this.toolSettings.highlighterOpacity=clamp(value,.01,1);this.saveToolSettings();}}
    get highlighterWidth(){return this.toolSettings.widths.highlighter;}
    set highlighterWidth(value){this.setToolWidth('highlighter',value);}
    get eraserWidth(){return this.toolSettings.widths.eraser;}
    set eraserWidth(value){this.setToolWidth('eraser',value);}
    setToolWidth(key,value){if(!Number.isFinite(value))return;this.toolSettings.widths[key]=clamp(Math.round(value),1,widthLimit(key));this.saveToolSettings();}
    saveToolSettings(){try{localStorage.setItem(TOOL_SETTINGS_KEY,JSON.stringify(this.toolSettings));}catch{this.status('Preferințele instrumentelor nu pot fi păstrate după închidere în acest browser.',true);}}
    get page(){return this.note.pages[this.pageIndex];}
    get object(){return this.page.objects.find(o=>o.id===this.selected);}
    viewportAnchor(){if(!this.board?.clientWidth||!this.board?.clientHeight)return null;const board=this.board.getBoundingClientRect(),sheet=this.sheet.getBoundingClientRect(),[width,height]=size(this.page);return {x:clamp((board.left+this.board.clientWidth/2-sheet.left)/this.zoom,0,width),y:clamp((board.top+this.board.clientHeight/2-sheet.top)/this.zoom,0,height)};}
    rememberViewportAnchor(force=false){const boardWidth=this.board.clientWidth,boardHeight=this.board.clientHeight;if(!force&&this.resizeAnchor&&(Math.abs(this.resizeAnchor.boardWidth-boardWidth)>1||Math.abs(this.resizeAnchor.boardHeight-boardHeight)>1))return;const anchor=this.viewportAnchor();if(anchor)this.resizeAnchor={...anchor,boardWidth,boardHeight};}
    restoreViewportAnchor(anchor){if(!anchor)return;const board=this.board.getBoundingClientRect(),sheet=this.sheet.getBoundingClientRect();this.board.scrollLeft+=sheet.left-board.left+anchor.x*this.zoom-this.board.clientWidth/2;this.board.scrollTop+=sheet.top-board.top+anchor.y*this.zoom-this.board.clientHeight/2;}
    preserveDocumentPositionOnResize(){if(this.textEditor||this.gesture?.kind==='text')return;const anchor=this.resizeAnchor||this.viewportAnchor();if(this.autoFit)this.fit();this.restoreViewportAnchor(anchor);this.rememberViewportAnchor(true);}
    togglePages(){this.pagesCollapsed=!this.pagesCollapsed;this.root.classList.toggle('an-pages-collapsed',this.pagesCollapsed);this.pagesToggle.setAttribute('aria-expanded',String(!this.pagesCollapsed));this.pagesToggle.title=this.pagesCollapsed?'Arată paginile':'Ascunde paginile';requestAnimationFrame(()=>this.fit());}
    status(text,error=false){this.saveStatus.textContent=text;this.saveStatus.classList.toggle('an-error',error);}
    snapshot(){const snapshot={...this.note,pages:this.note.pages.map(page=>({...page,objects:page.objects.map(o=>o.type==='drawing'?{...copy({...o,points:undefined}),points:o.points}:copy(o))}))};this.past.push(snapshot);if(this.past.length>30)this.past.shift();this.future=[];}
    edit(action){this.cancelCrop();this.endText();this.snapshot();action();this.selected=null;this.changed();this.refresh();}
    changed(delay=420,paint=true){this.note.updatedAt=now();this.note.activePage=this.pageIndex;this.revision++;this.dirty=true;this.lastInputAt=performance.now();this.status('Modificări nesalvate');this.scheduleSave(Math.max(delay,1800));if(paint)this.requestPaint();}
    isBusy(){return Boolean(this.gesture||this.textComposing||performance.now()-(this.lastInputAt||0)<1800);}
    scheduleSave(delay=1800){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush({force:false}).catch(()=>{}),delay);}
    schedulePagesRender(delay=2000){clearTimeout(this.pagesTimer);this.pagesTimer=setTimeout(()=>{this.pagesTimer=null;if(!this.root.isConnected)return;if(this.isBusy()){this.schedulePagesRender();return;}this.pages.render();},delay);}
    async flush({force=true}={}){
      clearTimeout(this.timer);
      if(force&&this.gesture?.kind==='draw'&&this.preview){const last=this.preview.points.at(-1),r=this.sheet.getBoundingClientRect();this.up({pointerId:this.gesture.id,pointerType:'pen',pressure:last.p,clientX:r.left+last.x*this.zoom,clientY:r.top+last.y*this.zoom,preventDefault(){}});clearTimeout(this.timer);}
      if(!force&&this.isBusy()){if(this.dirty)this.scheduleSave();return;}
      if(this.saving){await this.saving;return this.flush({force});}
      if(!this.dirty)return;
      const revision=this.revision,data=copy(this.note);this.status('Se salvează…');
      this.saving=this.manager.store.put(data).then(()=>{if(revision===this.revision){this.dirty=false;this.status('Salvat pe acest dispozitiv');}}).catch(error=>{this.status('Salvarea a eșuat. Păstrează editorul deschis și exportă o copie editabilă.',true);throw error;});
      try{await this.saving;}finally{this.saving=null;}
    }
    async close(){this.cancelCrop();this.endText();this.clearLiveStroke();clearTimeout(this.pagesTimer);try{await this.flush();}catch{return;}this.toolbar.destroy();this.abort.abort();this.resize.disconnect();cancelAnimationFrame(this.frame);this.root.remove();document.body.style.overflow=this.oldOverflow;this.manager.editor=null;await this.manager.render();if(this.onClose)await this.onClose();else document.getElementById('workspaceAddNote').focus();}
    undo(){this.cancelCrop();this.endText();if(!this.past.length)return;this.future.push(copy(this.note));this.note=this.past.pop();this.pageIndex=clamp(this.note.activePage??this.pageIndex,0,this.note.pages.length-1);this.selected=null;this.changed();this.refresh();this.canvas.focus({preventScroll:true});}
    redo(){this.cancelCrop();this.endText();if(!this.future.length)return;this.past.push(copy(this.note));this.note=this.future.pop();this.pageIndex=clamp(this.note.activePage??this.pageIndex,0,this.note.pages.length-1);this.selected=null;this.changed();this.refresh();this.canvas.focus({preventScroll:true});}
    setTool(tool){this.cancelCrop();this.endText();this.tool=tool==='marker'?'pencil':tool;this.drawKind=this.tool==='pencil'?'pencil':this.drawKind;this.selected=null;this.refresh(false);}
    switchPage(i){this.cancelCrop();this.endText();this.pageIndex=i;this.selected=null;this.changed();this.refresh();this.fit();}
    refresh(pages=true){this.title.textContent=this.note.title;this.pageLabel.textContent=`${String(this.page.title||'').trim()||`Pagina ${this.pageIndex+1}`} · ${this.pageIndex+1} / ${this.note.pages.length} · A4 ${this.page.orientation==='portrait'?'vertical':'orizontal'}`;const [w,h]=size(this.page);this.sheet.style.width=`${w}px`;this.sheet.style.height=`${h}px`;this.canvas.width=this.liveCanvas.width=w*2;this.canvas.height=this.liveCanvas.height=h*2;this.canvas.style.width=this.liveCanvas.style.width=`${w}px`;this.canvas.style.height=this.liveCanvas.style.height=`${h}px`;this.applyZoom();this.toolbar.render();this.selection.render();if(pages)this.pages.render();this.requestPaint();}
    requestPaint(){if(this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=null;if(!this.root.isConnected)return;const ctx=this.canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);A4Canvas.paint(ctx,this.page,this.images,this.textEditor?this.selected:this.cropSession?.objectId);if(this.preview&&this.preview.type!=='drawing')A4Canvas.object(ctx,this.preview,this.images);for(const o of this.page.objects){if(o.type==='text'&&o.appearance?.src&&!ImageObject.resolved.has(o.appearance.src)){ImageObject.load(o.appearance.src).then(()=>{TextObject.cache.delete(o);this.requestPaint();}).catch(error=>this.status(error.message,true));}if(o.type==='image'&&!this.images.has(o.src)){this.images.set(o.src,null);ImageObject.load(o.src).then(img=>{this.images.set(o.src,img);this.requestPaint();}).catch(error=>this.status(error.message,true));}}});}
    queueLivePaint(){if(this.liveFrame)return;this.liveFrame=requestAnimationFrame(()=>{this.liveFrame=null;this.paintLiveStroke();});}
    paintLiveStroke(){const drawing=this.preview;if(!drawing)return;const ctx=this.liveCanvas.getContext('2d'),points=drawing.points;if(drawing.kind==='highlighter'){ctx.clearRect(0,0,this.liveCanvas.width,this.liveCanvas.height);ctx.save();ctx.setTransform(2,0,0,2,0,0);ctx.globalAlpha=drawing.opacity;DrawingLayer.paint(ctx,drawing);ctx.restore();return;}ctx.save();ctx.setTransform(2,0,0,2,0,0);ctx.globalAlpha=drawing.opacity;ctx.strokeStyle=drawing.color;ctx.fillStyle=drawing.color;ctx.lineCap='round';ctx.lineJoin='round';if(['line','dashed'].includes(drawing.kind)){ctx.clearRect(0,0,this.liveCanvas.width,this.liveCanvas.height);ctx.lineWidth=drawing.width;ctx.setLineDash(drawing.kind==='dashed'?[drawing.width*2,drawing.width*2.5]:[]);ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);ctx.lineTo(points.at(-1).x,points.at(-1).y);ctx.stroke();ctx.setLineDash([]);this.livePaintedPoints=points.length;ctx.restore();return;}let painted=this.livePaintedPoints||0;if(!painted&&points.length){ctx.lineWidth=drawing.width;ctx.beginPath();ctx.arc(points[0].x,points[0].y,drawing.width/2,0,Math.PI*2);ctx.fill();this.liveLastMid=points[0];painted=1;}for(let i=painted;i<points.length;i++){const previous=points[i-1],current=points[i],mid={x:(previous.x+current.x)/2,y:(previous.y+current.y)/2};ctx.lineWidth=drawing.width*(drawing.pressure?(.35+.65*((previous.p+current.p)/2)):1);ctx.beginPath();ctx.moveTo(this.liveLastMid.x,this.liveLastMid.y);ctx.quadraticCurveTo(previous.x,previous.y,mid.x,mid.y);ctx.stroke();this.liveLastMid=mid;}this.livePaintedPoints=points.length;ctx.restore();}
    clearLiveStroke(){if(this.liveFrame){cancelAnimationFrame(this.liveFrame);this.liveFrame=null;}const ctx=this.liveCanvas.getContext('2d');ctx.clearRect(0,0,this.liveCanvas.width,this.liveCanvas.height);this.livePaintedPoints=0;this.liveLastMid=null;}
    appendDrawingSamples(events){const drawing=this.preview;if(!drawing||!events.length)return false;let changed=false;const minimum=drawing.pressure ? .9 : 1.2;if(['line','dashed'].includes(drawing.kind)){const point=this.point(events.at(-1)),first=drawing.points[0],last=drawing.points.at(-1);if(Math.hypot(point.x-last.x,point.y-last.y)>minimum){drawing.points=[first,point];changed=true;}}else for(const item of events){const point=this.point(item),last=drawing.points.at(-1);if(Math.hypot(point.x-last.x,point.y-last.y)>minimum){drawing.points.push(point);changed=true;}}if(changed)this.queueLivePaint();return changed;}
    applyZoom(){const [w,h]=size(this.page);this.sheet.style.transform=`scale(${this.zoom})`;this.sheet.style.setProperty('--an-handle',`${14/this.zoom}px`);this.sheet.style.setProperty('--an-zoom',String(this.zoom));this.space.style.width=`${w*this.zoom}px`;this.space.style.height=`${h*this.zoom}px`;this.zoomLabel.textContent=`${Math.round(this.zoom*100)}%`;}
    fit(){if(this.board.clientWidth<20||this.board.clientHeight<20)return;this.autoFit=true;const [w,h]=size(this.page),style=getComputedStyle(this.board),horizontal=parseFloat(style.paddingLeft)+parseFloat(style.paddingRight),vertical=parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);this.zoom=clamp(Math.min((this.board.clientWidth-horizontal-4)/w,(this.board.clientHeight-vertical-4)/h),.15,4);this.applyZoom();this.board.scrollLeft=0;this.board.scrollTop=0;this.rememberViewportAnchor(true);}
    setZoom(z){this.autoFit=false;if(this.textEditor)this.textAutoFit=false;this.zoom=clamp(z,.15,4);this.applyZoom();}
    zoomCentered(z){const rect=this.board.getBoundingClientRect();this.zoomAt(z,rect.left+rect.width/2,rect.top+rect.height/2);}
    zoomAt(z,x,y){const rect=this.sheet.getBoundingClientRect(),old=this.zoom,px=(x-rect.left)/old,py=(y-rect.top)/old;this.setZoom(z);const next=this.sheet.getBoundingClientRect();this.board.scrollLeft+=next.left+px*this.zoom-x;this.board.scrollTop+=next.top+py*this.zoom-y;this.rememberViewportAnchor();}
    point(event){const rect=this.sheet.getBoundingClientRect();return {x:(event.clientX-rect.left)/this.zoom,y:(event.clientY-rect.top)/this.zoom,p:event.pointerType==='pen'?clamp(event.pressure||.5,.05,1):.7};}
    local(o,p){const a=-o.rotation*Math.PI/180,dx=p.x-o.x-o.w/2,dy=p.y-o.y-o.h/2;return {x:dx*Math.cos(a)-dy*Math.sin(a)+o.w/2,y:dx*Math.sin(a)+dy*Math.cos(a)+o.h/2};}
    hit(p){return [...this.page.objects].reverse().find(o=>{const q=this.local(o,p);return q.x>=-4&&q.y>=-4&&q.x<=o.w+4&&q.y<=o.h+4;});}
    down(event,pan=false){
      if(event.button>0||event.isPrimary===false&&event.pointerType!=='touch')return;
      if(this.gesture?.pen&&event.pointerType==='touch')return;
      if(event.pointerType==='pen'&&this.gesture&&!this.gesture.pen){if(this.gesture.before&&this.gesture.o)Object.assign(this.gesture.o,this.gesture.before);this.preview=null;this.clearLiveStroke();this.pointers.clear();this.gesture=null;}
      this.lastInputAt=performance.now();clearTimeout(this.pagesTimer);event.preventDefault();this.endText();const nativeSelection=window.getSelection();if(nativeSelection?.anchorNode&&this.root.contains(nativeSelection.anchorNode))nativeSelection.removeAllRanges();this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});event.target.setPointerCapture(event.pointerId);
      if(this.pointers.size===2){this.preview=null;if(this.gesture?.before&&this.gesture?.o)Object.assign(this.gesture.o,this.gesture.before);const a=[...this.pointers.values()];this.gesture={kind:'pinch',distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),zoom:this.zoom,cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2};this.requestPaint();return;}
      const p=this.point(event);this.gesture={kind:'tap',start:p,clientX:event.clientX,clientY:event.clientY,id:event.pointerId,pen:event.pointerType==='pen',moved:false};
      if(pan||this.tool==='pan'){Object.assign(this.gesture,{kind:'pan',clientX:event.clientX,clientY:event.clientY,scrollX:this.board.scrollLeft,scrollY:this.board.scrollTop});return;}
      if(this.tool==='select'){const o=this.hit(p);this.selected=o?.id||null;this.toolbar.renderContext();this.selection.render();if(o&&!o.locked)Object.assign(this.gesture,{kind:'move',o,before:copy(o)});return;}
      if(this.tool==='text'){const existing=this.hit(p);if(existing?.type==='text'&&!existing.locked){this.selected=existing.id;this.tool='select';this.toolbar.renderContext();this.selection.render();Object.assign(this.gesture,{kind:'move',o:existing,before:copy(existing),fromTextTool:true});return;}this.gesture.kind='text';return;}
      if(this.tool==='shape'){this.gesture.kind='shape';this.preview={id:uid(),type:'shape',shape:this.shapeKind,x:p.x,y:p.y,w:1,h:1,rotation:0,opacity:.86,locked:false,color:this.drawColor,fill:'transparent',width:this.drawWidth};this.requestPaint();return;}
      if(this.tool==='pencil'){clearTimeout(this.timer);if(this.drawKind==='eraser'){this.snapshot();this.gesture.kind='erase';this.erase(p);return;}this.gesture.kind='draw';this.preview={id:uid(),type:'drawing',kind:this.drawKind,x:0,y:0,w:1,h:1,rotation:0,locked:false,opacity:this.drawKind==='highlighter'?this.highlighterOpacity:this.drawKind==='marker'?.65:1,color:this.drawColor,width:this.drawKind==='highlighter'?this.highlighterWidth:this.drawWidth,pressure:this.drawKind==='pencil',points:[p]};this.livePaintedPoints=0;this.liveLastMid=null;this.queueLivePaint();}
    }
    insertPresetText({id='body',fontSize=22,bold=false,italic=false,placeholder='Adaugă text'}){
      this.endText();this.snapshot();const [pageWidth,pageHeight]=size(this.page),wide=['title','heading','heading2'].includes(id),boxWidth=Math.min(pageWidth-72,wide?620:500),existing=this.page.objects.filter(object=>object.type==='text').length,y=clamp(92+(existing%7)*30,36,pageHeight-150),x=(pageWidth-boxWidth)/2,o=Object.assign(TextObject.create(x,y,placeholder,boxWidth),copy(this.textStyle),{id:uid(),x,y,w:boxWidth,fontSize,bold,italic,textPreset:id,text:placeholder,align:wide?'center':'left',list:'none',runs:[]});
      TextObject.fit(o,Math.max(42,pageWidth-o.x-12));this.page.objects.push(o);this.selected=o.id;this.tool='select';this.changed();this.schedulePagesRender();this.editText(o,false);this.textRange={start:0,end:o.text.length};this.restoreTextRange();
    }
    textBounds(start,end){const [w,h]=size(this.page),x=clamp(end?Math.min(start.x,end.x):start.x,6,w-54),y=clamp(end?Math.min(start.y,end.y):start.y,6,h-this.textStyle.fontSize*1.35-12),width=end?Math.abs(end.x-start.x):360;return {x,y,w:clamp(width,42,w-x-6),h:Math.max(32,this.textStyle.fontSize*1.35+12)};}
    showTextPlacement(start,end){const b=this.textBounds(start,end);if(!this.textPlacement){this.textPlacement=el('div','an-text-placement');this.sheet.append(this.textPlacement);}Object.assign(this.textPlacement.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:Math.max(b.h,Math.abs(end.y-start.y))+'px'});}
    updateTextHelp(){if(!this.textHelp)return;const active=this.tool==='text'||this.object?.type==='text';this.textHelp.hidden=!active;this.textHelp.textContent=this.tool==='text'?'Apasă pentru text · Trage pentru lățimea casetei':this.textEditor?'Enter: rând nou · Aliniere în interiorul casetei':'Dublu clic pentru editare · Trage marginile pentru lățime';this.canvas.style.cursor=this.tool==='text'?'text':'';}
    beginTextMove(event,o){if(!o||o.locked)return;event.preventDefault();event.stopPropagation();const id=event.pointerId,startX=event.clientX,startY=event.clientY,before=copy(o),zoom=this.zoom,[pageWidth,pageHeight]=size(this.page);let moved=false;this.endText();this.selected=o.id;this.tool='select';this.selection.render();const move=next=>{if(next.pointerId!==id)return;next.preventDefault();const dx=(next.clientX-startX)/zoom,dy=(next.clientY-startY)/zoom;if(!moved&&Math.hypot(dx,dy)*zoom>4){moved=true;this.snapshot();}if(!moved)return;o.x=clamp(before.x+dx,-o.w+20,pageWidth-20);o.y=clamp(before.y+dy,-o.h+20,pageHeight-20);this.selection.render();this.requestPaint();};const finish=next=>{if(next.pointerId!==id)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',finish,true);if(moved){this.changed();this.pages.render();}this.toolbar.render();this.selection.render();};window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',finish,true);window.addEventListener('pointercancel',finish,true);}
    beginTransform(event,handle){const o=this.object;if(!o||o.locked)return;event.preventDefault();event.stopPropagation();this.endText();try{this.board.setPointerCapture(event.pointerId);}catch{}this.gesture={kind:handle==='rotate'?'rotate':handle==='move'?'move':'resize',handle,id:event.pointerId,start:this.point(event),before:copy(o),o,moved:false,snapAngle:null};if(handle==='rotate')this.selection.showRotation(o.rotation);}
    move(event){
      if(this.pointers.has(event.pointerId))this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});const g=this.gesture;if(!g)return;
      if(g.kind==='pinch'){if(this.pointers.size<2)return;event.preventDefault();const a=[...this.pointers.values()],cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2;this.zoomAt(g.zoom*Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)/Math.max(1,g.distance),g.cx,g.cy);this.board.scrollLeft-=cx-g.cx;this.board.scrollTop-=cy-g.cy;g.cx=cx;g.cy=cy;return;}
      if(g.id!==event.pointerId)return;event.preventDefault();const p=this.point(event),dx=p.x-g.start.x,dy=p.y-g.start.y;
      if(!g.moved&&Math.hypot(dx,dy)*this.zoom>4){g.moved=true;if(['move','resize','rotate'].includes(g.kind))this.snapshot();}
      if(g.kind==='text'){g.end=p;if(g.moved)this.showTextPlacement(g.start,p);return;}
      if(g.kind==='pan'){this.board.scrollLeft=g.scrollX-(event.clientX-g.clientX);this.board.scrollTop=g.scrollY-(event.clientY-g.clientY);this.rememberViewportAnchor();return;}
      if(g.kind==='erase'){this.erase(p);return;}
      if(g.kind==='draw'){const batch=event.getCoalescedEvents?.()||[event];this.appendDrawingSamples(batch.length?batch:[event]);return;}
      if(g.kind==='shape'&&this.preview){this.preview.x=Math.min(g.start.x,p.x);this.preview.y=Math.min(g.start.y,p.y);this.preview.w=Math.max(2,Math.abs(p.x-g.start.x));this.preview.h=Math.max(2,Math.abs(p.y-g.start.y));this.requestPaint();return;}
      if(g.moved&&g.o){const o=g.o,b=g.before,[w,h]=size(this.page);if(g.kind==='move'){o.x=clamp(b.x+dx,-o.w+20,w-20);o.y=clamp(b.y+dy,-o.h+20,h-20);}else if(g.kind==='rotate'){const cx=b.x+b.w/2,cy=b.y+b.h/2,startAngle=Math.atan2(g.start.y-cy,g.start.x-cx)*180/Math.PI,currentAngle=Math.atan2(p.y-cy,p.x-cx)*180/Math.PI,raw=normalizeAngle(b.rotation+normalizeAngle(currentAngle-startAngle)),nearest=normalizeAngle(Math.round(raw/15)*15),strong=normalizeAngle(Math.round(raw/45)*45),strongDistance=Math.abs(normalizeAngle(raw-strong)),fineDistance=Math.abs(normalizeAngle(raw-nearest)),snapped=strongDistance<=6?strong:fineDistance<=3.5?nearest:null;o.rotation=snapped===null?raw:snapped;if(snapped!==null&&g.snapAngle!==snapped){g.snapAngle=snapped;this.selection.node.classList.remove('did-snap');void this.selection.node.offsetWidth;this.selection.node.classList.add('did-snap');navigator.vibrate?.(8);}else if(snapped===null)g.snapAngle=null;this.selection.showRotation(o.rotation,snapped!==null);}else if(g.kind==='resize'){const a=b.rotation*Math.PI/180,lx=dx*Math.cos(a)+dy*Math.sin(a),ly=-dx*Math.sin(a)+dy*Math.cos(a),left=g.handle.includes('w'),top=g.handle.includes('n');const horizontal=/[we]/.test(g.handle),vertical=/[ns]/.test(g.handle);let nw=horizontal?Math.max(42,b.w+(left?-lx:lx)):b.w,nh=vertical?Math.max(24,b.h+(top?-ly:ly)):b.h;if(o.type==='image'){const scale=Math.max(nw/b.w,nh/b.h);nw=b.w*scale;nh=b.h*scale;}else if(o.type==='text'){const scale=clamp(horizontal?nw/b.w:nh/b.h,.3,6);nw=b.w*scale;nh=b.h*scale;o.fontSize=clamp(b.fontSize*scale,8,144);o.runs=(b.runs||[]).map(run=>{const next=copy(run);if(Number.isFinite(next.style?.fontSize))next.style.fontSize=clamp(next.style.fontSize*scale,8,144);return next;});}const cx=(left?-1:1)*(nw-b.w)/2,cy=(top?-1:1)*(nh-b.h)/2;o.x=b.x+(b.w-nw)/2+cx*Math.cos(a)-cy*Math.sin(a);o.y=b.y+(b.h-nh)/2+cx*Math.sin(a)+cy*Math.cos(a);o.w=nw;o.h=nh;if(o.type==='text'){const scaledHeight=o.h;TextObject.fit(o,o.w);o.h=Math.max(scaledHeight,o.h);}}this.selection.render();this.requestPaint();}
    }
    up(event,cancel=false){
      this.pointers.delete(event.pointerId);const g=this.gesture;if(!g)return;if(g.kind==='pinch'){if(!this.pointers.size)this.gesture=null;return;}if(g.id!==event.pointerId)return;if(g.kind==='draw'&&!cancel){const finalBatch=event.getCoalescedEvents?.()||[];this.appendDrawingSamples(finalBatch.length?finalBatch:[event]);}this.gesture=null;this.textPlacement?.remove();this.textPlacement=null;
      this.selection.hideRotation();
      if(cancel){if(g.before&&g.o)Object.assign(g.o,g.before);this.preview=null;this.clearLiveStroke();this.requestPaint();this.selection.render();if(this.dirty)this.scheduleSave();this.schedulePagesRender();return;}
      if(g.kind==='draw'&&this.preview){event.preventDefault();this.suppressClickUntil=performance.now()+450;this.snapshot();this.page.objects.push(DrawingLayer.normalize(this.preview));const committed=this.page.objects.at(-1);this.preview=null;this.clearLiveStroke();const ctx=this.canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);A4Canvas.object(ctx,committed,this.images);this.changed(1800,false);this.schedulePagesRender();this.toolbar.node.querySelectorAll('.an-history').forEach(group=>{const buttons=group.querySelectorAll('button');if(buttons[0])buttons[0].disabled=!this.past.length;if(buttons[1])buttons[1].disabled=!this.future.length;});return;}
      else if(g.kind==='text'){this.snapshot();const bounds=this.textBounds(g.start,g.moved?g.end:null),o=Object.assign(TextObject.create(bounds.x,bounds.y),copy(this.textStyle),bounds,{id:uid(),text:'',runs:[]});TextObject.fit(o);this.page.objects.push(o);this.selected=o.id;this.tool='select';this.changed();this.editText(o,false);}

      else if(g.kind==='shape'&&this.preview){this.snapshot();const o={...this.preview,id:uid(),w:Math.max(30,this.preview.w),h:Math.max(30,this.preview.h),opacity:1};this.preview=null;this.page.objects.push(o);this.selected=o.id;this.changed();this.pages.render();}
      else if(g.o&&g.moved||g.kind==='erase'){this.changed();this.pages.render();}
      else if(g.o?.type==='text'&&!g.o.locked){if(g.fromTextTool||event.pointerType==='touch'||event.pointerType==='pen'){this.editText(g.o);return;}const stamp=performance.now();if(this.lastTextTap?.id===g.o.id&&stamp-this.lastTextTap.time<380){this.lastTextTap=null;this.editText(g.o);return;}this.lastTextTap={id:g.o.id,time:stamp};}
      this.toolbar.render();this.selection.render();this.requestPaint();
    }
    erase(p){
      const previous=this.gesture.lastErase||p;this.gesture.lastErase=p;
      this.page.objects=this.page.objects.flatMap(o=>{
        if(o.type!=='drawing'||o.locked)return [o];
        const a=this.local(o,previous),b=this.local(o,p),radius=this.eraserWidth/2+o.width/2;
        const sx=o.w/(o.baseW||o.w||1),sy=o.h/(o.baseH||o.h||1),dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
        const hit=q=>{const x=q.x*sx,y=q.y*sy,t=length?clamp(((x-a.x)*dx+(y-a.y)*dy)/length,0,1):0;return Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<=radius;};
        const runs=[];let run=[],removed=false;
        const visit=q=>{if(hit(q)){removed=true;if(run.length)runs.push(run);run=[];}else run.push(q);};
        visit(o.points[0]);
        for(let i=1;i<o.points.length;i++){const u=o.points[i-1],v=o.points[i],steps=Math.max(1,Math.ceil(Math.hypot((v.x-u.x)*sx,(v.y-u.y)*sy)/2));for(let j=1;j<=steps;j++){const t=j/steps;visit({x:u.x+(v.x-u.x)*t,y:u.y+(v.y-u.y)*t,p:(u.p??.7)+((v.p??.7)-(u.p??.7))*t});}}
        if(!removed)return [o];if(run.length)runs.push(run);
        return runs.map(points=>({...o,id:uid(),points}));
      });this.requestPaint();
    }
    captureTextRange(){const t=this.textEditor,s=window.getSelection();if(!t||!s?.rangeCount||!t.contains(s.anchorNode)||!t.contains(s.focusNode))return;const r=s.getRangeAt(0),before=r.cloneRange();before.selectNodeContents(t);before.setEnd(r.startContainer,r.startOffset);const start=before.toString().length;this.textRange={start,end:start+r.toString().length};}
    restoreTextRange(){const t=this.textEditor;if(!t)return;const limit=this.object.text.length,{start,end}=this.textRange||{start:limit,end:limit},walker=document.createTreeWalker(t,NodeFilter.SHOW_TEXT);let n,offset=0,a,b;while(n=walker.nextNode()){if(!a&&start<=offset+n.length)a=[n,Math.max(0,start-offset)];if(!b&&end<=offset+n.length)b=[n,Math.max(0,end-offset)];offset+=n.length;}const r=document.createRange();if(a){r.setStart(...a);r.setEnd(...(b||a));}else{r.selectNodeContents(t);r.collapse(false);}const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
    textSelectionStyle(){const o=this.object;if(!o||o.type!=='text')return this.textStyle;const pos=this.textRange?.start??0;return {...o,...o.runs?.find(r=>pos>=r.start&&pos<r.end)?.style};}
    renderTextEditor(){const t=this.textEditor,o=this.object;if(!t||!o)return;Object.assign(t.style,{left:o.x+'px',top:o.y+'px',width:o.w+'px',height:o.h+'px',transform:`rotate(${o.rotation}deg)`,fontFamily:o.font,fontSize:o.fontSize+'px',fontWeight:o.bold?'700':'400',fontStyle:o.italic?'italic':'normal',textAlign:o.align,lineHeight:String(o.lineHeight||1.35),letterSpacing:(o.letterSpacing||0)+'px',paddingLeft:(6+(o.indent||0)+TextObject.listGutter(o))+'px',paddingTop:(6+(o.paragraphBefore||0))+'px',opacity:o.opacity});
      t.style.setProperty('--an-text-inset',(6+(o.indent||0)+TextObject.listGutter(o))+'px');t.replaceChildren();const runs=o.runs?.length?o.runs:[{start:0,end:o.text.length,style:{}}];let last=0;const append=(text,style)=>{const span=el('span','',text);span._textStyle=copy(style);Object.assign(span.style,{fontFamily:style.font||o.font,fontSize:(style.fontSize||o.fontSize)+'px',fontWeight:(style.bold??o.bold)?'700':'400',fontStyle:(style.italic??o.italic)?'italic':'normal',textDecoration:(style.underline??o.underline)?'underline':'none',color:style.color||o.color});t.append(span);};for(const r of [...runs].sort((a,b)=>a.start-b.start)){if(r.start>last)append(o.text.slice(last,r.start),{});append(o.text.slice(r.start,r.end),r.style);last=r.end;}if(last<o.text.length)append(o.text.slice(last),{});if(!o.text||o.text.endsWith('\r\n')){const br=el('br');br.dataset.placeholder='true';t.append(br);}t.dataset.empty=String(!o.text);this.renderTextMarkers();}
    queueTextRead(t=this.textEditor){if(!t||this.textEditor!==t)return;this.textInputDirty=true;if(this.textComposing||this.textInputFrame)return;this.textInputFrame=requestAnimationFrame(()=>{this.textInputFrame=null;if(this.textEditor===t&&!this.textComposing)this.readTextEditor();});}
    readTextEditor(){if(this.textInputFrame){cancelAnimationFrame(this.textInputFrame);this.textInputFrame=null;}this.textInputDirty=false;const o=this.object,t=this.textEditor;if(!o||!t)return;let text='',runs=[];const visit=(n,style={})=>{if(n.nodeType===3){const start=text.length;text+=n.nodeValue;if(text.length>start)runs.push({start,end:text.length,style:copy(style)});return;}if(n.nodeType!==1)return;if(n.tagName==='BR'){if(!n.dataset.placeholder)text+='\r\n';return;}const block=['DIV','P','LI'].includes(n.tagName);if(block&&text&&!text.endsWith('\r\n'))text+='\r\n';for(const child of n.childNodes)visit(child,n._textStyle||style);};for(const n of t.childNodes)visit(n);if(t.childNodes.length===1&&t.firstChild.tagName==='BR')text='';if(text===o.text&&JSON.stringify(runs)===JSON.stringify(o.runs||[])){this.captureTextRange();return;}o.text=text;o.runs=runs;TextObject.fit(o,Math.max(42,size(this.page)[0]-o.x-8));t.style.height=o.h+'px';t.dataset.empty=String(!o.text);this.captureTextRange();this.renderTextMarkers();this.changed(420,false);this.selection.render();}
    applyTextPatch(patch,{live=false,whole=false}={}){if(this.textInputDirty&&!this.textComposing)this.readTextEditor();const o=this.object?.type==='text'?this.object:this.textStyle;if(o.locked)return;if(this.textEditor&&Object.keys(patch).some(k=>['appearance','effects','blendMode','rotation','opacity','paragraphBefore','paragraphAfter'].includes(k)))this.endText();this.captureTextRange();const range=this.textEditor&&this.textRange;const inline=['font','fontSize','bold','italic','underline','color'];const fragment=!whole&&range&&range.end>range.start&&Object.keys(patch).every(k=>inline.includes(k));
      if(o===this.object){const stamp=performance.now();if(!live||!this.textPatchTime||stamp-this.textPatchTime>700)this.snapshot();this.textPatchTime=stamp;}
      if(fragment){const chars=TextObject.chars(o);o.runs=chars.map(g=>({start:g.start,end:g.start+g.c.length,style:Object.fromEntries(inline.map(k=>[k,(g.start>=range.start&&g.start<range.end&&k in patch)?patch[k]:g.style[k]]))}));}
      else{Object.assign(o,copy(patch));if(o.runs&&Object.keys(patch).some(k=>inline.includes(k)))for(const r of o.runs)for(const k of inline)if(k in patch)delete r.style[k];}
      if(Number.isFinite(patch.fontSize)){this.toolSettings.textSize=patch.fontSize;this.textStyle.fontSize=patch.fontSize;this.saveToolSettings();}
      if(o===this.object){TextObject.fit(o,Math.max(o.w,size(this.page)[0]-o.x-8));if(this.textEditor){this.renderTextEditor();this.textEditor.focus({preventScroll:true});this.restoreTextRange();}this.changed();this.selection.render();this.schedulePagesRender();}if(!live)this.toolbar.renderContext();else if(!this.toolbar.activePopover)this.toolbar.renderContext();
    }
    renderTextMarkers(){this.textMarkers?.remove();this.textMarkers=null;const o=this.object;if(!this.textEditor||!o||!TextObject.listGutter(o))return;this.textEditor.style.paddingLeft=(6+(o.indent||0)+TextObject.listGutter(o))+'px';const markers=el('div','an-text-list-markers');markers.setAttribute('aria-hidden','true');Object.assign(markers.style,{left:o.x+'px',top:o.y+'px',width:o.w+'px',height:o.h+'px',transform:'rotate('+o.rotation+'deg)',opacity:o.opacity});const {rows,gutter}=TextObject.layout(document.createElement('canvas').getContext('2d'),o);for(const row of rows){if(!row.marker)continue;const marker=el('span','',row.marker);Object.assign(marker.style,{left:(6+(o.indent||0))+'px',top:row.y+'px',width:(gutter-o.fontSize*.35)+'px',fontFamily:o.font,fontSize:o.fontSize+'px',fontWeight:o.bold?'700':'400',fontStyle:o.italic?'italic':'normal',lineHeight:String(o.lineHeight||1.35),color:o.color});markers.append(marker);}this.sheet.append(markers);this.textMarkers=markers;}
    insertTextContent(value){if(this.textInputDirty)this.readTextEditor();const o=this.object;if(!o||!this.textEditor)return;this.captureTextRange();const {start,end}=this.textRange||{start:o.text.length,end:o.text.length},style=this.textSelectionStyle(),inline=['font','fontSize','bold','italic','underline','color'],delta=value.length-(end-start);this.snapshot();const runs=[];for(const r of o.runs||[]){if(r.start<start)runs.push({...copy(r),end:Math.min(start,r.end)});if(r.end>end)runs.push({...copy(r),start:Math.max(end,r.start)+delta,end:r.end+delta});}if(value.length)runs.push({start,end:start+value.length,style:Object.fromEntries(inline.map(k=>[k,style[k]]))});o.text=o.text.slice(0,start)+value+o.text.slice(end);o.runs=runs.sort((a,b)=>a.start-b.start);TextObject.fit(o,Math.max(42,size(this.page)[0]-o.x-6));this.textRange={start:start+value.length,end:start+value.length};this.renderTextEditor();this.textEditor.focus({preventScroll:true});this.restoreTextRange();this.changed();this.schedulePagesRender();}
    editText(o,checkpoint=true){if(o.locked)return;if(this.textEditor&&this.selected===o.id){this.textEditor.focus();return;}this.endText();if(checkpoint)this.snapshot();this.selected=o.id;this.tool='select';this.textRange={start:o.text.length,end:o.text.length};const t=el('div','an-text-editor');t.contentEditable='true';t.setAttribute('role','textbox');t.setAttribute('aria-multiline','true');t.setAttribute('aria-label','Textul casetei');t.spellcheck=true;t.dataset.placeholder='Scrie aici…';this.textAutoFit=this.autoFit;this.autoFit=false;this.textEditor=t;this.sheet.append(t);TextObject.fit(o);this.renderTextEditor();
      const textEdge=event=>{if(event.pointerType==='touch'||event.pointerType==='pen')return false;const p=this.point(event),local=this.local(o,p);return Math.min(local.x,local.y,o.w-local.x,o.h-local.y)*this.zoom<=14;};t.addEventListener('pointermove',event=>{if(!event.buttons)t.style.cursor=textEdge(event)?'move':'text';});t.addEventListener('pointerdown',event=>{if(textEdge(event)){this.beginTextMove(event,o);return;}event.stopPropagation();});t.addEventListener('beforeinput',event=>{if(event.isComposing||this.textComposing)return;if(event.inputType==='insertParagraph'||event.inputType==='insertLineBreak'){event.preventDefault();this.insertTextContent('\r\n');}else if(event.inputType==='historyUndo'||event.inputType==='historyRedo'){event.preventDefault();event.inputType==='historyUndo'?this.undo():this.redo();}});
      let inputTime=-Infinity;t.addEventListener('compositionstart',()=>{if(this.textEditor!==t)return;this.snapshot();this.textComposing=true;inputTime=performance.now();});t.addEventListener('compositionend',()=>{if(this.textEditor!==t)return;this.textComposing=false;this.queueTextRead(t);});t.addEventListener('beforeinput',event=>{if(event.defaultPrevented||event.isComposing||this.textComposing)return;if(performance.now()-inputTime>650)this.snapshot();inputTime=performance.now();});t.addEventListener('input',()=>this.queueTextRead(t));t.addEventListener('paste',event=>{event.preventDefault();const value=event.clipboardData?.getData('text/plain');if(value!=null)this.insertTextContent(value.replace(/\r\n|\r|\n/g,'\r\n'));});
      t.addEventListener('blur',()=>setTimeout(()=>{if(this.textEditor===t&&!this.toolbar.node.contains(document.activeElement)&&!t.contains(document.activeElement))this.endText();},0));
      this.selection.render();this.toolbar.render();this.requestPaint();t.focus({preventScroll:true});this.restoreTextRange();
    }
    endText(){if(!this.textEditor)return;this.textComposing=false;this.readTextEditor();const t=this.textEditor;this.textEditor=null;this.autoFit=this.textAutoFit??this.autoFit;this.textRange=null;t.remove();this.textMarkers?.remove();this.textMarkers=null;this.updateTextHelp();this.selection.render();this.requestPaint();this.pages.render();}

    changeObject(patch,allowLocked=false){const o=this.object;if(!o||o.locked&&!allowLocked)return;this.cancelCrop();this.endText();this.snapshot();Object.assign(o,patch);this.changed();this.toolbar.render();this.selection.render();this.pages.render();}
    duplicate(){const o=this.object;if(!o)return;this.cancelCrop();this.endText();this.snapshot();const n=copy(o);n.id=uid();n.x+=18;n.y+=18;n.locked=false;this.page.objects.push(n);this.selected=n.id;this.changed();this.toolbar.render();this.selection.render();this.pages.render();}
    removeObject(){const o=this.object;if(!o||o.locked)return;this.edit(()=>{this.page.objects=this.page.objects.filter(n=>n.id!==o.id);});}
    order(direction){const o=this.object;if(!o||o.locked)return;this.snapshot();this.page.objects=this.page.objects.filter(n=>n!==o);if(direction>0)this.page.objects.push(o);else this.page.objects.unshift(o);this.changed();this.pages.render();}
    chooseImage(replaceId){this.cancelCrop();const picker=input('','file');picker.accept='image/*';picker.className='an-file-input';picker.tabIndex=-1;document.body.append(picker);const cleanup=()=>picker.remove();picker.addEventListener('cancel',cleanup,{once:true});picker.addEventListener('change',async()=>{try{if(!picker.files[0])return;this.status('Se pregătește imaginea…');const o=await ImageObject.fromFile(picker.files[0]);this.endText();this.snapshot();const previous=this.page.objects.find(n=>n.id===replaceId);if(previous){previous.src=o.src;previous.crop=o.crop;previous.h=previous.w*o.h/o.w;this.selected=previous.id;}else{const [w,h]=size(this.page);if(o.h>h-120){o.w*= (h-120)/o.h;o.h=h-120;}o.x=(w-o.w)/2;o.y=60;this.page.objects.push(o);this.selected=o.id;}this.tool='select';this.changed();this.refresh();}catch(error){this.status(error.message,true);}finally{cleanup();}},{once:true});picker.click();}
    choosePdf(){
      this.cancelCrop();const picker=input('','file');picker.accept='application/pdf,.pdf';picker.className='an-file-input';picker.tabIndex=-1;document.body.append(picker);const cleanup=()=>picker.remove();picker.addEventListener('cancel',cleanup,{once:true});
      picker.addEventListener('change',async()=>{let pdf;try{
        const file=picker.files[0];if(!file)return;if(file.size>60*1024*1024)throw Error('PDF-ul depășește 60 MB. Împarte-l în documente mai mici și încearcă din nou.');
        this.status('Se pregătește importul PDF…');const pdfjs=await loadPdfRenderer(),bytes=new Uint8Array(await file.arrayBuffer()),loading=pdfjs.getDocument({data:bytes,useWasm:false,isEvalSupported:false});pdf=await loading.promise;
        if(!pdf.numPages)throw Error('PDF-ul nu conține pagini.');if(pdf.numPages>80)throw Error('PDF-ul are peste 80 de pagini. Împarte-l în documente mai mici pentru o editare sigură pe tabletă.');
        const imported=[],baseName=file.name.replace(/\.pdf$/i,'').trim()||'PDF';
        for(let index=1;index<=pdf.numPages;index++){
          this.status(`Se importă pagina ${index} din ${pdf.numPages}…`);const sourcePage=await pdf.getPage(index),base=sourcePage.getViewport({scale:1}),scale=Math.min(2.2,1800/Math.max(base.width,base.height)),viewport=sourcePage.getViewport({scale});
          const canvas=el('canvas');canvas.width=Math.max(1,Math.round(viewport.width));canvas.height=Math.max(1,Math.round(viewport.height));const context=canvas.getContext('2d',{alpha:false});context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);await sourcePage.render({canvasContext:context,viewport}).promise;
          const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Pagina PDF nu a putut fi transformată în imagine.')),'image/jpeg',.94)),src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||Error('Pagina PDF nu a putut fi citită.'));reader.readAsDataURL(blob);});
          const orientation=base.width>base.height?'landscape':'portrait',page=pageData(orientation,'blank'),[pageWidth,pageHeight]=size(page);page.title=`${baseName} · ${index}`;page.objects.push({id:uid(),type:'image',x:0,y:0,w:pageWidth,h:pageHeight,rotation:0,opacity:1,locked:true,src,crop:{x:0,y:0,w:1,h:1},source:'pdf'});imported.push(page);canvas.width=canvas.height=1;sourcePage.cleanup();
        }
        this.endText();this.snapshot();const replaceBlank=this.note.pages.length===1&&this.page.objects.length===0&&this.page.paper==='blank',insertAt=replaceBlank?0:this.pageIndex+1;if(replaceBlank)this.note.pages.splice(0,1,...imported);else this.note.pages.splice(insertAt,0,...imported);this.pageIndex=insertAt;this.selected=null;this.tool='select';this.changed(0);this.refresh();requestAnimationFrame(()=>this.fit());this.status(`${imported.length} ${imported.length===1?'pagină importată':'pagini importate'} din PDF.`);
      }catch(error){const protectedPdf=error?.name==='PasswordException';this.status(protectedPdf?'PDF-ul este protejat cu parolă. Salvează o copie fără parolă și încearcă din nou.':`Import PDF nereușit: ${error.message||'Fișierul nu poate fi citit.'}`,true);}finally{try{await pdf?.destroy();}catch{}cleanup();}
      },{once:true});picker.click();
    }
    cancelCrop(){if(!this.cropSession)return;this.cropSession.stage.remove();this.cropSession.actions.remove();this.cropSession=null;this.selection.render();this.requestPaint();}
    cropImage(o){
      if(!o||o.type!=='image'||o.locked)return;
      this.cancelCrop();this.endText();
      const original={...o.crop},crop={...original},fullW=o.w/original.w,fullH=o.h/original.h;
      const fullX=o.x-original.x*fullW,fullY=o.y-original.y*fullH;
      const stage=el('div','an-crop-stage'),photo=el('img','an-crop-photo'),frame=el('div','an-crop-frame'),actions=el('div','an-crop-actions');
      photo.src=o.src;photo.alt='Imaginea de decupat';photo.draggable=false;photo.style.opacity=String(o.opacity??1);
      Object.assign(stage.style,{left:fullX+'px',top:fullY+'px',width:fullW+'px',height:fullH+'px',transformOrigin:`${o.x+o.w/2-fullX}px ${o.y+o.h/2-fullY}px`,transform:`rotate(${o.rotation}deg)`});
      const paint=()=>Object.assign(frame.style,{left:crop.x*100+'%',top:crop.y*100+'%',width:crop.w*100+'%',height:crop.h*100+'%'});
      paint();frame.setAttribute('aria-label','Trage marginile pentru a decupa imaginea');
      for(const edge of ['nw','n','ne','e','se','s','sw','w']){const handle=el('button',`an-crop-handle an-crop-${edge}`);handle.type='button';handle.dataset.edge=edge;handle.setAttribute('aria-label','Decupează '+edge);frame.append(handle);}
      frame.addEventListener('pointerdown',event=>{
        if(event.button!==0)return;event.preventDefault();event.stopPropagation();
        const edge=event.target.closest('.an-crop-handle')?.dataset.edge||'move',start={...crop},x=event.clientX,y=event.clientY,id=event.pointerId;
        const move=next=>{if(next.pointerId!==id)return;next.preventDefault();
          const angle=o.rotation*Math.PI/180,dx=(next.clientX-x)/this.zoom,dy=(next.clientY-y)/this.zoom;
          const horizontal=(dx*Math.cos(angle)+dy*Math.sin(angle))/fullW,vertical=(-dx*Math.sin(angle)+dy*Math.cos(angle))/fullH;
          if(edge==='move'){crop.x=clamp(start.x+horizontal,0,1-start.w);crop.y=clamp(start.y+vertical,0,1-start.h);}
          else{
            const right=start.x+start.w,bottom=start.y+start.h;
            if(edge.includes('w')){crop.x=clamp(start.x+horizontal,0,right-.05);crop.w=right-crop.x;}
            if(edge.includes('e'))crop.w=clamp(start.w+horizontal,.05,1-start.x);
            if(edge.includes('n')){crop.y=clamp(start.y+vertical,0,bottom-.05);crop.h=bottom-crop.y;}
            if(edge.includes('s'))crop.h=clamp(start.h+vertical,.05,1-start.y);
          }
          paint();
        };
        const finish=next=>{if(next.pointerId!==id)return;window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',finish,true);};
        window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',finish,true);window.addEventListener('pointercancel',finish,true);
      });
      stage.append(photo,frame);
      actions.append(el('span','an-crop-help','Trage marginile sau mută zona de decupare'),button('Anulează',()=>this.cancelCrop(),null,'an-crop-cancel'),button('Aplică decuparea',()=>{
        const previousCenter={x:original.x+original.w/2,y:original.y+original.h/2},nextCenter={x:crop.x+crop.w/2,y:crop.y+crop.h/2};
        const angle=o.rotation*Math.PI/180,dx=(nextCenter.x-previousCenter.x)*fullW,dy=(nextCenter.y-previousCenter.y)*fullH;
        const centerX=o.x+o.w/2+dx*Math.cos(angle)-dy*Math.sin(angle),centerY=o.y+o.h/2+dx*Math.sin(angle)+dy*Math.cos(angle);
        this.snapshot();o.w=fullW*crop.w;o.h=fullH*crop.h;o.x=centerX-o.w/2;o.y=centerY-o.h/2;o.crop={...crop};
        this.cancelCrop();this.changed();this.refresh();
      },null,'an-crop-apply'));
      this.cropSession={objectId:o.id,stage,actions};this.sheet.append(stage);this.root.append(actions);this.selection.render();this.requestPaint();
    }
    key(event){if(event.isComposing||this.textComposing)return;const mod=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();if(event.key==='Escape'){if(this.cropSession){this.cancelCrop();return;}this.toolbar.closePopover();if(this.textEditor){this.endText();this.canvas.focus();return;}}if(mod&&['b','i','u'].includes(key)&&(this.textEditor||this.object?.type==='text')){event.preventDefault();const property={b:'bold',i:'italic',u:'underline'}[key];this.applyTextPatch({[property]:!this.textSelectionStyle()[property]});return;}if(this.textEditor&&mod&&['z','y'].includes(key)){event.preventDefault();key==='y'||event.shiftKey?this.redo():this.undo();return;}if(event.target.closest('input,textarea,select,[contenteditable]'))return;if(mod&&key==='c'&&this.object){event.preventDefault();this.objectClipboard=copy(this.object);navigator.clipboard?.writeText(this.object.text||'').catch(()=>{});return;}if(mod&&key==='v'&&this.objectClipboard){event.preventDefault();this.snapshot();const n=copy(this.objectClipboard);n.id=uid();n.x+=18;n.y+=18;n.locked=false;this.page.objects.push(n);this.selected=n.id;this.changed();this.refresh();return;}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?this.redo():this.undo();}else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();this.redo();}else if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();this.removeObject();}else if(event.key==='Escape'){this.selected=null;this.toolbar.renderContext();this.selection.render();}}
    exportMenu(){
      this.endText();
      const d=el('dialog','an-dialog an-export-dialog'),header=el('div','an-export-header'),heading=el('div'),body=el('div','an-export-body'),scopeSection=el('section','an-export-scope'),content=el('section','an-export-formats');
      heading.append(el('span','an-export-eyebrow','Export inteligent'),el('h2','','Exportă notița'),el('p','','Alege paginile o singură dată, apoi formatul potrivit.'));
      header.append(heading,button('Închide',()=>d.close(),'close','an-icon an-export-close'));

      let scope='current';const customIndexes=new Set([this.pageIndex]),scopeButtons=el('div','an-export-scope-options'),pagePicker=el('div','an-export-page-picker'),selectionText=el('strong','an-export-selection-count');
      const scopeChoices=[['current','Pagina curentă','Doar pagina pe care lucrezi'],['all','Toate paginile',`${this.note.pages.length} ${this.note.pages.length===1?'pagină':'pagini'}`],['custom','Alege paginile','Selecție personalizată']];
      const selected=()=>{const indexes=scope==='current'?[this.pageIndex]:scope==='all'?this.note.pages.map((_,index)=>index):[...customIndexes].sort((a,b)=>a-b);if(!indexes.length)throw Error('Selectează cel puțin o pagină.');return indexes.map(index=>({index,page:this.note.pages[index]}));};
      const scopedNote=items=>({...copy(this.note),activePage:0,pages:items.map(item=>copy(item.page))});
      const syncScope=()=>{for(const item of scopeButtons.children)item.setAttribute('aria-pressed',String(item.dataset.scope===scope));pagePicker.hidden=scope!=='custom';let count=0;try{count=selected().length;}catch{}selectionText.textContent=count?`${count} ${count===1?'pagină selectată':'pagini selectate'}`:'Selectează cel puțin o pagină';selectionText.classList.toggle('is-empty',!count);};
      for(const [value,label,description] of scopeChoices){const item=button(label,()=>{scope=value;syncScope();},null,'an-export-scope-option');item.dataset.scope=value;item.setAttribute('aria-pressed',String(value===scope));item.replaceChildren(el('span','an-export-radio'),el('span','an-export-scope-copy'));item.lastChild.append(el('strong','',label),el('small','',description));scopeButtons.append(item);}
      this.note.pages.forEach((page,index)=>{const choice=el('label','an-export-page-choice'),checkbox=input('','checkbox');checkbox.checked=customIndexes.has(index);checkbox.addEventListener('change',()=>{checkbox.checked?customIndexes.add(index):customIndexes.delete(index);syncScope();});const copyBlock=el('span','');copyBlock.append(el('strong','',`Pagina ${index+1}${page.title?' · '+page.title:''}`),el('small','',`${page.orientation==='landscape'?'A4 orizontal':'A4 vertical'} · ${page.paper==='grid'?'pătrățele':page.paper==='ruled'?'linii':'foaie albă'}`));choice.append(checkbox,copyBlock);pagePicker.append(choice);});
      const scopeHeading=el('div','an-export-section-heading');scopeHeading.append(el('div','','Ce pagini exporți?'),selectionText);scopeSection.append(scopeHeading,scopeButtons,pagePicker);

      const grid=el('div','an-export-grid'),options=[
        ['PDF','Document PDF','Păstrează formatul A4 într-un singur fișier',async items=>download(await Export.pdf(scopedNote(items)),filename(this.note.title)+'.pdf')],
        ['PNG','Imagini PNG','O imagine sau o arhivă ZIP pentru mai multe pagini',async items=>{if(items.length===1){const item=items[0];download(await Export.png(item.page),filename(this.note.title)+'-'+pageFilename(item.page,item.index)+'.png');}else download(await Export.zip(scopedNote(items),items.map(item=>item.index)),filename(this.note.title)+'-pagini-selectate.zip');}],
        ['A4','Tipărește','Trimite paginile selectate la imprimantă',async items=>Export.print(scopedNote(items))],
        ['EDIT','Copie editabilă','Păstrează elementele pentru editare ulterioară',async items=>download(new Blob([JSON.stringify(scopedNote(items))],{type:'application/json'}),filename(this.note.title)+'.anote.json')]
      ];
      for(const [format,name,description,action] of options){const b=button(name,async()=>{b.disabled=true;try{const items=selected();this.status('Se pregătește exportul…');let saved=true;try{await this.flush();}catch{saved=false;}await action(items);this.status(saved?'Export pregătit.':'Export pregătit. Salvarea locală trebuie reîncercată.',!saved);d.close();}catch(error){this.status(error.message,true);selectionText.textContent=error.message;selectionText.classList.add('is-empty');}finally{b.disabled=false;}},null,'an-export-option');const copyBlock=el('span','an-export-copy');copyBlock.append(el('strong','',name),el('small','',description));b.replaceChildren(el('span','an-export-format',format),copyBlock,el('span','an-export-arrow','›'));grid.append(b);}
      const formatHeading=el('div','an-export-section-heading');formatHeading.append(el('div','','Alege formatul'),el('span','','Fișiere pregătite pentru partajare'));content.append(formatHeading,grid);body.append(scopeSection,content);d.append(header,body);syncScope();d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal();
    }
  }

  class NotesManager {
    constructor(){this.store=new NotesStore();this.panel=document.getElementById('workspaceNotes');this.list=document.getElementById('workspaceNotesList');this.status=document.getElementById('workspaceNotesStatus');this.add=document.getElementById('workspaceAddNote');this.query='';this.filter='all';this.layout='grid';this.syncing=false;this.syncError='';this.ready=this.init();}
    async init(){
      this.add.disabled=true;
      const q=document.getElementById('workspaceNotesSearch');q.addEventListener('input',()=>{this.query=q.value.toLocaleLowerCase('ro-RO');this.render();});
      this.sort=document.getElementById('notesSort');this.sort.addEventListener('change',()=>this.render());
      this.filterButtons=[...this.panel.querySelectorAll('[data-notes-filter]')];this.filterButtons.forEach(item=>item.addEventListener('click',()=>{this.filter=item.dataset.notesFilter;this.filterButtons.forEach(button=>button.setAttribute('aria-pressed',String(button===item)));this.render();}));
      this.layoutButtons=[...this.panel.querySelectorAll('[data-notes-layout]')];this.layoutButtons.forEach(item=>item.addEventListener('click',()=>{this.layout=item.dataset.notesLayout;this.list.classList.toggle('manager-list-view',this.layout==='list');this.layoutButtons.forEach(button=>button.setAttribute('aria-pressed',String(button===item)));this.render();}));
      this.show=visible=>{document.querySelector('#projectManagerView > .project-manager-content').hidden=visible;this.panel.hidden=!visible;document.getElementById(visible?'workspaceNotesNav':'workspaceProjectsNav').setAttribute('aria-current','page');document.getElementById(visible?'workspaceProjectsNav':'workspaceNotesNav').removeAttribute('aria-current');document.title=(visible?'Notițe':'Proiectele mele')+' | La-Tâmplar';if(visible)this.render();else window.dispatchEvent(new CustomEvent('atelier-notes-inactive'));};
      document.getElementById('workspaceNotesNav').addEventListener('click',()=>this.show(true));document.getElementById('workspaceProjectsNav').addEventListener('click',()=>this.show(false));for(const id of ['pmNewProject','pmImportProject','backToProjects'])document.getElementById(id).addEventListener('click',()=>this.show(false));
      this.add.addEventListener('click',()=>this.details(null,async note=>{await this.store.put(note);await this.render();this.open(note);}));
      
      window.addEventListener('atelier-notes-local-change',()=>this.syncSoon());window.addEventListener('atelier-notes-cloud-change',()=>this.syncSoon(80));window.addEventListener('online',()=>this.syncSoon(80));document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.syncSoon(80);});
      try{await this.store.open();this.add.disabled=false;await this.render();window.dispatchEvent(new CustomEvent('atelier-notes-ready'));this.syncSoon(120);}catch(error){this.status.textContent=`${error.message} Originalele nu au fost șterse.`;this.status.classList.add('an-error');}
    }
    cloud(){return window.atelierNotesCloud;}
    connected(){return Boolean(this.cloud()?.connected?.());}
    syncSoon(delay=650){clearTimeout(this.syncTimer);const idleDelay=this.editor?.root?.isConnected?Math.max(delay,3200):delay;this.syncTimer=setTimeout(()=>this.sync().catch(()=>{}),idleDelay);}
    async sync(){
      if(this.editor?.isBusy()){this.syncSoon(3200);return false;}if(this.syncing||!this.store.db||!this.connected())return false;this.syncing=true;if(!this.editor)this.status.textContent='Notițele se sincronizează…';
      try{
        const cloud=this.cloud(),pending=await this.store.pending();if(this.editor?.isBusy()){this.syncSoon();return false;}
        for(const [id,deletedAt] of Object.entries(pending.deletes)){await cloud.remove(id,deletedAt);await this.store.clearPendingDelete(id,deletedAt);}
        for(const note of Object.values(pending.notes)){await cloud.save(note);await this.store.clearPendingNote(note.id,note);}
        const remote=await cloud.pull(),local=await this.store.all();if(this.editor?.isBusy()){this.syncSoon();return false;}const localMap=new Map(local.map(note=>[note.id,note]));
        for(const [id,deletedAt] of Object.entries(remote.tombstones||{})){const note=localMap.get(id);if(note&&(Date.parse(deletedAt)||0)>=(Date.parse(note.updatedAt)||0)){await this.store.remove(id,{sync:false});localMap.delete(id);}}
        for(const note of remote.notes||[]){const localNote=localMap.get(note.id);if(!localNote||(Date.parse(note.updatedAt)||0)>(Date.parse(localNote.updatedAt)||0)){await this.store.put(note,{sync:false});localMap.set(note.id,note);if(this.editor?.note.id===note.id&&!this.editor.dirty&&!this.editor.isBusy()){this.editor.note=copy(note);this.editor.pageIndex=clamp(note.activePage||0,0,note.pages.length-1);this.editor.refresh();}}}
        for(const note of localMap.values()){const remoteNote=(remote.notes||[]).find(item=>item.id===note.id),deletedAt=Date.parse(remote.tombstones?.[note.id]||'')||0;if(deletedAt>(Date.parse(note.updatedAt)||0))continue;if(!remoteNote||(Date.parse(note.updatedAt)||0)>(Date.parse(remoteNote.updatedAt)||0))await cloud.save(note);}
        this.syncError='';if(this.editor&&!this.editor.dirty)this.editor.status('Salvat și sincronizat');
        return true;
      }catch(error){this.syncError='Notițele sunt salvate local. Sincronizarea va reîncerca automat.';if(this.editor)this.editor.status('Salvat local · sincronizarea va reîncerca.',true);throw error;}
      finally{this.syncing=false;if(!this.editor)await this.render();}
    }
    async projects(){return new Promise(resolve=>{let request;try{request=indexedDB.open('fisa-atelier-offline');}catch{resolve([]);return;}request.onerror=()=>resolve([]);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('projects')){db.close();resolve([]);return;}const transaction=db.transaction('projects','readonly'),read=transaction.objectStore('projects').getAll();read.onerror=()=>{db.close();resolve([]);};read.onsuccess=()=>{const projects=(read.result||[]).map(project=>({id:project.id,name:project.name||project.payload?.projectName||'Proiect fără nume'})).filter(project=>project.id).sort((a,b)=>a.name.localeCompare(b.name,'ro'));db.close();resolve(projects);};};});}
    async details(note,save,linkedProject=null){const projects=await this.projects(),content=el('div','an-form-grid'),title=input(note?.title||'');title.required=true;title.maxLength=160;title.placeholder='De exemplu: Măsurători bucătărie';const projectChoices=[['','Fără proiect asociat'],...projects.map(project=>[project.id,project.name])],project=select(projectChoices,note?.projectId||'');content.append(field('Titlu notiță',title));if(!linkedProject)content.append(field('Proiect asociat (opțional)',project));let template;if(!note){template=this.pageTemplates();content.append(template.node);}else content.append(el('p','an-hint',`Creată ${date(note.createdAt)} · Modificată ${date(note.updatedAt)}`));dialog(note?'Detaliile notiței':'Notiță nouă',content,async()=>{if(!title.value.trim())throw Error('Introdu un titlu.');const selectedProject=linkedProject||projects.find(item=>item.id===project.value);const relation={projectId:selectedProject?.id||'',projectName:selectedProject?.name||''};const next=note?{title:title.value.trim(),...relation}:{id:uid(),schema:1,title:title.value.trim(),description:'',...relation,createdAt:now(),updatedAt:now(),pages:[pageData(template.value.orientation,template.value.paper)]};await save(next);},note?'Salvează':'Creează');}
    async setNoteProject(noteId,project){
      if(this.editor?.note.id===noteId)await this.editor.flush();
      const note=await this.store.get('notes',noteId);if(!note)throw Error('Notița nu mai există. Reîncarcă lista.');
      Object.assign(note,{projectId:project?.id||'',projectName:project?.name||'',updatedAt:now()});await this.store.put(note);
      if(this.editor?.note.id===noteId)Object.assign(this.editor.note,{projectId:note.projectId,projectName:note.projectName,updatedAt:note.updatedAt});
      await this.render();
    }
    async associateWithProject(note){
      const projects=await this.projects(),content=el('div','an-form-grid'),choice=select([['','Fără proiect asociat'],...projects.map(p=>[p.id,p.name])],note.projectId||'');
      content.append(el('p','an-hint',`Notiță: ${note.title}`),field('Proiect',choice));if(!projects.length)content.append(el('p','an-hint','Nu există proiecte salvate pe acest dispozitiv.'));
      dialog('Asociază cu un proiect',content,()=>this.setNoteProject(note.id,projects.find(p=>p.id===choice.value)),'Salvează asocierea');
    }
    async associateExisting(project){
      await this.ready;const notes=(await this.store.all()).sort((a,b)=>a.title.localeCompare(b.title,'ro')),content=el('div','an-form-grid an-association-form'),choice=select(notes.map(n=>[n.id,n.title]),notes[0]?.id||''),hint=el('p','an-hint an-association-status');
      const showRelation=()=>{const selected=notes.find(n=>n.id===choice.value);hint.classList.toggle('is-moving',Boolean(selected?.projectId&&selected.projectId!==project.id));hint.textContent=!selected?'Alege o notiță existentă.':selected.projectId===project.id?`Notița „${selected.title}” este deja asociată acestui proiect.`:selected.projectId?`Notița „${selected.title}” este acum în proiectul „${selected.projectName}”. După confirmare, va apărea în proiectul „${project.name}”.`:`Notița „${selected.title}” va fi adăugată proiectului „${project.name}”.`;};
      choice.addEventListener('change',showRelation);
      content.append(el('p','an-association-project',`Proiect selectat: ${project.name}`),field('Notiță existentă',choice),hint);if(!notes.length){choice.disabled=true;hint.textContent='Nu există notițe salvate. Creează mai întâi o notiță.';}else showRelation();
      dialog('Asociază o notiță existentă',content,async()=>{if(!choice.value)throw Error('Alege o notiță din listă.');await this.setNoteProject(choice.value,project);},'Asociază');
    }
    async createForProject(project){
      if(!project?.id)return;await this.ready;const content=el('div','an-association-options'),d=dialog('Adaugă notiță',content,()=>{},'Închide');
      content.append(button('Creează o notiță nouă',()=>{d.close();this.newForProject(project);},'plus'),button('Asociază o notiță existentă',()=>{d.close();this.associateExisting(project);},'pages'));
      d.querySelector('.an-dialog-actions').firstChild.remove();
    }

    async openModelNote({project,model,snapshot,noteId,onClose}){
      await this.ready;if(this.editor)throw Error('Închide mai întâi notița deschisă.');
      let note=noteId?await this.store.get('notes',noteId):null;
      if(noteId&&(!note||note.projectId!==project.id||note.modelId!==model.id))throw Error('Notița nu mai este disponibilă pentru acest model.');
      if(!note){
        const stamp=now(),page=pageData('landscape','blank'),scale=Math.min(1051/snapshot.width,480/snapshot.height),width=snapshot.width*scale,height=snapshot.height*scale;
        const heading=TextObject.create(36,24,'Modificări — '+model.name,1051);heading.fontSize=24;heading.bold=true;TextObject.fit(heading);
        page.objects.push(heading,{id:uid(),type:'image',x:(1123-width)/2,y:86,w:width,h:height,rotation:0,opacity:1,locked:true,src:snapshot.src,crop:{x:0,y:0,w:1,h:1}});
        note={id:uid(),schema:1,title:('Modificări — '+model.name).slice(0,160),description:'',projectId:project.id,projectName:project.name,modelId:model.id,modelName:model.name,createdAt:stamp,updatedAt:stamp,pages:[page]};
        await this.store.put(note);
      }
      this.editor=new NoteEditor(this,note,{backLabel:'Model 3D',onClose});this.editor.setTool('pencil');
    }
    async newForProject(project){if(!project?.id)return;await this.ready;const linkedProject={id:project.id,name:project.name||'Proiect fără nume'};await this.details(null,async note=>{await this.store.put(note);await this.render();this.open(note);},linkedProject);}
    async openById(noteId){if(!noteId)return false;await this.ready;const note=await this.store.get('notes',noteId);if(!note)return false;this.show(true);this.open(note);return true;}
    pageTemplates(headingText='Prima foaie'){const node=el('section','an-template-picker'),heading=el('span','an-template-heading',headingText),choices=el('div','an-template-choices');let value={orientation:'portrait',paper:'blank'};const templates=[['portrait','blank','A4 vertical','Albă'],['portrait','grid','A4 vertical','Cu pătrățele'],['portrait','ruled','A4 vertical','Cu linii'],['landscape','blank','A4 orizontal','Albă'],['landscape','grid','A4 orizontal','Cu pătrățele'],['landscape','ruled','A4 orizontal','Cu linii']];for(const [orientation,paper,format,label] of templates){const item=button(`${format} · ${label}`,()=>{value={orientation,paper};for(const choice of choices.children)choice.setAttribute('aria-pressed','false');item.setAttribute('aria-pressed','true');},paper==='grid'?'shape':paper==='ruled'?'text':'image','an-template-choice');item.dataset.orientation=orientation;item.dataset.paper=paper;item.setAttribute('aria-pressed',String(orientation==='portrait'&&paper==='blank'));const sheet=el('span',`an-template-sheet an-${orientation} an-${paper}`);const copy=el('span','an-template-copy');copy.append(el('strong','',format),el('small','',label));item.replaceChildren(sheet,copy);choices.append(item);}node.append(heading,choices);return {node,get value(){return value;}};}
    async render(){if(!this.store.db)return;const token=this.renderToken=uid();const notes=await this.store.all();if(token!==this.renderToken)return;this.list.replaceChildren();this.list.className='an-note-grid'+(this.layout==='list'?' manager-list-view':'');const managerPanel=this.panel||this.list.closest('#workspaceNotes'),countAll=managerPanel?.querySelector('[data-notes-count="all"]'),countFavorites=managerPanel?.querySelector('[data-notes-count="favorites"]');if(countAll)countAll.textContent=notes.length;if(countFavorites)countFavorites.textContent=notes.filter(note=>note.favorite).length;const sortMode=this.sort?.value||'updated';notes.sort((a,b)=>sortMode==='name'?a.title.localeCompare(b.title,'ro'):sortMode==='created'?(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0):(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0));const filtered=notes.filter(n=>(this.filter!=='favorites'||n.favorite)&&(n.title+' '+n.description+' '+n.projectName+' '+n.pages.flatMap(p=>p.objects.map(o=>o.text||'')).join(' ')).toLocaleLowerCase('ro-RO').includes(this.query));this.status.classList.toggle('an-error',Boolean(this.syncError));const noteCountLabel=`${notes.length} ${notes.length===1?'notiță':'notițe'}`;this.status.textContent=this.syncError||`${noteCountLabel} · ${this.syncing?'Se sincronizează…':this.connected()?'Sincronizare activă între dispozitive':'Salvat local · conectează același cont pe PC și tabletă'}`;
      if(!filtered.length)this.list.append(el('p','an-empty',notes.length?'Nu există notițe care corespund filtrului sau căutării.':'Prima ta notiță începe cu o foaie A4. Adaugă text, schițe și fotografii.'));
      for(const note of filtered){const card=el('article','an-note-card'),open=button(note.title,()=>this.open(note));open.classList.add('an-note-open');open.removeAttribute('title');const preview=el('canvas');preview.width=250;preview.height=160;open.prepend(preview);const heading=el('div','an-note-card-heading'),title=el('h3','an-note-card-title',note.title),favorite=button(note.favorite?'Elimină de la favorite':'Adaugă la favorite',async()=>{note.favorite=!note.favorite;note.updatedAt=now();await this.store.put(note);await this.render();},'star','an-favorite-button');favorite.setAttribute('aria-pressed',String(Boolean(note.favorite)));if(note.favorite)favorite.classList.add('is-active');heading.append(title,favorite);const pageCount=`${note.pages.length} ${note.pages.length===1?'pagină':'pagini'}`,relation=note.projectName?el('span','an-note-project',note.projectName):null,dateLine=el('p','an-note-date',`Ultima modificare: ${date(note.updatedAt)}`),stats=el('div','an-note-card-stats'),pageStat=el('span','',pageCount),projectStat=el('span','',note.projectName?'Proiect asociat':'Fără proiect asociat');stats.append(pageStat,projectStat);const actions=el('details','an-note-card-menu'),summary=el('summary','','⋯'),menu=el('div','an-note-card-menu-items'),noteMenuButton=(label,emoji,action,danger=false)=>{const item=button(label,action,null,danger?'an-danger':'');item.prepend(el('span','an-note-menu-icon',emoji));return item;};summary.setAttribute('aria-label','Acțiuni notiță');if(note.projectId)menu.append(noteMenuButton('Deschide proiectul asociat','↗',async()=>{actions.open=false;const opened=await window.atelierOpenProjectById?.(note.projectId);if(!opened)this.status.textContent='Proiectul asociat nu mai există pe acest dispozitiv.';}));menu.append(noteMenuButton('Asociază cu un proiect','📓',()=>{actions.open=false;this.associateWithProject(note);}),noteMenuButton('Editează','✏️',()=>this.details(note,async patch=>{Object.assign(note,patch,{updatedAt:now()});await this.store.put(note);await this.render();})),noteMenuButton('Duplică','📄',async()=>{try{const n=copy(note);n.id=uid();n.title+=' — copie';n.createdAt=n.updatedAt=now();n.pages.forEach(p=>{p.id=uid();p.objects.forEach(o=>o.id=uid());});await this.store.put(n);await this.render();}catch(error){this.status.textContent=error.message;}}),noteMenuButton('Șterge','🗑️',()=>dialog('Ștergi această notiță?',el('p','',`„${note.title}” va fi ștearsă de pe acest dispozitiv. Exportă înainte o copie dacă vrei să o păstrezi.`),async()=>{await this.store.remove(note.id);await this.render();},'Șterge'),true));actions.append(summary,menu);
        const cardActions=el('div','an-card-actions');cardActions.append(favorite,actions);heading.append(cardActions);card.append(open,heading,dateLine,...(relation?[relation]:[]),stats);this.list.append(card);
        A4Canvas.render(note.pages[0],.35).then(c=>{if(!card.isConnected)return;const ctx=preview.getContext('2d');ctx.fillStyle='#edf1f4';ctx.fillRect(0,0,250,160);const scale=Math.min(230/c.width,145/c.height);ctx.drawImage(c,(250-c.width*scale)/2,8,c.width*scale,c.height*scale);}).catch(()=>{});
      }
    }
    open(note){if(this.editor)return;this.editor=new NoteEditor(this,note);}
    import(){const picker=input('','file');picker.accept='.json,.anote.json';picker.className='an-file-input';picker.tabIndex=-1;document.body.append(picker);const cleanup=()=>picker.remove();picker.addEventListener('cancel',cleanup,{once:true});picker.addEventListener('change',async()=>{try{if(!picker.files[0])return;const n=JSON.parse(await picker.files[0].text());if(n.schema!==1||typeof n.title!=='string'||!Array.isArray(n.pages)||!n.pages.length||n.pages.length>200)throw Error('Copia nu are un format de notiță A4 valid.');for(const p of n.pages){if(!['portrait','landscape'].includes(p.orientation)||!['blank','ruled','grid'].includes(p.paper)||!Array.isArray(p.objects))throw Error('Pagină invalidă.');p.id=uid();for(const o of p.objects){if(!['text','image','drawing','shape'].includes(o.type)||!['x','y','w','h','rotation','opacity'].every(k=>Number.isFinite(o[k]))||o.w<=0||o.h<=0)throw Error('Obiect invalid.');if(o.type==='image'&&(!/^data:image\/(png|jpeg|webp);base64,/.test(o.src)||!o.crop))throw Error('Imagine invalidă.');if(o.type==='text'&&(typeof o.text!=='string'||!Number.isFinite(o.fontSize)))throw Error('Text invalid.');if(o.type==='drawing'&&(!Array.isArray(o.points)||!o.points.length||o.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))))throw Error('Desen invalid.');o.id=uid();}}n.id=uid();n.description=typeof n.description==='string'?n.description:'';n.projectId=typeof n.projectId==='string'?n.projectId:'';n.projectName=typeof n.projectName==='string'?n.projectName:'';n.createdAt=n.updatedAt=now();await this.store.put(n);await this.render();}catch(error){this.status.textContent=`Import nereușit: ${error.message}`;}finally{cleanup();}},{once:true});picker.click();}
  }
  const manager=new NotesManager();
  window.atelierNotes={ready:manager.ready,flush:()=>manager.editor?.flush()||Promise.resolve(),sync:()=>manager.ready.then(()=>manager.sync()),manager,Export,A4Canvas};
})();

