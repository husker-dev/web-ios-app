
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
		IOSApp.css = new CSSStyleSheet();
		IOSApp.css.replace([...realCSS.cssRules].map(rule => rule.cssText).join("\n"));

		const callbacks = IOSApp._cssCallbacks;
		IOSApp._cssCallbacks = undefined;
		callbacks.forEach(a => a())
	}

	loadStyleSheet(callback){
		if(IOSApp._cssCallbacks) IOSApp._cssCallbacks.push(callback);
		else callback();
	}

	addStyleToShadow(shadow){
		const newStyleSheets = [IOSApp.css];
		for (let i = 0; i < shadow.adoptedStyleSheets.length; i++)
		    newStyleSheets.push(shadow.adoptedStyleSheets[i]);
		shadow.adoptedStyleSheets = newStyleSheets;
	}

	connectedCallback() {
		if(!this.initialized) this.initialized = true;
		else return;

		this.loadStyleSheet(() => {
			this.attachShadow({mode: 'open'});
			this.addStyleToShadow(this.shadowRoot);
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
/**
 * https://github.com/gre/bezier-easing
 * BezierEasing - use bezier curve for transition easing function
 * by Gaëtan Renaudeau 2014 - 2015 – MIT License
 */

// These values are established by empiricism with tests (tradeoff: performance VS precision)
var NEWTON_ITERATIONS = 4;
var NEWTON_MIN_SLOPE = 0.001;
var SUBDIVISION_PRECISION = 0.0000001;
var SUBDIVISION_MAX_ITERATIONS = 10;

var kSplineTableSize = 11;
var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

var float32ArraySupported = typeof Float32Array === 'function';

function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
function C (aA1)      { return 3.0 * aA1; }

// Returns x(t) given t, x1, and x2, or y(t) given t, y1, and y2.
function calcBezier (aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT; }

// Returns dx/dt given t, x1, and x2, or dy/dt given t, y1, and y2.
function getSlope (aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1); }

function binarySubdivide (aX, aA, aB, mX1, mX2) {
  var currentX, currentT, i = 0;
  do {
    currentT = aA + (aB - aA) / 2.0;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0.0) {
      aB = currentT;
    } else {
      aA = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
}

function newtonRaphsonIterate (aX, aGuessT, mX1, mX2) {
 for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
   var currentSlope = getSlope(aGuessT, mX1, mX2);
   if (currentSlope === 0.0) {
     return aGuessT;
   }
   var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
   aGuessT -= currentX / currentSlope;
 }
 return aGuessT;
}

function LinearEasing (x) {
  return x;
}

function bezier (mX1, mY1, mX2, mY2) {
  if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
    throw new Error('bezier x values must be in [0, 1] range');
  }

  if (mX1 === mY1 && mX2 === mY2) {
    return LinearEasing;
  }

  // Precompute samples table
  var sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);
  for (var i = 0; i < kSplineTableSize; ++i) {
    sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
  }

  function getTForX (aX) {
    var intervalStart = 0.0;
    var currentSample = 1;
    var lastSample = kSplineTableSize - 1;

    for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
      intervalStart += kSampleStepSize;
    }
    --currentSample;

    // Interpolate to provide an initial guess for t
    var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    var guessForT = intervalStart + dist * kSampleStepSize;

    var initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
    }
  }

  return function BezierEasing (x) {
    // Because JavaScript number are imprecise, we should guarantee the extremes are right.
    if (x === 0 || x === 1) {
      return x;
    }
    return calcBezier(getTForX(x), mY1, mY2);
  };
};

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
class IOSTab extends HTMLElement {

	static svgTemplate = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 28"><path fill="currentColor" d="M13 15.7c.5 0 1-.1 1.6-.5l9.1-5.3c1-.5 1.4-1 1.4-1.8 0-.7-.4-1.2-1.4-1.8L14.6 1C14 .7 13.5.5 13 .5s-1 .2-1.6.5L2.3 6.3C1.3 7 .9 7.3.9 8.1s.4 1.3 1.4 1.8l9.1 5.3c.6.4 1.1.5 1.6.5Zm0 5.9c.5 0 .9-.3 1.4-.6l9.9-5.8c.5-.3.8-.8.8-1.3 0-.6-.3-1-.7-1.3l-10.7 6.2-.7.3-.7-.3-10.7-6.2c-.4.3-.7.7-.7 1.3 0 .5.3 1 .8 1.3l9.9 5.8c.5.3 1 .6 1.4.6Zm0 5.4c.5 0 .9-.2 1.4-.5l9.9-5.8c.5-.4.8-.8.8-1.3 0-.6-.3-1-.7-1.3l-10.7 6.2-.7.3-.7-.3-10.7-6.2c-.4.3-.7.7-.7 1.3 0 .5.3 1 .8 1.3l9.9 5.8c.5.3 1 .5 1.4.5Z"/></svg>`;
	static tabCounter = 0;

	_bindApp(app){
		this.app = app;

		if(!this.id) 	this.id = `tab_${IOSTab.tabCounter++}`;
		if(!this.name) 	this.name = this.getAttribute("name") || "Unnamed";
		if(!this.icon) 	this.icon = this.getAttribute("icon") || IOSTab.svgTemplate;

		mirrorEvents(this, app, [
			"tab-created", "tab-selected", "tab-deselected",
			"page-created", "page-selected", "page-deselected",
		]);

		this.attachShadow({mode: 'open'});
		this.app.addStyleToShadow(this.shadowRoot);
		this.shadowRoot.innerHTML += `
			<i-titlebar-root></i-titlebar-root>
			<slot></slot>
		`;

		this.titlebarRoot = this.shadowRoot.querySelector("i-titlebar-root");
		this.titlebarRoot._bindTab(this);

		new MutationObserver(e => e.forEach(r => r.addedNodes.forEach(element => {
			if(element instanceof IOSPage){
				element.prevPage = this.selectedPage;
				element._bindTab(this);

				if(element.prevPage !== undefined){
					this.app._animateTransition(element, 600);
					setTimeout(() => this._setSelectedPage(element), 600);
				} else this._setSelectedPage(element);
			}
		}))).observe(this, {childList: true});

		this.dispatchEvent(new CustomEvent("tab-created", { detail: { tab: this } }));

		if(this.getAttribute("pagePath"))
			this.showNewPage(this.getAttribute("pagePath"));
	}

	showNewPage(src){
		const template = this.app.querySelector(`template[path="${src}"]`);
		if(template){
			const page = document.createElement("i-page");
			page.innerHTML = template.innerHTML;
			[...template.attributes].forEach(a => page.setAttribute(a.nodeName, a.nodeValue));
			this.appendChild(page);
		}else {
			fetch(`${src}.template`).then(d => d.text())
			.then(templateSrc => {
				var template = document.createElement('template');
				template.innerHTML = templateSrc.trim();
				template = template.content.firstChild;

				var page = document.createElement("i-page");
				page.setAttribute("src", `${src}.html`);
				page.setAttribute("path", src.replaceAll("/", "-"));
				page.innerHTML = template.innerHTML;
				[...template.attributes].forEach(a => page.setAttribute(a.nodeName, a.nodeValue));
				this.appendChild(page);
			});
		}
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
		this.setAttribute("selected", "");
		this.dispatchEvent(new CustomEvent("tab-selected", { detail: { tab: this } }));
		//if(this.selectedPage == undefined)
		//	this.showNewPage(this.manifest.page);
	}

	deselected(){
		this.removeAttribute("selected");
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
window.customElements.define('i-tab', IOSTab);
﻿

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
			<svg id="tabbar-loading-svg"></svg>
			<div>${this.tab.name}</div>
	    `

	    loadSVG(this.tab.icon, src => {
	    	this.querySelector("#tabbar-loading-svg").replaceWith(createSVGElement(src));
	    });
	}
}

window.customElements.define('i-tabbar', IOSTabbar);
window.customElements.define('i-tabbar-item', IOSTabbarItem);


class StyleTransition {

	constructor(target, fromStyle, toStyle){
		const that = this;
		this.target = target;
		this.from = _computeTargetStyle(fromStyle);
		this.to = _computeTargetStyle(toStyle);
		
		this.scale = 			(p) => _applyDefFun("scale", p);
		this.width = 			(p) => _applyDefFun("width", p, 			(v) => `${v}px`);
		this.height = 			(p) => _applyDefFun("height", p, 			(v) => `${v}px`);
		this.opacity = 			(p) => _applyDefFun("opacity", p);
		this.fontWeight = 		(p) => _applyDefFun("fontWeight", p);
		this.padding = 			(p) => _applyDefFun("padding", p, 			(a) => `${a[0]}px ${a[1]}px ${a[2]}px ${a[3]}px`);
		this.borderRadius = 	(p) => _applyDefFun("borderRadius", p, 		(a) => `${a[0]}px ${a[1]}px ${a[2]}px ${a[3]}px`);
		this.backgroundColor = 	(p) => _applyDefFun("backgroundColor", p, 	(a) => `rgba(${a[0]},${a[1]},${a[2]},${a[3]})`);
		this.color = 			(p) => _applyDefFun("color", p, 			(a) => `rgba(${a[0]},${a[1]},${a[2]},${a[3]})`);
		this.translate = 		(p) => _applyDefFun("translate", p, 		(a) => `${a[0]}px ${a[1]}px`);
		this.fontSize = 		(p) => _applyDefFun("fontSize", p);
		
		this.$fontScale = 		(p, reversed) => {
			const fontRatio = reversed ? that.from.fontSize / that.to.fontSize : that.to.fontSize / that.from.fontSize;
			that.target.style.scale = 1 - (1 - fontRatio) * (reversed ? 1 - p : p);
			return this; 
		};

		function _computeTargetStyle(targetStyle){
			if(targetStyle["source"] === undefined)
				return targetStyle;
			function set(name, value) {if(targetStyle[name] === undefined) targetStyle[name] = value};

			const style = getComputedStyle(targetStyle["source"]);
			set("scale", style.scale == "none" ? 1 : style.scale);
			set("width", _parse(style.width));
			set("height", _parse(style.height));
			set("opacity", style.opacity);
			set("fontWeight", style.fontWeight);
			set("fontSize", _parse(style.fontSize));
			set("padding", _parse([
				style.paddingTop, style.paddingRight,
				style.paddingBottom, style.paddingLeft
			]));
			set("borderRadius", _parse([
				style.borderTopLeftRadius, style.borderTopRightRadius,
				style.borderBottomRightRadius, style.borderBottomLeftRadius
			]));
			set("translate", _parse([
				style.translateX, style.translateY,
			]));
			set("backgroundColor", _parseColor(style.backgroundColor));
			set("color", _parseColor(style.color));
			return targetStyle;
		}

		function _parse(v) { return v instanceof Array ? v.map(parseFloat) : parseFloat(v) };
		
		function _parseColor(c){
			const res = c.replace(/^rgba?\(|\s+|\)$/g,'').split(',');
			if(res.length == 3) res.push("1");
			return res;
		}

		function _defFun(propName, percent){
			const from = that.from[propName];
			const to = that.to[propName];
			if(from == to) return from;
			if(from instanceof Array) return from.map((el, i) => el - (el - to[i]) * percent);
			return from - (from - to) * percent;
		}

		function _applyDefFun(propName, percent, callback = (a) => a){
			that.target.style[propName] = callback(_defFun(propName, percent));
			return that;
		}
	}
}

class IOSTitlebarRoot extends HTMLElement {

	static arrowIcon = `
		<svg {meta} viewBox="0 0 12 20" xmlns="http://www.w3.org/2000/svg">
			<path fill="currentColor" d="M0.610352 10.0068C0.615885 9.81315 0.654622 9.63607 0.726562 9.47559C0.798503 9.3151 0.90918 9.16016 1.05859 9.01074L9.37598 0.958984C9.61393 0.721029 9.90723 0.602051 10.2559 0.602051C10.4883 0.602051 10.6986 0.657389 10.8867 0.768066C11.0804 0.878743 11.2326 1.02816 11.3433 1.21631C11.4595 1.40446 11.5176 1.61475 11.5176 1.84717C11.5176 2.19027 11.3875 2.49186 11.1274 2.75195L3.60693 9.99854L11.1274 17.2534C11.3875 17.519 11.5176 17.8206 11.5176 18.1582C11.5176 18.3962 11.4595 18.6092 11.3433 18.7974C11.2326 18.9855 11.0804 19.1349 10.8867 19.2456C10.6986 19.3618 10.4883 19.4199 10.2559 19.4199C9.90723 19.4199 9.61393 19.2982 9.37598 19.0547L1.05859 11.0029C0.903646 10.8535 0.790202 10.6986 0.718262 10.5381C0.646322 10.3721 0.610352 10.195 0.610352 10.0068Z"/>
		</svg>
	`;

	_bindTab(tab){
		this.tab = tab;
		let that = this;

		this.animation = {};

		this.innerHTML = `
			<div id="anim-title-1" class="anim-element"></div>
			<div id="anim-title-2" class="anim-element"></div>
			<div id="anim-back-1" class="anim-element"></div>
			<div id="anim-back-2" class="anim-element"></div>
			${IOSTitlebarRoot.arrowIcon.replace("{meta}", `id="anim-back-arrow" class="anim-element"`)}
			<div id="anim-tools" class="anim-element"></div>
		`;
		this.title1 = this.querySelector("#anim-title-1");
		this.title2 = this.querySelector("#anim-title-2");
		this.back1 = this.querySelector("#anim-back-1");
		this.back2 = this.querySelector("#anim-back-2");
		this.backArrow = this.querySelector("#anim-back-arrow");
		this.tools = this.querySelector("#anim-tools");

		this.tab.app.addEventListener("transition-started", e => {
			if(!this.tab.hasAttribute("selected"))
				return;
			const page = e.detail.page;
			const oldHeader = page.prevPage.titlebar;
			const newHeader = page.titlebar;

			this.animation.started = true;
			this.animation.equalTools = oldHeader.getToolsElementHTML() === newHeader.getToolsElementHTML();

			this._switchElementsVisibility(page, false);
			const rectToArr = (r) => [r.left, r.top];

			this.animation.title1Transition = new StyleTransition(
				this.title1, {
					source: oldHeader.getTitleElement(),
					translate: rectToArr(oldHeader.getTitleElementPosition())
				}, {
					source: newHeader.getBackTextElement(),
					translate: rectToArr(newHeader.getBackTextElementPosition()),
					opacity: 0
				});
			this.animation.title2Transition = new StyleTransition(
				this.title2, {
					translate: rectToArr(newHeader.getHiddenTitleElementPosition()),
					opacity: getComputedStyle(newHeader.getTitleElement()).opacity
				}, {
					translate: rectToArr(newHeader.getTitleElementPosition()),
					opacity: 0
				});
			this.animation.back1Transition = new StyleTransition(
				this.back1, {
					translate: rectToArr(oldHeader.getBackTextElementPosition()),
					opacity: getComputedStyle(oldHeader.getBackTextElement()).opacity
				}, {
					translate: rectToArr(oldHeader.getHiddenBackTextElementPosition()),
					opacity: 0
				});
			this.animation.back2Transition = new StyleTransition(
				this.back2, {
					source: oldHeader.getTitleElement(),
					translate: rectToArr(oldHeader.getTitleElementPosition()),
					opacity: 0
				}, {
					source: newHeader.getBackTextElement(),
					translate: rectToArr(newHeader.getBackTextElementPosition()),
				});
			this.animation.backArrowTransition = new StyleTransition(
				this.backArrow, {
					source: oldHeader.getBackArrowElement(),
					translate: rectToArr(oldHeader.getBackArrowElementPosition())
				}, {
					source: newHeader.getBackArrowElement(),
					translate: rectToArr(newHeader.getBackArrowElementPosition()),
				});

			this._cloneTextStyle(this.title1, oldHeader.getTitleElement());
			this._cloneTextStyle(this.title2, newHeader.getTitleElement());
			this._cloneTextStyle(this.back1, oldHeader.getBackTextElement());
			this._cloneTextStyle(this.back2, newHeader.getBackTextElement());
			this._cloneTextStyle(this.backArrow, newHeader.getBackArrowElement());

			if(this.animation.equalTools){
				const pos = newHeader.getToolsElementPosition();
				const style = getComputedStyle(oldHeader.getToolsElement());
				this.tools.innerHTML = oldHeader.getToolsElementHTML();
				this.tools.style.width = pos.right - pos.left - parseFloat(style.paddingRight);
				this.tools.style.translate = `${pos.left}px ${pos.top}px`;
			}else {
				this.tools.innerHTML = "";
			}
			
			this._switchElementsVisibility(page, true);
		});

		this.tab.app.addEventListener("transition-completed", e => {
			if(!this.tab.hasAttribute("selected"))
				return;
			this.animation.started = false;
			this._switchElementsVisibility(e.detail.page, false);
		});

		this.tab.app.addEventListener("transition", e => {
			if(!this.animation.started)
				return;
			this.calcTransition(e.detail.page, e.detail.percent);
		});

		this._switchElementsVisibility(null, false);
	}


	calcTransition(page, percent){
		const oldHeader = page.prevPage.titlebar;

		this.animation.title1Transition
			.translate(percent)
			.opacity(percent * 1.7)
			.fontWeight(percent)
			.$fontScale(percent, false);

		this.animation.title2Transition
			.translate(percent)
			.opacity((1 - percent) * 1.5);

		this.animation.back1Transition
			.translate(percent)
			.opacity(percent * 2);

		this.animation.back2Transition
			.translate(percent)
			.opacity(percent * 1.7 - 0.7)
			.fontWeight(percent)
			.$fontScale(percent, true);

		this.animation.backArrowTransition
			.scale(percent)
			.padding(percent)
			.width(percent)
			.height(percent)
			.opacity(oldHeader.backArrowOpacityFunc(percent))
			.translate(percent)
			.backgroundColor(percent)
			.borderRadius(percent)
			.color(percent);
	}

	_cloneTextStyle(element, sourceElement){
		const style = getComputedStyle(sourceElement);
		element.style.color = style.color;
		element.style.fontSize = style.fontSize;
		element.style.fontWeight = style.fontWeight;
		element.style.letterSpacing = style.letterSpacing;
		element.innerHTML = sourceElement.innerHTML;
	}

	_switchElementsVisibility(page, isVisible){
		const className = "top-menu-anim-invisible";
		[ 
			this.title1, this.title2, this.back1, this.back2, this.backArrow, this.tools
		].forEach(e => e.classList.toggle(className, !isVisible));
		if(page != null){
			const oldHeader = page.prevPage.titlebar;
			const newHeader = page.titlebar;
			[
				oldHeader.getTitleElement(),
				newHeader.getTitleElement(),
				oldHeader.getBackTextElement(),
				newHeader.getBackTextElement(),
				oldHeader.getBackArrowElement(),
				newHeader.getBackArrowElement(),
				this.animation.equalTools ? newHeader.getToolsElement() : null,
				this.animation.equalTools ? oldHeader.getToolsElement() : null,
			].forEach(e => e?.classList.toggle(className, isVisible));
		}
	}
}

class IOSTitlebar extends HTMLElement {
	_bindPage(page){
		this.page = page;
		this.classList.add("titlebar");

		this.backArrowOpacityFunc = (p) => p;
	}

	_getTextPosition(element){
		if(element.innerHTML == "")
			return element.getBoundingClientRect();
		var range = document.createRange();
		range.setStart(element, 0);
		range.setEnd(element, 1);
		return range.getBoundingClientRect();
	}

	_getElementRect(element){
		const sizes = element.getBoundingClientRect();
		let rect = { left: 0, top: 0, right: 0, bottom: 0 };
  		do {
		    rect.left += element.offsetLeft;
		    rect.top += element.offsetTop;
  		} while(element = element.offsetParent)
  		rect.right = rect.left + (sizes.right - rect.left);
  		rect.bottom = rect.top + (sizes.bottom - rect.top);
		return rect;
	}

	_relativeToApp(rect){
		var pageRect = this.page.getBoundingClientRect();
		return { 
			left: rect.left - pageRect.left, 
			top: rect.top - pageRect.top,
			right: rect.right - pageRect.left,
			bottom: rect.bottom - pageRect.top
		};
	}

	addClass(name){
		this.classList.add(name);
	}

	getTitleElement(){}
	getTitleElementPosition(){}
	getHiddenTitleElementPosition(){}

	getBackTextElement(){}
	getBackTextElementPosition(){}

	getHiddenBackTextElementPosition(){}

	getBackArrowElement(){}
	getBackArrowElementPosition(){}

	getToolsElement(){}
	getToolsElementHTML(){}
	getToolsElementPosition(){}

	onPageScroll(scrollTop) {}
}

class DefaultTitlebar extends IOSTitlebar {

	_bindPage(page){
		super._bindPage(page);
		this.addClass("titlebar-default");

		this.innerHTML += `
			<div id="content-container">
				<div id="statusbar"></div>
				<div id="controls-container">
					<div id="back-container">
						<div id="back-arrow">
							${IOSTitlebarRoot.arrowIcon.replace("{meta}", ``)}
						</div>
						<div id="back-text">${this.page.prevPage?.title ?? "-"}</div>
					</div>
					<div id="title">${this.page.title}</div>
					<div id="tools-container">
						<slot name="tools"></slot>
					</div>
				</div>
			</div>
			<div id="background" class="i-material-chrome"></div>
		`;
		this.statusbarElement = this.querySelector("#statusbar");
		this.titleElement = this.querySelector("#title");
		this.toolsContainerElement = this.querySelector("#tools-container");
		this.backContainerElement = this.querySelector("#back-container");
		this.backTextElement = this.querySelector("#back-text");
		this.backArrowElement = this.querySelector("#back-arrow");
		this.backgroundElement = this.querySelector("#background");

		this.page.container.addEventListener("scroll", e => this.onPageScroll(this.page.container.scrollTop));
		this.backContainerElement.addEventListener("touchstart", e => {
			e.preventDefault();
			e.stopPropagation();
			this.backContainerElement.classList.add("pressed");
		});
		this.backContainerElement.addEventListener("touchend", e => {
			e.preventDefault();
			e.stopPropagation();
			this.backContainerElement.classList.remove("pressed");
			this.page.tab.goToPreviousPage();
		});

		if(this.page.prevPage === undefined){
			this.backTextElement.style.opacity = 0;
			this.backArrowElement.style.opacity = 0;
		}
	}

	getTitleElement(){
		return this.titleElement;
	}

	getTitleElementPosition(){
		return this._relativeToApp(this._getTextPosition(this.getTitleElement()));
	}

	getHiddenTitleElementPosition(){
		const appRect = this.page.app.getBoundingClientRect();
		const titleRect = this._getTextPosition(this.getTitleElement());
		return {
			left: appRect.right - (titleRect.right - titleRect.left),
			top: titleRect.top
		};
	}

	getBackTextElement(){
		return this.backTextElement;
	}

	getBackTextElementPosition(){
		return this._relativeToApp(this._getTextPosition(this.getBackTextElement()));
	}

	getHiddenBackTextElementPosition(){
		const backPos = this.getBackTextElementPosition();
		backPos.left -= 100;
		return backPos;
	}

	getBackArrowElement(){
		return this.backArrowElement;
	}

	getBackArrowElementPosition(){
		return this._getElementRect(this.getBackArrowElement());
	}

	getToolsElement(){
		return this.toolsContainerElement;
	}

	getToolsElementHTML(){
		return [...this.toolsContainerElement.children[0].assignedNodes()].map(i => i.outerHTML.trim()).join("\n");
	}

	getToolsElementPosition(){
		return this._relativeToApp(this._getElementRect(this.getToolsElement()));
	}

	onPageScroll(scrollTop) {}
}

class TitledTitlebar extends DefaultTitlebar{
	_bindPage(page){
		super._bindPage(page);
		this.addClass("titlebar-titled");

		this.page.header.innerHTML = `
			<div id="header-title-container">
				<div id="header-title">${this.page.title}</div>
			</div>
		`;
		this.titleHeaderElement = this.page.header.querySelector("#header-title");
		this.onPageScroll(0);

		this.backArrowOpacityFunc = (p) => this.headerPositionPercent < 1 ? (p * 2 - 1) : p;
	}

	getTitleElement(){
		return this.headerPositionPercent < 1 ? this.titleHeaderElement : super.getTitleElement();
	}

	getHiddenTitleElementPosition(){
		if(this.headerPositionPercent < 1){
			const titleRect = this.getTitleElementPosition();
			const appRect = this.page.app.getBoundingClientRect();
			return { left: titleRect.left + (appRect.right - appRect.left), top: titleRect.top };
		}
		return super.getHiddenTitleElementPosition();
	}

	onPageScroll(scrollTop) {
		const pos = this._getTextPosition(this.getTitleElement());
		const titlebar = this.getBoundingClientRect();

		var titleY = pos.bottom - 7;
		var titlebarY = titlebar.bottom - titlebar.top;
		this.headerPositionPercent = scrollTop / (titleY + scrollTop - titlebarY);

		this.backgroundElement.style.opacity = this.headerPositionPercent;
		this.titleElement.style.opacity = this.headerPositionPercent < 1 ? "0" : "";
		this.titleElement.style.visibility = this.headerPositionPercent < 1 ? "hidden" : "";
		if(this.page.prevPage == undefined){
			this.backArrowElement.style.scale = this.headerPositionPercent < 1 ? "0" : "1";
			this.backArrowElement.style.opacity = "0";
		}else {
			this.backArrowElement.style.scale = "";
			this.backArrowElement.style.opacity = "";
		}

		if(scrollTop < 0)
			this.titleHeaderElement.style.scale = Math.min(1.2, 1 + 0.2 * (scrollTop / -200));
		else this.titleHeaderElement.style.scale = ""
	}
}

class ImageTitlebar extends DefaultTitlebar {

	_bindPage(page){
		super._bindPage(page);
		this.addClass("titlebar-image");

		this.imageSrc = page.getAttribute("imageSrc") || "";
		
		this.imageHeaderElement = document.createElement("div");
		this.imageHeaderElement.id = `header-image`;
		this.imageHeaderElement.style.setProperty("--image-src", `url("${this.imageSrc}")`);

		this.page.header.appendChild(this.imageHeaderElement);
		this.onPageScroll(0);
	}

	onPageScroll(scrollTop) {
		this.imageHeaderElement.style.height = `calc(var(--i-image-header-height) - ${scrollTop - 10}px)`;
		
		this.headerPositionPercent = scrollTop / 200;

		const showBack = this.headerPositionPercent > 0.5;
		this.backArrowElement.classList.toggle("light", !showBack);
		this.backTextElement.style.opacity = showBack ? "" : "0";
		
		this.backgroundElement.style.opacity = this.headerPositionPercent;
		this.titleElement.style.opacity = this.headerPositionPercent;
		this.statusbarElement.style.opacity = this.headerPositionPercent;
	}
}

class IOSToolItem extends DefaultTitlebar {

	connectedCallback() {
		this.addEventListener("touchstart", e => {
			e.preventDefault();
			e.stopPropagation();
			this.classList.add("pressed");
		});
		this.addEventListener("touchend", e => {
			e.preventDefault();
			e.stopPropagation();
			this.classList.remove("pressed");
		});
	}
}

window.customElements.define('i-titlebar-root', IOSTitlebarRoot);
window.customElements.define('i-titlebar-default', DefaultTitlebar);
window.customElements.define('i-titlebar-titled', TitledTitlebar);
window.customElements.define('i-titlebar-image', ImageTitlebar);

window.customElements.define('i-tools-item', IOSToolItem);
﻿
class AppElement extends HTMLElement {

	connectedCallback() {
		this.innerHTML = `
			<div id="header">
				<div id="image" style="background-image: url('resources/image1.jpg');"></div>
			</div>
			<div id="body">
				<div id="app-about">
					<div id="app-title">Кошки и суп</div>
					<div id="app-description">Все с кошками</div>
				</div>
				<div id="action">
					<div id="button">ЗАГРУЗИТЬ</div>
				</div>
			</div>
			
		`;
	}
}

window.customElements.define('app-element', AppElement);

class IOSCheckbox extends HTMLElement {

	connectedCallback() {
		this.selected = false;
		var isMoved = false;

		this.addEventListener("touchstart", e => {
			e.preventDefault();
			this.startX = e.changedTouches[0].clientX;
			this.startY = e.changedTouches[0].clientY;
			this.classList.add("active");
			isMoved = false;
		});
		this.addEventListener("touchend", e => {
			e.preventDefault();
			this.classList.remove("active");
			if(!isMoved){
				this.selected = !this.selected;	
				if(this.selected)
					this.classList.add("selected");
				else
					this.classList.remove("selected");
			}
			this.#invokeEvent();
		});
		this.addEventListener("touchmove", e => {
			e.preventDefault();
			isMoved = true;
			if(Math.hypot(this.startX - e.changedTouches[0].clientX, this.startY - e.changedTouches[0].clientY) < 100)
				this.classList.add("active");
			else
				this.classList.remove("active");

			if(e.changedTouches[0].clientX > this.startX){
				this.selected = true;
				this.classList.add("selected");
			}else {
				this.selected = false;
				this.classList.remove("selected");
			}
		});
		this.addEventListener("click", e => {
			this.selected = !this.selected;
			if(this.selected)
				this.classList.add("selected");
			else
				this.classList.remove("selected");
			this.#invokeEvent();
		});
	}

	#invokeEvent(){
		console.log(this.selected);
	}
}

window.customElements.define('ios-checkbox', IOSCheckbox);
﻿
class HorizontallScroll extends HTMLElement {

	connectedCallback() {
		this.childNodes.forEach(node => {
			if(node.outerHTML === undefined)
				return;
			const wrapper = document.createElement("horizontal-scroll-element");
			wrapper.innerHTML = node.outerHTML;

			node.parentNode.replaceChild(wrapper, node);
		});
	}
}

class HorizontallScrollElement extends HTMLElement {}

window.customElements.define('horizontal-scroll', HorizontallScroll);
window.customElements.define('horizontal-scroll-element', HorizontallScrollElement);
﻿
class HorizontallTitledScroll extends HTMLElement {

	connectedCallback() {
		this.innerHTML = `
			<div id="head">
				<div id="head_left">
					<div id="title">Избранное</div>
					<div id="description">Подборка от редакторов</div>
				</div>
				<div id="head_right">
					<div id="more">См. все</div>
				</div>
			</div>
			<div id="blocks">${this.innerHTML}</div>
		`;
	}
}

class HorizontallTitledScrollElement extends HTMLElement {}

window.customElements.define('horizontal-titled-scroll', HorizontallTitledScroll);
﻿
class SearchBox extends HTMLElement {

	connectedCallback() {
		this.innerHTML += `
			<div id="search-icon">
				<svg-loader src="${this.getAttribute("icon")}"></svg-loader>
			</div>
			<input placeholder="${this.getAttribute("placeholder")}">
		`;
	}
}

window.customElements.define('search-box', SearchBox);
﻿
class TableView extends HTMLElement {
	connectedCallback() {
		this.attachShadow({mode: 'open'});
	    this.shadowRoot.innerHTML = `
	    	<style>
	    		slot[name=header] {
	    			
	    		}
	    		slot[name=footer] {

	    		}
	    	</style>

	    	<slot name="header"></slot>
	    	<slot id="content-slot"></slot>
	    	<slot name="footer"></slot>
	    `;
	}
}

class TableCell extends HTMLElement {

	connectedCallback() {
		this.attachShadow({mode: 'open'});
	    this.shadowRoot.innerHTML = `
	    	<style>
	    		#item {
	    			min-height: 33pt;
	    			display: flex;
	    			font-size: 17px;
	    			letter-spacing: -0.4px;
	    			font-weight: 400;
	    		}

	    		slot[name="icon"]{
	    			margin-left: 16px;
	    			display: flex;
	    			align-items: center;
	    		}

	    		#content {
	    			padding-right: 16px;
	    			border-bottom: 0.5px solid var(--border-color);
	    			display: flex;
	    			align-items: center;
	    			flex: 1;
	    			gap: 16px;
	    		}

	    		#content-slot {
	    			display: flex;
	    			flex: 1;
	    		}

	    		slot[name="detail"]{
	    			display: flex;
	    			align-items: center;
	    			color: var(--i-text-2);
	    			gap: 16px;
	    		}
	    	</style>
	    	<div id="item">
		        <slot name="icon"></slot>
		        <div id="content">
		        	<slot id="content-slot"></slot>
		        	<slot name="detail"></slot>
		        </div>
	      	</div>
	    `;
	    this.addClickEvents();

	    var decorators = [
			"chevron", () => new ChevronCellDecorator(),
			"switch", () => new SwitchCellDecorator(),
			"radio", () => new RadioCellDecorator(),
			"button", () => new ButtonCellDecorator()
		];
		for(var i = 0; i < decorators.length; i += 2){
			if(this.getAttributeNames().includes(decorators[i])){
				decorators[i + 1]().applyCell(this);
				break;
			}
		}
	}

	addClickEvents(){
		this.clickable = false;
		var shadowItem = this.shadowRoot.querySelector("#item");
	    this.addEventListener("touchstart", e => {
	    	if(this.clickable)
				this.classList.add("active");
		});
		this.addEventListener("touchend", e => {
			this.classList.remove("active");
		});
		this.addEventListener("click", e => {
			if(this.hasAttribute("nextPage"))
				openPage(this, this.getAttribute("nextPage"));
		});
	}

	getContent(){ return ""; }
}


class ChevronCellDecorator {
	applyCell(cell){
		cell.clickable = true;
		cell.shadowRoot.querySelector("#content").innerHTML += `
			<style>
				#arrow {
					color: var(--i-text-3);
				}
			</style>
			<svg id="arrow" width="8" height="32" viewBox="0 0 8 32" xmlns="http://www.w3.org/2000/svg">
				<path fill="currentColor" d="M7.84961 16.0068C7.84961 16.1507 7.82194 16.2835 7.7666 16.4053C7.71126 16.527 7.62549 16.646 7.50928 16.7622L2.53711 21.6846C2.35449 21.8672 2.13314 21.9585 1.87305 21.9585C1.60189 21.9585 1.37223 21.8672 1.18408 21.6846C0.995931 21.4964 0.901855 21.2695 0.901855 21.0039C0.901855 20.7383 1.00423 20.5031 1.20898 20.2983L5.56689 16.0068L1.20898 11.7153C1.00423 11.5106 0.901855 11.2754 0.901855 11.0098C0.901855 10.7441 0.995931 10.52 1.18408 10.3374C1.37223 10.1493 1.60189 10.0552 1.87305 10.0552C2.13314 10.0552 2.35449 10.1465 2.53711 10.3291L7.50928 15.2515C7.73617 15.4673 7.84961 15.7191 7.84961 16.0068Z"/>
			</svg>
		`;
	}
}

class SwitchCellDecorator {
	applyCell(cell){
		cell.innerHTML += `<ios-checkbox slot="detail"></ios-checkbox>`;
	}
}

class RadioCellDecorator {
	static groups = new Object();

	applyCell(cell){
		cell.clickable = true;
		cell.select = () => {
			RadioCellDecorator.groups[cell.groupName]?.shadowItem.classList.remove("selected");
			RadioCellDecorator.groups[cell.groupName] = cell;
			cell.shadowItem.classList.add("selected");
		};

		cell.groupName = cell.getAttribute("group");
		cell.shadowItem = cell.shadowRoot.querySelector("#item");
		if(cell.hasAttribute("selected"))
			cell.select();
		cell.addEventListener("click", e => {
			cell.select();
		});

		cell.shadowRoot.querySelector("#content").innerHTML += `
			<style>
				#check {
					display: none;
					color: var(--i-accent);
				}
				#item.selected #check {
					display: initial;
				}
			</style>
			<svg id="check" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
				<path fill="currentColor" d="M6.29004 15.4692C6.78255 15.4692 7.16162 15.2673 7.42725 14.8633L15.1968 2.84375C15.2909 2.69987 15.36 2.56152 15.4043 2.42871C15.4486 2.2959 15.4707 2.16309 15.4707 2.03027C15.4707 1.70378 15.3628 1.43538 15.147 1.2251C14.9312 1.01481 14.6545 0.909668 14.3169 0.909668C14.0845 0.909668 13.8908 0.956706 13.7358 1.05078C13.5809 1.13932 13.4315 1.29427 13.2876 1.51562L6.25684 12.6553L2.6543 8.08984C2.39421 7.76335 2.07324 7.6001 1.69141 7.6001C1.35384 7.6001 1.07438 7.70801 0.853027 7.92383C0.631673 8.13965 0.520996 8.41357 0.520996 8.74561C0.520996 8.89502 0.545898 9.0389 0.595703 9.17725C0.651042 9.31559 0.739583 9.45671 0.861328 9.60059L5.16113 14.8965C5.47103 15.2783 5.84733 15.4692 6.29004 15.4692Z"/>
			</svg>
		`;
	}
}

class ButtonCellDecorator {
	applyCell(cell){
		cell.clickable = true;
		cell.shadowRoot.querySelector("#content").innerHTML += `
			<style>
				#content-slot {
					justify-content: var(--justify-content);
				}
				#content {
					gap: var(--gap);
				}
			</style>
		`;
	}
}

window.customElements.define('table-view', TableView);
window.customElements.define('table-cell', TableCell);
﻿
class TitledImage extends HTMLElement {

	connectedCallback() {
		this.innerHTML = `
			<div id="l1">в поисках вдохновения</div>
			<div id="l2">April - Пазлы по номерам</div>
			<div id="l3">Собирайте необычные пазлы</div>
			<div id="auto-ratio">
				<img id="image" src="resources/image.jpg" onclick="document.querySelector('ios-app').showNewPage('pages/test')"/>
			</div>
		`;
	}
}

window.customElements.define('titled-image', TitledImage);
﻿
class VerticalList extends HTMLElement {

	connectedCallback() {
		
	}
}

window.customElements.define('vertical-list', VerticalList);

class SVGLoader extends HTMLElement {

	connectedCallback() {
		let src = this.getAttribute('src');
		let that = this;

		fetch(src).then(c => c.text())
		.then(content => {
			var newElement = document.createElement('template');
				newElement.innerHTML = content.trim();
				newElement = newElement.content.firstChild;
				
				for(var i= 0, atts = that.attributes; i < atts.length; i++)
					newElement.setAttribute(atts[i].nodeName, atts[i].nodeValue);

				that.parentNode.replaceChild(newElement, that);

				if(that.onSVGLoad)
					that.onSVGLoad(newElement);
		});
	}
}

window.customElements.define('svg-loader', SVGLoader);
