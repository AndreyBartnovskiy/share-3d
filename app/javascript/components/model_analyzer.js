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
      const scene = await this.loadScene(this.analysisButton.dataset.modelUrl);
      const html = this.analyzeScene(scene);
      this.analysisResultsElem.innerHTML = html;
      
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