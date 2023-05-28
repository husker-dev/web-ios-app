
class HorizontallTitledScroll extends HTMLElement {

	connectedCallback() {
		this.innerHTML = `
			<div id="head">
				<div id="head_left">
					<div id="title">Избранное</div>
					<div id="description">Подборка от редакторов</div>
				</div>
				<div id="head_right">
					<div id="more">См. все</div>
				</div>
			</div>
			<div id="blocks">${this.innerHTML}</div>
		`;
	}
}

class HorizontallTitledScrollElement extends HTMLElement {}

window.customElements.define('horizontal-titled-scroll', HorizontallTitledScroll);