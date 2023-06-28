

class IOSTopMenu extends HTMLElement {

	connectedCallback() {
		var that = this;
		this.styles = Object();
		this.styles["default"] = (page) => new IOSTopMenuStyle(that, page);
		this.styles["titled"] = (page) => new TitledIOSTopMenuStyle(that, page);

		this.innerHTML = `
			<div id="background"></div>
			<div id="statusbar"></div>
			<div id="controls">
				<div id="back">
					<svg id="back-arrow" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512">
						<path fill="currentColor" d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/>
					</svg>
					<div id="back-text">&#160</div>
				</div>
				<div id="title"></div>
				<div id="tools"></div>

				<!-- Ghost elements for transition animation -->
				<div id="title-anim" class="title-anim"></div>
				<div id="title-anim1" class="title-anim"></div>

				<div id="back-text-anim" class="back-text-anim"></div>
				<div id="back-text-anim1" class="back-text-anim"></div>
			</div>
			<div id="additional"></div>
		`;
		
		var backBlock = this.querySelector("#controls #back");
		var toolsBlock = this.querySelector("#controls #tools");

		this.controlsElement = this.querySelector("#controls");

		this.titleElement = this.querySelector("#controls #title");
		this.titleAnimElement = this.querySelector("#controls #title-anim");
		this.titleAnimElement1 = this.querySelector("#controls #title-anim1");

		this.backArrowElement = this.querySelector("#controls #back #back-arrow");
		this.backTextElement = this.querySelector("#controls #back #back-text");
		this.backTextAnimElement = this.querySelector("#controls #back-text-anim");
		this.backTextAnimElement1 = this.querySelector("#controls #back-text-anim1");

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
			setElementsOpacity: function(isEnabled, ...elements){
				for(var i = 0; i < elements.length; i++)
					if(elements[i] !== null)
						elements[i].style.opacity = isEnabled ? "" : "0";
			},

			setAnimationElementsVisibility: function(page, showAnimationElements){
				this.setElementsOpacity(!showAnimationElements,
					that.titleElement,
					page.prevPage?.header.getTitleElement() ?? null,
					that.backTextElement,
				);
				this.setElementsOpacity(showAnimationElements,
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
		});

		app.addEventListener("transition-started", e => {
			var page = e.detail.page;
			this.animation.activePage = page;
			this.tools.setAnimationElementsVisibility(page, true);

			// Setting text to animation elements
			this.titleAnimElement.innerHTML = page.prevPage?.manifest.title ?? "";
			this.titleAnimElement1.innerHTML = page.manifest.title;
			this.backTextAnimElement.innerHTML = page.prevPage?.manifest.title ?? "";
			this.backTextAnimElement1.innerHTML = page.prevPage?.prevPage?.manifest.title ?? "";

			// Pre-calculate positions
			this.animation.backTextPosition = this.tools.getRelativeCoordinates(
				this.tools.getTextCoordinates(this.backTextElement), 
				this.app);
			this.animation.titlePosOld = page.prevPage?.header.getTitlePosition() ?? { x: 0, y: 0};
			this.animation.titlePosNew = this.tools.getRelativeCoordinates(
				this.tools.getTextCoordinates(this.titleElement, page.manifest.title), 
				this);

			// Save title font sizes
			this.animation.fontSizeOld = page.prevPage !== undefined ? parseFloat(getComputedStyle(page.prevPage.header.getTitleElement()).fontSize) : 0;
			this.animation.fontSizeNew = parseFloat(getComputedStyle(this.backTextElement).fontSize);
		});

		app.addEventListener("transition-completed", e => {
			var page = e.detail.page;
			var isEnd = e.detail.isEnd;
			if(this.animation.activePage != page)
				return
			this.tools.setAnimationElementsVisibility(page, false);

			this.titleElement.innerHTML = isEnd ? page.manifest.title : (page.prevPage?.manifest.title ?? "");
			this.backTextElement.innerHTML = isEnd ? (page.prevPage?.manifest.title ?? "\u00a0") : (page.prevPage?.prevPage?.manifest.title ?? "\u00a0");

			this.backArrowElement.style.opacity = isEnd ? (page.prevPage === undefined ? "0" : "") : (page.prevPage?.prevPage === undefined ? "0" : "");
		});

		app.addEventListener("transition", e => {
			var page = e.detail.page;
			var percent = e.detail.percent;
			if(page.tab != this.app.selectedTab || this.animation.activePage != page)
				return;

			var backTextPosition = this.animation.backTextPosition;
			var titlePosOld = this.animation.titlePosOld;
			var titlePosNew = this.animation.titlePosNew;

			var fontSizeOld = this.animation.fontSizeOld;
			var fontSizeNew = this.animation.fontSizeNew;
			var nPercent = 1 - percent;

			// Sliding to center title
			this.titleAnimElement.style.transform = `translate(${backTextPosition.x + (titlePosOld.x - backTextPosition.x) * nPercent}px, ${backTextPosition.y + (titlePosOld.y - backTextPosition.y) * nPercent}px) scale(${1 - (1 - fontSizeNew / fontSizeOld) * percent})`;
			this.titleAnimElement.style.fontSize = `${fontSizeOld}px`;
			this.titleAnimElement.style.opacity = 1 - percent * 1.5;

			// Sliding to right title
			this.titleAnimElement1.style.transform = `translate(${titlePosNew.x + titlePosNew.x * nPercent}px, ${titlePosNew.y}px)`;
			this.titleAnimElement1.style.opacity = 1 - nPercent * 3;

			// Back arrow
			if(page.prevPage.header.useYAxis){
				this.backArrowElement.style.opacity = page.prevPage?.prevPage === undefined ? percent * 10 - 8 : "";
				this.backArrowElement.style.transform = `scale(${percent * 2 - 1})`;
			}else {
				this.backArrowElement.style.opacity = page.prevPage?.prevPage === undefined ? percent : "";
				this.backArrowElement.style.transform = "";
			}

			// Blue text sliding to center
			this.backTextAnimElement.style.transform = `translate(${backTextPosition.x + (titlePosOld.x - backTextPosition.x) * nPercent}px, ${backTextPosition.y + (titlePosOld.y - backTextPosition.y) * nPercent}px) scale(${1 + (1 - fontSizeNew / fontSizeOld) * nPercent * 2})`;
			this.backTextAnimElement.style.fontSize = `${fontSizeNew}px`;
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
	}
}

class IOSTopMenuStyle {
	useYAxis = false;
	triggerY = 0;
	triggerSize = 5;

	constructor(menu, page){
		this.page = page;
		this.menu = menu;
		this.header = page.querySelector("#page-header");

		this.header.style.paddingTop = "calc(env(safe-area-inset-top) + 44px)";
	}

	getTitleElement() {
		return this.menu.titleElement;
	}

	getTitlePosition() {
		var elementRect = this.menu.tools.getTextCoordinates(this.getTitleElement(), this.page.manifest.title);
		var appRect = this.menu.app.getBoundingClientRect();
		return { x: elementRect.left - appRect.left, y: elementRect.top - appRect.top };
	}
}

class TitledIOSTopMenuStyle extends IOSTopMenuStyle {
	useYAxis = true;
	triggerY = 50;

	constructor(menu, page){
		super(menu, page);
		
		this.header.style.paddingTop = "env(safe-area-inset-top)";
		this.header.innerHTML = `
			<style>
				#header-title {
					padding-top: 44px;
					padding-left: 12pt;
					font-size: 24pt;
					font-weight: bold;
				}
			</style>
			<div id="header-title">${page.manifest.title}</div>
		`;
		this.titleElement = this.header.querySelector("#header-title");
	}

	getTitleElement() {
		return this.titleElement;
	}

	getTitlePosition() {
		var position = super.getTitlePosition();
		position.x += this.menu.getBoundingClientRect().left - this.page.getBoundingClientRect().left;
		return position;
	}
}

window.customElements.define('ios-top-menu', IOSTopMenu);