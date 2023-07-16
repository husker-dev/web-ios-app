

class IOSTopMenu extends HTMLElement {

	connectedCallback() {
		let that = this;
		this.tab = this.parentElement;
		this.animation = {};

		this.innerHTML = `
			<div id="anim-title-1" class="anim-element"></div>
			<div id="anim-title-2" class="anim-element"></div>
			<div id="anim-back-1" class="anim-element"></div>
			<div id="anim-back-2" class="anim-element"></div>
			<svg id="anim-back-arrow" class="anim-element" width="12" height="20" viewBox="0 0 12 20" xmlns="http://www.w3.org/2000/svg">
				<path fill="currentColor" d="M0.610352 10.0068C0.615885 9.81315 0.654622 9.63607 0.726562 9.47559C0.798503 9.3151 0.90918 9.16016 1.05859 9.01074L9.37598 0.958984C9.61393 0.721029 9.90723 0.602051 10.2559 0.602051C10.4883 0.602051 10.6986 0.657389 10.8867 0.768066C11.0804 0.878743 11.2326 1.02816 11.3433 1.21631C11.4595 1.40446 11.5176 1.61475 11.5176 1.84717C11.5176 2.19027 11.3875 2.49186 11.1274 2.75195L3.60693 9.99854L11.1274 17.2534C11.3875 17.519 11.5176 17.8206 11.5176 18.1582C11.5176 18.3962 11.4595 18.6092 11.3433 18.7974C11.2326 18.9855 11.0804 19.1349 10.8867 19.2456C10.6986 19.3618 10.4883 19.4199 10.2559 19.4199C9.90723 19.4199 9.61393 19.2982 9.37598 19.0547L1.05859 11.0029C0.903646 10.8535 0.790202 10.6986 0.718262 10.5381C0.646322 10.3721 0.610352 10.195 0.610352 10.0068Z"/>
			</svg>
		`;
		this.title1 = this.querySelector("#anim-title-1");
		this.title2 = this.querySelector("#anim-title-2");
		this.back1 = this.querySelector("#anim-back-1");
		this.back2 = this.querySelector("#anim-back-2");
		this.backArrow = this.querySelector("#anim-back-arrow");

		this.tab.addEventListener("page-created", e => {
			let page = e.detail.page;
			page.header = document.createElement("ios-top-menu-instance");
			page.appendChild(page.header);
		});

		this.tab.app.addEventListener("transition-started", e => {
			if(!this.tab.classList.contains("selected-tab"))
				return;
			let page = e.detail.page;
			this.animation.started = true;

			let oldHeader = page.prevPage.header.headerStyle;
			let newHeader = page.header.headerStyle;

			this._switchElementsVisibility(page, false);
			this.animation.oldTitleStyle = getComputedStyle(oldHeader.getTitleElement());
			this.animation.newTitleStyle = getComputedStyle(newHeader.getTitleElement());
			this.animation.oldBackTextStyle = getComputedStyle(oldHeader.getBackTextElement());
			this.animation.newBackTextStyle = getComputedStyle(newHeader.getBackTextElement());
			this.animation.oldBackArrowStyle = getComputedStyle(oldHeader.getBackArrowElement());
			this.animation.newBackArrowStyle = getComputedStyle(newHeader.getBackArrowElement());

			this.animation.oldTitleOpacity = this.animation.oldTitleStyle.opacity;
			this.animation.newTitleOpacity = this.animation.newTitleStyle.opacity;
			this.animation.oldBackTextOpacity = this.animation.oldBackTextStyle.opacity;
			this.animation.newBackTextOpacity = this.animation.newBackTextStyle.opacity;
			this.animation.oldBackArrowOpacity = this.animation.oldBackArrowStyle.opacity;
			this.animation.newBackArrowOpacity = this.animation.newBackArrowStyle.opacity;

			this.title1.innerHTML = oldHeader.getTitleElement().innerHTML;
			this.title2.innerHTML = newHeader.getTitleElement().innerHTML;
			this.back1.innerHTML = oldHeader.getBackTextElement().innerHTML;
			this.back2.innerHTML = newHeader.getBackTextElement().innerHTML;

			this._cloneTextStyle(this.title1, this.animation.oldTitleStyle);
			this._cloneTextStyle(this.title2, this.animation.newTitleStyle);
			this._cloneTextStyle(this.back1, this.animation.oldBackTextStyle);
			this._cloneTextStyle(this.back2, this.animation.newBackTextStyle);
			this._cloneTextStyle(this.backArrow, getComputedStyle(newHeader.getBackArrowElement()));
			
			this._switchElementsVisibility(page, true);
		});

		this.tab.app.addEventListener("transition-completed", e => {
			if(!this.tab.classList.contains("selected-tab"))
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
		let oldHeader = page.prevPage.header.headerStyle;
		let newHeader = page.header.headerStyle;

		let title1Position = oldHeader.getTitleElementPosition();
		let title2Position = newHeader.getTitleElementPosition();
		let back1Position = oldHeader.getBackTextElementPosition();
		let back2Position = newHeader.getBackTextElementPosition();
		let hiddenTitlePosition = newHeader.getHiddenTitleElementPosition();

		this._percent_Translate(this.title1, title1Position, back2Position, percent);
		this._percent_Translate(this.back2, title1Position, back2Position, percent);
		this._percent_Translate(this.title2, hiddenTitlePosition, title2Position, percent);
		this.back1.style.translate = `${back1Position.left - 100 * percent}px ${back1Position.top}px`;
		this._percent_Translate(this.backArrow, newHeader.getBackArrowElementPosition(), oldHeader.getBackArrowElementPosition(), percent);

		this._percent_Opacity(this.title1, this.animation.oldTitleOpacity, 0, percent * 1.7);
		this._percent_Opacity(this.title2, this.animation.newTitleOpacity, 0, (1 - percent) * 1.5);
		this._percent_Opacity(this.back1, this.animation.oldBackTextOpacity, 0, percent * 2);
		this._percent_Opacity(this.back2, this.animation.newBackTextOpacity, 0, (1 - percent) * 1.7);
		this._percent_Opacity(this.backArrow, this.animation.oldBackArrowOpacity, this.animation.newBackArrowOpacity, oldHeader.backArrowOpacityFunc(percent));

		this._percent_FontScale(this.title1, this.animation.oldTitleStyle, this.animation.newBackTextStyle, percent);
		this._percent_FontScale(this.back2, this.animation.newBackTextStyle, this.animation.oldTitleStyle, 1 - percent);

		this._percent_fontWeight(this.title1, this.animation.newBackTextStyle, this.animation.oldTitleStyle, 1 - percent);
		this._percent_fontWeight(this.back2, this.animation.newBackTextStyle, this.animation.oldTitleStyle, 1 - percent);

		this._percent_Scale(this.backArrow, this.animation.oldBackArrowStyle, this.animation.newBackArrowStyle, percent);
	}

	_percent_Translate(element, from, to, percent){
		element.style.translate = `${from.left + (to.left - from.left) * percent}px ${from.top + (to.top - from.top) * percent}px`;
	}

	_percent_fontWeight(element, fromStyle, toStyle, percent){
		const from = parseFloat(fromStyle.fontWeight);
		const to = parseFloat(toStyle.fontWeight);
		element.style.fontWeight = `${from - (from - to) * percent}`;
	}

	_percent_Opacity(element, from, to, percent){
		element.style.opacity = from - (from - to) * percent;
	}

	_percent_FontScale(element, fromStyle, toStyle, percent){
		const fontRatio = parseFloat(toStyle.fontSize) / parseFloat(fromStyle.fontSize);
		element.style.scale = 1 - (1 - fontRatio) * percent;
	}

	_percent_Scale(element, fromStyle, toStyle, percent){
		const from = fromStyle.scale == "none" ? 1 : fromStyle.scale;
		const to = toStyle.scale == "none" ? 1 : toStyle.scale;
		element.style.scale = from - (from - to) * percent;
	}

	_cloneTextStyle(element, style){
		element.style.color = style.color;
		element.style.fontSize = style.fontSize;
		element.style.fontWeight = style.fontWeight;
		element.style.letterSpacing = style.letterSpacing;
	}

	_switchElementsVisibility(page, isVisible){
		const className = "top-menu-anim-invisible";
		[ 
			this.title1, this.title2, this.back1, this.back2, this.backArrow
		].forEach(e => isVisible ? e.classList.remove(className) : e.classList.add(className));
		if(page != null){
			const oldHeader = page.prevPage.header.headerStyle;
			const newHeader = page.header.headerStyle;
			[
				oldHeader.getTitleElement(),
				newHeader.getTitleElement(),
				oldHeader.getBackTextElement(),
				newHeader.getBackTextElement(),
				oldHeader.getBackArrowElement(),
				newHeader.getBackArrowElement()
			].forEach(e => isVisible ? e.classList.add(className) : e.classList.remove(className));
		}
	}
}

class IOSTopMenuInstance extends HTMLElement {

	static styles = [
		"default", (p) => new HeaderStyle(p),
		"titled", (p) => new TitledHeaderStyle(p),
		"image", (p) => new ImageHeaderStyle(p)
	];

	connectedCallback() {
		this.page = this.parentElement;

		for(let i = 0; i < IOSTopMenuInstance.styles.length; i+=2)
			if(this.page.manifest.header == IOSTopMenuInstance.styles[i])
				this.headerStyle = IOSTopMenuInstance.styles[i + 1](this.page);
		if(this.headerStyle === undefined)
			this.headerStyle = new HeaderStyle(this.page);
	}
}

class HeaderStyle {
	constructor(page){
		this.page = page;
		this.header = page.header;
		this.pageHeader = page.querySelector("#page-header");

		this.header.innerHTML += `
			<div id="content-container">
				<div id="statusbar"></div>
				<div id="controls-container">
					<div id="back-container">
						<div id="back-arrow">
							<svg viewBox="0 0 12 20" xmlns="http://www.w3.org/2000/svg">
								<path fill="currentColor" d="M0.610352 10.0068C0.615885 9.81315 0.654622 9.63607 0.726562 9.47559C0.798503 9.3151 0.90918 9.16016 1.05859 9.01074L9.37598 0.958984C9.61393 0.721029 9.90723 0.602051 10.2559 0.602051C10.4883 0.602051 10.6986 0.657389 10.8867 0.768066C11.0804 0.878743 11.2326 1.02816 11.3433 1.21631C11.4595 1.40446 11.5176 1.61475 11.5176 1.84717C11.5176 2.19027 11.3875 2.49186 11.1274 2.75195L3.60693 9.99854L11.1274 17.2534C11.3875 17.519 11.5176 17.8206 11.5176 18.1582C11.5176 18.3962 11.4595 18.6092 11.3433 18.7974C11.2326 18.9855 11.0804 19.1349 10.8867 19.2456C10.6986 19.3618 10.4883 19.4199 10.2559 19.4199C9.90723 19.4199 9.61393 19.2982 9.37598 19.0547L1.05859 11.0029C0.903646 10.8535 0.790202 10.6986 0.718262 10.5381C0.646322 10.3721 0.610352 10.195 0.610352 10.0068Z"/>
							</svg>
						</div>
						<div id="back-text">${page.prevPage?.manifest.title ?? "-"}</div>
					</div>
					<div id="title">${page.manifest.title}</div>
					<div id="tools-container">Tools</div>
				</div>
			</div>
			<div id="background" class="i-material-chrome"></div>
		`;
		this.pageHeader.style.paddingTop = "calc(var(--i-inset-top) + var(--i-top-menu-height))";
		this.titleElement = this.header.querySelector("#title");
		this.backContainerElement = this.header.querySelector("#back-container");
		this.backTextElement = this.header.querySelector("#back-text");
		this.backArrowElement = this.header.querySelector("#back-arrow");
		this.backgroundElement = this.header.querySelector("#background");

		this.page.scroll.addEventListener("scroll", e => this.onPageScroll(page.scroll.scrollTop));

		if(this.page.prevPage === undefined){
			this.backTextElement.style.opacity = 0;
			this.backArrowElement.style.opacity = 0;
		}

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
		let rect = { left: 0, top: 0 };
  		do {
		    rect.left += element.offsetLeft;
		    rect.top += element.offsetTop;
  		} while(element = element.offsetParent)
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

	getBackArrowElement(){
		return this.backArrowElement;
	}

	getBackArrowElementPosition(){
		return this._getElementRect(this.getBackArrowElement());
	}

	onPageScroll(scrollTop) {}
}

class TitledHeaderStyle extends HeaderStyle{
	constructor(page){
		super(page);
		
		this.pageHeader.innerHTML = `
			<style>
				#header-title {
					padding: 3px 16px 8px 16px;
					font-size: 34px;
					font-weight: 700;
				}
			</style>
			<div id="header-title">${this.page.manifest.title}</div>
		`;
		this.titleHeaderElement = this.pageHeader.querySelector("#header-title");
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
		const header = this.header.getBoundingClientRect();

		var titleY = pos.bottom - 7 + scrollTop;
		var headerY = header.bottom - header.top;
		this.headerPositionPercent = 1 - (titleY - headerY - scrollTop) / (titleY - headerY);
		
		this.backgroundElement.style.opacity = this.headerPositionPercent;
		this.titleElement.style.opacity = this.headerPositionPercent < 1 ? "0" : "";
		if(this.page.prevPage == undefined){
			this.backArrowElement.style.scale = this.headerPositionPercent < 1 ? "0" : "1";
			this.backArrowElement.style.opacity = "0";
		}else {
			this.backArrowElement.style.scale = "";
			this.backArrowElement.style.opacity = "";
		}
	}
}

class ImageHeaderStyle extends HeaderStyle{
	constructor(page){
		super(page);
		
		this.imageHeaderElement = document.createElement("div");
		this.imageHeaderElement.id = `header-image`;

		this.arrowHeaderElement = document.createElement("div");
		this.arrowHeaderElement.id = `header-arrow`;
		this.arrowHeaderElement.innerHTML = `
			<svg width="12" height="20" viewBox="0 0 12 20" xmlns="http://www.w3.org/2000/svg">
				<path fill="currentColor" d="M0.610352 10.0068C0.615885 9.81315 0.654622 9.63607 0.726562 9.47559C0.798503 9.3151 0.90918 9.16016 1.05859 9.01074L9.37598 0.958984C9.61393 0.721029 9.90723 0.602051 10.2559 0.602051C10.4883 0.602051 10.6986 0.657389 10.8867 0.768066C11.0804 0.878743 11.2326 1.02816 11.3433 1.21631C11.4595 1.40446 11.5176 1.61475 11.5176 1.84717C11.5176 2.19027 11.3875 2.49186 11.1274 2.75195L3.60693 9.99854L11.1274 17.2534C11.3875 17.519 11.5176 17.8206 11.5176 18.1582C11.5176 18.3962 11.4595 18.6092 11.3433 18.7974C11.2326 18.9855 11.0804 19.1349 10.8867 19.2456C10.6986 19.3618 10.4883 19.4199 10.2559 19.4199C9.90723 19.4199 9.61393 19.2982 9.37598 19.0547L1.05859 11.0029C0.903646 10.8535 0.790202 10.6986 0.718262 10.5381C0.646322 10.3721 0.610352 10.195 0.610352 10.0068Z"/>
			</svg>
		`;

		this.imageHeaderStyle = document.createElement("style");
		this.imageHeaderStyle.innerHTML = `
			#header-image{
				width: 100%;
				display: flex;
				position: absolute;
				background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100px), url("/player/example/resources/image1.jpg");
				background-position: center;
				background-size: cover;
				pointer-events: none;
			}
			#header-arrow{
				opacity: 0.8;
				width: 15px;
				height: 15px;
				padding: 7px 8px 7px 6px;
				left: 20px;
				top: calc(8px + var(--i-inset-top));
				border-radius: 100px;
				display: flex;
				z-index: 1;
				position: absolute;
				background: var(--i-white);
				color: var(--i-grey);
			}

			#header-arrow svg{
				width: 100%;
				height: 100%;
			}
		`;

		this.header.appendChild(this.imageHeaderElement);
		this.header.appendChild(this.arrowHeaderElement);
		this.header.appendChild(this.imageHeaderStyle);
		
		this.pageHeader.style.paddingTop = "200px";
		this.onPageScroll(0);
	}

	onPageScroll(scrollTop) {
		this.imageHeaderElement.style.height = `${200 - scrollTop}px`;
		
		this.headerPositionPercent = scrollTop / 200;
		
		this.backgroundElement.style.opacity = this.headerPositionPercent;
		this.titleElement.style.opacity = this.headerPositionPercent;
		this.backTextElement.style.opacity = this.headerPositionPercent;
		this.backArrowElement.style.opacity = this.headerPositionPercent;
	}
}

window.customElements.define('ios-top-menu', IOSTopMenu);
window.customElements.define('ios-top-menu-instance', IOSTopMenuInstance);