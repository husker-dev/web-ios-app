class IOSPage extends HTMLElement {

	_bindTab(tab){
		this.tab = tab;
		this.app = tab.app;
		this.title = this.getAttribute("title") || "Untitled";
		this.titlebarType = this.getAttribute("titlebar") || "default";
		this.inverted = this.getAttribute("inverted") === "true" || false;
		this.path = this.getAttribute("path") || ".";
		this.src = this.getAttribute("src") || undefined;

		if(this.inverted)
			this.classList.add("inverted");

		this.attachShadow({mode: 'open'});
		this.app.addStyleToShadow(this.shadowRoot);
	    this.shadowRoot.innerHTML += `
	    	<page-shadow>
	    		<i-titlebar-${this.titlebarType}></i-titlebar-${this.titlebarType}>
				<page-container>
					<page-header></page-header>
					<page-body>
						<slot></slot>
					</page-body>
				</page-scroll>
			</page-shadow>
		`;
		const query = (q) => this.shadowRoot.querySelector(q);
		this.container 	= query("page-container");
		this.header 	= query("page-header");
		this.body 		= query("page-body");
		this.titlebar 	= query(`i-titlebar-${this.titlebarType}`);

		mirrorEvents(this, tab, [
			"page-created", "page-selected", "page-deselected",
		]);

		this.titlebar._bindPage(this);
		this._bindTouchGestures();
		this.dispatchEvent(new CustomEvent("page-created", { detail: { page: this } }));
		if(this.src)
			this._loadContent();

		// Workaround to fix mispositioned scroll bar on opened pages
		setTimeout(() => {this.style.overflow = "hidden"}, 100);
	}

	selected(){
		this.dispatchEvent(new CustomEvent("page-selected", { detail: { page: this } }));
	}

	deselected(){
		this.dispatchEvent(new CustomEvent("page-deselected", { detail: { page: this } }));
	}

	_loadContent(){
		fetch(this.src).then(d => d.text())
		.then(content => {
			this.innerHTML += content;
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
				this.gesture.animationId = new IOSAnimationId();

				this.app._transitionStarted(this.gesture.animationId, this);
				this.app._processTransitionFrame(this.gesture.animationId, this, 1);
				e.preventDefault();
			}
		});
		this.addEventListener("touchmove", (e) => {
			if(this.gesture.started && e.touches.length == 1){

				this.gesture.previousX = this.gesture.currentX;
				this.gesture.currentX = e.touches[0].clientX - this.tab.getBoundingClientRect().left;
				this.gesture.speed = this.gesture.currentX - this.gesture.previousX;
				this.gesture.percent = (this.gesture.currentX - this.gesture.startX) / this.gesture.width;

				this.app._processTransitionFrame(this.gesture.animationId, this, 1 - this.gesture.percent);
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
window.customElements.define('i-page', IOSPage);