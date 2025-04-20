import sys
import os
import json
import subprocess

def main():
    try:
        if len(sys.argv) < 4:
            print(json.dumps({'error': 'Недостаточно аргументов'}))
            sys.exit(1)

        input_path = sys.argv[1]
        output_path = sys.argv[2]
        simplify_ratio = float(sys.argv[3])

        ext = os.path.splitext(input_path)[1].lower()
        if ext in ['.glb', '.gltf']:
            # Используем Blender для оптимизации glTF/GLB
            blender_script = os.path.join(os.path.dirname(__file__), 'blender_decimate_glb.py')
            blender_path = os.environ.get('BLENDER_PATH', 'blender')
            cmd = [
                blender_path, '--background', '--python', blender_script, '--', input_path, output_path, str(simplify_ratio)
            ]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode != 0:
                print(json.dumps({'error': 'Blender decimation failed', 'stdout': proc.stdout, 'stderr': proc.stderr}))
                sys.exit(1)
            # Подсчитаем полигоны после оптимизации (через trimesh)
            try:
                import trimesh
                mesh = trimesh.load(output_path, force='scene')
                orig_faces = sum(len(g.faces) for g in mesh.geometry.values()) if hasattr(mesh, 'geometry') else len(mesh.faces)
                optimized_faces = orig_faces
                print(json.dumps({
                    'success': True,
                    'optimized_faces': optimized_faces,
                    'output_path': output_path
                }))
            except Exception as e:
                print(json.dumps({'success': True, 'output_path': output_path, 'note': 'Optimized, but could not count faces after.'}))
        else:
            import open3d as o3d
            mesh = o3d.io.read_triangle_mesh(input_path)
            if mesh.is_empty():
                print(json.dumps({'error': f'Не удалось загрузить mesh из файла: {input_path}'}))
                sys.exit(1)
            orig_faces = len(mesh.triangles)
            target_faces = max(10, int(orig_faces * simplify_ratio))
            if target_faces >= orig_faces:
                import shutil
                shutil.copy(input_path, output_path)
                print(json.dumps({
                    'success': True,
                    'original_faces': orig_faces,
                    'optimized_faces': orig_faces,
                    'output_path': output_path,
                    'skipped': True,
                    'reason': 'Target faces >= original faces, skipping optimization.'
                }))
                sys.exit(0)
            mesh = mesh.simplify_quadric_decimation(target_faces)
            mesh.remove_unreferenced_vertices()
            mesh.remove_degenerate_triangles()
            mesh.remove_duplicated_triangles()
            mesh.remove_duplicated_vertices()
            mesh.remove_non_manifold_edges()
            out_ext = os.path.splitext(output_path)[1].lower()
            write_ok = False
            actual_output_path = output_path
            if out_ext == '.obj':
                write_ok = o3d.io.write_triangle_mesh(output_path, mesh, write_triangle_uvs=True)
            elif out_ext == '.stl':
                # Для STL обязательно нужны нормали
                if not mesh.has_vertex_normals():
                    mesh.compute_vertex_normals()
                if not mesh.has_triangle_normals():
                    mesh.compute_triangle_normals()
                write_ok = o3d.io.write_triangle_mesh(output_path, mesh)
            else:
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
