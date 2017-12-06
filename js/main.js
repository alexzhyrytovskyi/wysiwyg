//======================================================================================================================
//  UIResizeManager
//======================================================================================================================
function uiAddResizeHandler(elementSelector, handler) {
	$(window).resize(handler);
}
function uiAddScrollHandler(elementSelector, handler) {
	$(window).scroll(handler);
}
//======================================================================================================================
//  END OF: UIResizeManager
//======================================================================================================================

//======================================================================================================================
//  UIScrollBox
//======================================================================================================================
(function() {
	var initialized = false;
	var dragObject = null;

	$.fn.UIScrollBox = function(options) {
		var jQ = $(this);
		var prevInstance = jQ.data('UIScrollBox');
		if (isObject(prevInstance)) {
			if (isObject(options))
				prevInstance.update(options);
			return prevInstance;
		}

		// Initializing global event handlers
		initializeOnce();

		// Moving all content to new content node
		var contentNodeList = getNodeListFrom(jQ[0]);
		var contentJQ = uiGetJQ('ui-scroll-box-content');
		jQ.append(contentJQ);
		moveNodeListTo(contentNodeList, contentJQ[0]);

		// Adding scroll bars
		jQ.addClass('ui-scroll-box');
		jQ.addClass('ui-scroll-box-skin-default');
		jQ.append(uiGetJQ('ui-scroll-box-horizontal-scroll-rail'));
		jQ.append(uiGetJQ('ui-scroll-box-vertical-scroll-rail'));

		// Finding base elements of the scroll box
		var hRailJQ = jQ.find('.ui-scroll-box-horizontal-scroll-rail:first');
		var vRailJQ = jQ.find('.ui-scroll-box-vertical-scroll-rail:first');
		var hBarJQ = jQ.find('.ui-scroll-box-horizontal-scroll-bar:first');
		var vBarJQ = jQ.find('.ui-scroll-box-vertical-scroll-bar:first');

		// Declaring skin variables
		var width;
		var height;
		var maxHeight;
		var vOffsX;
		var vOffsY;
		var hOffsX;
		var hOffsY;
		var minScrollBarSize;
		var scrollBarSize;

		// Declaring internal variables
		var scrollLeft;
		var scrollTop;
		var scrollWidth;
		var scrollHeight;
		var clientWidth;
		var clientHeight;
		var vBarVisible;
		var hBarVisible;
		var vRailSize;
		var hRailSize;
		var vBarSize;
		var hBarSize;
		var vBarOffs;
		var hBarOffs;

		// Scrolling to the top left corner
		contentJQ.scrollLeft(0);
		contentJQ.scrollTop(0);

		// Make sure that scroll box 'relative' or 'absolute' position
		var cssPosition = jQ.css('position');
		if (cssPosition != 'absolute' && cssPosition != 'relative' && cssPosition != 'fixed')
			jQ.css('position', 'relative');

		// Moving paddings inside the scroll box
		contentJQ.css({
			'padding-left': jQ.css('padding-left'),
			'padding-top': jQ.css('padding-top'),
			'padding-right': jQ.css('padding-right'),
			'padding-bottom': jQ.css('padding-bottom')
		});
		jQ.css('padding', '0');

		// Initializing scroll box with default options
		options = toObject(cloneVariable(options));
		if (!options.hasOwnProperty('skin'))
			options['skin'] = 'default';

		width = jQ.innerWidth();
		var cssMaxHeight = jQ.css('max-height');
		if (toInt(cssMaxHeight)) {
			maxHeight = toInt(jQ.css('max-height'));
			height = 0;
		}
		else {
			height = jQ.innerHeight();
			maxHeight = 0;
		}

		// Removing initialization styles
		jQ.css('max-height', 'none');
		jQ.css('height', 'auto');

		update(options);

		uiAddResizeHandler(jQ, refresh);

		// Processing scroll event
		contentJQ.on('scroll', function() {
			refresh();
			$(window).trigger('scroll');
		});

		// Processing mouse wheel event
		contentJQ.on('wheel mousewheel', function(event) {
			event.preventDefault();
			event.stopPropagation();

			// Calculating new scroll position
			var delta = getDeltaFromScrollEvent(event.originalEvent);
			var newScrollLeft = ensureRange(scrollLeft + delta.x, 0,  scrollWidth - clientWidth);
			var newScrollTop = ensureRange(scrollTop - delta.y, 0, scrollHeight - clientHeight);

			// If position was changed then we scroll to this position
			if (newScrollLeft != scrollLeft || newScrollTop != scrollTop) {
				contentJQ.scrollLeft(newScrollLeft);
				contentJQ.scrollTop(newScrollTop);
			}
		});

		// Processing mouse down event on vertical scroll bar
		jQ.on('mousedown','.ui-scroll-box-vertical-scroll-bar',function(event) {
			event.preventDefault();
			startVerticalDragging(event.pageY);
		});

		// Processing mouse down event on horizontal scroll bar
		jQ.on('mousedown','.ui-scroll-box-horizontal-scroll-bar',function(event) {
			event.preventDefault();
			startHorizontalDragging(event.pageX);
		});

		// Processing mouse down event on vertical scroll rail
		jQ.on('mousedown','.ui-scroll-box-vertical-scroll-rail',function(event) {
			if (event.target != this)
				return;

			event.preventDefault();
			contentJQ.scrollTop((event.pageY - vBarJQ.outerHeight() / 2 - vRailJQ.offset().top) / (vRailJQ.height()-vBarJQ.height()) * (scrollHeight - clientHeight));
			refresh();
			startVerticalDragging(event.pageY);
		});

		// Processing mouse down event on horizontal scroll rail
		jQ.on('mousedown','.ui-scroll-box-horizontal-scroll-rail',function(event) {
			if (event.target!=this)
				return;

			event.preventDefault();
			contentJQ.scrollLeft((event.pageX - hBarJQ.width() / 2 - hRailJQ.offset().left) / (hRailJQ.width() - hBarJQ.width()) * (scrollWidth - clientWidth));
			refresh();
			startHorizontalDragging(event.pageX);
		});

		// Scrolling content on touch screens
		jQ.on('touchmove',function(event) {
			event.preventDefault();
			contentJQ.scrollTop((event.originalEvent['touches'][0].pageY - vBarJQ.height() / 2 - vRailJQ.offset().top) / (vRailJQ.height() - vBarJQ.height()) * (scrollHeight - clientHeight));
			contentJQ.scrollLeft((event.originalEvent['touches'][0].pageX - hBarJQ.width() / 2 - hRailJQ.offset().left) / (hRailJQ.width() - hBarJQ.width()) * (scrollWidth - clientWidth));
		});

		function getNodeListFrom(parentNode)  {
			var result = [];
			var childNodes = parentNode.childNodes;
			for (var i = 0, n = childNodes.length; i < n; i++)
				result.push(childNodes[i]);
			return result;
		}

		function moveNodeListTo(nodeList, containerNode) {
			for (var i = 0, n = nodeList.length; i < n; i++)
				containerNode.appendChild(removeNode(nodeList[i]));
		}

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('skin'))
				setSkin(params['skin']);

			if (params.hasOwnProperty('width'))
				width = toInt(params['width']);

			if (params.hasOwnProperty('height'))
				height = toInt(params['height']);

			if (params.hasOwnProperty('maxHeight'))
				maxHeight = toInt(params['maxHeight']);

			if (params.hasOwnProperty('vOffsX'))
				vOffsX = toInt(params['vOffsX']);

			if (params.hasOwnProperty('vOffsY'))
				vOffsY = toInt(params['vOffsY']);

			if (params.hasOwnProperty('hOffsX'))
				hOffsX = toInt(params['hOffsX']);

			if (params.hasOwnProperty('hOffsY'))
				hOffsY = toInt(params['hOffsY']);

			if (params.hasOwnProperty('scrollBarSize'))
				scrollBarSize = toInt(params['scrollBarSize']);

			if (params.hasOwnProperty('minScrollBarSize'))
				minScrollBarSize = toInt(params['minScrollBarSize']);

			if (params.hasOwnProperty('scrollTop')) {
				contentJQ.scrollTop(toInt(params['scrollTop']));
				refresh();
			}

			refresh();
		}

		function refresh() {
			// Resizing scroll box
			contentJQ.css({
				'height': height ? (height + 'px') : 'auto',
				'max-height': maxHeight ? (maxHeight + 'px') : 'none'
			});

			// Hiding scroll bars to make correct calculation
			vRailJQ.hide();
			hRailJQ.hide();

			// Calculating scroll box positions
			scrollLeft = contentJQ.scrollLeft();
			scrollTop = contentJQ.scrollTop();
			scrollWidth = contentJQ[0].scrollWidth;
			scrollHeight = contentJQ[0].scrollHeight;
			clientWidth = contentJQ[0].clientWidth;
			clientHeight = contentJQ[0].clientHeight;

			// Detecting if scroll bars are visible
			vBarVisible = (scrollHeight > clientHeight && scrollHeight > 0);
			hBarVisible = (scrollWidth > clientWidth && scrollWidth > 0);

			// Displaying vertical scroll bar
			if (vBarVisible) {
				// Calculating vertical scroll rail size
				vRailSize = clientHeight - 2 * vOffsY;

				// Calculating vertical scroll bar size
				if (scrollBarSize > 0)
					vBarSize = Math.min(scrollBarSize, clientHeight * 0.8);
				else
					vBarSize = Math.floor(vRailSize * clientHeight / scrollHeight);

				if (vBarSize < minScrollBarSize)
					vBarSize = minScrollBarSize;

				// Calculating vertical scroll bar position
				vBarOffs = scrollTop * (vRailJQ.height() - vBarJQ.height()) / (scrollHeight - clientHeight);

				// Set vertical scroll rail position
				vRailJQ.css({
					'display': 'block',
					'right': vOffsX + 'px',
					'top': vOffsY + 'px',
					'height': vRailSize + 'px'
				});

				// Set vertical scroll bar position
				vBarJQ.css({
					'top': vBarOffs + 'px',
					'height': vBarSize + 'px'
				});
			}

			// Displaying horizontal scroll bar
			if (hBarVisible) {
				// Calculating horizontal scroll rail size
				hRailSize = clientWidth - 2 * hOffsX;

				// Calculating horizontal scroll bar size
				if (scrollBarSize > 0)
					hBarSize = Math.min(scrollBarSize, clientWidth * 0.8);
				else
					hBarSize = Math.floor(hRailSize * clientWidth / scrollWidth);
				if (hBarSize < minScrollBarSize)
					hBarSize = minScrollBarSize;

				// Calculating horizontal scroll bar position
				hBarOffs = scrollLeft * (hRailJQ.width() - hBarJQ.width()) / (scrollWidth - clientWidth);

				// Set horizontal scroll rail position
				hRailJQ.css({
					'display': 'block',
					'left': hOffsX + 'px',
					'bottom': hOffsY + 'px',
					'width': hRailSize + 'px'
				});

				// Set horizontal horizontal position
				hBarJQ.css({
					'left': hBarOffs + 'px',
					'width': hBarSize + 'px'
				});
			}
		}

		function setSkin(skinName) {
			removeClassByPattern(jQ, 'ui-scroll-box-skin-*');

			switch (skinName) {
				case 'default':
					jQ.addClass('ui-scroll-box-skin-default');
					vOffsX = 3;
					vOffsY = 3;
					hOffsX = 3;
					hOffsY = 3;
					scrollBarSize = 0;
					minScrollBarSize = 20;
					break;
			}
		}

		function startVerticalDragging(mouseDownY) {
			var overlayJQ = uiGetJQ('ui-scroll-box-drag-overlay');
			overlayJQ.css({
				'display': 'block',
				'cursor': 'ns-resize'
			});
			jQ.append(overlayJQ);
			jQ.addClass('ui-scroll-box-with-vertical-dragging');

			dragObject = {
				'mouseDownY': mouseDownY,
				'savedScrollTop': scrollTop,
				'scrollMode': 'vertical',
				'overlayJQ': overlayJQ,
				'processDragging': processDragging,
				'stopDragging': stopDragging
			};
		}

		function startHorizontalDragging(mouseDownX) {
			var overlayJQ = uiGetJQ('ui-scroll-box-drag-overlay');
			overlayJQ.css({
				'display': 'block',
				'cursor': 'ew-resize'
			});
			jQ.append(overlayJQ);
			jQ.addClass('ui-scroll-box-with-horizontal-dragging');

			dragObject = {
				'mouseDownX': mouseDownX,
				'savedScrollLeft': scrollLeft,
				'scrollMode': 'horizontal',
				'overlayJQ': overlayJQ,
				'processDragging': processDragging,
				'stopDragging': stopDragging
			};
		}

		function processDragging(event) {
			if (dragObject['scrollMode'] == 'vertical')
				contentJQ.scrollTop(dragObject['savedScrollTop'] + (event.pageY - dragObject['mouseDownY']) / (vRailJQ.outerHeight() - vBarJQ.height()) * (scrollHeight - clientHeight));

			if (dragObject['scrollMode'] == 'horizontal')
				contentJQ.scrollLeft(dragObject['savedScrollLeft'] + (event.pageX - dragObject['mouseDownX']) / (hRailJQ.outerWidth() - hBarJQ.width()) * (scrollWidth - clientWidth));

			update();
		}

		function stopDragging() {
			jQ.removeClass('ui-scroll-box-with-vertical-dragging');
			jQ.removeClass('ui-scroll-box-with-horizontal-dragging');
			dragObject['overlayJQ'].remove();
			dragObject = null;
		}

		function getScrollTop() {
			return scrollTop;
		}

		var externalInterface = {
			'update': update,
			'refresh': refresh,
			'scrollTop': getScrollTop
		};
		jQ.data('UIScrollBox', externalInterface);
		return externalInterface;
	};

	function initializeOnce() {
		if (initialized)
			return;

		var documentJQ = $(document);

		documentJQ.on('mousemove', function(event) {
			if (dragObject)
				dragObject.processDragging(event);
		});

		documentJQ.on('mouseup', function(event) {
			if (dragObject)
				dragObject.stopDragging(event);
		});

		initialized = true;
	}
})();

function uiRefreshScrollBox(elementSelector) {
	var instance = $(elementSelector).data('UIScrollBox');
	if (isObject(instance))
		instance.refresh();
}

function uiGetScrollTop(elementSelector) {
	var elementJQ = $(elementSelector);
	var instance = elementJQ.data('UIScrollBox');
	if (isObject(instance))
		return instance.scrollTop();

	return elementJQ.scrollTop();
}

function uiSetScrollTop(scrollBoxSelector, value) {
	var scrollBoxJQ = $(scrollBoxSelector);
	var instance = scrollBoxJQ.data('UIScrollBox');
	if (isObject(instance)) {
		instance.update({
			'scrollTop': value
		});
	}
	else
		scrollBoxJQ.scrollTop(value);
}

function uiScrollToElement(scrollBoxSelector, elementSelector, topOffs, bottomOffs) {
	var scrollBoxJQ = $(scrollBoxSelector);
	var elementJQ = $(elementSelector);

	if (elementJQ.length == 0)
		return;

	var position = elementJQ.offset().top - scrollBoxJQ.offset().top - toInt(topOffs);

	if (position < 0)
		uiSetScrollTop(scrollBoxJQ, uiGetScrollTop(scrollBoxJQ) + position);

	if (position + elementJQ.outerHeight() + toInt(bottomOffs) > scrollBoxJQ[0].clientHeight)
		uiSetScrollTop(scrollBoxJQ, uiGetScrollTop(scrollBoxJQ) + elementJQ.offset().top - scrollBoxJQ.offset().top - scrollBoxJQ[0].clientHeight + elementJQ.outerHeight() + toInt(bottomOffs));
}

//======================================================================================================================
//  END OF: UIScrollBox
//======================================================================================================================

//======================================================================================================================
//  Keeping Input Box Focused
//======================================================================================================================
var _UI_INPUT_BOX_THAT_KEEP_FOCUSED = null;

function uiKeepFocused(inputBoxSelector) {
	var inputBoxJQ = $(inputBoxSelector);

	_UI_INPUT_BOX_THAT_KEEP_FOCUSED = inputBoxJQ;
	inputBoxJQ.one('blur', function() {
		setTimeout(function() {
			inputBoxJQ.focus();
			_UI_INPUT_BOX_THAT_KEEP_FOCUSED = null;
		}, 1);
	});
}

function uiIsFocusingLocked(inputBoxSelector) {
	return $(inputBoxSelector).is(_UI_INPUT_BOX_THAT_KEEP_FOCUSED)
}

//======================================================================================================================
//  END OF: Keeping Input Box Focused
//======================================================================================================================

//======================================================================================================================
//  UIPopupManager
//======================================================================================================================
var UI_POPUP_MANAGER = {};
(function(plugin) {
	var popupList = [];

	$(document).on('mousedown', function(event) {
		tryClosePopups($(event.target), false);
		tryClosePopups($(event.target), true);
	});

	$(document).on('click', function(event) {
		tryClosePopups($(event.target), true);
	});

	function addPopup(elementSelector, uiExclude, callback, closeOnClick) {
		var elementJQ = $(elementSelector);

		// Removing previous close handler for this element
		removePopup(elementJQ);

		// Adding popup close handler to popup list
		popupList.push({
			'elementJQ': elementJQ,
			'uiExclude': makeArray(uiExclude),
			'callback': callback,
			'closeOnClick': toBoolean(closeOnClick)
		});
	}

	function removePopup(elementSelector) {
		var elementJQ = $(elementSelector);

		var newPopupList = [];
		for (var i = 0; i < popupList.length; i++) {
			var popup = popupList[i];
			if (!popup['elementJQ'].is(elementJQ))
				newPopupList.push(popup);
		}
		popupList = newPopupList;
	}

	function closeAllPopups() {
		for (var i = 0, n = popupList.length; i < n; i++) {
			var callback = popupList[i]['callback'];
			if (isFunction(callback))
				callback();
		}
		popupList = [];
	}

	function tryClosePopups(targetJQ, closeOnClick) {
		// Check if element was not deleted before we get an event from it
		if (targetJQ.length && targetJQ.closest(document).length == 0)
			return;

		// Hiding popups
		var newPopupList = [];
		for (var i = 0, n = popupList.length; i < n; i++) {
			var popup = popupList[i];

			// Check if this popup could be hidden right now it by valid method
			if (popup['closeOnClick'] != closeOnClick) {
				newPopupList.push(popup);
				continue;
			}

			// Check if we need to hide this popup
			var hideComponent = true;
			var uiExclude = popup['uiExclude'];
			for (var j = 0, m = uiExclude.length; j < m; j++) {
				var excludeSelector = uiExclude[j];
				if (targetJQ.is(excludeSelector) || targetJQ.closest(excludeSelector).length) {
					hideComponent = false;
					break;
				}
			}

			// Closing current popup (if needed)
			if (hideComponent) {
				var callback = popup['callback'];
				if (isFunction(callback))
					callback();

				continue;
			}

			newPopupList.push(popup);
		}
		popupList = newPopupList;
	}

	plugin.addPopup = addPopup;
	plugin.closeAllPopups = closeAllPopups;
})(UI_POPUP_MANAGER);

function uiAddPopup(elementSelector, uiExclude, callback, hideOnClick) {
	UI_POPUP_MANAGER.addPopup(elementSelector, uiExclude, callback, hideOnClick);
}

function uiCloseAllPopups() {
	UI_POPUP_MANAGER.closeAllPopups();
}
//======================================================================================================================
//  END OF: UIPopupManager
//======================================================================================================================

//======================================================================================================================
//  UIPopup
//======================================================================================================================

var _UIPopup = {};
(function(plugin) {
	var initializedOnce = false;
	var windowJQ;
	var documentBodyJQ;

	function initializeOnce() {
		if (initializedOnce)
			return;

		windowJQ = $(window);
		documentBodyJQ = $(document.body);

		windowJQ.on('scroll', refreshAllPopups);
		windowJQ.on('resize', refreshAllPopups);

		initializedOnce = true;
	}

	function runPopup(buttonSelector, popupSelector, options, callback) {
		var buttonJQ = $(buttonSelector);
		var prevInstance = buttonJQ.data('UIPopup');
		if (isObject(prevInstance)) {
			if (prevInstance.allowToggle())
				prevInstance.close();
			else if (isObject(options))
				prevInstance.update(options);
			return;
		}

		initializeOnce();

		var scrollContainerJQ = addScrollHandlerToClosestScrollBox(buttonJQ);

		// Creating new popup
		var popupJQ = $(popupSelector).clone();
		popupJQ.addClass('ui-popup');
		popupJQ.removeClass('hidden');
		popupJQ.show();
		documentBodyJQ.append(popupJQ);
		buttonJQ.addClass('ui-with-expanded-popup');

		options = toObject(options);
		var visible = true;
		var fullWidth = false;
		var fixedHeight = false;
		var onShow = options['onShow'];
		var onHide = options['onHide'];
		var uiExclude = makeArray(options['uiExclude']);
		var navBarHeight = $('.ui-navigation-panel:first').outerHeight();
		var useSystemScroll = toBoolean(options['useSystemScroll']);
		var noToggle = toBoolean(options['noToggle']);
		var onBeforeRender = options['onBeforeRender'];
		var lockScreen = toBoolean(options['lockScreen']);

		var screenLockerJQ = null;
		if (lockScreen) {
			screenLockerJQ = $('<div>');
			screenLockerJQ.addClass('ui-popup-screen-locker');
			screenLockerJQ.insertBefore(popupJQ);
		}

		if (isFunction(onBeforeRender))
			onBeforeRender(popupJQ);

		if (isFunction(onShow))
			callback = onShow;

		// Searching for scroll area inside popup
		var scrollAreaJQ = popupJQ.find('.ui-popup-scroll-area:first');
		if (scrollAreaJQ.length == 0)
			scrollAreaJQ = popupJQ;
		scrollAreaJQ.css('overflow', 'auto');

		var marginTop = toInt(popupJQ.css('margin-top'));
		var marginBottom = toInt(popupJQ.css('margin-bottom'));
		popupJQ.css('margin', '0');

		uiExclude = toArray(cloneVariable(uiExclude));
		uiExclude.push(buttonJQ);
		uiExclude.push(popupJQ);
		uiAddPopup(buttonJQ, uiExclude, close);

		update(options);

		// Adding custom scroll box (if needed)
		var scrollBox = null;
		if (!useSystemScroll)
			scrollBox = scrollAreaJQ.UIScrollBox();

		// Executing popup show callback
		if (isFunction(callback))
			callback(popupJQ);

		refresh();

		function update(params) {
			params = toObject(params);

			if (params.hasOwnProperty('fullWidth'))
				fullWidth = toBoolean(params['fullWidth']);

			if (params.hasOwnProperty('fixedHeight'))
				fixedHeight = toBoolean(params['fixedHeight']);

			if (params.hasOwnProperty('marginTop'))
				marginTop = toInt(params['marginTop']);

			if (params.hasOwnProperty('marginBottom'))
				marginBottom = toInt(params['marginBottom']);

			if (params.hasOwnProperty('visible'))
				visible = toBoolean(params['visible']);

			refresh();
		}

		function refresh() {
			var vAlign;

			popupJQ.css({
				'display': 'block',
				'visibility': 'hidden',
				'left': '0',
				'top': '0',
				'width': '',
				'height': ''
			});
			if (!scrollBox) {
				scrollAreaJQ.css({
					'height': ''
				});
			}
			else {
				scrollBox.update({
					'height': 0
				});
			}

			// Obtaining window scroll position and size
			var scrollLeft = windowJQ.scrollLeft();
			var scrollTop = windowJQ.scrollTop();
			var windowWidth = windowJQ.innerWidth();
			var windowHeight = windowJQ.innerHeight();

			// Obtaining button position and size
			var buttonLeft = buttonJQ.offset().left;
			var buttonTop = buttonJQ.offset().top;
			var buttonWidth = buttonJQ.outerWidth();
			var buttonHeight = buttonJQ.outerHeight();

			// We could use the size of the button to set minimal size of the popup
			if (fullWidth)
				popupJQ.css('min-width', buttonWidth + 'px');

			// Obtaining scroll area data
			var scrollAreaHeight = scrollAreaJQ.outerHeight();

			// Obtaining popup width
			var popupWidth = popupJQ.outerWidth();
			var popupHeight = popupJQ.outerHeight();
			var popupHeightDiff = popupHeight - scrollAreaHeight;

			// Calculating popup initial position
			var newPopupLeft = buttonLeft;
			var newPopupTop;
			var newPopupHeight = popupHeight;

			//----------------------------------------------------------------------------------------------------------
			//	Normalizing popup vertical position
			//----------------------------------------------------------------------------------------------------------

			// Calculate popup vertical position
			var size1 = buttonTop - scrollTop - marginBottom - 4;
			var size2 = windowHeight - (buttonTop - scrollTop) - buttonHeight - marginBottom - 4;
			if (!fixedHeight) {
				if (size1 > size2) {
					newPopupHeight = Math.min(newPopupHeight, size1);
					newPopupTop = buttonTop - newPopupHeight - marginBottom;
					vAlign = 'to-top';
				}
				else {
					newPopupHeight = Math.min(newPopupHeight, size2);
					newPopupTop = buttonTop + buttonHeight + marginTop;
					vAlign = 'to-bottom';
				}
			}
			else {
				if (size1 > size2) {
					vAlign = 'to-top';
					newPopupTop = buttonTop - newPopupHeight - marginBottom;
				}
				else {
					vAlign = 'to-bottom';
					newPopupTop = buttonTop + buttonHeight + marginTop;
				}
				var normalizedPopupTop = ensureRange(newPopupTop, scrollTop + marginTop, scrollTop + windowHeight - popupHeight - marginTop - marginBottom);
				if (newPopupTop != normalizedPopupTop) {
					newPopupTop = normalizedPopupTop;
					vAlign = 'none';
				}
				newPopupTop = Math.max(newPopupTop, scrollTop + marginTop);
				newPopupHeight = Math.min(newPopupHeight, windowHeight - marginTop - marginBottom);
			}

			if (!scrollBox) {
				scrollAreaJQ.css({
					'height': (newPopupHeight - popupHeightDiff) + 'px'
				});
			}
			else {
				scrollBox.update({
					'height': newPopupHeight - popupHeightDiff
				});
			}

			//----------------------------------------------------------------------------------------------------------
			//	Normalizing popup horizontal position
			//----------------------------------------------------------------------------------------------------------

			var hAlign = 'to-right';

			// Calculating popup width
			var newPopupWidth;
			if (!scrollBox) {
				var scrollBarWidth = scrollAreaJQ.outerWidth() - scrollAreaJQ[0].clientWidth;
				newPopupWidth = popupWidth + scrollBarWidth;
			}
			else
				newPopupWidth = popupWidth;

			// Normalize popup horizontal position
			if (newPopupLeft + newPopupWidth >= scrollLeft + windowWidth) {
				newPopupLeft = scrollLeft + buttonLeft + buttonWidth - newPopupWidth;
				hAlign = 'to-left';
			}

			// If popup still out of the screen so we move it to the beginning
			if (newPopupLeft < scrollLeft) {
				newPopupLeft = scrollLeft;
				hAlign = 'none';
			}

			//----------------------------------------------------------------------------------------------------------
			//	Hiding popup if it is out of the screen
			//----------------------------------------------------------------------------------------------------------

			var popupVisible = false;
			if (visible) {
				if (scrollContainerJQ)
					popupVisible = (buttonJQ.offset().top - scrollContainerJQ.offset().top + buttonJQ.outerHeight() >=0 && scrollContainerJQ.offset().top + scrollContainerJQ[0].clientHeight - buttonJQ.offset().top >= 0);
				else
					popupVisible = (buttonJQ.offset().top + buttonJQ.outerHeight() - windowJQ.scrollTop() - navBarHeight >= 0 && windowJQ.scrollTop() + windowJQ.innerHeight() - buttonJQ.offset().top >= 0);
			}

			//----------------------------------------------------------------------------------------------------------

			popupJQ.css({
				'display': popupVisible ? 'block' : 'none',
				'visibility': '',
				'left': newPopupLeft + 'px',
				'top': newPopupTop + 'px',
				'width': newPopupWidth + 'px'
			});

			popupJQ.toggleClass('ui-popup-to-top', vAlign == 'to-top');
			popupJQ.toggleClass('ui-popup-to-bottom', vAlign == 'to-bottom');
			popupJQ.toggleClass('ui-popup-to-left', hAlign == 'to-left');
			popupJQ.toggleClass('ui-popup-to-right', hAlign == 'to-right');
		}

		function close() {
			if (isObject(screenLockerJQ))
				screenLockerJQ.remove();
			buttonJQ.removeClass('ui-with-expanded-popup');
			popupJQ.remove();
			buttonJQ.data('UIPopup', null);
			if (isFunction(onHide))
				onHide();
		}

		function allowToggle() {
			return !noToggle;
		}

		var externalInterface = {
			'update': update,
			'refresh': refresh,
			'close': close,
			'allowToggle': allowToggle
		};
		buttonJQ.data('UIPopup', externalInterface);
		popupJQ.data('UIPopup', externalInterface);
	}

	function updatePopup(popupSelector, params) {
		var instance = $(popupSelector).data('UIPopup');
		if (isObject(instance))
			instance.update(params);
	}

	function refreshPopup(popupSelector) {
		var instance = $(popupSelector).data('UIPopup');
		if (isObject(instance))
			instance.refresh();
	}

	function refreshAllPopups() {
		documentBodyJQ.children('.ui-popup').each(function() {
			refreshPopup(this);
		});
	}

	function closePopup(popupSelector) {
		var instance = $(popupSelector).data('UIPopup');
		if (isObject(instance))
			instance.close();
	}

	function addScrollHandlerToClosestScrollBox(elementJQ) {
		var scrollContainerJQ = null;
		for (;;) {
			if (elementJQ.length == 0)
				break;

			if (elementJQ.is(documentBodyJQ))
				break;

			var overflow = elementJQ.css('overflow');
			if (overflow == 'auto' || overflow == 'scroll') {
				scrollContainerJQ = elementJQ;
				break;
			}
			elementJQ = elementJQ.parent();
		}
		if (scrollContainerJQ && !scrollContainerJQ.data('uiPopup_HasScrollHandler')) {
			scrollContainerJQ.scroll(refreshAllPopups);
			scrollContainerJQ.data('uiPopup_HasScrollHandler', true);
		}
		return scrollContainerJQ;
	}

	plugin.runPopup = runPopup;
	plugin.updatePopup = updatePopup;
	plugin.closePopup = closePopup;
})(_UIPopup);

function uiRunPopup(buttonSelector, popupSelector, options, callback) {
	_UIPopup.runPopup(buttonSelector, popupSelector, options, callback);
}

function uiUpdatePopup(popupSelector, params) {
	_UIPopup.updatePopup(popupSelector, params);
}

function uiClosePopup(popupSelector) {
	_UIPopup.closePopup(popupSelector);
}
//======================================================================================================================
//  END OF: UIPopup
//======================================================================================================================

//======================================================================================================================
//  UIHintWindow
//======================================================================================================================
$(function() {
	var windowJQ = $(window);
	var documentJQ = $(document);
	var bodyJQ = $('body');

	function createHintWindow(targetJQ) {
		var prevInstance=targetJQ.data('UIHintWindow');
		if (isObject(prevInstance))
			return;

		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		//  Finding hint container
		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

		var hintContainer = targetJQ.closest(targetJQ.attr('data-ui-hint-container'));
		if (hintContainer.length == 0)
			hintContainer = bodyJQ;

		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		//  Finding relative container
		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

		var relativeContainerJQ = null;
		var elementJQ = hintContainer;
		for (;;) {
			if (elementJQ.length == 0)
				break;

			if (elementJQ.is(bodyJQ))
				break;

			if (elementJQ.css('position') == 'relative') {
				relativeContainerJQ = elementJQ;
				break;
			}
			elementJQ = elementJQ.parent();
		}

		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		//  Creating hint window
		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

		// Creating hint
		var hintJQ = uiGetJQ('ui-hint-window');
		hintContainer.append(hintJQ);

		// Setting hint text
		var hintText = targetJQ.attr('data-ui-hint');
		hintJQ.children('span').text(hintText);

		// Applying design
		if (targetJQ.is('[data-ui-hint-design]'))
			hintJQ.addClass('ui-hint-window-design-' + targetJQ.attr('data-ui-hint-design'));

		// Precalculating some common variables
		var targetLeft = targetJQ.offset().left;
		var targetTop = targetJQ.offset().top;
		var targetWidth = targetJQ.outerWidth();
		var targetHeight = targetJQ.outerHeight();
		var hintWidth = hintJQ.outerWidth();
		var hintHeight = hintJQ.outerHeight();
		var windowLeft = windowJQ.scrollLeft();
		var windowTop = windowJQ.scrollTop();
		var windowWidth = windowJQ.innerWidth();
		var windowHeight = windowJQ.innerHeight();
		var isHorizontal = (targetJQ.attr('data-ui-hint-orientation') == 'horizontal');
		var hintLeft;
		var hintTop;
		var hintHelperElementOffset;

		var hintOffsetX = toInt(targetJQ.attr('data-ui-hint-offset-x'));
		var hintOffsetY = toInt(targetJQ.attr('data-ui-hint-offset-y'));

		if (isHorizontal) {
			// Calculating hint position
			hintLeft = targetLeft + targetWidth + hintOffsetX + 7;
			hintTop = targetTop - (hintHeight - targetHeight) / 2;
			var originalTop=hintTop;

			// Correcting vertical position
			if (hintTop + hintHeight - 2 > windowTop + windowHeight)
				hintTop = windowTop + windowHeight - hintHeight + 2;
			if (hintTop + 2 < windowTop)
				hintTop = windowTop - 2;
			hintHelperElementOffset = originalTop - hintTop - 7;

			// Correcting horizontal position
			if (hintLeft + hintWidth + 4 > windowWidth + windowLeft) {
				hintJQ.addClass('ui-hint-window-to-left');
				hintLeft = targetLeft - hintWidth - hintOffsetX - 7;
			}
			else
				hintJQ.addClass('ui-hint-window-to-right');

			// If there is no way to display horizontal hint than we use vertical hint
			if (hintLeft + 7 < windowLeft) {
				hintJQ.removeClass('ui-hint-window-to-left');
				hintJQ.removeClass('ui-hint-window-to-right');
				isHorizontal = false;
			}
		}

		if (!isHorizontal) {
			// Calculating hint position
			hintLeft = targetLeft - (hintWidth - targetWidth) / 2;
			hintTop = targetTop - hintHeight - hintOffsetY - 7;
			var originalLeft = hintLeft;

			// Correcting hint horizontal position
			if (hintLeft < 4)
				hintLeft = 4;
			if (hintLeft + hintWidth + 4 > windowWidth + windowLeft)
				hintLeft = windowWidth + windowLeft - hintWidth - 4;
			hintHelperElementOffset = originalLeft - hintLeft - 7;

			// Calculating hint vertical orientation
			if (hintTop >= windowTop)
				hintJQ.addClass('ui-hint-window-to-top');
			else {
				hintJQ.addClass('ui-hint-window-to-bottom');
				hintTop = targetJQ.offset().top + targetHeight + hintOffsetY + 7;
			}
		}

		// Converting document position to relative coordinates
		if (relativeContainerJQ) {
			hintLeft -= relativeContainerJQ.offset().left;
			hintTop -= relativeContainerJQ.offset().top;
		}

		// Setting hint position
		hintJQ.css({
			'left': hintLeft + 'px',
			'top': hintTop + 'px'
		});

		// Correcting helper element offset
		if (isHorizontal) {
			hintJQ.find('.ui-hint-window-helper-element').css({
				'margin-top': hintHelperElementOffset + 'px'
			});
		}
		else {
			hintJQ.find('.ui-hint-window-helper-element').css({
				'margin-left': hintHelperElementOffset + 'px'
			});
		}

		var savedMargin = hintJQ.css('margin');

		// Displaying hint
		var timer = setTimeout(function() {
			hintJQ.stop().animate({
				'opacity': 'show',
				'margin': 0
			}, 150);
		}, 150);

		targetJQ.data('UIHintWindow',{
			'destroy':function() {
				targetJQ.data('UIHintWindow',null);

				clearTimeout(timer);
				hintJQ.stop().animate({
					'opacity': 'hide',
					'margin': savedMargin
				}, 150, 'linear', function() {
					hintJQ.remove();
				});
			}
		});
	}

	var hoveredObjectJQ = null;

	documentJQ.on('mouseenter', '[data-ui-hint]', function() {
		hoveredObjectJQ = $(this);
		createHintWindow(hoveredObjectJQ);
	});

	documentJQ.on('mouseleave mousedown', '[data-ui-hint]', function() {
		if (hoveredObjectJQ) {
			var instance = hoveredObjectJQ.data('UIHintWindow');
			if (isObject(instance))
				instance.destroy();

			hoveredObjectJQ = null;
		}
	});
});
//======================================================================================================================
//  END OF: UIHintWindow
//======================================================================================================================

//======================================================================================================================
//  UIInputBox
//======================================================================================================================
(function() {
	$.fn.UIInputBox = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('UIInputBox');
		if (isObject(prevInstance)) {
			if (isObject(options))
				prevInstance.update(options);
			return prevInstance;
		}

		var jQ = uiGetJQ('ui-input-box');
		parentElementJQ.append(jQ);

		var inputBoxJQ = jQ.find('.ui-input-box-element:first');
		var label = '';
		var infoLabel = '';
		var comment = '';
		var infoComment = '';
		var value = '';
		var onChange = null;
		var onPressEnter = null;
		var onPressEscape = null;

		update(options);

		// Processing input box changing
		jQ.on('input keyup', '.ui-input-box-element', function() {
			var newValue = inputBoxJQ.val();
			if (newValue != value) {
				value = newValue;
				if (isFunction(onChange)) {
					onChange({
						'value': value
					});
				}
			}
		});

		// Focusing input box
		jQ.on('focusin', '.ui-input-box-element', function() {
			jQ.addClass('ui-input-box-focused');
		});

		// Unfocusing input box
		jQ.on('focusout', '.ui-input-box-element', function() {
			jQ.removeClass('ui-input-box-focused');
		});

		// Processing key events
		jQ.on('keydown', '.ui-input-box-element', function(event) {
			switch (event.keyCode) {
				case 13: // Enter
					event.preventDefault();
					if (isFunction(onPressEnter)) {
						onPressEnter({
							'jQ': parentElementJQ
						});
					}
					break;
				case 27: // Escape
					event.preventDefault();
					if (isFunction(onPressEscape)) {
						onPressEscape({
							'jQ': parentElementJQ
						});
					}
					break;
			}
		});

		function update(params) {
			params = toObject(params);

			var topPanelRefreshNeeded = false;
			var bottomPanelRefreshNeeded = false;

			if (params.hasOwnProperty('label')) {
				label = trim(params['label']);
				jQ.find('.ui-input-box-label:first').text(label);
				topPanelRefreshNeeded = true;
			}

			if (params.hasOwnProperty('infoLabel')) {
				infoLabel = trim(params['infoLabel']);
				jQ.find('.ui-input-box-info-label:first').text(infoLabel);
				topPanelRefreshNeeded = true;
			}

			if (params.hasOwnProperty('placeholder'))
				inputBoxJQ.attr('placeholder', toString(params['placeholder']));

			if (params.hasOwnProperty('value')) {
				value = toString(params['value']);
				inputBoxJQ.val(value);
			}

			if (params.hasOwnProperty('comment')) {
				comment = trim(params['comment']);
				jQ.find('.ui-input-box-comment:first').text(comment);
				bottomPanelRefreshNeeded = true;
			}

			if (params.hasOwnProperty('infoComment')) {
				infoComment = trim(params['infoComment']);
				jQ.find('.ui-input-box-info-comment:first').text(infoComment);
				bottomPanelRefreshNeeded = true;
			}

			if (params.hasOwnProperty('mask'))
				inputBoxJQ.UIMask(params['mask']);

			if (params.hasOwnProperty('pattern'))
				inputBoxJQ.UIInputPattern(params['pattern']);

			if (params.hasOwnProperty('formatAsPhoneNumber'))
				inputBoxJQ.UIPhoneFormatter(params['formatAsPhoneNumber']);

			if (params.hasOwnProperty('onChange'))
				onChange = params['onChange'];

			if (params.hasOwnProperty('onPressEnter'))
				onPressEnter = params['onPressEnter'];

			if (params.hasOwnProperty('onPressEscape'))
				onPressEscape = params['onPressEscape'];

			if (params.hasOwnProperty('compact')) {
				if (toBoolean(params['compact']))
					jQ.addClass('ui-input-box-compact');
				else
					jQ.removeClass('ui-input-box-compact');
			}

			if (params.hasOwnProperty('limit')) {
				inputBoxJQ.UILetterCounter({
					'limit': params['limit'],
					'onFill': function(event) {
						update({
							'infoComment': event['text']
						});
					}
				});
			}

			if (topPanelRefreshNeeded) {
				if (label != '' || infoLabel != '')
					jQ.addClass('ui-input-box-with-top-panel');
				else
					jQ.removeClass('ui-input-box-with-top-panel');
			}

			if (bottomPanelRefreshNeeded) {
				if (comment != '' || infoComment != '')
					jQ.addClass('ui-input-box-with-bottom-panel');
				else
					jQ.removeClass('ui-input-box-with-bottom-panel');
			}
		}

		function getValue() {
			return value;
		}

		function focus() {
			inputBoxJQ.focus();
		}

		var externalInterface = {
			'update': update,
			'value': getValue,
			'focus': focus
		};
		uiAddError(parentElementJQ, jQ.find('.ui-input-box-container:first'), externalInterface);
		parentElementJQ.data('UIInputBox', externalInterface);
		parentElementJQ.data('uiSetFocus', focus);
		return externalInterface;
	};
})();
//======================================================================================================================
//  END OF: UIInputBox
//======================================================================================================================

//======================================================================================================================
//  UIBaseSelectBox
//======================================================================================================================
(function() {
	$.fn.UIBaseSelectBox = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('UIBaseSelectBox');
		if (isObject(prevInstance))
			return prevInstance;

		// Obtaining initial data
		options = toObject(options);
		var componentElementJQ = $(options['componentElement']);
		var onRefresh = options['onRefresh'];

		// Creating wrapper
		var jQ = uiGetJQ('ui-base-select-box');
		jQ.insertAfter(parentElementJQ);
		var containerJQ = jQ.find('.ui-base-select-box-container:first');
		containerJQ.append(parentElementJQ.detach());

		// Internal variables
		var list = [];
		var map = {};
		var value = '';
		var topPanelLabel = '';
		var topPanelInfoLabel = '';
		var fullWidth = false;
		var componentPopupJQ = null;
		var invisibleInputJQ = jQ.find('.ui-base-select-box-invisible-input:first');
		var onChange = null;
		var onTryChange = null;
		var onSetTitle = null;
		var placeholder = 'Select one';
		var popupMarginTop = 4;
		var popupMarginBottom = 4;
		var lockScreen = false;
		var searchEnabled = false;

		// Processing click on
		componentElementJQ.on('click', function() {
			showPopup();
		});

		// Focusing element (using TAB key)
		jQ.on('focus', '.ui-base-select-box-invisible-input', function() {
			jQ.addClass('ui-base-select-box-focused');
		});

		// Unfocusing element (using TAB key)
		jQ.on('blur', '.ui-base-select-box-invisible-input', function() {
			jQ.removeClass('ui-base-select-box-focused');
		});

		// Processing keyboard event for the select box wrapper
		jQ.on('keydown', '.ui-base-select-box-invisible-input', function(event) {
			switch (event.keyCode) {
				case 32: // Space
				case 13: // Enter
				case 38: // Up arrow
				case 40: // Down arrow
					showPopup();
					break;
			}
		});

		function update(params) {
			params = toObject(params);

			var topPanelRefreshNeeded = false;
			var refreshNeeded = false;

			if (params.hasOwnProperty('fullWidth')) {
				if (toBoolean(params['fullWidth']))
					jQ.addClass('ui-base-select-box-full-width');
				else
					jQ.removeClass('ui-base-select-box-full-width');
			}

			if (params.hasOwnProperty('list')) {
				setList(params['list']);
				refreshNeeded = true;
			}

			if (params.hasOwnProperty('value')) {
				value = params['value'];
				refreshNeeded = true;
			}

			if (params.hasOwnProperty('label')) {
				topPanelLabel = toString(params['label']);
				jQ.find('.ui-base-select-box-top-panel-title:first').text(topPanelLabel);
				topPanelRefreshNeeded = true;
			}

			if (params.hasOwnProperty('infoLabel')) {
				topPanelInfoLabel = toString(params['infoLabel']);
				jQ.find('.ui-base-select-box-top-panel-info-label:first').text(topPanelInfoLabel);
				topPanelRefreshNeeded = true;
			}

			if (topPanelRefreshNeeded) {
				if (topPanelLabel != '' || topPanelInfoLabel != '')
					jQ.addClass('ui-base-select-box-with-top-panel');
				else
					jQ.removeClass('ui-base-select-box-with-top-panel');
			}

			if (params.hasOwnProperty('fullWidth')) {
				if (toBoolean(params['fullWidth']))
					jQ.addClass('ui-base-select-box-with-full-width');
				else
					jQ.removeClass('ui-base-select-box-with-full-width');
			}

			if (params.hasOwnProperty('width')) {
				var width = toInt(params['width']);
				if (width)
					containerJQ.css('width', width + 'px');
				else
					containerJQ.css('width', '');
			}

			if (params.hasOwnProperty('maxWidth')) {
				var maxWidth = toInt(params['maxWidth']);
				if (maxWidth)
					containerJQ.css('max-width', maxWidth + 'px');
				else
					containerJQ.css('max-width', '');
			}

			if (params.hasOwnProperty('onChange'))
				onChange = params['onChange'];

			if (params.hasOwnProperty('onTryChange'))
				onTryChange = params['onTryChange'];

			if (params.hasOwnProperty('onSetTitle'))
				onSetTitle = params['onSetTitle'];

			if (params.hasOwnProperty('popupMarginTop'))
				popupMarginTop = toInt(params['popupMarginTop']);

			if (params.hasOwnProperty('popupMarginBottom'))
				popupMarginBottom = toInt(params['popupMarginBottom']);

			if (params.hasOwnProperty('placeholder'))
				placeholder = trim(params['placeholder']);

			if (params.hasOwnProperty('lockScreen'))
				lockScreen = toBoolean(params['lockScreen']);

			if (params.hasOwnProperty('searchEnabled')) {
				searchEnabled = toBoolean(params['searchEnabled']);
				refreshNeeded = true;
			}

			if (refreshNeeded)
				onRefresh();
		}

		function setList(newList) {
			list = toArray(newList);
			map = {};
			for (var i = 0; i < list.length; i++) {
				var item = list[i];
				var value = item['value'];
				map[value] = item;
			}
		}

		function showPopup() {
			uiRunPopup(componentElementJQ, '.ui-templates:first .ui-base-select-box-popup:first', {
				'fullWidth': true,
				'marginTop': popupMarginTop,
				'marginBottom': popupMarginBottom,
				'lockScreen': lockScreen,
				'onHide': hidePopup
			}, function(popupJQ) {
				componentPopupJQ = popupJQ;

				// Adding expanded state to select box caller
				jQ.addClass('ui-base-select-box-expanded');
				var invisibleInputForPopupJQ = popupJQ.find('.ui-base-select-box-popup-invisible-input:first');
				var scrollBoxJQ = popupJQ.find('.ui-base-select-box-popup-item-scroll-box:first');
				var itemListJQ = popupJQ.find('.ui-base-select-box-popup-item-list:first');
				var searchInputBoxJQ = popupJQ.find('.ui-base-select-box-popup-search-input-box:first');
				var searchText = '';

				if (searchEnabled)
					popupJQ.addClass('ui-base-select-box-popup-with-search');

				fillItemList();
				scrollToItem(popupJQ.find('.ui-base-select-box-popup-item-list-item-highlighted:first'));
				popupJQ.find('input:visible:first').focus();

				// Processing click on list item
				popupJQ.on('click', '.ui-base-select-box-popup-item-list-item', function() {
					var itemJQ = $(this);
					var item = toObject(itemJQ.data('uiBaseSelectBox_Item'));
					tryChange(item['value'], function(event) {
						value = event['newValue'];
						uiClosePopup(popupJQ);
						uiCloseAllPopups();
						invisibleInputJQ.focus();
						onRefresh();
						performChange();
					});
				});

				// Keeping input box focused
				popupJQ.on('click', function(event) {
					if (!$(event.target).is('input[type=text]'))
						invisibleInputForPopupJQ.focus();
				});

				// Highlighting value when mouse moves on it
				popupJQ.on('mouseover', '.ui-base-select-box-popup-item-list-item', function() {
					popupJQ.find('.ui-base-select-box-popup-item-list-item-highlighted').removeClass('ui-base-select-box-popup-item-list-item-highlighted');
					$(this).addClass('ui-base-select-box-popup-item-list-item-highlighted');
				});

				// Processing keyboard events
				popupJQ.on('keydown', 'input[type=text]', function(event) {
					var oldHighlightedElementJQ;
					var newHighlightedElementJQ;
					switch (event.keyCode) {
						case 13: // Enter
							var highlightedItemJQ = popupJQ.find('.ui-base-select-box-popup-item-list-item-highlighted:first');
							var item = toObject(highlightedItemJQ.data('uiBaseSelectBox_Item'));
							tryChange(item['value'], function(event) {
								value = event['newValue'];
								uiClosePopup(popupJQ);
								invisibleInputJQ.focus();
								onRefresh();
								performChange();
							});
							break;
						case 38: // Up arrow
							event.preventDefault();
							event.stopPropagation();
							oldHighlightedElementJQ = popupJQ.find('.ui-base-select-box-popup-item-list-item-highlighted:first');
							if (oldHighlightedElementJQ.length == 0) {
								popupJQ.find('.ui-base-select-box-popup-item-list-item:first').addClass('ui-base-select-box-popup-item-list-item-highlighted');
								uiSetScrollTop(scrollBoxJQ, 0);
							}
							else {
								newHighlightedElementJQ = oldHighlightedElementJQ.prev('.ui-base-select-box-popup-item-list-item');
								if (newHighlightedElementJQ.length) {
									oldHighlightedElementJQ.removeClass('ui-base-select-box-popup-item-list-item-highlighted');
									newHighlightedElementJQ.addClass('ui-base-select-box-popup-item-list-item-highlighted');
									scrollToItem(newHighlightedElementJQ);
								}
							}
							break;
						case 40: // Down arrow
							event.preventDefault();
							event.stopPropagation();
							oldHighlightedElementJQ = popupJQ.find('.ui-base-select-box-popup-item-list-item-highlighted:first');
							if (oldHighlightedElementJQ.length == 0) {
								popupJQ.find('.ui-base-select-box-popup-item-list-item:first').addClass('ui-base-select-box-popup-item-list-item-highlighted');
								uiSetScrollTop(scrollBoxJQ, 0);
							}
							else {
								newHighlightedElementJQ = oldHighlightedElementJQ.next('.ui-base-select-box-popup-item-list-item');
								if (newHighlightedElementJQ.length) {
									oldHighlightedElementJQ.removeClass('ui-base-select-box-popup-item-list-item-highlighted');
									newHighlightedElementJQ.addClass('ui-base-select-box-popup-item-list-item-highlighted');
									scrollToItem(newHighlightedElementJQ);
								}
							}
							break;
						case 27: // Escape
						case 9: // Tab
							event.preventDefault();
							event.stopPropagation();
							uiClosePopup(popupJQ);
							break;
					}
				});

				popupJQ.on('input keyup', '', function() {
					var newSearchText = trim(searchInputBoxJQ.val()).toLowerCase();
					if (newSearchText != searchText) {
						searchText = newSearchText;
						fillItemList();
					}
				});

				function fillItemList() {
					uiSetScrollTop(scrollBoxJQ);

					var listData = {};

					preprocessList(listData);
					applyHighlightToList(listData);
					reorderList(listData);

					function preprocessList(listData) {
						var preprocessedList = [];
						for (var i = 0; i < list.length; i++) {
							var item = list[i];
							var itemTitle = toString(item['title']);

							var itemKey = itemTitle.toLowerCase();
							preprocessedList.push({
								'title': itemTitle,
								'key': itemKey,
								'item': item
							})
						}
						listData['list'] = preprocessedList;
					}

					function applyHighlightToList(listData) {
						var list = listData['list'];
						var preparedList = [];
						for (var i = 0; i < list.length; i++) {
							var item = list[i];
							var itemTitle = item['title'];
							var index;
							var html;

							index = item['key'].indexOf(searchText);
							if (index >= 0) {
								var s1 = itemTitle.substr(0, index);
								var s2 = itemTitle.substr(index, searchText.length);
								var s3 = itemTitle.substr(index + searchText.length);
								html = htmlEntities(s1) + '<span>' + htmlEntities(s2) + '<\/span>' + s3;
							}
							else
								html = itemTitle;

							preparedList.push({
								'index': index,
								'html': html,
								'item': item['item']
							});
						}
						listData['list'] = preparedList;
					}

					function reorderList(listData) {
						var i;
						var list = listData['list'];
						var orderedList = [];
						for (i = 0; i < list.length; i++) {
							var item = list[i];
							if (item['index'] == 0)
								orderedList.push(item);
						}
						for (i = 0; i < list.length; i++) {
							item = list[i];
							if (item['index'] > 0)
								orderedList.push(item);
						}
						for (i = 0; i < list.length; i++) {
							item = list[i];
							if (item['index'] < 0)
								orderedList.push(item);
						}
						listData['list'] = orderedList;
					}

					if (searchText.length)
						popupJQ.addClass('ui-base-select-box-popup-searching');
					else
						popupJQ.removeClass('ui-base-select-box-popup-searching');

					var formattedList = listData['list'];
					itemListJQ.empty();
					for (var i = 0, n = formattedList.length; i < n; i++) {
						var listWrapper = formattedList[i];
						var item = listWrapper['item'];
						var itemJQ = $('<div>');
						itemJQ.addClass('ui-base-select-box-popup-item-list-item');
						itemJQ.data('uiBaseSelectBox_Item', item);
						itemJQ.html(listWrapper['html']);

						if (searchText.length) {
							if (i == 0 && listWrapper['index'] > -1)
								itemJQ.addClass('ui-base-select-box-popup-item-list-item-highlighted');
						}
						else {
							if (item['value'] == value)
								itemJQ.addClass('ui-base-select-box-popup-item-list-item-highlighted');
						}

						itemListJQ.append(itemJQ);
					}
				}

				function scrollToItem(itemJQ) {
					uiScrollToElement(scrollBoxJQ, itemJQ, 16, 16);
				}
			});
		}

		function hidePopup() {
			jQ.removeClass('ui-base-select-box-expanded');
			uiClosePopup(componentPopupJQ);
			componentPopupJQ = null;
		}

		function performChange() {
			if (isFunction(onChange))
				onChange(toObject(map[value]));
		}

		function tryChange(newValue, callback) {
			if (isFunction(onTryChange)) {
				onTryChange({
					'newValue': newValue,
					'success': true
				}, function(event) {
					if (toBoolean(event['success']))
						callback({
							'newValue': event['newValue']
						});
					else
						hidePopup();
				});
			}
			else {
				callback({
					'newValue': newValue
				});
			}
		}

		function getTitle() {
			var title = placeholder;

			if (isFunction(onSetTitle)) {
				var newTitle = toString(onSetTitle({
					'value': value
				}));

				if (newTitle != '')
					title = newTitle;
			}
			else {
				if (map.hasOwnProperty(value))
					title = toString(map[value]['title']);
			}

			return title;
		}

		function getValue() {
			if (map.hasOwnProperty(value))
				return value;

			return null;
		}

		function getItem() {
			if (map.hasOwnProperty(value))
				return map[value];

			return null;
		}

		function focus() {
			invisibleInputJQ.focus();
		}

		var externalInterface = {
			'update': update,
			'title': getTitle,
			'value': getValue,
			'item': getItem
		};
		uiAddError(parentElementJQ, containerJQ, externalInterface);
		parentElementJQ.data('UIBaseSelectBox', externalInterface);
		parentElementJQ.data('uiSetFocus', focus);
		return externalInterface;
	};
})();
//======================================================================================================================
//  END OF: UIBaseSelectBox
//======================================================================================================================

//======================================================================================================================
//  UIGraySelectBox
//======================================================================================================================
(function() {
	$.fn.UIGraySelectBox = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('UIGraySelectBox');
		if (isObject(prevInstance)) {
			if (isObject(options))
				prevInstance.update(options);
			return prevInstance;
		}

		var jQ = uiGetJQ('ui-gray-select-box');
		parentElementJQ.append(jQ);
		var parent = jQ.UIBaseSelectBox({
			'componentElement': jQ,
			'onRefresh': refresh
		});

		update(options);
		refresh();

		function update(params) {
			params = toObject(params);

			parent.update(params);
		}

		function refresh() {
			jQ.text(parent.title());
		}

		var externalInterface = cloneVariable(parent);
		externalInterface['update'] = update;
		parentElementJQ.data('UIGraySelectBox', externalInterface);
		return externalInterface;
	};
})();
//======================================================================================================================
//  END OF: UIGraySelectBox
//======================================================================================================================

//======================================================================================================================
//  UI Dialog
//======================================================================================================================
function uiShowDialog(options) {
	options = toObject(options);

	var jQ = uiGetJQ('ui-dialog-wrapper');
	$('body').append(jQ);

	var dialogJQ = jQ.find('.ui-dialog-window:first');
	var titleJQ = jQ.find('.ui-dialog-title:first');
	var contentJQ = jQ.find('.ui-dialog-content:first');
	var buttonsPanelJQ = jQ.find('.ui-dialog-buttons-panel:first');
	var onLoad = null;
	var onClose = null;
	var onOverlayClick = null;
	var onResize = null;
	var dialogOldWidth = 0;
	var focusTargetJQ = toJQueryObject(options['focusTarget']);

	// Initializing dialog width
	if (options.hasOwnProperty('width')) {
		var dialogWidth = toInt(options['width']);
		if (dialogWidth > 0)
			dialogJQ.width(dialogWidth);
	}

	// Initializing dialog dynamic width
	if (options.hasOwnProperty('minWidth')) {
		var dialogMinWidth = toInt(options['minWidth']);
		if (dialogMinWidth > 0) {
			jQ.addClass('ui-dialog-with-dynamic-width');
			dialogJQ.css('min-width', dialogMinWidth + 'px');
		}
	}

	// Initializing title
	if (options.hasOwnProperty('title') && isString(options['title'])) {
		var dialogTitle = options['title'];
		titleJQ.text(dialogTitle);
		jQ.addClass('ui-dialog-with-title');
	}

	// Initializing content
	if (options.hasOwnProperty('content')) {
		var content = options['content'];
		if (isString(content))
			contentJQ.html(textToHTML(content));
		else if (isJQueryObject(content)) {
			var clonedContendJQ = content.clone();
			clonedContendJQ.show();
			clonedContendJQ.removeClass('ui-template');
			contentJQ.append(clonedContendJQ);
		}
	}

	// Initializing action elements
	if (options.hasOwnProperty('buttons')) {
		var buttonList = options['buttons'];
		if (isArray(buttonList)) {
			jQ.addClass('ui-dialog-with-buttons-panel');
			for (var i = 0; i < buttonList.length; i++) {
				var button = buttonList[i];
				var actionType = button['type'];
				switch (actionType) {
					case 'button':
						appendActionButton(button);
						break;
					case 'link':
						appendActionLink(button);
						break;
				}
			}
		}
	}

	// Setting dialog resize handler
	if (options.hasOwnProperty('onResize'))
		onResize = options['onResize'];

	// Calling dialog load handler
	if (options.hasOwnProperty('onLoad'))
		onLoad = options['onLoad'];

	// Setting dialog close handler
	if (options.hasOwnProperty('onClose'))
		onClose = options['onClose'];

	// Setting dialog close handler
	if (options.hasOwnProperty('onOverlayClick'))
		onOverlayClick = options['onOverlayClick'];

	// Displaying dialog
	displayDialog();
	if (isFunction(onLoad))
		onLoad(contentJQ);

	// Resizing dialog
	calcDialogPosition();
	uiAddResizeHandler(jQ, calcDialogPosition);

	jQ.on('click mousedown', function(event) {
		event.stopPropagation();
	});

	// Handling external close event
	jQ.on('closeDialog', function() {
		closeDialog();
	});

	// Handling external close event
	jQ.on('repositionDialog', function() {
		calcDialogPosition();
	});

	// Processing click on dialog overlay
	jQ.on('click', function(event) {
		if (event.target != this)
			return;

		if (isFunction(onOverlayClick))
			onOverlayClick(contentJQ);
		else
			closeDialog();
	});

	// Processing click on action button
	jQ.on('click', '.ui-dialog-action-button, .ui-dialog-action-link', function() {
		var props = toObject($(this).data('dataProps'));

		var action = props['action'];
		if (action == 'close')
			uiCloseDialog(contentJQ);

		var handler = props['handler'];
		if (isFunction(handler))
			handler(contentJQ);
	});

	// Processing click on action link
	jQ.on('click', '.ui-dialog-action-link > button', function() {
		var handler = $(this).data('uiDialogHandler');
		if (isFunction(handler))
			handler(contentJQ);
	});

	function displayDialog() {
		$('body').addClass('body-ui-dialog-no-scroll');
		jQ.fadeIn(200);
	}

	function closeDialog() {
		if (isFunction(onClose))
			onClose(contentJQ);

		$('body').removeClass('body-ui-dialog-no-scroll');
		jQ.fadeOut(200, function() {
			jQ.remove();
		});
		if (focusTargetJQ.length)
			focusTargetJQ.focus();
	}

	function calcDialogPosition() {
		var left=(jQ[0].clientWidth-dialogJQ.outerWidth())/2;
		var top=(jQ[0].clientHeight-dialogJQ.outerHeight())/2;

		if (left<0)
			left=0;
		if (top<0)
			top=0;

		dialogJQ.css({
			'left':left+'px',
			'top':top+'px'
		});

		if (isFunction(onResize) && dialogOldWidth != dialogJQ.outerWidth()) {
			onResize(contentJQ);
			dialogOldWidth = dialogJQ.outerWidth();
		}
	}

	function appendActionButton(props) {
		var elementJQ = uiGetJQ('ui-dialog-action-button');
		elementJQ.text(toString(props['title']));
		elementJQ.data('dataProps', props);
		buttonsPanelJQ.append(elementJQ);
	}

	function appendActionLink(props) {
		var elementJQ = uiGetJQ('ui-dialog-action-link');
		elementJQ.text(toString(props['title']));
		elementJQ.data('dataProps', props);
		buttonsPanelJQ.append(elementJQ);
	}

	return contentJQ;
}

function uiRepositionDialog(dialogJQ) {
	if (isJQueryObject(dialogJQ))
		dialogJQ.trigger('repositionDialog');
}

function uiCloseDialog(dialogJQ) {
	if (isJQueryObject(dialogJQ))
		dialogJQ.trigger('closeDialog');
}

function uiShowMessage(message) {
	uiShowDialog({
		'content': toString(message),
		'width': 400,
		'minWidth': 200,
		'buttons': [
			{
				'type': 'button',
				'title': 'Ok',
				'action': 'close'
			}
		]
	});
}

function uiConfirm(title, onSuccess) {
	uiShowDialog({
		'content': toString(title),
		'width': 450,
		'minWidth': 200,
		'buttons': [
			{
				'type': 'link',
				'title': 'No',
				'action': 'close'
			},
			{
				'type': 'button',
				'title': 'Yes',
				'handler': function(dialogJQ) {
					uiCloseDialog(dialogJQ);
					if (isFunction(onSuccess))
						onSuccess();
				}
			}
		]
	});
}

function uiConfirmDeletion(title, onDelete) {
	uiShowDialog({
		'content': toString(title),
		'width': 450,
		'minWidth': 200,
		'buttons': [
			{
				'type': 'link',
				'title': 'Cancel',
				'action': 'close'
			},
			{
				'type': 'button',
				'title': 'Delete',
				'handler': function(dialogJQ) {
					uiCloseDialog(dialogJQ);
					if (isFunction(onDelete))
						onDelete();
				}
			}
		]
	});
}
//======================================================================================================================
//	END OF: UI Dialog
//======================================================================================================================

//======================================================================================================================
//	UITextArea
//======================================================================================================================
(function() {
	$.fn.UITextArea = function(options) {
		var parentElementJQ = $(this);
		var prevInstance = parentElementJQ.data('UITeatArea');
		if (isObject(prevInstance)) {
			if (isObject(options))
				prevInstance.update(options);
			return prevInstance;
		}

		var label = '';
		var infoLabel = '';
		var value = '';
		var onChange = null;
		var height = 100;
		var autoHeight = false;

		var jQ = uiGetJQ('ui-text-area');
		parentElementJQ.append(jQ);

		var textAreaJQ = jQ.find('.ui-text-area-element:first');

		update(options);
		uiAddResizeHandler(jQ, refreshHeight);

		jQ.on('input keypress change', '.ui-text-area-element', function() {
			refreshHeight();

			var newValue = textAreaJQ.val();
			if (newValue != value) {
				value = newValue;
				if (isFunction(onChange)) {
					onChange({
						'value': value
					});
				}
			}
		});

		function update(params) {
			params = toObject(params);

			var topPanelRefreshNeeded = false;

			if (params.hasOwnProperty('label')) {
				label = toString(params['label']);
				jQ.find('.ui-text-area-label:first').text(label);
				topPanelRefreshNeeded = true;
			}

			if (params.hasOwnProperty('infoLabel')) {
				infoLabel = toString(params['infoLabel']);
				jQ.find('.ui-text-area-info-label:first').text(infoLabel);
				topPanelRefreshNeeded = true;
			}

			if (params.hasOwnProperty('placeholder'))
				textAreaJQ.attr('placeholder', toString(params['placeholder']));

			if (params.hasOwnProperty('value')) {
				value = toString(params['value']);
				textAreaJQ.val(value);
			}

			if (params.hasOwnProperty('autoHeight')) {
				autoHeight = toBoolean(params['autoHeight']);
				height = 34;
			}

			if (params.hasOwnProperty('height')) {
				height = toInt(params['height']);
				textAreaJQ.outerHeight(height);
			}

			if (params.hasOwnProperty('onChange'))
				onChange = params['onChange'];

			if (params.hasOwnProperty('limit')) {
				textAreaJQ.UILetterCounter({
					'limit': params['limit'],
					'onFill': function(event) {
						update({
							'infoLabel': event['text']
						});
					}
				});
			}

			if (params.hasOwnProperty('mentionList')) {
				textAreaJQ.UIMentionList({
					'mentionList': params['mentionList']
				});
			}

			if (topPanelRefreshNeeded) {
				if (label != '' || infoLabel != '')
					jQ.addClass('ui-text-area-with-top-panel');
				else
					jQ.removeClass('ui-text-area-with-top-panel');
			}

			refreshHeight();
		}

		function refreshHeight() {
			if (autoHeight) {
				textAreaJQ.outerHeight(height);
				textAreaJQ.outerHeight(textAreaJQ[0].scrollHeight + 4);
			}
		}

		function getValue() {
			return value;
		}

		function focus() {
			textAreaJQ.focus();
		}

		var externalInterface = {
			'update': update,
			'value': getValue,
			'focus': focus
		};
		uiAddError(parentElementJQ, jQ.find('.ui-text-area-element-container:first'), externalInterface);
		parentElementJQ.data('UITeatArea', externalInterface);
		return externalInterface;
	};
})();
//======================================================================================================================
//	END OF: UITextArea
//======================================================================================================================

//======================================================================================================================
//	Validation Errors
//======================================================================================================================
function runErrorTooltip(parentSelector, options) {
	var parentElementJQ = $(parentSelector);
	var prevInstance = parentElementJQ.data('UIErrorTooltip');
	if (isObject(prevInstance)) {
		if (isObject(options))
			prevInstance.update(options);
		return prevInstance;
	}

	var windowJQ = $(window);

	var jQ = uiGetJQ('ui-error-tooltip');
	$(document.body).append(jQ);

	var arrowJQ = jQ.find('.ui-error-tooltip-arrow:first');

	uiAddResizeHandler(jQ, refresh);
	uiAddScrollHandler(jQ, refresh);

	update(options);

	// Processing double click on element text
	jQ.on('dblclick', '.ui-error-tooltip-content', function() {
		selectElementText(this);
	});

	function update(params) {
		params = toObject(params);

		if (params.hasOwnProperty('message'))
			jQ.find('.ui-error-tooltip-content:first').text(toString(params['message']));

		refresh();
	}

	function close() {
		jQ.remove();
		parentElementJQ.data('UIErrorTooltip', null);
	}

	function refresh() {
		jQ.css({
			'visibility': 'hidden',
			'left': 0,
			'top': 0,
			'width': ''
		});

		var parentLeft = parentElementJQ.offset().left;
		var parentTop = parentElementJQ.offset().top;
		var parentWidth = parentElementJQ.outerWidth();
		var parentHeight = parentElementJQ.outerHeight();

		var scrollLeft = windowJQ.scrollLeft();
		var scrollTop = windowJQ.scrollTop();
		var windowWidth = windowJQ.innerWidth();
		var windowHeight = windowJQ.innerHeight();

		//--------------------------------------------------------------------------------------------------------------
		//	Tooltip horizontal position calculation
		//--------------------------------------------------------------------------------------------------------------
		var tooltipWidth = jQ.outerWidth();

		var x = parentElementJQ.offset().left;
		if (x + tooltipWidth + 4 > scrollLeft + windowWidth)
			x = parentLeft + parentWidth - tooltipWidth;

		var w = tooltipWidth + 1;
		if (x < 4) {
			x = 4;
			w = windowWidth - 8;
		}

		jQ.outerWidth(w);
		//--------------------------------------------------------------------------------------------------------------
		//	END OF: Tooltip horizontal position calculation
		//--------------------------------------------------------------------------------------------------------------

		//--------------------------------------------------------------------------------------------------------------
		//	Tooltip vertical position calculation
		//--------------------------------------------------------------------------------------------------------------
		var tooltipHeight = jQ.outerHeight();
		var y = parentTop + parentHeight + 9;
		var vAlign = 'to-bottom';

		if (y + tooltipHeight >= scrollTop + windowHeight - 4) {
			y = parentTop - tooltipHeight - 9;
			vAlign = 'to-top';
		}
		//--------------------------------------------------------------------------------------------------------------
		//	END OF: Tooltip vertical position calculation
		//--------------------------------------------------------------------------------------------------------------

		//--------------------------------------------------------------------------------------------------------------
		//	Tooltip arrow position calculation
		//--------------------------------------------------------------------------------------------------------------
		var arrowOffs;
		if (parentWidth > tooltipWidth)
			arrowOffs = 20;
		else
			arrowOffs = parentWidth / 2 + parentLeft - x;
		//--------------------------------------------------------------------------------------------------------------
		//	END OF: Tooltip arrow position calculation
		//--------------------------------------------------------------------------------------------------------------

		var visible = (parentTop + parentHeight >= scrollTop && parentTop < scrollTop + windowHeight);

		jQ.css({
			'display': visible ? 'block' : 'none',
			'visibility': '',
			'left': x + 'px',
			'top': y + 'px'
		});
		arrowJQ.css({
			'left': arrowOffs + 'px'
		});

		jQ.toggleClass('ui-error-tooltip-to-top', vAlign == 'to-top');
		jQ.toggleClass('ui-error-tooltip-to-bottom', vAlign == 'to-bottom');
	}

	var externalInterface = {
		'update': update,
		'close': close
	};
	parentElementJQ.data('UIErrorTooltip', externalInterface);
	return externalInterface;
}

function closeErrorTooltip(componentSelector) {
	var instance = $(componentSelector).data('UIErrorTooltip');
	if (isObject(instance))
		instance.close();
}

function uiAddError(componentSelector, wrapperSelector, componentInterface) {
	var componentJQ = $(componentSelector);
	var wrapperJQ = $(wrapperSelector);
	componentInterface = toObject(componentInterface);

	var prevInstance = componentJQ.data('UIValidationError');
	if (isObject(prevInstance))
		return;

	function setError(message) {
		message = toString(message);

		wrapperJQ.addClass('ui-with-validation-error');
		uiAddPopup(wrapperJQ, [componentJQ, wrapperJQ, '.ui-error-tooltip'], clearError);

		var uiSetFocus = componentJQ.data('uiSetFocus');
		if (isFunction(uiSetFocus))
			uiSetFocus();

		if (message) {
			runErrorTooltip(wrapperJQ, {
				'message': message
			});
		}
	}

	function clearError() {
		wrapperJQ.removeClass('ui-with-validation-error');
		closeErrorTooltip(wrapperJQ);
	}

	var externalInterface = {
		'setError': setError,
		'clearError': clearError
	};
	componentJQ.data('UIValidationError', externalInterface);
	componentInterface.uiValidationError = externalInterface;
	return externalInterface;
}

function findErrorInstance(target) {
	if (isObject(target) && target.hasOwnProperty('uiValidationError'))
		return target.uiValidationError;

	var targetJQ = $(target);

	if (targetJQ.length == 0) {
		console.error('Please specify the valid element for error message');
		return null;
	}

	var prevInstance = targetJQ.data('UIValidationError');

	if (isObject(prevInstance))
		return prevInstance;

	return uiAddError(targetJQ, targetJQ, null);
}

function uiSetError(target, message) {
	var instance = findErrorInstance(target);
	if (isObject(instance))
		instance.setError(message);
}

function uiClearError(target) {
	var instance = findErrorInstance(target);
	if (isObject(instance))
		instance.clearError();
}
//======================================================================================================================
//	END OF: Validation Errors
//======================================================================================================================

//======================================================================================================================
//  Color Dialog
//======================================================================================================================
var _UI_COLOR_DIALOG = {};
(function(plugin) {
	var initialized = false;
	var windowJQ = $(window);
	var documentJQ = $(document);
	var dragInstance = null;
	var jQ;
	var colorDialogWindowJQ;
	var dragOverlayJQ;
	var huesBoxJQ;
	var huesArrowJQ;
	var pickerBoxJQ;
	var pickerBoxArrowJQ;
	var opacityLineJQ;
	var opacityLineArrowJQ;
	var inputBoxJQ;
	var backgroundOverlayJQ;
	var ownerJQ;
	var allowOpacity;
	var color;
	var onChanging;
	var onChange;
	var dialogMoved;
	var hueChangeFlag;
	var saturationBrightnessChangeFlag;
	var opacityChangeFlag;
	var hue;
	var saturation;
	var brightness;
	var opacity;
	var inputBoxLocker = new Locker();
	var oldHue;
	var oldSaturation;
	var oldBrightness;
	var oldOpacity;
	var colorChanged;
	var navBarHeight;
	var toLeft;
	var focusTargetJQ;

	function init() {
		if (initialized)
			return;

		jQ = uiGetJQ('ui-color-dialog');
		$(document.body).append(jQ);

		colorDialogWindowJQ = jQ.find('.ui-color-dialog-window:first');
		dragOverlayJQ = jQ.find('.ui-color-dialog-drag-overlay:first');
		huesBoxJQ = jQ.find('.ui-color-dialog-hues:first');
		huesArrowJQ = jQ.find('.ui-color-dialog-hues:first i:first');
		pickerBoxJQ = jQ.find('.ui-color-dialog-picker-box:first');
		pickerBoxArrowJQ = jQ.find('.ui-color-dialog-picker-box:first i:first');
		opacityLineJQ = jQ.find('.ui-color-dialog-opacity-line:first');
		opacityLineArrowJQ = jQ.find('.ui-color-dialog-opacity-line:first i:first');
		inputBoxJQ = jQ.find('.ui-color-dialog-input-box:first input:first');
		backgroundOverlayJQ = jQ.find('.ui-color-dialog-background-overlay:first');

		initialized = true;
	}

	function display(options) {
		init();

		// Reading options
		options = toObject(options);
		ownerJQ = toJQueryObject(options['owner']);
		allowOpacity = toBoolean(options['allowOpacity']);
		color = toString(options['color']);
		onChanging = options['onChanging'];
		onChange = options['onChange'];
		toLeft = toBoolean(options['toLeft']);
		focusTargetJQ = toJQueryObject(options['focusTarget']);

		// Initializing some variables
		dialogMoved = false;
		navBarHeight = $('.ui-navigation-panel:first').outerHeight();

		// Turning off color opacity if needed
		if (allowOpacity)
			jQ.removeClass('ui-color-dialog-without-color-opacity');
		else
			jQ.addClass('ui-color-dialog-without-color-opacity');

		// Making overlay invisible
		if (ownerJQ.length) {
			ownerJQ.addClass('ui-with-opened-color-dialog');
			jQ.addClass('ui-color-dialog-with-transparent-overlay');
		}
		else
			jQ.removeClass('ui-color-dialog-with-transparent-overlay');

		// Displaying color dialog
		colorDialogWindowJQ.show();
		backgroundOverlayJQ.fadeIn(200);

		// Calculating dialog positions
		calcPositions();
		uiAddResizeHandler(jQ, calcPositions);
		uiAddScrollHandler(jQ, calcPositions);

		// Parsing color
		var initialColor = colorFromWebColor(color);
		var hsv = initialColor.getHSV();
		hue = hsv['h'];
		saturation = hsv['s'];
		brightness = hsv['v'];
		opacity = initialColor.alpha();
		oldHue = hue;
		oldSaturation = saturation;
		oldBrightness = brightness;
		oldOpacity = opacity;
		colorChanged = false;
		refresh();

		// Processing mousemove event
		documentJQ.on('mousemove', function(event) {
			if (dragInstance)
				dragInstance.processDragging(event);
		});

		// Processing mouseup event
		documentJQ.on('mouseup', function() {
			if (dragInstance)
				dragInstance.stopDragging();
		});

		// Keeping external field focused
		jQ.on('mousedown',function() {
			if (focusTargetJQ.length)
				uiKeepFocused(focusTargetJQ);
		});

		// Processing click on background overlay
		jQ.on('click', '.ui-color-dialog-background-overlay', function() {
			close();
		});

		// Switching between RGB an HEX mode
		jQ.on('click','.ui-color-dialog-mode-switch',function() {
			var buttonJQ=$(this);
			if (buttonJQ.hasClass('selected'))
				return;

			jQ.find('.ui-color-dialog-mode-switch').removeClass('selected');
			$(this).addClass('selected');
			refresh();
		});

		// Processing hue change
		jQ.on('mousedown', '.ui-color-dialog-hues', function(event) {
			hueChangeFlag = true;
			dragOverlayJQ.css({
				'display': 'block',
				'cursor': 'row-resize'
			});
			dragInstance = {
				'processDragging': processDragging,
				'stopDragging': stopDragging
			};
			processDragging(event);
		});

		// Processing brightness and saturation change
		jQ.on('mousedown', '.ui-color-dialog-picker-box', function(event) {
			saturationBrightnessChangeFlag = true;
			dragOverlayJQ.css({
				'display': 'block',
				'cursor': 'crosshair'
			});
			dragInstance = {
				'processDragging': processDragging,
				'stopDragging': stopDragging
			};
			processDragging(event);
		});

		// Processing opacity change
		jQ.on('mousedown', '.ui-color-dialog-opacity-line', function(event) {
			opacityChangeFlag = true;
			dragOverlayJQ.css({
				'display': 'block',
				'cursor': 'row-resize'
			});
			dragInstance = {
				'processDragging': processDragging,
				'stopDragging': stopDragging
			};
			processDragging(event);
		});

		// Passing color from input box
		jQ.on('change keyup paste', '.ui-color-dialog-input-box > input', function() {
			inputBoxLocker.beginLock();

			var color = new ColorSpace();
			if (color.setWebColor(inputBoxJQ.val())) {
				var hsv=color.getHSV();
				hue=hsv['h'];
				saturation=hsv['s'];
				brightness=hsv['v'];
				opacity=color.alpha();
				refresh();
			}

			inputBoxLocker.endLock();
			performChange();
		});
	}

	function close() {
		if (ownerJQ.length)
			ownerJQ.removeClass('ui-with-opened-color-dialog');

		colorDialogWindowJQ.hide();
		backgroundOverlayJQ.fadeOut(200);
	}

	function refresh() {
		// Updating hues arrow position
		huesArrowJQ.css({
			'top': (159 - hue * 159 / 255) + 'px'
		});

		// Updating opacity arrow position
		opacityLineArrowJQ.css('top', (159 - opacity * 159 / 255) + 'px');

		// Setting picker box hue color
		var hueColor = getHueColorByIndex(hue, 255);
		pickerBoxJQ.css('background', hueColor.getWebColor());

		// Obtaining web color
		var colorObj = new ColorSpace();
		colorObj.setHSV(hue, saturation, brightness);
		colorObj.setAlpha(opacity);
		var colorStr = colorObj.getRGBColorString();

		// Updating circle inside picker box
		var v = (brightness > 128) ? 0 : 255;
		var borderColor = colorFromRGB(v, v, v);
		var borderColorStr = borderColor.getWebColor();
		pickerBoxArrowJQ.css({
			'left': (saturation * 159 / 255) + 'px',
			'top': (159 - brightness * 159 / 255) + 'px',
			'background': colorStr,
			'border-color': borderColorStr
		});

		//  Updating opacity line color
		opacityLineJQ.css('background-color', colorStr);

		// Changing value of input box
		if (!inputBoxLocker.locked()) {
			var colorInputBoxStr;
			if (colorObj.alpha() == 0)
				colorInputBoxStr = 'transparent';
			else if (jQ.find('.ui-color-dialog-mode-switch[data-mode=hex]').hasClass('selected'))
				colorInputBoxStr = '#' + colorObj.getColorNumber();
			else {
				if (allowOpacity)
					colorInputBoxStr=colorObj.getInlineRGBA();
				else
					colorInputBoxStr=colorObj.getInlineRGB();
			}
			inputBoxJQ.val(colorInputBoxStr);
		}

		if (oldHue != hue || oldSaturation != saturation || oldBrightness != brightness || oldOpacity != opacity) {
			colorChanged = true;

			// Producing output color
			if (colorObj.alpha() == 0)
				color = 'transparent';
			else if (allowOpacity)
				color = colorObj.getWebColor();
			else
				color = colorObj.getRGBColorString();

			// Setting immediate change event
			if (isFunction(onChanging))
				onChanging(color);

			oldHue = hue;
			oldSaturation = saturation;
			oldBrightness = brightness;
			oldOpacity = opacity;
		}
	}

	function calcPositions() {
		if (ownerJQ.length)
			calcPositionsForParent();
		else
			calcPositionsOnScreenCenter();

		function calcPositionsOnScreenCenter() {
			var left = (windowJQ.innerWidth() - colorDialogWindowJQ.outerWidth()) / 2;
			if (left < 0)
				left = 0;

			var top = (windowJQ.innerHeight() - colorDialogWindowJQ.outerHeight()) / 2;
			if (top < 0)
				top = 0;

			colorDialogWindowJQ.css({
				'position': 'fixed',
				'left': left + 'px',
				'top': top + 'px'
			});
		}

		function calcPositionsForParent() {
			var left;
			var top;

			var marginTop = 4;
			var marginBottom = 4;

			var buttonLeft = ownerJQ.offset().left;
			var buttonTop = ownerJQ.offset().top;
			var buttonWidth = ownerJQ.outerWidth();
			var buttonHeight = ownerJQ.outerHeight();
			var scrollLeft = windowJQ.scrollLeft();
			var scrollTop = windowJQ.scrollTop();
			var windowWidth = windowJQ.innerWidth();
			var windowHeight = windowJQ.innerHeight();
			var dialogWidth = colorDialogWindowJQ.outerWidth();
			var dialogHeight = colorDialogWindowJQ.outerHeight();

			// Calculate dialog vertical position
			var size1 = buttonTop - scrollTop - marginBottom - 4;
			var size2 = windowHeight - (buttonTop - scrollTop) - buttonHeight - marginBottom - 4;
			if (size1 > size2)
				top = buttonTop - dialogHeight - marginBottom;
			else
				top = buttonTop + buttonHeight + marginTop;

			// Calculate dialog horizontal position
			left = buttonLeft;
			if (left + dialogWidth >= scrollLeft + windowWidth || toLeft)
				left = scrollLeft + buttonLeft + buttonWidth - dialogWidth;
			if (left < scrollLeft + 4)
				left = scrollLeft + 4;

			colorDialogWindowJQ.css({
				'position': 'absolute',
				'left': left + 'px',
				'top': top + 'px'
			});

			if (ownerJQ.length) {
				var dialogVisible = (buttonTop + buttonHeight - scrollTop - navBarHeight >= 0 && scrollTop + windowHeight - buttonTop >= 0);
				jQ.css({
					'display': dialogVisible ? 'block' : 'none'
				});
			}
		}
	}

	function processDragging(event) {
		if (hueChangeFlag) {
			hue = (159 - event.pageY + huesBoxJQ.offset().top) * 255 / 159;
			hue = keepRange(hue, 0, 255);
			if (opacity==0)
				opacity=255;
			refresh();
		}
		else if (saturationBrightnessChangeFlag) {
			saturation = (event.pageX - pickerBoxJQ.offset().left) * 255 / 159;
			saturation = keepRange(saturation, 0, 255);
			brightness = (159 - event.pageY + pickerBoxJQ.offset().top) * 255 / 159;
			brightness = keepRange(brightness, 0, 255);
			if (opacity == 0)
				opacity = 255;
			refresh();
		}
		else if (opacityChangeFlag) {
			opacity = (159 - event.pageY + opacityLineJQ.offset().top) * 255 / 159;
			opacity = keepRange(opacity, 0, 255);
			refresh();
		}
	}

	function stopDragging() {
		dragOverlayJQ.hide();
		hueChangeFlag = false;
		saturationBrightnessChangeFlag = false;
		opacityChangeFlag = false;
		dragInstance = null;
		performChange();
	}

	function performChange() {
		if (!colorChanged)
			return;

		if (isFunction(onChange))
			onChange(color);

		colorChanged = false;
	}

	plugin.display = display;
})(_UI_COLOR_DIALOG);

function runColorDialog(options) {
	_UI_COLOR_DIALOG.display(options);
}
//======================================================================================================================
//  END OF: Color Dialog
//======================================================================================================================

//======================================================================================================================
//	runContextMenu
//======================================================================================================================
var _UI_CONTEXT_MENU = {};
(function(plugin) {
	var documentJQ;
	var windowJQ;
	var initialized = false;
	var justShowed = false;
	var jQ = null;
	var hideCallback = null;

	function init() {
		if (initialized)
			return;

		documentJQ = $(document);
		windowJQ = $(window);

		documentJQ.on('mousedown', function(event) {
			if (!closestNodeWithClass(event.target, 'ui-context-menu') && !justShowed)
				closeContextMenu();

			justShowed=false;
		});

		windowJQ.resize(function() {
			closeContextMenu();
		});

		initialized=true;
	}

	function display(x, y, menuSelector, onShow, onHide) {
		init();

		x = toInt(x);
		y = toInt(y);
		hideCallback = onHide;

		// If there was a previously opened menu than we close it
		if (jQ)
			close();

		// Adding new context menu
		jQ = $(menuSelector).clone();
		jQ.addClass('ui-context-menu');
		$(document.body).append(jQ);
		justShowed = true;

		jQ.css({
			'display': 'block',
			'visibility': 'hidden',
			'left': 0,
			'top': 0
		});

		if (isFunction(onShow))
			onShow(jQ);

		var left = x;
		var top = y;
		var width = jQ.outerWidth(true);
		var height = jQ.outerHeight(true);

		if (top + height >= windowJQ.scrollTop() + windowJQ.innerHeight())
			top=top-height;

		if (top < windowJQ.scrollTop())
			top = windowJQ.scrollTop();

		if (left + width >= windowJQ.scrollLeft() + windowJQ.innerWidth())
			left=left-width;

		if (left < windowJQ.scrollLeft())
			left = windowJQ.scrollLeft();

		jQ.css({
			'visibility': 'visible',
			'left': left + 'px',
			'top': top + 'px'
		});
	}

	function close() {
		if (!jQ)
			return;

		if (isFunction(hideCallback))
			hideCallback(jQ);

		jQ.remove();
		jQ = null;
	}

	plugin.display = display;
	plugin.close = close;
})(_UI_CONTEXT_MENU);

function runContextMenu(x ,y, menuSelector, onShow, onHide) {
	_UI_CONTEXT_MENU.display(x, y, menuSelector, onShow, onHide);
}

function closeContextMenu() {
	_UI_CONTEXT_MENU.close();
}
//======================================================================================================================
//	END OF: runContextMenu
//======================================================================================================================