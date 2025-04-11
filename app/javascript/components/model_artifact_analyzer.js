export class ModelArtifactAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.currentEngine = null;
    this.analysisVisible = false;
    
    // Константы для анализа
    this.EPSILON = 1e-6; // Погрешность для сравнения чисел с плавающей точкой
    this.ZERO_AREA_THRESHOLD = 1e-6; // Порог для определения нулевой площади
    this.DUPLICATE_DISTANCE_THRESHOLD = 1e-4; // Порог для определения дублирующихся вершин
    this.SELF_INTERSECTION_DEPTH = 3; // Глубина проверки самопересечений
    
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.artifactAnalysisButton = document.getElementById('runArtifactAnalysis');
    this.artifactAnalysisResults = document.getElementById('artifactAnalysisResults');
  }

  bindEvents() {
    this.artifactAnalysisButton?.addEventListener('click', () => this.toggleArtifactAnalysis());
    document.addEventListener('turbo:before-cache', () => this.cleanup());
  }

  cleanup() {
    if (this.currentEngine) {
      this.currentEngine.dispose();
      this.currentEngine = null;
    }
    const canvas = document.getElementById("tempCanvas");
    if (canvas) canvas.remove();
  }

  toggleArtifactAnalysis() {
    if (this.analysisVisible) {
      this.artifactAnalysisResults.classList.remove('visible');
      setTimeout(() => {
        this.artifactAnalysisResults.innerHTML = '';
        this.artifactAnalysisResults.classList.add('hidden');
      }, 300);
      this.artifactAnalysisButton.innerHTML = '<span class="button-icon">🔍</span> Поиск артефактов';
      this.analysisVisible = false;
    } else {
      this.runArtifactAnalysis();
    }
  }

  async runArtifactAnalysis() {
    if (!this.artifactAnalysisButton?.dataset.modelUrl) return;

    this.artifactAnalysisResults.classList.remove('hidden');
    this.artifactAnalysisResults.innerHTML = "<div class='loading'>Анализ артефактов модели...</div>";
    this.artifactAnalysisButton.disabled = true;

    try {
      const modelUrl = this.artifactAnalysisButton.dataset.modelUrl;
      const scene = await this.loadScene(modelUrl);
      const artifactAnalysis = this.analyzeArtifacts(scene);
      
      this.artifactAnalysisResults.innerHTML = this.formatArtifactAnalysisResults(artifactAnalysis);
      this.bindTooltipEvents();
      this.artifactAnalysisResults.classList.add('visible');
      
      this.artifactAnalysisButton.innerHTML = '<span class="button-icon">🔍</span> Скрыть результаты';
      this.artifactAnalysisButton.disabled = false;
      this.analysisVisible = true;
    } catch (error) {
      console.error(error);
      this.artifactAnalysisResults.innerHTML = `<p class="error">Ошибка анализа: ${error.message}</p>`;
      this.artifactAnalysisButton.innerHTML = '<span class="button-icon">🔍</span> Поиск артефактов';
      this.artifactAnalysisButton.disabled = false;
    } finally {
      this.cleanup();
    }
  }

  analyzeArtifacts(scene) {
    const results = {
      floatingVertices: 0,
      duplicateVertices: 0,
      duplicateFaces: 0,
      flippedFaces: 0,
      zeroAreaFaces: 0,
      selfIntersectingFaces: 0
    };

    scene.meshes.forEach(mesh => {
      if (!mesh.isEnabled()) return;

      // Анализ плавающих вершин
      results.floatingVertices += this.findFloatingVertices(mesh);

      // Анализ дублирующихся вершин
      results.duplicateVertices += this.findDuplicateVertices(mesh);

      // Анализ дублирующихся полигонов
      results.duplicateFaces += this.findDuplicateFaces(mesh);

      // Анализ перекрученных полигонов
      results.flippedFaces += this.findFlippedFaces(mesh);

      // Анализ полигонов с нулевой площадью
      results.zeroAreaFaces += this.findZeroAreaFaces(mesh);

      // Анализ самопересекающихся полигонов
      results.selfIntersectingFaces += this.findSelfIntersectingFaces(mesh);
    });

    return results;
  }

  findFloatingVertices(mesh) {
    try {
      const indices = mesh.getIndices();
      if (!indices) {
        return 0;
      }

      const usedVertices = new Set();
      for (let i = 0; i < indices.length; i++) {
        usedVertices.add(indices[i]);
      }

      const totalVertices = mesh.getTotalVertices();
      if (totalVertices === undefined) {
        return 0;
      }

      return Math.max(0, totalVertices - usedVertices.size);
    } catch (error) {
      return 0;
    }
  }

  findDuplicateVertices(mesh) {
    try {
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      if (!positions) {
        return 0;
      }

      const vertexMap = new Map();
      let duplicates = 0;

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];

        const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
        if (vertexMap.has(key)) {
          duplicates++;
        } else {
          vertexMap.set(key, true);
        }
      }

      return duplicates;
    } catch (error) {
      return 0;
    }
  }

  findDuplicateFaces(mesh) {
    try {
      const indices = mesh.getIndices();
      if (!indices) {
        return 0;
      }

      const faceMap = new Map();
      let duplicates = 0;

      for (let i = 0; i < indices.length; i += 3) {
        if (i + 2 >= indices.length) break;

        const face = [indices[i], indices[i + 1], indices[i + 2]].sort((a, b) => a - b);
        const key = face.join(',');
        
        if (faceMap.has(key)) {
          duplicates++;
        } else {
          faceMap.set(key, true);
        }
      }

      return duplicates;
    } catch (error) {
      return 0;
    }
  }

  findFlippedFaces(mesh) {
    try {
      const indices = mesh.getIndices();
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      
      if (!indices || !positions) {
        return 0;
      }

      let flipped = 0;
      
      // Получаем матрицу трансформации меша
      const worldMatrix = mesh.getWorldMatrix();
      
      // Создаем Three.js геометрию для более точного расчета
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array(positions);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      
      // Вычисляем нормали с учетом трансформаций
      geometry.computeVertexNormals();
      
      // Получаем центр меша в мировых координатах
      const boundingInfo = mesh.getBoundingInfo();
      const center = boundingInfo.boundingBox.centerWorld;
      
      // Проверяем каждую грань
      for (let i = 0; i < indices.length; i += 3) {
        if (i + 2 >= indices.length) break;
        
        // Получаем вершины в мировых координатах
        const v1 = BABYLON.Vector3.TransformCoordinates(
          new BABYLON.Vector3(
            positions[indices[i] * 3],
            positions[indices[i] * 3 + 1],
            positions[indices[i] * 3 + 2]
          ),
          worldMatrix
        );
        
        const v2 = BABYLON.Vector3.TransformCoordinates(
          new BABYLON.Vector3(
            positions[indices[i + 1] * 3],
            positions[indices[i + 1] * 3 + 1],
            positions[indices[i + 1] * 3 + 2]
          ),
          worldMatrix
        );
        
        const v3 = BABYLON.Vector3.TransformCoordinates(
          new BABYLON.Vector3(
            positions[indices[i + 2] * 3],
            positions[indices[i + 2] * 3 + 1],
            positions[indices[i + 2] * 3 + 2]
          ),
          worldMatrix
        );
        
        // Создаем Three.js треугольник для проверки
        const triangle = new THREE.Triangle(
          new THREE.Vector3(v1.x, v1.y, v1.z),
          new THREE.Vector3(v2.x, v2.y, v2.z),
          new THREE.Vector3(v3.x, v3.y, v3.z)
        );
        
        // Вычисляем нормаль и центр треугольника
        const normal = new THREE.Vector3();
        triangle.getNormal(normal);
        
        const centroid = new THREE.Vector3();
        triangle.getMidpoint(centroid);
        
        // Проверяем ориентацию относительно центра меша
        const toCenter = new THREE.Vector3(
          center.x - centroid.x,
          center.y - centroid.y,
          center.z - centroid.z
        );
        
        if (normal.dot(toCenter) < 0) {
          flipped++;
        }
      }
      
      return flipped;
    } catch (error) {
      return 0;
    }
  }

  findZeroAreaFaces(mesh) {
    try {
      const indices = mesh.getIndices();
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      
      if (!indices || !positions) {
        return 0;
      }

      let zeroArea = 0;

      for (let i = 0; i < indices.length; i += 3) {
        if (i + 2 >= indices.length) break;

        const v1 = new BABYLON.Vector3(
          positions[indices[i] * 3],
          positions[indices[i] * 3 + 1],
          positions[indices[i] * 3 + 2]
        );
        const v2 = new BABYLON.Vector3(
          positions[indices[i + 1] * 3],
          positions[indices[i + 1] * 3 + 1],
          positions[indices[i + 1] * 3 + 2]
        );
        const v3 = new BABYLON.Vector3(
          positions[indices[i + 2] * 3],
          positions[indices[i + 2] * 3 + 1],
          positions[indices[i + 2] * 3 + 2]
        );

        const area = BABYLON.Vector3.Cross(
          v2.subtract(v1),
          v3.subtract(v1)
        ).length() / 2;

        if (area < this.ZERO_AREA_THRESHOLD) {
          zeroArea++;
        }
      }

      return zeroArea;
    } catch (error) {
      return 0;
    }
  }

  findSelfIntersectingFaces(mesh) {
    try {
      // Пропускаем корневой меш
      if (mesh.name === '__root__') {
        return 0;
      }
      
      const indices = mesh.getIndices();
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      
      if (!indices || !positions || indices.length === 0 || positions.length === 0 || indices.length % 3 !== 0) {
        return 0;
      }

      let selfIntersecting = 0;
      const triangles = [];
      
      // Получаем матрицу трансформации меша
      const worldMatrix = mesh.getWorldMatrix();
      if (!worldMatrix) {
        return 0;
      }
      
      // Собираем все треугольники в мировых координатах
      for (let i = 0; i < indices.length; i += 3) {
        if (i + 2 >= indices.length) break;
        
        const idx1 = indices[i];
        const idx2 = indices[i + 1];
        const idx3 = indices[i + 2];
        
        if (idx1 * 3 + 2 >= positions.length || 
            idx2 * 3 + 2 >= positions.length || 
            idx3 * 3 + 2 >= positions.length) {
          continue;
        }
        
        const v1 = BABYLON.Vector3.TransformCoordinates(
          new BABYLON.Vector3(
            positions[idx1 * 3],
            positions[idx1 * 3 + 1],
            positions[idx1 * 3 + 2]
          ),
          worldMatrix
        );
        
        const v2 = BABYLON.Vector3.TransformCoordinates(
          new BABYLON.Vector3(
            positions[idx2 * 3],
            positions[idx2 * 3 + 1],
            positions[idx2 * 3 + 2]
          ),
          worldMatrix
        );
        
        const v3 = BABYLON.Vector3.TransformCoordinates(
          new BABYLON.Vector3(
            positions[idx3 * 3],
            positions[idx3 * 3 + 1],
            positions[idx3 * 3 + 2]
          ),
          worldMatrix
        );
        
        const triangle = new THREE.Triangle(
          new THREE.Vector3(v1.x, v1.y, v1.z),
          new THREE.Vector3(v2.x, v2.y, v2.z),
          new THREE.Vector3(v3.x, v3.y, v3.z)
        );
        
        triangles.push(triangle);
      }
      
      // Проверяем пересечения между треугольниками
      for (let i = 0; i < triangles.length; i++) {
        const triangle1 = triangles[i];
        
        // Проверяем только с соседними треугольниками для оптимизации
        for (let j = Math.max(0, i - 10); j < Math.min(triangles.length, i + 10); j++) {
          if (i === j) continue;
          
          const triangle2 = triangles[j];
          
          // Проверяем пересечение треугольников
          if (this.checkTriangleIntersection(triangle1, triangle2)) {
            selfIntersecting++;
            break;
          }
        }
      }
      
      return selfIntersecting;
    } catch (error) {
      return 0;
    }
  }

  checkTriangleIntersection(triangle1, triangle2) {
    // Проверяем пересечение ребер первого треугольника со вторым
    const edges1 = [
      [triangle1.a, triangle1.b],
      [triangle1.b, triangle1.c],
      [triangle1.c, triangle1.a]
    ];
    
    const edges2 = [
      [triangle2.a, triangle2.b],
      [triangle2.b, triangle2.c],
      [triangle2.c, triangle2.a]
    ];
    
    // Проверяем пересечение всех пар ребер
    for (const edge1 of edges1) {
      for (const edge2 of edges2) {
        if (this.checkEdgeIntersection(edge1[0], edge1[1], edge2[0], edge2[1])) {
          return true;
        }
      }
    }
    
    // Проверяем, находится ли вершина одного треугольника внутри другого
    if (this.isPointInTriangle(triangle2.a, triangle1) ||
        this.isPointInTriangle(triangle2.b, triangle1) ||
        this.isPointInTriangle(triangle2.c, triangle1) ||
        this.isPointInTriangle(triangle1.a, triangle2) ||
        this.isPointInTriangle(triangle1.b, triangle2) ||
        this.isPointInTriangle(triangle1.c, triangle2)) {
      return true;
    }
    
    return false;
  }

  checkEdgeIntersection(p1, p2, p3, p4) {
    // Вычисляем векторы
    const v1 = new THREE.Vector3().subVectors(p2, p1);
    const v2 = new THREE.Vector3().subVectors(p4, p3);
    const v3 = new THREE.Vector3().subVectors(p3, p1);
    
    // Вычисляем векторное произведение
    const cross1 = new THREE.Vector3().crossVectors(v1, v2);
    const cross2 = new THREE.Vector3().crossVectors(v3, v2);
    
    // Если векторы коллинеарны
    if (cross1.length() < this.EPSILON) {
      // Проверяем, лежат ли точки на одной прямой
      const cross3 = new THREE.Vector3().crossVectors(v3, v1);
      if (cross3.length() < this.EPSILON) {
        // Проверяем перекрытие отрезков
        const t1 = v3.dot(v1) / v1.lengthSq();
        const t2 = (v3.dot(v1) + v2.dot(v1)) / v1.lengthSq();
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 <= 0 && t2 >= 1);
      }
      return false;
    }
    
    // Вычисляем параметры пересечения
    const t = cross2.dot(cross1) / cross1.lengthSq();
    const u = cross2.length() / cross1.length();
    
    // Проверяем, находится ли точка пересечения на обоих отрезках
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  isPointInTriangle(point, triangle) {
    // Вычисляем векторы
    const v0 = new THREE.Vector3().subVectors(triangle.c, triangle.a);
    const v1 = new THREE.Vector3().subVectors(triangle.b, triangle.a);
    const v2 = new THREE.Vector3().subVectors(point, triangle.a);
    
    // Вычисляем скалярные произведения
    const dot00 = v0.dot(v0);
    const dot01 = v0.dot(v1);
    const dot02 = v0.dot(v2);
    const dot11 = v1.dot(v1);
    const dot12 = v1.dot(v2);
    
    // Вычисляем барицентрические координаты
    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    
    // Проверяем, находится ли точка внутри треугольника
    return (u >= 0) && (v >= 0) && (u + v <= 1);
  }

  formatArtifactAnalysisResults(results) {
    return `
      <div class="artifact-analysis">
        <h4>Анализ артефактов модели</h4>
        
        <div class="analysis-section">
          <div class="analysis-item ${results.floatingVertices > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Плавающие вершины:</span>
              <span class="info-icon" data-tooltip="floatingVertices">i</span>
              <div class="info-tooltip" id="tooltip-floatingVertices">
                <p><strong>Плавающие вершины</strong></p>
                <p>Вершины, не связанные ни с одним полигоном. Могут увеличивать размер файла и вызывать проблемы при рендеринге.</p>
                <p class="info-note">Анализ выполняется путем сравнения общего количества вершин с количеством вершин, используемых в полигонах.</p>
              </div>
            </div>
            <span class="analysis-value">${results.floatingVertices}</span>
          </div>

          <div class="analysis-item ${results.duplicateVertices > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Дублирующиеся вершины:</span>
              <span class="info-icon" data-tooltip="duplicateVertices">i</span>
              <div class="info-tooltip" id="tooltip-duplicateVertices">
                <p><strong>Дублирующиеся вершины</strong></p>
                <p>Вершины, расположенные в одной точке пространства. Могут вызывать проблемы при текстурировании и рендеринге.</p>
                <p class="info-note">Анализ выполняется путем точного сравнения координат вершин. Может не учитывать вершины, которые очень близки, но не идентичны.</p>
              </div>
            </div>
            <span class="analysis-value">${results.duplicateVertices}</span>
          </div>

          <div class="analysis-item ${results.duplicateFaces > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Дублирующиеся полигоны:</span>
              <span class="info-icon" data-tooltip="duplicateFaces">i</span>
              <div class="info-tooltip" id="tooltip-duplicateFaces">
                <p><strong>Дублирующиеся полигоны</strong></p>
                <p>Полигоны, полностью совпадающие по вершинам. Увеличивают размер файла и могут вызывать проблемы при рендеринге.</p>
                <p class="info-note">Анализ выполняется путем сравнения наборов вершин полигонов, независимо от порядка вершин.</p>
              </div>
            </div>
            <span class="analysis-value">${results.duplicateFaces}</span>
          </div>

          <div class="analysis-item ${results.flippedFaces > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Перекрученные полигоны:</span>
              <span class="info-icon" data-tooltip="flippedFaces">i</span>
              <div class="info-tooltip" id="tooltip-flippedFaces">
                <p><strong>Перекрученные полигоны</strong></p>
                <p>Полигоны с неправильной ориентацией нормалей. Могут вызывать проблемы с освещением и текстурированием.</p>
                <p class="info-note">Анализ выполняется путем проверки направления нормали полигона. Не учитывает трансформации меша и может давать ложные срабатывания при сложной геометрии.</p>
              </div>
            </div>
            <span class="analysis-value">${results.flippedFaces}</span>
          </div>

          <div class="analysis-item ${results.zeroAreaFaces > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Полигоны с нулевой площадью:</span>
              <span class="info-icon" data-tooltip="zeroAreaFaces">i</span>
              <div class="info-tooltip" id="tooltip-zeroAreaFaces">
                <p><strong>Полигоны с нулевой площадью</strong></p>
                <p>Полигоны, у которых все вершины лежат на одной прямой или совпадают. Не влияют на визуализацию, но могут вызывать проблемы при экспорте.</p>
                <p class="info-note">Анализ выполняется путем вычисления площади полигона через векторное произведение. Используется порог 0.000001 для определения нулевой площади.</p>
              </div>
            </div>
            <span class="analysis-value">${results.zeroAreaFaces}</span>
          </div>

          <div class="analysis-item ${results.selfIntersectingFaces > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Самопересекающиеся полигоны:</span>
              <span class="info-icon" data-tooltip="selfIntersectingFaces">i</span>
              <div class="info-tooltip" id="tooltip-selfIntersectingFaces">
                <p><strong>Самопересекающиеся полигоны</strong></p>
                <p>Полигоны, которые пересекаются друг с другом. Могут вызывать проблемы при рендеринге и 3D-печати.</p>
                <p class="info-note">Анализ выполняется путем проверки пересечений между соседними полигонами. Используется упрощенный алгоритм, который может пропустить некоторые типы самопересечений.</p>
              </div>
            </div>
            <span class="analysis-value">${results.selfIntersectingFaces}</span>
          </div>
        </div>
      </div>
    `;
  }

  loadScene(url) {
    return new Promise((resolve, reject) => {
      this.cleanup();

      const canvas = document.createElement('canvas');
      canvas.id = "tempCanvas";
      canvas.style.display = 'none';
      document.body.appendChild(canvas);

      this.currentEngine = new BABYLON.Engine(canvas, true, {
        disableWebGL2Support: false,
        preserveDrawingBuffer: true
      }, false);

      BABYLON.SceneLoader.Load("", url, this.currentEngine, scene => {
        scene.executeWhenReady(() => {
          if (!scene.activeCamera) {
            new BABYLON.ArcRotateCamera("cam",
              Math.PI/2, Math.PI/4, 10,
              BABYLON.Vector3.Zero(), scene
            );
          }
          resolve(scene);
        });
      }, null, reject);
    });
  }

  bindTooltipEvents() {
    const tooltips = document.querySelectorAll('.info-tooltip');
    let activeTooltip = null;

    // Скрываем все тултипы при клике вне них
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.info-icon') && activeTooltip) {
        activeTooltip.classList.remove('visible');
        activeTooltip = null;
      }
    });

    // Обработчики для иконок информации
    document.querySelectorAll('.info-icon').forEach(icon => {
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        const tooltipId = `tooltip-${icon.dataset.tooltip}`;
        const tooltip = document.getElementById(tooltipId);

        if (activeTooltip && activeTooltip !== tooltip) {
          activeTooltip.classList.remove('visible');
        }

        tooltip.classList.toggle('visible');
        activeTooltip = tooltip.classList.contains('visible') ? tooltip : null;
      });
    });
  }
} 