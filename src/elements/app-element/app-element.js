
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