

class Menu extends HTMLElement {

	selectTab(id){
		this.querySelector("#menutab_" + this.selectedTab)?.classList.remove("selected");
		this.querySelector("#menutab_" + id)?.classList.add("selected");
		this.selectedTab = id;
			
		this.onTabSelect(this.tabs[id]);
	}

	connectedCallback() {
		let that = this;

		this.selectedTab = "";
		if(this.hasAttribute("onTabSelect"))
			this.onTabSelect = window[this.getAttribute("onTabSelect")];
		this.tabs = new Object();

		var request = new XMLHttpRequest();
		request.open('GET', this.getAttribute('src'));
		request.send(null);
		request.onreadystatechange = function() {
			if(request.readyState === 4 && request.status === 200) {
				var response = JSON.parse(request.responseText);
				
				response.tabs.forEach(element => {
					that.tabs[element.id] = element;
					that.innerHTML += `
					<div id="menutab_${element.id}" class="button">
						<svg-loader src="${element.icon}"></svg-loader>
						<div>${element.text}</div>
					</div>
					`
				});
				response.tabs.forEach(element => {
					var tabElement = that.querySelector("#menutab_" + element.id);
					tabElement.addEventListener("click", () => that.selectTab(element.id));
					if(element.selected)
						that.selectTab(element.id);
				});
			}
		}
	}
}

window.customElements.define('bottom-menu', Menu);