// stimulus-dropdown@2.1.0 downloaded from https://ga.jspm.io/npm:stimulus-dropdown@2.1.0/dist/stimulus-dropdown.mjs

import{Controller as t}from"@hotwired/stimulus";import{useTransition as e}from"stimulus-use";class i extends t{connect(){e(this,{element:this.menuTarget})}toggle(){this.toggleTransition()}hide(t){!this.element.contains(t.target)&&!this.menuTarget.classList.contains("hidden")&&this.leave()}}i.targets=["menu"];export{i as default};

