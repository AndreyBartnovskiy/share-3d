import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["dropzone", "input", "filename"]

  connect() {
    // Обновляем имя файла, если оно изменилось через стандартный диалог выбора
    this.inputTarget.addEventListener("change", () => {
      this.updateFilename()
    })
  }

  browse(event) {
    event.preventDefault()  // предотвращаем стандартное поведение клика
    this.inputTarget.click()
  }

  handleDragOver(event) {
    event.preventDefault()  // обязательно, чтобы не открывался файл в браузере
    this.dropzoneTarget.classList.add("border-blue-400", "bg-blue-50")
  }

  handleDragLeave(event) {
    event.preventDefault()
    this.dropzoneTarget.classList.remove("border-blue-400", "bg-blue-50")
  }

  handleDrop(event) {
    event.preventDefault()  // предотвращаем открытие файла в новой вкладке
    this.dropzoneTarget.classList.remove("border-blue-400", "bg-blue-50")

    if (event.dataTransfer && event.dataTransfer.files.length) {
      // Записываем выбранные файлы в скрытый input
      this.inputTarget.files = event.dataTransfer.files
      this.updateFilename()
    }
  }

  updateFilename() {
    if (this.inputTarget.files.length > 0) {
      this.filenameTarget.textContent = this.inputTarget.files[0].name
    } else {
      this.filenameTarget.textContent = "Файл не выбран"
    }
  }
}
