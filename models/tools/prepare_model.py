"""Prepare a local SketchUp copy for Atelier Fisa; never uploads or writes the SKP.
Requires 64-bit Python 3.9+ and an installed compatible SketchUp for Windows.
"""
import argparse, array, ctypes as C, json, math, os, pathlib, struct, tempfile

class Ref(C.Structure):
    _fields_ = [('ptr', C.c_void_p)]
class Point(C.Structure):
    _fields_ = [('x', C.c_double), ('y', C.c_double), ('z', C.c_double)]
class Transform(C.Structure):
    _fields_ = [('values', C.c_double * 16)]
class Color(C.Structure):
    _fields_ = [('red', C.c_ubyte), ('green', C.c_ubyte), ('blue', C.c_ubyte), ('alpha', C.c_ubyte)]

class Converter:
    def __init__(self, dll):
        self.dll_dir = os.add_dll_directory(str(dll.parent))
        self.api = C.CDLL(str(dll))
        self.call('SUInitialize', [], None)()
        self.model = Ref()
        self.bin = bytearray()
        self.doc = dict(asset={'version':'2.0','generator':'Atelier Fisa local preparer 1.0'}, scene=0,
            scenes=[], nodes=[], meshes=[], materials=[], textures=[], images=[], bufferViews=[], accessors=[],
            samplers=[{'wrapS':10497,'wrapT':10497,'magFilter':9729,'minFilter':9987}])
        self.tags = {}; self.material_ids = {}; self.texture_scales = {}; self.cache = {}
        self.stats = {'faces':0,'triangles':0,'meshes':0,'textures':0}

    def call(self, name, args, rest=C.c_int):
        f = getattr(self.api, name); f.argtypes=args; f.restype=rest; return f

    def check(self, result):
        if result: raise RuntimeError('SketchUp API: error %s' % result)

    def out(self, name, owner, typ=Ref, optional=False):
        r=typ(); code=self.call(name,[Ref,C.POINTER(typ)])(owner,C.byref(r))
        if optional and code==9: return None  # SU_ERROR_NO_DATA
        self.check(code); return r

    def text(self, name, owner):
        s=Ref(); self.check(self.call('SUStringCreate',[C.POINTER(Ref)])(C.byref(s)))
        try:
            self.check(self.call(name,[Ref,C.POINTER(Ref)])(owner,C.byref(s)))
            n=self.out('SUStringGetUTF8Length',s,C.c_size_t); b=C.create_string_buffer(n.value+1)
            self.check(self.call('SUStringGetUTF8',[Ref,C.c_size_t,C.c_char_p,C.POINTER(C.c_size_t)])(s,len(b),b,C.byref(n)))
            return b.value.decode('utf8')
        finally: self.call('SUStringRelease',[C.POINTER(Ref)])(C.byref(s))

    def refs(self, prefix, kind, owner):
        n=self.out(prefix+'GetNum'+kind,owner,C.c_size_t).value
        if not n:return []
        a=(Ref*n)(); got=C.c_size_t()
        self.check(self.call(prefix+'Get'+kind,[Ref,C.c_size_t,C.POINTER(Ref),C.POINTER(C.c_size_t)])(owner,n,a,C.byref(got)))
        return list(a)[:got.value]

    def view(self, data, target=None):
        self.bin.extend(b'\0' * (-len(self.bin)%4)); offset=len(self.bin); self.bin.extend(data)
        v={'buffer':0,'byteOffset':offset,'byteLength':len(data)}
        if target:v['target']=target
        self.doc['bufferViews'].append(v); return len(self.doc['bufferViews'])-1

    def accessor(self, data, component, kind, count, bounds=False):
        packed=array.array('I' if component==5125 else 'f',data)
        if struct.pack('=I',1)!=struct.pack('<I',1):packed.byteswap()
        item={'bufferView':self.view(packed.tobytes(),34963 if component==5125 else 34962),
              'componentType':component,'type':kind,'count':count}
        if bounds:
            item['min']=[min(data[i::3]) for i in range(3)]; item['max']=[max(data[i::3]) for i in range(3)]
        self.doc['accessors'].append(item); return len(self.doc['accessors'])-1

    def material(self, ref, temp):
        key=ref.ptr if ref else None
        if key in self.material_ids:return self.material_ids[key]
        material={'name':self.text('SUMaterialGetName',ref) if ref else 'Material implicit',
            'pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':0.8},'doubleSided':True}
        pbr=material['pbrMetallicRoughness']; alpha=1.0
        if ref:
            color=self.out('SUMaterialGetColor',ref,Color,True)
            def linear(v):
                x=v/255
                return x/12.92 if x<=0.04045 else ((x+.055)/1.055)**2.4
            pbr['baseColorFactor']=[linear(color.red),linear(color.green),linear(color.blue),1] if color else [1,1,1,1]
            if self.out('SUMaterialGetUseOpacity',ref,C.c_bool).value:
                alpha=self.out('SUMaterialGetOpacity',ref,C.c_double).value
            tex=self.out('SUMaterialGetTexture',ref,optional=True)
            if tex:
                file=pathlib.Path(temp)/('texture-%s.png'%len(self.doc['images']))
                self.check(self.call('SUTextureWriteToFile',[Ref,C.c_char_p])(tex,str(file).encode('utf8')))
                self.doc['images'].append({'bufferView':self.view(file.read_bytes()),'mimeType':'image/png'})
                self.doc['textures'].append({'source':len(self.doc['images'])-1,'sampler':0})
                pbr['baseColorTexture']={'index':len(self.doc['textures'])-1}
                pbr['baseColorFactor']=[1,1,1,1]  # PNG already contains SketchUp colorization.
                w=C.c_size_t(); h=C.c_size_t(); s=C.c_double(); t=C.c_double()
                self.check(self.call('SUTextureGetDimensions',[Ref,C.POINTER(C.c_size_t),C.POINTER(C.c_size_t),C.POINTER(C.c_double),C.POINTER(C.c_double)])(tex,C.byref(w),C.byref(h),C.byref(s),C.byref(t)))
                self.texture_scales[key]=(s.value,t.value); self.stats['textures']+=1
                if self.out('SUMaterialIsDrawnTransparent',ref,C.c_bool).value:
                    material['alphaMode']='BLEND'
        else:pbr['baseColorFactor']=[0.8,0.81,0.82,1]
        pbr['baseColorFactor'][3]=alpha
        if alpha<1:material['alphaMode']='BLEND'
        self.doc['materials'].append(material); index=len(self.doc['materials'])-1
        self.material_ids[key]=index; return index

    def meta(self, drawing):
        layer=self.out('SUDrawingElementGetLayer',drawing,optional=True)
        return {'sketchupTag':self.tags.get(layer.ptr if layer else None,'Layer0'),
                'sketchupHidden':self.out('SUDrawingElementGetHidden',drawing,C.c_bool).value}

    def mesh_array(self, helper, name, count, typ):
        a=(typ*count)(); got=C.c_size_t()
        self.check(self.call(name,[Ref,C.c_size_t,C.POINTER(typ),C.POINTER(C.c_size_t)])(helper,count,a,C.byref(got)))
        return list(a)[:got.value]

    def geometry(self, owner, inherited, temp):
        key=(owner.ptr,inherited.ptr if inherited else None)
        if key in self.cache:return self.cache[key]
        batches={}
        for face in self.refs('SUEntities','Faces',owner):
            drawing=self.call('SUFaceToDrawingElement',[Ref],Ref)(face); meta=self.meta(drawing)
            front=self.out('SUFaceGetFrontMaterial',face,optional=True)
            back=self.out('SUFaceGetBackMaterial',face,optional=True)
            helper=Ref(); self.check(self.call('SUMeshHelperCreate',[C.POINTER(Ref),Ref])(C.byref(helper),face))
            try:
                nv=self.out('SUMeshHelperGetNumVertices',helper,C.c_size_t).value
                nt=self.out('SUMeshHelperGetNumTriangles',helper,C.c_size_t).value
                if not nv or not nt:continue
                verts=self.mesh_array(helper,'SUMeshHelperGetVertices',nv,Point)
                normals=self.mesh_array(helper,'SUMeshHelperGetNormals',nv,Point)
                indices=[int(v) for v in self.mesh_array(helper,'SUMeshHelperGetVertexIndices',nt*3,C.c_size_t)]
                sides=[(front or inherited,front,False)]
                if back and (not front or back.ptr!=front.ptr):sides.append((back,back,True))
                for material_ref,direct,is_back in sides:
                    mat=self.material(material_ref,temp)
                    # Distinct front/back paints need single-sided surfaces to avoid coplanar overlap.
                    if len(sides)>1:
                        single_key=('side',mat)
                        if single_key not in self.material_ids:
                            self.doc['materials'].append(dict(self.doc['materials'][mat],doubleSided=False))
                            self.material_ids[single_key]=len(self.doc['materials'])-1
                        mat=self.material_ids[single_key]
                    batchkey=(meta['sketchupTag'],meta['sketchupHidden'],mat)
                    b=batches.setdefault(batchkey,{'p':[],'n':[],'uv':[],'i':[]})
                    offset=len(b['p'])//3; sign=-1 if is_back else 1
                    uv=self.mesh_array(helper,'SUMeshHelperGetBackSTQCoords' if is_back else 'SUMeshHelperGetFrontSTQCoords',nv,Point)
                    sx,sy=(1,1) if direct else self.texture_scales.get(material_ref.ptr if material_ref else None,(1,1))
                    for v,n,u in zip(verts,normals,uv):
                        b['p'].extend([v.x,v.y,v.z]); b['n'].extend([n.x*sign,n.y*sign,n.z*sign])
                        q=u.z if abs(u.z)>1e-12 else 1
                        b['uv'].extend([u.x/q*sx,1-u.y/q*sy])
                    for i in range(0,len(indices),3):
                        tri=indices[i:i+3]
                        if is_back:tri.reverse()
                        b['i'].extend([x+offset for x in tri])
                self.stats['faces']+=1; self.stats['triangles']+=nt
            finally:self.call('SUMeshHelperRelease',[C.POINTER(Ref)])(C.byref(helper))
        result=[]
        for (tag,hidden,mat),b in batches.items():
            n=len(b['p'])//3
            primitive={'attributes':{'POSITION':self.accessor(b['p'],5126,'VEC3',n,True),
                'NORMAL':self.accessor(b['n'],5126,'VEC3',n),'TEXCOORD_0':self.accessor(b['uv'],5126,'VEC2',n)},
                'indices':self.accessor(b['i'],5125,'SCALAR',len(b['i'])),'material':mat}
            self.doc['meshes'].append({'primitives':[primitive]}); result.append((len(self.doc['meshes'])-1,tag,hidden))
        self.cache[key]=result; self.stats['meshes']+=len(result); return result

    def node(self, node):
        self.doc['nodes'].append(node); return len(self.doc['nodes'])-1

    def walk(self, owner, inherited, temp, ancestry=()):
        if owner.ptr in ancestry:raise RuntimeError('Componenta ciclica detectata')
        children=[]
        for mesh,tag,hidden in self.geometry(owner,inherited,temp):
            children.append(self.node({'mesh':mesh,'extras':{'sketchupTag':tag,'sketchupHidden':hidden}}))
        for plural,kind in [('Groups','Group'),('Instances','ComponentInstance')]:
            for entity in self.refs('SUEntities',plural,owner):
                drawing=self.call('SU'+kind+'ToDrawingElement',[Ref],Ref)(entity)
                material=self.out('SUDrawingElementGetMaterial',drawing,optional=True) or inherited
                label=self.text('SU'+kind+'GetName',entity)
                if kind=='Group':entities=self.out('SUGroupGetEntities',entity)
                else:
                    definition=self.out('SUComponentInstanceGetDefinition',entity)
                    if not label:label=self.text('SUComponentDefinitionGetName',definition)
                    entities=self.out('SUComponentDefinitionGetEntities',definition)
                transform=self.out('SU'+kind+'GetTransform',entity,Transform)
                sub=self.walk(entities,material,temp,ancestry+(owner.ptr,))
                if sub:children.append(self.node({'name':label or ('Grup' if kind=='Group' else 'Componenta'),
                    'matrix':list(transform.values),'children':sub,'extras':self.meta(drawing)}))
        return children

    def convert(self, source, destination):
        if destination.exists():raise RuntimeError('Fisierul destinatie exista deja; alege alt nume pentru a-l pastra.')
        self.check(self.call('SUModelCreateFromFile',[C.POINTER(Ref),C.c_char_p])(C.byref(self.model),str(source).encode('utf8')))
        tags=[]
        for layer in self.refs('SUModel','Layers',self.model):
            name=self.text('SULayerGetName',layer); self.tags[layer.ptr]=name
            tags.append({'name':name,'visible':self.out('SULayerGetVisibility',layer,C.c_bool).value})
        with tempfile.TemporaryDirectory(prefix='atelier-model-',dir=destination.parent) as temp:
            children=self.walk(self.out('SUModelGetEntities',self.model),None,temp)
        if not children:raise RuntimeError('Modelul nu contine suprafete 3D.')
        root=self.node({'name':source.stem,'matrix':[.0254,0,0,0, 0,0,-.0254,0, 0,.0254,0,0, 0,0,0,1],
            'children':children,'extras':{'atelierModel':1,'sourceUnits':'inch','measurementUnits':'mm','sketchupTags':tags}})
        self.doc['scenes']=[{'nodes':[root]}]
        self.bin.extend(b'\0'*(-len(self.bin)%4)); self.doc['buffers']=[{'byteLength':len(self.bin)}]
        for key in ['textures','images','samplers']:
            if not self.doc.get('textures'):self.doc.pop(key,None)
        raw=json.dumps(self.doc,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode('utf8'); raw+=b' '*(-len(raw)%4)
        blob=struct.pack('<III',0x46546c67,2,28+len(raw)+len(self.bin))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(self.bin),0x004e4942)+self.bin
        destination.write_bytes(blob)
        return dict(self.stats,tags=len(tags),bytes=len(blob),output=str(destination))

    def close(self):
        if self.model.ptr:self.call('SUModelRelease',[C.POINTER(Ref)])(C.byref(self.model))
        self.call('SUTerminate',[],None)()

def main():
    parser=argparse.ArgumentParser(description='Pregateste o copie GLB locala pentru Atelier Fisa. Originalul SKP ramane intact.')
    parser.add_argument('source',type=pathlib.Path); parser.add_argument('--output',type=pathlib.Path); parser.add_argument('--sketchup-dll',type=pathlib.Path)
    args=parser.parse_args(); source=args.source.resolve()
    if source.suffix.lower()!='.skp' or not source.is_file():parser.error('Alege un fisier .skp existent.')
    destination=(args.output or source.with_name(source.stem+' - Atelier.glb')).resolve()
    if destination==source:parser.error('Destinatia trebuie sa fie diferita de original.')
    paths=sorted(pathlib.Path(os.environ.get('ProgramFiles',r'C:\Program Files')).glob('SketchUp/SketchUp */SketchUpAPI.dll'),reverse=True)
    dll=args.sketchup_dll or (paths[0] if paths else None)
    if not dll:parser.error('Nu am gasit SketchUp instalat. Instaleaza o versiune compatibila pe PC.')
    if C.sizeof(C.c_void_p)!=8:parser.error('Este necesar Python pe 64 de biti.')
    converter=Converter(dll)
    try:print(json.dumps(converter.convert(source,destination),ensure_ascii=False))
    finally:converter.close()

if __name__=='__main__':
    try:main()
    except Exception as error:
        print('Pregatirea nu a reusit: '+str(error)); raise SystemExit(1)
