(() => {
  'use strict';
  const nav=document.getElementById('workspaceHandlesNav'),panel=document.getElementById('workspaceHandles');
  if(!nav||!panel)return;
  const content=panel.querySelector('[data-handles-content]'),search=panel.querySelector('input[type=search]'),status=panel.querySelector('[data-handles-status]');
  const sections=[document.querySelector('#projectManagerView>.project-manager-content'),...['workspaceNotes','workspaceInventory','workspaceAbout'].map(id=>document.getElementById(id))];
  const otherNavs=['workspaceProjectsNav','workspaceNotesNav','workspaceInventoryNav','workspaceAboutNav'].map(id=>document.getElementById(id));
  const base=new URL('./',document.currentScript.src);
  const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const unique=values=>[...new Set(values.filter(Boolean))];
  const finishAttr=name=>/finis|culoa|nuan|color/.test(normalize(name));
  const sizeAttr=name=>/marime|dimensi|lungime|latime|inaltime|interax|diamet|grosime/.test(normalize(name));
  let catalog=null,loading=null,query='',pageIndex=0,selected=null,selection=null,activeImage='',listScroll=0,openerId='',zoomDialog=null;
  const button=(text,cls,action)=>{const b=element('button',cls,text);b.type='button';if(action)b.addEventListener('click',action);return b;};
  function picture(src,alt,cls=''){
    const wrap=element('span','handles-picture '+cls),img=element('img');
    img.alt=alt;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>{img.hidden=true;wrap.classList.add('is-unavailable');if(!wrap.querySelector('.handles-image-error'))wrap.append(element('span','handles-image-error','Imagine indisponibilă momentan. Verifică conexiunea la internet.'));});
    img.src=src;wrap.append(img);return wrap;
  }
  function releaseImages(){
    if(zoomDialog?.open)zoomDialog.close();
    content.querySelectorAll('img').forEach(img=>img.removeAttribute('src'));
    content.replaceChildren();
  }
  function summary(product){
    const finishes=unique(product.variants.flatMap(v=>Object.entries(v.attributes).filter(([a])=>finishAttr(a)).map(([,v])=>v)));
    const sizes=unique(product.variants.flatMap(v=>Object.entries(v.attributes).filter(([a])=>sizeAttr(a)).map(([,v])=>v)));
    return{finishes,sizes};
  }
  function showList({restore=false}={}){
    if(!catalog)return;
    selected=null;panel.dataset.view='list';search.closest('label').hidden=false;releaseImages();
    const words=normalize(query).split(/\s+/).filter(Boolean),rows=catalog.products.filter(p=>words.every(w=>p.searchText.includes(w)));
    const pageSize=24;pageIndex=Math.min(pageIndex,Math.max(0,Math.ceil(rows.length/pageSize)-1));
    status.textContent=rows.length+' '+(rows.length===1?'model':'modele')+' · '+catalog.variantCount.toLocaleString('ro-RO')+' variante în catalog';
    const grid=element('div','handles-grid');
    for(const p of rows.slice(pageIndex*pageSize,(pageIndex+1)*pageSize)){
      const card=button('','handles-card',()=>openProduct(p));card.dataset.handleId=p.id;card.setAttribute('aria-label','Vezi '+p.name);
      card.append(picture(p.cover,p.name,'handles-card-image'));
      const info=element('span','handles-card-info'),facts=summary(p);
      info.append(element('strong','handles-card-title',p.name));
      const line=facts.finishes.length?facts.finishes.slice(0,2).join(' · ')+(facts.finishes.length>2?' +'+(facts.finishes.length-2):''):p.finishes||'';
      if(line)info.append(element('span','handles-card-finish',line));
      info.append(element('span','handles-card-meta',p.variants.length+' '+(p.variants.length===1?'variantă':'variante')+(facts.sizes.length?' · '+facts.sizes.length+' '+(facts.sizes.length===1?'dimensiune':'dimensiuni'):'')));
      card.append(info);grid.append(card);
    }
    content.append(grid);
    if(!rows.length)content.append(element('p','handles-empty','Nu am găsit mânere pentru această căutare. Încearcă numele, codul, finisajul sau dimensiunea.'));
    if(rows.length>pageSize){
      const pages=element('nav','handles-pagination');pages.setAttribute('aria-label','Pagini din catalogul de mânere');
      const move=delta=>{pageIndex+=delta;showList();panel.scrollIntoView({block:'start',behavior:'instant'});content.querySelector('.handles-card')?.focus({preventScroll:true});};
      const prev=button('← Anterioarele','handles-page-prev',()=>move(-1)),next=button('Următoarele →','handles-page-next',()=>move(1));
      prev.disabled=pageIndex===0;next.disabled=(pageIndex+1)*pageSize>=rows.length;
      pages.append(prev,element('span','handles-page-label',(pageIndex*pageSize+1)+'–'+Math.min((pageIndex+1)*pageSize,rows.length)+' din '+rows.length),next);
      content.append(pages);
    }
    if(restore){
      const card=content.querySelector('[data-handle-id="'+openerId+'"]');card?.focus({preventScroll:true});window.scrollTo({top:listScroll,behavior:'instant'});
    }
  }
  function setImage(src){
    activeImage=src;
    const main=content.querySelector('.handles-main-image');if(!main)return;
    main.replaceChildren(picture(src,selected.technical.includes(src)?'Desen tehnic · '+selected.name:selected.name));
    main.setAttribute('aria-label','Mărește '+(selected.technical.includes(src)?'desenul tehnic':'imaginea')+' · '+selected.name);
    content.querySelectorAll('[data-gallery-image]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.galleryImage===src)));
    const caption=content.querySelector('.handles-image-caption');if(caption)caption.textContent=selected.technical.includes(src)?'Desen tehnic · dimensiuni din catalog':'Imagine '+(selected.images.indexOf(src)+1)+' din '+selected.images.length;
  }
  function renderChoice(){
    const data=content.querySelector('.handles-variant-data');data.replaceChildren();
    const list=element('dl','handles-specs');
    for(const [a,v] of Object.entries(selection.attributes)){list.append(element('dt','',a),element('dd','',v));}
    if(!selected.attributes.some(finishAttr)&&selected.finishes){list.append(element('dt','','Finisaje în catalog'),element('dd','',selected.finishes));}
    if(selection.spec){list.append(element('dt','','Detalii'),element('dd','',selection.spec));}
    list.append(element('dt','','Cod variantă'),element('dd','handles-sku',selection.sku||'Neprecizat'));data.append(list);
    content.querySelectorAll('[data-handle-attribute]').forEach(b=>b.setAttribute('aria-pressed',String(selection.attributes[b.dataset.handleAttribute]===b.dataset.handleValue)));
    content.querySelectorAll('[data-variant-index]').forEach(b=>b.setAttribute('aria-pressed',String(selected.variants[Number(b.dataset.variantIndex)]===selection)));
    const feedback=content.querySelector('.handles-selection-status');if(feedback)feedback.textContent=Object.values(selection.attributes).join(' · ')+' · cod '+selection.sku;
  }
  function chooseVariant(v){
    selection=v;renderChoice();setImage(v.image||selected.cover);
  }
  function chooseAttribute(attribute,value){
    const choices=selected.variants.filter(v=>v.attributes[attribute]===value);
    const score=v=>Object.entries(selection.attributes).filter(([a,value])=>a!==attribute&&v.attributes[a]===value).length;
    choices.sort((a,b)=>score(b)-score(a));if(choices[0])chooseVariant(choices[0]);
  }
  function openProduct(product){
    clearTimeout(searchTimer);if(query!==search.value){query=search.value;pageIndex=0;}
    listScroll=window.scrollY;openerId=product.id;selected=product;panel.dataset.view='detail';search.closest('label').hidden=true;releaseImages();
    status.textContent='OTTO · '+product.variants.length+' '+(product.variants.length===1?'variantă':'variante')+' · '+product.images.length+' imagini';
    const back=button('← Toate mânerele','handles-back',()=>showList({restore:true})),title=element('h2','handles-product-title',product.name);title.tabIndex=-1;
    const head=element('div','handles-detail-heading');head.append(back,title);content.append(head);
    const layout=element('div','handles-detail-grid'),gallery=element('div','handles-gallery'),main=button('','handles-main-image',openImage);
    const strip=element('div','handles-thumbnails');strip.setAttribute('aria-label','Imagini pentru '+product.name);
    product.images.forEach((src,i)=>{
      const thumbnail=button('','handles-thumbnail',()=>{
        const matching=product.variants.filter(v=>v.image===src);if(matching.length&&!matching.includes(selection))chooseVariant(matching[0]);setImage(src);
      });
      thumbnail.dataset.galleryImage=src;thumbnail.setAttribute('aria-label',(product.technical.includes(src)?'Desen tehnic':'Imagine '+(i+1))+' · '+product.name);
      thumbnail.append(picture(src,''));strip.append(thumbnail);
    });
    gallery.append(main,element('p','handles-image-caption'),strip);
    const details=element('div','handles-details');details.append(element('p','handles-eyebrow','DIMENSIUNI ȘI FINISAJE'),element('div','handles-variant-data'));
    const groups=element('div','handles-attribute-groups');
    for(const attribute of product.attributes){
      const values=unique(product.variants.map(v=>v.attributes[attribute]));
      if(values.length<2)continue;
      const group=element('fieldset','handles-attribute'),legend=element('legend','',attribute);group.append(legend);
      const choices=element('div','handles-choices');
      values.forEach(value=>{
        const b=button(value,'handles-choice',()=>chooseAttribute(attribute,value));b.dataset.handleAttribute=attribute;b.dataset.handleValue=value;b.setAttribute('aria-pressed','false');choices.append(b);
      });
      group.append(choices);groups.append(group);
    }
    details.append(groups);
    const hasSize=product.attributes.some(sizeAttr);
    if(!hasSize)details.append(element('p','handles-dim-note',product.technical.length?'Dimensiunile sunt în desenele tehnice de mai jos.':'Dimensiunile nu sunt precizate în catalogul sursă.'));
    const live=element('p','handles-selection-status');live.setAttribute('role','status');live.setAttribute('aria-live','polite');details.append(live);
    const variants=element('details','handles-all-variants');variants.append(element('summary','','Toate variantele · '+product.variants.length));
    const vlist=element('div','handles-variant-list');
    product.variants.forEach((v,i)=>{
      const b=button('','handles-variant-row',()=>chooseVariant(v));b.dataset.variantIndex=String(i);
      b.append(element('span','',Object.values(v.attributes).join(' · ')||v.spec||'Variantă'),element('small','',v.sku));vlist.append(b);
    });
    variants.append(vlist);details.append(variants);
    const source=element('a','handles-source','Vezi fișa OTTO ↗');source.href=product.source;source.target='_blank';source.rel='noopener noreferrer';details.append(source);
    layout.append(gallery,details);content.append(layout);
    if(product.technical.length){
      const technical=element('section','handles-technical');technical.append(element('h3','','Desene tehnice'));
      const drawings=element('div','handles-drawings');
      product.technical.forEach((src,i)=>{const b=button('','handles-drawing',()=>openImage(src));b.setAttribute('aria-label','Mărește desenul tehnic '+(i+1)+' · '+product.name);b.append(picture(src,'Desen tehnic cu dimensiuni · '+product.name));drawings.append(b);});
      technical.append(drawings);content.append(technical);
    }
    selection=product.variants.find(v=>v.main)||product.variants[0];renderChoice();setImage(selection?.image||product.cover);
    title.focus({preventScroll:true});panel.scrollIntoView({block:'start',behavior:'instant'});
  }
  function openImage(src){
    if(typeof src!=='string')src=activeImage;
    if(!src||!selected)return;
    if(!zoomDialog){
      zoomDialog=element('dialog','handles-image-dialog');zoomDialog.setAttribute('aria-label','Imagine mărită');
      zoomDialog.addEventListener('close',()=>{zoomDialog.replaceChildren();});
      zoomDialog.addEventListener('click',e=>{if(e.target===zoomDialog)zoomDialog.close();});
      document.body.append(zoomDialog);
    }
    const close=button('Închide ×','handles-zoom-close',()=>zoomDialog.close());
    const wrap=element('div','handles-zoom-body');wrap.append(picture(src,selected.name));
    zoomDialog.replaceChildren(close,wrap);zoomDialog.showModal();
  }
  async function load(){
    if(catalog)return catalog;
    if(loading)return loading;
    loading=fetch(new URL('catalog.json?v=1.28.0',base)).then(r=>{if(!r.ok)throw Error('catalog');return r.json();}).then(data=>{
      if(!Array.isArray(data.products)||!data.products.length)throw Error('catalog');
      data.products.forEach(p=>{p.searchText=normalize([p.name,p.finishes,...p.variants.flatMap(v=>[v.sku,...Object.values(v.attributes),v.spec])].join(' '));});
      catalog=data;return data;
    }).catch(error=>{loading=null;throw error;});
    return loading;
  }
  async function show(){
    sections.forEach(s=>{if(s)s.hidden=true;});otherNavs.forEach(n=>n?.removeAttribute('aria-current'));
    panel.hidden=false;nav.setAttribute('aria-current','page');document.title='Mânere | La-Tâmplar';
    window.atelierNotes?.manager?.suspendPreviews?.(true);window.dispatchEvent(new CustomEvent('atelier-notes-inactive'));
    if(catalog){if(!content.children.length)showList();return;}
    status.textContent='Se încarcă mânerele…';content.setAttribute('aria-busy','true');
    try{await load();if(!panel.hidden)showList();}
    catch{if(!panel.hidden){releaseImages();status.textContent='Catalogul nu a putut fi încărcat. Verifică conexiunea.';content.append(button('Reîncearcă','handles-back',show));}}
    finally{content.removeAttribute('aria-busy');}
  }
  function leave(){if(panel.hidden)return;clearTimeout(searchTimer);if(query!==search.value){query=search.value;pageIndex=0;}panel.hidden=true;nav.removeAttribute('aria-current');releaseImages();}
  nav.addEventListener('click',show);
  otherNavs.forEach(n=>n?.addEventListener('click',leave,{capture:true}));
  for(const id of ['backToProjects','pmNewProject','pmImportProject'])document.getElementById(id)?.addEventListener('click',leave,{capture:true});
  let searchTimer;
  search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{query=search.value;pageIndex=0;if(!panel.hidden)showList();},120);});
})();
