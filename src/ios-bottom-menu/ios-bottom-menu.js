

class IOSBottomMenu extends HTMLElement {

	bindApp(app){
		var that = this;
		this.app = app;

		app.addEventListener("tab-created", e => {
			var tab = document.createElement("ios-bottom-menu-item");
			tab.id = `menutab_${e.detail.tab.manifest.id}`;
			tab.manifest = e.detail.tab.manifest;
			tab.addEventListener("click", () => that.app.showTab(tab.manifest.id));
			this.appendChild(tab);
		});

		app.addEventListener("tab-selected", e => {
			that.selectedTab?.classList.remove("selected");
			that.selectedTab = this.querySelector("#menutab_" + e.detail.tab.manifest.id);
			that.selectedTab.classList.add("selected");
		});
	}
}

class IOSBottomMenuItem extends HTMLElement {
	connectedCallback() {
		this.innerHTML = `
			<svg-loader src="${this.manifest.icon}"></svg-loader>
			<div>${this.manifest.text}</div>
	    `
	}
}

window.customElements.define('ios-bottom-menu', IOSBottomMenu);
window.customElements.define('ios-bottom-menu-item', IOSBottomMenuItem);