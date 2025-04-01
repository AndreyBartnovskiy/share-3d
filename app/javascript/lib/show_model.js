document.addEventListener("turbo:load", () => {
  const container = document.getElementById("model-container");
  if (!container) return;

  const modelUrl = container.dataset.modelUrl;
  if (!modelUrl) {
    console.error("URL модели не найден в data-атрибуте контейнера");
    return;
  }

  // Инициализация движка
  const canvas = document.createElement("canvas");
  canvas.className = "w-full h-full touch-action-none";
  container.appendChild(canvas);
  
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);

  // Настройка камеры (лучше подходит для 3D просмотра)
  const camera = new BABYLON.ArcRotateCamera(
    "Camera",
    -Math.PI / 2,
    Math.PI / 2.5,
    5,
    BABYLON.Vector3.Zero(),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 20;
  camera.wheelDeltaPercentage = 0.01;

  // Освещение
  new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);

  // Загрузка модели
  BABYLON.SceneLoader.ImportMesh(
    "",
    "",
    modelUrl,
    scene,
    (meshes) => {
      // Автоматически подбираем масштаб и позицию камеры
      scene.createDefaultCameraOrLight(true, true, true);
      
      // Опционально: включить инспектор для отладки
      // scene.debugLayer.show();
    },
    (progress) => {
      console.log(`Загрузка: ${(progress.loaded / progress.total * 100).toFixed(0)}%`);
    },
    (error) => {
      console.error("Ошибка загрузки модели:", error);
    }
  );

  // Обработка изменения размера
  window.addEventListener("resize", () => {
    engine.resize();
  });

  // Рендер-луп
  engine.runRenderLoop(() => {
    scene.render();
  });
});