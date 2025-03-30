import { Application } from "@hotwired/stimulus"
import Dropdown from 'stimulus-dropdown'

const application = Application.start()
application.register('dropdown', Dropdown)

export { application }