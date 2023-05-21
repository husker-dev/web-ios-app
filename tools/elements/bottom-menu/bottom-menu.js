

class Menu extends HTMLElement {

	selectMenu(id){
		this.querySelector("#menu_" + this.selected_menu)?.classList.remove("selected");
		this.querySelector("#menu_" + id)?.classList.add("selected");
		this.selected_menu = id;
			
		window[this.callback](this.menus[id]);
	}

	connectedCallback() {
		let that = this;

		this.selectedMenu = "";
		this.callback = this.getAttribute("onMenuSelect");
		this.menus = new Object();

		var request = new XMLHttpRequest();
		request.open('GET', this.getAttribute('src'));
		request.send(null);
		request.onreadystatechange = function() {
			if(request.readyState === 4 && request.status === 200) {
				var response = JSON.parse(request.responseText);
				
				response.menus.forEach(element => {
					that.menus[element.id] = element;
					that.innerHTML += `
					<div id="menu_${element.id}" class="button">
						<svg-loader src="${element.icon}"></svg-loader>
						<div>${element.text}</div>
					</div>
					`
				});
				response.menus.forEach(element => {
					var menuElement = that.querySelector("#menu_" + element.id);
					menuElement.addEventListener("click", () => that.selectMenu(element.id));
					if(element.selected)
						that.selectMenu(element.id);
				});
			}
		}
	}
}

window.customElements.define('bottom-menu', Menu);