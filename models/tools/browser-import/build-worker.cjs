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
// Normal material mode must not substitute random tag palette colours for
// unpainted faces. Cached style-library files may not be the active style;
// use SketchUp's normal front/back defaults rather than those library entries.
patch('const c = layerColors.get(name) || [136, 136, 136];', 'const c = [255, 255, 255];');
patch('const backColor = backMat?.color ?? fallbackColor;', 'const backColor = backMat?.color ?? ctx.fallbackBackColor ?? fallbackColor;');
for(const owner of ['parentLayer','layer'])patch('fallbackLayerColor: getLayerColor('+owner+'),', 'fallbackLayerColor: getLayerColor('+owner+'),\n      fallbackBackColor: (() => { const c = [164, 178, 187]; return {r:c[0],g:c[1],b:c[2]}; })(),');
// Equal average RGB does not mean equal paint: the two sides can have entirely
// different textures/material names/UV mapping and must remain distinct.
patch('const sameColor = frontColor.r === backColor.r && frontColor.g === backColor.g && frontColor.b === backColor.b;', 'const sameColor = frontMat === backMat && frontColor.r === backColor.r && frontColor.g === backColor.g && frontColor.b === backColor.b && (frontColor.a ?? 255) === (backColor.a ?? 255) && (!frontMat?.texture || uvTransform === uvTransformBack || JSON.stringify(uvTransform) === JSON.stringify(uvTransformBack));');
// PNG headers and total byte lengths can match for different textures. Hash
// all bytes once per texture, keep different image payloads separate.
source = `const atelierTextureHashes = new WeakMap();
function atelierTextureFingerprint(tex) {
 let key=atelierTextureHashes.get(tex);if(key)return key;
 let a=2166136261,b=5381;for(const value of tex.data){a=Math.imul(a^value,16777619);b=Math.imul(b,33)^value;}
 key=(a>>>0).toString(16)+':'+(b>>>0).toString(16);atelierTextureHashes.set(tex,key);return key;
}
`+source;
patch('Array.from(tex.data.subarray(0, 16)).join(",")', 'atelierTextureFingerprint(tex)');
fs.writeFileSync(path.join(dir,'openskp-adapted.mjs'),source);

