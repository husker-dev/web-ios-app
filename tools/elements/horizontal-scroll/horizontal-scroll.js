
class HorizontallScroll extends HTMLElement {

	connectedCallback() {
		console.log(this);
		this.childNodes.forEach(node => {
			if(node.outerHTML === undefined)
				return;
			const wrapper = document.createElement("div");
			wrapper.classList.add("horizontal-scroll-element");
			wrapper.innerHTML = node.outerHTML;

			node.parentNode.replaceChild(wrapper, node);
		});
	}
}

window.customElements.define('horizontal-scroll', HorizontallScroll);