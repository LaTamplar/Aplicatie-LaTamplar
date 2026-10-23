(() => {
  'use strict';
  const dbName='atelier-inventory-v1',storeName='items',tombstoneStore='tombstones';
  const defaultFolders=[
    {id:'pal',name:'PAL',description:'Plăci PAL și decoruri',icon:'panels'},
    {id:'mdf',name:'MDF',description:'Plăci MDF și fronturi',icon:'cabinet'},
    {id:'blaturi',name:'Blaturi',description:'Blaturi și panouri',icon:'wood'}
  ];
  const unfiled={id:'unfiled',name:'Fără dosar',description:'Materiale fără dosar'};
  const nav=document.getElementById('workspaceInventoryNav'),panel=document.getElementById('workspaceInventory');
  const projectPanel=document.querySelector('#projectManagerView > .project-manager-content'),notesPanel=document.getElementById('workspaceNotes');
  const list=document.getElementById('workspaceInventoryList'),search=document.getElementById('workspaceInventorySearch'),status=document.getElementById('workspaceInventoryStatus');
  const addButton=document.getElementById('workspaceInventoryAdd'),folderTabs=document.getElementById('workspaceInventoryFolders'),breadcrumb=document.getElementById('workspaceInventoryBreadcrumb');
  const breadcrumbBack=document.getElementById('workspaceInventoryBack'),breadcrumbTitle=document.getElementById('workspaceInventoryFolderTitle');
  const dimensionFilters=document.getElementById('workspaceInventoryDimensionFilters'),lengthFilter=document.getElementById('workspaceInventoryLength'),widthFilter=document.getElementById('workspaceInventoryWidth'),dimensionMode=document.getElementById('workspaceInventoryDimensionMode');
  if(!nav||!panel||!list)return;
  let db=null,items=[],folders=[],folderTombstones=[],query='',activeCategory=null,objectUrls=[],cloudSyncPromise=null,cloudSyncTimer=null,cloudSyncRequested=0;
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const folderIconPaths={folder:['M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8A1.5 1.5 0 0 1 20.5 9.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z','M4 10h16'],panels:['M5 4.5h12.5A1.5 1.5 0 0 1 19 6v13.5H5z','M8 7.5h8M8 10.5h8M8 13.5h8','M5 7H3.5v13h13v-1'],wood:['M4 5.5h16v13H4z','M5 9c4-2 9 2 14 0M5 14c4-2 9 2 14 0'],cabinet:['M5 4.5h14v15H5z','M5 10h14M12 4.5v15','M10 7v1M14 7v1M10 13v1M14 13v1'],furniture:['M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3','M5 11h14v4H5z','M7 15v4M17 15v4'],tools:['M14 6a4 4 0 0 0-5 5l-5.5 5.5a1.8 1.8 0 0 0 2.5 2.5l5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-3-3z'],hardware:['M8 4.5v4l2 2v8M16 4.5v4l-2 2v8M6 4.5h4M14 4.5h4M8 15h8'],finish:['M5 18.5 16.5 7l2.5 2.5L7.5 21H5z','m14 9 2.5 2.5','M4 4.5h8v3H4z','M6 7.5v5']};
  const folderIconNames={folder:'Dosar',panels:'Plăci',wood:'Lemn',cabinet:'Fronturi',furniture:'Mobilier',tools:'Scule',hardware:'Accesorii',finish:'Finisaje'};
  function folderIconGraphic(key,className='inventory-folder-icon'){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add(className);for(const d of folderIconPaths[key]||folderIconPaths.folder){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.append(path);}return svg;}
  const category=id=>folders.find(item=>item.id===id)||(id==='unfiled'?unfiled:{id:'unfiled',name:'Fără dosar',description:'Materialele au fost scoase din dosarul șters.'});
  const announce=(message,error=false)=>{status.textContent=message;status.classList.toggle('is-error',error);};
  const timestamp=value=>typeof value==='number'&&Number.isFinite(value)?value:(Date.parse(value||'')||0);
  const nextUpdatedAt=current=>new Date(Math.max(Date.now(),timestamp(current?.updatedAt)+1)).toISOString();
  const toIso=value=>new Date(timestamp(value)||Date.now()).toISOString();
  const scope=()=>window.atelierInventoryCloud?.connected()?' · sincronizat în contul Google':' · salvat pe acest dispozitiv';
  const openDb=()=>new Promise((resolve,reject)=>{const request=indexedDB.open(dbName,3);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName,{keyPath:'id'});if(!request.result.objectStoreNames.contains(tombstoneStore))request.result.createObjectStore(tombstoneStore,{keyPath:'id'});if(!request.result.objectStoreNames.contains('folders'))request.result.createObjectStore('folders',{keyPath:'id'});if(!request.result.objectStoreNames.contains('folderTombstones'))request.result.createObjectStore('folderTombstones',{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Inventarul nu poate fi deschis.'));});
  const transact=(mode,action,storeId=storeName)=>new Promise((resolve,reject)=>{const tx=db.transaction(storeId,mode),request=action(tx.objectStore(storeId));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||Error('Datele inventarului nu au putut fi salvate.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const all=async()=>((await transact('readonly',store=>store.getAll()))||[]).map(item=>{const folderId=item.folderId||item.category||'unfiled';return {...item,category:folderId,folderId};}).sort((a,b)=>timestamp(b.updatedAt)-timestamp(a.updatedAt));
  const allTombstones=async()=>((await transact('readonly',store=>store.getAll(),tombstoneStore))||[]);
  const allFolders=async()=>((await transact('readonly',store=>store.getAll(),'folders'))||[]).sort((a,b)=>{const order=folder=>defaultFolders.findIndex(item=>item.id===folder.id),ai=order(a),bi=order(b);return ai>=0||bi>=0?(ai<0?1:bi<0?-1:ai-bi):a.name.localeCompare(b.name,'ro');});
  const allFolderTombstones=async()=>((await transact('readonly',store=>store.getAll(),'folderTombstones'))||[]);
  const writeLocalItem=item=>new Promise((resolve,reject)=>{const tx=db.transaction([storeName,tombstoneStore],'readwrite');tx.objectStore(storeName).put(item);tx.objectStore(tombstoneStore).delete(item.id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Materialul nu a putut fi salvat.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const writeLocalTombstone=(id,deletedAt)=>new Promise((resolve,reject)=>{const tx=db.transaction([storeName,tombstoneStore],'readwrite');tx.objectStore(storeName).delete(id);tx.objectStore(tombstoneStore).put({id,deletedAt:toIso(deletedAt)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Ștergerea nu a putut fi salvată.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const writeLocalFolder=folder=>new Promise((resolve,reject)=>{const tx=db.transaction(['folders','folderTombstones'],'readwrite');tx.objectStore('folders').put(folder);tx.objectStore('folderTombstones').delete(folder.id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Dosarul nu a putut fi salvat.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const writeLocalFolderTombstone=(id,deletedAt)=>new Promise((resolve,reject)=>{const tx=db.transaction(['folders','folderTombstones'],'readwrite');tx.objectStore('folders').delete(id);tx.objectStore('folderTombstones').put({id,deletedAt:toIso(deletedAt)});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Ștergerea dosarului nu a putut fi salvată.'));tx.onabort=()=>reject(tx.error||Error('Operația nu a putut fi finalizată.'));});
  const save=async item=>{await writeLocalItem(item);scheduleCloudSync();};
  const remove=async id=>{const deletedAt=new Date().toISOString();await writeLocalTombstone(id,deletedAt);scheduleCloudSync();};
  const saveFolder=async folder=>{await writeLocalFolder(folder);scheduleCloudSync();};
  const removeFolder=async id=>{const folder=folders.find(entry=>entry.id===id),deletedAt=new Date(Math.max(Date.now(),timestamp(folder?.updatedAt)+1)).toISOString(),inFolder=items.filter(item=>item.category===id),updated=inFolder.map(item=>({...item,category:'unfiled',folderId:'unfiled',updatedAt:nextUpdatedAt(item)}));for(const item of updated)await writeLocalItem(item);await writeLocalFolderTombstone(id,deletedAt);items=await all();folders=await allFolders();if(activeCategory===id)activeCategory=null;scheduleCloudSync();return updated.length;};
  async function ensureDefaultFolders(){const existing=new Set((await allFolders()).map(folder=>folder.id)),deleted=new Set((await allFolderTombstones()).map(folder=>folder.id));for(const folder of defaultFolders)if(!existing.has(folder.id)&&!deleted.has(folder.id))await writeLocalFolder({...folder,updatedAt:new Date().toISOString()});folders=await allFolders();}
  function blobToDataUrl(blob){return new Promise((resolve,reject)=>{if(typeof blob==='string'){resolve(blob);return;}const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(Error('Imaginea materialului nu a putut fi pregătită pentru sincronizare.'));reader.readAsDataURL(blob);});}
  function dataUrlToBlob(value){if(typeof value!=='string'||!value.startsWith('data:'))return value;const [header,data]=value.split(',',2),mime=header.match(/^data:([^;]+)/)?.[1]||'image/jpeg',binary=atob(data||''),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Blob([bytes],{type:mime});}
  async function cloudItem(item){return {...item,image:await blobToDataUrl(item.image),updatedAt:toIso(item.updatedAt)};}
  async function applyRemoteRecord({id,value,deletedAt,local,localDeleted,folder=false}){
    const name=folder?'folders':storeName,deleted=folder?'folderTombstones':tombstoneStore;
    return new Promise((resolve,reject)=>{const tx=db.transaction([name,deleted],'readwrite'),records=tx.objectStore(name),tombstones=tx.objectStore(deleted),a=records.get(id),b=tombstones.get(id);let reads=0,applied=false;
      const ready=()=>{if(++reads<2)return;const current=a.result,tombstone=b.result;if(Boolean(current)!==Boolean(local)||timestamp(current?.updatedAt)!==timestamp(local?.updatedAt)||timestamp(tombstone?.deletedAt)!==timestamp(localDeleted)){cloudSyncRequested++;return;}
        if(deletedAt){records.delete(id);tombstones.put({id,deletedAt:toIso(deletedAt)});}else{records.put(value);tombstones.delete(id);}applied=true;};a.onsuccess=ready;b.onsuccess=ready;tx.oncomplete=()=>resolve(applied);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Sincronizare întreruptă'));});
  }
  const workspaceOpen=()=>Boolean(document.hidden||!notesPanel.hidden||document.getElementById('atelierNoteEditor')||document.getElementById('atelierModels')?.open||document.getElementById('editorView')&&!document.getElementById('editorView').hidden);
  const writingBusy=()=>Boolean(workspaceOpen()||window.atelierIsWriting?.()||window.atelierNotes?.manager?.editor?.isBusy());
  const deferDuringWriting=()=>{if(!writingBusy())return false;cloudSyncRequested++;return true;};
  async function syncFolders(cloud){
    const localFolders=await allFolders(),localDeletes=await allFolderTombstones(),localById=new Map(localFolders.map(folder=>[folder.id,folder])),localDeleteById=new Map(localDeletes.map(item=>[item.id,item.deletedAt]));
    const versions=Object.fromEntries(localFolders.map(folder=>[folder.id,toIso(folder.updatedAt)])),remote=await cloud.pullFolders(versions),remoteById=new Map((remote.folders||[]).map(folder=>[folder.id,folder])),remoteMetaById=new Map(Object.entries(remote.metas||{})),remoteDeleteById=new Map(Object.entries(remote.tombstones||{}));
    if(deferDuringWriting())return false;
    const ids=new Set([...localById.keys(),...remoteMetaById.keys(),...localDeleteById.keys(),...remoteDeleteById.keys()]);
    for(const id of ids){
      if(deferDuringWriting())return false;
      const local=localById.get(id),remoteFolder=remoteById.get(id),remoteMeta=remoteMetaById.get(id),localDeleted=localDeleteById.get(id),remoteDeleted=remoteDeleteById.get(id);
      const localAt=timestamp(local?.updatedAt),remoteAt=timestamp(remoteMeta?.updatedAt||remoteFolder?.updatedAt),localDeleteAt=timestamp(localDeleted),remoteDeleteAt=timestamp(remoteDeleted);
      const localWinsDelete=Boolean(localDeleted)&&localDeleteAt>=Math.max(remoteAt,remoteDeleteAt),remoteWinsDelete=Boolean(remoteDeleted)&&remoteDeleteAt>=Math.max(localAt,localDeleteAt);
      if(localWinsDelete){if(local)await applyRemoteRecord({id,deletedAt:localDeleted,local,localDeleted,folder:true});if(localDeleteAt>remoteDeleteAt)await cloud.removeFolder(id,toIso(localDeleted));continue;}
      if(remoteWinsDelete){if(local||!localDeleted||localDeleteAt<remoteDeleteAt)await applyRemoteRecord({id,deletedAt:remoteDeleted,local,localDeleted,folder:true});continue;}
      if(local&&(!remoteMeta||localAt>remoteAt)){await cloud.saveFolder({...local,updatedAt:toIso(local.updatedAt)});continue;}
      if(remoteMeta&&(!local||remoteAt>localAt)&&remoteFolder)await applyRemoteRecord({id,value:{...remoteFolder,updatedAt:toIso(remoteFolder.updatedAt)},local,localDeleted,folder:true});
    }
    folders=await allFolders();if(activeCategory&&!folders.some(folder=>folder.id===activeCategory)){activeCategory=null;search.value='';query='';}
  }
  async function syncInventory(){
    const cloud=window.atelierInventoryCloud;
    if(!db||!cloud?.connected())return false;
    if(writingBusy()){cloudSyncRequested++;clearTimeout(cloudSyncTimer);if(!workspaceOpen())cloudSyncTimer=setTimeout(()=>syncInventory(),10000);return false;}
    if(cloudSyncPromise)return cloudSyncPromise;
    const requestAtStart=cloudSyncRequested;
    cloudSyncPromise=(async()=>{
      if(await syncFolders(cloud)===false||deferDuringWriting())return false;
      const localItems=await all(),localDeletes=await allTombstones(),localById=new Map(localItems.map(item=>[item.id,item])),localDeleteById=new Map(localDeletes.map(item=>[item.id,item.deletedAt]));
      const localVersions=Object.fromEntries(localItems.map(item=>[item.id,toIso(item.updatedAt)]));
      const remote=await cloud.pull(localVersions),remoteById=new Map((remote.items||[]).map(item=>[item.id,item])),remoteMetaById=new Map(Object.entries(remote.metas||{})),remoteDeleteById=new Map(Object.entries(remote.tombstones||{}));
      if(deferDuringWriting())return false;
      const ids=new Set([...localById.keys(),...remoteMetaById.keys(),...localDeleteById.keys(),...remoteDeleteById.keys()]);
      for(const id of ids){
        if(deferDuringWriting())return false;
        const local=localById.get(id),remoteItem=remoteById.get(id),remoteMeta=remoteMetaById.get(id),localDeleted=localDeleteById.get(id),remoteDeleted=remoteDeleteById.get(id);
        const localAt=timestamp(local?.updatedAt),remoteAt=timestamp(remoteMeta?.updatedAt||remoteItem?.updatedAt),localDeleteAt=timestamp(localDeleted),remoteDeleteAt=timestamp(remoteDeleted);
        const localWinsDelete=Boolean(localDeleted)&&localDeleteAt>=Math.max(remoteAt,remoteDeleteAt);
        const remoteWinsDelete=Boolean(remoteDeleted)&&remoteDeleteAt>=Math.max(localAt,localDeleteAt);
        if(localWinsDelete){if(local)await applyRemoteRecord({id,deletedAt:localDeleted,local,localDeleted});if(localDeleteAt>remoteDeleteAt)await cloud.remove(id,toIso(localDeleted));continue;}
        if(remoteWinsDelete){if(local||!localDeleted||localDeleteAt<remoteDeleteAt)await applyRemoteRecord({id,deletedAt:remoteDeleted,local,localDeleted});continue;}
        if(local&&(!remoteMeta||localAt>remoteAt)){await cloud.save(await cloudItem(local));continue;}
        if(remoteMeta&&(!local||remoteAt>localAt)&&remoteItem){await applyRemoteRecord({id,value:{...remoteItem,image:dataUrlToBlob(remoteItem.image),updatedAt:toIso(remoteItem.updatedAt)},local,localDeleted});continue;}
        if(remoteDeleted&&localDeleteAt<=remoteDeleteAt&&!local){await applyRemoteRecord({id,deletedAt:remoteDeleted,local,localDeleted});}
      }
      items=await all();if(!panel.hidden)render();
      announce(window.atelierInventoryCloud?.connected()?'Inventarul este sincronizat între dispozitive.':'Inventarul este salvat local.');
      return true;
    })().catch(error=>{console.warn('Sincronizarea inventarului va reîncerca.',error);announce('Inventarul rămâne salvat pe acest dispozitiv. Sincronizarea va reîncerca automat.',true);cloudSyncRequested++;return false;}).finally(()=>{cloudSyncPromise=null;if(cloudSyncRequested>requestAtStart){clearTimeout(cloudSyncTimer);cloudSyncTimer=setTimeout(()=>syncInventory(),5000);}});
    return cloudSyncPromise;
  }
  function scheduleCloudSync(){cloudSyncRequested+=1;window.clearTimeout(cloudSyncTimer);if(window.atelierInventoryCloud?.connected())cloudSyncTimer=window.setTimeout(()=>syncInventory(),180);}
  window.addEventListener('atelier-inventory-cloud-change',scheduleCloudSync);
  window.addEventListener('online',scheduleCloudSync);window.addEventListener('atelier-editor-idle',scheduleCloudSync);window.addEventListener('atelier-notes-inactive',scheduleCloudSync);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleCloudSync();});
  window.atelierInventory={all:()=>all(),folders:()=>allFolders(),sync:()=>syncInventory()};
  const showSection=()=>{projectPanel.hidden=true;notesPanel.hidden=true;panel.hidden=false;for(const id of ['workspaceProjectsNav','workspaceNotesNav'])document.getElementById(id)?.removeAttribute('aria-current');nav.setAttribute('aria-current','page');document.title='Inventar | La-Tâmplar';render();};
  const leaveInventory=()=>{panel.hidden=true;nav.removeAttribute('aria-current');};
  document.getElementById('workspaceProjectsNav')?.addEventListener('click',leaveInventory,{capture:true});
  document.getElementById('workspaceNotesNav')?.addEventListener('click',leaveInventory,{capture:true});
  nav.addEventListener('click',showSection);
  search.addEventListener('input',()=>{query=search.value.trim().toLocaleLowerCase('ro-RO');render();});
  for(const input of [lengthFilter,widthFilter,dimensionMode]){input?.addEventListener('input',render);input?.addEventListener('change',render);}
  function deleteFolderFromUi(group,button){button.disabled=true;const amount=items.filter(item=>item.category===group.id).length,warning=amount?`Dosarul conține ${amount} ${amount===1?'material':'materiale'}. Acestea vor rămâne în „Toate materialele”, fără dosar. Continui?`:`Ștergi dosarul „${group.name}”?`;if(!confirm(warning)){button.disabled=false;return;}removeFolder(group.id).then(moved=>{render();announce(moved?`Dosarul a fost șters. ${moved} ${moved===1?'material a rămas':'materiale au rămas'} în Toate materialele${scope()}.`:`Dosarul „${group.name}” a fost șters${scope()}.`);}).catch(error=>{announce(error.message,true);button.disabled=false;});}
  const formatDimension=value=>value?`${value} mm`:'';
  function dimensionCriteria(){const length=Number(lengthFilter?.value)||0,width=Number(widthFilter?.value)||0,pair=!length&&!width?query.match(/^(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)$/):null;return{length:length||Number(pair?.[1]?.replace(',','.'))||0,width:width||Number(pair?.[2]?.replace(',','.'))||0,mode:dimensionMode?.value||'below',fromQuery:Boolean(pair)};}
  function matchesDimensions(item){const criteria=dimensionCriteria();if(!criteria.length&&!criteria.width)return true;const length=Number(item.height)||0,width=Number(item.width)||0;if(criteria.length&&!length||criteria.width&&!width)return false;const compare=(actual,target)=>criteria.mode==='exact'?actual===target:criteria.mode==='above'?actual>=target:actual<=target;return(!criteria.length||compare(length,criteria.length))&&(!criteria.width||compare(width,criteria.width));}
  function match(item){const dimensionPair=query.match(/^(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)$/),textQuery=dimensionPair?'':query,text=`${item.name} ${item.supplier||''} ${item.width||''} ${item.height||''} ${item.depth||''}`.toLocaleLowerCase('ro-RO');return(!textQuery||text.includes(textQuery))&&matchesDimensions(item);}
  function revokeCards(){objectUrls.forEach(url=>URL.revokeObjectURL(url));objectUrls=[];list.replaceChildren();}
  function render(){
    revokeCards();
    if(breadcrumb){breadcrumb.hidden=!activeCategory;if(activeCategory){breadcrumbTitle.textContent=category(activeCategory).name;search.placeholder=`Caută în ${category(activeCategory).name} după nume sau dimensiuni...`;search.setAttribute('aria-label',`Caută în ${category(activeCategory).name} după nume sau dimensiuni`);}else{breadcrumbTitle.textContent='Toate materialele';search.placeholder='Caută după nume sau dimensiuni...';search.setAttribute('aria-label','Caută materiale după nume sau dimensiuni');}}
    if(folderTabs){folderTabs.replaceChildren();const allWrap=el('div','inventory-folder-tab'),allButton=el('button','inventory-folder-tab-open',`Toate materialele · ${items.length}`);allButton.type='button';allButton.setAttribute('aria-pressed',String(!activeCategory));allButton.addEventListener('click',()=>{activeCategory=null;render();});allWrap.append(allButton);folderTabs.append(allWrap);const unfiledCount=items.filter(item=>item.category==='unfiled').length;if(unfiledCount){const wrap=el('div','inventory-folder-tab'),open=el('button','inventory-folder-tab-open','Fără dosar'),count=el('span','inventory-folder-tab-count',String(unfiledCount));open.type='button';open.setAttribute('aria-pressed',String(activeCategory==='unfiled'));open.prepend(folderIconGraphic('folder','inventory-folder-tab-icon'));open.append(count);open.addEventListener('click',()=>{activeCategory='unfiled';render();});wrap.append(open);folderTabs.append(wrap);}for(const group of folders){const count=items.filter(item=>item.category===group.id).length,kind=folderIconPaths[group.icon]?group.icon:({pal:'panels',mdf:'cabinet',blaturi:'wood'}[group.id]||'folder'),wrap=el('div','inventory-folder-tab'),open=el('button','inventory-folder-tab-open'),removeButton=el('button','inventory-folder-tab-delete','×');open.type=removeButton.type='button';open.setAttribute('aria-pressed',String(activeCategory===group.id));open.setAttribute('aria-label',`${group.name}, ${count} ${count===1?'material':'materiale'}`);open.append(folderIconGraphic(kind,'inventory-folder-tab-icon'),el('span','inventory-folder-tab-name',group.name),el('span','inventory-folder-tab-count',String(count)));open.addEventListener('click',()=>{activeCategory=group.id;render();});removeButton.setAttribute('aria-label',`Șterge dosarul ${group.name}`);removeButton.title=`Șterge dosarul ${group.name}`;removeButton.addEventListener('click',()=>deleteFolderFromUi(group,removeButton));wrap.append(open,removeButton);folderTabs.append(wrap);}const create=el('button','inventory-folder-create','+ Dosar');create.type='button';create.addEventListener('click',openFolderForm);folderTabs.append(create);}
    const rows=items.filter(item=>(!activeCategory||item.category===activeCategory)&&match(item));
    const subject=activeCategory?`în ${category(activeCategory).name}`:'în toate materialele';announce(`${rows.length} ${rows.length===1?'material':'materiale'} ${subject}${scope()}`);
    if(!rows.length){const hasFilters=Boolean(query||lengthFilter?.value||widthFilter?.value),empty=el('div','inventory-empty'),message=el('p','',hasFilters?'Nu am găsit materiale care să corespundă filtrelor.':activeCategory?'Dosarul este pregătit pentru primul material.':'Inventarul este pregătit. Adaugă primul material sau creează un dosar.');empty.append(message);if(!hasFilters){const button=el('button','inventory-empty-add','Adaugă un material');button.type='button';button.addEventListener('click',()=>openForm(null,activeCategory));empty.append(button);}list.append(empty);return;}
    rows.forEach(item=>list.append(makeItemCard(item,!activeCategory)));
  }
  function makeItemCard(item,showCategory=false){
    const card=el('article','inventory-card'),imageButton=el('button','inventory-image-open'),image=el('img','inventory-card-image');imageButton.type='button';image.alt=item.name;image.loading='lazy';image.src=URL.createObjectURL(item.image);objectUrls.push(image.src);imageButton.append(image);imageButton.setAttribute('aria-label',`Deschide imaginea pentru ${item.name}`);imageButton.addEventListener('click',()=>openImagePreview(item));
    const content=el('div','inventory-card-content'),top=el('div','inventory-card-top'),title=el('h3','inventory-card-title',item.name),dimensions=el('div','inventory-card-dimensions');
    if(showCategory)top.append(el('span','inventory-item-category',category(item.category).name));top.append(title);if(item?.supplier)top.append(el('span','inventory-item-supplier',`Furnizor · ${item.supplier}`));
    for(const [label,value] of [['Lungime',item.height],['Lățime',item.width],['Grosime',item.depth]])if(value)dimensions.append(el('span','',`${label}: ${formatDimension(value)}`));
    if(!dimensions.childElementCount)dimensions.append(el('span','','Dimensiuni necompletate'));
    const actions=el('div','inventory-card-actions'),edit=el('button','','Editează'),del=el('button','inventory-delete','Șterge');edit.type=del.type='button';edit.addEventListener('click',()=>openForm(item,item.category));del.addEventListener('click',async()=>{if(!confirm(`Ștergi „${item.name}” din inventar?`))return;try{await remove(item.id);items=await all();render();announce(`Materialul a fost șters${scope()}.`);}catch(error){announce(error.message,true);}});
    actions.append(edit,del);content.append(top,dimensions,actions);card.append(imageButton,content);return card;
  }
  function openImagePreview(item){
    const dialog=el('dialog','inventory-image-dialog'),frame=el('div','inventory-image-frame'),image=el('img',''),caption=el('div','inventory-image-caption'),copy=el('div',''),name=el('strong','',item.name),meta=el('span','',[category(item.category).name,item.supplier].filter(Boolean).join(' · ')),close=el('button','inventory-image-close','×');
    image.alt=item.name;image.src=URL.createObjectURL(item.image);const url=image.src;close.type='button';close.setAttribute('aria-label','Închide previzualizarea');copy.append(name,meta);caption.append(copy,close);frame.append(image,caption);dialog.append(frame);document.body.append(dialog);
    close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{URL.revokeObjectURL(url);dialog.remove();});dialog.showModal();
  }
  function resizeImage(file){return new Promise((resolve,reject)=>{
    if(!file||!file.type.startsWith('image/')){reject(Error('Alege un fișier imagine.'));return;}
    if(file.size>30*1024*1024){reject(Error('Imaginea depășește 30 MB. Alege o fotografie mai mică.'));return;}
    const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{try{const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{URL.revokeObjectURL(url);canvas.width=canvas.height=1;blob?resolve(blob):reject(Error('Imaginea nu a putut fi pregătită.'));},'image/jpeg',.86);}catch(error){URL.revokeObjectURL(url);reject(error);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Fișierul imagine nu poate fi deschis.'));};img.src=url;
  });}
  function openForm(item,initialCategory){
    const dialog=document.createElement('dialog');dialog.className='inventory-dialog';dialog.setAttribute('aria-labelledby','inventoryDialogTitle');
    const form=el('form','inventory-dialog-form');form.method='dialog';const head=el('div','inventory-dialog-heading'),copy=el('div'),title=el('h3','',item?'Editează materialul':'Adaugă un material'),desc=el('p','',item?'Actualizează dosarul, imaginea sau dimensiunile.':'Alege un dosar și completează detaliile materialului.');title.id='inventoryDialogTitle';copy.append(title,desc);const close=el('button','inventory-dialog-close','×');close.type='button';close.setAttribute('aria-label','Închide');close.addEventListener('click',()=>dialog.close());head.append(copy,close);
    const categorySelect=document.createElement('select');for(const group of [unfiled,...folders]){const option=document.createElement('option');option.value=group.id;option.textContent=group.name;categorySelect.append(option);}categorySelect.value=item?.category||initialCategory||'unfiled';const categoryField=el('label','inventory-field','Dosar');categoryField.append(categorySelect);
    const name=document.createElement('input');name.type='text';name.maxLength=120;name.required=true;name.placeholder='De exemplu: Stejar Halifax natur';name.value=item?.name||'';const nameField=el('label','inventory-field','Nume material');nameField.append(name);const supplier=document.createElement('input');supplier.type='text';supplier.maxLength=100;supplier.autocomplete='organization';supplier.placeholder='De exemplu: Egger, Kastamon';supplier.value=item?.supplier||'';const supplierField=el('label','inventory-field','Furnizor (opțional)');supplierField.append(supplier);
    const dims=el('div','inventory-dimensions');const dimensionInputs={};for(const [key,label] of [['height','Lungime (mm)'],['width','Lățime (mm)'],['depth','Grosime (mm)']]){const input=document.createElement('input');input.type='number';input.min='0';input.max='99999';input.step='1';input.inputMode='numeric';input.placeholder='—';input.value=item?.[key]||'';input.setAttribute('aria-label',label);dimensionInputs[key]=input;const field=el('label','inventory-field',label);field.append(input);dims.append(field);}
    const file=document.createElement('input');file.type='file';file.accept='image/*';file.className='inventory-file-input';file.setAttribute('aria-label','Alege imaginea materialului');const upload=el('label','inventory-field','Imagine');const uploadBox=el('span','inventory-upload'),preview=el('img','inventory-upload-preview'),uploadCopy=el('span','inventory-upload-copy');preview.alt='Previzualizare imagine';let selectedFile=null,previewUrl='';const updatePreview=blob=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=blob?URL.createObjectURL(blob):'';preview.src=previewUrl||'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2282%22 height=%2258%22 viewBox=%220 0 82 58%22%3E%3Crect width=%2282%22 height=%2258%22 rx=%228%22 fill=%22%23e5ebf1%22/%3E%3Cpath d=%22M17 43l13-15 9 10 9-12 17 17H17z%22 fill=%22%23b8c7d5%22/%3E%3Ccircle cx=%2254%22 cy=%2218%22 r=%226%22 fill=%22%23b8c7d5%22/%3E%3C/svg%3E';};updatePreview(item?.image);const uploadStrong=el('strong','',item?'Schimbă imaginea':'Alege o imagine'),uploadInfo=el('span','',item?'Poți păstra imaginea actuală.':'JPG, PNG sau alt format de imagine');uploadCopy.append(uploadStrong,uploadInfo);uploadBox.append(preview,uploadCopy,file);upload.append(uploadBox);file.addEventListener('change',()=>{selectedFile=file.files?.[0]||null;if(selectedFile){updatePreview(selectedFile);uploadInfo.textContent=selectedFile.name;}});uploadBox.addEventListener('click',event=>{if(event.target!==file){event.preventDefault();file.click();}});
    const actions=el('div','inventory-dialog-actions'),cancel=el('button','','Anulează'),saveButton=el('button','inventory-save',item?'Salvează modificările':'Adaugă materialul');cancel.type='button';saveButton.type='submit';cancel.addEventListener('click',()=>dialog.close());actions.append(cancel,saveButton);form.append(head,categoryField,nameField,supplierField,dims,upload,actions);dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);dialog.remove();});dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});form.addEventListener('submit',async event=>{event.preventDefault();const cleanName=name.value.trim();if(!cleanName){name.focus();return;}saveButton.disabled=true;try{const image=selectedFile?await resizeImage(selectedFile):item?.image;if(!image)throw Error('Alege o imagine pentru acest material.');const numeric=key=>{const n=Number(dimensionInputs[key].value);return Number.isFinite(n)&&n>0?String(Math.round(n)):'';};const id=item?.id||(crypto.randomUUID?crypto.randomUUID():`item-${Date.now()}-${Math.random().toString(36).slice(2)}`);const next={id,category:categorySelect.value,name:cleanName,supplier:supplier.value.trim(),width:numeric('width'),height:numeric('height'),depth:numeric('depth'),image,updatedAt:nextUpdatedAt(item)};await save(next);items=await all();render();announce(`Materialul a fost salvat în ${category(next.category).name}${scope()}.`);dialog.close();}catch(error){announce(error.message,true);saveButton.disabled=false;}});dialog.showModal();name.focus();
  }
  function openFolderForm(){
    const dialog=document.createElement('dialog');dialog.className='inventory-dialog';dialog.setAttribute('aria-labelledby','inventoryFolderDialogTitle');const form=el('form','inventory-dialog-form');form.method='dialog';const head=el('div','inventory-dialog-heading'),copy=el('div'),title=el('h3','','Creează un dosar'),desc=el('p','','Alege un nume și o pictogramă clară pentru colecție.');title.id='inventoryFolderDialogTitle';copy.append(title,desc);const close=el('button','inventory-dialog-close','×');close.type='button';close.setAttribute('aria-label','Închide');close.addEventListener('click',()=>dialog.close());head.append(copy,close);
    const name=document.createElement('input');name.type='text';name.maxLength=48;name.required=true;name.placeholder='De exemplu: Stejar, Feronerie, Proiect nou';const field=el('label','inventory-field','Numele dosarului');field.append(name);
    let selectedIcon='panels';const iconField=el('fieldset','inventory-icon-field'),legend=el('legend','','Pictogramă dosar'),choices=el('div','inventory-icon-choices');iconField.append(legend,choices);for(const [key,label] of Object.entries(folderIconNames)){const option=el('button','inventory-icon-choice');option.type='button';option.setAttribute('aria-label',label);option.setAttribute('aria-pressed',String(key===selectedIcon));option.append(folderIconGraphic(key,'inventory-icon-choice-graphic'),el('span','',label));option.addEventListener('click',()=>{selectedIcon=key;choices.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button===option)));});choices.append(option);}
    const actions=el('div','inventory-dialog-actions'),cancel=el('button','','Anulează'),saveButton=el('button','inventory-save','Creează dosarul');cancel.type='button';saveButton.type='submit';cancel.addEventListener('click',()=>dialog.close());actions.append(cancel,saveButton);form.append(head,field,iconField,actions);dialog.append(form);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});form.addEventListener('submit',async event=>{event.preventDefault();const clean=name.value.trim();if(!clean){name.focus();return;}if((await allFolders()).some(folder=>folder.name.toLocaleLowerCase('ro-RO')===clean.toLocaleLowerCase('ro-RO'))){announce('Există deja un dosar cu acest nume.',true);name.focus();return;}saveButton.disabled=true;try{const id=crypto.randomUUID?`folder-${crypto.randomUUID()}`:`folder-${Date.now()}-${Math.random().toString(36).slice(2)}`;await saveFolder({id,name:clean,description:`Dosar ${folderIconNames[selectedIcon].toLocaleLowerCase('ro-RO')}`,icon:selectedIcon,updatedAt:new Date().toISOString()});folders=await allFolders();activeCategory=id;search.value='';query='';if(lengthFilter)lengthFilter.value='';if(widthFilter)widthFilter.value='';render();announce(`Dosarul „${clean}” a fost creat${scope()}.`);dialog.close();}catch(error){announce(error.message,true);saveButton.disabled=false;}});dialog.showModal();name.focus();
  }
  addButton.addEventListener('click',()=>openForm(null,activeCategory));
  const renderMaterials=render;
  render=function(){
    renderMaterials();
    const inFolders=!activeCategory;
    panel.dataset.inventoryView=inFolders?'folders':'folder';
    if(addButton)addButton.hidden=false;
    if(breadcrumbBack)breadcrumbBack.textContent='← Dosare';
    const subtitle=panel.querySelector('.workspace-inventory-heading .project-manager-subtitle');
    if(subtitle)subtitle.textContent=inFolders
      ?'Deschide un dosar PAL, MDF sau Blaturi pentru a vedea imaginile și dimensiunile.'
      :'Materialele din dosarul '+category(activeCategory).name+' apar aici; caută și filtrează dimensiunile în acest dosar.';
    if(!inFolders)return;
    revokeCards();
    const groups=[...folders];
    const unfiledCount=items.filter(item=>item.category==='unfiled').length;
    if(unfiledCount)groups.push(unfiled);
    for(const group of groups){
      const count=items.filter(item=>item.category===group.id).length;
      const icon=group.icon||({pal:'panels',mdf:'cabinet',blaturi:'wood'}[group.id]||'folder');
      const card=el('article','inventory-folder-card');
      const open=el('button','inventory-folder-open');
      open.type='button';
      open.setAttribute('aria-label','Deschide dosarul '+group.name+', '+count+' '+(count===1?'material':'materiale'));
      const copy=el('span','inventory-folder-copy');
      copy.append(el('strong','',group.name),el('small','',group.description||'Deschide dosarul pentru a vedea materialele și dimensiunile.'));
      const meta=el('span','inventory-folder-meta');
      meta.append(el('strong','',String(count)),el('small','',count===1?'material':'materiale'));
      open.append(folderIconGraphic(icon),copy,meta,el('span','inventory-folder-arrow','›'));
      open.addEventListener('click',()=>{
        activeCategory=group.id;
        search.value='';query='';
        if(lengthFilter)lengthFilter.value='';
        if(widthFilter)widthFilter.value='';
        render();
      });
      card.append(open);
      if(group.id!=='unfiled'){
        const removeButton=el('button','inventory-folder-delete','Șterge dosarul');
        removeButton.type='button';
        removeButton.setAttribute('aria-label','Șterge dosarul '+group.name);
        removeButton.addEventListener('click',()=>deleteFolderFromUi(group,removeButton));
        card.append(removeButton);
      }
      list.append(card);
    }
    const create=el('button','inventory-folder-card inventory-folder-card-create');
    create.type='button';
    create.append(el('span','inventory-folder-icon','+'));
    const createCopy=el('span','inventory-folder-copy');
    createCopy.append(el('strong','','Dosar nou'),el('small','','Organizează separat alte materiale'));
    create.append(createCopy);
    create.addEventListener('click',openFolderForm);
    list.append(create);
    status.textContent=groups.length+' dosare · '+items.length+' materiale'+scope();
  };
  breadcrumbBack?.addEventListener('click',()=>{activeCategory=null;render();});
  (async()=>{try{db=await openDb();items=await all();folders=await allFolders();await syncInventory();await ensureDefaultFolders();items=await all();render();scheduleCloudSync();}catch(error){announce(`${error.message} Verifică dacă browserul permite stocarea locală.`,true);addButton.disabled=true;}})();
})();
