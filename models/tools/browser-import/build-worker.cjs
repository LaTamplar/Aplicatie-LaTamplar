// Reproducible adapter for pinned OpenSKP 1.3.0. No source models are bundled.
const fs=require('fs'),path=require('path');const dir=__dirname;
let source=fs.readFileSync(path.join(dir,'package/dist/index.mjs'),'utf8');
function patch(before,after){if(!source.includes(before))throw Error('Upstream changed: '+before.slice(0,50));source=source.replaceAll(before,after);}
patch('const colorKey = `${color.r},','const colorKey = `${mat?.name || ""},${color.r},');
patch('        textureIndex: texIndex,','        materialName: mat?.name || "Material implicit",\n        textureIndex: texIndex,');
patch('function getMaterialIndex(color, doubleSided, textureIndex, transparency = 1)', 'function getMaterialIndex(color, doubleSided, textureIndex, transparency = 1, materialName = "Material implicit")');
patch('const key = `${color.r},','const key = `${materialName},${color.r},');
patch('const material = { pbrMetallicRoughness: pbr };','const material = { name: materialName, pbrMetallicRoughness: pbr };');
patch('getMaterialIndex(group.color, group.doubleSided, group.textureIndex, group.transparency)','getMaterialIndex(group.color, group.doubleSided, group.textureIndex, group.transparency, group.materialName)');
patch('        name: displayName,','        hidden: !!inst.hidden,\n        name: displayName,');
fs.writeFileSync(path.join(dir,'openskp-adapted.mjs'),source);
