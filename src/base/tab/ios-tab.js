class IOSTab extends HTMLElement {

	static svgTemplate = `<svg width="26" height="28" viewBox="0 0 26 28" xmlns="http://www.w3.org/2000/svg"><path d="m13.118 14.831c0.433 0 1.257-0.024 1.795-0.344l9.151-4.057c0.869-0.59 1.051-1.255 1.067-1.773 0.02-0.662-0.313-1.634-1.181-2.15l-8.515-3.921c-0.537-0.309-2.096-0.552-2.529-0.552-0.444 0-1.958 0.42-2.496 0.73l-8.643 4.034c-0.85 0.602-1.022 1.284-0.951 1.942 0.098 0.887 0.206 0.857 0.889 1.503l9.577 4.212c0.537 0.32 1.391 0.376 1.836 0.376zm-0.12 5.467c0.403 0 1.443-0.068 1.928-0.345l8.858-3.991c0.497-0.3 1.448-1.117 1.382-1.952-0.091-1.138-0.598-1.7-0.948-1.906l-9.22 3.888c-0.454 0.261-1.417 0.478-1.916 0.478-0.542 0-1.539-0.228-1.766-0.362l-9.395-4.012c-0.462 0.022-1.174 0.911-1.201 1.642-0.03 0.761 0.7 1.62 1.135 1.839l9.408 4.384c0.485 0.278 1.322 0.337 1.735 0.337zm0.09 5.344c0.403 0 1.296-0.053 1.781-0.342l9.147-4.299c0.485-0.289 1.129-0.789 1.053-1.879-0.056-0.794-0.071-1.123-0.918-1.765l-9.203 4.113c-0.228 0.134-0.948 0.39-1.853 0.39-0.939 0-1.603-0.224-1.831-0.359l-9.451-4.017c-0.979 0.247-1.005 1.45-1.005 1.947 0 0.455 0.403 1.279 0.9 1.568l9.465 4.262c0.486 0.29 1.502 0.381 1.915 0.381z" fill="currentColor"/></svg>`;
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
		IOSApp.addStyleToShadow(this.shadowRoot);
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

				if(element.prevPage !== undefined)
					this.app._animateTransition(element, 600);
				this._setSelectedPage(element);
			}
		}))).observe(this, {childList: true});

		this.dispatchEvent(new CustomEvent("tab-created", { detail: { tab: this } }));

		if(this.getAttribute("page"))
			this.showNewPage(this.getAttribute("page"));
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