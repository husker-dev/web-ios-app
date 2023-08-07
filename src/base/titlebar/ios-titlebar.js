

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
  		} while((element = element.offsetParent) !== this.page.app)
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
		addPointerListener(this, "down", e => {
			e.preventDefault();
			this.backContainerElement.classList.add("pressed");
		});
		addPointerListener(this, "up", e => {
			e.preventDefault();
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
			top: titleRect.top - appRect.top
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