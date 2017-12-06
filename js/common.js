var BASE_URL;
var UTC_DATE;
var TIME_ZONE;

function isSet(variable) {
	return (typeof variable != 'undefined' && variable !== null);
}

function isArray(input) {
	return ((typeof input =='object') && (input instanceof Array));
}

function isObject(input) {
	return ((typeof input == 'object') && (input !== null) && !(input instanceof Array));
}

function isJQueryObject(input) {
	return (typeof input == 'object') && (input instanceof jQuery);
}

function isDOMElement(input) {
	return (typeof input == 'object') && (input instanceof HTMLElement);
}

function isFunction(input) {
	return (typeof input == 'function');
}

function isString(input) {
	return (typeof input == 'string');
}

function isBoolean(val) {
	return (typeof val == 'boolean');
}

function isNumber(input) {
	return (typeof input == 'number') || (trim(toFloat(input)) == trim(input));
}

function stringToNumber(str) {
	// PLEASE DO NOT REPLACE THIS CODE WITH "Math.parseFloat()" WHOSE BEHAVIOUR IS NOT CONSISTENT ACROSS BROWSERS
	if (typeof str != 'string') {
		return 0;
	}
	var digits = {
		'0': 0,
		'1': 1,
		'2': 2,
		'3': 3,
		'4': 4,
		'5': 5,
		'6': 6,
		'7': 7,
		'8': 8,
		'9': 9
	};

	str = trim(str) + '\0';

	var sign = 1;
	var number = 0;
	var floatPart = 0;
	var pow10 = 1;
	var i = 0;
	var token;

	// Parsing sign
	token = str.charAt(i);
	if (token == '-') {
		sign= -1;
		i++;
	}
	else if (token == '+') {
		sign = 1;
		i++;
	}

	// Parsing number before dot
	for (;;) {
		token=str.charAt(i);
		if (digits.hasOwnProperty(token))
			number = number * 10 + digits[token];
		else
			break;

		i++;
	}

	// Parsing number after dot (if available)
	token = str.charAt(i);
	if (token == '.') {
		i++;
		for (;;) {
			token = str.charAt(i);
			if (digits.hasOwnProperty(token)) {
				floatPart = floatPart * 10 + digits[token];
				pow10 *= 10;
			}
			else
				break;

			i++;
		}
	}

	return sign * (number + floatPart/pow10);
}

function htmlEntities(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toFloat(val) {
	var type = typeof val;
	switch (true) {
		case (type == 'number'):
			return val;
			break;
		case (type == 'boolean'):
			return val ? 1 : 0;
			break;
		case (type == 'string'):
			return stringToNumber(val);
			break;
	}
	return 0;
}

function toInt(val) {
	return Math.round(toFloat(val));
}

function toString(val) {
	var type=typeof val;
	switch (true) {
		case (type == 'number'):
			return val.toString();
			break;
		case (type == 'boolean'):
			return val ? '1' : '0';
			break;
		case (type == 'string'):
			return val;
			break;
	}
	return '';
}

function trim(value,charList) {
	switch (true) {
		case (typeof value=='string'):
			if (typeof charList !== 'undefined') {
				value=value.replace(new RegExp("[" + charList + "]+$"),"").replace(new RegExp("^[" + charList + "]+"),"");
			}
			return value.trim();
			break;
		case (typeof value == 'number'):
			return value.toString();
			break;
		case (typeof value == 'boolean'):
			return value ? '1' : '';
			break; // ! IMPORTANT: EMPTY STRING OF FALSE !
	}
	return '';
}

function toArray(val) {
	return isArray(val) ? val : [];
}

function makeArray(val) {
	return isArray(val) ? val : [val];
}

function toObject(val) {
	return isObject(val) ? val : {};
}

function toJQueryObject(val) {
	if (isJQueryObject(val))
		return val;

	if (isDOMElement(val) || isString(val))
		return $(val);

	return $();
}

function toBoolean(val) {
	if (typeof val == 'boolean')
		return val;

	return (toFloat(val) != 0);
}

function cloneVariable(variable) {
	if (variable === null)
		return null;

	if (isJQueryObject(variable))
		return variable;

	if (isDOMElement(variable))
		return variable;

	if (typeof variable=='object') {
		if (variable instanceof Array) {
			var cloneArray = [];
			for (var i = 0; i < variable.length; i++) {
				cloneArray.push(cloneVariable(variable[i]));
			}
			return cloneArray;
		} else {
			var cloneObject={};
			for (var field in variable) {
				if (variable.hasOwnProperty(field))
					cloneObject[field] = cloneVariable(variable[field]);
			}
			return cloneObject;
		}
	}
	return variable;
}

function toFunction(input) {
	return (typeof input == 'function') ? input : function() {};
}

function isEmpty(target) {
	if (target === null)
		return true;

	if (typeof target == 'undefined')
		return true;

	if (typeof target == 'number')
		return false;

	if (isString(target))
		return (target.length == 0);

	if (isArray(target))
		return (target.length == 0);

	if (isObject(target)) {
		for (var prop in target)
			if (target.hasOwnProperty(prop))
				return false;
		return true;
	}

	console.error(target, 'Unable to detect the type of the following variable:', target);
	return false;
}

var Locker=function() {
	this._lockCount = 0;

	this.beginLock=function() {
		this._lockCount++;
	};

	this.endLock=function() {
		this._lockCount--;
	};

	this.locked=function() {
		return (this._lockCount != 0);
	};

	this.reset=function() {
		this._lockCount = 0;
	};
};

function escapeJQuerySelectorElement(str) {
	return trim(str).replace(/["\\]/g,"\\$&");
}

function escapeRegExStr(str) {
	return trim(str).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&");
}

function removeClassByRegEx(elementSelector,classRegExStr) {
	var elementJQ = $(elementSelector);
	var classRegEx = new RegExp('\\b' + classRegExStr + '\\b');
	for (;;) {
		var classAttribute = toString(elementJQ.attr('class'));
		if (classAttribute.length == 0)
			break;

		var match = classAttribute.match(classRegEx);
		if (!match)
			break;

		elementJQ.removeClass(match[0]);
	}
}

function removeClassByPattern(elementSelector,classNamePattern) {
	var classRegExStr = escapeRegExStr(classNamePattern).replace(/[\\][*]/g,'[-\\w\\d]+');
	removeClassByRegEx(elementSelector, classRegExStr);
}

function getDeltaFromScrollEvent(event) {
	var deltaX = event['deltaX'];
	var deltaY = -1 * event['deltaY'];

	if (typeof deltaX === 'undefined' || typeof deltaY === 'undefined') {
		// OS X Safari
		deltaX = -1*event['wheelDeltaX'] / 6;
		deltaY = event['wheelDeltaY'] / 6;
	}

	if (event['deltaMode'] && event['deltaMode'] === 1) {
		// Firefox in deltaMode 1: Line scrolling
		deltaX *= 10;
		deltaY *= 10;
	}

	if (deltaX !== deltaX && deltaY !== deltaY/* NaN checks */) {
		// IE in some mouse drivers
		deltaX = 0;
		deltaY = event['wheelDelta'];
	}

	return {'x': deltaX, 'y': deltaY};
}

function ensureRange(value,minValue,maxValue) {
	if (value < minValue)
		return minValue;
	if (value > maxValue)
		return maxValue;
	return value;
}

function nodeHasClass(node, className) {
	return (' ' + node.className + ' ').indexOf(' ' + className + ' ') > -1;
}

function nodeAddClass(node, className) {
	if (!nodeHasClass(node, className)) {
		if (node.className.length)
			node.className = node.className + ' ' + className;
		else
			node.className = className;
	}
}

function nodeRemoveClass(node, className) {
	var classStr = ' ' + node.className + ' ';
	node.className = classStr.replace(' ' + className + ' ', '').trim();
}

function closestNodeWithClass(node, className) {
	for (;;) {
		if (!node)
			return null;

		if (nodeHasClass(node, className))
			return node;

		node = node.parentNode;
	}
}

function getNodeCSS(node, propertyName) {
	return window.getComputedStyle(node, null).getPropertyValue(propertyName);
}

function setNodeCSS(node, properties) {
	properties = toObject(properties);
	for (var name in properties) {
		if (properties.hasOwnProperty(name))
			node.style[name] = properties[name];
	}
}

function removeNode(node) {
	return node.parentNode.removeChild(node);
}

function stringToHTML(text) {
	text=htmlEntities(text);
	text=text.replace(/\s /g,'&nbsp; ');
	return text;
}

function textToHTML(text) {
	text=stringToHTML(text);
	text=text.replace(/[\r\n|\n\r|\r|\n]/g,'<br \/>');
	return text;
}

function linkify(text) {
	text=textToHTML(text);
	text=text.replace(/\b((http:\/\/|https:\/\/|\/\/|www\.)([-a-zA-Z0-9.]+\.)+[a-z0-9]{2,}[-a-zA-Z0-9@:%_\+.~#?&//=;]*)(\s|$|<)/gi,'<a href=\"$1\" target=\"_blank\">$1<\/a>$4');
	return text;
}

function format2Digit(number) {
	number = toInt(number);
	return number>9?number:('0'+number);
}

function objectKey(obj) {
	for (var key in obj)
		if (obj.hasOwnProperty(key))
			return key;
}

function objectValue(obj) {
	return obj[objectKey(obj)];
}

function keepRange(value,minValue,maxValue) {
	if (value>maxValue)
		return maxValue;
	if (value<minValue)
		return minValue;
	return value;
}

function copyProperties(destination, source) {
	source = toObject(source);
	for (var name in source) {
		if (source.hasOwnProperty(name))
			destination[name] = source[name];
	}
}

function insertNodeBefore(newNode, referenceNode) {
	referenceNode.parentNode.insertBefore(newNode, referenceNode);
}

function insertNodeAfter(newNode, referenceNode) {
	referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function domTraverseNext(containerNode, node) {
	if (node.firstChild)
		return node.firstChild;

	if (node.nextSibling)
		return node.nextSibling;

	for (;;) {
		if (!node)
			return null;

		if (node == containerNode)
			return null;

		if (node.nextSibling)
			return node.nextSibling;

		node = node.parentNode;
	}
}

function domTraversePrevious(containerNode, node) {
	if (node.lastChild)
		return node.lastChild;

	if (node.previousSibling)
		return node.previousSibling;

	for (;;) {
		if (!node)
			return null;

		if (node == containerNode)
			return null;

		if (node.previousSibling)
			return node.previousSibling;

		node = node.parentNode;
	}
}

function nodeOrder(node1, node2) {
	var downPath1 = buildDownPath(node1);
	var downPath2 = buildDownPath(node2);

	var n = Math.min(downPath1.length, downPath2.length);
	for (var i = 0; i < n; i++) {
		var v1 = downPath1[i];
		var v2 = downPath2[i];
		if (v1 < v2)
			return 1;
		if (v1 > v2)
			return -1;
	}
	return 0;

	function buildDownPath(node) {
		var result = [];
		while (node) {
			result.push(getNodeIndex(node));
			node = node.parentNode;
		}
		result.reverse();
		return result;
	}

	function getNodeIndex(node) {
		var result = 0;
		while (node) {
			result++;
			node = node.previousSibling;
		}
		return result;
	}
}

function nodeOffset(node) {
	var left = 0;
	var top = 0;
	while (node) {
		left += node.offsetLeft;
		top += node.offsetTop;
		node = node.offsetParent;
	}
	return {
		'left': left,
		'top': top
	};
}

function nodeOffsetX(node) {
	var result = 0;
	while (node) {
		result += node.offsetLeft;
		node = node.offsetParent;
	}
	return result;
}

function nodeOffsetY(node) {
	var result = 0;
	while (node) {
		result += node.offsetTop;
		node = node.offsetParent;
	}
	return result;
}

function mergeNodes(destinationNode, sourceNode) {
	var i, n;

	// Collecting nodes that being moved
	var nodesToMove = [];
	var childNodes = sourceNode.childNodes;
	for (i = 0, n = childNodes.length; i < n; i++)
		nodesToMove.push(childNodes[i]);

	// Moving nodes from source to destination node
	for (i = 0, n = nodesToMove.length; i < n; i++)
		destinationNode.appendChild(removeNode(nodesToMove[i]));

	removeNode(sourceNode);
}

function findNodeByClass(parentNode, className) {
	var nodeList = parentNode.getElementsByClassName(className);
	if (nodeList.length == 0)
		return null;

	return nodeList[0];
}

function findLastNodeByClass(parentNode, className) {
	var nodeList = parentNode.getElementsByClassName(className);
	if (nodeList.length == 0)
		return null;

	return nodeList[nodeList.length-1];
}

function copyArray(array) {
	var result = [];
	for (var i = 0; i < array.length; i++)
		result.push(array[i]);
	return result;
}

function uiGetJQ(templateName){
	return $('.ui-templates:first .' + templateName + ':first').clone();
}