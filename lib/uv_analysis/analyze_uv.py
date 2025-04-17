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
            # Реальный расчет эффективности использования UV-пространства
            uv_efficiency = None
            overlapping_islands = None
            distortion = None
            details = ""
            uv_efficiency_explanation = ""
            if uv_exist:
                total_uv_area = 0.0
                for mesh in meshes:
                    tcoords = getattr(mesh, 'texturecoords', None)
                    if tcoords is not None and len(tcoords) > 0:
                        uvs = tcoords[0]
                        # pyassimp может возвращать numpy array или list
                        if hasattr(uvs, 'tolist'):
                            uvs = uvs.tolist()
                        faces = getattr(mesh, 'faces', [])
                        for face in faces:
                            if len(face) != 3:
                                continue  # Только треугольники
                            try:
                                uv0 = uvs[face[0]][:2]
                                uv1 = uvs[face[1]][:2]
                                uv2 = uvs[face[2]][:2]
                                # Площадь треугольника по формуле через векторное произведение
                                area = abs(0.5 * ((uv1[0] - uv0[0]) * (uv2[1] - uv0[1]) - (uv2[0] - uv0[0]) * (uv1[1] - uv0[1])))
                                total_uv_area += area
                            except Exception:
                                continue
                # Ограничим область UV-карты 1x1
                total_uv_area = min(total_uv_area, 1.0)
                uv_efficiency = total_uv_area * 100  # В процентах
                details = f"UV-развёртка обнаружена. Эффективность использования UV-пространства: {uv_efficiency:.2f}%."
                if uv_efficiency < 30:
                    uv_efficiency_explanation = "Низкая эффективность: большая часть UV-карты не используется, текстура может быть размытой."
                elif uv_efficiency < 70:
                    uv_efficiency_explanation = "Средняя эффективность: есть неиспользуемые области, можно улучшить развёртку."
                else:
                    uv_efficiency_explanation = "Высокая эффективность: UV-пространство используется хорошо, текстура будет качественной."
                overlapping_islands = None  # Не реализовано
                distortion = None  # Не реализовано
            else:
                details = "UV-развёртка отсутствует!"
            return {
                "uv_exists": uv_exist,
                "uv_efficiency": uv_efficiency,
                "uv_efficiency_explanation": uv_efficiency_explanation,
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
