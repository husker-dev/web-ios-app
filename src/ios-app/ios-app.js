
function openPage(element, page){
	
	while(element != window.body && !(element instanceof IOSApp))
		element = element.parentElement;
	
	if(element instanceof IOSApp)
		element.showNewPage(page);
}

class IOSApp extends HTMLElement {

	connectedCallback() {
		this.innerHTML = `
			<ios-top-menu></ios-top-menu>
			<ios-bottom-menu id="bottom-menu" class="blurred"></ios-bottom-menu>
		`;
		var that = this;
		this.topMenu = this.querySelector("ios-top-menu");
		this.bottomMenu = this.querySelector("#bottom-menu");

		new ResizeObserver(() => {
			that.getBoundingClientRect().right >= 600 ? 
				that.classList.add("large-screen") : 
				that.classList.remove("large-screen");
		}).observe(this);

		this.bottomMenu.onTabSelect = (tab) => that.showTabElement(that.querySelector(`#tab_${tab.id.replaceAll("/", "-")}`));
		this.bottomMenu.onTabLoaded = (tab) => {
			var tabElement = document.createElement("ios-tab");
			tabElement.id = `tab_${tab.id.replaceAll("/", "-")}`;
			tabElement.manifest = tab;
			that.appendChild(tabElement);
		};
		this.bottomMenu.loadManifest(this.getAttribute("manifest"));
		this.topMenu.bindApp(this);
	}

	bindPageGestures(tab, pageElement){
		var that = this;
		pageElement.gesture = { started: false, percent: 0, startX: 0, speed: 0, currentX: 0, lastX: 0, width: 0 };

		pageElement.addEventListener("touchstart", (e) => {
			var touchX = e.touches[0].clientX - tab.getBoundingClientRect().left;
			if(pageElement.prevPage !== undefined && e.touches.length == 1 && touchX < 25){
				e.preventDefault();
				pageElement.gesture.started = true;
				pageElement.gesture.percent = 0;
				pageElement.gesture.startX = touchX;
				pageElement.gesture.width = pageElement.getBoundingClientRect().right - pageElement.getBoundingClientRect().left;

				this.animationStarted(pageElement);
				this.processAnimationFrame(pageElement, 1);
			}
		});
		pageElement.addEventListener("touchend", (e) => {
			if(pageElement.gesture.started){
				pageElement.gesture.started = false;
				var percent = pageElement.gesture.percent;
				//this.animationFinished(pageElement, false);

				if(percent > 0.5 || pageElement.gesture.speed > 5){
					this.animateTransition(pageElement, 400, a => (1-percent) - (1-percent) * a);
					setTimeout(() => that.goToPreviousPage(pageElement.prevPage, false), 400);
				}
				else this.animateTransition(pageElement, 400, a => (1-percent) + percent * a);
			}
		});
		pageElement.addEventListener("touchmove", (e) => {
			if(pageElement.gesture.started && e.touches.length == 1){

				pageElement.gesture.previousX = pageElement.gesture.currentX;
				pageElement.gesture.currentX = e.touches[0].clientX - tab.getBoundingClientRect().left;
				pageElement.gesture.speed = pageElement.gesture.currentX - pageElement.gesture.previousX;
				pageElement.gesture.percent = (pageElement.gesture.currentX - pageElement.gesture.startX) / pageElement.gesture.width;

				that.processAnimationFrame(pageElement, 1 - pageElement.gesture.percent);
				e.preventDefault();
			}
		});
	}

	showTabElement(tabElement){
		if(this.selectedTabElement !== undefined)
			this.selectedTabElement.classList.remove("selected-tab");
		this.selectedTabElement = tabElement;
		tabElement.classList.add("selected-tab");

		// If tab is empty, then create page, otherwise show current page
		if(tabElement.selectedPage == undefined)
			this.showNewPage(tabElement.manifest.page);
		else {
			//this.processAnimationFrame(tabElement.selectedPage, 1);
		}
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
			
			// Set page as current
			pageElement.prevPage = tab.selectedPage;
			pageElement.tab = tab;
			tab.selectedPage = pageElement;

			// Dispatch events
			that.dispatchEvent(new CustomEvent("page-loaded", { detail: { page: pageElement } }));
		
			// Show new page
			if(pageElement.prevPage === undefined){
				this.animationStarted(pageElement);
				this.animationFinished(pageElement, true);
			}
			else this.animateTransition(pageElement, 600);

			// Binding swipe gesture
			that.bindPageGestures(tab, pageElement);

			// Load page content
			fetch(`${page}.html`).then(d => d.text())
			.then(content => {
				pageElement.querySelector("#page-content").innerHTML = content;
			});
		});
	}

	goToPreviousPage(page = this.selectedTabElement.selectedPage.prevPage, animate = true){
		var lastPage = this.selectedTabElement.selectedPage;
		this.selectedTabElement.selectedPage = page;

		if(animate){
			this.animateTransition(lastPage, 400, p => 1-p);
			setTimeout(() => this.selectedTabElement.removeChild(lastPage), 400);
		} else this.selectedTabElement.removeChild(lastPage);
	}

	animateTransition(page, duration, transform = percent => percent) {
		var easing = bezier(0.2, 0.8, 0.2, 1);
  		var start = Date.now();
  		var that = this;
  		this.animationStarted(page);
  		(function loop () {
    		var p = (Date.now()-start)/duration;
    		if (p > 1){
      			that.processAnimationFrame(page, transform(1));
    			that.animationFinished(page, transform(1) == 1);
    		}
    		else {
      			that.processAnimationFrame(page, transform(easing(p)));
      			requestAnimationFrame(loop);
    		}
  		}());
	}

	animationStarted(page){
		this.topMenu.animationStarted(page);
	}

	animationFinished(page, isEnd){
		this.topMenu.animationFinished(page, isEnd);
	}

	processAnimationFrame(page, percent){
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
			<div id="page-header"></div>
			<div id="page-content"></div>
		`;
	}
});