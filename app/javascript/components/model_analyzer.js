export class ModelAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.currentEngine = null;
    this.analysisVisible = false;
    this.advancedAnalysisVisible = false;
    this.showAllMeshes = false;
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.basicAnalysisButton = document.getElementById('runBasicAnalysis');
    this.advancedAnalysisButton = document.getElementById('runAdvancedAnalysis');
    this.analysisResultsElem = document.getElementById('analysisResults');
    this.advancedAnalysisResultsElem = document.getElementById('advancedAnalysisResults');
  }

  bindEvents() {
    this.basicAnalysisButton?.addEventListener('click', () => this.toggleBasicAnalysis());
    this.advancedAnalysisButton?.addEventListener('click', () => this.toggleAdvancedAnalysis());
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

  toggleBasicAnalysis() {
    if (this.analysisVisible) {
      // Скрыть базовый анализ
      this.analysisResultsElem.classList.remove('visible');
      setTimeout(() => {
        this.analysisResultsElem.innerHTML = '';
        this.analysisResultsElem.classList.add('hidden');
      }, 300);
      this.basicAnalysisButton.innerHTML = '<span class="button-icon">📊</span> Статистика полигональной сетки';
      this.analysisVisible = false;
    } else {
      // Показать базовый анализ
      this.runBasicAnalysis();
    }
  }

  toggleAdvancedAnalysis() {
    if (this.advancedAnalysisVisible) {
      // Скрыть расширенный анализ
      this.advancedAnalysisResultsElem.classList.remove('visible');
      setTimeout(() => {
        this.advancedAnalysisResultsElem.innerHTML = '';
        this.advancedAnalysisResultsElem.classList.add('hidden');
      }, 300);
      this.advancedAnalysisButton.innerHTML = '<span class="button-icon">⚡</span> Оценка корректности топологии';
      this.advancedAnalysisVisible = false;
    } else {
      // Показать расширенный анализ
      this.runAdvancedAnalysis();
    }
  }

  async runBasicAnalysis() {
    if (!this.basicAnalysisButton?.dataset.modelUrl) return;

    this.analysisResultsElem.classList.remove('hidden');
    this.analysisResultsElem.innerHTML = "<div class='loading'>Анализ полигональной сетки</div>";
    this.basicAnalysisButton.disabled = true;

    try {
      const modelUrl = this.basicAnalysisButton.dataset.modelUrl;
      const scene = await this.loadScene(modelUrl);
      const basicAnalysis = this.analyzeScene(scene);
      
      this.analysisResultsElem.innerHTML = basicAnalysis;
      this.analysisResultsElem.classList.add('visible');
      
      this.basicAnalysisButton.innerHTML = '<span class="button-icon">📊</span> Скрыть статистику';
      this.basicAnalysisButton.disabled = false;
      this.analysisVisible = true;
      
      const showAllButton = document.getElementById('showAllMeshes');
      if (showAllButton) {
        showAllButton.addEventListener('click', () => this.toggleAllMeshes());
      }
    } catch (error) {
      console.error(error);
      this.analysisResultsElem.innerHTML = `<p class="error">Ошибка анализа: ${error.message}</p>`;
      this.basicAnalysisButton.innerHTML = '<span class="button-icon">📊</span> Статистика полигональной сетки';
      this.basicAnalysisButton.disabled = false;
    } finally {
      this.cleanup();
    }
  }

  async runAdvancedAnalysis() {
    if (!this.advancedAnalysisButton?.dataset.modelUrl) return;

    this.advancedAnalysisResultsElem.classList.remove('hidden');
    this.advancedAnalysisResultsElem.innerHTML = "<div class='loading'>Оценка топологии</div>";
    this.advancedAnalysisButton.disabled = true;

    try {
      const modelUrl = this.advancedAnalysisButton.dataset.modelUrl;
      const scene = await this.loadScene(modelUrl);
      const topologyAnalysis = this.analyzeTopology(scene);
      
      this.advancedAnalysisResultsElem.innerHTML = this.formatAdvancedAnalysisResults(topologyAnalysis);
      this.bindTooltipEvents();
      this.advancedAnalysisResultsElem.classList.add('visible');
      
      this.advancedAnalysisButton.innerHTML = '<span class="button-icon">⚡</span> Скрыть оценку';
      this.advancedAnalysisButton.disabled = false;
      this.advancedAnalysisVisible = true;
    } catch (error) {
      console.error(error);
      this.advancedAnalysisResultsElem.innerHTML = `<p class="error">Ошибка анализа: ${error.message}</p>`;
      this.advancedAnalysisButton.innerHTML = '<span class="button-icon">⚡</span> Оценка корректности топологии';
      this.advancedAnalysisButton.disabled = false;
    } finally {
      this.cleanup();
    }
  }

  formatAdvancedAnalysisResults(topologyAnalysis) {
    if (!topologyAnalysis) {
      return '<p class="error">Не удалось выполнить расширенный анализ</p>';
    }

    const tooltips = {
      watertight: {
        title: 'Замкнутость модели',
        description: 'Проверяет, является ли модель "водонепроницаемой". В замкнутой модели каждое ребро должно принадлежать ровно двум граням. Это важно для 3D-печати и корректного рендеринга.',
        recommendation: 'Если модель не замкнута, это может вызвать проблемы при печати или текстурировании. Рекомендуется исправить разрывы в сетке.'
      },
      normals: {
        title: 'Нормали',
        description: 'Нормали определяют направление "наружу" для каждой грани модели. Они важны для правильного освещения и текстурирования.',
        recommendation: 'Инвертированные нормали могут привести к неправильному отображению теней и текстур. Рекомендуется исправить направление нормалей.'
      },
      nonManifold: {
        title: 'Не-манифольдные рёбра',
        description: 'Это рёбра, к которым примыкает больше двух граней. В реальном мире такая геометрия невозможна, что может вызвать проблемы при 3D-печати.',
        recommendation: 'Наличие не-манифольдных рёбер может привести к ошибкам при печати. Рекомендуется упростить геометрию в этих местах.'
      },
      floatingVertices: {
        title: 'Плавающие вершины',
        description: 'Вершины, не связанные ни с одной гранью. Они не влияют на внешний вид модели, но увеличивают её размер.',
        recommendation: 'Рекомендуется удалить плавающие вершины для оптимизации модели.'
      },
      overSubdivided: {
        title: 'Слишком плотные участки',
        description: 'Области модели с избыточным количеством полигонов. Это увеличивает размер файла и время рендеринга без заметного улучшения качества. Математически: ребра, длина которых меньше 50% от средней длины ребра (L < 0.5 * L_средняя).',
        recommendation: 'Рекомендуется упростить эти участки для оптимизации производительности.'
      },
      underSubdivided: {
        title: 'Участки с низкой детализацией',
        description: 'Области с недостаточным количеством полигонов. Это может привести к угловатости и потере деталей. Математически: ребра, длина которых больше 200% от средней длины ребра (L > 2.0 * L_средняя).',
        recommendation: 'Рекомендуется увеличить детализацию этих участков для улучшения качества модели.'
      }
    };

    // Вычисляем общее количество ребер для расчета процентов
    // Используем общее количество ребер из результатов анализа
    const totalEdges = topologyAnalysis.totalEdges || 0;
    
    // Вычисляем проценты от общего количества ребер
    const overSubdividedPercent = totalEdges > 0 ? 
      (topologyAnalysis.meshDensity.overSubdivided / totalEdges * 100).toFixed(1) : 0;
    const underSubdividedPercent = totalEdges > 0 ? 
      (topologyAnalysis.meshDensity.underSubdivided / totalEdges * 100).toFixed(1) : 0;
    
    // Вычисляем количество нормальных ребер (не слишком плотных и не с низкой детализацией)
    const normalEdges = totalEdges - topologyAnalysis.meshDensity.overSubdivided - topologyAnalysis.meshDensity.underSubdivided;
    const normalEdgesPercent = totalEdges > 0 ? 
      (normalEdges / totalEdges * 100).toFixed(1) : 0;

    return `
      <div class="advanced-analysis">
        <h4>Оценка корректности топологии</h4>
        
        <div class="analysis-section">
          <h5>Топология модели</h5>
          <div class="analysis-item ${topologyAnalysis.isWatertight ? 'good' : 'warning'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Замкнутость модели:</span>
              <span class="info-icon" data-tooltip="watertight">i</span>
              <div class="info-tooltip" id="tooltip-watertight">
                <p><strong>${tooltips.watertight.title}</strong></p>
                <p>${tooltips.watertight.description}</p>
                <p>${tooltips.watertight.recommendation}</p>
              </div>
            </div>
            <span class="analysis-value">${topologyAnalysis.isWatertight ? 'Замкнута' : 'Не замкнута'}</span>
          </div>

          <div class="analysis-item ${topologyAnalysis.hasInvertedNormals ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Нормали:</span>
              <span class="info-icon" data-tooltip="normals">i</span>
              <div class="info-tooltip" id="tooltip-normals">
                <p><strong>${tooltips.normals.title}</strong></p>
                <p>${tooltips.normals.description}</p>
                <p>${tooltips.normals.recommendation}</p>
              </div>
            </div>
            <span class="analysis-value">${topologyAnalysis.hasInvertedNormals ? 'Есть инвертированные' : 'Корректные'}</span>
          </div>

          <div class="analysis-item ${topologyAnalysis.nonManifoldEdges > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Не-манифольдные рёбра:</span>
              <span class="info-icon" data-tooltip="nonManifold">i</span>
              <div class="info-tooltip" id="tooltip-nonManifold">
                <p><strong>${tooltips.nonManifold.title}</strong></p>
                <p>${tooltips.nonManifold.description}</p>
                <p>${tooltips.nonManifold.recommendation}</p>
              </div>
            </div>
            <span class="analysis-value">${topologyAnalysis.nonManifoldEdges}</span>
          </div>

          <div class="analysis-item ${topologyAnalysis.floatingVertices > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Плавающие вершины:</span>
              <span class="info-icon" data-tooltip="floatingVertices">i</span>
              <div class="info-tooltip" id="tooltip-floatingVertices">
                <p><strong>${tooltips.floatingVertices.title}</strong></p>
                <p>${tooltips.floatingVertices.description}</p>
                <p>${tooltips.floatingVertices.recommendation}</p>
              </div>
            </div>
            <span class="analysis-value">${topologyAnalysis.floatingVertices}</span>
          </div>
        </div>
        
        <div class="analysis-section">
          <h5>Плотность сетки</h5>
          <div class="analysis-item ${topologyAnalysis.meshDensity.overSubdivided > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Слишком плотные участки:</span>
              <span class="info-icon" data-tooltip="overSubdivided">i</span>
              <div class="info-tooltip" id="tooltip-overSubdivided">
                <p><strong>${tooltips.overSubdivided.title}</strong></p>
                <p>${tooltips.overSubdivided.description}</p>
                <p>${tooltips.overSubdivided.recommendation}</p>
              </div>
            </div>
            <span class="analysis-value">${overSubdividedPercent}% (${topologyAnalysis.meshDensity.overSubdivided} рёбер)</span>
          </div>

          <div class="analysis-item ${topologyAnalysis.meshDensity.underSubdivided > 0 ? 'warning' : 'good'}">
            <div class="analysis-label-group">
              <span class="analysis-label">Участки с низкой детализацией:</span>
              <span class="info-icon" data-tooltip="underSubdivided">i</span>
              <div class="info-tooltip" id="tooltip-underSubdivided">
                <p><strong>${tooltips.underSubdivided.title}</strong></p>
                <p>${tooltips.underSubdivided.description}</p>
                <p>${tooltips.underSubdivided.recommendation}</p>
              </div>
            </div>
            <span class="analysis-value">${underSubdividedPercent}% (${topologyAnalysis.meshDensity.underSubdivided} рёбер)</span>
          </div>
          
          <div class="analysis-item good">
            <div class="analysis-label-group">
              <span class="analysis-label">Корректная плотность:</span>
            </div>
            <span class="analysis-value">${normalEdgesPercent}% (${normalEdges} рёбер)</span>
          </div>
          
          <div class="analysis-item">
            <div class="analysis-label-group">
              <span class="analysis-label">Общее количество рёбер:</span>
            </div>
            <span class="analysis-value">100% (${totalEdges} рёбер)</span>
          </div>
        </div>
      </div>
    `;
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

  analyzeTopology(scene) {
    try {
      // Инициализируем результаты анализа топологии
      const topologyResults = {
        isWatertight: true,
        hasInvertedNormals: false,
        nonManifoldEdges: 0,
        floatingVertices: 0,
        totalEdges: 0,
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
        
        // Добавляем общее количество ребер из анализа плотности
        topologyResults.totalEdges += densityAnalysis.totalEdges || 0;
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
        return { overSubdivided: 0, underSubdivided: 0, totalEdges: 0 };
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
        underSubdivided: underSubdividedCount,
        totalEdges: edgeCount
      };
    } catch (error) {
      console.error("Ошибка при анализе плотности сетки:", error);
      return { overSubdivided: 0, underSubdivided: 0, totalEdges: 0 };
    }
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
      let totalTriangles = 0;
      let totalVolume = 0;
      let totalArea = 0;
      let analysisDetails = '';

      scene.meshes.forEach(mesh => {
        if (!mesh.isEnabled()) return;

        const vertices = mesh.getTotalVertices?.() || 0;
        const indices = mesh.getIndices?.() || [];
        const triangles = indices.length / 3;
        
        // Вычисляем bounding box и его характеристики
        const boundingInfo = mesh.getBoundingInfo();
        const boundingBox = boundingInfo.boundingBox;
        
        // Обновляем bounding box
        mesh.computeWorldMatrix(true);
        boundingBox.minimumWorld = boundingBox.minimum;
        boundingBox.maximumWorld = boundingBox.maximum;
        
        const min = boundingBox.minimumWorld;
        const max = boundingBox.maximumWorld;
        
        // Добавляем отладочную информацию
        console.log(`Mesh: ${mesh.name}`);
        console.log('Min:', min);
        console.log('Max:', max);
        
        // Вычисляем реальный объем bounding box
        const volume = Math.abs((max.x - min.x) * (max.y - min.y) * (max.z - min.z));
        console.log('Volume:', volume);
        
        // Вычисляем площадь поверхности bounding box
        const area = 2 * (
          Math.abs((max.x - min.x) * (max.y - min.y)) + // XY плоскости
          Math.abs((max.y - min.y) * (max.z - min.z)) + // YZ плоскости
          Math.abs((max.x - min.x) * (max.z - min.z))   // XZ плоскости
        );
        
        totalMeshes++;
        totalVertices += vertices;
        totalIndices += indices.length;
        totalTriangles += triangles;
        totalVolume += volume;
        totalArea += area;

        // Добавляем класс hidden для мешей после первых 5
        const hiddenClass = totalMeshes > 5 ? ' hidden' : '';
        
        // Форматируем значения с проверкой на NaN и Infinity
        const formatValue = (value, unit = '') => {
          if (isNaN(value) || !isFinite(value)) {
            return '<span class="error-value">Некорректное значение</span>';
          }
          if (value === 0 || value < 0.000001) {
            return `<span class="warning-value">0.00${unit}</span>`;
          }
          return `${value.toFixed(2)}${unit}`;
        };
        
        // Проверяем, является ли меш плоским или имеет нулевую толщину
        const isFlatMesh = (max.x - min.x) < 0.001 || (max.y - min.y) < 0.001 || (max.z - min.z) < 0.001;
        const hasZeroVolume = volume < 0.000001;
        const volumeClass = (isFlatMesh || hasZeroVolume) ? 'warning-value' : '';
        const volumeNote = isFlatMesh ? 
          '<span class="stat-note">(плоский объект)</span>' : 
          (hasZeroVolume ? '<span class="stat-note">(нулевой объем)</span>' : '');
        
        analysisDetails += `
          <div class="mesh-analysis${hiddenClass}">
            <div class="mesh-header">
              <strong>${mesh.name}</strong>
              <span class="mesh-stats-summary">
                ${vertices.toLocaleString()} вершин | ${triangles.toLocaleString()} треугольников
              </span>
            </div>
            <div class="mesh-stats">
              <div class="stat-row">
                <span class="stat-label">Плотность вершин:</span>
                <span class="stat-value">${formatValue(vertices / area, ' вершин/м²')}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Плотность треугольников:</span>
                <span class="stat-value">${formatValue(triangles / area, ' треугольников/м²')}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Объём:</span>
                <span class="stat-value ${volumeClass}">${formatValue(volume / 1000000, ' м³')}</span>
                ${volumeNote}
              </div>
            </div>
          </div>`;
      });

      // Вычисляем средние значения
      const avgVerticesPerMesh = totalMeshes > 0 ? totalVertices / totalMeshes : 0;
      const avgTrianglesPerMesh = totalMeshes > 0 ? totalTriangles / totalMeshes : 0;
      
      // Используем площадь вместо объема для расчета плотности, так как она более стабильна
      const avgVerticesDensity = totalArea > 0 ? totalVertices / totalArea : 0;
      const avgTrianglesDensity = totalArea > 0 ? totalTriangles / totalArea : 0;

      // Добавляем кнопку "Показать все меши" только если мешей больше 5
      const showAllButton = totalMeshes > 5 ? 
        `<button id="showAllMeshes" class="show-all-button">Показать все меши</button>` : '';

      // Добавляем пояснение о расчете объема
      const volumeNote = `
        <div class="analysis-note">
          <p><strong>Примечание:</strong> Объем модели рассчитывается как сумма объемов bounding box каждого меша. 
          Это приближенное значение, которое может не учитывать перекрытия мешей и внутренние пустоты. 
          Для плоских объектов (2D) или объектов с нулевым объемом (например, линии или точки) объем может быть близок к нулю.</p>
        </div>
      `;

      return `
        <div class="analysis-summary">
          <div class="summary-item">
            <div class="summary-icon">📦</div>
            <span class="summary-label">Всего мешей:</span>
            <span class="summary-value">${totalMeshes.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <div class="summary-icon">⚪</div>
            <span class="summary-label">Всего вершин:</span>
            <span class="summary-value">${totalVertices.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <div class="summary-icon">🔢</div>
            <span class="summary-label">Всего индексов:</span>
            <span class="summary-value">${totalIndices.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <div class="summary-icon">🔺</div>
            <span class="summary-label">Всего треугольников:</span>
            <span class="summary-value">${totalTriangles.toLocaleString()}</span>
          </div>
          <div class="summary-item">
            <div class="summary-icon">📊</div>
            <span class="summary-label">Среднее число вершин на меш:</span>
            <span class="summary-value">${avgVerticesPerMesh.toFixed(2)}</span>
          </div>
          <div class="summary-item">
            <div class="summary-icon">📈</div>
            <span class="summary-label">Среднее число треугольников на меш:</span>
            <span class="summary-value">${avgTrianglesPerMesh.toFixed(2)}</span>
          </div>
          <div class="summary-item">
            <div class="summary-icon">🎯</div>
            <span class="summary-label">Плотность вершин на единицу площади:</span>
            <span class="summary-value">${(avgVerticesDensity * 1000).toFixed(2)} вершин/м²</span>
          </div>
          <div class="summary-item">
            <div class="summary-icon">🎲</div>
            <span class="summary-label">Плотность треугольников на единицу площади:</span>
            <span class="summary-value">${(avgTrianglesDensity * 1000).toFixed(2)} треугольников/м²</span>
          </div>
          <div class="summary-item">
            <div class="summary-icon">📦</div>
            <span class="summary-label">Объём модели:</span>
            <span class="summary-value">${(totalVolume / 1000000).toFixed(2)} м³</span>
          </div>
        </div>
        <div class="analysis-details">
          <h4>Детальный анализ мешей</h4>
          ${analysisDetails}
          ${showAllButton}
        </div>
        <div class="analysis-footer">
          ${volumeNote}
        </div>`;
    } catch(e) {
      console.error(e);
      return `<p class="error">Ошибка анализа: ${e.message}</p>`;
    }
  }
} 