import bpy
import sys
import os

argv = sys.argv
argv = argv[argv.index("--") + 1:]  # get all args after "--"
input_path, output_path, ratio = argv
ratio = float(ratio)

# Очистить сцену
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Импортировать модель (поддерживаются .obj, .stl, .glb)
ext = os.path.splitext(input_path)[1].lower()
if ext == '.obj':
    bpy.ops.import_scene.obj(filepath=input_path)
elif ext == '.stl':
    bpy.ops.import_mesh.stl(filepath=input_path)
elif ext == '.glb':
    bpy.ops.import_scene.gltf(filepath=input_path)
else:
    print(f"Unsupported format: {ext}")
    sys.exit(1)

# Применить decimate к каждому mesh-объекту
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        mod = obj.modifiers.new(name='DecimateMod', type='DECIMATE')
        mod.ratio = ratio
        bpy.ops.object.modifier_apply(modifier=mod.name)

# Экспортировать обратно
if ext == '.obj' or ext == '.glb':
    bpy.ops.export_scene.obj(filepath=output_path)
elif ext == '.stl':
    bpy.ops.export_mesh.stl(filepath=output_path)
else:
    print(f"Unsupported export format: {ext}")
    sys.exit(1)
