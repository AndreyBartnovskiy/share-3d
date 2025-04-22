import bpy
import sys
import os
import glob

# Allow Blender's Python to import numpy from our venv
for sp in glob.glob('/opt/venv/lib/python*/site-packages'):
    if os.path.isdir(sp):
        sys.path.insert(0, sp)
import numpy as np
if not hasattr(np, 'bool'):
    np.bool = bool

# Получаем аргументы после --
argv = sys.argv
argv = argv[argv.index("--") + 1:]
input_path, output_path, ratio = argv
ratio = float(ratio)

# Очистить сцену
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Импортировать .glb/.gltf
ext = os.path.splitext(input_path)[1].lower()
if ext in ['.glb', '.gltf']:
    bpy.ops.import_scene.gltf(filepath=input_path)
else:
    raise Exception(f"Формат {ext} не поддерживается для Blender decimation!")

# Применить decimate ко всем мешам
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        mod = obj.modifiers.new(name='DecimateMod', type='DECIMATE')
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)

# Экспортировать обратно в .glb/.gltf
bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB')
