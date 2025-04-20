import open3d as o3d
import sys
import os
import json

def main():
    try:
        if len(sys.argv) < 4:
            print(json.dumps({'error': 'Недостаточно аргументов'}))
            sys.exit(1)

        input_path = sys.argv[1]
        output_path = sys.argv[2]
        simplify_ratio = float(sys.argv[3])

        mesh = o3d.io.read_triangle_mesh(input_path)
        if mesh.is_empty():
            print(json.dumps({'error': f'Не удалось загрузить mesh из файла: {input_path}'}))
            sys.exit(1)

        orig_faces = len(mesh.triangles)
        target_faces = max(10, int(orig_faces * simplify_ratio))

        mesh = mesh.simplify_quadric_decimation(target_faces)
        mesh.remove_unreferenced_vertices()
        mesh.remove_degenerate_triangles()
        mesh.remove_duplicated_triangles()
        mesh.remove_duplicated_vertices()
        mesh.remove_non_manifold_edges()

        ext = os.path.splitext(output_path)[1].lower()
        write_ok = False
        actual_output_path = output_path

        if ext == '.obj':
            write_ok = o3d.io.write_triangle_mesh(output_path, mesh, write_triangle_uvs=True)
        elif ext == '.stl':
            write_ok = o3d.io.write_triangle_mesh(output_path, mesh)
        elif ext == '.glb' or ext == '.gltf':
            # Сохраняем сначала как .obj, потом конвертируем в .glb через trimesh
            temp_obj = os.path.splitext(output_path)[0] + '_tmp.obj'
            write_ok = o3d.io.write_triangle_mesh(temp_obj, mesh, write_triangle_uvs=True)
            if write_ok:
                try:
                    import trimesh
                    tm = trimesh.load(temp_obj, force='mesh')
                    tm.export(output_path)
                    actual_output_path = output_path
                    os.remove(temp_obj)
                except Exception as e:
                    print(json.dumps({'error': f'Ошибка при конвертации в .glb: {str(e)}'}))
                    sys.exit(1)
            else:
                print(json.dumps({'error': f'Не удалось сохранить временный .obj для конвертации в .glb: {temp_obj}'}))
                sys.exit(1)
        else:
            # По умолчанию сохраняем в .obj
            actual_output_path = os.path.splitext(output_path)[0] + '.obj'
            write_ok = o3d.io.write_triangle_mesh(actual_output_path, mesh, write_triangle_uvs=True)

        if not write_ok:
            print(json.dumps({'error': f'Не удалось сохранить mesh в файл: {actual_output_path}'}))
            sys.exit(1)

        print(json.dumps({
            'success': True,
            'original_faces': orig_faces,
            'optimized_faces': len(mesh.triangles),
            'output_path': actual_output_path
        }))
    except Exception as e:
        import traceback
        print(json.dumps({'error': str(e), 'traceback': traceback.format_exc()}))
        sys.exit(1)

if __name__ == '__main__':
    main()
