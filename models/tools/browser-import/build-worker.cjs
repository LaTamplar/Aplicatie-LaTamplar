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
// Definition wrappers contain independent records; parse one definition at a
// time rather than retaining millions of TLV objects for the entire model.
patch('  const total = headers.length;\n  let index = 0;', `  function expand(headers) {
    return headers.flatMap(header => {
      const [tag, offset, size] = header;
      return ["F901", "7017", "7117"].includes(tag)
        ? expand(flatHeaders(data, offset + 6, offset + 6 + size)) : [header];
    });
  }
  headers = expand(headers);
  const total = headers.length;
  let index = 0;`);
// Real entity ids can be sparse. Allocation must follow edge count, not the
// numeric distance between ids (which could request gigabytes).
const flagStart=source.indexOf('var EdgeFlagStore = class {');
const flagEnd=source.indexOf('// src/vertex-store.ts',flagStart);
if(flagStart<0||flagEnd<0)throw Error('Missing edge flag store');
source=source.slice(0,flagStart)+'var EdgeFlagStore = class extends Map { set(id,flags){return super.set(id,flags & 255);} };\n\n'+source.slice(flagEnd);
fs.writeFileSync(path.join(dir,'openskp-adapted.mjs'),source);
