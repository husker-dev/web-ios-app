
class ListTable extends HTMLElement {
	connectedCallback() {}
}

class EmptyListItem extends HTMLElement {

	connectedCallback() {
		this.attachShadow({mode: 'open'});
	    this.shadowRoot.innerHTML = `
	    	<style>
	    		#item {
	    			min-height: 33pt;
	    			display: flex;
	    		}

	    		slot[name="left"]{
	    			margin-left: 12pt;
	    			display: flex;
	    			align-items: center;
	    		}

	    		#content {
	    			padding-right: 12pt;
	    			border-bottom: solid 1px var(--border-color);
	    			display: flex;
	    			align-items: center;
	    			flex: 1;
	    		}

	    		#content-slot {
	    			display: flex;
	    			flex: 1;
	    		}

	    		slot[name="primary"]{
	    			display: flex;
	    			align-items: center;
	    			color: var(--color-text-primary);
	    		}
	    	</style>
	    	<div id="item">
		        <slot name="left"></slot>
		        <div id="content">
		        	<slot id="content-slot"></slot>
		        	<slot name="primary"></slot>
		      		${this.getContent()}
		        </div>
	      	</div>
	    `;
	}

	getContent(){ return ""; }
}

class ButtonListItem extends EmptyListItem {

	connectedCallback() {
		super.connectedCallback();
		var shadowItem = this.shadowRoot.querySelector("#item");

		this.addEventListener("touchstart", e => {
			shadowItem.classList.add("active");
		});
		this.addEventListener("touchend", e => {
			shadowItem.classList.remove("active");
		});
		this.addEventListener("click", e => {
			if(this.hasAttribute("nextPage"))
				openPage(this, this.getAttribute("nextPage"));
		});
	}

	getContent() {
		return `
			<style>
				#item.active  {
					background: rgb(58, 58, 60);
				}

				#arrow {
					color: var(--color-text-primary);
					margin-left: 6pt;
				}
			</style>
			<svg id="arrow" xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512">
				<!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. -->
				<path fill="currentColor" d="M278.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-160 160c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L210.7 256 73.4 118.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l160 160z"/>
			</svg>
		`;
	}
}

window.customElements.define('list-table', ListTable);
window.customElements.define('list-item', EmptyListItem);
window.customElements.define('list-item-button', ButtonListItem);