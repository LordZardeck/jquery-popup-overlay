/*!
     * jQuery Popup Overlay
     *
     * @version 1.6.0
     * @requires jQuery v1.7.1+
     * @link http://vast-eng.github.com/jquery-popup-overlay/
     */
    (function ($) {

        var $window = $(window),
            options = {},
            zindexvalues = [],
            lastclicked = [],
            onevisible = false,
            oneormorevisible = false,
            scrollbarwidth,
            focushandler = null,
            blurhandler = null,
            escapehandler = null,
            bodymarginright = null,
            opensuffix = '_open',
            closesuffix = '_close',
            focusedelementbeforepopup = null,
            visibleScrollLocks = 0;

        var methods = {

            _init: function (el) {
                var $el = $(el);
                var options = $el.data('popupoptions');
                lastclicked[el.id] = false;
                zindexvalues[el.id] = 0;

                if (!$el.data('popup-initialized')) {
                    $el.attr('data-popup-initialized', 'true');
                    methods._initonce(el);
                }

                if (options.autoopen) {
                    methods.show(el, 0);
                }
            },

            _initonce: function (el) {
                var $body = $('body');
                var $wrapper;
                var options = $el.data('popupoptions');
                bodymarginright = parseInt($body.css('margin-right'), 10);

                if (options.type == 'tooltip') {
                    options.background = false;
                    options.scrolllock = false;
                }

                if (options.scrolllock) {
                    // Calculate the browser's scrollbar width dynamically
                    var parent;
                    var child;
                    if (typeof scrollbarwidth === 'undefined') {
                        parent = $('<div style="width:50px;height:50px;overflow:auto"><div/></div>').appendTo('body');
                        child = parent.children();
                        scrollbarwidth = child.innerWidth() - child.height(99).innerWidth();
                        parent.remove();
                    }
                }

                if (!$el.attr('id')) {
                    $el.attr('id', 'j-popup-' + parseInt(Math.random() * 100000000));
                }

                $el.addClass('popup_content');

                $body.prepend(el);

                $el.wrap('<div id="' + el.id + '_wrapper" class="popup_wrapper" />');

                $wrapper = $('#' + el.id + '_wrapper');

                $wrapper.css({
                    opacity: 0,
                    visibility: 'hidden',
                    position: 'absolute',
                    overflow: 'auto'
                });

                $el.css({
                    opacity: 0,
                    visibility: 'hidden',
                    display: 'inline-block'
                });

                if (options.setzindex && !options.autozindex) {
                    $wrapper.css('z-index', '2001');
                }

                if (!options.outline) {
                    $el.css('outline', 'none');
                }

                if (options.transition) {
                    $el.css('transition', options.transition);
                    $wrapper.css('transition', options.transition);
                }

                // Hide popup content from screen readers initially
                $(el).attr('aria-hidden', true);

                if ((options.background) && (!$('#' + el.id + '_background').length)) {

                    var popupbackground = '<div id="' + el.id + '_background" class="popup_background"></div>';

                    $body.prepend(popupbackground);

                    var $background = $('#' + el.id + '_background');

                    $background.css({
                        opacity: 0,
                        visibility: 'hidden',
                        backgroundColor: options.color,
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0
                    });

                    if (options.backgroundclass) {
                        $background.addClass(options.backgroundclass);
                    }

                    if (options.setzindex && !options.autozindex) {
                        $background.css('z-index', '2000');
                    }

                    if (options.transition) {
                        $background.css('transition', options.transition);
                    }
                }

                if (options.type == 'overlay') {
                    $el.css({
                        textAlign: 'left',
                        position: 'relative',
                        verticalAlign: 'middle'
                    });

                    $wrapper.css({
                        position: 'fixed',
                        top: 0,
                        right: 0,
                        left: 0,
                        bottom: 0,
                        textAlign: 'center'
                    });

                    // CSS vertical align helper
                    $wrapper.append('<div class="popup_align" />');

                    $('.popup_align').css({
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        height: '100%'
                    });
                }

                // Add WAI ARIA role to announce dialog to screen readers
                $el.attr('role', 'dialog');

                var openelement =  (options.openelement) ? options.openelement : ('.' + el.id + opensuffix);

                $(openelement).each(function (i, item) {
                    $(item).attr('data-popup-ordinal', i);

                    if (!$(item).attr('id')) {
                        $(item).attr('id', 'open_' + parseInt((Math.random() * 100000000), 10));
                    }
                });

                // Set aria-labelledby (if aria-label or aria-labelledby is not set in html)
                if (!($el.attr('aria-labelledby') || $el.attr('aria-label'))) {
                    $el.attr('aria-labelledby', $(openelement).attr('id'));
                }

                $(document).on('click', openelement, function (e) {
                    if (!($el.data('popup-visible'))) {
                        var ord = $(this).data('popup-ordinal');

                        // Show element when clicked on `open` link.
                        methods.show(el, ord);

                        e.preventDefault();
                    }
                });

                // Handler: `close` element
                var closeelement = (options.closeelement) ? options.closeelement : ('.' + el.id + closesuffix);
                $(document).on('click', closeelement, function (e) {
                    methods.hide(el);
                    e.preventDefault();
                });

                if (options.detach) {
                    $el.hide().detach();
                } else {
                    $wrapper.hide();
                }

                // Bind callbacks
                if (typeof options.beforeopen == 'function')
                    $el.on("jquery-popup-overlay.beforeopen", options.beforeopen)
                if (typeof options.onopen == 'function')
                    $el.on("jquery-popup-overlay.onopen", options.onopen)
                if (typeof options.onclose == 'function')
                    $el.on("jquery-popup-overlay.onclose", options.onclose)
                if (typeof options.opentransitionend == 'function')
                    $el.on("jquery-popup-overlay.opentransitionend", options.opentransitionend)
                if (typeof options.closetransitionend == 'function')
                    $el.on("jquery-popup-overlay.closetransitionend", options.closetransitionend)
            },

            /**
             * Show method
             *
             * @param {object} el - popup instance DOM node
             * @param {number} ordinal - order number of an `open` element
             */
            show: function (el, ordinal) {
                var $el = $(el);

                if ($el.data('popup-visible')) return;

                // Initialize if not initialized. Required for: $('#popup').popup('show')
                if (!$el.data('popup-initialized')) {
                    methods._init(el);
                }
                $el.attr('data-popup-initialized', 'true');

                var $body = $('body');
                var options = $el.data('popupoptions');
                var $wrapper = $('#' + el.id + '_wrapper');
                var $background = $('#' + el.id + '_background');

                // `beforeopen` callback event
                callback(el, ordinal, "beforeopen");

                // Remember last clicked place
                lastclicked[el.id] = ordinal;

                if (options.detach) {
                    $wrapper.prepend(el);
                    $el.show();
                } else {
                    $wrapper.show();
                }

                $wrapper.css({
                    visibility: 'visible',
                    opacity: 1
                });

                $('html').addClass('popup_visible').addClass('popup_visible_' + el.id);
                $el.addClass('popup_content_visible');


                $el.css({
                    'visibility': 'visible',
                    'opacity': 1
                });

                // Disable background layer scrolling when popup is opened
                if (options.scrolllock) {
                    $body.css('overflow', 'hidden');
                    if ($body.height() > $window.height()) {
                        $body.css('margin-right', bodymarginright + scrollbarwidth);
                    }

                    visibleScrollLocks++;
                }

                // Set event handlers
                if (!onevisible) {
                    if (options.keepfocus) {
                        $(document).on('focusin', focushandler)
                    }
                    ;

                    if (options.blur) {
                        $(document).on('click', blurhandler);
                    }

                    if (options.escape) {
                        $(document).on('keydown', escapehandler);
                    }
                }

                // Set plugin state
                if (!onevisible) {
                    onevisible = true;
                } else {
                    oneormorevisible = true;
                }

                $el.data('popup-visible', true);

                // Position popup
                methods.reposition(el, ordinal);

                // Show background
                if (options.background) {
                    $background.css({
                        'visibility': 'visible',
                        'opacity': options.opacity
                    });

                    $background.css({
                        'opacity': options.opacity
                    });
                }

                // Remember which element had focus before opening a popup
                try {
    	            focusedelementbeforepopup = document.activeElement;
                }
            	catch (e) {
               	    focusedelementbeforepopup = document.body;
		}

                // Handler: Keep focus inside dialog box
                if (options.keepfocus) {

                    // Make holder div focusable
                    $el.attr('tabindex', -1);

                    // Focus popup or user specified element.
                    if (options.focuselement) {
                        $(options.focuselement).focus();
                    } else {
                        $el.focus();
                    }

                    // Handler for keyboard focus
                    focushandler = function(event) {
                        var dialog = document.getElementById(el.id);
                        if (!dialog.contains(event.target)) {
                            event.stopPropagation();
                            dialog.focus();
                        }
                    };
                }

                // Calculating maximum z-index
                if (options.autozindex) {

                    var elements = document.getElementsByTagName('*');
                    var len = elements.length;
                    var maxzindex = 0;

                    for(var i=0; i<len; i++){

                        var elementzindex = $(elements[i]).css('z-index');

                        if(elementzindex !== 'auto'){

                            elementzindex = parseInt(elementzindex);

                            if(maxzindex < elementzindex){
                                maxzindex = elementzindex;
                            }
                        }
                    }

                    zindexvalues[el.id] = maxzindex;

                    // Add z-index to the wrapper
                    if (zindexvalues[el.id] > 0) {
                        $wrapper.css({
                            zIndex: (zindexvalues[el.id] + 2)
                        });
                    }

                    // Add z-index to the background
                    if (options.background) {
                        if (zindexvalues[el.id] > 0) {
                            $('#' + el.id + '_background').css({
                                zIndex: (zindexvalues[el.id] + 1)
                            });
                        }
                    }
                }

                // Handler: Hide popup if clicked outside of it
                if (options.blur) {
                    blurhandler = function (e) {
                        if (!$(e.target).parents().andSelf().is('#' + el.id)) {
                            methods.hide(el);
                        }
                    };
                }

                // Handler: Close popup on ESC key
                if (options.escape) {
                    escapehandler = function (e) {
                        if (e.keyCode == 27 && $el.data('popup-visible')) {
                            methods.hide(el);
                        }
                    };
                }

                // Hide main content from screen readers
                $(options.pagecontainer).attr('aria-hidden', true);

                // Reveal popup content to screen readers
                $el.attr('aria-hidden', false);

                $wrapper.one('transitionend', function() {
                    callback(el, ordinal, "opentransitionend");
                });

                callback(el, ordinal, "onopen");
            },

            /**
             * Hide method
             *
             * @param {object} el - popup instance DOM node
             */
            hide: function (el) {
                //debugger;
                var $body = $('body');
                var $el = $(el);
                var options = $el.data('popupoptions');
                var $wrapper = $('#' + el.id + '_wrapper');
                var $background = $('#' + el.id + '_background');

                $el.data('popup-visible', false);

                if (oneormorevisible) {
                    $('html').removeClass('popup_visible_' + el.id);
                    oneormorevisible = false;
                } else {
                    $('html').removeClass('popup_visible').removeClass('popup_visible_' + el.id);
                    onevisible = false;
                }

                $el.removeClass('popup_content_visible');

                // Re-enable scrolling of background layer
                if (options.scrolllock && --visibleScrollLocks <= 0) {

                    $body.css({
                        overflow: 'visible',
                        'margin-right': bodymarginright
                    });
                }

                // Unbind blur handler
                if (options.blur) {
                    $(document).off('click', blurhandler);
                }

                if (options.keepfocus) {

                    // Unbind focus handler
                    $(document).off('focusin', focushandler);

                    // Focus back on saved element
                    if ($(focusedelementbeforepopup).is(':visible')) {
                        focusedelementbeforepopup.focus();
                    }
                }

                // Unbind ESC key handler
                if (options.escape) {
                    $(document).off('keydown', escapehandler);
                }

                // Hide popup
                $wrapper.css({
                    'visibility': 'hidden',
                    'opacity': 0
                });
                $el.css({
                    'visibility': 'hidden',
                    'opacity': 0
                });

                // Hide background
                if (options.background) {
                    $background.css({
                        'visibility': 'hidden',
                        'opacity': 0
                    });

                    // After background closing CSS transition is over... (if transition is set and supported)
                    $background.one('transitionend', function(e) {
                        if (!options.notransitiondetach) {
                            callback(el, lastclicked[el.id], "backgroundclosetransitionend");
                        }
                    });
                }

                // After closing CSS transition is over... (if transition is set and supported)
                $el.one('transitionend', function(e) {

                    if (!($el.data('popup-visible'))) {
                        if (options.detach) {
                            $el.hide().detach();
                        } else {
                            $wrapper.hide();
                        }
                    }

                    if (!options.notransitiondetach) {
                        callback(el, lastclicked[el.id], "closetransitionend");
                    }
                });

                if (options.notransitiondetach) {
                    if (options.detach) {
                        $el.hide().detach();
                    } else {
                        $wrapper.hide();
                    }
                }

                // Reveal main content to screen readers
                $(options.pagecontainer).attr('aria-hidden', false);

                // Hide popup content from screen readers
                $el.attr('aria-hidden', true);

                if(!options.transitions)
                    callback(el, lastclicked[el.id], "closetransitionend");

                // `onclose` callback event
                callback(el, lastclicked[el.id], "onclose");
            },

            /**
             * Toggle method
             *
             * @param {object} el - popup instance DOM node
             * @param {number} ordinal - order number of an `open` element
             */
            toggle: function (el, ordinal) {
                if ($el.data('popup-visible')) {
                    methods.hide(el);
                } else {
                    methods.show(el, ordinal);
                }
            },

            /**
             * Reposition method
             *
             * @param {object} el - popup instance DOM node
             * @param {number} ordinal - order number of an `open` element
             */
            reposition: function (el, ordinal) {
                var $el = $(el);
                var options = $el.data('popupoptions');
                var $wrapper = $('#' + el.id + '_wrapper');
                var $background = $('#' + el.id + '_background');

                ordinal = ordinal || 0;

                // Tooltip type
                if (options.type == 'tooltip') {
                    $wrapper.css({
                        'position': 'absolute'
                    });
                    var openelement =  (options.openelement) ? options.openelement : ('.' + el.id + opensuffix);
                    var $elementclicked = $(openelement + '[data-popup-ordinal="' + ordinal + '"]');
                    var linkOffset = $elementclicked.offset();

                    // Horizontal position for tooltip
                    if (options.horizontal == 'right') {
                        $wrapper.css('left', linkOffset.left + $elementclicked.outerWidth() + options.offsetleft);
                    } else if (options.horizontal == 'leftedge') {
                        $wrapper.css('left', linkOffset.left + $elementclicked.outerWidth() - $elementclicked.outerWidth() +  options.offsetleft);
                    } else if (options.horizontal == 'left') {
                        $wrapper.css('right', $(window).width() - linkOffset.left  - options.offsetleft);
                    } else if (options.horizontal == 'rightedge') {
                        $wrapper.css('right', $(window).width()  - linkOffset.left - $elementclicked.outerWidth() - options.offsetleft);
                    } else {
                        $wrapper.css('left', linkOffset.left + ($elementclicked.outerWidth() / 2) - ($el.outerWidth() / 2) - parseFloat($el.css('marginLeft')) + options.offsetleft);
                    }

                    // Vertical position for tooltip
                    if (options.vertical == 'bottom') {
                        $wrapper.css('top', linkOffset.top + $elementclicked.outerHeight() + options.offsettop);
                    } else if (options.vertical == 'bottomedge') {
                        $wrapper.css('top', linkOffset.top + $elementclicked.outerHeight() - $el.outerHeight() + options.offsettop);
                    } else if (options.vertical == 'top') {
                        $wrapper.css('bottom', $(window).height() - linkOffset.top - options.offsettop);
                    } else if (options.vertical == 'topedge') {
                        $wrapper.css('bottom', $(window).height() - linkOffset.top - $el.outerHeight() - options.offsettop);
                    } else {
                        $wrapper.css('top', linkOffset.top + ($elementclicked.outerHeight() / 2) - ($el.outerHeight() / 2) - parseFloat($el.css('marginTop')) + options.offsettop);
                    }

                    // Overlay type
                } else if (options.type == 'overlay') {

                    // Horizontal position for overlay
                    if (options.horizontal) {
                        $wrapper.css('text-align', options.horizontal);
                    } else {
                        $wrapper.css('text-align', 'center');
                    }

                    // Vertical position for overlay
                    if (options.vertical) {
                        $el.css('vertical-align', options.vertical);
                    } else {
                        $el.css('vertical-align', 'middle');
                    }
                }
            }

        };

        /**
         * Callback event calls
         *
         * @param {object} el - popup instance DOM node
         * @param {number} ordinal - order number of an `open` element
         * @param {string} event - event name
         */
        var callback = function (el, ordinal, event) {
            var openelement =  (options.openelement) ? options.openelement : ('.' + el.id + opensuffix);
            var elementclicked = $(openelement + '[data-popup-ordinal="' + ordinal + '"]');
            $(el).trigger("jquery-popup-overlay." + event, [elementclicked]);
        };

        /**
         * Plugin API
         */
        $.fn.popup = function (customoptions) {
            return this.each(function () {

                $el = $(this);

                if (typeof customoptions === 'object') {  // e.g. $('#popup').popup({'color':'blue'})
                    var opt = $.extend({}, $.fn.popup.defaults, customoptions);
                    $el.data('popupoptions', opt);
                    options = $el.data('popupoptions');

                    methods._init(this);

                } else if (typeof customoptions === 'string') { // e.g. $('#popup').popup('hide')
                    if (!($el.data('popupoptions'))) {
                        $el.data('popupoptions', $.fn.popup.defaults);
                        options = $el.data('popupoptions');
                    }

                    methods[customoptions].call(this, this);

                } else { // e.g. $('#popup').popup()
                    if (!($el.data('popupoptions'))) {
                        $el.data('popupoptions', $.fn.popup.defaults);
                        options = $el.data('popupoptions');
                    }

                    methods._init(this);

                }

            });
        };

        $.fn.popup.defaults = {
            type: 'overlay',
            autoopen: false,
            background: true,
            color: 'black',
            opacity: '0.5',
            horizontal: 'center',
            vertical: 'middle',
            offsettop: 0,
            offsetleft: 0,
            escape: true,
            blur: true,
            setzindex: true,
            autozindex: false,
            scrolllock: false,
            keepfocus: true,
            focuselement: null,
            focusdelay: 50,
            outline: false,
            pagecontainer: null,
            detach: false,
            openelement: null,
            closeelement: null,
            transition: null,
            notransitiondetach: false,
            beforeopen: function(){},
            onclose: function(){},
            onopen: function(){},
            opentransitionend: function(){},
            closetransitionend: function(){},
            transitions: true
        };

    })(jQuery);
