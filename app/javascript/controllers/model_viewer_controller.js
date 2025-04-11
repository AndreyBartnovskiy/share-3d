import { Controller } from "@hotwired/stimulus"
import { ModelEmbed } from "../components/model_embed"
import { ModelAnalyzer } from "../components/model_analyzer"
import { ModelArtifactAnalyzer } from "../components/model_artifact_analyzer"

export default class extends Controller {
  static targets = ['canvas', 'modelUrl', 'loading', 'error', 'stats', 'topology', 'artifacts'];

  connect() {
    this.initializeBabylon();
    this.initializeComponents();
  }

  initializeBabylon() {
    // Инициализация Babylon.js происходит автоматически через babylon-viewer
    // в HTML-разметке, поэтому здесь ничего не нужно делать
  }

  initializeComponents() {
    new ModelEmbed()
    this.modelAnalyzer = new ModelAnalyzer()
    this.artifactAnalyzer = new ModelArtifactAnalyzer()
  }
} 