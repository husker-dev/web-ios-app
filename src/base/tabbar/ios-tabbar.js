

class IOSTabbar extends HTMLElement {

	connectedCallback(){
		this.classList.add("i-material-chrome");
	}

	bindApp(app){
		var that = this;
		this.app = app;

		app.addEventListener("tab-created", e => {
			var item = document.createElement("i-tabbar-item");
			item.id = `tabbar_${e.detail.tab.id}`;
			item.tab = e.detail.tab;
			item.addEventListener("click", () => that.app.selectTab(item.tab.id));
			this.appendChild(item);
		});

		app.addEventListener("tab-selected", e => {
			that.selectedItem?.classList.remove("selected");
			that.selectedItem = this.querySelector("#tabbar_" + e.detail.tab.id);
			that.selectedItem.classList.add("selected");
		});
	}
}

class IOSTabbarItem extends HTMLElement {
	connectedCallback() {
		this.innerHTML = `
			<div id="tab-icon-container">
				<svg id="tabbar-loading-svg"></svg>
			</div>
			<div id="tab-title">${this.tab.name}</div>
	    `

	    loadSVG(this.tab.icon, src => {
	    	this.querySelector("#tabbar-loading-svg").replaceWith(createSVGElement(src));
	    });
	}
}

window.customElements.define('i-tabbar', IOSTabbar);
window.customElements.define('i-tabbar-item', IOSTabbarItem);