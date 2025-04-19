import sys
import os
import json

try:
    import pymeshlab
except ImportError:
    print(json.dumps({'error': 'PyMeshLab не установлен'}))
    sys.exit(1)

def main():
    if len(sys.argv) < 4:
        print(json.dumps({'error': 'Недостаточно аргументов. Использование: python3 optimize_mesh.py <input_path> <output_path> <simplify_ratio>'}))
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    input_ext = os.path.splitext(input_path)[1].lower()
    try:
        simplify_ratio = float(sys.argv[3])
        if not (0 < simplify_ratio < 1):
            raise ValueError()
    except ValueError:
        print(json.dumps({'error': 'Коэффициент упрощения должен быть числом от 0 до 1 (например, 0.5)'}))
        sys.exit(1)

    if not os.path.exists(input_path):
        print(json.dumps({'error': f'Файл {input_path} не найден'}))
        sys.exit(1)

    # Если формат .glb, сохраняем как .obj
    save_as_obj = False
    if input_ext == '.glb':
        output_path = os.path.splitext(output_path)[0] + '.obj'
        save_as_obj = True

    try:
        ms = pymeshlab.MeshSet()
        ms.load_new_mesh(input_path)
        mesh = ms.current_mesh()
        orig_faces = mesh.face_number()
        target_faces = int(orig_faces * simplify_ratio)
        try:
            ms.meshing_decimation_quadric_edge_collapse(targetfacenum=target_faces)
        except AttributeError as e:
            filters = dir(ms)
            print(json.dumps({'error': f'Фильтр не найден: {str(e)}', 'available_filters': filters}))
            sys.exit(1)
        ms.save_current_mesh(output_path)
        result = {
            'success': True,
            'original_faces': orig_faces,
            'optimized_faces': ms.current_mesh().face_number(),
            'output_path': output_path,
            'saved_as_obj': save_as_obj
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
