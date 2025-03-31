import * as THREE from "three";
import { OBJLoader } from "OBJLoader";

document.addEventListener("turbo:load", () => {
  document.querySelectorAll(".three-preview").forEach(container => {
    const objUrl = container.dataset.objUrl;
    if (!objUrl) return;

    // Создаём сцену
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Добавляем свет
    const light = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(light);

    // Загружаем модель
    const loader = new OBJLoader();
    loader.load(objUrl, obj => {
      obj.scale.set(1, 1, 1);
      scene.add(obj);
    });

    // Анимация вращения
    function animate() {
      requestAnimationFrame(animate);
      scene.rotation.y += 0.005;
      renderer.render(scene, camera);
    }
    animate();
  });
});
