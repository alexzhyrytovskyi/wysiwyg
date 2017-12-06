//**********************************************************************************************************************
//	WYSIWYG Unit
//**********************************************************************************************************************

//======================================================================================================================
//	WYSIWYG > Constants
//======================================================================================================================

var WYSIWYG0_DEFAULT_STYLES = {
	'h1': {
		'font-weight': 700,
		'font-size': '48px',
		'line-height': '1.05em',
		'text-align': 'left'
	},
	'h2': {
		'font-weight': 700,
		'font-size': '36px',
		'line-height': '1.25em',
		'text-align': 'left'
	},
	'h3': {
		'font-weight': 700,
		'font-size': '28px',
		'line-height': '1.25em',
		'text-align': 'left'
	},
	'h4': {
		'font-weight': 700,
		'font-size': '18px',
		'line-height': '1.222em',
		'text-align': 'left'
	},
	'h5': {
		'font-weight': 700,
		'font-size': '16px',
		'line-height': '1.375em',
		'text-align': 'left'
	},
	'h6': {
		'font-weight': 700,
		'font-size': '12px',
		'line-height': '1.125em',
		'text-align': 'left'
	}
};
//======================================================================================================================
//	WYSIWYG > Constants
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Utility Routines
//======================================================================================================================
function uiWYSIWYG0_GetJQ(templateName) {
	return $('.wysiwyg0-templates:first .' + templateName + ':first').clone();
}

function uiWYSIWYG0_ParseStyleAttribute(s) {
	var i = 0;
	s = s + '\0';
	var result = {};
	for (;;) {
		var key = parseKey();
		if (s[i] != ':')
			break;

		i++;
		var value = parseValue();
		if (key != '' && value != '')
			result[key] = value;

		if (s[i] != ';')
			break;

		i++;
	}

	function parseKey() {
		skipBlanks();
		var result = '';
		for (;;) {
			var c = s[i];
			if ('a' <= c && c <= 'z')
				result += c;
			else if ('A' <= c && c <= 'Z')
				result += c;
			else if ('0' <= c && c <= '9')
				result += c;
			else if (c == '-')
				result += c;
			else
				break;
			i++;
		}
		return result;
	}

	function parseValue() {
		skipBlanks();
		var result = '';
		for (;;) {
			var c = s[i];
			if (c == ';' || c == '\0')
				break;

			// TODO, Alex: add algorithm to parse ' and " symbols
			if (c == '\'' || c == '\"') {
				result = '';
				break;
			}

			result += c;
			i++;
		}

		return result;
	}

	function skipBlanks() {
		while (s[i] == ' ')
			i++;
	}

	return result;
}

function uiWYSIWYG0_MakeStyleAttribute(styleObj) {
	var result = [];
	for (var name in styleObj) {
		if (!styleObj.hasOwnProperty(name))
			continue;

		var value = styleObj[name];
		result.push(name + ': ' + value);
	}
	return result.join('; ');
}
//======================================================================================================================
//	END OF: WYSIWYG > Utility Routines
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Content Filling Layer
//======================================================================================================================
// Types of elements:
//	- Content
//	- Paragraph
// 	- Character (with or without link)
//  - Text element
//		- Image
//		- Variable
//		- etc
//	- Block element
//		- Ordered list
//		- Unordered list
//		- etc

var uiWYSIWYG0_CaretNode = null;
var uiWYSIWYG0 = {};
(function(plugin) {

	function clearContent(contentNode) {
		// Cleaning content
		contentNode.innerHTML = '';

		// Converting current div to content element
		contentNode.uiWYSIWYG0_IsContent = true;
		nodeAddClass(contentNode, 'wysiwyg0-content');

		// Adding paragraph
		var paragraphNode = createParagraph();
		contentNode.appendChild(paragraphNode);

		// Moving caret to 'End of line' symbol of the paragraph
		uiWYSIWYG0_CaretNode = paragraphNode.firstChild;
	}

	function insertCharacter(character, options) {
		// Creating character
		var node = document.createElement('span');
		node.uiWYSIWYG0_IsCharacter = true;
		node.innerText = character;

		// Inserting character before the caret
		insertNodeBefore(node, uiWYSIWYG0_CaretNode);

		// Web browser display multiple spaces as single space symbol, next algorithm will correct inserted the space symbol
		if (character == ' ')
			correctSpace(node);

		options = toObject(options);

		// Applying text styling
		if (options.hasOwnProperty('css')) {
			setNodeCSS(node, options['css']);
			if (uiWYSIWYG0_CaretNode.uiWYSIWYG0_IsEOLN)
				uiWYSIWYG0_CaretNode.setAttribute('style', node.getAttribute('style'));
		}

		// Converting text to link
		if (options.hasOwnProperty('link')) {
			node.uiWYSIWYG0_Link = options['link'];
			nodeAddClass(node, 'l');
		}
	}

	function insertText(text, options) {
		for (var i = 0, n = text.length; i < n; i++)
			insertCharacter(text[i], options);
	}

	function insertLineBreak() {
		// Obtaining current paragraph node
		var paragraphNode = uiWYSIWYG0_CaretNode.parentNode;

		// Creating new paragraph node
		var newParagraphNode = createParagraph();
		insertNodeAfter(newParagraphNode, paragraphNode);

		// Obtaining new caret position
		var newCaretNode = newParagraphNode.firstChild;

		// Moving all content after caret from the first paragraph into second
		var node = uiWYSIWYG0_CaretNode;
		while (node && !node.uiWYSIWYG0_IsEOLN) {
			var nextNode = node.nextSibling;
			insertNodeBefore(removeNode(node), newCaretNode);
			node = nextNode;
		}

		// Normalizing line break style
		newParagraphNode.lastChild.setAttribute('style', uiWYSIWYG0_CaretNode.getAttribute('style'));

		// Setting new caret node
		if (uiWYSIWYG0_CaretNode.uiWYSIWYG0_IsEOLN)
			uiWYSIWYG0_CaretNode = newCaretNode;
	}

	function insertCustomTextElement(node, options) {
		node.uiWYSIWYG0_IsTextElement = true;
		nodeAddClass(node, 'wysiwyg0-text-element');
		insertNodeBefore(node, uiWYSIWYG0_CaretNode);

		options = toObject(options);

		// Applying element styling
		if (options.hasOwnProperty('css'))
			setNodeCSS(node, options['css']);
	}

	function insertCustomBlockElement(node, options) {
		insertLineBreak();
		insertCustomBlockElementBefore(node, options, uiWYSIWYG0_CaretNode.parentNode);
	}

	function insertCustomBlockElementBefore(node, options, beforeNode) {
		node.uiWYSIWYG0_IsBlockElement = true;
		nodeAddClass(node, 'wysiwyg0-block-element');
		insertNodeBefore(node, beforeNode);

		options = toObject(options);

		// Applying element styling
		if (options.hasOwnProperty('css'))
			setNodeCSS(node, options['css']);
	}

	function setParagraphCSS(css) {
		setNodeCSS(uiWYSIWYG0_CaretNode.parentNode, css);
	}

	function setParagraphRangeCSS(contentNode, node1, node2, css) {
		if (nodeOrder(node1, node2) > 0)
			setParagraphRangeCSSAtRange(node1, node2);
		else
			setParagraphRangeCSSAtRange(node2, node1);

		function setParagraphRangeCSSAtRange(node1, node2) {
			var paragraphNode = node1;
			while (paragraphNode) {
				if (paragraphNode.uiWYSIWYG0_IsParagraph)
					break;

				paragraphNode = paragraphNode.parentNode;
			}
			if (!paragraphNode)
				return;

			var node = paragraphNode;
			while (node) {
				if (node.uiWYSIWYG0_IsParagraph)
					setNodeCSS(node, css);

				if (node == node2)
					return;

				node = domTraverseNext(contentNode, node);
			}
		}
	}

	function createParagraph() {
		// Creating paragraph
		var paragraphNode = document.createElement('div');
		paragraphNode.className = 'wysiwyg0-paragraph';
		paragraphNode.uiWYSIWYG0_IsParagraph = true;

		// Creating 'End of line' symbol
		var markerNode = document.createElement('span');
		markerNode.className = 'wysiwyg0-end-of-line';
		markerNode.innerHTML = '&#8203;';
		markerNode.uiWYSIWYG0_IsEOLN = true;
		paragraphNode.appendChild(markerNode);

		return paragraphNode;
	}

	function correctSpace(node) {
		// Web browser display multiple spaces as single space symbol, to display all the series of space characters we will
		// need to replace them with non-breaking spaces, but in this case word wrap will not work, so we will keep the last
		// space as single breakable space

		// Tell that this is a space symbol
		node.uiWYSIWYG0_IsSpace = true;

		// Obtaining the symbols before and after current
		var prevNode = node.previousSibling;
		var nextNode = node.nextSibling;

		// Check if previous space is valid
		if (prevNode && prevNode.uiWYSIWYG0_IsSpace) {
			prevNode.innerHTML = '&nbsp;';
			prevNode.uiWYSIWYG0_IsNBSpace = true;
		}

		// Check if current space is valid
		if (nextNode && nextNode.uiWYSIWYG0_IsSpace) {
			node.innerHTML = '&nbsp;';
			node.uiWYSIWYG0_IsNBSpace = true;
		}

		// Check if current non-breaking space is valid
		if (node.uiWYSIWYG0_IsNBSpace) {
			if (!nextNode || !nextNode.uiWYSIWYG0_IsSpace) {
				prevNode.innerText = ' ';
				delete prevNode.uiWYSIWYG0_IsNBSpace;
			}
		}
	}

	function applyStyling(contentNode, node1, node2, css) {
		if (nodeOrder(node1, node2) > 0)
			applyStylingToRange(node1, node2);
		else
			applyStylingToRange(node2, node1);

		function applyStylingToRange(node1, node2) {
			var node = node1;
			while (node) {
				if (node == node2)
					break;

				if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsVariableElement || node.uiWYSIWYG0_IsEOLN)
					setNodeCSS(node, css);

				node = domTraverseNext(contentNode, node);
			}
		}
	}

	function getElementStyles() {
		var node = uiWYSIWYG0_CaretNode;
		if (uiWYSIWYG0_CaretNode.uiWYSIWYG0_IsEOLN && uiWYSIWYG0_CaretNode.previousSibling)
			node = uiWYSIWYG0_CaretNode.previousSibling;

		var style = node.getAttribute('style');
		if (style != '')
			return uiWYSIWYG0_ParseStyleAttribute(style);

		return null;
	}

	function getElementData() {
		if (!uiWYSIWYG0_CaretNode || !uiWYSIWYG0_CaretNode.uiWYSIWYG0_IsCharacter)
			return {};

		var result = {};

		if (uiWYSIWYG0_CaretNode.uiWYSIWYG0_Link)
			result['link'] = uiWYSIWYG0_CaretNode.uiWYSIWYG0_Link;

		var css = getElementStyles();
		if (css)
			result['css'] = css;

		return result;
	}

	function getElementCSS(propertyName) {
		if (nodeHasClass(uiWYSIWYG0_CaretNode, 's')) {
			nodeRemoveClass(uiWYSIWYG0_CaretNode, 's');
			var result = getNodeCSS(uiWYSIWYG0_CaretNode, propertyName);
			nodeAddClass(uiWYSIWYG0_CaretNode, 's');
			return result;
		}

		return getNodeCSS(uiWYSIWYG0_CaretNode, propertyName);
	}

	function getParagraphCSS(propertyName) {
		return getNodeCSS(uiWYSIWYG0_CaretNode.parentNode, propertyName);
	}

	function getLink() {
		 if (uiWYSIWYG0_CaretNode.uiWYSIWYG0_Link)
		 	return uiWYSIWYG0_CaretNode.uiWYSIWYG0_Link['url'];

		return '';
	}

	function setLink(contentNode, fromNode, toNode, url) {
		if (fromNode == toNode)
			updateExistedLink(fromNode);
		if (nodeOrder(fromNode, toNode) > 0)
			setLinkForRange(fromNode, toNode);
		else
			setLinkForRange(fromNode, toNode);

		function updateExistedLink(node) {
			var linkData = node.uiWYSIWYG0_Link;
			if (linkData)
				linkData['url'] = url;
		}

		function setLinkForRange(node1, node2) {
			var linkData = {
				'url': url
			};

			var node = node1;
			while (node) {
				if (node == node2)
					break;

				if (node.uiWYSIWYG0_IsCharacter) {
					node.uiWYSIWYG0_Link = linkData;
					nodeAddClass(node, 'l');
				}

				node = domTraverseNext(contentNode, node);
			}
		}
	}

	function removeLink(contentNode, fromNode, toNode) {
		if (fromNode == toNode)
			findAndRemoveLink(fromNode);
		else if (nodeOrder(fromNode, toNode) > 0)
			removeLinkAtRange(fromNode, toNode);
		else
			removeLinkAtRange(toNode, fromNode);

		function removeLinkAtRange(node1, node2) {
			var node = node1;
			while (node) {
				if (node.uiWYSIWYG0_Link) {
					delete node.uiWYSIWYG0_Link;
					delete node.uiWYSIWYG0_IsAutomaticLink;
					nodeRemoveClass(node, 'l');
				}

				if (node == node2)
					break;

				node = domTraverseNext(contentNode, node);
			}
		}

		function findAndRemoveLink(middleNode) {
			// Searching for link start node
			var linkStartNode = linkStartNodeAt(middleNode);

			// Searching for link end node
			var linkEndNode = linkEndNodeAt(middleNode);

			// Removing link
			removeLinkAtRange(linkStartNode, linkEndNode);
		}
	}

	function linkStartNodeAt(targetNode) {
		// If we are not on the link we just exit
		var linkData = targetNode.uiWYSIWYG0_Link;
		if (!linkData)
			return null;

		var linkStartNodeAt = targetNode;
		var node = targetNode;
		while (node) {
			if (!node)
				break;

			if (node.uiWYSIWYG0_Link == linkData)
				linkStartNodeAt = node;
			else
				break;

			node = node.previousSibling;
		}

		return linkStartNodeAt;
	}

	function linkEndNodeAt(targetNode) {
		// If we are not on the link we just exit
		var linkData = targetNode.uiWYSIWYG0_Link;
		if (!linkData)
			return null;

		// Searching for link
		var linkEndNodeAt = targetNode;
		var node = targetNode;
		while (node) {
			if (!node)
				break;

			if (node.uiWYSIWYG0_Link == linkData)
				linkEndNodeAt = node;
			else
				break;

			node = node.nextSibling;
		}

		return linkEndNodeAt;
	}

	function isEmpty(contentNode) {
		return (contentNode.childNodes.length <= 1 && contentNode.firstChild.firstChild.uiWYSIWYG0_IsEOLN);
	}

	plugin.clearContent = clearContent;
	plugin.insertCharacter = insertCharacter;
	plugin.insertText = insertText;
	plugin.insertLineBreak = insertLineBreak;
	plugin.insertCustomTextElement = insertCustomTextElement;
	plugin.insertCustomBlockElement = insertCustomBlockElement;
	plugin.insertCustomBlockElementBefore = insertCustomBlockElementBefore;
	plugin.setParagraphCSS = setParagraphCSS;
	plugin.setParagraphRangeCSS = setParagraphRangeCSS;
	plugin.applyStyling = applyStyling;
	plugin.getElementStyles = getElementStyles;
	plugin.getElementData = getElementData;
	plugin.getElementCSS = getElementCSS;
	plugin.getParagraphCSS = getParagraphCSS;
	plugin.getLink = getLink;
	plugin.setLink = setLink;
	plugin.removeLink = removeLink;
	plugin.linkStartNodeAt = linkStartNodeAt;
	plugin.linkEndNodeAt = linkEndNodeAt;
	plugin.isEmpty = isEmpty;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > Content Filling Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Text Codec
//======================================================================================================================
(function(plugin) {

	function encodeRange(contentNode, node1, node2) {
		if (nodeOrder(node1, node2) < 0) {
			var t = node1;
			node1 = node2;
			node2 = t;
		}

		var list = [];
		var node = node1;
		var prevItem = {'type': '?'};
		while (node) {
			if (node == node2)
				break;

			var item = encode(node);
			if (item) {
				var text = compress(prevItem, item);
				if (text) {
					prevItem['value'] = text;
				}
				else {
					list.push(item);
					prevItem = item;
				}
			}

			node = domTraverseNext(contentNode, node);
		}

		return list;
	}

	function compress(item1, item2) {
		if (item1['type'] || item2['type'] || item1['link'] != item2['link'] || item1['style'] != item2['style'])
			return null;

		return item1['value'] + item2['value'];
	}

	function encode(node) {
		if (node.uiWYSIWYG0_IsCharacter)
			return encodeCharacter(node);

		if (node.uiWYSIWYG0_IsTextElement)
			return encodeTextElement(node);

		if (node.uiWYSIWYG0_IsParagraph)
			return encodeParagraph(node);

		return null;
	}

	function encodeCharacter(node) {
		var characterData = {};
		characterData['value'] = node.uiWYSIWYG0_IsSpace ? ' ' : node.innerText;

		// Obtaining character styles
		var style = node.getAttribute('style');
		if (style)
			characterData['style'] = style;

		// Obtaining character link URL
		if (node.uiWYSIWYG0_Link)
			characterData['link'] = node.uiWYSIWYG0_Link['url'];

		return characterData;
	}

	function encodeTextElement(node) {
		var elementType = node.uiWYSIWYG0_ElemenntType;
		var encoder = plugin.encoders[elementType];
		if (!encoder)
			return null;

		var textElementData = plugin.encoders[elementType](node);
		textElementData['type'] = elementType;

		// Obtaining text element styles
		var style = node.getAttribute('style');
		if (style)
			textElementData['style'] = style;

		return textElementData;
	}

	function encodeParagraph(node) {
		var paragraphData = {};
		paragraphData['type'] = 'paragraph';

		// Obtaining paragraph styles
		var style = node.getAttribute('style');
		if (style)
			paragraphData['style'] = style;

		// Obtaining paragraph list type
		var contentNode = node.parentNode;
		var list = $(contentNode).data('WYSIWYG0_List');
		if (isObject(list))
			paragraphData['listType'] = list.type();

		return paragraphData;
	}

	function decode(target) {
		var list = makeArray(target);
		for (var i = 0; i < list.length; i++) {
			var item = list[i];
			var type = item['type'];
			if (!type)
				decodeText(item);
			else if (type == 'paragraph')
				decodeParagraph(item);
			else
				decodeTextElement(item);
		}
	}

	function decodeText(item) {
		var options = {};

		// Obtaining text styles
		if (item.hasOwnProperty('style'))
			options['css'] = uiWYSIWYG0_ParseStyleAttribute(item['style']);

		// Converting text to link
		if (item.hasOwnProperty('link')) {
			var previousNode = uiWYSIWYG0_CaretNode.previousSibling;
			var previousLink = previousNode ? previousNode.uiWYSIWYG0_Link : null;
			if (previousLink && previousLink['url'] == item['url']) {
				options['link'] = previousLink;
			}
			else {
				options['link'] = {
					'url': item['link']
				};
			}
		}

		uiWYSIWYG0.insertText(item['value'], options);
	}

	function decodeTextElement(item) {
		var options = {};

		// Obtaining text styles
		if (item.hasOwnProperty('style'))
			options['css'] = uiWYSIWYG0_ParseStyleAttribute(item['style']);

		var elementType = item['type'];
		var decoder = uiWYSIWYG0.decoders[elementType];
		if (!decoder)
			return null;

		return decoder(item);
	}

	function decodeParagraph(item) {
		uiWYSIWYG0.insertLineBreak();

		// Updating paragraph styles
		if (item.hasOwnProperty('style'))
			uiWYSIWYG0.setParagraphCSS(uiWYSIWYG0_ParseStyleAttribute(item['style']));

		// Updating paragraph list type
		uiWYSIWYG0.setListType(item['listType']);
	}

	plugin.encoders = {};
	plugin.decoders = {};
	plugin.encodeRange = encodeRange;
	plugin.encode = encode;
	plugin.decode = decode;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > Text Codec
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Image Component
//======================================================================================================================
(function() {
	uiWYSIWYG0.insertImage = function(options) {
		var elementJQ = $('<div>');
		uiWYSIWYG0.insertCustomTextElement(elementJQ[0], options);
		elementJQ.WYSIWYG0_Image(options);
	};

	uiWYSIWYG0.encoders['image'] = function(node) {
		var instance = $(node).data('WYSIWYG0_Image');
		if (!instance)
			return null;

		var result = {};
		result['url'] = instance.url();

		var styles = node.getAttribute('style');
		if (styles)
			result['styles'] = styles;

		return result;
	};

	uiWYSIWYG0.decoders['image'] = function(data) {
		uiWYSIWYG0.insertImage({
			'url': data['url'],
			'css': uiWYSIWYG0_ParseStyleAttribute(data['styles'])
		});
	};

	$.fn.WYSIWYG0_Image = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('WYSIWYG0_Image');
		if (isObject(prevInstance)) {
			prevInstance.update(options);
			return prevInstance;
		}

		var jQ = uiWYSIWYG0_GetJQ('wysiwyg0-image-component');
		parentElementJQ.addClass('wysiwyg0-image-element');
		parentElementJQ.append(jQ);

		var imageJQ = jQ.find('.wysiwyg0-image-component-image:first');

		update(options);

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('url'))
				imageJQ.attr('src', toString(params['url']));
		}

		function getURL() {
			return imageJQ.attr('src');
		}

		var externalInterface = {
			'update': update,
			'url': getURL
		};
		parentElementJQ.data('WYSIWYG0_Image', externalInterface);
		parentElementJQ[0].uiWYSIWYG0_IsImageElement = true;
		parentElementJQ[0].uiWYSIWYG0_ElemenntType = 'image';
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: WYSIWYG > Image Component
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Variable Component
//======================================================================================================================
(function() {
	uiWYSIWYG0.insertVariable = function(options) {
		var elementJQ = $('<div>');
		uiWYSIWYG0.insertCustomTextElement(elementJQ[0], options);
		elementJQ.WYSIWYG0_Variable(options);
	};

	uiWYSIWYG0.encoders['variable'] = function(node) {
		var instance = $(node).data('WYSIWYG0_Variable');
		if (!instance)
			return null;

		var result = {};
		result['value'] = instance.value();
		result['title'] = instance.title();

		var styles = node.getAttribute('style');
		if (styles)
			result['styles'] = styles;

		return result;
	};

	uiWYSIWYG0.decoders['variable'] = function(data) {
		uiWYSIWYG0.insertVariable({
			'value': data['value'],
			'title': data['title'],
			'css': uiWYSIWYG0_ParseStyleAttribute(data['styles'])
		});
	};

	$.fn.WYSIWYG0_Variable = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('WYSIWYG0_Variable');
		if (isObject(prevInstance)) {
			prevInstance.update(options);
			return prevInstance;
		}

		var jQ = uiWYSIWYG0_GetJQ('wysiwyg0-variable-component');
		parentElementJQ.addClass('wysiwyg0-variable-element');
		parentElementJQ.append(jQ);

		var title = '';
		var value = null;

		update(options);

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('title')) {
				title = toString(params['title']);
				jQ.text(title);
			}

			if (params.hasOwnProperty('value'))
				value = params['value'];
		}

		function getTitle() {
			return title;
		}

		function getValue() {
			return value;
		}

		var externalInterface = {
			'update': update,
			'title': getTitle,
			'value': getValue
		};
		parentElementJQ.data('WYSIWYG0_Variable', externalInterface);
		parentElementJQ[0].uiWYSIWYG0_IsVariableElement = true;
		parentElementJQ[0].uiWYSIWYG0_ElemenntType = 'variable';
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: WYSIWYG > Variable Component
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > List Layer
//======================================================================================================================
(function(plugin) {

	function insertList(options) {
		var elementJQ = $('<div>');
		uiWYSIWYG0.insertCustomBlockElement(elementJQ[0], options);
		elementJQ.WYSIWYG0_List(options);
	}

	function getListType() {
		var contentNode = uiWYSIWYG0_CaretNode.parentNode.parentNode;
		if (!contentNode.uiWYSIWYG0_IsListContent)
			return '';

		var list = $(contentNode).data('WYSIWYG0_List');
		if (!isObject(list))
			return '';

		return list.type();
	}

	function setListType(listType) {
		// Finding closest paragraph
		var node = uiWYSIWYG0_CaretNode;
		for (;;) {
			if (!node)
				return;

			if (node.uiWYSIWYG0_IsParagraph)
				break;

			node = node.parentNode;
		}

		setListTypeForParagraph(node, listType);
	}

	function setListTypeForRange(contentNode, node1, node2, listType) {
		// Collecting all paragraphs
		var paragraphs = collectingAllParagraphsInDirectRange(contentNode, node1, node2);

		// Applying new list type for each paragraph
		for (var i = 0; i < paragraphs.length; i++)
			setListTypeForParagraph(paragraphs[i], listType);
	}

	function collectingAllParagraphsInDirectRange(contentNode, node1, node2) {
		if (nodeOrder(node1, node2) < 0) {
			var t = node1;
			node1 = node2;
			node2 = t;
		}

		var node = node1;
		for (;;) {
			if (!node)
				return [];

			if (node.uiWYSIWYG0_IsParagraph)
				break;

			node = node.parentNode;
		}

		var result = [];
		for (;;) {
			if (node == node2)
				break;

			if (node.uiWYSIWYG0_IsParagraph)
				result.push(node);

			node = domTraverseNext(contentNode, node);
		}
		return result;
	}

	function setListTypeForParagraph(paragraphNode, listType) {
		removeParagraphFromList(paragraphNode);
		if (listType == 'ordered' || listType == 'unordered')
			addParagraphToList(paragraphNode, listType);
	}

	function removeParagraphFromList(paragraphNode) {
		var i;

		var contentNode = paragraphNode.parentNode;
		var list = $(contentNode).data('WYSIWYG0_List');
		if (!isObject(list))
			return;

		var listNode = list.node();
		var listType = list.type();

		// Finding all paragraphs before list
		var beforeList = [];
		var node = contentNode.firstChild;
		while (node != paragraphNode) {
			beforeList.push(node);
			node = node.nextSibling;
		}

		// Finding all paragraphs after list
		var afterList = [];
		node = paragraphNode.nextSibling;
		while (node) {
			afterList.push(node);
			node = node.nextSibling;
		}

		// Moving all previous paragraphs to previous list
		if (beforeList.length) {
			var list1Node = document.createElement('div');
			uiWYSIWYG0.insertCustomBlockElementBefore(list1Node, {}, listNode);
			var list1 = $(list1Node).WYSIWYG0_List({
				'type': listType
			});
			var list1ContentNode = list1.contentNode();
			list1ContentNode.innerHTML = '';
			for (i = 0; i < beforeList.length; i++)
				list1ContentNode.appendChild(removeNode(beforeList[i]));
		}

		// Moving all next paragraphs to next list
		if (afterList.length) {
			var list2Node = document.createElement('div');
			uiWYSIWYG0.insertCustomBlockElementBefore(list2Node, {}, listNode);
			insertNodeAfter(removeNode(list2Node), listNode);
			var list2 = $(list2Node).WYSIWYG0_List({
				'type': listType
			});
			var list2ContentNode = list2.contentNode();
			list2ContentNode.innerHTML = '';
			for (i = 0; i < afterList.length; i++)
				list2ContentNode.appendChild(removeNode(afterList[i]));
		}

		// Moving current paragraph outside of list
		insertNodeBefore(removeNode(paragraphNode), listNode);
		removeNode(listNode);
	}

	function addParagraphToList(paragraphNode, listType) {
		// Creating list
		var elementNode = document.createElement('div');
		uiWYSIWYG0.insertCustomBlockElementBefore(elementNode, {}, paragraphNode);
		var list = $(elementNode).WYSIWYG0_List({
			'type': listType
		});

		// Filling list with paragraph
		var contentNode = list.contentNode();
		contentNode.innerHTML = '';
		contentNode.appendChild(removeNode(paragraphNode));

		// Searching for previous and next list
		var previousListNode = elementNode.previousSibling;
		var previousList = $(previousListNode).data('WYSIWYG0_List');
		var nextListNode = elementNode.nextSibling;
		var nextList = $(nextListNode).data('WYSIWYG0_List');

		// Trying to merge current list with previous one
		if (previousList && previousList.type() == listType) {
			var previousListContentNode = previousList.contentNode();
			previousListContentNode.appendChild(removeNode(paragraphNode));
			removeNode(elementNode);
			contentNode = previousListContentNode;
		}

		// Trying to merge current list with next list
		if (nextList && nextList.type() == listType) {
			var nextListContentNode = nextList.contentNode();
			var nodeList = copyArray(nextListContentNode.childNodes);
			for (var i = 0; i < nodeList.length; i++)
				contentNode.appendChild(removeNode(nodeList[i]));
			removeNode(nextListNode);
		}
	}

	plugin.insertList = insertList;
	plugin.getListType = getListType;
	plugin.setListType = setListType;
	plugin.setListTypeForRange = setListTypeForRange;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > List Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > List Component
//======================================================================================================================
(function() {

	$.fn.WYSIWYG0_List = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('WYSIWYG0_List');
		if (isObject(prevInstance)) {
			prevInstance.update(options);
			return prevInstance;
		}

		var jQ = uiWYSIWYG0_GetJQ('wysiwyg0-list-component');
		parentElementJQ.addClass('wysiwyg0-list-element');
		parentElementJQ.append(jQ);
		var contentJQ = jQ.find('.wysiwyg0-list-component-content');

		options = toObject(options);
		var onInit = options['onInit'];
		var type = 'unordered';

		update(options);

		var savedCaretNode = uiWYSIWYG0_CaretNode;
		uiWYSIWYG0.clearContent(contentJQ[0]);
		if (isFunction(onInit))
			onInit();
		uiWYSIWYG0_CaretNode = savedCaretNode;

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('type'))
				setType(params['type']);
		}

		function setType(newType) {
			jQ.removeClass('wysiwyg0-list-component-with-ordered-list');
			jQ.removeClass('wysiwyg0-list-component-with-unordered-list');
			if (newType == 'ordered') {
				jQ.addClass('wysiwyg0-list-component-with-ordered-list');
				type = 'ordered';
			}
			else {
				jQ.addClass('wysiwyg0-list-component-with-unordered-list');
				type = 'unordered';
			}
		}

		function getType() {
			return type;
		}

		function getContentNode() {
			return contentJQ[0];
		}

		function getNode() {
			return parentElementJQ[0];
		}

		function remove() {
			parentElementJQ.remove();
			contentJQ.data('WYSIWYG0_List', null);
			delete contentJQ[0].uiWYSIWYG0_IsListContent;
		}

		var externalInterface = {
			'update': update,
			'type': getType,
			'contentNode': getContentNode,
			'node': getNode,
			'remove': remove
		};
		parentElementJQ.data('WYSIWYG0_List', externalInterface);
		parentElementJQ[0].uiWYSIWYG0_IsListElement = true;
		contentJQ.data('WYSIWYG0_List', externalInterface);
		contentJQ[0].uiWYSIWYG0_IsListContent = true;
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: WYSIWYG > List Component
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > HTML Encoding Layer
//======================================================================================================================
(function(plugin) {

	function getHTML(contentNode) {
		var index = 0;
		var html = '';
		var bufferHTML = '';
		var bufferStyles = '';
		var isList = contentNode.uiWYSIWYG0_IsListContent;

		// Converting WYSIWYG content as plain element list
		var nodeList = getNodeList();

		// Parsing plain element list
		parseContent();

		function getNodeList() {
			var result = [];
			getLines();

			function getLines() {
				var nodeList = contentNode.childNodes;
				for (var i = 0, n = nodeList.length; i < n; i++) {
					var node = nodeList[i];
					result.push(node);
					getLine(node);
				}
			}

			function getLine(parentNode) {
				var nodeList = parentNode.childNodes;
				for (var i = 0, n = nodeList.length; i < n; i++)
					result.push(nodeList[i]);
			}

			result.push(null);
			return result;
		}

		function parseContent() {
			for (;;) {
				var node = nodeList[index];
				if (!node)
					break;

				if (node.uiWYSIWYG0_IsParagraph) {
					parseParagraph();
					continue;
				}

				if (node.uiWYSIWYG0_IsBlockElement) {
					parseBlockElement();
					continue;
				}

				// Skipping unknown node
				index++;
			}
		}

		function parseParagraph() {
			var currStyles = toString(nodeList[index].getAttribute('style'));
			index++;

			if (isList) {
				if (currStyles != '')
					html += '<li style=\"' + htmlEntities(currStyles) + '\">';
				else
					html += '<li>';
				parseLine();
				html += '<\/li>';
				return;
			}

			if (currStyles == '') {
				parseLine();
				html += '<br>';
			}
			else {
				html += '<div style=\"' + htmlEntities(currStyles) + '\">';
				parseLine();
				html += '<br><\/div>';
			}
		}

		function parseLine() {
			bufferStyles = '';
			bufferHTML = '';
			for (;;) {
				var node = nodeList[index];
				if (!node)
					break;

				if (node.uiWYSIWYG0_IsEOLN) {
					index++;
					break;
				}

				// Trying to parse character
				if (node.uiWYSIWYG0_IsCharacter) {
					if (node.uiWYSIWYG0_Link) {
						parseLink();
						continue;
					}

					parseCharacter();
					continue;
				}

				// Trying to parse image
				if (node.uiWYSIWYG0_IsImageElement) {
					parseImage();
					continue;
				}

				// Trying to parse variable
				if (node.uiWYSIWYG0_IsVariableElement) {
					parseVariable();
					continue;
				}

				// Skip unknown element
				index++;
			}
			flushLine();
		}

		function parseLink() {
			var linkData = nodeList[index].uiWYSIWYG0_Link;
			bufferHTML += '<a href=\"' + htmlEntities(linkData['url']) + '\">';
			for (;;) {
				var node = nodeList[index];
				if (!node || !node.uiWYSIWYG0_Link || node.uiWYSIWYG0_Link != linkData)
					break;

				parseCharacter();
			}
			bufferHTML += '<\/a>';
		}

		function parseCharacter() {
			var node = nodeList[index];
			var styles = toString(node.getAttribute('style'));
			if (styles != bufferStyles) {
				flushLine();
				bufferStyles = styles;
			}

			if (node.uiWYSIWYG0_IsSpace)
				bufferHTML += ' ';
			else
				bufferHTML += htmlEntities(node.innerText);
			index++;
		}

		function parseImage() {
			flushLine();

			var node = nodeList[index];
			var styles = uiWYSIWYG0_ParseStyleAttribute(node.getAttribute('style'));

			var url = $(nodeList[index]).WYSIWYG0_Image().url();
			if (!styles.hasOwnProperty('display')) {
				styles['display'] = 'inline-block';
				styles['vertical-align'] = 'top';
			}

			html += '<img src=\"' + htmlEntities(url) + '\" style=\"' + htmlEntities(uiWYSIWYG0_MakeStyleAttribute(styles)) + '\" \/>';
			index++;
		}

		function parseVariable() {
			var variable = $(nodeList[index]).WYSIWYG0_Variable();
			bufferHTML += '<span data-text-variable=\"' + htmlEntities(variable.value()) + '\">' + htmlEntities(variable.title()) + '<\/span>';
			index++;
		}

		function parseBlockElement() {
			var node = nodeList[index];

			if (node.uiWYSIWYG0_IsListElement) {
				parseList();
				return;
			}

			// Skipping this element
			index++;
		}

		function parseList() {
			var list = $(nodeList[index]).WYSIWYG0_List();
			var listType = list.type();
			var listHTML = uiWYSIWYG0.getHTML(list.contentNode());

			if (listType == 'ordered')
				html += '<ol>' + listHTML + '<\/ol>';
			else
				html += '<ul>' + listHTML + '<\/ul>';

			index++;
		}

		function flushLine() {
			if (bufferStyles != '')
				html += '<span style=\"' + htmlEntities(bufferStyles) + '\">' + bufferHTML + '<\/span>';
			else
				html += bufferHTML;

			bufferHTML = '';
		}

		return html;
	}

	plugin.getHTML = getHTML;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > HTML Encoding Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > HTML Decoding Layer
//======================================================================================================================
(function(plugin) {

	function setHTML(contentNode, html) {
		var divNode = document.createElement('div');
		if (isString(html))
			divNode.innerHTML = html;
		else if (isJQueryObject(html) && html.length)
			divNode.appendChild(html[0].cloneNode(true));
		else if (isDOMElement(html))
			divNode.appendChild(html.cloneNode(true));
		else
			return;

		uiWYSIWYG0.clearContent(contentNode);

		var outputStarted = false;
		var spaceCounter = 0;
		var lineBreakNeeded = false;
		var newParagraphCSS = null;
		traverse(divNode, {'css': {}});

		function traverse(parentNode, parentOptions) {
			var childNodes = parentNode.childNodes;
			for (var i = 0; i < childNodes.length; i++) {
				var node = childNodes[i];
				var options = cloneVariable(parentOptions);
				processNode(node, options);
			}
		}

		function processNode(node, options) {
			if (node.nodeType == 3)
				processText(node, options);
			else if (node.nodeType == 1)
				processElement(node, options);
		}

		function processText(node, options) {
			var value = node.nodeValue;
			for (var i = 0; i < value.length; i++)
				processCharacter(value[i], options);
		}

		function processCharacter(c, options) {
			// Collecting spaces
			if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
				spaceCounter++;
				return;
			}

			// Printing multiple spaces as single one
			flushSpaces(options);

			// Inserting line break if needed
			if (lineBreakNeeded) {
				if (outputStarted)
					uiWYSIWYG0.insertLineBreak();

				if (newParagraphCSS) {
					uiWYSIWYG0.setParagraphCSS(newParagraphCSS);
					newParagraphCSS = null;
				}

				lineBreakNeeded = false;
			}

			// Tell that we started text output
			outputStarted = true;

			if (c == '\xa0') // Processing non breaking space character
				uiWYSIWYG0.insertText(' ', options);
			else
				uiWYSIWYG0.insertText(c, options);
		}

		function flushSpaces(options) {
			if (spaceCounter > 0) {
				if (outputStarted && !lineBreakNeeded)
					uiWYSIWYG0.insertText(' ', options);
				spaceCounter = 0;
			}
		}

		function processElement(node, options) {
			var nodeName = node.nodeName.toLowerCase();
			var disableTraverse = false;

			if (WYSIWYG0_DEFAULT_STYLES.hasOwnProperty(nodeName))
				options['css'] = mergeObjects(options['css'], WYSIWYG0_DEFAULT_STYLES[nodeName]);

			var styleList = uiWYSIWYG0_ParseStyleAttribute(node.getAttribute('style'));
			copyProperties(options['css'], styleList);

			switch (nodeName) {
				case 'a':
					flushSpaces();
					options['link'] = {
						'url': node.getAttribute('href')
					};
					break;
				case 'strong':
				case 'b':
					flushSpaces();
					options['css']['font-weight'] = 700;
					break;
				case 's':
					flushSpaces();
					options['css']['text-decoration'] = 'line-through';
					break;
				case 'i':
				case 'em':
					flushSpaces();
					options['css']['font-style'] = 'italic';
					break;
				case 'h1':
				case 'h2':
				case 'h3':
				case 'h4':
				case 'h5':
				case 'h6':
					lineBreakNeeded = true;
					spaceCounter = 0;
					break;
				case 'div':
				case 'p':
				case 'li':
					lineBreakNeeded = true;
					spaceCounter = 0;
					break;
				case 'br':
					uiWYSIWYG0.insertLineBreak();
					lineBreakNeeded = false;
					spaceCounter = 0;
					outputStarted = false;
					break;
				case 'blockquote':
					lineBreakNeeded = true;
					flushSpaces();
					newParagraphCSS = {
						'margin': '14px 40px'
					};
					break;
				case 'small':
					options['css']['font-size'] = '12px';
					flushSpaces();
					break;
				case 'img':
					flushSpaces();
					uiWYSIWYG0.insertImage({
						'url': node.getAttribute('src'),
						'css': options['css']
					});
					break;
				case 'ul':
					uiWYSIWYG0.insertList({
						'type': 'unordered',
						'onInit': function() {
							outputStarted = false;
							traverse(node, options);
							disableTraverse = true;
						}
					});
					outputStarted = false;
					break;
				case 'ol':
					uiWYSIWYG0.insertList({
						'type': 'ordered',
						'onInit': function() {
							outputStarted = false;
							traverse(node, options);
							disableTraverse = true;
						}
					});
					outputStarted = false;
					break;
				case 'span':
					flushSpaces();
					var variable = node.getAttribute('data-text-variable');
					if (variable) {
						uiWYSIWYG0.insertVariable({
							'value': variable,
							'title': node.innerText,
							'css': options['css']
						});
						disableTraverse = true;
					}
					break;
			}

			if (!disableTraverse)
				traverse(node, options);
		}
	}

	plugin.setHTML = setHTML;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > HTML Decoding Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Caret Position Layer
//======================================================================================================================
(function(plugin) {

	function getElementIndex(contentNode, elementNode) {
		var node = contentNode.firstChild;
		var index = 0;
		while (node) {
			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsTextElement || node.uiWYSIWYG0_IsEOLN) {
				if (node == elementNode)
					return index;
				index++;
			}
			node = domTraverseNext(contentNode, node);
		}
		return -1;
	}

	function getElementAtIndex(contentNode, elementIndex) {
		var node = contentNode.firstChild;
		var index = 0;
		while (node) {
			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsTextElement || node.uiWYSIWYG0_IsEOLN) {
				if (index == elementIndex)
					return node;
				index++;
			}
			node = domTraverseNext(contentNode, node);
		}
		return null;
	}

	function getCaretIndex(contentNode) {
		return getElementIndex(contentNode, uiWYSIWYG0_CaretNode);
	}

	function setCaretIndex(contentNode, index) {
		var node = getElementAtIndex(contentNode, index);
		if (node)
			uiWYSIWYG0_CaretNode = node;
	}

	plugin.getElementIndex = getElementIndex;
	plugin.getElementAtIndex = getElementAtIndex;
	plugin.getCaretIndex = getCaretIndex;
	plugin.setCaretIndex = setCaretIndex;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > Caret Position Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Caret Calculations Layer
//======================================================================================================================
(function(plugin) {
	var cachedNode = null;
	var cachedOffsetX = 0;

	function resetCachedPositions(contentNode) {
		// Removing cached marker from paragraphs
		var nodeList = contentNode.getElementsByClassName('wysiwyg0-paragraph');
		for (var i = 0, n = nodeList.length; i < n; i++)
			delete nodeList[i].uiWYSIWYG0_IsParagraphPrepared;

		// Resetting cached node
		cachedNode = null;
	}

	function calculateAndCachePositionsInsideParagraph(paragraphNode) {
		if (paragraphNode.uiWYSIWYG0_IsParagraphPrepared)
			return;

		paragraphNode.uiWYSIWYG0_IsParagraphPrepared = true;
		markElementsWithLineNumbers(paragraphNode);
		markElementsWithOffsets(paragraphNode);

		function markElementsWithLineNumbers(paragraphNode) {
			var prevNodeOffsX = 0;
			var lineNumber = 1;
			var nodeList = paragraphNode.childNodes;
			for (var i = 0, n = nodeList.length; i < n; i++) {
				var node = nodeList[i];
				if (!node.uiWYSIWYG0_IsCharacter && !node.uiWYSIWYG0_IsTextElement && !node.uiWYSIWYG0_IsEOLN)
					continue;

				var offsetX = nodeOffsetX(node);

				if (offsetX <= prevNodeOffsX)
					lineNumber++;

				node.uiWYSIWYG0_LineNumber = lineNumber;
				prevNodeOffsX = offsetX;
			}
		}

		function markElementsWithOffsets(paragraphNode) {
			// Calculating line offsets
			var nodeList = paragraphNode.childNodes;
			var lineOffsets = [];
			calculateLineOffsets();
			markElementsWithLineOffsets();

			function calculateLineOffsets() {
				var paragraphOffsetY = nodeOffsetY(paragraphNode);
				for (var i = 0, n = nodeList.length; i < n; i++) {
					var node = nodeList[i];
					var lineNumber = node.uiWYSIWYG0_LineNumber;
					if (!lineNumber)
						continue;

					var lineOffset = lineOffsets[lineNumber];

					var offsetY = nodeOffsetY(node);
					var y1 = offsetY - paragraphOffsetY;
					var y2 = offsetY + node.offsetHeight - paragraphOffsetY;

					if (lineOffset) {
						lineOffset.y1 = Math.min(lineOffset.y1, y1);
						lineOffset.y2 = Math.min(lineOffset.y2, y2);
					}
					else {
						lineOffset = {};
						lineOffset.y1 = y1;
						lineOffset.y2 = y2;
					}

					lineOffsets[lineNumber] = lineOffset;
				}
			}

			function markElementsWithLineOffsets() {
				for (var i = 0, n = nodeList.length; i < n; i++) {
					var node = nodeList[i];
					var lineNumber = node.uiWYSIWYG0_LineNumber;
					if (!lineNumber)
						continue;

					node.uiWYSIWYG_LineData = lineOffsets[lineNumber];
				}
			}
		}
	}

	function moveCaretToPoint(contentNode, x, y, target) {
		if (target.uiWYSIWYG0_IsCaretLine)
			return false;

		// Check if we are on character
		if (target.uiWYSIWYG0_IsCharacter) {
			uiWYSIWYG0_CaretNode = target;
			if (!isOffsXBeforeElementNode(x, target))
				moveCaretRight(contentNode);
			return true;
		}

		// Check if we are on line break
		if (target.uiWYSIWYG0_IsEOLN) {
			uiWYSIWYG0_CaretNode = target;
			return true;
		}

		// Trying to find closest text element
		var textElementNode = getClosestTextElementNode(target);
		if (textElementNode) {
			uiWYSIWYG0_CaretNode = textElementNode;
			if (!isOffsXBeforeElementNode(x, target))
				moveCaretRight(contentNode);
			return true;
		}

		// Check if we are mouse is below the content
		if (y < nodeOffsetY(contentNode)) {
			moveCaretAtContentStart(contentNode);
			return true;
		}

		// Otherwise we will thing that we are at the at of the content
		if (y >= nodeOffsetY(contentNode.lastChild) + contentNode.lastChild.offsetHeight) {
			moveCaretAtContentEnd(contentNode);
			return true;
		}

		// Finding closest paragraph
		if (!target.uiWYSIWYG0_IsParagraph) {
			var paragraphNode = findParagraphByOffsY(contentNode, y);
			if (paragraphNode)
				target = paragraphNode;
		}

		// Searching for character inside the paragraph
		if (target.uiWYSIWYG0_IsParagraph) {
			var node = findElementInsideParagraphByPoint(target, x, y);
			if (node)
				uiWYSIWYG0_CaretNode = node;

			return true;
		}

		return false;
	}

	function isOffsXBeforeElementNode(offsX, elementNode) {
		return (offsX < nodeOffset(elementNode).left + elementNode.offsetWidth / 2);
	}

	function getClosestTextElementNode(node) {
		for (;;) {
			if (!node)
				return null;

			if (node.uiWYSIWYG0_IsTextElement)
				return node;

			node = node.parentNode;
		}
	}

	function findParagraphByOffsY(contentNode, offsY) {
		var nodeList = contentNode.getElementsByClassName('wysiwyg0-paragraph');
		var totalDiff = Number.MAX_VALUE;
		var result = null;
		for (var i = 0, n = nodeList.length; i < n; i++) {
			var node = nodeList[i];
			if (!node.uiWYSIWYG0_IsParagraph)
				continue;

			var diff = offsY - nodeOffsetY(node);
			if (diff < 0)
				continue;

			if (diff >= totalDiff)
				break;

			result = node;
			totalDiff = diff;
		}

		return result;
	}

	function findElementInsideParagraphByPoint(paragraphNode, x, y) {
		calculateAndCachePositionsInsideParagraph(paragraphNode);

		var nodeList = paragraphNode.childNodes;
		var foundNode1 = null; // The closest element node which is on the same line
		var foundNode2 = null; // Mathematically closest element
		var foundNodeDistance1 = Number.MAX_VALUE;
		var foundNodeDistance2 = Number.MAX_VALUE;
		var contentOffsetY = nodeOffsetY(paragraphNode);
		for (var i = 0, n = nodeList.length; i < n; i++) {
			var node = nodeList[i];
			var offset = nodeOffset(node);

			var distanceX = Math.min(Math.abs(offset.left - x), Math.abs(offset.left + node.offsetWidth - x));

			if (distanceX < foundNodeDistance1 && y >= node.uiWYSIWYG_LineData['y1'] + contentOffsetY && y <= node.uiWYSIWYG_LineData['y2'] + contentOffsetY) {
				foundNode1 = node;
				foundNodeDistance1 = distanceX;
			}

			var deltaX = offset.left + node.offsetWidth / 2 - x;
			var deltaY = offset.top + node.offsetHeight / 2 - y;
			var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			if (distance < foundNodeDistance2) {
				foundNode2 = node;
				foundNodeDistance2 = distance;
			}
		}

		return foundNode1 ? foundNode1 : foundNode2;
	}

	function moveCaretLeft(contentNode) {
		var node = uiWYSIWYG0_CaretNode;
		if (!node)
			return;

		for (;;) {
			node = domTraversePrevious(contentNode, node);

			if (!node)
				return;

			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsTextElement || node.uiWYSIWYG0_IsEOLN) {
				uiWYSIWYG0_CaretNode = node;
				break;
			}
		}
	}

	function moveCaretRight(contentNode) {
		var node = uiWYSIWYG0_CaretNode;
		if (!node)
			return;

		for (;;) {
			node = domTraverseNext(contentNode, node);

			if (!node)
				return;

			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsTextElement || node.uiWYSIWYG0_IsEOLN) {
				uiWYSIWYG0_CaretNode = node;
				break;
			}
		}
	}

	function moveCaretUp(contentNode) {
		if (!uiWYSIWYG0_CaretNode)
			return;

		if (uiWYSIWYG0_CaretNode != cachedNode) {
			cachedNode = uiWYSIWYG0_CaretNode;
			cachedOffsetX = nodeOffsetX(uiWYSIWYG0_CaretNode);
		}

		var paragraphNode = uiWYSIWYG0_CaretNode.parentNode;
		calculateAndCachePositionsInsideParagraph(paragraphNode);
		var lineNumber = uiWYSIWYG0_CaretNode.uiWYSIWYG0_LineNumber;
		if (!lineNumber)
			return;

		var node = uiWYSIWYG0_CaretNode;
		var foundDiff = Number.MAX_VALUE;
		while (node) {
			if (node.uiWYSIWYG0_IsParagraph)
				calculateAndCachePositionsInsideParagraph(node);

			if (node.uiWYSIWYG0_LineNumber) {
				if (node.uiWYSIWYG0_LineNumber != lineNumber || paragraphNode != node.parentNode) {
					var diff = Math.abs(nodeOffsetX(node) - cachedOffsetX);
					if (diff < foundDiff) {
						uiWYSIWYG0_CaretNode = node;
						cachedNode = node;
						foundDiff = diff;
					}
					else
						break;
				}
			}

			node = domTraversePrevious(contentNode, node);
		}
	}

	function moveCaretDown(contentNode) {
		if (!uiWYSIWYG0_CaretNode)
			return;

		if (uiWYSIWYG0_CaretNode != cachedNode) {
			cachedNode = uiWYSIWYG0_CaretNode;
			cachedOffsetX = nodeOffsetX(uiWYSIWYG0_CaretNode);
		}

		var paragraphNode = uiWYSIWYG0_CaretNode.parentNode;
		calculateAndCachePositionsInsideParagraph(paragraphNode);
		var lineNumber = uiWYSIWYG0_CaretNode.uiWYSIWYG0_LineNumber;
		if (!lineNumber)
			return;

		var node = uiWYSIWYG0_CaretNode;
		var foundDiff = Number.MAX_VALUE;
		while (node) {
			if (node.uiWYSIWYG0_IsParagraph)
				calculateAndCachePositionsInsideParagraph(node);

			if (node.uiWYSIWYG0_LineNumber) {
				if (node.uiWYSIWYG0_LineNumber != lineNumber || paragraphNode != node.parentNode) {
					var diff = Math.abs(nodeOffsetX(node) - cachedOffsetX);
					if (diff < foundDiff) {
						uiWYSIWYG0_CaretNode = node;
						cachedNode = node;
						foundDiff = diff;
					}
					else
						break;
				}
			}

			node = domTraverseNext(contentNode, node);
		}
	}

	function moveCaretAtLineStart() {
		if (!uiWYSIWYG0_CaretNode)
			return;

		var paragraphNode = uiWYSIWYG0_CaretNode.parentNode;
		calculateAndCachePositionsInsideParagraph(paragraphNode);

		var lineNumber = uiWYSIWYG0_CaretNode.uiWYSIWYG0_LineNumber;
		if (!lineNumber)
			return;

		var node = uiWYSIWYG0_CaretNode;
		while (node) {
			if (node.uiWYSIWYG0_LineNumber) {
				if (node.uiWYSIWYG0_LineNumber == lineNumber)
					uiWYSIWYG0_CaretNode = node;
				else
					break;
			}

			node = domTraversePrevious(paragraphNode, node);
		}
	}

	function moveCaretAtLineEnd() {
		if (!uiWYSIWYG0_CaretNode)
			return;

		var paragraphNode = uiWYSIWYG0_CaretNode.parentNode;
		calculateAndCachePositionsInsideParagraph(paragraphNode);

		var lineNumber = uiWYSIWYG0_CaretNode.uiWYSIWYG0_LineNumber;
		if (!lineNumber)
			return;

		var node = uiWYSIWYG0_CaretNode;
		while (node) {
			if (node.uiWYSIWYG0_LineNumber) {
				if (node.uiWYSIWYG0_LineNumber == lineNumber)
					uiWYSIWYG0_CaretNode = node;
				else
					break;
			}

			node = domTraverseNext(paragraphNode, node);
		}
	}

	function moveCaretAtContentStart(contentNode) {
		var node = contentNode.firstChild;
		while (node) {
			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsEOLN || node.uiWYSIWYG0_IsTextElement) {
				uiWYSIWYG0_CaretNode = node;
				break;
			}
			node = domTraverseNext(contentNode, node);
		}
	}

	function moveCaretAtContentEnd(contentNode) {
		var node = contentNode.lastChild;
		while (node) {
			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsEOLN || node.uiWYSIWYG0_IsTextElement) {
				uiWYSIWYG0_CaretNode = node;
				break;
			}
			node = domTraversePrevious(contentNode, node);
		}
	}

	plugin.resetCachedPositions = resetCachedPositions;
	plugin.moveCaretToPoint = moveCaretToPoint;
	plugin.moveCaretLeft = moveCaretLeft;
	plugin.moveCaretRight = moveCaretRight;
	plugin.moveCaretUp = moveCaretUp;
	plugin.moveCaretDown = moveCaretDown;
	plugin.moveCaretAtLineStart = moveCaretAtLineStart;
	plugin.moveCaretAtLineEnd = moveCaretAtLineEnd;
	plugin.moveCaretAtContentStart = moveCaretAtContentStart;
	plugin.moveCaretAtContentEnd = moveCaretAtContentEnd;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > Caret Calculations Layer
//======================================================================================================================

//======================================================================================================================
//	 WYSIWYG > Caret Visualization Layer
//======================================================================================================================
(function() {
	$.fn.WYSIWYG0_Caret = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('WYSIWYG0_Caret');
		if (isObject(prevInstance)) {
			if (isObject(options))
				prevInstance.update(options);
			return prevInstance;
		}

		var jQ = uiWYSIWYG0_GetJQ('wysiwyg0-caret');
		parentElementJQ.append(jQ);

		var caretLineJQ = jQ.find('.wysiwyg0-caret-line:first');
		var hookJQ = jQ.find('.wysiwyg0-caret-keyboard-api:first textarea:first');

		var caretElementJQ = $();
		var onKeyPress = null;
		var onCut = null;
		var onPaste = null;
		var onFocus = null;
		var onFocusOut = null;
		var blinkTimer = null;
		var caretVisible = false;
		var focusLocker = new Locker();

		update(options);

		// Process caret unfocusing
		hookJQ.on('focus', function() {
			if (caretVisible)
				return;

			if (focusLocker.locked())
				return;

			focusLocker.beginLock();
			showCaret();
			focusLocker.endLock();
		});

		// Process caret unfocusing
		hookJQ.on('blur', function() {
			if (uiIsFocusingLocked(hookJQ))
				return;

			if (isFunction(onFocusOut))
				onFocusOut();

			hideCaret();
		});

		// Processing keyboard events
		hookJQ.on('keypress', function(event) {
			if (event['ctrlKey'] || event['altKey'])
				return;

			var code = event.keyCode;
			var char = String.fromCharCode(event['charCode']);

			if (char.length != 1)
				return;

			if (code == 13)
				return;

			hookJQ.val('');

			if (isFunction(onKeyPress)) {
				onKeyPress({
					'code': code,
					'char': char,
					'ctrl': false,
					'alt': false,
					'shift': toBoolean(event['shiftKey']),
					'preventDefault': function() {
						event.preventDefault();
					}
				});
			}
		});

		// Processing keyboard events
		hookJQ.on('keydown', function(event) {
			if (isFunction(onKeyPress)) {
				onKeyPress({
					'code': event['keyCode'],
					'char': '',
					'ctrl': toBoolean(event['ctrlKey']),
					'alt': toBoolean( event['altKey']),
					'shift': toBoolean(event['shiftKey']),
					'preventDefault': function() {
						event.preventDefault();
					}
				});
			}
		});

		// Processing cut event
		hookJQ.on('cut', function() {
			if (isFunction(onCut))
				onCut();
		});

		// Processing paste event
		hookJQ.on('paste', function(event) {
			event.preventDefault();
			event.stopPropagation();

			var clipboardData = event['originalEvent']['clipboardData'] || window['clipboardData'];
			var pastedText = clipboardData.getData('text');
			if (isFunction(onPaste))
				onPaste(pastedText);
		});

		function update(params) {
			params = toObject(params);

			var refreshNeeded = false;
			var showCaretNeeded = false;

			if (params.hasOwnProperty('element')) {
				setCaretElement(params['element']);
				refreshNeeded = true;
				showCaretNeeded = true;
			}

			if (params.hasOwnProperty('onKeyPress'))
				onKeyPress = params['onKeyPress'];

			if (params.hasOwnProperty('onCut'))
				onCut = params['onCut'];

			if (params.hasOwnProperty('onPaste'))
				onPaste = params['onPaste'];

			if (params.hasOwnProperty('onFocus'))
				onFocus = params['onFocus'];

			if (params.hasOwnProperty('onFocusOut'))
				onFocusOut = params['onFocusOut'];

			if (refreshNeeded)
				refresh();
			if (showCaretNeeded)
				showCaret();
		}

		function setCaretElement(element) {
			var newCaretElementJQ = toJQueryObject(element);
			if (newCaretElementJQ.is(caretElementJQ))
				return;

			caretElementJQ = newCaretElementJQ;
		}

		function refresh() {
			if (!caretElementJQ.length)
				return;

			var contentNode = parentElementJQ[0];
			var node = caretElementJQ[0];
			var caretX = nodeOffsetX(node) - nodeOffsetX(contentNode);
			var caretY = nodeOffsetY(node) - nodeOffsetY(contentNode);
			var caretHeight = node.offsetHeight;

			jQ.css({
				'left': caretX + 'px',
				'top': caretY + 'px',
				'height': caretHeight + 'px'
			});

			caretLineJQ.css({
				'background-color': caretElementJQ.css('color')
			});
		}

		function setClipboardBuffer(text) {
			hookJQ.val(text);
			hookJQ.focus();
			hookJQ.select();
		}

		function copyToClipboard() {
			hookJQ.focus();
			hookJQ.select();
			document.execCommand('copy');
		}

		function showCaret() {
			// Turning on keyboard api
			hookJQ.focus();

			// Showing caret line
			caretLineJQ.show();

			// Restarting caret blinking timer
			if (blinkTimer)
				clearInterval(blinkTimer);
			blinkTimer = setInterval(function() {
				caretLineJQ.toggle();
			}, 530);

			// Telling that caret is visible
			caretVisible = true;

			if (isFunction(onFocus))
				onFocus();
		}

		function hideCaret() {
			// Stopping caret blinking timer
			if (blinkTimer) {
				clearInterval(blinkTimer);
				blinkTimer = null;
			}

			// Hiding caret line
			caretLineJQ.hide();

			// Telling that caret is not visible
			caretVisible = false;
		}

		function keepFocused() {
			uiKeepFocused(hookJQ);
		}

		function getFocusTarget() {
			return hookJQ;
		}

		function focus() {
			hookJQ.focus();

			if (!caretVisible)
				showCaret();
		}

		var externalInterface = {
			'update': update,
			'refresh': refresh,
			'keepFocused': keepFocused,
			'focusTarget': getFocusTarget,
			'focus': focus,

			// Clipboard manipulation
			'setClipboardBuffer': setClipboardBuffer,
			'copyToClipboard': copyToClipboard
		};
		parentElementJQ.data('WYSIWYG0_Caret', externalInterface);
		caretLineJQ[0].uiWYSIWYG0_IsCaretLine = true;
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: WYSIWYG > Caret Visualization Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Selection Calculation Layer
//======================================================================================================================
(function(plugin) {

	function addFill(contentNode, node1, node2) {
		var node = node1;
		while (node) {
			if (node == node2)
				return;

			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsTextElement)
				nodeAddClass(node, 's');

			node = domTraverseNext(contentNode, node);
		}
	}

	function removeFill(contentNode, node1, node2) {
		var node = node1;
		while (node) {
			if (node == node2)
				return;

			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsTextElement)
				nodeRemoveClass(node, 's');

			node = domTraverseNext(contentNode, node);
		}
	}

	function removeSelection(contentNode, node1, node2) {
		if (nodeOrder(node1, node2) > 0)
			removeFill(contentNode, node1, node2);
		else
			removeFill(contentNode, node2, node1);
	}

	function addSelection(contentNode, node1, node2) {
		if (nodeOrder(node1, node2) > 0)
			addFill(contentNode, node1, node2);
		else
			addFill(contentNode, node2, node1);
	}

	function selectionIsCollapsed(a1, a2, b1, b2) {
		if (nodeOrder(a1, b1) == nodeOrder(b1, a2))
			return true;

		if (nodeOrder(a1, b2) == nodeOrder(b2, a2))
			return true;

		if (nodeOrder(b1, a1) == nodeOrder(a1, b2))
			return true;

		if (nodeOrder(b1, a2) == nodeOrder(a2, b2))
			return true;

		return false;
	}

	function moveSelection(contentNode, oldNode1, oldNode2, newNode1, newNode2) {
		// Moving selection start point
		if (nodeOrder(oldNode1, newNode1) > 0)
			removeFill(contentNode, oldNode1, newNode1);
		else
			addFill(contentNode, newNode1, oldNode1);

		// Moving selection end point
		if (nodeOrder(oldNode2, newNode2) > 0)
			addFill(contentNode, oldNode2, newNode2);
		else
			removeFill(contentNode, newNode2, oldNode2);
	}

	function updateSelection(contentNode, oldNode1, oldNode2, newNode1, newNode2) {
		// If ranges are collapsed then we merge one range into another
		if (selectionIsCollapsed(oldNode1, oldNode2, newNode1, newNode2)) {
			moveSelection(contentNode, oldNode1, oldNode2, newNode1, newNode2);
			return;
		}

		// If ranges are not collapsed than we remove old range and adding new one
		removeSelection(contentNode, oldNode1, oldNode2);
		addSelection(contentNode, newNode1, newNode2);
	}

	function setSelection(contentNode, oldNode1, oldNode2, newNode1, newNode2) {
		// If none ranges are valid than we just exit
		if ((!oldNode1 || !oldNode2) && (!newNode1 || !newNode2))
			return;

		// Adding new selection only
		if (!oldNode1 || !oldNode2 || oldNode1 == oldNode2) {
			addSelection(contentNode, newNode1, newNode2);
			return;
		}

		// Removing existed selection only
		if (!newNode1 || !newNode2 || newNode1 == newNode2) {
			removeSelection(contentNode, oldNode1, oldNode2);
			return;
		}

		// Normalizing old range
		var oldRangeValid = (nodeOrder(oldNode1, oldNode2) >= 0);
		var oldStartNode = oldRangeValid ? oldNode1 : oldNode2;
		var oldEndNode = oldRangeValid ? oldNode2 : oldNode1;

		// Normalizing new range
		var newRangeValid = (nodeOrder(newNode1, newNode2) >= 0);
		var newStartNode = newRangeValid ? newNode1 : newNode2;
		var newEndNode = newRangeValid ? newNode2 : newNode1;

		updateSelection(contentNode, oldStartNode, oldEndNode, newStartNode, newEndNode);
	}

	plugin.setSelection = setSelection;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > Selection Calculation Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Selection Visual Layer
//======================================================================================================================
(function() {
	$.fn.WYSIWYG0_Selection = function(options) {
		var jQ = $(this);
		var prevInstance = jQ.data('WYSIWYG0_Selection');
		if (isObject(prevInstance))
			return prevInstance;

		var oldNode1 = null;
		var oldNode2 = null;
		var node1 = null;
		var node2 = null;

		update(options);

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('node1'))
				node1 = params['node1'];

			if (params.hasOwnProperty('node2'))
				node2 = params['node2'];

			refresh();
		}

		function refresh() {
			if (oldNode1 == node1 && oldNode2 == node2)
				return;

			uiWYSIWYG0.setSelection(jQ[0], oldNode1, oldNode2, node1, node2);

			oldNode1 = node1;
			oldNode2 = node2;
		}

		function getNode1() {
			return node1;
		}

		function getNode2() {
			return node2;
		}

		function isVisible() {
			return (node1 != node2);
		}

		function reset() {
			node1 = null;
			node2 = null;
			uiWYSIWYG0.setSelection(jQ[0], oldNode1, oldNode2, node1, node2);
		}

		var externalInterface = {
			'update': update,
			'node1': getNode1,
			'node2': getNode2,
			'visible': isVisible,
			'reset': reset
		};
		jQ.data('WYSIWYG0_Selection', externalInterface);
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: WYSIWYG > Selection Visual Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Content Deletion Layer
//======================================================================================================================
(function(plugin) {

	function findNextParagraph(contentNode, paragraphNode) {
		var node = domTraverseNext(contentNode, paragraphNode);

		while (node) {
			if (node.uiWYSIWYG0_IsParagraph)
				return node;

			node = domTraverseNext(contentNode, node);
		}
		return null;
	}

	function removeLineBreak(contentNode, node) {
		var paragraphNode = node.parentNode;
		var nextParagraphNode = findNextParagraph(contentNode, paragraphNode);
		if (nextParagraphNode && nextParagraphNode.uiWYSIWYG0_IsParagraph) {
			var containerNode = nextParagraphNode.parentNode;

			removeNode(node);
			mergeNodes(paragraphNode, nextParagraphNode);

			if (containerNode.childNodes.length == 0)
				removeEmptyCustomElement(containerNode);
		}
	}

	function removeEmptyCustomElement(parentNode) {
		// Searching for closest custom element and removing it
		var node = parentNode;
		for (;;) {
			if (!node)
				break;

			if (node.uiWYSIWYG0_IsBlockElement || node.uiWYSIWYG0_IsTextElement) {
				removeNode(node);
				break;
			}

			node = node.parentNode;
		}
	}

	function removeElementByNode(contentNode, node) {
		if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsTextElement)
			removeNode(node);
		else if (node.uiWYSIWYG0_IsEOLN)
			removeLineBreak(contentNode, node);
	}

	function removeElement(contentNode) {
		var node = uiWYSIWYG0_CaretNode;
		uiWYSIWYG0.moveCaretRight(contentNode);
		removeElementByNode(contentNode, node);
	}

	function removeElementOrderedRange(contentNode, fromNode, toNode) {
		uiWYSIWYG0_CaretNode = toNode;

		// Preparing list of nodes that will be removes
		var removeList = [];
		var node = fromNode;
		while (node) {
			if (node == toNode)
				break;

			if (node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsTextElement || node.uiWYSIWYG0_IsEOLN)
				removeList.push(node);

			node = domTraverseNext(contentNode, node);
		}

		// Removing nodes
		for (var i = 0, n = removeList.length; i < n; i++) {
			if (removeList[i].parentNode)
				removeElementByNode(contentNode, removeList[i]);
		}
	}

	function removeElementRange(contentNode, fromNode, toNode) {
		if (nodeOrder(fromNode, toNode) >= 0)
			removeElementOrderedRange(contentNode, fromNode, toNode);
		else
			removeElementOrderedRange(contentNode, toNode, fromNode);
	}

	plugin.removeElement = removeElement;
	plugin.removeElementRange = removeElementRange;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > Content Deletion Layer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Content To Text Conversion Layer
//======================================================================================================================
(function(plugin) {

	function getTextAtRange(contentNode, node1, node2) {
		if (nodeOrder(node1, node2) > 0)
			return getTextAtDirectRange(node1, node2);

		return getTextAtDirectRange(node2, node1);

		function getTextAtDirectRange(node1, node2) {
			var text = '';
			var node = node1;
			while (node) {
				if (node == node2)
					break;

				if (node.uiWYSIWYG0_IsCharacter) {
					if (node.uiWYSIWYG0_IsSpace)
						text += ' ';
					else
						text += node.innerText;
				}
				else if (node.uiWYSIWYG0_IsEOLN) {
					text += '\n';
				}

				node = domTraverseNext(contentNode, node);
			}
			return text;
		}
	}

	plugin.getTextAtRange = getTextAtRange;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > Content To Text Conversion Layer
//======================================================================================================================

//======================================================================================================================
//	END OF: WYSIWYG > Link Auto Highlighter
//======================================================================================================================
(function(plugin) {
	function checkSequence(node, sequence) {
		for (var i = 0; i < sequence.length; i++) {
			if (!node)
				return false;

			if (sequence[i] != node.innerText)
				return false;

			node = node.nextSibling;
		}

		return true;
	}

	function applyHighlight(node, callback) {
		var url = '';
		var node1 = node;
		var node2 = node;
		while (node) {
			if (!node.uiWYSIWYG0_IsCharacter || node.uiWYSIWYG0_IsSpace)
				break;

			url += node.innerText;
			node.uiWYSIWYG0_IsAutomaticLink = true;
			node2 = node;

			node = node.nextSibling;
		}
		callback({
			'url': url,
			'node1': node1,
			'node2': node2.nextSibling
		});
		return node2;
	}

	function removeHighlight(node, callback) {
		var node1 = node;
		var node2 = node;
		while (node) {
			if (!node.uiWYSIWYG0_IsAutomaticLink)
				break;

			delete node.uiWYSIWYG0_IsAutomaticLink;
			node2 = node;

			node = node.nextSibling;
		}
		callback({
			'url': '',
			'node1': node1,
			'node2': node2.nextSibling
		});
	}

	function highlightLinksAtRange(contentNode, node1, node2, callback) {
		var node = node1;
		while (node) {
			if (node == node2)
				break;

			if (checkSequence(node, 'http://') || checkSequence(node, 'https://'))
				node = applyHighlight(node, callback);

			node = domTraverseNext(contentNode, node);
		}
	}

	function highlightAllLinks(contentNode, callback) {
		var savedCaretNode = uiWYSIWYG0_CaretNode;

		uiWYSIWYG0.moveCaretAtContentStart(contentNode);
		var startNode = uiWYSIWYG0_CaretNode;

		uiWYSIWYG0.moveCaretAtContentEnd(contentNode);
		var endNode = uiWYSIWYG0_CaretNode;

		highlightLinksAtRange(contentNode, startNode, endNode, callback);

		uiWYSIWYG0_CaretNode = savedCaretNode;
	}

	function findBeginningOfTheWord(middleNode) {
		// Moving middle node to the current work
		while (middleNode) {
			if (middleNode.uiWYSIWYG0_IsSpace || middleNode.uiWYSIWYG0_IsEOLN)
				middleNode = middleNode.previousSibling;
			else
				break;
		}

		if (!middleNode)
			return null;

		// Searching for the beginning of the word
		var node1 = middleNode;
		var node = node1;
		while (node) {
			if (node.uiWYSIWYG0_IsCharacter && !node.uiWYSIWYG0_IsSpace)
				node1 = node;
			else
				break;

			node = node.previousSibling;
		}
		return node1;
	}

	function findEndOfTheWord(middleNode) {
		// Moving middle node to the current work
		while (middleNode) {
			if (middleNode.uiWYSIWYG0_IsSpace || middleNode.uiWYSIWYG0_IsEOLN)
				middleNode = middleNode.previousSibling;
			else
				break;
		}

		if (!middleNode)
			return null;

		// Searching for the beginning of the word
		var node2 = middleNode;
		var node = node2;
		while (node) {
			if (node.uiWYSIWYG0_IsCharacter && !node.uiWYSIWYG0_IsSpace)
				node2 = node;
			else
				break;

			node = node.nextSibling;
		}
		return node2;
	}

	function removeLinkHighlightAtRange(contentNode, node1, node2, callback) {
		// Removing all automatic links
		var node = node1;
		while (node) {
			if (node == node2)
				break;

			if (node.uiWYSIWYG0_IsAutomaticLink)
				removeHighlight(node, callback);

			node = domTraverseNext(contentNode, node);
		}
	}

	function performHighLight(contentNode, node, callback) {
		var node1 = findBeginningOfTheWord(node);
		var node2 = findEndOfTheWord(node);
		removeLinkHighlightAtRange(contentNode, node1, node2, callback);
		highlightLinksAtRange(contentNode, node1, node2, callback);
	}

	function highlightLink(contentNode, callback) {
		var savedCaretNode = uiWYSIWYG0_CaretNode;
		var currNode = uiWYSIWYG0_CaretNode;
		uiWYSIWYG0.moveCaretLeft(contentNode);
		var prevNode = uiWYSIWYG0_CaretNode;

		performHighLight(contentNode, currNode, callback);
		performHighLight(contentNode, prevNode, callback);

		uiWYSIWYG0_CaretNode = savedCaretNode;
	}

	plugin.highlightAllLinks = highlightAllLinks;
	plugin.highlightLink = highlightLink;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG > Link Auto Highlighter
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG
//======================================================================================================================
(function() {
	var initializedOnce = false;
	var dragInstance = null;

	$.fn.WYSIWYG0 = function(options) {
		var parentJQ = $(this);
		var prevInstance = parentJQ.data('WYSIWYG0');
		if (isObject(prevInstance)) {
			prevInstance.update(options);
			return prevInstance;
		}

		initializeOnce();
		var jQ = uiWYSIWYG0_GetJQ('wysiwyg0');
		parentJQ.append(jQ);

		var placeholderJQ = jQ.find('.wysiwyg0-placeholder:first');
		var contentJQ = jQ.find('.wysiwyg0-content-box:first');
		var contentNode = contentJQ[0];
		var caretNode = null;

		var selectionStarted = false;
		var onStateChange = null;
		var currentCSS = {};
		var currentCSSForNode = null;
		var highlightInitialLinks = false;
		var highlightEnteredLinks = false;
		var onFocus = null;
		var onFocusOut = null;

		var caret = jQ.find('.wysiwyg0-caret-box:first').WYSIWYG0_Caret({
			'onKeyPress': function(event) {
				uiWYSIWYG0_CaretNode = caretNode;
				var keyProcessed = true;

				if (event.code == 13) // Enter
					processKeyPressOnEnterKey();
				else if (event.char.length > 0) // Any visible symbol
					processCharKeyPress(event);
				else if (!event.alt && !event.shift && !event.ctrl && event.code == 46) // Delete
					processKeyPressOnDeleteKey();
				else if (!event.alt && !event.shift && !event.ctrl && event.code == 8) // Backspace
					processKeyPressOnBackspaceKey();

				else if (!event.alt && !event.ctrl && event.code == 37) // (Shift+) Left Arrow
					processKeyPressOnLeftArrow(event);
				else if (!event.alt && !event.ctrl && event.code == 39) // (Shift+) Right Arrow
					processKeyPressOnRightArrow(event);
				else if (!event.alt && !event.ctrl && event.code == 38) // (Shift+) Up Arrow
					processKeyPressOnUpArrow(event);
				else if (!event.alt && !event.ctrl && event.code == 40) // (Shift+) Down Arrow
					processKeyPressOnDownArrow(event);
				else if (!event.alt && !event.ctrl && event.code == 36) // (Shift+) Home
					processKeyPressOnHomeKey(event);
				else if (!event.alt && !event.ctrl && event.code == 35) // (Shift+) End
					processKeyPressOnEndKey(event);

				else if (!event.alt && !event.shift && event.ctrl && event.code == 65) // Ctrl + A
					selectAll();
				else if (!event.alt && !event.shift && event.ctrl && event.code == 90) // Ctrl + Z
					undo();
				else if (!event.alt && event.shift && event.ctrl && event.code == 90) // Ctrl + Shift + Z
					redo();
				else
					keyProcessed = false;

				if (keyProcessed)
					event.preventDefault();

				caretNode = uiWYSIWYG0_CaretNode;
				caret.update({
					'element': uiWYSIWYG0_CaretNode
				});
				stateChanged();
			},
			'onFocus': function() {
				if (isFunction(onFocus))
					onFocus();
			},
			'onFocusOut': function() {
				uiWYSIWYG0.resetCachedPositions(contentNode);

				if (isFunction(onFocusOut))
					onFocusOut();
			},
			'onCut': function() {
				removeSelection();
				caret.refresh();
			},
			'onPaste': function(text) {
				uiWYSIWYG0_CaretNode = caretNode;
				uiWYSIWYG0.insertText(text);

				history.start();
				history.insertElementRange(contentNode, caretNode, uiWYSIWYG0_CaretNode);
				history.end();

				caretNode = uiWYSIWYG0_CaretNode;
				caret.update({
					'element': caretNode
				});
			}
		});

		var selection = contentJQ.WYSIWYG0_Selection();
		var contextMenu = contentJQ.WYSIWYG0_ContextMenu({
			'focusTarget': caret.focusTarget(),
			'onCut': function() {
				caret.copyToClipboard();
				removeSelection();
				uiWYSIWYG0.resetCachedPositions(contentNode);
				onStateChange();
			},
			'onCopy': function() {
				caret.copyToClipboard();
			},
			'onPaste': function() {
				WYSIWYG0_PASTE_DIALOG.display({
					'focusTarget': caret.focusTarget()
				}, function(text) {
					if (text != '') {
						removeSelection();
						uiWYSIWYG0_CaretNode = caretNode;
						uiWYSIWYG0.insertText(text);
						uiWYSIWYG0.resetCachedPositions(contentNode);
						caret.refresh();
					}
					caret.focus();
				});
			},
			'onUndo': undo,
			'onRedo': redo,
			'onCanUndo': function() {
				return history.canUndo();
			},
			'onCanRedo': function() {
				return history.canRedo();
			}
		});

		var history = new WYSIWYG0_History(contentNode);

		// Cleaning content
		uiWYSIWYG0.clearContent(contentNode);
		caretNode = uiWYSIWYG0_CaretNode;

		updateEmptyState();
		update(options);

		// Processing mouse down event
		contentJQ.on('mousedown', function(event) {
			if (event.which == 1) {
				event.preventDefault();
				startDragging(event);
			}
			else if (event.which == 3) {
				event.preventDefault();
				contextMenu.displayAt(event.pageX, event.pageY, selection.visible());
			}
		});

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('highlightInitialLinks'))
				highlightInitialLinks = toBoolean(params['highlightInitialLinks']);

			if (params.hasOwnProperty('highlightEnteredLinks'))
				highlightEnteredLinks = toBoolean(params['highlightEnteredLinks']);

			if (params.hasOwnProperty('html')) {
				uiWYSIWYG0.setHTML(contentNode, params['html']);
				caretNode = uiWYSIWYG0_CaretNode;
				if (highlightInitialLinks) {
					uiWYSIWYG0.highlightAllLinks(contentNode, function(event) {
						uiWYSIWYG0.setLink(contentNode, event['node1'], event['node2'], event['url']);
					});
				}
				stateChanged();
				updateEmptyState();
			}

			if (params.hasOwnProperty('padding')) {
				var padding = toString(params['padding']);
				contentJQ.css('padding', padding);
				placeholderJQ.css('padding', padding);
			}

			if (params.hasOwnProperty('placeholder'))
				placeholderJQ.text(toString(params['placeholder']));

			if (params.hasOwnProperty('height'))
				contentJQ.css('height', toInt(params['height']) + 'px');

			if (params.hasOwnProperty('maxHeight'))
				contentJQ.css('max-height', toInt(params['maxHeight']) + 'px');

			if (params.hasOwnProperty('minHeight'))
				contentJQ.css('min-height', toInt(params['minHeight']) + 'px');

			if (params.hasOwnProperty('onStateChange'))
				onStateChange = params['onStateChange'];

			if (params.hasOwnProperty('onFocus'))
				onFocus = params['onFocus'];

			if (params.hasOwnProperty('onFocusOut'))
				onFocusOut = params['onFocusOut'];
		}

		function startDragging(event) {
			var found = uiWYSIWYG0.moveCaretToPoint(contentNode, event.pageX, event.pageY, event.target);
			if (!found)
				return;

			// Updating caret
			caretNode = uiWYSIWYG0_CaretNode;
			caret.update({
				'element': caretNode
			});
			caret.keepFocused();

			// Updating selection
			selection.update({
				'node1': caretNode,
				'node2': caretNode
			});

			dragInstance = {
				'processDragging': processDragging,
				'stopDragging': stopDragging
			};
		}

		function processDragging(event) {
			var found = uiWYSIWYG0.moveCaretToPoint(contentNode, event.pageX, event.pageY, event.target);
			if (!found)
				return;

			// Updating caret
			caretNode = uiWYSIWYG0_CaretNode;
			caret.update({
				'element': caretNode
			});

			// Updating selection
			selection.update({
				'node2': caretNode
			});
		}

		function stopDragging() {
			dragInstance = null;
			if (currentCSSForNode != uiWYSIWYG0_CaretNode) {
				currentCSS = toObject(uiWYSIWYG0.getElementStyles());
				currentCSSForNode = uiWYSIWYG0_CaretNode;
			}
			updateCopyBuffer();
			stateChanged();
		}

		function processCharKeyPress(event) {
			history.start();
			removeSelection();

			var options = toObject(uiWYSIWYG0.getElementData());
			if (!isEmpty(currentCSS)) {
				options['css'] = toObject(options['css']);
				copyProperties(options['css'], currentCSS);
			}
			uiWYSIWYG0.insertCharacter(event['char'], options);
			history.insertElement();
			tryToHighlightTheLink();
			caret.refresh();
			uiWYSIWYG0.resetCachedPositions(contentNode);
			history.end();
			updateEmptyState();
		}

		function processKeyPressOnEnterKey() {
			history.start();
			removeSelection();
			uiWYSIWYG0.insertLineBreak();
			history.insertLineBreak();
			tryToHighlightTheLink();
			uiWYSIWYG0.resetCachedPositions(contentNode);
			history.end();
			updateEmptyState();
		}

		function processKeyPressOnDeleteKey() {
			if (selection.visible()) {
				history.start();
				removeSelection();
				history.end();
				return;
			}

			history.start();
			if (uiWYSIWYG0_CaretNode.uiWYSIWYG0_IsEOLN)
				history.removeLineBreak();
			else
				history.removeElement();

			uiWYSIWYG0.removeElement(contentNode);
			tryToHighlightTheLink();
			uiWYSIWYG0.resetCachedPositions(contentNode);
			history.end();
			updateEmptyState();
		}

		function processKeyPressOnBackspaceKey() {
			if (selection.visible()) {
				history.start();
				removeSelection();
				history.end();
				return;
			}

			var oldNode = uiWYSIWYG0_CaretNode;
			uiWYSIWYG0.moveCaretLeft(contentNode);

			if (oldNode != uiWYSIWYG0_CaretNode) {
				history.start();
				if (uiWYSIWYG0_CaretNode.uiWYSIWYG0_IsEOLN)
					history.removeLineBreak();
				else
					history.removeElement();

				uiWYSIWYG0.removeElement(contentNode);
				tryToHighlightTheLink();
				uiWYSIWYG0.resetCachedPositions(contentNode);
				history.end();
				updateEmptyState();
			}
		}

		function processKeyPressOnLeftArrow(event) {
			tryStartSelection(event);
			uiWYSIWYG0.moveCaretLeft(contentNode);
			tryEndSelection(event);
		}

		function processKeyPressOnRightArrow(event) {
			tryStartSelection(event);
			uiWYSIWYG0.moveCaretRight(contentNode);
			tryEndSelection(event);
		}

		function processKeyPressOnUpArrow(event) {
			tryStartSelection(event);
			uiWYSIWYG0.moveCaretUp(contentNode);
			tryEndSelection(event);
		}

		function processKeyPressOnDownArrow(event) {
			tryStartSelection(event);
			uiWYSIWYG0.moveCaretDown(contentNode);
			tryEndSelection(event);
		}

		function processKeyPressOnHomeKey(event) {
			tryStartSelection(event);
			uiWYSIWYG0.moveCaretAtLineStart();
			tryEndSelection(event);
		}

		function processKeyPressOnEndKey(event) {
			tryStartSelection(event);
			uiWYSIWYG0.moveCaretAtLineEnd();
			tryEndSelection(event);
		}

		function selectAll() {
			uiWYSIWYG0.moveCaretAtContentStart(contentNode);
			var startNode = uiWYSIWYG0_CaretNode;

			uiWYSIWYG0.moveCaretAtContentEnd(contentNode);
			var endNode = uiWYSIWYG0_CaretNode;

			selection.update({
				'node1': startNode,
				'node2': endNode
			});

			caretNode = endNode;
			caret.update({
				'element': caretNode
			});
			stateChanged();
		}

		function removeSelection() {
			if (selection.visible()) {
				history.removeElementRange(contentNode, selection.node1(), selection.node2());
				uiWYSIWYG0.removeElementRange(contentNode, selection.node1(), selection.node2());

				selection.reset();
				uiWYSIWYG0.resetCachedPositions(contentNode);
				updateEmptyState();
			}
		}

		function resetSelection() {
			selection.reset();
		}

		function tryStartSelection(event) {
			if (!selectionStarted && event.shift) {
				selection.update({
					'node1': uiWYSIWYG0_CaretNode
				});
				selectionStarted = true;
			}
			else if (!event.shift)
				resetSelection();
		}

		function tryEndSelection(event) {
			currentCSS = toObject(uiWYSIWYG0.getElementStyles());
			currentCSSForNode = uiWYSIWYG0_CaretNode;

			if (selectionStarted && !event.shift)
				selectionStarted = false;

			if (selectionStarted) {
				selection.update({
					'node2': uiWYSIWYG0_CaretNode
				});
				updateCopyBuffer();
			}
		}

		function getHTML() {
			return uiWYSIWYG0.getHTML(contentNode);
		}

		function keepFocused() {
			caret.keepFocused();
		}

		function getFocusTarget() {
			return caret.focusTarget();
		}

		function focus() {
			caret.focus();
		}

		function stateChanged() {
			uiWYSIWYG0_CaretNode = caretNode;

			if (isFunction(onStateChange))
				onStateChange();
		}

		function insertVariable(options) {
			options = toObject(options);

			if (!isEmpty(currentCSS)) {
				options['css'] = toObject(options['css']);
				copyProperties(options['css'], currentCSS);
			}

			history.start();
			removeSelection();
			uiWYSIWYG0_CaretNode = caretNode;
			uiWYSIWYG0.insertVariable(options);
			history.insertElement();
			history.end();
			caretNode = uiWYSIWYG0_CaretNode;
			caret.update({
				'element': caretNode
			});
			stateChanged();
			updateEmptyState();
		}

		function applyStyling(css) {
			history.start();
			history.removeElementRange(contentNode, selection.node1(), selection.node2());
			uiWYSIWYG0.applyStyling(contentNode, selection.node1(), selection.node2(), css);
			history.insertElementRange(contentNode, selection.node1(), selection.node2());
			history.end();

			uiWYSIWYG0.resetCachedPositions(contentNode);
			caret.refresh();
			copyProperties(currentCSS, css);
			stateChanged();
		}

		function setParagraphCSS(css) {
			history.start();
			if (selection.visible()) {
				history.setParagraphRangeCSS(contentNode, selection.node1(), selection.node2(), css);
				uiWYSIWYG0.setParagraphRangeCSS(contentNode, selection.node1(), selection.node2(), css);
			}
			else {
				uiWYSIWYG0_CaretNode = caretNode;
				history.setParagraphCSS(css);
				uiWYSIWYG0.setParagraphCSS(css);
			}
			history.end();
			uiWYSIWYG0.resetCachedPositions(contentNode);
			caret.refresh();
			stateChanged();
		}

		function getElementCSS(propertyName) {
			if (currentCSS.hasOwnProperty(propertyName))
				return currentCSS[propertyName];

			uiWYSIWYG0_CaretNode = caretNode;
			if (selection.visible() && nodeOrder(selection.node1(), selection.node2()) > 0)
				uiWYSIWYG0.moveCaretLeft(contentNode);
			if (uiWYSIWYG0_CaretNode.uiWYSIWYG0_IsEOLN)
				uiWYSIWYG0.moveCaretLeft(contentNode);

			return uiWYSIWYG0.getElementCSS(propertyName);
		}

		function getParagraphCSS(propertyName) {
			uiWYSIWYG0_CaretNode = caretNode;
			return uiWYSIWYG0.getParagraphCSS(propertyName);
		}

		function getElementStyles() {
			uiWYSIWYG0_CaretNode = caretNode;
			return uiWYSIWYG0.getElementStyles();
		}

		function getLink() {
			uiWYSIWYG0_CaretNode = caretNode;
			if (selection.visible() && nodeOrder(selection.node1(), selection.node2()) > 0)
				uiWYSIWYG0.moveCaretLeft(contentNode);

			return uiWYSIWYG0.getLink();
		}

		function canSetLink() {
			uiWYSIWYG0_CaretNode = caretNode;
			if (selection.visible())
				return true;

			return (getLink() != '');
		}

		function setLink(url) {
			var linkStartNode = selection.visible() ? selection.node1() : uiWYSIWYG0.linkStartNodeAt(uiWYSIWYG0_CaretNode);
			var linkEndNode = selection.visible() ? selection.node2() : uiWYSIWYG0.linkEndNodeAt(uiWYSIWYG0_CaretNode);
			if (!linkStartNode || !linkEndNode)
				return;

			history.start();
			history.removeElementRange(contentNode, linkStartNode, linkEndNode);
			uiWYSIWYG0.setLink(contentNode, linkStartNode, linkEndNode, url);
			history.insertElementRange(contentNode, linkStartNode, linkEndNode);
			history.end();

			uiWYSIWYG0.resetCachedPositions(contentNode);
			caret.refresh();
			stateChanged();
		}

		function removeLink() {
			var linkStartNode = selection.visible() ? selection.node1() : uiWYSIWYG0.linkStartNodeAt(uiWYSIWYG0_CaretNode);
			var linkEndNode = selection.visible() ? selection.node2() : uiWYSIWYG0.linkEndNodeAt(uiWYSIWYG0_CaretNode);
			if (!linkStartNode || !linkEndNode)
				return;

			history.start();
			history.removeElementRange(contentNode, linkStartNode, linkEndNode);
			uiWYSIWYG0.removeLink(contentNode, linkStartNode, linkEndNode);
			history.insertElementRange(contentNode, linkStartNode, linkEndNode);
			history.end();

			uiWYSIWYG0.resetCachedPositions(contentNode);
			caret.update({
				'node': caretNode
			});
			stateChanged();
		}

		function updateCopyBuffer() {
			if (selection.visible()) {
				var text = uiWYSIWYG0.getTextAtRange(contentNode, selection.node1(), selection.node2());
				caret.setClipboardBuffer(text);
			}
			else
				caret.setClipboardBuffer('');
		}

		function getListType() {
			uiWYSIWYG0_CaretNode = caretNode;
			return uiWYSIWYG0.getListType();
		}

		function setListType(listType) {
			uiWYSIWYG0_CaretNode = caretNode;

			history.start();
			if (selection.visible()) {
				history.setListTypeForRange(contentNode, selection.node1(), selection.node2(), listType);
				uiWYSIWYG0.setListTypeForRange(contentNode, selection.node1(), selection.node2(), listType);
			}
			else {
				history.setListType(listType);
				uiWYSIWYG0.setListType(listType);
			}
			history.end();

			uiWYSIWYG0.resetCachedPositions(contentNode);
			caret.refresh();
			stateChanged();
			updateEmptyState();
		}

		function getSelectionVisible() {
			return selection.visible();
		}

		function undo() {
			uiWYSIWYG0_CaretNode = caretNode;
			history.undo();

			caretNode = uiWYSIWYG0_CaretNode;
			caret.update({
				'element': caretNode
			});
			tryToHighlightTheLink();
			uiWYSIWYG0.resetCachedPositions(contentNode);
			stateChanged();
			updateEmptyState();
		}

		function redo() {
			uiWYSIWYG0_CaretNode = caretNode;
			history.redo();

			caretNode = uiWYSIWYG0_CaretNode;
			caret.update({
				'element': caretNode
			});
			tryToHighlightTheLink();
			uiWYSIWYG0.resetCachedPositions(contentNode);
			stateChanged();
			updateEmptyState();
		}

		function canUndo() {
			return history.canUndo();
		}

		function canRedo() {
			return history.canRedo();
		}

		function tryToHighlightTheLink() {
			if (!highlightEnteredLinks)
				return;

			uiWYSIWYG0.highlightLink(contentNode, function(event) {
				var node1 = event['node1'];
				var node2 = event['node2'];
				var url = event['url'];

				if (url)
					uiWYSIWYG0.setLink(contentNode, node1, node2, url);
				else
					uiWYSIWYG0.removeLink(contentNode, node1, node2);
			});
		}

		function updateEmptyState() {
			if (uiWYSIWYG0.isEmpty(contentNode))
				jQ.addClass('wysiwyg0-with-empty-content');
			else
				jQ.removeClass('wysiwyg0-with-empty-content');
		}

		var externalInterface = {
			'update': update,
			'html': getHTML,
			'keepFocused': keepFocused,
			'focusTarget': getFocusTarget,
			'focus': focus,
			'insertVariable': insertVariable,
			'applyStyling': applyStyling,
			'setParagraphCSS': setParagraphCSS,
			'getElementCSS': getElementCSS,
			'getParagraphCSS': getParagraphCSS,
			'getElementStyles': getElementStyles,
			'getLink': getLink,
			'canSetLink': canSetLink,
			'setLink': setLink,
			'removeLink': removeLink,
			'getListType': getListType,
			'setListType': setListType,
			'selectionVisible': getSelectionVisible,
			'undo': undo,
			'redo': redo,
			'canUndo': canUndo,
			'canRedo': canRedo
		};
		parentJQ.data('WYSIWYG0', externalInterface);
		return externalInterface;
	};

	function initializeOnce() {
		if (initializedOnce)
			return;

		var documentJQ = $(document);

		documentJQ.on('mousemove', function(event) {
			if (isObject(dragInstance))
				dragInstance.processDragging(event)
		});

		documentJQ.on('mouseup', function() {
			if (isObject(dragInstance))
				dragInstance.stopDragging();
		});

		initializedOnce = true;
	}
})();
//======================================================================================================================
//	END OF: WYSIWYG
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Context Menu
//======================================================================================================================
(function() {
	$.fn.WYSIWYG0_ContextMenu = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('WYSIWYG0_ContextMenu');
		if (isObject(prevInstance)) {
			if (isObject(options))
				prevInstance.update(options);
			return prevInstance;
		}

		var onCut = null;
		var onCopy = null;
		var onPaste = null;
		var onUndo = null;
		var onRedo = null;
		var onCanUndo = null;
		var onCanRedo = null;
		var openedMenuJQ = null;
		var focusTargetJQ = $();

		update(options);

		// Disabling system context menu
		parentElementJQ.on('contextmenu', function(event) {
			event.preventDefault();
		});

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('onCut'))
				onCut = params['onCut'];

			if (params.hasOwnProperty('onCopy'))
				onCopy = params['onCopy'];

			if (params.hasOwnProperty('onPaste'))
				onPaste = params['onPaste'];

			if (params.hasOwnProperty('onUndo'))
				onUndo = params['onUndo'];

			if (params.hasOwnProperty('onRedo'))
				onRedo = params['onRedo'];

			if (params.hasOwnProperty('onCanUndo'))
				onCanUndo = params['onCanUndo'];

			if (params.hasOwnProperty('onCanRedo'))
				onCanRedo = params['onCanRedo'];

			if (params.hasOwnProperty('focusTarget'))
				focusTargetJQ = params['focusTarget'];
		}

		function displayAt(x, y, selectionVisible) {
			runContextMenu(x, y, '.wysiwyg0-templates:eq(0) .wysiwyg0-context-menu:eq(0)', function(menuJQ) {
				openedMenuJQ = menuJQ;

				if (!selectionVisible)
					menuJQ.addClass('wysiwyg0-context-menu-without-selected-text');

				updateRedoUndoButtons();

				// Keep previous element focused
				menuJQ.on('mousedown', function(event) {
					event.stopPropagation();
					if (focusTargetJQ.length)
						uiKeepFocused(focusTargetJQ);
				});

				// Processing click on menu items
				menuJQ.on('click', 'span', function() {
					var action = $(this).attr('data-action-name');
					switch (action) {
						case 'cut':
							if (isFunction(onCut))
								onCut();
							break;
						case 'copy':
							if (isFunction(onCopy))
								onCopy();
							break;
						case 'paste':
							if (isFunction(onPaste))
								onPaste();
							break;
					}

					closeContextMenu();
				});

				// Processing click on undo button
				menuJQ.on('click', '.wysiwyg0-context-menu-undo-button', function() {
					if ($(this).hasClass('ui-disabled'))
						return;

					if (isFunction(onUndo))
						onUndo();

					updateRedoUndoButtons();
				});

				// Processing click on redo button
				menuJQ.on('click', '.wysiwyg0-context-menu-redo-button', function() {
					if ($(this).hasClass('ui-disabled'))
						return;

					if (isFunction(onRedo))
						onRedo();

					updateRedoUndoButtons();
				});
			}, function() {
				openedMenuJQ = null;
			});
		}

		function updateRedoUndoButtons() {
			if (openedMenuJQ && isFunction(onCanUndo)) {
				if (onCanUndo())
					openedMenuJQ.find('.wysiwyg0-context-menu-undo-button:eq(0)').removeClass('ui-disabled');
				else
					openedMenuJQ.find('.wysiwyg0-context-menu-undo-button:eq(0)').addClass('ui-disabled');
			}

			if (openedMenuJQ && isFunction(onCanRedo)) {
				if (onCanRedo())
					openedMenuJQ.find('.wysiwyg0-context-menu-redo-button:eq(0)').removeClass('ui-disabled');
				else
					openedMenuJQ.find('.wysiwyg0-context-menu-redo-button:eq(0)').addClass('ui-disabled');
			}
		}

		var externalInterface = {
			'update': update,
			'displayAt': displayAt
		};
		parentElementJQ.data('WYSIWYG0_ContextMenu', externalInterface);
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: WYSIWYG > Context Menu
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG > Paste Dialog
//======================================================================================================================
var WYSIWYG0_PASTE_DIALOG = {};
(function(plugin) {

	function display(options, callback) {
		var textAreaField;
		options = toObject(options);

		uiShowDialog({
			'title': 'Paste text dialog',
			'content': $('.wysiwyg0-templates:first .wysiwyg0-paste-dialog-content:first'),
			'width': 500,
			'minWidth': 300,
			'focusTarget': options['focusTarget'],
			'onLoad': function(dialogJQ) {
				textAreaField = dialogJQ.find('.wysiwyg0-paste-dialog-text-area:first').UITextArea({
					'placeholder': 'Please enter some text here',
					'autoHeight': true,
					'onChange': function() {
						uiRepositionDialog(dialogJQ);
					}
				});
				textAreaField.focus();
			},
			'buttons': [
				{
					'type': 'link',
					'title': 'Cancel',
					'handler': function(dialogJQ) {
						uiCloseDialog(dialogJQ);
					}
				},
				{
					'type': 'button',
					'title': 'OK',
					'handler': function(dialogJQ){
						var text = textAreaField.value();
						callback(text);
						uiCloseDialog(dialogJQ);
					}
				}
			]
		});
	}

	plugin.display = display;
})(WYSIWYG0_PASTE_DIALOG);
//======================================================================================================================
//	END OF: WYSIWYG > Paste Dialog
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG0 > History Tape Recorder
//======================================================================================================================
var WYSIWYG0_HistoryTape = function(contentNode) {
	var tape = [];

	function start() {
		tape = [];
	}

	function end() {
		return tape;
	}

	function insertElement() {
		var item = uiWYSIWYG0.encode(uiWYSIWYG0_CaretNode.previousSibling);
		if (item) {
			tape.push({
				'cmd': 'insertItem',
				'index': uiWYSIWYG0.getCaretIndex(contentNode) - 1,
				'item': item
			});
		}
	}

	function insertElementRange(contentNode, node1, node2) {
		var series = uiWYSIWYG0.encodeRange(contentNode, node1, node2);
		if (series) {
			tape.push({
				'cmd': 'insertSeries',
				'index1': uiWYSIWYG0.getElementIndex(contentNode, node1),
				'index2': uiWYSIWYG0.getElementIndex(contentNode, node2),
				'series': series
			});
		}
	}

	function insertLineBreak() {
		tape.push({
			'cmd': 'insertLineBreak',
			'index': uiWYSIWYG0.getCaretIndex(contentNode)
		});
	}

	function removeElement() {
		var item = uiWYSIWYG0.encode(uiWYSIWYG0_CaretNode);
		if (item) {
			tape.push({
				'cmd': 'removeItem',
				'index': uiWYSIWYG0.getCaretIndex(contentNode),
				'item': item
			});
		}
	}

	function removeElementRange(contentNode, node1, node2) {
		var series = uiWYSIWYG0.encodeRange(contentNode, node1, node2);
		if (series) {
			tape.push({
				'cmd': 'removeSeries',
				'index1': uiWYSIWYG0.getElementIndex(contentNode, node1),
				'index2': uiWYSIWYG0.getElementIndex(contentNode, node2),
				'series': series
			});
		}
	}

	function removeLineBreak() {
		tape.push({
			'cmd': 'removeLineBreak',
			'index': uiWYSIWYG0.getCaretIndex(contentNode)
		});
	}

	function setParagraphCSS(css) {
		tape.push({
			'cmd': 'setParagraphCSS',
			'index': uiWYSIWYG0.getCaretIndex(contentNode),
			'newCSS': css,
			'oldStyles': uiWYSIWYG0_CaretNode.parentNode.getAttribute('style')
		});
	}

	function setParagraphRangeCSS(contentNode, node1, node2, css) {
		if (nodeOrder(node1, node2) < 0) {
			var t = node1;
			node1 = node2;
			node2 = t;
		}

		var oldStyles = [];

		var node = node1.parentNode;
		while (node) {
			if (node == node2)
				break;

			if (node.uiWYSIWYG0_IsParagraph)
				oldStyles.push(node.getAttribute('style'));

			node = domTraverseNext(contentNode, node);
		}

		tape.push({
			'cmd': 'setParagraphRangeCSS',
			'index1': uiWYSIWYG0.getElementIndex(contentNode, node1),
			'index2': uiWYSIWYG0.getElementIndex(contentNode, node2),
			'newCSS': css,
			'oldStyles': oldStyles
		});
	}

	function setListType(listType) {
		var oldListType = uiWYSIWYG0.getListType();
		if (listType == oldListType)
			return;

		tape.push({
			'cmd': 'setListType',
			'index': uiWYSIWYG0.getCaretIndex(contentNode),
			'newListType': listType,
			'oldListType': oldListType
		});
	}

	function setListTypeForRange(contentNode, node1, node2, listType) {
		if (nodeOrder(node1, node2) < 0) {
			var t = node1;
			node1 = node2;
			node2 = t;
		}

		var oldListTypes = [];

		var node = node1.parentNode;
		while (node) {
			if (node == node2)
				break;

			if (node.uiWYSIWYG0_IsParagraph) {
				var list = $(contentNode).data('WYSIWYG0_List');
				if (isObject(list))
					oldListTypes.push(list.type());
				else
					oldListTypes.push('');
			}

			node = domTraverseNext(contentNode, node);
		}

		tape.push({
			'cmd': 'setListTypeForRange',
			'index1': uiWYSIWYG0.getElementIndex(contentNode, node1),
			'index2': uiWYSIWYG0.getElementIndex(contentNode, node2),
			'newListType': listType,
			'oldListTypes': oldListTypes
		});
	}

	return {
		'start': start,
		'end': end,
		'insertElement': insertElement,
		'insertElementRange': insertElementRange,
		'insertLineBreak': insertLineBreak,
		'removeElement': removeElement,
		'removeElementRange': removeElementRange,
		'removeLineBreak': removeLineBreak,
		'setParagraphCSS': setParagraphCSS,
		'setParagraphRangeCSS': setParagraphRangeCSS,
		'setListType': setListType,
		'setListTypeForRange': setListTypeForRange
	};
};
//======================================================================================================================
//	END OF: WYSIWYG0 > History Tape Recorder
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG0 > History Tape Payer
//======================================================================================================================
(function(plugin) {
	function playTapeBackward(contentNode, tape) {
		for (var i = tape.length - 1; i >= 0; i--) {
			var action = tape[i];
			switch (action['cmd']) {
				case 'insertItem':
					removeItem(contentNode, action);
					break;
				case 'insertSeries':
					removeSeries(contentNode, action);
					break;
				case 'insertLineBreak':
					removeLineBreak(contentNode, action);
					break;
				case 'removeItem':
					insertItem(contentNode, action);
					break;
				case 'removeSeries':
					insertSeries(contentNode, action);
					break;
				case 'removeLineBreak':
					insertLineBreak(contentNode, action);
					break;
				case 'setParagraphCSS':
					unsetParagraphCSS(contentNode, action);
					break;
				case 'setParagraphRangeCSS':
					unsetParagraphRangeCSS(contentNode, action);
					break;
				case 'setListType':
					unsetListType(contentNode, action);
					break;
				case 'setListTypeForRange':
					unsetListTypeForRange(contentNode, action);
					break;
			}
		}
	}

	function playTapeForward(contentNode, tape) {
		for (var i = tape.length - 1; i >= 0; i--) {
			var action = tape[i];
			switch (action['cmd']) {
				case 'insertItem':
					insertItem(contentNode, action);
					break;
				case 'insertSeries':
					insertSeries(contentNode, action);
					break;
				case 'insertLineBreak':
					insertLineBreak(contentNode, action);
					break;
				case 'removeItem':
					removeItem(contentNode, action);
					break;
				case 'removeSeries':
					removeSeries(contentNode, action);
					break;
				case 'removeLineBreak':
					removeLineBreak(contentNode, action);
					break;
				case 'setParagraphCSS':
					setParagraphCSS(contentNode, action);
					break;
				case 'setParagraphRangeCSS':
					setParagraphRangeCSS(contentNode, action);
					break;
				case 'setListType':
					setListType(contentNode, action);
					break;
				case 'setListTypeForRange':
					setListTypeForRange(contentNode, action);
					break;
			}
		}
	}

	function insertItem(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index']);
		uiWYSIWYG0.decode(action['item']);
	}

	function removeItem(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index']);
		uiWYSIWYG0.removeElement(contentNode);
	}

	function insertSeries(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index1']);
		uiWYSIWYG0.decode(action['series']);
	}

	function removeSeries(contentNode, action) {
		var node1 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index1']);
		var node2 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index2']);
		uiWYSIWYG0.removeElementRange(contentNode, node1, node2);
		uiWYSIWYG0_CaretNode = node2;
	}

	function insertLineBreak(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index']);
		uiWYSIWYG0.insertLineBreak();
	}

	function removeLineBreak(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index']);
		uiWYSIWYG0.removeElement(contentNode);
	}

	function setParagraphCSS(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index']);
		uiWYSIWYG0_CaretNode.parentNode.setAttribute(uiWYSIWYG0_MakeStyleAttribute(action['newCSS']));
	}

	function unsetParagraphCSS(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index']);
		uiWYSIWYG0_CaretNode.parentNode.setAttribute('style', action['oldStyles']);
	}

	function setParagraphRangeCSS(contentNode, action) {
		var node1 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index1']);
		var node2 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index2']);
		var node = node1.parentNode;
		while (node) {
			if (node == node2)
				break;

			if (node.uiWYSIWYG0_IsParagraph)
				node.setAttribute('style', uiWYSIWYG0_MakeStyleAttribute(action['newCSS']));

			node = domTraverseNext(contentNode, node);
		}
		uiWYSIWYG0_CaretNode = node2;
	}

	function unsetParagraphRangeCSS(contentNode, action) {
		var node1 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index1']);
		var node2 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index2']);
		var node = node1.parentNode;
		var index = 0;
		while (node) {
			if (node == node2)
				break;

			if (node.uiWYSIWYG0_IsParagraph) {
				node.setAttribute('style', uiWYSIWYG0_MakeStyleAttribute(action['oldStyles'][index]));
				index++;
			}

			node = domTraverseNext(contentNode, node);
		}
		uiWYSIWYG0_CaretNode = node2;
	}

	function setListType(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index']);
		uiWYSIWYG0.setListType(action['newListType'])
	}

	function unsetListType(contentNode, action) {
		uiWYSIWYG0.setCaretIndex(contentNode, action['index']);
		uiWYSIWYG0.setListType(action['oldListType'])
	}

	function setListTypeForRange(contentNode, action) {
		var node1 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index1']);
		var node2 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index2']);
		uiWYSIWYG0.setListTypeForRange(contentNode, node1, node2, action['newListType']);
		uiWYSIWYG0_CaretNode = node2;
	}

	function unsetListTypeForRange(contentNode, action) {
		var node1 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index1']);
		var node2 = uiWYSIWYG0.getElementAtIndex(contentNode, action['index2']);
		var node = node1.parentNode;
		var index = 0;
		while (node) {
			if (node == node2)
				break;

			if (node.uiWYSIWYG0_IsParagraph) {
				uiWYSIWYG0_CaretNode = node.firstChild;
				uiWYSIWYG0.setListType(action['oldListTypes'][index]);
				index++;
			}

			node = domTraverseNext(contentNode, node);
		}
		uiWYSIWYG0_CaretNode = node2;
	}

	plugin.playTapeBackward = playTapeBackward;
	plugin.playTapeForward = playTapeForward;
})(uiWYSIWYG0);
//======================================================================================================================
//	END OF: WYSIWYG0 > History Tape Payer
//======================================================================================================================

//======================================================================================================================
//	WYSIWYG0 > History
//======================================================================================================================
var WYSIWYG0_History = function(contentNode) {
	var undoList = [];
	var redoList = [];
	var tape = new WYSIWYG0_HistoryTape(contentNode);

	function start() {
		tape.start();
	}

	function end() {
		add(tape.end());
	}

	function insertElement() {
		tape.insertElement();
	}

	function insertElementRange(contentNode, node1, node2) {
		tape.insertElementRange(contentNode, node1, node2);
	}

	function insertLineBreak() {
		tape.insertLineBreak();
	}

	function removeElement() {
		tape.removeElement();
	}

	function removeElementRange(contentNode, node1, node2) {
		tape.removeElementRange(contentNode, node1, node2);
	}

	function removeLineBreak() {
		tape.removeLineBreak();
	}

	function setParagraphCSS(css) {
		tape.setParagraphCSS(css);
	}

	function setParagraphRangeCSS(contentNode, node1, node2, css) {
		tape.setParagraphRangeCSS(contentNode, node1, node2, css);
	}

	function setListType(listType) {
		tape.setListType(listType);
	}

	function setListTypeForRange(contentNode, node1, node2, listType) {
		tape.setListTypeForRange(contentNode, node1, node2, listType);
	}

	function add(event) {
		undoList.push(event);
		//console.log('step:', event);
		redoList = [];
	}

	function undo() {
		if (!canUndo())
			return null;

		var event = undoList.pop();
		redoList.push(event);
		uiWYSIWYG0.playTapeBackward(contentNode, event);
		return event;
	}

	function redo() {
		if (!canRedo())
			return null;

		var event = redoList.pop();
		undoList.push(event);
		uiWYSIWYG0.playTapeForward(contentNode, event);
		return event;
	}

	function canUndo() {
		return (undoList.length > 0);
	}

	function canRedo() {
		return (redoList.length > 0);
	}

	return {
		'start': start,
		'end': end,
		'insertElement': insertElement,
		'insertElementRange': insertElementRange,
		'insertLineBreak': insertLineBreak,
		'removeElement': removeElement,
		'removeElementRange': removeElementRange,
		'removeLineBreak': removeLineBreak,
		'setParagraphCSS': setParagraphCSS,
		'setParagraphRangeCSS': setParagraphRangeCSS,
		'setListType': setListType,
		'setListTypeForRange': setListTypeForRange,
		'undo': undo,
		'redo': redo,
		'canUndo': canUndo,
		'canRedo': canRedo
	};
};
//======================================================================================================================
//	END OF: WYSIWYG0 > History
//======================================================================================================================

//======================================================================================================================
//	UIWhiteWYSIWYG
//======================================================================================================================
(function() {
	$.fn.UIWhiteWYSIWYG = function(options) {
		var parentJQ = $(this);
		var prevInstance = parentJQ.data('UIWhiteWYSIWYG');
		if (isObject(prevInstance)) {
			if (isObject(options))
				prevInstance.update(options);
			return prevInstance;
		}

		var jQ = uiWYSIWYG0_GetJQ('ui-white-wysiwyg');
		parentJQ.append(jQ);

		var toolbarJQ = jQ.find('.ui-white-wysiwyg-toolbar:first');
		var contentJQ = jQ.find('.ui-white-wysiwyg-content:first');

		var wysiwyg = contentJQ.WYSIWYG0({
			'padding': 24,
			'onStateChange': stateChanged
		});

		jQ.find('.ui-white-wysiwyg-predefined-styles-select-box:first').UIWhiteWYSIWYG_SelectBox({
			'fixedTitle': 'Styles',
			'list': [
				{
					'value': 'normal',
					'title': 'Normal',
					'css': {
						'font': '',
						'color': '',
						'line-height': '',
						'text-decoration': '',
						'font-style': ''
					}
				},
				{
					'value': 'h1',
					'title': 'Heading 1',
					'css': WYSIWYG0_DEFAULT_STYLES['h1']
				},
				{
					'value': 'h2',
					'title': 'Heading 2',
					'css': WYSIWYG0_DEFAULT_STYLES['h2']
				},
				{
					'value': 'h3',
					'title': 'Heading 3',
					'css': WYSIWYG0_DEFAULT_STYLES['h3']
				},
				{
					'value': 'h4',
					'title': 'Heading 4',
					'css': WYSIWYG0_DEFAULT_STYLES['h4']
				},
				{
					'value': 'h5',
					'title': 'Heading 5',
					'css': WYSIWYG0_DEFAULT_STYLES['h5']
				},
				{
					'value': 'h6',
					'title': 'Heading 6',
					'css': WYSIWYG0_DEFAULT_STYLES['h6']
				}
			],
			'focusTarget': wysiwyg.focusTarget(),
			'onSelect': function(event) {
				wysiwyg.applyStyling(event['css']);
			}
		});

		var fontNameField = jQ.find('.ui-white-wysiwyg-font-name-select-box:first').UIWhiteWYSIWYG_SelectBox({
			'title': 'Font',
			'list': [
				{
					'value': 'arial',
					'title': 'Arial',
					'css': {
						'font-family': 'Arial'
					}
				},
				{
					'value': 'comic-sans-ms',
					'title': 'Comic Sans MS',
					'css': {
						'font-family': '\"Comic Sans MS\"'
					}
				},
				{
					'value': 'courier-new',
					'title': 'Courier New',
					'css': {
						'font-family': '\"Courier New\"'
					}
				},
				{
					'value': 'georgia',
					'title': 'Georgia',
					'css': {
						'font-family': 'Georgia'
					}
				},
				{
					'value': 'helvetica',
					'title': 'Helvetica',
					'css': {
						'font-family': 'Helvetica'
					}
				},
				{
					'value': 'lucida',
					'title': 'Lucida',
					'css': {
						'font-family': '\"Lucida Sans Unicode\", \"Lucida Grande\"'
					}
				},
				{
					'value': 'tahoma',
					'title': 'Tahoma',
					'css': {
						'font-family': 'Tahoma'
					}
				},
				{
					'value': 'times-new-roman',
					'title': 'Times New Roman',
					'css': {
						'font-family': 'Times, \"Times New Roman\"'
					}
				},
				{
					'value': 'trebuchet-ms',
					'title': 'Trebuchet MS',
					'css': {
						'font-family': '\"Trebuchet MS\"'
					}
				},
				{
					'value': 'verdana',
					'title': 'Verdana',
					'css': {
						'font-family': 'Verdana'
					}
				}
			],
			'focusTarget': wysiwyg.focusTarget(),
			'onSelect': function(event) {
				wysiwyg.applyStyling(event['css']);
			}
		});

		var fontSizeField = toolbarJQ.find('.ui-white-wysiwyg-font-size-select-box:first').UIWhiteWYSIWYG_SelectBox({
			'title': 'Size',
			'list': function() {
				var result = [];
				for (var i = 10; i <= 64; i++) {
					result.push({
						'value': i,
						'title': i,
						'css': {
							'font-size': i + 'px'
						}
					});
				}
				return result;
			}(),
			'focusTarget': wysiwyg.focusTarget(),
			'onSelect': function(event) {
				wysiwyg.applyStyling(event['css']);
			}
		});

		toolbarJQ.find('.ui-white-wysiwyg-variables-select-box:first').UIWhiteWYSIWYG_SelectBox({
			'fixedTitle': 'Variables',
			'list': [
				{'value': 'FIRST_NAME', 'title': 'First name'},
				{'value': 'LAST_NAME', 'title': 'Last name'},
				{'value': 'FULL_NAME', 'title': 'Full name'},
				{'value': 'COMPANY_NAME', 'title': 'Company name'}
			],
			'focusTarget': wysiwyg.focusTarget(),
			'onSelect': function(event) {
				var css = wysiwyg.getElementStyles();
				wysiwyg.insertVariable({
					'value': event['value'],
					'title': event['title'],
					'css': css
				});
			}
		});

		// Keeping WYSIWYG focused
		toolbarJQ.on('mousedown', function() {
			wysiwyg.keepFocused();
		});

		// Processing click on bold button
		toolbarJQ.on('click', '.ui-white-wysiwyg-bold-button', function() {
			var buttonJQ = $(this);
			if (buttonJQ.hasClass('ui-disabled'))
				return;

			if (!buttonJQ.hasClass('selected')) {
				wysiwyg.applyStyling({
					'font-weight': 700
				});
			}
			else {
				wysiwyg.applyStyling({
					'font-weight': ''
				});
			}
		});

		// Processing click on italic button
		toolbarJQ.on('click', '.ui-white-wysiwyg-italic-button', function() {
			var buttonJQ = $(this);
			if (buttonJQ.hasClass('ui-disabled'))
				return;

			if (!buttonJQ.hasClass('selected')) {
				wysiwyg.applyStyling({
					'font-style': 'italic'
				});
			}
			else {
				wysiwyg.applyStyling({
					'font-style': ''
				});
			}
		});

		// Processing click on underline button
		toolbarJQ.on('click', '.ui-white-wysiwyg-underline-button', function() {
			var buttonJQ = $(this);
			if (buttonJQ.hasClass('ui-disabled'))
				return;

			if (!buttonJQ.hasClass('selected')) {
				wysiwyg.applyStyling({
					'text-decoration': 'underline'
				});
			}
			else {
				wysiwyg.applyStyling({
					'text-decoration': ''
				});
			}
		});

		// Processing click on set link button
		toolbarJQ.on('click', '.ui-white-wysiwyg-set-link-button', function() {
			if ($(this).hasClass('ui-disabled'))
				return;

			var url = wysiwyg.getLink();
			UI_WHITE_WYSIWYG_EDIT_LINK_DIALOG.display(url, {
				'focusTarget': wysiwyg.focusTarget()
			}, function(newURL) {
				wysiwyg.focus();
				if (newURL != '')
					wysiwyg.setLink(newURL);
			});
		});

		// Processing click on remove link button
		toolbarJQ.on('click', '.ui-white-wysiwyg-remove-link-button', function() {
			if ($(this).hasClass('ui-disabled'))
				return;

			wysiwyg.removeLink();
		});

		// Processing click on text align button
		toolbarJQ.on('click', '.ui-white-wysiwyg-align-button', function() {
			var buttonJQ = $(this);
			if (buttonJQ.hasClass('ui-disabled'))
				return;

			var textAlign = buttonJQ.attr('data-tag');
			wysiwyg.setParagraphCSS({
				'text-align': textAlign
			});
		});

		// Processing click ordered list button
		toolbarJQ.on('click', '.ui-white-wysiwyg-ordered-list-button', function() {
			var buttonJQ = $(this);
			if (buttonJQ.hasClass('ui-disabled'))
				return;

			if (!buttonJQ.hasClass('selected'))
				wysiwyg.setListType('ordered');
			else
				wysiwyg.setListType('');
		});

		// Processing click unordered list button
		toolbarJQ.on('click', '.ui-white-wysiwyg-unordered-list-button', function() {
			var buttonJQ = $(this);
			if (buttonJQ.hasClass('ui-disabled'))
				return;

			if (!buttonJQ.hasClass('selected'))
				wysiwyg.setListType('unordered');
			else
				wysiwyg.setListType('');
		});

		// Processing click clear formatting button
		toolbarJQ.on('click', '.ui-white-wysiwyg-clear-formatting-button', function() {
			if ($(this).hasClass('ui-disabled'))
				return;

			wysiwyg.applyStyling({
				'font': '',
				'color': '',
				'line-height': '',
				'text-decoration': ''
			});
		});

		// Processing click on text color button
		toolbarJQ.on('click', '.ui-white-wysiwyg-text-color-button', function() {
			var colorBarJQ = jQ.find('.ui-white-wysiwyg-text-color-button-color-bar:first');
			runColorDialog({
				'owner': this,
				'color': colorBarJQ.css('background-color'),
				//'allowOpacity': true,
				'focusTarget': wysiwyg.focusTarget(),
				'onChanging': function(color) {
					colorBarJQ.css('background-color', color);
				},
				'onChange': function(color) {
					wysiwyg.applyStyling({
						'color': color
					});
				}
			});
		});

		// Processing click on undo button
		toolbarJQ.on('click', '.ui-white-wysiwyg-undo-button', function() {
			if ($(this).hasClass('ui-disabled'))
				return;

			wysiwyg.undo();
		});

		// Processing click on redo button
		toolbarJQ.on('click', '.ui-white-wysiwyg-redo-button', function() {
			if ($(this).hasClass('ui-disabled'))
				return;

			wysiwyg.redo();
		});

		update(options);
		stateChanged();

		function update(params) {
			params = toObject(params);
			var wysiwygParams = {};

			if (params.hasOwnProperty('html'))
				wysiwygParams['html'] = params['html'];

			if (params.hasOwnProperty('highlightInitialLinks'))
				wysiwygParams['highlightInitialLinks'] = params['highlightInitialLinks'];

			if (params.hasOwnProperty('highlightEnteredLinks'))
				wysiwygParams['highlightEnteredLinks'] = params['highlightEnteredLinks'];

			if (!isEmpty(wysiwygParams))
				wysiwyg.update(wysiwygParams);
		}

		function getHTML() {
			return wysiwyg.html();
		}

		function stateChanged() {
			// Updating 'Bold' button state
			var fontWeight = wysiwyg.getElementCSS('font-weight');
			toolbarJQ.find('.ui-white-wysiwyg-bold-button:first').toggleClass('selected', fontWeight == 700 || fontWeight == 'bold');

			// Updating 'Italic' button state
			var fontStyle = wysiwyg.getElementCSS('font-style');
			toolbarJQ.find('.ui-white-wysiwyg-italic-button:first').toggleClass('selected', fontStyle == 'italic');

			// Updating 'Underlined' button state
			var textDecoration = wysiwyg.getElementCSS('text-decoration');
			toolbarJQ.find('.ui-white-wysiwyg-underline-button:first').toggleClass('selected', textDecoration == 'underline');

			// Updating align buttons state
			var textAlign = wysiwyg.getParagraphCSS('text-align');
			toolbarJQ.find('.ui-white-wysiwyg-align-button').removeClass('selected');
			toolbarJQ.find('.ui-white-wysiwyg-align-button[data-tag=\"' + escapeJQuerySelectorElement(textAlign) + '\"]').addClass('selected');

			// Updating color button
			var color = wysiwyg.getElementCSS('color');
			toolbarJQ.find('.ui-white-wysiwyg-text-color-button-color-bar:first').css('background-color', color);

			// Updating font field
			var fontNameStr = wysiwyg.getElementCSS('font-family');
			fontNameField.update({
				'value': detectFontName(fontNameStr)
			});

			// Updating size field
			var fontSize = toInt(wysiwyg.getElementCSS('font-size'));
			fontSize = ensureRange(fontSize, 10, 64);
			fontSizeField.update({
				'value': fontSize
			});

			// Updating remove link button
			var linkURL = wysiwyg.getLink();
			toolbarJQ.find('.ui-white-wysiwyg-remove-link-button:first').toggleClass('ui-disabled', linkURL == '');

			// Updating set link button
			var canSetLink = wysiwyg.canSetLink();
			toolbarJQ.find('.ui-white-wysiwyg-set-link-button:first').toggleClass('ui-disabled', !canSetLink);

			// Updating list buttons
			var listType = wysiwyg.getListType();
			toolbarJQ.find('.ui-white-wysiwyg-ordered-list-button:first').toggleClass('selected', listType == 'ordered');
			toolbarJQ.find('.ui-white-wysiwyg-unordered-list-button:first').toggleClass('selected', listType == 'unordered');

			// Updating clear formatting button
			toolbarJQ.find('.ui-white-wysiwyg-clear-formatting-button:first').toggleClass('ui-disabled', !wysiwyg.selectionVisible());

			// Updating undo & redo buttons
			toolbarJQ.find('.ui-white-wysiwyg-undo-button:first').toggleClass('ui-disabled', !wysiwyg.canUndo());
			toolbarJQ.find('.ui-white-wysiwyg-redo-button:first').toggleClass('ui-disabled', !wysiwyg.canRedo());
		}

		function detectFontName(str) {
			var list = toString(str).toLowerCase().split(',');
			for (var i = 0; i < list.length; i++) {
				var item = list[i];

				if (item.indexOf('arial') != -1)
					return 'arial';

				if (item.indexOf('comic sans ms') != -1)
					return 'comic-sans-ms';

				if (item.indexOf('courier new') != -1)
					return 'courier-new';

				if (item.indexOf('georgia') != -1)
					return 'georgia';

				if (item.indexOf('helvetica') != -1)
					return 'helvetica';

				if (item.indexOf('lucida') != -1)
					return 'lucida';

				if (item.indexOf('tahoma') != -1)
					return 'tahoma';

				if (item.indexOf('times') != -1)
					return 'times-new-roman';

				if (item.indexOf('trebuchet') != -1)
					return 'trebuchet-ms';

				if (item.indexOf('verdana') != -1)
					return 'verdana';
			}

			return 'arial';
		}

		var externalInterface = {
			'update': update,
			'html': getHTML
		};
		parentJQ.data('UIWhiteWYSIWYG', externalInterface);
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: UIWhiteWYSIWYG
//======================================================================================================================

//======================================================================================================================
//	UIWhiteWYSIWYG > Select Box
//======================================================================================================================
(function() {
	$.fn.UIWhiteWYSIWYG_SelectBox = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('UIWhiteWYSIWYG_SelectBox');
		if (isObject(prevInstance)) {
			if (isObject(options))
				prevInstance.update(options);
			return prevInstance;
		}

		var jQ = uiWYSIWYG0_GetJQ('ui-white-wysiwyg-select-box');
		parentElementJQ.append(jQ);

		var title = '';
		var fixedTitle = '';
		var list = [];
		var value = null;
		var onSelect = null;
		var focusTargetJQ = null;

		update(options);

		// Processing click on select box element
		jQ.on('click', function() {
			uiRunPopup(this, '.wysiwyg0-templates:first .ui-white-wysiwyg-select-box-popup:first', {'fullWidth': true}, function(popupJQ) {
				var listJQ = popupJQ.find('.ui-white-wysiwyg-select-box-popup-list:first');
				for (var i = 0; i < list.length; i++) {
					var item = list[i];
					var itemJQ = $('<span>');
					itemJQ.data('itemData', item);
					itemJQ.text(item['title']);
					if (item.hasOwnProperty('css'))
						itemJQ.css(item['css']);
					listJQ.append(itemJQ);
				}

				// Keeping input box focused
				popupJQ.on('mousedown', function() {
					if (isJQueryObject(focusTargetJQ))
						uiKeepFocused(focusTargetJQ);
				});

				// Processing click on popup list item
				popupJQ.on('click', '.ui-white-wysiwyg-select-box-popup-list > span', function() {
					var itemData = toObject($(this).data('itemData'));
					value = itemData['value'];
					refresh();
					if (isFunction(onSelect))
						onSelect(itemData);
					uiClosePopup(popupJQ);
					$(window).resize();
				});
			});
		});

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('title'))
				title = toString(params['title']);

			if (params.hasOwnProperty('fixedTitle'))
				fixedTitle = toString(params['fixedTitle']);

			if (params.hasOwnProperty('list'))
				list = toArray(params['list']);

			if (params.hasOwnProperty('value'))
				value = params['value'];

			if (params.hasOwnProperty('onSelect'))
				onSelect = params['onSelect'];

			if (params.hasOwnProperty('focusTarget'))
				focusTargetJQ = toJQueryObject(params['focusTarget']);

			refresh();
		}

		function refresh() {
			if (fixedTitle != '')
				jQ.text(fixedTitle);
			else if (toString(value) != '')
				jQ.text(getValueTitle(value));
			else
				jQ.text(title);
		}

		function getValueTitle(value) {
			for (var i = 0; i < list.length; i++) {
				var item = list[i];
				if (item['value'] == value)
					return item['title'];
			}
			return '';
		}

		var externalInterface = {
			'update': update
		};
		parentElementJQ.data('UIWhiteWYSIWYG_SelectBox', externalInterface);
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: UIWhiteWYSIWYG > Select Box
//======================================================================================================================

//======================================================================================================================
//	UIWhiteWYSIWYG > Edit Link Dialog
//======================================================================================================================
var UI_WHITE_WYSIWYG_EDIT_LINK_DIALOG = {};
(function(plugin) {

	function display(oldURL, options, callback) {
		options = toObject(options);
		var inputField;

		uiShowDialog({
			'title': 'Please enter link url',
			'content':  $('.ui-white-wysiwyg-edit-link-dialog:first'),
			'width': 500,
			'minWidth': 300,
			'focusTarget': options['focusTarget'],
			'onLoad': function(dialogJQ) {
				inputField = dialogJQ.find('.ui-white-wysiwyg-edit-link-dialog-input-box:first').UIInputBox({
					'placeholder': 'URL',
					'value': toString(oldURL)
				});
				inputField.focus();
			},
			'buttons': [
				{
					'type': 'link',
					'title': 'Cancel',
					'handler': function(dialogJQ) {
						if (isFunction(callback))
							callback('');

						uiCloseDialog(dialogJQ);
					}
				},
				{
					'type': 'button',
					'title': 'Save',
					'handler': function(dialogJQ) {
						var newURL = trim(inputField.value());

						if (newURL == '') {
							uiSetError(inputField, 'Please enter some user');
							return;
						}

						if (isFunction(callback))
							callback(newURL);

						uiCloseDialog(dialogJQ);
					}
				}
			],
			'onClose': function() {
				uiClearError(inputField);
			},
			'noPadding': false
		});
	}

	plugin.display = display;
})(UI_WHITE_WYSIWYG_EDIT_LINK_DIALOG);
//======================================================================================================================
//	END OF: UIWhiteWYSIWYG > Edit Link Dialog
//======================================================================================================================
