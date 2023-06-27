
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