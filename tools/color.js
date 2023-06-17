


class Color {

	constructor(r, g, b, a){
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	toCSS(){
		return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
	}

	mix(color, percent){
		return new Color(
			this.r + (color.r - this.r) * percent,
			this.g + (color.g - this.g) * percent,
			this.b + (color.b - this.b) * percent,
			this.a + (color.a - this.a) * percent
		);
	}

	alpha(percent){
		return new Color(
			this.r,
			this.g,
			this.b,
			this.a * percent
		);
	}
}


function colorFromString(text){
	if(text.includes("rgb")){
		var channels = text.split("(")[1].split(")")[0].split(",");
		return new Color(
			parseFloat(channels[0]),
			parseFloat(channels[1]),
			parseFloat(channels[2]),
			channels.length > 3 ? parseFloat(parseFloat(channels[3])) : 1.0
		);
	}
}