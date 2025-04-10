export class ModelAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.currentEngine = null;
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.analysisButton = document.getElementById('runAnalysis');
    this.analysisResultsElem = document.getElementById('analysisResults');
  }

  bindEvents() {
    this.analysisButton?.addEventListener('click', () => this.runAnalysis());
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

  async runAnalysis() {
    if (!this.analysisButton?.dataset.modelUrl) return;

    this.analysisResultsElem.innerHTML = "Анализ...";
    this.analysisButton.disabled = true;

    try {
      const scene = await this.loadScene(this.analysisButton.dataset.modelUrl);
      const html = this.analyzeScene(scene);
      this.analysisResultsElem.innerHTML = html;
    } catch (error) {
      console.error(error);
      this.analysisResultsElem.innerHTML = `<p class="error">Ошибка анализа: ${error.message}</p>`;
    } finally {
      this.cleanup();
      this.analysisButton.disabled = false;
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

        analysisDetails += `
          <div class="mesh-analysis">
            <strong>${mesh.name}</strong>
            <p>Вершин: ${vertices}</p>
            <p>Индексов: ${indices.length}</p>
          </div>
          <hr>`;
      });

      return `
        <p>Мешей: ${totalMeshes}</p>
        <p>Вершин: ${totalVertices}</p>
        <p>Индексов: ${totalIndices}</p>
        <hr>${analysisDetails}`;
    } catch(e) {
      console.error(e);
      return `<p class="error">Ошибка анализа: ${e.message}</p>`;
    }
  }
} 