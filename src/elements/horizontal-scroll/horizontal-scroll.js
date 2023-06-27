
class HorizontallScroll extends HTMLElement {

	connectedCallback() {
		this.childNodes.forEach(node => {
			if(node.outerHTML === undefined)
				return;
			const wrapper = document.createElement("horizontal-scroll-element");
			wrapper.innerHTML = node.outerHTML;

			node.parentNode.replaceChild(wrapper, node);
		});
	}
}

class HorizontallScrollElement extends HTMLElement {}

window.customElements.define('horizontal-scroll', HorizontallScroll);
window.customElements.define('horizontal-scroll-element', HorizontallScrollElement);