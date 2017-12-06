/*
	Color Processing Unit

	Example #1:
	var color = new ColorSpace();
	color.setWebColor('#ff0000');
	console.log(color.getWebColor()); // Will return "rgb(255, 255, 0)"

	Example #2:
	var color = new ColorSpace();
	color.setWebColor('rgba(255, 0, 0, 0.5)');
	console.log(color.getWebColor()); // Will return "rgba(255, 0, 0, 0.5)"

	Example #3:
	var color = new ColorSpace();
	color.setWebColor('red');
	console.log('#' + color.getColorNumber()); // Will return "#ff0000"
*/

ColorSpace = function() {
	var red = 0;
	var green = 0;
	var blue = 0;
	var alpha = 255;

	function keepByte(value) {
		if (value > 255)
			return 255;
		if (value < 0)
			return 0;
		return value;
	}

	function correctRange() {
		red = keepByte(red);
		green = keepByte(green);
		blue = keepByte(blue);
		alpha = keepByte(alpha);
	}

	function intToHex(num, digitsCount) {
		return ('00000000' + parseInt(num).toString(16)).slice(-digitsCount);
	}

	function getRed() {
		return Math.floor(red);
	}

	function getGreen() {
		return Math.floor(green);
	}

	function getBlue() {
		return Math.floor(blue);
	}

	function getAlpha() {
		return Math.floor(alpha);
	}

	function setRed(value) {
		red = value;
		correctRange();
	}

	function setGreen(value) {
		green = value;
		correctRange();
	}

	function setBlue(value) {
		blue = value;
		correctRange();
	}

	function setAlpha(value) {
		alpha = value;
		correctRange();
	}

	function setRGB(r, g, b) {
		red = r;
		green = g;
		blue = b;
		alpha = 255;
		correctRange();
	}

	function setRGBA(r, g, b, a) {
		red = r;
		green = g;
		blue = b;
		alpha = a;
		correctRange();
	}

	function setWebColor(value) {
		value = trim(value).toLowerCase();
		var parts;

		// Obtaining color from color name
		if (typeof COLOR_SPACE_WEB_COLORS[value] != 'undefined') {
			setWebColor(COLOR_SPACE_WEB_COLORS[value]);
			return true;
		}

		// Obtaining color from "rgb(*, *, *)" expression
		parts = value.match(/^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
		if (parts) {
			setRGB(parts[1], parts[2], parts[3]);
			return true;
		}

		// Obtaining color from "rgba(*, *, *, *)" expression
		parts = value.match(/^rgba\s*\(\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+(:?\.\d+)?)\s*\)$/);
		if (parts) {
			setRGBA(parts[1], parts[2], parts[3], toFloat(parts[4]) * 255);
			return true;
		}

		// Obtaining color from color number
		parts = value.match(/^[#]?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/);
		if (parts) {
			setRGB(parseInt(parts[1], 16), parseInt(parts[2], 16), parseInt(parts[3], 16));
			return true;
		}

		// Obtaining color from inline RGBA statement
		parts = value.match(/^(\d+),\s*(\d+),\s*(\d+)(:?,\s*(\d+(:?\.\d+)?)\s*\))?/);
		if (parts) {
			setRGBA(parts[1], parts[2], parts[3], toFloat(parts[4] || 1) * 255);
			return true;
		}

		return false;
	}

	function getWebColor() {
		if (Math.floor(alpha) == 255)
			return getRGBColorString();
		return getRGBAColorString();
	}

	function getColorNumber() {
		return intToHex(red, 2) + intToHex(green, 2) + intToHex(blue, 2);
	}

	function getRGBColorString() {
		return 'rgb(' + Math.floor(red) + ', ' +  Math.floor(green) + ', ' +  Math.floor(blue) + ')';
	}

	function getRGBAColorString() {
		return 'rgba(' +  Math.floor(red) + ', ' +  Math.floor(green) + ', ' +  Math.floor(blue) + ', ' + (alpha/255).toFixed(3) + ')';
	}

	function getInlineRGB() {
		return Math.floor(red) + ', ' +  Math.floor(green) + ', ' +  Math.floor(blue);
	}

	function getInlineRGBA() {
		return Math.floor(red) + ', ' +  Math.floor(green) + ', ' +  Math.floor(blue) + ', ' + (alpha/255).toFixed(2);
	}

	function assign(color) {
		red = color.red();
		green = color.green();
		blue = color.blue();
		alpha = color.alpha();
	}

	function getHSL() {
		var cMin = Math.min(red, green, blue);
		var cMax = Math.max(red, green, blue);
		var h, s, l;

		// Calculating hue
		if (cMax != cMin) {
			if (red == cMax)
				h = (green - blue) * (255 / 6) / (cMax - cMin);
			else if (green == cMax)
				h = (255 / 3) + (blue - red) * (255 / 6) / (cMax - cMin);
			else
				h = (2 * 255 / 3) + (red - green) * (255 / 6) / (cMax - cMin);

			h = (h + 256) % 256;
		}
		else {
			h = 0;
		}

		// Calculating lightness
		l = (cMax + cMin) / 2;

		// Calculating saturation
		if (cMax + cMin != 0)
			s = (cMax - cMin) * 255 / (cMax + cMin);
		else
			s = 255;

		return {
			'h': h,
			's': s,
			'l': l
		}
	}

	function setHSL(h, s, l) {
		h = keepByte(h);
		s = keepByte(s);
		l = keepByte(l);
		var color = getHueColorByIndex(h, 255);
		var lightnessPalette = [colorFromRGB(0, 0, 0), color, colorFromRGB(255, 255, 255)];
		color = multiColorMix(lightnessPalette, l, 255);
		color = colorMix(colorFromRGB(128, 128, 128), color, s, 255);
		assign(color);
	}

	function getHSV() {
		var cMin = Math.min(red, green, blue);
		var cMax = Math.max(red, green, blue);
		var h, s, v;

		// Calculating hue
		if (cMax != cMin) {
			if (red == cMax)
				h = (green - blue) * (255 / 6) / (cMax - cMin);
			else if (green == cMax)
				h = (255 / 3) + (blue - red) * (255 / 6) / (cMax - cMin);
			else
				h = (2 * 255 / 3) + (red - green) * (255 / 6) / (cMax - cMin);

			h = (h + 256) % 256;
		}
		else {
			h = 0;
		}

		// Calculating brightness
		v = cMax;

		// Calculating saturation
		if (cMax != 0)
			s = 255 - cMin * 255 / cMax;
		else
			s = 0;

		return {
			'h': h,
			's': s,
			'v': v
		}
	}

	function setHSV(h, s, v) {
		h = keepByte(h);
		s = keepByte(s);
		v = keepByte(v);
		var color = getHueColorByIndex(h, 255);
		color = colorMix(colorFromRGB(255, 255, 255), color, s, 255);
		color = colorMix(colorFromRGB(0, 0, 0), color, v, 255);
		assign(color);
	}

	function isEqualTo(c) {
		return (red == c.red() && green == c.green() && blue == c.blue() && alpha == c.alpha());
	}

	return {
		'red': getRed,
		'green': getGreen,
		'blue': getBlue,
		'alpha': getAlpha,
		'setRed': setRed,
		'setGreen': setGreen,
		'setBlue': setBlue,
		'setAlpha': setAlpha,
		'setRGB': setRGB,
		'setRGBA': setRGBA,
		'setWebColor': setWebColor,
		'getWebColor': getWebColor,
		'getColorNumber': getColorNumber,
		'getRGBColorString': getRGBColorString,
		'getRGBAColorString': getRGBAColorString,
		'getInlineRGB': getInlineRGB,
		'getInlineRGBA': getInlineRGBA,
		'assign': assign,
		'getHSL': getHSL,
		'setHSL': setHSL,
		'getHSV': getHSV,
		'setHSV': setHSV,
		'isEqualTo': isEqualTo
	};
};

var COLOR_SPACE_WEB_COLORS = {
	'transparent': 'rgba(0, 0, 0, 0)',
	'aliceblue': 'f0f8ff',
	'antiquewhite': 'faebd7',
	'aqua': '00ffff',
	'aquamarine': '7fffd4',
	'azure': 'f0ffff',
	'beige': 'f5f5dc',
	'bisque': 'ffe4c4',
	'black': '000000',
	'blanchedalmond': 'ffebcd',
	'blue': '0000ff',
	'blueviolet': '8a2be2',
	'brown': 'a52a2a',
	'burlywood': 'deb887',
	'cadetblue': '5f9ea0',
	'chartreuse': '7fff00',
	'chocolate': 'd2691e',
	'coral': 'ff7f50',
	'cornflowerblue': '6495ed',
	'cornsilk': 'fff8dc',
	'crimson': 'dc143c',
	'cyan': '00ffff',
	'darkblue': '00008b',
	'darkcyan': '008b8b',
	'darkgoldenrod': 'b8860b',
	'darkgray': 'a9a9a9',
	'darkgreen': '006400',
	'darkkhaki': 'bdb76b',
	'darkmagenta': '8b008b',
	'darkolivegreen': '556b2f',
	'darkorange': 'ff8c00',
	'darkorchid': '9932cc',
	'darkred': '8b0000',
	'darksalmon': 'e9967a',
	'darkseagreen': '8fbc8f',
	'darkslateblue': '483d8b',
	'darkslategray': '2f4f4f',
	'darkturquoise': '00ced1',
	'darkviolet': '9400d3',
	'deeppink': 'ff1493',
	'deepskyblue': '00bfff',
	'dimgray': '696969',
	'dodgerblue': '1e90ff',
	'feldspar': 'd19275',
	'firebrick': 'b22222',
	'floralwhite': 'fffaf0',
	'forestgreen': '228b22',
	'fuchsia': 'ff00ff',
	'gainsboro': 'dcdcdc',
	'ghostwhite': 'f8f8ff',
	'gold': 'ffd700',
	'goldenrod': 'daa520',
	'gray': '808080',
	'green': '008000',
	'greenyellow': 'adff2f',
	'honeydew': 'f0fff0',
	'hotpink': 'ff69b4',
	'indianred ': 'cd5c5c',
	'indigo ': '4b0082',
	'ivory': 'fffff0',
	'khaki': 'f0e68c',
	'lavender': 'e6e6fa',
	'lavenderblush': 'fff0f5',
	'lawngreen': '7cfc00',
	'lemonchiffon': 'fffacd',
	'lightblue': 'add8e6',
	'lightcoral': 'f08080',
	'lightcyan': 'e0ffff',
	'lightgoldenrodyellow': 'fafad2',
	'lightgrey': 'd3d3d3',
	'lightgreen': '90ee90',
	'lightpink': 'ffb6c1',
	'lightsalmon': 'ffa07a',
	'lightseagreen': '20b2aa',
	'lightskyblue': '87cefa',
	'lightslateblue': '8470ff',
	'lightslategray': '778899',
	'lightsteelblue': 'b0c4de',
	'lightyellow': 'ffffe0',
	'lime': '00ff00',
	'limegreen': '32cd32',
	'linen': 'faf0e6',
	'magenta': 'ff00ff',
	'maroon': '800000',
	'mediumaquamarine': '66cdaa',
	'mediumblue': '0000cd',
	'mediumorchid': 'ba55d3',
	'mediumpurple': '9370d8',
	'mediumseagreen': '3cb371',
	'mediumslateblue': '7b68ee',
	'mediumspringgreen': '00fa9a',
	'mediumturquoise': '48d1cc',
	'mediumvioletred': 'c71585',
	'midnightblue': '191970',
	'mintcream': 'f5fffa',
	'mistyrose': 'ffe4e1',
	'moccasin': 'ffe4b5',
	'navajowhite': 'ffdead',
	'navy': '000080',
	'oldlace': 'fdf5e6',
	'olive': '808000',
	'olivedrab': '6b8e23',
	'orange': 'ffa500',
	'orangered': 'ff4500',
	'orchid': 'da70d6',
	'palegoldenrod': 'eee8aa',
	'palegreen': '98fb98',
	'paleturquoise': 'afeeee',
	'palevioletred': 'd87093',
	'papayawhip': 'ffefd5',
	'peachpuff': 'ffdab9',
	'peru': 'cd853f',
	'pink': 'ffc0cb',
	'plum': 'dda0dd',
	'powderblue': 'b0e0e6',
	'purple': '800080',
	'red': 'ff0000',
	'rosybrown': 'bc8f8f',
	'royalblue': '4169e1',
	'saddlebrown': '8b4513',
	'salmon': 'fa8072',
	'sandybrown': 'f4a460',
	'seagreen': '2e8b57',
	'seashell': 'fff5ee',
	'sienna': 'a0522d',
	'silver': 'c0c0c0',
	'skyblue': '87ceeb',
	'slateblue': '6a5acd',
	'slategray': '708090',
	'snow': 'fffafa',
	'springgreen': '00ff7f',
	'steelblue': '4682b4',
	'tan': 'd2b48c',
	'teal': '008080',
	'thistle': 'd8bfd8',
	'tomato': 'ff6347',
	'turquoise': '40e0d0',
	'violet': 'ee82ee',
	'violetred': 'd02090',
	'wheat': 'f5deb3',
	'white': 'ffffff',
	'whitesmoke': 'f5f5f5',
	'yellow': 'ffff00',
	'yellowgreen': '9acd32'
};

function colorFromWebColor(webColor) {
	var color = new ColorSpace();
	color.setWebColor(webColor);
	return color;
}

function colorFromRGB(r, g, b) {
	var color = new ColorSpace();
	color.setRGB(r, g, b);
	return color;
}

function colorFromRGBA(r, g, b, a) {
	var color = new ColorSpace();
	color.setRGBA(r, g, b, a);
	return color;
}

function valueMix(value1, value2, index, maxIndex) {
	return (value1 * (maxIndex - index) + value2 * index) / maxIndex;
}

function colorMix(color1, color2, index, maxIndex) {
	if (!isObject(color1) || !isObject(color2))
		return colorFromRGB(0, 0, 0);

	var color = new ColorSpace();
	color.setRGBA(
		valueMix(color1.red(), color2.red(), index, maxIndex),
		valueMix(color1.green(), color2.green(), index, maxIndex),
		valueMix(color1.blue(), color2.blue(), index, maxIndex),
		valueMix(color1.alpha(), color2.alpha(), index, maxIndex)
	);
	return color;
}

function multiColorMix(colors, index, maxIndex) {
	if (index < 0)
		index = 0;
	if (index > maxIndex)
		index = maxIndex;

	var len = Math.ceil((maxIndex + 1) / (colors.length - 1));
	var i = Math.floor(index / len);
	var pos = index % len;
	return colorMix(colors[i], colors[i + 1], pos, len);
}

function getHueColorByIndex(index, maxIndex) {
	var rainbow = [
		colorFromRGB(255, 0, 0),
		colorFromRGB(255, 255, 0),
		colorFromRGB(0, 255, 0),
		colorFromRGB(0, 255, 255),
		colorFromRGB(0, 0, 255),
		colorFromRGB(255, 0, 255),
		colorFromRGB(255, 0, 0)
	];
	return multiColorMix(rainbow, index, maxIndex);
}