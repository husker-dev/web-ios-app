

class HeadMenu extends HTMLElement {

	connectedCallback() {
		this.innerHTML = `
			<div id="statusbar"></div>
			<div id="controls">
				<div id="back">
					<svg-loader id="back-arrow" src="resources/arrow.svg"></svg-loader>
					<div id="back-text"></div>
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
		var that = this;
		var statusbar = this.querySelector("#statusbar");
		var backBlock = this.querySelector("#controls #back");
		var toolsBlock = this.querySelector("#controls #tools");

		this.controlsElement = this.querySelector("#controls");

		this.titleElement = this.querySelector("#controls #title");
		this.titleAnimElement = this.querySelector("#controls #title-anim");
		this.titleAnimElement1 = this.querySelector("#controls #title-anim1");

		this.backTextElement = this.querySelector("#controls #back #back-text");
		this.backTextAnimElement = this.querySelector("#controls #back-text-anim");
		this.backTextAnimElement1 = this.querySelector("#controls #back-text-anim1");

		backBlock.addEventListener("touchstart", e => {
			backBlock.classList.add("active");
		});
		backBlock.addEventListener("touchend", e => {
			backBlock.classList.remove("active");

			
		});
		backBlock.addEventListener("click", e => {
			// Go to previous page
			var page = that.app.selectedTabElement.selectedPage;
			if(page.prevPage === undefined)
				return;
			that.app.selectedTabElement.selectedPage = page.prevPage;
			that.app.animate((a) => that.app.animateTransition(page, 1 - a), 400, bezier(0.2, 0.8, 0.2, 1));
			setTimeout(() => {
				that.app.selectedTabElement.removeChild(page);
			}, 600);
		});

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
	}

	animateTransition(page, percent){
		if(page.tab != this.app.selectedTabElement)
			return;

		if(!this.backArrowElement)
			this.backArrowElement = this.querySelector("#controls #back svg#back-arrow");

		if(percent > 0 && percent < 1){
			this.titleElement.style.opacity = "0";
			this.titleAnimElement.style.opacity = "";
			this.titleAnimElement1.style.opacity = "";

			this.backTextElement.style.opacity = "0";

			this.backTextAnimElement.style.opacity = "";
			this.backTextAnimElement1.style.opacity = "";

			this.titleAnimElement.innerHTML = page.prevPage.manifest.title;
			this.titleAnimElement1.innerHTML = page.manifest.title;

			this.backTextAnimElement.innerHTML = page.prevPage?.manifest.title ?? "";
			this.backTextAnimElement1.innerHTML = page.prevPage?.prevPage?.manifest.title ?? "";
		}else {
			this.titleElement.style.opacity = "";
			this.titleAnimElement.style.opacity = "0";
			this.titleAnimElement1.style.opacity = "0";

			this.backTextElement.style.opacity = "";
			this.backArrowElement.style.opacity = percent == 0 ? (page.prevPage?.prevPage === undefined ? "0" : "") : (page.prevPage === undefined ? "0" : "");
			this.backTextAnimElement.style.opacity = "0";
			this.backTextAnimElement1.style.opacity = "0";

			this.titleElement.innerHTML = percent == 0 ? (page.prevPage?.manifest.title ?? "") : page.manifest.title;
			this.backTextElement.innerHTML = percent == 0 ? (page.prevPage?.prevPage?.manifest.title ?? "") : (page.prevPage?.manifest.title ?? "");

			return;
		}

		var fullStyle = getComputedStyle(this.controlsElement);
		var fullWidth = this.controlsElement.clientWidth - parseFloat(fullStyle.paddingLeft) - parseFloat(fullStyle.paddingRight);

		var backX = this.backTextElement.getBoundingClientRect().left - parseFloat(fullStyle.paddingLeft);
		
		var titleWidth = this.titleAnimElement.getBoundingClientRect().right - this.titleAnimElement.getBoundingClientRect().left;
		var titleWidth1 = this.titleAnimElement1.getBoundingClientRect().right - this.titleAnimElement1.getBoundingClientRect().left;
		var titleStartX = (fullWidth - titleWidth) / 2;
		var titleStartX1 = (fullWidth - titleWidth1) / 2;

		this.titleAnimElement.style.transform = `translateX(${backX + (titleStartX - backX) * (1 - percent)}px)`;
		this.titleAnimElement.style.opacity = 1 - percent * 2;

		this.titleAnimElement1.style.transform = `translateX(${titleStartX1 + titleStartX1 * (1 - percent)}px)`;
		this.titleAnimElement1.style.opacity = 1 - (1 - percent) * 2;

		this.backArrowElement.style.opacity = page.prevPage?.prevPage === undefined ? percent : "";
		this.backTextAnimElement.style.transform = `translateX(${backX + (titleStartX - backX) * (1 - percent)}px)`;
		this.backTextAnimElement.style.opacity = 1 - (1 - percent) * 2;

		// Back button text, shading to right
		var backTextAnimElement1X = backX - (titleStartX - backX) * percent;
		var clipX = parseInt(backX - 18 - backTextAnimElement1X);
		this.backTextAnimElement1.style.transform = `translateX(${backTextAnimElement1X}px)`;
		this.backTextAnimElement1.style.clipPath = `polygon(${clipX + 30}px 0, 100% 0, 100% 100%, ${clipX + 30}px 100%, ${clipX}px 50%)`;
		this.backTextAnimElement1.style.opacity = 1 - percent * 2;

	}
}

window.customElements.define('top-menu', HeadMenu);