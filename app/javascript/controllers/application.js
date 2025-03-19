// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
//= require rails-ujs

import { Application } from "@hotwired/stimulus"
import Dropdown from 'stimulus-dropdown'

const application = Application.start()

application.register('dropdown', Dropdown)
application.debug = false
window.Stimulus   = application

export { application }
