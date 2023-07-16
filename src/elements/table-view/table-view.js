
class TableView extends HTMLElement {
	connectedCallback() {
		this.attachShadow({mode: 'open'});
	    this.shadowRoot.innerHTML = `
	    	<style>
	    		slot[name=header] {
	    			
	    		}
	    		slot[name=footer] {

	    		}
	    	</style>

	    	<slot name="header"></slot>
	    	<slot id="content-slot"></slot>
	    	<slot name="footer"></slot>
	    `;
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