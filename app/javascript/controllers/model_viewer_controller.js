import { Controller } from "@hotwired/stimulus"
import { ModelEmbed } from "../components/model_embed"
import { ModelAnalyzer } from "../components/model_analyzer"

export default class extends Controller {
  connect() {
    this.initializeComponents()
  }

  initializeComponents() {
    new ModelEmbed()
    new ModelAnalyzer()
  }
} 