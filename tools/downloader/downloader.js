
function loadContent(src, callback){
	var request = new XMLHttpRequest();
	request.open('GET', src);
	request.send(null);
	request.onreadystatechange = function() {
		if(request.readyState === 4 && request.status === 200) 
			callback(request.responseText);
	}
}

function executeScriptsInElement(element){
	Array.from(element.querySelectorAll("script"))
		.forEach( oldScriptEl => {
			const newScriptEl = document.createElement("script");
			
			newScriptEl.appendChild(document.createTextNode(oldScriptEl.innerHTML));
			oldScriptEl.parentNode.replaceChild(newScriptEl, oldScriptEl);
		});
}