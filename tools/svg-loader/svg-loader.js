
class SVGLoader extends HTMLElement {

	connectedCallback() {
		let src = this.getAttribute('src');
		let that = this;

		var request = new XMLHttpRequest();
		request.open('GET', src);
		request.send(null);
		request.onreadystatechange = function() {
			if(request.readyState === 4 && request.status === 200) {
				var newElement = document.createElement('template');
				newElement.innerHTML = request.responseText.trim();
				newElement = newElement.content.firstChild;
				
				for(var i= 0, atts = that.attributes; i < atts.length; i++)
					newElement.setAttribute(atts[i].nodeName, atts[i].nodeValue);

				that.parentNode.replaceChild(newElement, that);
			}
		}
	}
}

window.customElements.define('svg-loader', SVGLoader);