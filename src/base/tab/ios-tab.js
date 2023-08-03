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