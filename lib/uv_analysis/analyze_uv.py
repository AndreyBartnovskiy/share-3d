import sys
import json
import os

try:
    import pyassimp
except ImportError:
    print(json.dumps({"error": "pyassimp не установлен"}))
    sys.exit(1)

def analyze_uv(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".stl":
        return {
            "uv_exists": False,
            "reason": "STL format does not support UV mapping"
        }
    try:
        with pyassimp.load(filepath) as scene:
            meshes = scene.meshes
            uv_exist = False
            for mesh in meshes:
                # pyassimp гарантирует наличие texturecoords, но может быть пустым списком или списком списков
                tcoords = getattr(mesh, 'texturecoords', None)
                if tcoords is not None and isinstance(tcoords, list) and len(tcoords) > 0:
                    # В большинстве форматов UV-координаты лежат в первом элементе (texturecoords[0])
                    first = tcoords[0]
                    if first is not None:
                        # first может быть numpy array или list точек
                        if hasattr(first, 'shape') and hasattr(first, '__len__'):
                            if len(first) > 0:
                                uv_exist = True
                                break
                        elif isinstance(first, list) and len(first) > 0:
                            uv_exist = True
                            break
                # Иногда pyassimp кладёт UV прямо в tcoords (например, для OBJ)
                elif tcoords is not None and hasattr(tcoords, '__len__') and len(tcoords) > 0:
                    uv_exist = True
                    break
            # Примитивная эвристика эффективности UV (можно доработать)
            uv_efficiency = None
            overlapping_islands = None
            distortion = None
            details = ""
            if uv_exist:
                details = "UV-развёртка обнаружена."
                uv_efficiency = 1.0  # TODO: Реализовать реальную оценку эффективности
                overlapping_islands = False  # TODO: Реализовать реальную проверку
                distortion = False  # TODO: Реализовать реальную проверку
            else:
                details = "UV-развёртка отсутствует!"
            return {
                "uv_exists": uv_exist,
                "uv_efficiency": uv_efficiency,
                "overlapping_islands": overlapping_islands,
                "distortion": distortion,
                "details": details
            }
    except Exception as e:
        return {"error": str(e)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
    filepath = sys.argv[1]
    result = analyze_uv(filepath)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
