
class IOSCheckbox extends HTMLElement {

	connectedCallback() {
		this.selected = false;
		var isMoved = false;

		this.addEventListener("touchstart", e => {
			e.preventDefault();
			this.startX = e.changedTouches[0].clientX;
			this.startY = e.changedTouches[0].clientY;
			this.classList.add("active");
			isMoved = false;
		});
		this.addEventListener("touchend", e => {
			e.preventDefault();
			this.classList.remove("active");
			if(!isMoved){
				this.selected = !this.selected;	
				this.classList.toggle("selected", this.selected);
			}
			this.#invokeEvent();
		});
		this.addEventListener("touchmove", e => {
			e.preventDefault();
			isMoved = true;
			this.classList.toggle("active", 
				Math.hypot(this.startX - e.changedTouches[0].clientX, this.startY - e.changedTouches[0].clientY) < 100);

			this.selected = e.changedTouches[0].clientX > this.startX;
			this.classList.toggle("selected", this.selected);
		});
		this.addEventListener("click", e => {
			this.selected = !this.selected;
			this.classList.toggle("selected", this.selected);
			this.#invokeEvent();
		});
	}

	#invokeEvent(){
		this.dispatchEvent(new CustomEvent("change", { detail: { target: this } }));
	}
}

window.customElements.define('ios-checkbox', IOSCheckbox);