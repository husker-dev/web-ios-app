
class IOSCheckbox extends HTMLElement {

	connectedCallback() {
		this.selected = false;

		this.addEventListener("touchstart", e => {
			this.classList.add("active");
		});
		this.addEventListener("touchend", e => {
			this.classList.remove("active");
		});
		this.addEventListener("click", e => {
			this.selected = !this.selected;
			if(this.selected)
				this.classList.add("selected");
			else
				this.classList.remove("selected");
		});
	}
}

window.customElements.define('ios-checkbox', IOSCheckbox);