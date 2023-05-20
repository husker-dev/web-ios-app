
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
	var codes = element.getElementsByTagName("script");
	console.log(codes);
	console.log(element);
	for(var i=0; i < codes.length;i++)
		eval(codes[i].text);
}