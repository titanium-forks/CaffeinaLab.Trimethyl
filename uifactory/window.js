/**
 * @class  	UIFactory.Window
 * @author  Flavio De Stefano <flavio.destefano@caffeinalab.com>
 *
 * ### New creation properties
 *
 * #### `displayHomeAsUp` (Boolean, default: `false`, OS_ANDROID)
 *
 * Set the property `displayHomeAsUp` and the relative close listener.
 *
 * #### `backButtonDisabled` (Boolean, default: `false`, OS_ANDROID)
 *
 * Disable the back button (do nothing on click)
 *
 */

module.exports = function(args) {
	args = args || {};
	var $this = Ti.UI.createWindow(args);

	$this.opened = false;
	var onOpenFuncs = [];
	function onOpen(callback) {
		if ($this.opened === true) {
			callback();
			return;
		}
		onOpenFuncs.push(callback);
	}

	$this.addEventListener('open', function() {
		$this.opened = true;
		_.each(onOpenFuncs, function(openFunc){
			openFunc();
		});
	});


	/**
	 * @method setDeferredBackgroundImage
	 * When large images are requested,
	 * it's useful to set `deferredBackgroundImage`
	 * to set the background on window open.
	 * @param {String} val
	 */
	$this.setDeferredBackgroundImage = function(val) {
		onOpen(function() {
			$this.backgroundImage = val;
		});
	};


	var bgCoverUI = null;
	var bgCoverUISview = null;

	/**
	 * @method setBackgroundCoverImage
	 * Titanium doesn't have `backgroundSize: cover` property.
	 * This is a workaround to make it work it!
	 * @param {String} val
	 */
	$this.setBackgroundCoverImage = function(val){
		var SCREEN_WIDTH = require('T/device').getScreenWidth();
		var SCREEN_HEIGHT = require('T/device').getScreenHeight();
		var SCREEN_RATIO = SCREEN_WIDTH / SCREEN_HEIGHT;

		if (bgCoverUI === null) {
			bgCoverUI = Ti.UI.createImageView();

			// Wait for postlayout to determine where to stretch
			bgCoverUI.addEventListener('postlayout', function(){
				if (bgCoverUI.postlayouted === true) return;
				bgCoverUI.postlayouted = true;

				var R = bgCoverUI.size.width / bgCoverUI.size.height;
				bgCoverUI.applyProperties(
					SCREEN_RATIO>R ?
					{ width: SCREEN_WIDTH, height: Ti.UI.SIZE } :
					{ width: Ti.UI.SIZE, height: SCREEN_HEIGHT }
				);
			});

			bgCoverUISview = Ti.UI.createScrollView({
				touchEnabled: false,
				width: SCREEN_WIDTH,
				height: SCREEN_HEIGHT,
				zIndex: -1
			});
			bgCoverUISview.add(bgCoverUI);

			$this.add(bgCoverUISview);
		}

		bgCoverUI.postlayouted = false;
 		bgCoverUI.setImage(val);
	};

	if (OS_ANDROID) {

		/**
		 * @method setActivityProperties
		 * **Android**
		 *
		 * Set the properties for the Activity
		 * @param {Object} props
		 */
		$this.setActivityProperties = function(props) {
			_.each(props, function(v, k) {
				$this.activity[k] = v;
			});
		};

		/**
		 * @method setActionBarProperties
		 * **Android**
		 *
		 * Set the properties for the ActionBar
		 * @param {Object}   props
		 * @param {Function} callback
		 */
		$this.setActionBarProperties = function(props, callback) {
			onOpen(function(){
				if ($this.activity.actionBar == null) return;

				_.each(props, function(v, k) {
					$this.activity.actionBar[k] = v;
				});
				if (_.isFunction(callback)) callback($this.activity.actionBar);
			});
		};


		var activityButtons = [];

		$this.setActivityProperties({
			onCreateOptionsMenu: function(e) {
				_.each(activityButtons, function(btn) {
					var menuItem = e.menu.add({
						title: btn.title || '',
						icon: btn.icon || btn.image || '',
						showAsAction: btn.showAsAction || Ti.Android.SHOW_AS_ACTION_ALWAYS
					});
					menuItem.addEventListener('click', function(){
						if (_.isFunction(btn.click)) btn.click();
						if (_.isFunction(btn.fireEvent)) btn.fireEvent('click');
					});
				});
			}
		}, function(act) {
			if (_.isFunction(act.invalidateOptionsMenu)) act.invalidateOptionsMenu();
		});


		/**
		 * @method addActivityButton
		 * **Android specific**
		 *
		 * @param {Object} opt
		 */
		$this.addActivityButton = function(opt) {
			while (opt.children && opt.children[0]) opt = opt.children[0]; // hack for Alloy, just ignore it
			activityButtons.push(opt);
		};

		/**
		 * @method setActivityButton
		 * **Android specific**
		 *
		 * @param {Object} opt
		 */
		$this.setActivityButton = function(opt) {
			activityButtons = [];
			$this.addActivityButton(opt);
		};

 		/**
 		 * @method setRightNavButton
 		 * @inheritDoc #setActivityButton
 		 * Alias for {@link #setActivityButton}
 		 */
		$this.setRightNavButton = $this.setActivityButton;


		$this._processTitles = function () {
			var bar = {};
			if ($this.subtitle != null) {
				bar = { title: $this.title, subtitle: $this.subtitle };
			} else {
				bar = { title: Ti.App.name, subtitle: $this.title || '' };
			}
			$this.setActionBarProperties(bar);
		};

		/**
		 * @method setTitle
		 * **Android fix**
		 *
		 * @param {String} value
		 */
		$this.setTitle = function(value) {
			$this.title = value;
			$this._processTitles();
		};

		/**
		 * @method setSubtitle
		 * **Android fix**
		 *
		 * @param {String} value
		 */
		$this.setSubtitle = function(value) {
			$this.subtitle = value;
			$this._processTitles();
		};

	}


	// ==================================
	// PARSE ARGUMENTS AND INITIALIZATION
	// ==================================

	if (args.deferredBackgroundImage != null) $this.setDeferredBackgroundImage(args.deferredBackgroundImage);
	if (args.backgroundCoverImage != null) $this.setBackgroundCoverImage(args.backgroundCoverImage);

	if (OS_ANDROID) {

		// Creation properties

		$this._processTitles();

		if (args.displayHomeAsUp === true) {
			$this.setActionBarProperties({
				displayHomeAsUp: true,
				onHomeIconItemSelected: function() {
					$this.close();
				}
			});
		}

		if (args.backButtonDisabled === true) {
			$this.addEventListener('androidback', function() {
				return false;
			});
		}

		// Parse

		if (args.activityProperties != null) $this.setActivityProperties(args.activityProperties);
		if (args.actionBarProperties != null) $this.setActionBarProperties(args.actionBarProperties);
		if (args.rightNavButton != null) $this.setRightNavButton(args.rightNavButton);
		if (args.activityButtons != null) _.each(args.activityButtons, function(val) { $this.addActivityButton(val); });
		if (args.activityButton != null) $this.setActivityButton(args.activityButton);

	}

	return $this;
};