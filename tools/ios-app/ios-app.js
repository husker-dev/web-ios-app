
class IOSApp extends HTMLElement {

	connectedCallback() {
		this.innerHTML = `
			<top-menu id="topmenu" class="blurred"></top-menu>
			<bottom-menu id="menu" src="${this.getAttribute("manifest")}" class="blurred"></bottom-menu>
		`;
		var that = this;
		this.topMenu = this.querySelector("#topmenu");
		this.bottomMenu = this.querySelector("#menu");

		new ResizeObserver(() => {
			that.getBoundingClientRect().right >= 600 ? 
				that.classList.add("large-screen") : 
				that.classList.remove("large-screen");
		}).observe(this);

		this.bottomMenu.onTabSelect = (tab) => that.selectTab(tab);
		this.topMenu.app = this;
	}

	selectTab(tab) {
		this.selectedTab = tab;
		var tabElement = this.querySelector(`#tab_${tab.id.replaceAll("/", "-")}`);
		
		if(tabElement === null){
			tabElement = document.createElement("ios-tab");
			tabElement.id = `tab_${tab.id.replaceAll("/", "-")}`;
			this.appendChild(tabElement);

			this.showTabElement(tabElement);
			this.showNewPage(tab.page);
		} else this.showTabElement(tabElement);
	}

	showNewPage(page){
		var that = this;
		var tab = this.selectedTabElement;

		fetch(`${page}.pagemanifest`).then(d => d.json())
		.then(manifest => {
			var pageElement = document.createElement("ios-page");
			pageElement.id = `page_${page.replaceAll("/", "-")}`;
			pageElement.manifest = manifest;
			
			tab.appendChild(pageElement);
			pageElement.tab = tab;
			that.showPageElement(tab, pageElement);
			that.bindPageGestures(tab, pageElement);

			fetch(`${page}.html`).then(d => d.text())
			.then(content => {
				pageElement.querySelector("#page-content").innerHTML = content;
			});
		});
		
	}

	bindPageGestures(tab, pageElement){
		if(pageElement.prevPage === undefined)
			return;
		var that = this;
		pageElement.addEventListener("touchstart", (e) => {
			if(e.touches.length == 1 && e.touches[0].clientX < 25){
				e.preventDefault();
				pageElement.pageAnim = true;
				pageElement.pageAnimPercent = 0;
				pageElement.pageAnimStart = e.touches[0].clientX;

				(function aninLoop () {
    				if(pageElement.pageAnim){
    					that.animateTransition(pageElement, 1 - pageElement.pageAnimPercent);
      					requestAnimationFrame(aninLoop);
      				}
  				}());
			}
		});
		pageElement.addEventListener("touchend", (e) => {
			if(pageElement.pageAnim){
				pageElement.pageAnim = false;

				var width = pageElement.getBoundingClientRect().right - pageElement.getBoundingClientRect().left;
				var percent = (e.changedTouches[0].clientX - pageElement.pageAnimStart) / width;

				if(percent > 0.5 || pageElement.pageAnimSpeed > 5){
					// Select previous page
					tab.selectedPage = pageElement.prevPage;

					this.animate((a) => this.animateTransition(pageElement, (1-percent) - (1-percent) * a), 400, bezier(0.2, 0.8, 0.2, 1));
					setTimeout(() => {
						tab.removeChild(pageElement);
					}, 400);
				}
				else
					this.animate((a) => this.animateTransition(pageElement, (1-percent) + percent * a), 600, bezier(0.2, 0.8, 0.2, 1));
			}
		});
		pageElement.addEventListener("touchmove", (e) => {
			if(pageElement.pageAnim && e.touches.length == 1){
				e.preventDefault();
				var width = pageElement.getBoundingClientRect().right - pageElement.getBoundingClientRect().left;
				var percent = (e.touches[0].clientX - pageElement.pageAnimStart) / width;

				pageElement.pageAnimSpeed = e.touches[0].clientX - pageElement.pageAnimLast;
				pageElement.pageAnimLast = e.touches[0].clientX;
				pageElement.pageAnimPercent = percent;
			}
		});
	}

	showTabElement(tabElement){
		if(this.selectedTabElement !== undefined)
			this.selectedTabElement.classList.remove("selected-tab");
		this.selectedTabElement = tabElement;
		tabElement.classList.add("selected-tab");

		// Call animation to apply title 
		if(tabElement.selectedPage != undefined)
			this.animateTransition(tabElement.selectedPage, 1);
	}

	showPageElement(tab, pageElement){
		pageElement.prevPage = tab.selectedPage;
		tab.selectedPage = pageElement;
		
		// Show new page
		if(pageElement.prevPage === undefined)
			this.animateTransition(pageElement, 1);
		else
			this.animate((a) => this.animateTransition(pageElement, a), 600, bezier(0.2, 0.8, 0.2, 1));
	}

	animate(render, duration, easing) {
  		var start = Date.now();
  		(function loop () {
    		var p = (Date.now()-start)/duration;
    		if (p > 1) {
      			render(1);
    		}
    		else {
      			requestAnimationFrame(loop);
      			render(easing(p));
    		}
  		}());
	}
	animateTransition(page, percent){
		this.topMenu.animateTransition(page, percent);

		page.style.transform = "translateX(" + (100 - percent * 100) + "%)";
		if(page.prevPage !== undefined)
			page.prevPage.style.transform = "translateX(" + (-percent * 30) + "%)";
	}
}

window.customElements.define('ios-app', IOSApp);
window.customElements.define('ios-tab', class extends HTMLElement {});
window.customElements.define('ios-page', class extends HTMLElement {
	connectedCallback() {
		this.innerHTML = `
			<div id="page-content"></div>
		`;
	}
});