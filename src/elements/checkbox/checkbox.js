
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
				if(this.selected)
					this.classList.add("selected");
				else
					this.classList.remove("selected");
			}
			this.#invokeEvent();
		});
		this.addEventListener("touchmove", e => {
			e.preventDefault();
			isMoved = true;
			if(Math.hypot(this.startX - e.changedTouches[0].clientX, this.startY - e.changedTouches[0].clientY) < 100)
				this.classList.add("active");
			else
				this.classList.remove("active");

			if(e.changedTouches[0].clientX > this.startX){
				this.selected = true;
				this.classList.add("selected");
			}else {
				this.selected = false;
				this.classList.remove("selected");
			}
		});
		this.addEventListener("click", e => {
			this.selected = !this.selected;
			if(this.selected)
				this.classList.add("selected");
			else
				this.classList.remove("selected");
			this.#invokeEvent();
		});
	}

	#invokeEvent(){
		console.log(this.selected);
	}
}

window.customElements.define('ios-checkbox', IOSCheckbox);