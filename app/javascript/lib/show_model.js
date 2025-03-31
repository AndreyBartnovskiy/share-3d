import * as THREE from "three";
import { OBJLoader } from "OBJLoader";
import { OrbitControls } from "OrbitControls";

document.addEventListener("turbo:load", () => {
  const container = document.getElementById("three-container");
  if (!container) return;

  const objUrl = container.dataset.objUrl;
  if (!objUrl) {
    console.error("URL OBJ-модели не найден в data-атрибуте контейнера");
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.set(0, 1, 3);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 0).normalize();
  scene.add(directionalLight);

  const loader = new OBJLoader();
  loader.load(
    objUrl,
    (object) => {
      object.position.set(0, 0, 0);
      scene.add(object);
    },
    (xhr) => {
      console.log(`Модель загружается: ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
    },
    (error) => {
      console.error("Ошибка загрузки OBJ-модели:", error);
    }
  );



  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
  });
});
