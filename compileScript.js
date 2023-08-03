const fs = require('fs');
const path = require('path');
const sass = require('sass');
const uglifyjs = require("uglify-js");

const outPath = "./out/";

function walkTree(dir) {
	return fs.readdirSync(dir, { withFileTypes: true })
		.flatMap(file => file.isDirectory() ? walkTree(path.join(dir, file.name)) : path.join(dir, file.name))
}

function compileSass(path){
    return sass.compile(path).css.toString();
}


let fullJS = "";
let fullCSS = "";
let minJS = "";
walkTree("./src").forEach(e => {
	const data = fs.readFileSync(e, 'utf8') + "\n";
	if(e.endsWith(".js")){
		fullJS += data;
		minJS += uglifyjs.minify(data).code;
	}
	if(e.endsWith(".css"))
		fullCSS += data;
	if(e.endsWith(".scss"))
		fullCSS += compileSass(e);
});

if (!fs.existsSync(outPath))
    fs.mkdirSync(outPath);

fs.writeFileSync(`${outPath}/web-ios-app.js`, fullJS);
fs.writeFileSync(`${outPath}/web-ios-app.css`, fullCSS);

fs.writeFileSync(`${outPath}/web-ios-app.min.js`, minJS);
