
class TableView extends HTMLElement {
	connectedCallback() {
		this.attachShadow({mode: 'open'});
		IOSApp.addStyleToShadow(this.shadowRoot);
	    this.shadowRoot.innerHTML += `
	    	<table-view-shadow>
		    	<div id="title">
		    		<div id="title-text">
		    			<slot name="title"></slot>
		    		</div>
		    		<div id="title-icon">
		    			<svg width="8" height="12" viewBox="0 0 8 12" xmlns="http://www.w3.org/2000/svg">
							<path d="M7.5166 6.00684C7.5166 6.15072 7.48893 6.28353 7.43359 6.40527C7.37826 6.52702 7.29248 6.646 7.17627 6.76221L2.2041 11.6846C2.02148 11.8672 1.80013 11.9585 1.54004 11.9585C1.26888 11.9585 1.03923 11.8672 0.851074 11.6846C0.662923 11.4964 0.568848 11.2695 0.568848 11.0039C0.568848 10.7383 0.671224 10.5031 0.875977 10.2983L5.23389 6.00684L0.875977 1.71533C0.671224 1.51058 0.568848 1.27539 0.568848 1.00977C0.568848 0.744141 0.662923 0.52002 0.851074 0.337402C1.03923 0.149251 1.26888 0.0551758 1.54004 0.0551758C1.80013 0.0551758 2.02148 0.146484 2.2041 0.329102L7.17627 5.25146C7.40316 5.46729 7.5166 5.71908 7.5166 6.00684Z" fill="currentColor"/>
						</svg>
		    		</div>
		    	</div>
		    	<div id="content-wrapper">
		    		<div id="content">
		    			<slot name="header"></slot>
				    	<slot id="content-slot"></slot>
				    	<slot name="footer"></slot>
		    		</div>
		    	</div>
	    	</table-view-shadow>
	    `;
	    this.titleSlot = this.shadowRoot.querySelector(`slot[name="title"]`);
	    this.titleElement = this.shadowRoot.querySelector(`#title`);
	    this.shadowElement = this.shadowRoot.querySelector(`table-view-shadow`);
	    this.titleSlot.addEventListener("slotchange", e => {
	    	this.shadowElement.classList.toggle("collapsable", this.titleSlot.assignedNodes().length > 0);
	    });

	    this.titleElement.addEventListener("click", e => {
	    	const collapsed = this.shadowElement.classList.contains("collapsed");
	    	this.shadowElement.style.setProperty("--full-height", this.shadowRoot.querySelector(`#content`).scrollHeight + "px");
	    	setTimeout(() => {
	    		this.shadowElement.classList.toggle("collapsed", !collapsed);
	    	}, 1);
	    });

	    this.shadowRoot.querySelector(`#content`).addEventListener("transitionend", (event) => {
	    	if(!this.shadowElement.classList.contains("collapsed"))
	    	this.shadowElement.style.removeProperty("--full-height");
	    });
	}

	animate(duration, draw, start = performance.now()) {
		const that = this;
		this.animationId = this.animationId || 0;
		const currentAnimId = ++this.animationId;
		requestAnimationFrame(function animate(time) {
			let timeFraction = Math.min((time - start) / duration, 1);
			draw(timeFraction);
			if (timeFraction < 1 && currentAnimId == that.animationId) requestAnimationFrame(animate);
  		});
	}
}

class TableCell extends HTMLElement {

	connectedCallback() {
		this.attachShadow({mode: 'open'});
	    this.shadowRoot.innerHTML = `
	    	<style>
	    		#item {
	    			min-height: 33pt;
	    			display: flex;
	    			font-size: 17px;
	    			letter-spacing: -0.4px;
	    			font-weight: 400;
	    		}

	    		slot[name="icon"]{
	    			margin-left: 16px;
	    			display: flex;
	    			align-items: center;
	    		}

	    		#content {
	    			padding-right: 16px;
	    			border-bottom: 0.5px solid var(--border-color);
	    			display: flex;
	    			align-items: center;
	    			flex: 1;
	    			gap: 16px;
	    		}

	    		#content-slot {
	    			display: flex;
	    			flex: 1;
	    		}

	    		slot[name="detail"]{
	    			display: flex;
	    			align-items: center;
	    			color: var(--i-text-2);
	    			gap: 16px;
	    		}
	    	</style>
	    	<div id="item">
		        <slot name="icon"></slot>
		        <div id="content">
		        	<slot id="content-slot"></slot>
		        	<slot name="detail"></slot>
		        </div>
	      	</div>
	    `;
	    this.addClickEvents();

	    var decorators = [
			"chevron", () => new ChevronCellDecorator(),
			"switch", () => new SwitchCellDecorator(),
			"radio", () => new RadioCellDecorator(),
			"button", () => new ButtonCellDecorator()
		];
		for(var i = 0; i < decorators.length; i += 2){
			if(this.getAttributeNames().includes(decorators[i])){
				decorators[i + 1]().applyCell(this);
				break;
			}
		}
	}

	addClickEvents(){
		this.clickable = false;
		var shadowItem = this.shadowRoot.querySelector("#item");
	    this.addEventListener("touchstart", e => {
	    	if(this.clickable)
				this.classList.add("active");
		});
		this.addEventListener("touchend", e => {
			this.classList.remove("active");
		});
		this.addEventListener("click", e => {
			if(this.hasAttribute("nextPage"))
				openPage(this, this.getAttribute("nextPage"));
		});
	}

	getContent(){ return ""; }
}


class ChevronCellDecorator {
	applyCell(cell){
		cell.clickable = true;
		cell.shadowRoot.querySelector("#content").innerHTML += `
			<style>
				#arrow {
					color: var(--i-text-3);
				}
			</style>
			<svg id="arrow" width="8" height="32" viewBox="0 0 8 32" xmlns="http://www.w3.org/2000/svg">
				<path fill="currentColor" d="M7.84961 16.0068C7.84961 16.1507 7.82194 16.2835 7.7666 16.4053C7.71126 16.527 7.62549 16.646 7.50928 16.7622L2.53711 21.6846C2.35449 21.8672 2.13314 21.9585 1.87305 21.9585C1.60189 21.9585 1.37223 21.8672 1.18408 21.6846C0.995931 21.4964 0.901855 21.2695 0.901855 21.0039C0.901855 20.7383 1.00423 20.5031 1.20898 20.2983L5.56689 16.0068L1.20898 11.7153C1.00423 11.5106 0.901855 11.2754 0.901855 11.0098C0.901855 10.7441 0.995931 10.52 1.18408 10.3374C1.37223 10.1493 1.60189 10.0552 1.87305 10.0552C2.13314 10.0552 2.35449 10.1465 2.53711 10.3291L7.50928 15.2515C7.73617 15.4673 7.84961 15.7191 7.84961 16.0068Z"/>
			</svg>
		`;
	}
}

class SwitchCellDecorator {
	applyCell(cell){
		cell.innerHTML += `<ios-checkbox slot="detail"></ios-checkbox>`;
	}
}

class RadioCellDecorator {
	static groups = new Object();

	applyCell(cell){
		cell.clickable = true;
		cell.select = () => {
			RadioCellDecorator.groups[cell.groupName]?.shadowItem.classList.remove("selected");
			RadioCellDecorator.groups[cell.groupName] = cell;
			cell.shadowItem.classList.add("selected");
			cell.dispatchEvent(new CustomEvent("change", { detail: { target: cell } }));
		};

		cell.groupName = cell.getAttribute("group");
		cell.shadowItem = cell.shadowRoot.querySelector("#item");
		if(cell.hasAttribute("selected"))
			cell.select();
		cell.addEventListener("click", e => {
			cell.select();
		});

		cell.shadowRoot.querySelector("#content").innerHTML += `
			<style>
				#check {
					display: none;
					color: var(--i-accent);
				}
				#item.selected #check {
					display: initial;
				}
			</style>
			<svg id="check" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
				<path fill="currentColor" d="M6.29004 15.4692C6.78255 15.4692 7.16162 15.2673 7.42725 14.8633L15.1968 2.84375C15.2909 2.69987 15.36 2.56152 15.4043 2.42871C15.4486 2.2959 15.4707 2.16309 15.4707 2.03027C15.4707 1.70378 15.3628 1.43538 15.147 1.2251C14.9312 1.01481 14.6545 0.909668 14.3169 0.909668C14.0845 0.909668 13.8908 0.956706 13.7358 1.05078C13.5809 1.13932 13.4315 1.29427 13.2876 1.51562L6.25684 12.6553L2.6543 8.08984C2.39421 7.76335 2.07324 7.6001 1.69141 7.6001C1.35384 7.6001 1.07438 7.70801 0.853027 7.92383C0.631673 8.13965 0.520996 8.41357 0.520996 8.74561C0.520996 8.89502 0.545898 9.0389 0.595703 9.17725C0.651042 9.31559 0.739583 9.45671 0.861328 9.60059L5.16113 14.8965C5.47103 15.2783 5.84733 15.4692 6.29004 15.4692Z"/>
			</svg>
		`;
	}
}

class ButtonCellDecorator {
	applyCell(cell){
		cell.clickable = true;
		cell.shadowRoot.querySelector("#content").innerHTML += `
			<style>
				#content-slot {
					justify-content: var(--justify-content);
				}
				#content {
					gap: var(--gap);
				}
			</style>
		`;
	}
}

window.customElements.define('table-view', TableView);
window.customElements.define('table-cell', TableCell);