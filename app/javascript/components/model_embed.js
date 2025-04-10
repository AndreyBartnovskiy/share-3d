export class ModelEmbed {
  constructor() {
    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    this.openButton = document.getElementById("openAdvancedEmbed");
    this.overlay = document.getElementById("overlay");
    this.closeButton = document.getElementById("closeModal");
    this.widthInput = document.getElementById("widthInput");
    this.heightInput = document.getElementById("heightInput");
    this.darkThemeCheckbox = document.getElementById("darkThemeCheckbox");
    this.autoRotateCheckbox = document.getElementById("autoRotateCheckbox");
    this.autoStartCheckbox = document.getElementById("autoStartCheckbox");
    this.embedCodeTextarea = document.getElementById("embedCode");
    this.copyButton = document.getElementById("copyEmbedCode");
  }

  bindEvents() {
    this.openButton?.addEventListener("click", () => this.openModal());
    this.closeButton?.addEventListener("click", () => this.closeModal());
    this.copyButton?.addEventListener("click", () => this.copyEmbedCode());

    [
      this.widthInput,
      this.heightInput,
      this.darkThemeCheckbox,
      this.autoRotateCheckbox,
      this.autoStartCheckbox
    ].forEach(el => {
      el?.addEventListener("change", () => this.generateEmbedCode());
      el?.addEventListener("keyup", () => this.generateEmbedCode());
    });
  }

  openModal() {
    this.overlay.style.display = "block";
    this.generateEmbedCode();
    const miniViewer = document.getElementById("miniViewer");
    if (miniViewer && miniViewer.dataset.modelUrl) {
      miniViewer.setAttribute("source", miniViewer.dataset.modelUrl);
    }
  }

  closeModal() {
    this.overlay.style.display = "none";
  }

  generateEmbedCode() {
    const widthVal = this.widthInput?.value || "640";
    const heightVal = this.heightInput?.value || "480";
    const isDarkTheme = this.darkThemeCheckbox?.checked;
    const isAutoRotate = this.autoRotateCheckbox?.checked;
    const isAutoStart = this.autoStartCheckbox?.checked;

    if (!this.embedCodeTextarea || !this.embedCodeTextarea.dataset.embedUrl) return;

    const embedUrl = `${this.embedCodeTextarea.dataset.embedUrl}?darkTheme=${isDarkTheme}&autoRotate=${isAutoRotate}&autoStart=${isAutoStart}`;
    const modelName = this.embedCodeTextarea.dataset.modelName || "3D модель";

    const embedHTML = `
<iframe
  title="${modelName}"
  width="${widthVal}" height="${heightVal}"
  frameborder="0"
  allowfullscreen mozallowfullscreen="true" webkitallowfullscreen="true"
  src="${embedUrl}">
</iframe>
<p style="font-size: 13px; font-weight: normal; margin: 5px;">
  <a href="${embedUrl}" target="_blank" rel="nofollow">Просмотреть 3D модель</a> на Share3D
</p>`.trim();

    this.embedCodeTextarea.value = embedHTML;
  }

  copyEmbedCode() {
    navigator.clipboard.writeText(this.embedCodeTextarea.value)
      .then(() => {
        alert("Код успешно скопирован!");
      })
      .catch(err => {
        console.error("Не удалось скопировать:", err);
      });
  }
} 