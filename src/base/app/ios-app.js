
function openPage(element, page){
	while(element != window.body && !(element instanceof IOSTab))
		element = element.parentElement;
	
	if(element instanceof IOSTab)
		element.showNewPage(page);
}

function loadSVG(src, callback){
	if(src.trim().startsWith("<svg"))
		return callback(src);
	fetch(src).then(c => c.text()).then(callback);
}

function createSVGElement(src){
	var svgElement = document.createElement('template');
	svgElement.innerHTML = src.trim();
	return svgElement.content.firstChild;
}

function mirrorEvents(source, target, eventNames){
	eventNames.forEach(eventName => {
		source.addEventListener(eventName, e => target.dispatchEvent(new e.constructor(e.type, e)));
	});
}

let ignoreTimeStamp = 0;
function addPointerListener(element, type, callback){
	let names = 0;
	if(type == "up")
		names = [element, "mouseup", element, "touchend"];
	if(type == "move")
		names = [window, "mousemove", element, "touchmove"];
	if(type == "down")
		names = [element, "mousedown", element, "touchstart"];
	
	names[0].addEventListener(names[1], e => {
		if(e.timeStamp != ignoreTimeStamp) callback({
			clientX: e.clientX, 
			clientY: e.clientY, 
			pointerId: 0, 
			preventDefault: function() { e.preventDefault() }
		})
	});
	names[2].addEventListener(names[3], e => {
		ignoreTimeStamp = e.timeStamp;
		const touch = e.changedTouches[0];
		callback({
			clientX: touch.clientX, 
			clientY: touch.clientY, 
			pointerId: touch.identifier, 
			preventDefault: function() { e.preventDefault() }
		});
	});
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

	static _cssCallbacks = [];
	static notifyCSS(){
		const realCSS = [...document.styleSheets].find(style => 
			[...style.cssRules].find(rule => rule.cssText.includes("i-app-detection-label"))
		);
		if(document.adoptedStyleSheets){
			IOSApp.css = new CSSStyleSheet();
			IOSApp.css.replace([...realCSS.cssRules].map(rule => rule.cssText).join("\n"));
		}else 
			IOSApp.css = [...realCSS.cssRules].map(rule => rule.cssText).join("\n");

		const callbacks = IOSApp._cssCallbacks;
		IOSApp._cssCallbacks = undefined;
		callbacks.forEach(a => a())
	}

	static loadStyleSheet(callback){
		if(IOSApp._cssCallbacks) IOSApp._cssCallbacks.push(callback);
		else callback();
	}

	static addStyleToShadow(shadow){
		if(document.adoptedStyleSheets){
			const newStyleSheets = [IOSApp.css];
			for (let i = 0; i < shadow.adoptedStyleSheets.length; i++)
			    newStyleSheets.push(shadow.adoptedStyleSheets[i]);
			shadow.adoptedStyleSheets = newStyleSheets;
		}else
			shadow.innerHTML += `<style>${IOSApp.css}</style>`;
	}

	connectedCallback() {
		if(!this.initialized) this.initialized = true;
		else return;

		IOSApp.loadStyleSheet(() => {
			this.attachShadow({mode: 'open'});
			IOSApp.addStyleToShadow(this.shadowRoot);
			this.shadowRoot.innerHTML += `
				<i-tabbar></i-tabbar>
				<slot></slot>
			`;

			this.bottomMenu = this.shadowRoot.querySelector("i-tabbar");
			this.bottomMenu.bindApp(this);

			new ResizeObserver(e => {
				const rect = this.getBoundingClientRect();
				this.classList.toggle("large-screen", e[0].contentRect.width >= 600)
			}).observe(this);

			new MutationObserver(e => e.forEach(r => r.addedNodes.forEach(element => {
				if(element instanceof IOSTab){
					this._processBindTab(element);
				}
			}))).observe(this, {childList: true});

			[...this.children].forEach(e => {
				if(e instanceof IOSTab)
					this._processBindTab(e);
			});

			if(this.hasAttribute("manifest"))
				this._loadFromManifest();
		});
	}

	_processBindTab(tab){
		tab._bindApp(this);
		if(tab.hasAttribute("selected") || this.tabsCount == 1)
			this.selectTab(tab.id);
	}

	_loadFromManifest(){
		fetch(this.getAttribute("manifest")).then(d => d.json())
		.then(appManifest => {
			appManifest.tabs.forEach(tabManifest => {
				var tab = document.createElement("i-tab");
				if(tabManifest.selected) tab.setAttribute("selected", "");
				if(tabManifest.id) tab.id = tabManifest.id;
				if(tabManifest.name) tab.name = tabManifest.name;
				if(tabManifest.page) tab.page = tabManifest.page;
				if(tabManifest.icon) tab.icon = tabManifest.icon;
				this.appendChild(tab);
			});
		});
	}

	selectTab(tabId){
		var tab = this.querySelector(`#${tabId}`);

		this.selectedTab?.deselected();
		this.selectedTab = tab;
		tab.selected();
	}

	_animateTransition(page, duration, transform = percent => percent) {
		let animationId = new IOSAnimationId();
		var easing = bezier(0.2, 0.8, 0.2, 1);
  		var start = Date.now();
  		var that = this;
  		this._transitionStarted(animationId, page);
  		(function loop () {
    		var p = (Date.now()-start)/duration;
    		if (p >= 1){
      			that._processTransitionFrame(page, transform(1));
    			that._transitionCompleted(animationId, page, transform(1) == 1);
    		}else {
      			that._processTransitionFrame(animationId, page, transform(easing(p)));
      			requestAnimationFrame(loop);
    		}
  		}());
	}

	_transitionStarted(animationId, page){
		this._animationId = animationId;
		this.dispatchEvent(new CustomEvent("transition-started", { detail: { page: page } }));
	}

	_transitionCompleted(animationId, page, isEnd){
		if(this._animationId != animationId)
			return;
		this.dispatchEvent(new CustomEvent("transition-completed", { detail: { page: page, isEnd: isEnd } }));
	}

	_processTransitionFrame(animationId, page, percent){
		if(this._animationId != animationId)
			return;
		page.style.transform = `translateX(${(1-percent) * 100}%)`;
		page.prevPage.style.transform = `translateX(${percent * -30}%)`;

		this.dispatchEvent(new CustomEvent("transition", { detail: { page: page, percent: percent } }));
	}
}

class IOSAnimationId {}


window.customElements.define('i-app', IOSApp);