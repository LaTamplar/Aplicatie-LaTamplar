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
  const finishFilters=[['crom','Crom'],['negru','Negru'],['alb','Alb'],['auriu','Auriu'],['inox','Inox / Nichel'],['antic','Antichizat'],['aluminiu','Aluminiu'],['gri','Gri'],['lemn','Lemn'],['cristal','Cristal']];
  const categories=[
    {id:'handles',title:'Mânere',file:'catalog.json?v=1.28.0',models:451,variants:2027,cover:'https://otto.info.ro/catalog/manere-img/maner-profil-3996-aluminiu.webp',back:'← Toate mânerele'},
    {id:'legs',title:'Picioare',file:'legs.json?v=1.29.0',models:45,variants:191,cover:'https://otto.info.ro/images/external/gomagcdn.ro/03ed2777f66af019.webp',back:'← Toate picioarele'}
  ];
  const catalogs=new Map(),loadings=new Map(),categoryStates=new Map();
  const heading=panel.querySelector('h1'),categoryNav=panel.querySelector('[data-catalog-navigation]');
  let currentCategory=null,requestVersion=0;
  const chosenFinishes=new Set();let filtersExpanded=false;
  let catalog=null,query='',pageIndex=0,selected=null,selection=null,activeImage='',listScroll=0,openerId='',zoomDialog=null;
  const button=(text,cls,action)=>{const b=element('button',cls,text);b.type='button';if(action)b.addEventListener('click',action);return b;};
  function saveCategory(){
    if(!currentCategory)return;
    const value=search.value;
    categoryStates.set(currentCategory.id,{query:value,pageIndex:query===value?pageIndex:0,finishes:[...chosenFinishes],expanded:filtersExpanded});
  }
  function showCategories(){
    saveCategory();clearTimeout(searchTimer);requestVersion++;currentCategory=null;catalog=null;selected=null;
    panel.dataset.view='categories';panel.removeAttribute('data-category');heading.textContent='Accesorii';document.title='Accesorii | La-Tâmplar';search.closest('label').hidden=true;categoryNav.hidden=true;status.textContent='2 categorii';content.removeAttribute('aria-busy');releaseImages();
    const grid=element('div','catalog-category-grid');
    for(const category of categories){
      const card=button('','catalog-category-card',()=>openCategory(category));card.dataset.catalogCategory=category.id;
      card.append(picture(category.cover,category.title,'catalog-category-image'));
      const info=element('span','catalog-category-info');info.append(element('strong','',category.title),element('span','',category.models+' modele · '+category.variants.toLocaleString('ro-RO')+' variante'));card.append(info);grid.append(card);
    }
    content.append(grid);
  }
  async function openCategory(category){
    saveCategory();clearTimeout(searchTimer);currentCategory=category;catalog=null;selected=null;
    const state=categoryStates.get(category.id)||{query:'',pageIndex:0,finishes:[],expanded:false};
    query=state.query;search.value=query;pageIndex=state.pageIndex;chosenFinishes.clear();state.finishes.forEach(f=>chosenFinishes.add(f));filtersExpanded=state.expanded;
    const version=++requestVersion;releaseImages();panel.dataset.category=category.id;panel.dataset.view='loading';heading.textContent=category.title;document.title=category.title+' | La-Tâmplar';
    search.closest('label').hidden=false;search.placeholder='Caută model, finisaj, cod sau dimensiune...';search.setAttribute('aria-label','Caută în categoria '+category.title.toLocaleLowerCase('ro-RO'));
    categoryNav.hidden=false;status.textContent='Se încarcă '+category.title.toLocaleLowerCase('ro-RO')+'…';content.setAttribute('aria-busy','true');
    try{
      const data=await load(category);
      if(version!==requestVersion||panel.hidden||currentCategory!==category)return;
      catalog=data;showList();
    }catch{
      if(version!==requestVersion||panel.hidden)return;
      status.textContent='Categoria nu a putut fi încărcată. Verifică conexiunea.';content.append(button('Reîncearcă','handles-back',()=>openCategory(category)));
    }finally{if(version===requestVersion)content.removeAttribute('aria-busy');}
  }
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
  function makeFilters(){
    const area=element('aside','handles-filter-area');area.setAttribute('aria-label','Filtre pentru '+currentCategory.title.toLocaleLowerCase('ro-RO'));
    const toggle=button('','handles-filter-toggle',()=>{
      filtersExpanded=!filtersExpanded;toggle.setAttribute('aria-expanded',String(filtersExpanded));box.dataset.expanded=String(filtersExpanded);
    });
    toggle.setAttribute('aria-expanded',String(filtersExpanded));toggle.setAttribute('aria-controls','handlesFinishFilters');
    toggle.append(element('span','','Filtre'),element('span','handles-filter-badge',chosenFinishes.size?String(chosenFinishes.size):'Finisaj'));
    const box=element('div','handles-filter-panel');box.id='handlesFinishFilters';box.dataset.expanded=String(filtersExpanded);
    const head=element('div','handles-filter-heading');head.append(element('strong','','Filtre'));
    const clear=button('Resetează','handles-filter-clear',()=>{
      chosenFinishes.clear();clearTimeout(searchTimer);query=search.value;pageIndex=0;showList();
      content.querySelector('input[name=handleFinish]')?.focus({preventScroll:true});
    });
    clear.hidden=!chosenFinishes.size;head.append(clear);box.append(head);
    const group=element('fieldset','handles-finish-options');group.append(element('legend','','Finisaj'));
    for(const [value,name] of catalog.availableFilters){
      const label=element('label','handles-finish-option'),input=element('input');input.type='checkbox';input.value=value;input.name='handleFinish';input.checked=chosenFinishes.has(value);
      const count=catalog.finishCounts[value];
      input.setAttribute('aria-label',name+', '+count+' produse');
      input.addEventListener('change',()=>{
        if(input.checked)chosenFinishes.add(value);else chosenFinishes.delete(value);
        clearTimeout(searchTimer);query=search.value;pageIndex=0;showList();
        content.querySelector('input[name=handleFinish][value="'+value+'"]')?.focus({preventScroll:true});
      });
      label.append(input,element('span','handles-finish-label',name),element('span','handles-finish-count',String(count)));group.append(label);
    }
    box.append(group);area.append(toggle,box);return area;
  }
  function showList({restore=false}={}){
    if(!catalog)return;
    selected=null;panel.dataset.view='list';search.closest('label').hidden=false;releaseImages();
    const words=normalize(query).split(/\s+/).filter(Boolean),rows=catalog.products.filter(p=>words.every(w=>p.searchText.includes(w))&&(!chosenFinishes.size||p.finishTags.some(f=>chosenFinishes.has(f))));
    const pageSize=24;pageIndex=Math.min(pageIndex,Math.max(0,Math.ceil(rows.length/pageSize)-1));
    status.textContent=rows.length+' '+(rows.length===1?'model':'modele')+' · '+catalog.variantCount.toLocaleString('ro-RO')+' variante în catalog';
    const listing=element('div','handles-list-layout'),results=element('div','handles-results'),grid=element('div','handles-grid');
    listing.append(makeFilters(),results);content.append(listing);
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
    results.append(grid);
    if(!rows.length)results.append(element('p','handles-empty','Nu am găsit produse pentru căutarea și filtrele alese. Modifică selecția sau resetează filtrele.'));
    if(rows.length>pageSize){
      const pages=element('nav','handles-pagination');pages.setAttribute('aria-label','Pagini din categoria '+currentCategory.title.toLocaleLowerCase('ro-RO'));
      const move=delta=>{pageIndex+=delta;showList();panel.scrollIntoView({block:'start',behavior:'instant'});content.querySelector('.handles-card')?.focus({preventScroll:true});};
      const prev=button('← Anterioarele','handles-page-prev',()=>move(-1)),next=button('Următoarele →','handles-page-next',()=>move(1));
      prev.disabled=pageIndex===0;next.disabled=(pageIndex+1)*pageSize>=rows.length;
      pages.append(prev,element('span','handles-page-label',(pageIndex*pageSize+1)+'–'+Math.min((pageIndex+1)*pageSize,rows.length)+' din '+rows.length),next);
      results.append(pages);
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
    for(const [a,v] of Object.entries(selection.attributes)){list.append(element('dt','',normalize(a)==='inaltime'?'Înălțime':a),element('dd','',v+(selected.units?.[a]?' '+selected.units[a]:'')));}
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
    const back=button(currentCategory.back,'handles-back',()=>showList({restore:true})),title=element('h2','handles-product-title',product.name);title.tabIndex=-1;
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
    const details=element('div','handles-details');
    if(product.description)details.append(element('p','catalog-product-description',product.description));
    details.append(element('p','handles-eyebrow','DIMENSIUNI ȘI FINISAJE'),element('div','handles-variant-data'));
    const groups=element('div','handles-attribute-groups');
    for(const attribute of product.attributes){
      const values=unique(product.variants.map(v=>v.attributes[attribute]));
      if(values.length<2)continue;
      const group=element('fieldset','handles-attribute'),legend=element('legend','',normalize(attribute)==='inaltime'?'Înălțime':attribute);group.append(legend);
      const choices=element('div','handles-choices');
      values.forEach(value=>{
        const b=button(value+(product.units?.[attribute]?' '+product.units[attribute]:''),'handles-choice',()=>chooseAttribute(attribute,value));b.dataset.handleAttribute=attribute;b.dataset.handleValue=value;b.setAttribute('aria-pressed','false');choices.append(b);
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
  async function load(category){
    if(catalogs.has(category.id))return catalogs.get(category.id);
    if(loadings.has(category.id))return loadings.get(category.id);
    const pending=fetch(new URL(category.file,base)).then(r=>{if(!r.ok)throw Error('catalog');return r.json();}).then(data=>{
      if(!Array.isArray(data.products)||!data.products.length)throw Error('catalog');
      data.products.forEach(p=>{p.finishTags=p.filterTags||normalize(p.finishes).split(/\s+/).filter(Boolean);p.searchText=normalize([p.name,p.finishes,...p.variants.flatMap(v=>[v.sku,...Object.values(v.attributes),v.spec])].join(' '));});
      data.finishCounts=Object.fromEntries(finishFilters.map(([value])=>[value,data.products.filter(p=>p.finishTags.includes(value)).length]));
      data.availableFilters=category.id==='handles'?finishFilters:finishFilters.filter(([value])=>data.finishCounts[value]>0);
      catalogs.set(category.id,data);return data;
    }).catch(error=>{loadings.delete(category.id);throw error;});
    loadings.set(category.id,pending);return pending;
  }
  async function show(){
    sections.forEach(s=>{if(s)s.hidden=true;});otherNavs.forEach(n=>n?.removeAttribute('aria-current'));
    panel.hidden=false;nav.setAttribute('aria-current','page');
    window.atelierNotes?.manager?.suspendPreviews?.(true);window.dispatchEvent(new CustomEvent('atelier-notes-inactive'));
    if(currentCategory)await openCategory(currentCategory);else showCategories();
  }
  function leave(){if(panel.hidden)return;saveCategory();clearTimeout(searchTimer);requestVersion++;panel.hidden=true;nav.removeAttribute('aria-current');releaseImages();}
  categoryNav.querySelector('button').addEventListener('click',()=>{showCategories();panel.scrollIntoView({block:'start',behavior:'instant'});});
  nav.addEventListener('click',show);
  otherNavs.forEach(n=>n?.addEventListener('click',leave,{capture:true}));
  for(const id of ['backToProjects','pmNewProject','pmImportProject'])document.getElementById(id)?.addEventListener('click',leave,{capture:true});
  let searchTimer;
  search.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{query=search.value;pageIndex=0;if(!panel.hidden)showList();},120);});
})();
