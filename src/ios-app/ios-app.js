
function openPage(element, page){
	while(element != window.body && !(element instanceof IOSTab))
		element = element.parentElement;
	
	if(element instanceof IOSTab)
		element.showNewPage(page);
}

/*
	Events:
		- transition-started
		- transition-completed
		- transition
		- tab-created
		- tab-selected
		- tab-deselected
		- page-created
		- page-selected
		- page-deselected
*/
class IOSApp extends HTMLElement {

	connectedCallback() {
		var that = this;

		this.innerHTML = `
			<ios-top-menu></ios-top-menu>
			<ios-bottom-menu class="blurred"></ios-bottom-menu>
		`;
		this.topMenu = this.querySelector("ios-top-menu");
		this.bottomMenu = this.querySelector("ios-bottom-menu");

		this.bottomMenu.bindApp(this);
		this.topMenu.bindApp(this);

		new ResizeObserver(() => {
			that.getBoundingClientRect().right - that.getBoundingClientRect().left >= 600 ? 
				that.classList.add("large-screen") : 
				that.classList.remove("large-screen");
		}).observe(this);

		// Load app manifest content
		fetch(this.getAttribute("manifest")).then(d => d.json())
		.then(appManifest => {
			appManifest.tabs.forEach(tabManifest => that.createTab(tabManifest));
		});
	}

	showTab(tabId){
		var tab = this.querySelector(`#tab_${tabId}`);

		this.selectedTab?.deselected();
		this.selectedTab = tab;
		tab.selected();
	}

	createTab(tabManifest){
		var that = this;
		var tab = document.createElement("ios-tab");
		tab.id = `tab_${tabManifest.id}`;
		tab.app = this;
		tab.manifest = tabManifest;
		
		// Translate tab events to app
		tab.addEventListener("tab-created", e => that.dispatchEvent(new e.constructor(e.type, e)));
		tab.addEventListener("tab-selected", e => that.dispatchEvent(new e.constructor(e.type, e)));
		tab.addEventListener("tab-deselected", e => that.dispatchEvent(new e.constructor(e.type, e)));
		tab.addEventListener("page-created", e => that.dispatchEvent(new e.constructor(e.type, e)));
		tab.addEventListener("page-selected", e => that.dispatchEvent(new e.constructor(e.type, e)));
		tab.addEventListener("page-deselected", e => that.dispatchEvent(new e.constructor(e.type, e)));

		this.appendChild(tab);

		if(tab.manifest.selected)
			this.showTab(tabManifest.id);
	}

	_animateTransition(page, duration, transform = percent => percent) {
		var easing = bezier(0.2, 0.8, 0.2, 1);
  		var start = Date.now();
  		var that = this;
  		this._transitionStarted(page);
  		(function loop () {
    		var p = (Date.now()-start)/duration;
    		if (p >= 1){
      			that._processTransitionFrame(page, transform(1));
    			that._transitionCompleted(page, transform(1) == 1);
    		}else {
      			that._processTransitionFrame(page, transform(easing(p)));
      			requestAnimationFrame(loop);
    		}
  		}());
	}

	_transitionStarted(page){
		this.dispatchEvent(new CustomEvent("transition-started", { detail: { page: page } }));
	}

	_transitionCompleted(page, isEnd){
		this.dispatchEvent(new CustomEvent("transition-completed", { detail: { page: page, isEnd: isEnd } }));
	}

	_processTransitionFrame(page, percent){
		page.style.transform = `translateX(${(1-percent) * 100}%)`;
		page.prevPage.style.transform = `translateX(${percent * -30}%)`;

		this.dispatchEvent(new CustomEvent("transition", { detail: { page: page, percent: percent } }));
	}
}

class IOSTab extends HTMLElement {

	connectedCallback() {
		this.dispatchEvent(new CustomEvent("tab-created", { detail: { tab: this } }));
	}

	showNewPage(pagePath){
		var that = this;

		fetch(`${pagePath}.pagemanifest`).then(d => d.json())
		.then(pageManifest => {
			var page = document.createElement("ios-page");
			page.id = `page_${pagePath.replaceAll("/", "-")}`;
			page.manifest = pageManifest;
			page.prevPage = this.selectedPage;
			page.tab = this;
			page.app = that.app;
			page.path = pagePath;
			
			// Translate page events to tab
			page.addEventListener("page-created", e => that.dispatchEvent(new e.constructor(e.type, e)));
			page.addEventListener("page-selected", e => that.dispatchEvent(new e.constructor(e.type, e)));
			page.addEventListener("page-deselected", e => that.dispatchEvent(new e.constructor(e.type, e)));
			this.appendChild(page);

			// Animate new page
			if(page.prevPage !== undefined){
				this.app._animateTransition(page, 600);
				setTimeout(() => this._setSelectedPage(page), 600);
			}
			else this._setSelectedPage(page);
		});
	}

	goToPreviousPage(page = this.selectedPage.prevPage){
		var currentPage = this.selectedPage;
		this.app._animateTransition(currentPage, 400, p => 1-p);
		setTimeout(() => {
			this._removePage(currentPage)
			this._setSelectedPage(page);
		}, 400);
	}

	selected(){
		this.classList.add("selected-tab");
		this.dispatchEvent(new CustomEvent("tab-selected", { detail: { tab: this } }));
		if(this.selectedPage == undefined)
			this.showNewPage(this.manifest.page);
	}

	deselected(){
		this.classList.remove("selected-tab");
		this.dispatchEvent(new CustomEvent("tab-deselected", { detail: { tab: this } }));
	}

	_setSelectedPage(page){
		this.selectedPage?.deselected();
		this.selectedPage = page;
		page.selected();
	}

	_removePage(page){
		this.removeChild(page);
	}
}

class IOSPage extends HTMLElement {
	connectedCallback() {
		this.innerHTML = `
			<div id="page-header"></div>
			<div id="page-content"></div>
		`;
		this.dispatchEvent(new CustomEvent("page-created", { detail: { page: this } }));
		this._bindTouchGestures();
		this._loadContent();
	}

	selected(){
		this.dispatchEvent(new CustomEvent("page-selected", { detail: { page: this } }));
	}

	deselected(){
		this.dispatchEvent(new CustomEvent("page-deselected", { detail: { page: this } }));
	}

	_loadContent(){
		fetch(`${this.path}.html`).then(d => d.text())
		.then(content => {
			this.querySelector("#page-content").innerHTML = content;
		});
	}

	_bindTouchGestures(){
		this.gesture = { started: false, percent: 0, startX: 0, speed: 0, currentX: 0, lastX: 0, width: 0 };

		this.addEventListener("touchstart", (e) => {
			var touchX = e.touches[0].clientX - this.tab.getBoundingClientRect().left;
			if(this.prevPage !== undefined && e.touches.length == 1 && touchX < 25){

				this.gesture.started = true;
				this.gesture.percent = 0;
				this.gesture.startX = touchX;
				this.gesture.width = this.getBoundingClientRect().right - this.getBoundingClientRect().left;

				this.app._transitionStarted(this);
				this.app._processTransitionFrame(this, 1);
				e.preventDefault();
			}
		});
		this.addEventListener("touchmove", (e) => {
			if(this.gesture.started && e.touches.length == 1){

				this.gesture.previousX = this.gesture.currentX;
				this.gesture.currentX = e.touches[0].clientX - this.tab.getBoundingClientRect().left;
				this.gesture.speed = this.gesture.currentX - this.gesture.previousX;
				this.gesture.percent = (this.gesture.currentX - this.gesture.startX) / this.gesture.width;

				this.app._processTransitionFrame(this, 1 - this.gesture.percent);
				e.preventDefault();
			}
		});
		this.addEventListener("touchend", (e) => {
			if(this.gesture.started){
				this.gesture.started = false;
				var percent = this.gesture.percent;

				if(percent > 0.5 || this.gesture.speed > 5){
					this.app._animateTransition(this, 400, a => (1-percent) - (1-percent) * a);
					setTimeout(() => {
						this.tab.removeChild(this)
						this.tab._setSelectedPage(this.prevPage);
					}, 400);
				}
				else this.app._animateTransition(this, 400, a => (1-percent) + percent * a);
			}
		});
	}
}

window.customElements.define('ios-app', IOSApp);
window.customElements.define('ios-tab', IOSTab);
window.customElements.define('ios-page', IOSPage);