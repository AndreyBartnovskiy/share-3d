export class ModelAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.currentEngine = null;
    this.analysisVisible = false;
    this.showAllMeshes = false;
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.analysisButton = document.getElementById('runAnalysis');
    this.analysisResultsElem = document.getElementById('analysisResults');
  }

  bindEvents() {
    this.analysisButton?.addEventListener('click', () => this.toggleAnalysis());
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

  toggleAnalysis() {
    if (this.analysisVisible) {
      // Скрыть анализ
      this.analysisResultsElem.innerHTML = '';
      this.analysisButton.textContent = 'Анализ модели';
      this.analysisVisible = false;
    } else {
      // Показать анализ
      this.runAnalysis();
    }
  }

  async runAnalysis() {
    if (!this.analysisButton?.dataset.modelUrl) return;

    this.analysisResultsElem.innerHTML = "<div class='loading'>Анализ модели...</div>";
    this.analysisButton.disabled = true;

    try {
      // Получаем URL модели
      const modelUrl = this.analysisButton.dataset.modelUrl;
      
      // Загружаем модель для анализа
      const scene = await this.loadScene(modelUrl);
      
      // Выполняем базовый анализ
      const basicAnalysis = this.analyzeScene(scene);
      
      // Выполняем расширенный анализ топологии
      const topologyAnalysis = this.analyzeTopology(scene);
      
      // Объединяем результаты
      const combinedAnalysis = this.combineAnalysisResults(basicAnalysis, topologyAnalysis);
      
      // Отображаем результаты
      this.analysisResultsElem.innerHTML = combinedAnalysis;
      
      // Обновляем кнопку
      this.analysisButton.textContent = 'Скрыть анализ';
      this.analysisButton.disabled = false;
      this.analysisVisible = true;
      
      // Добавляем обработчик для кнопки "Показать все меши"
      const showAllButton = document.getElementById('showAllMeshes');
      if (showAllButton) {
        showAllButton.addEventListener('click', () => this.toggleAllMeshes());
      }
    } catch (error) {
      console.error(error);
      this.analysisResultsElem.innerHTML = `<p class="error">Ошибка анализа: ${error.message}</p>`;
      this.analysisButton.textContent = 'Анализ модели';
      this.analysisButton.disabled = false;
    } finally {
      this.cleanup();
    }
  }

  analyzeTopology(scene) {
    try {
      // Инициализируем результаты анализа топологии
      const topologyResults = {
        isWatertight: true,
        hasInvertedNormals: false,
        nonManifoldEdges: 0,
        floatingVertices: 0,
        meshDensity: {
          overSubdivided: 0,
          underSubdivided: 0
        }
      };

      // Анализируем каждый меш в сцене
      scene.meshes.forEach(mesh => {
        if (!mesh.isEnabled()) return;

        // Проверка на замкнутость (watertight)
        if (!this.isMeshWatertight(mesh)) {
          topologyResults.isWatertight = false;
        }

        // Проверка на инвертированные нормали
        if (this.hasInvertedNormals(mesh)) {
          topologyResults.hasInvertedNormals = true;
        }

        // Подсчет не-манифольдных рёбер
        const nonManifoldEdges = this.countNonManifoldEdges(mesh);
        topologyResults.nonManifoldEdges += nonManifoldEdges;

        // Подсчет плавающих вершин
        const floatingVertices = this.countFloatingVertices(mesh);
        topologyResults.floatingVertices += floatingVertices;

        // Анализ плотности сетки
        const densityAnalysis = this.analyzeMeshDensity(mesh);
        topologyResults.meshDensity.overSubdivided += densityAnalysis.overSubdivided;
        topologyResults.meshDensity.underSubdivided += densityAnalysis.underSubdivided;
      });

      return topologyResults;
    } catch (error) {
      console.error("Ошибка при анализе топологии:", error);
      return null;
    }
  }

  isMeshWatertight(mesh) {
    try {
      // Проверка на замкнутость (watertight)
      // Меш считается замкнутым, если каждое ребро принадлежит ровно двум граням
      
      // Получаем индексы вершин
      const indices = mesh.getIndices();
      if (!indices || indices.length === 0) return false;
      
      // Создаем карту рёбер и их граней
      const edgeMap = new Map();
      
      // Проходим по всем треугольникам
      for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i];
        const v2 = indices[i + 1];
        const v3 = indices[i + 2];
        
        // Добавляем каждое ребро треугольника
        this.addEdgeToMap(edgeMap, v1, v2, i / 3);
        this.addEdgeToMap(edgeMap, v2, v3, i / 3);
        this.addEdgeToMap(edgeMap, v3, v1, i / 3);
      }
      
      // Проверяем, что каждое ребро принадлежит ровно двум граням
      for (const [edge, faces] of edgeMap.entries()) {
        if (faces.length !== 2) {
          return false; // Найдено ребро, принадлежащее не двум граням
        }
      }
      
      return true; // Все рёбра принадлежат ровно двум граням
    } catch (error) {
      console.error("Ошибка при проверке замкнутости меша:", error);
      return false;
    }
  }

  addEdgeToMap(edgeMap, v1, v2, faceIndex) {
    // Сортируем вершины, чтобы ребро (v1, v2) и (v2, v1) считались одинаковыми
    const edgeKey = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
    
    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, []);
    }
    
    edgeMap.get(edgeKey).push(faceIndex);
  }

  hasInvertedNormals(mesh) {
    try {
      // Проверка на инвертированные нормали
      // Для этого можно использовать проверку ориентации треугольников
      
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      const indices = mesh.getIndices();
      
      if (!positions || !indices || positions.length === 0 || indices.length === 0) {
        return false;
      }
      
      // Проверяем ориентацию первых нескольких треугольников
      // Если ориентация различается, значит есть инвертированные нормали
      
      let firstTriangleOrientation = null;
      
      for (let i = 0; i < Math.min(indices.length, 300); i += 3) {
        const v1 = indices[i];
        const v2 = indices[i + 1];
        const v3 = indices[i + 2];
        
        const p1 = new BABYLON.Vector3(
          positions[v1 * 3],
          positions[v1 * 3 + 1],
          positions[v1 * 3 + 2]
        );
        
        const p2 = new BABYLON.Vector3(
          positions[v2 * 3],
          positions[v2 * 3 + 1],
          positions[v2 * 3 + 2]
        );
        
        const p3 = new BABYLON.Vector3(
          positions[v3 * 3],
          positions[v3 * 3 + 1],
          positions[v3 * 3 + 2]
        );
        
        // Вычисляем ориентацию треугольника
        const v12 = p2.subtract(p1);
        const v13 = p3.subtract(p1);
        const normal = BABYLON.Vector3.Cross(v12, v13);
        
        // Определяем ориентацию (положительная или отрицательная)
        const orientation = normal.length() > 0;
        
        if (firstTriangleOrientation === null) {
          firstTriangleOrientation = orientation;
        } else if (firstTriangleOrientation !== orientation) {
          return true; // Найдена инвертированная нормаль
        }
      }
      
      return false; // Инвертированных нормалей не найдено
    } catch (error) {
      console.error("Ошибка при проверке инвертированных нормалей:", error);
      return false;
    }
  }

  countNonManifoldEdges(mesh) {
    try {
      // Подсчет не-манифольдных рёбер
      // Не-манифольдное ребро - это ребро, принадлежащее более чем двум граням
      
      const indices = mesh.getIndices();
      if (!indices || indices.length === 0) return 0;
      
      // Создаем карту рёбер и их граней
      const edgeMap = new Map();
      
      // Проходим по всем треугольникам
      for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i];
        const v2 = indices[i + 1];
        const v3 = indices[i + 2];
        
        // Добавляем каждое ребро треугольника
        this.addEdgeToMap(edgeMap, v1, v2, i / 3);
        this.addEdgeToMap(edgeMap, v2, v3, i / 3);
        this.addEdgeToMap(edgeMap, v3, v1, i / 3);
      }
      
      // Подсчитываем рёбра, принадлежащие более чем двум граням
      let nonManifoldEdgesCount = 0;
      for (const [edge, faces] of edgeMap.entries()) {
        if (faces.length > 2) {
          nonManifoldEdgesCount++;
        }
      }
      
      return nonManifoldEdgesCount;
    } catch (error) {
      console.error("Ошибка при подсчете не-манифольдных рёбер:", error);
      return 0;
    }
  }

  countFloatingVertices(mesh) {
    try {
      // Подсчет плавающих вершин
      // Плавающая вершина - это вершина, не связанная ни с одной гранью
      
      const indices = mesh.getIndices();
      if (!indices || indices.length === 0) return 0;
      
      // Создаем множество вершин, используемых в гранях
      const usedVertices = new Set();
      
      // Проходим по всем треугольникам
      for (let i = 0; i < indices.length; i++) {
        usedVertices.add(indices[i]);
      }
      
      // Получаем общее количество вершин
      const totalVertices = mesh.getTotalVertices();
      
      // Плавающие вершины - это вершины, не используемые в гранях
      const floatingVerticesCount = totalVertices - usedVertices.size;
      
      return floatingVerticesCount;
    } catch (error) {
      console.error("Ошибка при подсчете плавающих вершин:", error);
      return 0;
    }
  }

  analyzeMeshDensity(mesh) {
    try {
      // Анализ плотности сетки
      // Определяем участки с слишком высокой и слишком низкой плотностью
      
      const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      const indices = mesh.getIndices();
      
      if (!positions || !indices || positions.length === 0 || indices.length === 0) {
        return { overSubdivided: 0, underSubdivided: 0 };
      }
      
      // Вычисляем среднюю длину рёбер
      let totalEdgeLength = 0;
      let edgeCount = 0;
      
      for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i];
        const v2 = indices[i + 1];
        const v3 = indices[i + 2];
        
        const p1 = new BABYLON.Vector3(
          positions[v1 * 3],
          positions[v1 * 3 + 1],
          positions[v1 * 3 + 2]
        );
        
        const p2 = new BABYLON.Vector3(
          positions[v2 * 3],
          positions[v2 * 3 + 1],
          positions[v2 * 3 + 2]
        );
        
        const p3 = new BABYLON.Vector3(
          positions[v3 * 3],
          positions[v3 * 3 + 1],
          positions[v3 * 3 + 2]
        );
        
        // Вычисляем длину рёбер треугольника
        const edge1Length = BABYLON.Vector3.Distance(p1, p2);
        const edge2Length = BABYLON.Vector3.Distance(p2, p3);
        const edge3Length = BABYLON.Vector3.Distance(p3, p1);
        
        totalEdgeLength += edge1Length + edge2Length + edge3Length;
        edgeCount += 3;
      }
      
      const avgEdgeLength = totalEdgeLength / edgeCount;
      
      // Определяем пороговые значения для слишком высокой и слишком низкой плотности
      const overSubdividedThreshold = avgEdgeLength * 0.5; // Рёбра в 2 раза короче среднего
      const underSubdividedThreshold = avgEdgeLength * 2.0; // Рёбра в 2 раза длиннее среднего
      
      // Подсчитываем количество рёбер с слишком высокой и слишком низкой плотностью
      let overSubdividedCount = 0;
      let underSubdividedCount = 0;
      
      for (let i = 0; i < indices.length; i += 3) {
        const v1 = indices[i];
        const v2 = indices[i + 1];
        const v3 = indices[i + 2];
        
        const p1 = new BABYLON.Vector3(
          positions[v1 * 3],
          positions[v1 * 3 + 1],
          positions[v1 * 3 + 2]
        );
        
        const p2 = new BABYLON.Vector3(
          positions[v2 * 3],
          positions[v2 * 3 + 1],
          positions[v2 * 3 + 2]
        );
        
        const p3 = new BABYLON.Vector3(
          positions[v3 * 3],
          positions[v3 * 3 + 1],
          positions[v3 * 3 + 2]
        );
        
        // Вычисляем длину рёбер треугольника
        const edge1Length = BABYLON.Vector3.Distance(p1, p2);
        const edge2Length = BABYLON.Vector3.Distance(p2, p3);
        const edge3Length = BABYLON.Vector3.Distance(p3, p1);
        
        // Проверяем каждое ребро
        if (edge1Length < overSubdividedThreshold) overSubdividedCount++;
        if (edge2Length < overSubdividedThreshold) overSubdividedCount++;
        if (edge3Length < overSubdividedThreshold) overSubdividedCount++;
        
        if (edge1Length > underSubdividedThreshold) underSubdividedCount++;
        if (edge2Length > underSubdividedThreshold) underSubdividedCount++;
        if (edge3Length > underSubdividedThreshold) underSubdividedCount++;
      }
      
      return {
        overSubdivided: overSubdividedCount,
        underSubdivided: underSubdividedCount
      };
    } catch (error) {
      console.error("Ошибка при анализе плотности сетки:", error);
      return { overSubdivided: 0, underSubdivided: 0 };
    }
  }

  combineAnalysisResults(basicAnalysis, topologyAnalysis) {
    if (!topologyAnalysis) {
      return basicAnalysis;
    }
    
    // Извлекаем HTML из базового анализа
    const basicAnalysisHTML = basicAnalysis;
    
    // Создаем HTML для расширенного анализа
    const advancedAnalysisHTML = `
      <div class="advanced-analysis">
        <h4>Расширенный анализ</h4>
        
        <div class="analysis-section">
          <h5>Топология модели</h5>
          <div class="analysis-item ${topologyAnalysis.isWatertight ? 'good' : 'warning'}">
            <span class="analysis-label">Замкнутость модели:</span>
            <span class="analysis-value">${topologyAnalysis.isWatertight ? 'Замкнута' : 'Не замкнута'}</span>
          </div>
          <div class="analysis-item ${topologyAnalysis.hasInvertedNormals ? 'warning' : 'good'}">
            <span class="analysis-label">Нормали:</span>
            <span class="analysis-value">${topologyAnalysis.hasInvertedNormals ? 'Есть инвертированные' : 'Корректные'}</span>
          </div>
          <div class="analysis-item ${topologyAnalysis.nonManifoldEdges > 0 ? 'warning' : 'good'}">
            <span class="analysis-label">Не-манифольдные рёбра:</span>
            <span class="analysis-value">${topologyAnalysis.nonManifoldEdges}</span>
          </div>
          <div class="analysis-item ${topologyAnalysis.floatingVertices > 0 ? 'warning' : 'good'}">
            <span class="analysis-label">Плавающие вершины:</span>
            <span class="analysis-value">${topologyAnalysis.floatingVertices}</span>
          </div>
        </div>
        
        <div class="analysis-section">
          <h5>Плотность сетки</h5>
          <div class="analysis-item ${topologyAnalysis.meshDensity.overSubdivided > 0 ? 'warning' : 'good'}">
            <span class="analysis-label">Слишком плотные участки:</span>
            <span class="analysis-value">${topologyAnalysis.meshDensity.overSubdivided}</span>
          </div>
          <div class="analysis-item ${topologyAnalysis.meshDensity.underSubdivided > 0 ? 'warning' : 'good'}">
            <span class="analysis-label">Участки с низкой детализацией:</span>
            <span class="analysis-value">${topologyAnalysis.meshDensity.underSubdivided}</span>
          </div>
        </div>
      </div>
    `;
    
    // Объединяем HTML
    return `
      ${basicAnalysisHTML}
      <hr class="analysis-separator">
      ${advancedAnalysisHTML}
    `;
  }

  toggleAllMeshes() {
    this.showAllMeshes = !this.showAllMeshes;
    const showAllButton = document.getElementById('showAllMeshes');
    const meshItems = document.querySelectorAll('.mesh-analysis');
    const hiddenMeshes = document.querySelectorAll('.mesh-analysis.hidden');
    
    if (this.showAllMeshes) {
      // Показать все меши
      hiddenMeshes.forEach(mesh => {
        mesh.classList.remove('hidden');
      });
      showAllButton.textContent = 'Показать меньше мешей';
    } else {
      // Скрыть лишние меши
      meshItems.forEach((mesh, index) => {
        if (index >= 5) {
          mesh.classList.add('hidden');
        }
      });
      showAllButton.textContent = 'Показать все меши';
    }
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

  analyzeScene(scene) {
    try {
      let totalMeshes = 0;
      let totalVertices = 0;
      let totalIndices = 0;
      let analysisDetails = '';

      scene.meshes.forEach(mesh => {
        if (!mesh.isEnabled()) return;

        const vertices = mesh.getTotalVertices?.() || 0;
        const indices = mesh.getIndices?.() || [];
        
        totalMeshes++;
        totalVertices += vertices;
        totalIndices += indices.length;

        // Добавляем класс hidden для мешей после первых 5
        const hiddenClass = totalMeshes > 5 ? ' hidden' : '';
        
        analysisDetails += `
          <div class="mesh-analysis${hiddenClass}">
            <strong>${mesh.name}</strong>
            <div class="mesh-stats">
              <p><span class="stat-label">Вершин:</span> <span class="stat-value">${vertices.toLocaleString()}</span></p>
              <p><span class="stat-label">Индексов:</span> <span class="stat-value">${indices.length.toLocaleString()}</span></p>
            </div>
          </div>`;
      });

      // Добавляем кнопку "Показать все меши" только если мешей больше 5
      const showAllButton = totalMeshes > 5 ? 
        `<button id="showAllMeshes" class="show-all-button">Показать все меши</button>` : '';

      return `
        <div class="analysis-summary">
          <div class="summary-item">
            <span class="summary-label">Всего мешей:</span>
            <span class="summary-value">${totalMeshes.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Всего вершин:</span>
            <span class="summary-value">${totalVertices.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Всего индексов:</span>
            <span class="summary-value">${totalIndices.toLocaleString()}</span>
          </div>
        </div>
        <div class="analysis-details">
          <h4>Детальный анализ мешей</h4>
          ${analysisDetails}
          ${showAllButton}
        </div>`;
    } catch(e) {
      console.error(e);
      return `<p class="error">Ошибка анализа: ${e.message}</p>`;
    }
  }
} 