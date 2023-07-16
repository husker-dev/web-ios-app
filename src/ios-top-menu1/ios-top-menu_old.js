

class IOSTopMenu extends HTMLElement {

	connectedCallback() {
		var that = this;
		this.styles = Object();
		this.styles["default"] = (page) => new IOSTopMenuStyle(that, page);
		this.styles["titled"] = (page) => new TitledIOSTopMenuStyle(that, page);
		this.styles["image"] = (page) => new ImageIOSTopMenuStyle(that, page);

		this.innerHTML = `
			<div id="background" class="i-material-chrome"></div>
			<div id="container">
				<div id="statusbar"></div>
				<div id="controls-container">
					<div id="back-container">
						<svg id="back-arrow" width="12" height="20" viewBox="0 0 12 20" xmlns="http://www.w3.org/2000/svg">
							<path fill="currentColor" d="M0.610352 10.0068C0.615885 9.81315 0.654622 9.63607 0.726562 9.47559C0.798503 9.3151 0.90918 9.16016 1.05859 9.01074L9.37598 0.958984C9.61393 0.721029 9.90723 0.602051 10.2559 0.602051C10.4883 0.602051 10.6986 0.657389 10.8867 0.768066C11.0804 0.878743 11.2326 1.02816 11.3433 1.21631C11.4595 1.40446 11.5176 1.61475 11.5176 1.84717C11.5176 2.19027 11.3875 2.49186 11.1274 2.75195L3.60693 9.99854L11.1274 17.2534C11.3875 17.519 11.5176 17.8206 11.5176 18.1582C11.5176 18.3962 11.4595 18.6092 11.3433 18.7974C11.2326 18.9855 11.0804 19.1349 10.8867 19.2456C10.6986 19.3618 10.4883 19.4199 10.2559 19.4199C9.90723 19.4199 9.61393 19.2982 9.37598 19.0547L1.05859 11.0029C0.903646 10.8535 0.790202 10.6986 0.718262 10.5381C0.646322 10.3721 0.610352 10.195 0.610352 10.0068Z"/>
						</svg>
						<div id="back-text">&#160</div>
					</div>
					<div id="title"></div>
					<div id="tools-container"></div>
				</div>
				<div id="additional"></div>

				<!-- Ghost elements for transition animation -->
				<div id="title-anim" class="title-anim"></div>
				<div id="title-anim1" class="title-anim"></div>
				<div id="back-text-anim" class="back-text-anim"></div>
				<div id="back-text-anim1" class="back-text-anim"></div>
			</div>
		`;
		
		var backBlock = this.querySelector("#back-container");
		var toolsBlock = this.querySelector("#tools-container");

		this.backgroundElement = this.querySelector("#background");
		this.controlsElement = this.querySelector("#controls-container");

		this.titleElement = this.querySelector("#title");
		this.titleAnimElement = this.querySelector("#title-anim");
		this.titleAnimElement1 = this.querySelector("#title-anim1");

		this.backArrowElement = this.querySelector("#back-container #back-arrow");
		this.backTextElement = this.querySelector("#back-container #back-text");
		this.backTextAnimElement = this.querySelector("#back-text-anim");
		this.backTextAnimElement1 = this.querySelector("#back-text-anim1");

		backBlock.addEventListener("touchstart", e => {
			backBlock.classList.add("active");
		});
		backBlock.addEventListener("touchend", e => {
			backBlock.classList.remove("active");
		});
		backBlock.addEventListener("click", e => that.app.selectedTab.goToPreviousPage());

		// Controls
		var sizeUpdater = () => {
			toolsBlock.style.width = backBlock.style.width = "";
			const width1 = parseFloat(getComputedStyle(backBlock).width, 10);
			const width2 = parseFloat(getComputedStyle(toolsBlock).width, 10);

			toolsBlock.style.width = backBlock.style.width = Math.max(width1, width2);
		};
		sizeUpdater();
		new MutationObserver(sizeUpdater).observe(backBlock, { characterData: true, subtree: true, childList: true });
		new ResizeObserver(sizeUpdater).observe(backBlock);

		this.animation = {};
		this.tools = {
			setElementsOpacity: function(enabled, ...elements){
				for(const el of elements)
					if(el !== null) el.style.opacity = enabled ? "" : "0";
			},

			setElementsDisplay: function(enabled, ...elements){
				for(const el of elements)
					if(el !== null) el.style.display = enabled ? "" : "none";
			},

			setAnimationElementsVisibility: function(page, showAnimationElements){
				this.setElementsOpacity(!showAnimationElements,
					that.titleElement,
					page.prevPage?.header.getTitleElement() ?? null,
					that.backTextElement,
				);

				this.setElementsDisplay(showAnimationElements,
					that.titleAnimElement,
					that.titleAnimElement1,
					that.backTextAnimElement,
					that.backTextAnimElement1,
				);
			},

			getRelativeCoordinates: function(rect, parent){
				var parentRect = parent.getBoundingClientRect();
				var parentStyle = getComputedStyle(parent);

				return { 
					x: rect.left - parentRect.left - parseFloat(parentStyle.borderLeft), 
					y: rect.top - parentRect.top - parseFloat(parentStyle.borderTop)
				};
			},

			getTextCoordinates: function(element, text = null){
				var oldText = element.innerHTML;
				if(text != null) element.innerHTML = text;

				var range = document.createRange();
				range.setStart(element, 0);
				range.setEnd(element, 1);
				
				var rect = range.getBoundingClientRect();
				if(text != null) element.innerHTML = oldText;
				return rect;
			}
		};
	}

	bindApp(app){
		this.app = app;
		var that = this;
		app.addEventListener("page-created", e => {
			var page = e.detail.page;
			var headerName = page.manifest.header === undefined ? "default" : page.manifest.header;
			page.header = that.styles[headerName](page);

			page.addEventListener("scroll", scrollEvent => that.updateHeaderOpacity(page));
		});

		app.addEventListener("page-selected", e => {
			var page = e.detail.page;

			this.titleElement.innerHTML = page.manifest.title;
			this.backTextElement.innerHTML = page.prevPage?.manifest.title ?? "\u00a0";
			this.backArrowElement.style.opacity = page.prevPage === undefined ? "0" : "";
			this.updateHeaderOpacity(page);
		});

		app.addEventListener("transition-started", e => {
			var page = e.detail.page;
			this.animation.activePage = page;

			this.tools.setAnimationElementsVisibility(page, true);
			
			// Save titles style
			this.animation.oldTitleStyle = getComputedStyle(page.prevPage.header.getTitleElement());
			this.animation.newTitleStyle = getComputedStyle(this.backTextElement);
			this.animation.fontRatio = parseFloat(this.animation.newTitleStyle.fontSize) / parseFloat(this.animation.oldTitleStyle.fontSize);

			// Setting text to animation elements
			this.titleAnimElement1.innerHTML = page.manifest.title;
			this.titleAnimElement.innerHTML = page.prevPage?.manifest.title ?? "";
			this.titleAnimElement.style.fontSize = `${this.animation.oldTitleStyle.fontSize}`;
			this.titleAnimElement.style.fontWeight = `${this.animation.oldTitleStyle.fontWeight}`;
			this.titleAnimElement.style.letterSpacing = `${this.animation.oldTitleStyle.letterSpacing}`;

			this.backTextAnimElement1.innerHTML = page.prevPage?.prevPage?.manifest.title ?? "";
			this.backTextAnimElement.innerHTML = page.prevPage?.manifest.title ?? "";
			this.backTextAnimElement.style.fontSize = `${this.animation.newTitleStyle.fontSize}px`;

			// Pre-calculate positions
			this.animation.backTextPosition = this.tools.getRelativeCoordinates(
				this.tools.getTextCoordinates(this.backTextElement), 
				this.app);
			this.animation.titlePosOld = page.prevPage?.header.getTitlePosition() ?? { x: 0, y: 0};
			this.animation.titlePosNew = this.tools.getRelativeCoordinates(
				this.tools.getTextCoordinates(this.titleElement, page.manifest.title), 
				this);
		});

		app.addEventListener("transition-completed", e => {
			let page = e.detail.isEnd ? e.detail.page : e.detail.page.prevPage;

			this.tools.setAnimationElementsVisibility(e.detail.page, false);
			this.updateHeaderOpacity(page);

			this.titleElement.innerHTML = page.manifest.title;
			this.backTextElement.innerHTML = page.prevPage?.manifest.title ?? "\u00a0";

			this.backArrowElement.style.opacity = page.prevPage === undefined ? "0" : "";
		});

		app.addEventListener("transition", e => {
			var page = e.detail.page;
			var percent = e.detail.percent;
			if(page.tab != this.app.selectedTab || this.animation.activePage != page)
				return;

			var backTextPosition = this.animation.backTextPosition;
			var titlePosOld = this.animation.titlePosOld;
			var titlePosNew = this.animation.titlePosNew;
			var nPercent = 1 - percent;

			// Sliding to center title
			this.titleAnimElement.style.transform = `translate(${backTextPosition.x + (titlePosOld.x - backTextPosition.x) * nPercent}px, ${backTextPosition.y + (titlePosOld.y - backTextPosition.y) * nPercent}px) scale(${1 - (1 - this.animation.fontRatio) * percent})`;
			this.titleAnimElement.style.opacity = 1 - percent * 1.5;

			// Sliding to right title
			this.titleAnimElement1.style.transform = `translate(${titlePosNew.x + titlePosNew.x * nPercent}px, ${titlePosNew.y}px)`;
			this.titleAnimElement1.style.opacity = 1 - nPercent * 3;

			// Back arrow
			if(page.prevPage.header.isUsesYAxis()){
				this.backArrowElement.style.opacity = page.prevPage?.prevPage === undefined ? percent * 10 - 8 : "";
				this.backArrowElement.style.transform = `scale(${percent * 2 - 1})`;
			}else {
				this.backArrowElement.style.opacity = page.prevPage?.prevPage === undefined ? percent : "";
				this.backArrowElement.style.transform = "";
			}

			// Blue text sliding to center
			this.backTextAnimElement.style.transform = `translate(${backTextPosition.x + (titlePosOld.x - backTextPosition.x) * nPercent}px, ${backTextPosition.y + (titlePosOld.y - backTextPosition.y) * nPercent}px) scale(${1 + (1 - this.animation.fontRatio) * nPercent * 2})`;
			this.backTextAnimElement.style.opacity = 1 - nPercent * 1.5;

			// Blue text sliding to left
			var backTextAnimElement1X = backTextPosition.x - 100 * percent;
			var clipX = parseFloat(backTextPosition.x - 18 - backTextAnimElement1X);
			this.backTextAnimElement1.style.transform = `translate(${backTextAnimElement1X}px, ${titlePosNew.y}px)`;
			this.backTextAnimElement1.style.clipPath = `polygon(${clipX + 15}px 0, 100% 0, 100% 100%, ${clipX + 15}px 100%, ${clipX}px 50%)`;
			this.backTextAnimElement1.style.opacity = 1 - percent * 2;
		});
	}

	updateHeaderOpacity(page){
		// TODO: Header visibility by scrollTop value
		
		var scrollY = page.scrollTop;
		if(scrollY < page.header.getActiveHeight()){
			this.titleElement.style.opacity = "0";
			this.backgroundElement.style.opacity = "0";
		}else {
			this.titleElement.style.opacity = "1";
			this.backgroundElement.style.opacity = (scrollY - page.header.getActiveHeight()) / page.header.getTransitionSize();
		}
		page.header.scrollTopChanged(page.scrollTop);
	}
}

class IOSTopMenuStyle {

	constructor(menu, page){
		this.page = page;
		this.menu = menu;
		this.header = page.querySelector("#page-header");

		this.header.style.marginTop = "calc(var(--i-inset-top) + var(--i-top-menu-height))";
	}

	/*
	*	True if the title text may not be in the same plane as the title bar. 
	*	Used for different back arrow animation.
	*/
	isUsesYAxis(){
		return this.getTitleElement() != this.menu.titleElement;
	}

	/*
	*	Specifies from what point the title bar will transition to opacity 0
	*/
	getActiveHeight(){
		return 0;
	}

	/*
	*	Specifies how long the title bar will transition to opacity: 1
	*/
	getTransitionSize(){
		return 5;
	}

	/*
	*	Returns the title text element for the transition animation
	*/
	getTitleElement() {
		return this.menu.titleElement;
	}

	/*
	*	Returns the title text element position for the transition animation
	*/
	getTitlePosition() {
		var elementRect = this.menu.tools.getTextCoordinates(this.getTitleElement(), this.page.manifest.title);
		var appRect = this.menu.app.getBoundingClientRect();
		return { x: elementRect.left - appRect.left, y: elementRect.top - appRect.top };
	}

	/*
	* 	Called when page scrollTop is changed
	*/
	scrollTopChanged(scrollTop) {}
}

class TitledIOSTopMenuStyle extends IOSTopMenuStyle {

	constructor(menu, page){
		super(menu, page);
		
		this.header.innerHTML = `
			<style>
				#header-title {
					padding: 3px 16px 8px 16px;
					font-size: 34px;
					font-weight: 700;
				}
			</style>
			<div id="header-title">${page.manifest.title}</div>
		`;
		this.titleElement = this.header.querySelector("#header-title");
	}

	getActiveHeight() {
		return 30;
	}

	getTitleElement() {
		if(this.page.scrollTop >= this.getActiveHeight())
			return super.getTitleElement();
		return this.titleElement;
	}

	getTitlePosition() {
		if(this.page.scrollTop >= this.getActiveHeight())
			return super.getTitlePosition();
		var position = super.getTitlePosition();
		position.x += this.menu.getBoundingClientRect().left - this.page.getBoundingClientRect().left;
		return position;
	}
}

class ImageIOSTopMenuStyle extends IOSTopMenuStyle {

	constructor(menu, page){
		super(menu, page);
		
		this.header.innerHTML = `
			<style>
				#header-image-container {
					height: 160pt;
					overflow: hidden;

				}
				#header-image {
					background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 50%), url("resources/image.jpeg");
					background-size: cover;
    				background-position: center;
					height: 100%;
					width: 100%;
				}
			</style>
			<div id="header-image-container">
				<div id="header-image"></div>
			</div>
		`;
		this.imageElement = this.header.querySelector("#header-image");
		this.header.style.marginTop = "";
	}

	getActiveHeight() {
		return 1;
	}

	getTransitionSize(){
		return 160;
	}

	scrollTopChanged(scrollTop) {
		this.imageElement.style.marginTop = `${scrollTop/2}px`; 
	}
}

window.customElements.define('ios-top-menu', IOSTopMenu);