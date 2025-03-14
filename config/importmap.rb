# Pin npm packages by running ./bin/importmap

pin_all_from "app/javascript/lib", under: "lib"

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "@hotwired--stimulus.js" # @3.2.2
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "stimulus-dropdown" # @2.1.0
pin "hotkeys-js" # @3.13.9
pin "stimulus-use" # @0.51.3
