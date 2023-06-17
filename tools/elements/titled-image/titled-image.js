
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