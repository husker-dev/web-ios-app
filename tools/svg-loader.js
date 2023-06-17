
class SVGLoader extends HTMLElement {

	connectedCallback() {
		let src = this.getAttribute('src');
		let that = this;

		fetch(src).then(c => c.text())
		.then(content => {
			var newElement = document.createElement('template');
				newElement.innerHTML = content.trim();
				newElement = newElement.content.firstChild;
				
				for(var i= 0, atts = that.attributes; i < atts.length; i++)
					newElement.setAttribute(atts[i].nodeName, atts[i].nodeValue);

				that.parentNode.replaceChild(newElement, that);
		});
	}
}

window.customElements.define('svg-loader', SVGLoader);