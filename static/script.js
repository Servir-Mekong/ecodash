/**
 * @fileoverview Runs the Surface Water Tool application. The code is executed in the
 * user's browser. It communicates with the App Engine backend, renders output
 * to the screen, and handles user interactions.
 */

// Set the namespace
water = {};

// Starts the Surface Water Tool application. The main entry point for the app.
water.boot = function(eeMapId, eeToken) {

	// create the app
	var app = new water.App(eeMapId, eeToken);

	// save app to instance
	water.instance = app;
};

// ---------------------------------------------------------------------------------- //
// The application
// ---------------------------------------------------------------------------------- //

// The main Surface Water Tool application with default settings
water.App = function(eeMapId, eeToken) {
  // Create and display the map.
  this.map = water.App.createMap();

  // The drawing manager, for drawing on the Google Map.
  this.controlRegionDrawingManager = water.App.createDrawingManager(this.map, 'controlRegion');
  this.interventionRegionDrawingManager = water.App.createDrawingManager(this.map, 'interventionRegion');

  // The currently active layer
  //(used to prevent reloading when requested layer is the same).
  this.currentLayer = {};
	this.aoiParams = {};
	this.waterParams = {};

   // Initialize the UI components.
  this.initDatePickers();
  this.initControlRegionPicker();
	this.initInterventionRegionPicker();
  this.toggleBoxes();
  this.opacitySliders();
  this.climatologySlider();
  this.initExport();
	this.initPlot();
	this.updateMap();

  // Close the Modal
  $('span.modal-close').click(function () {
    closeModal();
  });

  // Load the basic background maps.
  this.loadBasicMaps(eeMapId, eeToken);

   // Load the default image.
  //this.refreshImage();
};

/**
 * Creates a Google Map for the given map type rendered.
 * The map is anchored to the DOM element with the CSS class 'map'.
 * @return {google.maps.Map} A map instance with the map type rendered.
 */
water.App.createMap = function() {
  var mapOptions = {
    center: water.App.DEFAULT_CENTER,
    zoom: water.App.DEFAULT_ZOOM,
	maxZoom: water.App.MAX_ZOOM,
	//disableDefaultUI: true,
	streetViewControl: false,
	mapTypeControl: true,
	mapTypeControlOptions: {position: google.maps.ControlPosition.RIGHT_BOTTOM}
  };
  var mapEl = $('.map').get(0);
  var map = new google.maps.Map(mapEl, mapOptions);
  return map;
};


/**
 * Generates a Google Maps map type (or layer) for the passed-in EE map id. See:
 * https://developers.google.com/maps/documentation/javascript/maptypes#ImageMapTypes
 * @param {string} eeMapId The Earth Engine map ID.
 * @param {string} eeToken The Earth Engine map token.
 * @return {google.maps.ImageMapType} A Google Maps ImageMapType object for the
 *     EE map with the given ID and token.
 */
var getEeMapType = function(eeMapId, eeToken) {
  var eeMapOptions = {
    getTileUrl: function(tile, zoom) {
      var url = EE_URL + '/map/';
      url += [eeMapId, zoom, tile.x, tile.y].join('/');
      url += '?token=' + eeToken;
      return url;
    },
    tileSize: new google.maps.Size(256, 256),
    name: 'ecomap',
	opacity: 1.0
  };
  return new google.maps.ImageMapType(eeMapOptions);
};


// Load basic maps upon loading the main web page
water.App.prototype.loadBasicMaps = function(eeMapId, eeToken) {
	var mapType = getEeMapType(eeMapId, eeToken);
	console.log(eeMapId)
	this.map.overlayMapTypes.push(mapType);
}

// Push map with mapId and token obtained from EE Python
water.App.prototype.showBasicMap = function(eeMapId, eeToken, name, index) {
  this.showLoadingAlert(name);
  //var mapType = water.App.getEeMapType(eeMapId, eeToken, name);  // obsolete, using ee.MapLayerOverlay instead
  var mapType = new ee.MapLayerOverlay(water.App.EE_URL + '/map', eeMapId, eeToken, {name: name});
  //this.map.overlayMapTypes.push(mapType);        // old, just push to array, will always show latest layer on top
	this.map.overlayMapTypes.setAt(index, mapType);  // new, use index to keep correct zIndex when adding/removing layers
  // handle layer loading alerts
  mapType.addTileCallback((function(event) {
    if (event.count === 0) {
      this.removeLoadingAlert(name);
    } else {
	  this.showLoadingAlert(name);
	}
  }).bind(this));
};

// ---------------------------------------------------------------------------------- //
// Date picker
// ---------------------------------------------------------------------------------- //

// Initializes the date pickers.
water.App.prototype.initDatePickers = function() {
  // Create the date pickers.
  $('.date-picker-1').datepicker({
    format: 'yyyy-mm-dd',
    viewMode: 'days',
    minViewMode: 'days',
    autoclose: true,
    startDate: new Date('1988-01-01'),
    endDate: new Date()
  });
  $('.date-picker-2').datepicker({
    format: 'yyyy-mm-dd',
    viewMode: 'days',
    minViewMode: 'days',
    autoclose: true,
    startDate: new Date('1988-01-01'),
    endDate: new Date()
  });
	$('.date-picker-3').datepicker({
		format: 'yyyy-mm-dd',
		viewMode: 'days',
		minViewMode: 'days',
		autoclose: true,
		startDate: new Date('1988-01-01'),
		endDate: new Date()
	});
	$('.date-picker-4').datepicker({
		format: 'yyyy-mm-dd',
		viewMode: 'days',
		minViewMode: 'days',
		autoclose: true,
		startDate: new Date('1988-01-01'),
		endDate: new Date()
	});

  // Set default dates.
  $('.date-picker-1').datepicker('update', '2005-01-01');
  $('.date-picker-2').datepicker('update', '2010-12-31');
	$('.date-picker-3').datepicker('update', '2011-01-01');
	$('.date-picker-4').datepicker('update', '2015-12-31');

  // Respond when the user updates the dates.
  //$('.date-picker').on('changeDate', this.refreshImage.bind(this));

  // Respond when the user clicks the 'submit' button.
  //$('.submit').on('click', this.refreshImage.bind(this));
};


/**
 * Returns the currently selected time period as a parameter.
 * @return {Object} The current time period in a dictionary.
 */
water.App.prototype.getTimeParams = function() {
  return {time_start: $('.date-picker').val(), time_end: $('.date-picker-2').val()};
};

// ---------------------------------------------------------------------------------- //
// Expert controls input
// ---------------------------------------------------------------------------------- //

water.App.prototype.getExpertParams = function() {
  return {
    climatology: $(".climatology-input").is(':checked'),
	month_index: parseInt($("#monthsControl").val()),
	defringe: $(".defringe-input").is(':checked'),
	pcnt_perm: parseFloat($('.percentile-input-perm').val()),
	pcnt_temp: parseFloat($('.percentile-input-temp').val()),
	water_thresh: parseFloat($('.water-threshold-input').val()),
	veg_thresh: parseFloat($('.veg-threshold-input').val()),
	hand_thresh: parseFloat($('.hand-threshold-input').val()),
	cloud_thresh: parseInt($('.cloud-threshold-input').val())
  };
};

// ---------------------------------------------------------------------------------- //
// Climatology slider
// ---------------------------------------------------------------------------------- //

water.App.prototype.climatologySlider = function() {
  $("#monthsControl").on("slideStop", this.refreshImage.bind(this));
}

// ---------------------------------------------------------------------------------- //
// Layer management
// ---------------------------------------------------------------------------------- //

// Get all relevant info for new layer
water.App.prototype.getAllParams = function() {
  var timeParams   = this.getTimeParams();
  var expertParams = this.getExpertParams();
  return $.extend(timeParams, expertParams);
};

// Updates the image based on the current control panel config.
water.App.prototype.refreshImage = function() {

  var name = 'water';
  //var name1 = 'water_temporary';
  //var name2 = 'water_permanent';

  // obtain params
  var params = this.getAllParams();

  // check if map is already active (if so, return early)
  // or if time period is too short (if so, return early and give warning)
  // or, otherwise, update the map
  if (this.currentLayer['time_start'] === params['time_start'] &&
	  this.currentLayer['time_end'] === params['time_end'] &&
	  this.currentLayer['climatology'] === params['climatology'] &&
	  this.currentLayer['month_index'] === params['month_index'] &&
	  this.currentLayer['defringe'] === params['defringe'] &&
	  this.currentLayer['pcnt_perm'] === params['pcnt_perm'] &&
	  this.currentLayer['pcnt_temp'] === params['pcnt_temp'] &&
	  this.currentLayer['water_thresh'] === params['water_thresh'] &&
	  this.currentLayer['veg_thresh'] === params['veg_thresh'] &&
	  this.currentLayer['hand_thresh'] === params['hand_thresh'] &&
	  this.currentLayer['cloud_thresh'] === params['cloud_thresh']) {
	$('.warnings span').text('')
	$('.warnings').hide();
    return;
  } else if (params['climatology'] == true && this.numberOfDays(params['time_start'], params['time_end']) < water.App.MINIMUM_TIME_PERIOD_CLIMATOLOGY) {
	$('.warnings span').text('Warning! Time period for climatology is too short! Make sure it is at least 3 years (1095 days)!')
	$('.warnings').show();
    return;
  } else if (this.numberOfDays(params['time_start'], params['time_end']) < water.App.MINIMUM_TIME_PERIOD_REGULAR) {
	$('.warnings span').text('Warning! Time period is too short! Make sure it is at least 90 days!')
	$('.warnings').show();
    return;
  } else {

    //remove warnings
	$('.warnings span').text('')
	$('.warnings').hide();

    // remove map layers
	this.removeLayer(name);
	//this.removeLayer(name1);
	//this.removeLayer(name2);

	// add climatology slider if required
	if (params['climatology'] == true) {
	  $("#monthsControlSlider").show();
	} else {
	  $("#monthsControlSlider").hide();
	};

	// update current layer check
	this.currentLayer = params;
  }
};

// Push map with mapId and token obtained from EE Python
water.App.prototype.setWaterMap = function(eeMapId, eeToken, name, index) {
  this.showLoadingAlert(name);
  // obtain new layer
  //var mapType = water.App.getEeMapType(eeMapId, eeToken, name);  // obsolete, using ee.MapLayerOverlay instead
  var mapType = new ee.MapLayerOverlay(water.App.EE_URL + '/map', eeMapId, eeToken, {name: name});
  // remove old layer
  this.removeLayer(name);
  // add new layer
  //this.map.overlayMapTypes.push(mapType);        // old, just push to array, will always show latest layer on top
	this.map.overlayMapTypes.setAt(index, mapType);  // new, use index to keep correct zIndex when adding/removing layers
  // handle layer loading alerts
  mapType.addTileCallback((function(event) {
    if (event.count === 0) {
      this.removeLoadingAlert(name);
    } else {
	  this.showLoadingAlert(name);
	}
  }).bind(this));
};

/**
 * Removes the map layer(s) with the given name.
 * @param {string} name The name of the layer(s) to remove.
 */
water.App.prototype.removeLayer = function(name) {
  this.map.overlayMapTypes.forEach((function(mapType, index) {
    if (mapType && mapType.name == name) {
      //this.map.overlayMapTypes.removeAt(index);   // old, hard removal
			this.map.overlayMapTypes.setAt(index, null);  // new, instead set null at the same index (to keep length of array intact, used for adding/removing layers and keep their zIndex intact)
    }
  }).bind(this));
};

/**
 * Changes the opacity of the map layer(s) with the given name.
 * @param {string} name The name of the layer(s) for which to change opacity.
 * @param {float} value The value to use for opacity of the layer(s).
 */
water.App.prototype.setLayerOpacity = function(name, value) {
  this.map.overlayMapTypes.forEach((function(mapType, index) {
    if (mapType && mapType.name == name) {
			var overlay = this.map.overlayMapTypes.getAt(index);
      overlay.setOpacity(value);
    }
  }).bind(this));
};

/**
 * Toggles map layer(s) on/off.
 * @param {string} name The name of the layer(s) to toggle on/off.
 * @param {boolean} toggle Whether to toggle the layer(s) on (true) or off (false).
 */
 water.App.prototype.toggleLayer = function(name, toggle) {
	if (toggle) {
		//console.log('layer should be toggled on now!');
		if (name == 'water') {
			this.setWaterMap(this.waterParams.mapId, this.waterParams.token, 'water', 2);
		} else if (name == 'AoI_fill') {
			this.showBasicMap(this.aoiParams.mapId, this.aoiParams.token, 'AoI_fill', 0);
			water.instance.setLayerOpacity('AoI_fill', parseFloat($("#aoiControl").val()));
		}
	} else {
		//console.log('layer should be toggled off now!');
		this.removeLayer(name);
	}
}

// ---------------------------------------------------------------------------------- //
// Layer toggle control
// ---------------------------------------------------------------------------------- //

water.App.prototype.toggleBoxes = function() {
	$('#checkbox-aoi').on("change", function() {
		water.instance.toggleLayer('AoI_fill', this.checked);
	});
	$('#checkbox-water').on("change", function() {
		water.instance.toggleLayer('water', this.checked);
	});
}

// ---------------------------------------------------------------------------------- //
// Layer opacity control
// ---------------------------------------------------------------------------------- //

water.App.prototype.opacitySliders = function() {
  $("#aoiControl").on("slide", function(slideEvt) {
		water.instance.setLayerOpacity('AoI_fill', slideEvt.value);
  });
  $("#aoiControl").on("slideStop", function(slideEvt) {
		water.instance.setLayerOpacity('AoI_fill', slideEvt.value);
  });
  // in case of split up permanent and temporary water layers:
  /*
  $("#waterPermControl").on("slide", function(slideEvt) {
		water.instance.setLayerOpacity('water_permanent', slideEvt.value);
  });
  $("#waterPermControl").on("slideStop", function(slideEvt) {
		water.instance.setLayerOpacity('water_permanent', slideEvt.value);
  });
  $("#waterTempControl").on("slide", function(slideEvt) {
		water.instance.setLayerOpacity('water_temporary', slideEvt.value);
  });
  $("#waterTempControl").on("slideStop", function(slideEvt) {
		water.instance.setLayerOpacity('water_temporary', slideEvt.value);
  });
  */
  // in case of merged permanent and temporary water layers:
  $("#waterControl").on("slide", function(slideEvt) {
		water.instance.setLayerOpacity('water', slideEvt.value);
  });
  $("#waterControl").on("slideStop", function(slideEvt) {
		water.instance.setLayerOpacity('water', slideEvt.value);
  });
}

// ---------------------------------------------------------------------------------- //
// Alerts
// ---------------------------------------------------------------------------------- //

water.App.prototype.showLoadingAlert = function(name) {
  if (name == 'water') {
    $(".waterAlert").show();
  } else if (name == 'AoI_fill') {
    $(".aoiAlert").show();
  } else if (name == 'water_permanent') {
    $(".waterPermAlert").show();
  } else if (name == 'water_temporary') {
    $(".waterTempAlert").show();
  } else {
    return
  }
}

water.App.prototype.removeLoadingAlert = function(name) {
  if (name == 'water') {
    $(".waterAlert").hide();
  } else if (name == 'AoI_fill') {
    $(".aoiAlert").hide();
  } else if (name == 'water_permanent') {
    $(".waterPermAlert").hide();
  } else if (name == 'water_temporary') {
    $(".waterTempAlert").hide();
  } else {
    return
  }
}

// ---------------------------------------------------------------------------------- //
// Region selection
// ---------------------------------------------------------------------------------- //

// Initializes the region picker.
water.App.prototype.initControlRegionPicker = function() {

  // Hide the color box
  $('span#controlRegionColorBox').hide();

	// Respond when the user changes the selection
	$("input[name='control-selection-method']").change(polygonSelectionMethod);

	// initialize keydown storage variable
	var ctrl_key_is_down = false;
	// initialize number of selected polygons storage variable
	var nr_selected = 0;

	function polygonSelectionMethod() {
		// clear warnings
		$('.warnings span').text('');
		$('.warnings').hide();
		// reset Export button
		$('.export').attr('disabled', true);
		// reset keydown storage
		ctrl_key_is_down = false;
		// get the selected variable name
		var selection  = $("input[name='control-selection-method']:checked").val();
		// clear previously selected polygons
		for (var i=0; i<nr_selected; i++) {
			water.instance.removeLayer('selected_polygon');
		}
		// reset number of selected polygons
		nr_selected = 0;
		// reset clicked points
		water.instance.points = [];
		// carry out action based on selection
		if (selection == "Tiles"){
			// cancel drawing
			//$('.control-region .control-cancel').click();
			// clear existing overlays
			water.instance.removeLayer('adm_bounds');
			$('.control-region .control-clear').click();
			// show overlay on map
			water.App.prototype.loadTilesMap();
		} else if (selection == "Adm. bounds"){
			// cancel drawing
			//$('.control-region .control-cancel').click();
			// clear existing overlays
			water.instance.removeLayer('tiles');
			$('.control-region .control-clear').click();
      // Starts
      $('.control-region').toggleClass('drawing', false);
      water.instance.controlRegionDrawingManager.setOptions({drawingMode: null});
			// show overlay on map
			water.App.prototype.loadAdmBoundsMap();
		} else if (selection == "Draw polygon"){
			// clear existing overlays
			water.instance.removeLayer('adm_bounds');
			water.instance.removeLayer('tiles');
			// setup drawing
			$('.control-region .control-draw').click();
		}
	}

	this.map.addListener('click', function(event) {
		var selection = $("input[name='control-selection-method']:checked").val();
    var coords = event.latLng;
    var lat = coords.lat();
    var lng = coords.lng();
		if (selection == 'Tiles' || selection == 'Adm. bounds') {
			var params = {lat: lat, lng: lng,mode:'control'};
			var name = 'selected_control_polygon';
			if (ctrl_key_is_down) {
				// check if current selection doesn't exceed allowed maximum
				if (nr_selected < water.App.MAX_SELECTION) {
					nr_selected += 1;
				} else {
					return;
				}
			} else {
				for (var i=0; i<nr_selected; i++) {
					//water.instance.removeLayer(name);
				}
				nr_selected = 1;
				water.instance.points = [];
			}
		}
		if (selection == 'Tiles') {
			$.ajax({
				url: "/select_tile",
				data: params,
				dataType: "json",
				success: function (data) {
					water.instance.showMap(data.eeMapId, data.eeToken, name, 5);
					$('.export').attr('disabled', false);
					//water.instance.point = params;
					water.instance.points.push(params);
				},
				error: function (data) {
					console.log(data.responseText);
				}
			});
		} else if (selection == 'Adm. bounds') {
      this.overlayMapTypes.forEach(function (layer, index) {
        if (layer && layer.name === 'adm_bounds' && $('span#controlRegionColorBox').is(':hidden')) {
          $('.warnings span').text('');
          $('.warnings').hide();
          water.App.controlLat = lat;
          water.App.controlLon = lng;
          $.ajax({
            url: "/select_adm_bounds",
            data: params,
            dataType: "json",
            success: function (data) {
              water.instance.removeLayer('adm_bounds');
              water.instance.showMap(data.eeMapId, data.eeToken, name, 5);
              //console.log(data.size);
              if (data.size > water.App.AREA_LIMIT_2) {
                // $('.export').attr('disabled', true);
                $('.warnings span').text('The selected area is larger than ' + water.App.AREA_LIMIT_2 + ' km2. This exceeds the current limitations for downloading data. ' +
                                         'Please use one of the other region selection options to download data for this area.')
                $('.warnings').show();
              } else if (data.size > water.App.AREA_LIMIT_1) {
                // $('.export').attr('disabled', false);
                $('.warnings span').text('The selected area is larger than ' + water.App.AREA_LIMIT_1 + ' km2. This is near the current limitation for downloading data. '+
                                         'Please be warned that the download might result in a corrupted zip file. You can give it a try or use  one of the other region selection options to download data for this area.')
                $('.warnings').show();
              } else {
                // $('.export').attr('disabled', false);
              }
              //water.instance.point = params;
              water.instance.points.push(params);
              $('span#controlRegionColorBox').show();
              $('.intervention-region').show();
            },
            error: function (data) {
              console.log(data.responseText);
            }
          });
        }
      });
		}
	});

	// Respond when the user chooses to draw a polygon.
  $('.control-region .control-draw').click(this.setControlDrawingModeEnabled.bind(this, true));

  // Respond when the user draws a polygon on the map.
  google.maps.event.addListener(
      this.controlRegionDrawingManager, 'overlaycomplete',
      (function(event) {
        if (this.getControlDrawingModeEnabled()) {
          this.handleNewPolygon(event.overlay, 'controlRegion');
          $('span#controlRegionColorBox').show();
          $('.intervention-region').show();
					// this.controlAOI = event.overlay
          water.App.controlLat = null;
          water.App.controlLon = null;
        } else {
          event.overlay.setMap(null);
        }
      }).bind(this));

  // handle actions when user presses certain keys
  $(document).keydown((function(event) {
		// Cancel region selection and related items if the user presses escape.
    if (event.which == 27) {
			// remove drawing mode
			this.setControlDrawingModeEnabled(false);
			// remove region selection
			$("input[name='control-selection-method']:checked").attr('checked', false);
			// clear map overlays
			water.instance.removeLayer('adm_bounds');
			water.instance.removeLayer('tiles');
			for (var i=0; i<nr_selected; i++) {
				water.instance.removeLayer('selected_polygon');
			}
			// clear any existing download links
			$('#link1').removeAttr('href');
			$('#link2').removeAttr('href');
			$('#link3').removeAttr('href');
			$('#link4').removeAttr('href');
			$('#link_metadata').removeAttr('href');
			$('#link_metadata').removeAttr('download');
			// remove download link(s) message
			$('#link1').css('display', 'none');
			$('#link2').css('display', 'none');
			$('#link3').css('display', 'none');
			$('#link4').css('display', 'none');
			$('#link_metadata').css('display', 'none');
			// reset variables
			water.instance.points = [];
			nr_selected = 0;
			// disable export button
			$('.export').attr('disabled', true);
			// hide export panel
			$('.download_panel').css('display', 'none');
		}
		// Allow multiple selection if the user presses and holds down ctrl.  // WORK IN PROGRESS
		if (event.which == 17) {
			var selection = $("input[name='control-selection-method']:checked").val();
			if (selection == 'Tiles' || selection == 'Adm. bounds') {
				if (ctrl_key_is_down) {
					return;
				}
				ctrl_key_is_down = true;
			}
		}

  }).bind(this));
	// clear ctrl key event if key is released
	$(document).keyup((function(event) {
		if (event.which == 17) {
			ctrl_key_is_down = false;
		}
	}).bind(this));

  // Respond when the user cancels polygon drawing.
  //$('.region .cancel').click(this.setDrawingModeEnabled.bind(this, false));  // original function
	/*$('.control-region .control-cancel').click((function() {
		this.setControlDrawingModeEnabled(false);
		if ($("input[name='control-selection-method']:checked").val() == 'Draw polygon') {
			$("input[name='control-selection-method']:checked").attr('checked', false);
		}
	}).bind(this));*/

  // Respond when the user clears the polygon.
  //$('.region .clear').click(this.clearPolygon.bind(this));  // original function
	$('.control-region .control-clear').click((function() {
		// try to clear polygon (won't work if no polygon was drawn, try/catch to make it work)
		try {
			this.clearControlPolygon();
      $('span#controlRegionColorBox').hide();
      $('.intervention-region').hide();
		} catch(err) {
			console.log('Trying to remove a drawn polygon from map, but results in error:')
			console.log(err);
		}
		if ($("input[name='control-selection-method']:checked").val() == 'Draw polygon') {
			$("input[name='control-selection-method']:checked").attr('checked', false);
		}
		$('.warnings span').text('');
		$('.warnings').hide();
	}).bind(this));
};

// Initializes the region picker.
water.App.prototype.initInterventionRegionPicker = function() {

  // Hide the intervention Control Box
  $('.intervention-region').hide();

  // Hide the color box
  $('span#interventionRegionColorBox').hide();

	// Respond when the user changes the selection
	$("input[name='intervention-selection-method']").change(polygonSelectionMethod);

	// initialize keydown storage variable
	var ctrl_key_is_down = false;
	// initialize number of selected polygons storage variable
	var nr_selected = 0;

	function polygonSelectionMethod() {
		// clear warnings
		$('.warnings span').text('');
		$('.warnings').hide();
		// reset Export button
		$('.export').attr('disabled', true);
		// reset keydown storage
		ctrl_key_is_down = false;
		// get the selected variable name
		var selection  = $("input[name='intervention-selection-method']:checked").val();
		// clear previously selected polygons
		for (var i=0; i<nr_selected; i++) {
			water.instance.removeLayer('selected_polygon');
		}
		// reset number of selected polygons
		nr_selected = 0;
		// reset clicked points
		water.instance.points = [];
		// carry out action based on selection
		if (selection == "Tiles"){
			// cancel drawing
			//$('.intervention-region .intervention-cancel').click();
			// clear existing overlays
			water.instance.removeLayer('adm_bounds');
			$('.intervention-region .intervention-clear').click();
			// show overlay on map
			water.App.prototype.loadTilesMap();
		} else if (selection == "Adm. bounds"){
			// cancel drawing
			//$('.intervention-region .intervention-cancel').click();
			// clear existing overlays
			water.instance.removeLayer('tiles');
			$('.intervention-region .intervention-clear').click();
      // Starts
      $('.intervention-region').toggleClass('drawing', false);
      water.instance.interventionRegionDrawingManager.setOptions({drawingMode: null});
			// show overlay on map
			water.App.prototype.loadAdmBoundsMap();
      water.App.prototype.setInterventionDrawingModeEnabled(false);
		} else if (selection == "Draw polygon"){
			// clear existing overlays
			water.instance.removeLayer('adm_bounds');
			water.instance.removeLayer('tiles');
			// setup drawing
			$('.intervention-region .intervention-draw').click();
		}
	}

	this.map.addListener('click', function(event) {
		var selection = $("input[name='intervention-selection-method']:checked").val();
		var exportation = $("input[name='intervention-selection-method']:checked").val();

		if (exportation == 'control' || exportation == 'intervention') {
			$('.export').attr('disabled', false);
		}
    var coords = event.latLng;
    var lat = coords.lat();
    var lng = coords.lng();
		if (selection == 'Tiles' || selection == 'Adm. bounds') {
			var params = {lat: lat, lng: lng, mode:'intervention'};
			var name = 'selected_intervention_polygon';
			if (ctrl_key_is_down) {
				// check if current selection doesn't exceed allowed maximum
				if (nr_selected < water.App.MAX_SELECTION) {
					nr_selected += 1;
				} else {
					return;
				}
			} else {
				for (var i=0; i<nr_selected; i++) {
					//water.instance.removeLayer(name);
				}
				nr_selected = 1;
				water.instance.points = [];
			}
		}
		if (selection == 'Tiles') {
			$.ajax({
				url: "/select_tile",
				data: params,
				dataType: "json",
				success: function (data) {
					water.instance.showMap(data.eeMapId, data.eeToken, name, 4);
					// $('.export').attr('disabled', false);
					//water.instance.point = params;
					water.instance.points.push(params);
				},
				error: function (data) {
					console.log(data.responseText);
				}
			});
		} else if (selection == 'Adm. bounds') {
      this.overlayMapTypes.forEach(function (layer, index) {
        if (layer && layer.name === 'adm_bounds' && $('span#interventionRegionColorBox').is(':hidden')) {
    			$('.warnings span').text('');
    			$('.warnings').hide();
          water.App.interventionLat = lat;
          water.App.interventionLon = lng;
    			$.ajax({
    				url: "/select_adm_bounds",
    				data: params,
    				dataType: "json",
    				success: function (data) {
              water.instance.removeLayer('adm_bounds');
    					water.instance.showMap(data.eeMapId, data.eeToken, name, 4);
    					//console.log(data.size);
    					if (data.size > water.App.AREA_LIMIT_2) {
    						// $('.export').attr('disabled', true);
    						$('.warnings span').text('The selected area is larger than ' + water.App.AREA_LIMIT_2 + ' km2. This exceeds the current limitations for downloading data. ' +
    																		 'Please use one of the other region selection options to download data for this area.')
    						$('.warnings').show();
    					} else if (data.size > water.App.AREA_LIMIT_1) {
    						// $('.export').attr('disabled', false);
    						$('.warnings span').text('The selected area is larger than ' + water.App.AREA_LIMIT_1 + ' km2. This is near the current limitation for downloading data. '+
    																		 'Please be warned that the download might result in a corrupted zip file. You can give it a try or use  one of the other region selection options to download data for this area.')
    						$('.warnings').show();
    					} else {
    						// $('.export').attr('disabled', false);
    					}
    					//water.instance.point = params;
    					water.instance.points.push(params);
              $('span#interventionRegionColorBox').show();
    				},
    				error: function (data) {
    					console.log(data.responseText);
    				}
    			});
        }
      });
		}
	});

	// Respond when the user chooses to draw a polygon.
  $('.intervention-region .intervention-draw').click(this.setInterventionDrawingModeEnabled.bind(this, true));

  // Respond when the user draws a polygon on the map.
  google.maps.event.addListener(
      this.interventionRegionDrawingManager, 'overlaycomplete',
      (function(event) {
        if (this.getInterventionDrawingModeEnabled()) {
          this.handleNewPolygon(event.overlay, 'interventionRegion');
					//this.interventionAOI = event.overlay;
          $('span#interventionRegionColorBox').show();
          water.App.interventionLat = null;
          water.App.interventionLon = null;
        } else {
          event.overlay.setMap(null);
        }
      }).bind(this));

  // handle actions when user presses certain keys
  $(document).keydown((function(event) {
		// Cancel region selection and related items if the user presses escape.
    if (event.which == 27) {
			// remove drawing mode
			this.setInterventionDrawingModeEnabled(false);
			// remove region selection
			$("input[name='intervention-selection-method']:checked").attr('checked', false);
			// clear map overlays
			water.instance.removeLayer('adm_bounds');
			water.instance.removeLayer('tiles');
			for (var i=0; i<nr_selected; i++) {
				water.instance.removeLayer('selected_polygon');
			}
			// clear any existing download links
			$('#link1').removeAttr('href');
			$('#link2').removeAttr('href');
			$('#link3').removeAttr('href');
			$('#link4').removeAttr('href');
			$('#link_metadata').removeAttr('href');
			$('#link_metadata').removeAttr('download');
			// remove download link(s) message
			$('#link1').css('display', 'none');
			$('#link2').css('display', 'none');
			$('#link3').css('display', 'none');
			$('#link4').css('display', 'none');
			$('#link_metadata').css('display', 'none');
			// reset variables
			water.instance.points = [];
			nr_selected = 0;
			// disable export button
			$('.export').attr('disabled', true);
			// hide export panel
			$('.download_panel').css('display', 'none');
		}
		// Allow multiple selection if the user presses and holds down ctrl.  // WORK IN PROGRESS
		if (event.which == 17) {
			var selection = $("input[name='intervention-selection-method']:checked").val();
			if (selection == 'Tiles' || selection == 'Adm. bounds') {
				if (ctrl_key_is_down) {
					return;
				}
				ctrl_key_is_down = true;
			}
		}

  }).bind(this));
	// clear ctrl key event if key is released
	$(document).keyup((function(event) {
		if (event.which == 17) {
			ctrl_key_is_down = false;
		}
	}).bind(this));

  // Respond when the user cancels polygon drawing.
  //$('.region .cancel').click(this.setDrawingModeEnabled.bind(this, false));  // original function
	/*$('.intervention-region .intervention-cancel').click((function() {
		this.setInterventionDrawingModeEnabled(false);
		if ($("input[name='intervention-selection-method']:checked").val() == 'Draw polygon') {
			$("input[name='intervention-selection-method']:checked").attr('checked', false);
		}
	}).bind(this));*/

  // Respond when the user clears the polygon.
  //$('.region .clear').click(this.clearPolygon.bind(this));  // original function
	$('.intervention-region .intervention-clear').click((function() {
		// try to clear polygon (won't work if no polygon was drawn, try/catch to make it work)
		try {
			this.clearInterventionPolygon();
      $('span#interventionRegionColorBox').hide();
		} catch(err) {
			//console.log('Trying to remove a drawn polygon from map, but results in error:')
			//console.log(err);
		}
		if ($("input[name='intervention-selection-method']:checked").val() == 'Draw polygon') {
			$("input[name='intervention-selection-method']:checked").attr('checked', false);
		}
		$('.warnings span').text('');
		$('.warnings').hide();
	}).bind(this));
};



/**
 * Sets whether drawing on the map is enabled.
 * @param {boolean} enabled Whether drawing mode is enabled.
 */
water.App.prototype.setControlDrawingModeEnabled = function(enabled) {
  $('.control-region').toggleClass('drawing', enabled);
  var mode = enabled ? google.maps.drawing.OverlayType.POLYGON : null;
  if (this.controlRegionDrawingManager) {
    this.controlRegionDrawingManager.setOptions({drawingMode: mode});
  }
};

water.App.prototype.setInterventionDrawingModeEnabled = function(enabled) {
  $('.intervention-region').toggleClass('drawing', enabled);
  var mode = enabled ? google.maps.drawing.OverlayType.POLYGON : null;
  if (this.interventionRegionDrawingManager) {
    this.interventionRegionDrawingManager.setOptions({drawingMode: mode});
  }
};

/**
 * Sets whether drawing on the map is enabled.
 * @return {boolean} Whether drawing mode is enabled.
 */
water.App.prototype.getControlDrawingModeEnabled = function() {
  return $('.control-region').hasClass('drawing');
};

water.App.prototype.getInterventionDrawingModeEnabled = function() {
  return $('.intervention-region').hasClass('drawing');
};

// Clears the current polygon from the map and enables drawing.
water.App.prototype.clearControlPolygon = function() {
  if (this.controlRegionPolygon) {
    this.controlRegionPolygon.setMap(null);
  }
  water.instance.removeLayer('selected_control_polygon');
  //$('input#control-selection-method').each(function () { 
    //$(this).removeClass('selected');
  //  $(this).prop('checked', false);
  //});
  $('.control-region').removeClass('selected');
  $('.export').attr('disabled', true);
};

// Clears the current polygon from the map and enables drawing.
water.App.prototype.clearInterventionPolygon = function() {
  if (this.interventionRegionPolygon) {
    this.interventionRegionPolygon.setMap(null);
  }
  water.instance.removeLayer('selected_intervention_polygon');
  //$('input#intervention-selection-method').each(function () { 
  //  $(this).prop('checked', false);
  //});
  $('.intervention-region').removeClass('selected');
  $('.export').attr('disabled', true);
};

/**
 * Stores the current polygon drawn on the map and disables drawing.
 * @param {Object} opt_overlay The new polygon drawn on the map. If
 *     undefined, the default polygon is treated as the new polygon.
 */
water.App.prototype.handleNewPolygon = function(opt_overlay, type) {
	var drawn_polygon_size = google.maps.geometry.spherical.computeArea(opt_overlay.getPath()) / 1e6;
	//console.log(drawn_polygon_size);
	if (drawn_polygon_size > water.App.AREA_LIMIT_2) {
		$('.export').attr('disabled', true);
		$('.warnings span').text('The drawn polygon is larger than ' + water.App.AREA_LIMIT_2 + ' km2. This exceeds the current limitations for downloading data. ' +
														 'Please draw a smaller polygon or use one of the other region selection options to download data for this area.')
		$('.warnings').show();
	} else if (drawn_polygon_size > water.App.AREA_LIMIT_1) {
		$('.export').attr('disabled', false);
		$('.warnings span').text('The drawn polygon is larger than ' + water.App.AREA_LIMIT_1 + ' km2. This is near the current limitation for downloading data. ' +
														 'Please be warned that the download might result in a corrupted zip file. You can give it a try, or draw a smaller polygon, or ' +
														 'use  one of the other region selection options to download data for this area.')
		$('.warnings').show();
	} else {
		$('.export').attr('disabled', false);
	}
  this[type + 'Polygon'] = opt_overlay;
  //this.currentPolygon = opt_overlay;
  //$('.control-region').addClass('selected');
  if (type === 'controlRegion') {
    this.setControlDrawingModeEnabled(false);
  } else if (type === 'interventionRegion') {
    this.setInterventionDrawingModeEnabled(false);
  }
};

getDates = function() {
	var controlIni = $('.date-picker-1').datepicker({ dateFormat: 'yyyy-mm-dd' }).val()
	var controlEnd = $('.date-picker-2').datepicker({ dateFormat: 'yyyy-mm-dd' }).val()
	var interventionIni = $('.date-picker-3').datepicker({ dateFormat: 'yyyy-mm-dd' }).val()
	var interventionEnd = $('.date-picker-4').datepicker({ dateFormat: 'yyyy-mm-dd' }).val()
  return [[controlIni,controlEnd],[interventionIni,interventionEnd]];
};

getPolygonArray = function (pathArray) {
  var geom = [];
  for (var i = 0; i < pathArray.length; i++) {
    var coordinatePair = [pathArray[i].lng().toFixed(2), pathArray[i].lat().toFixed(2)];
    geom.push(coordinatePair);
  }
  return geom;
};

getCoordinates = function() {
  var cAoi = iAoi = [];
  if (water.instance.controlRegionPolygon) {
    cAoi = getPolygonArray(water.instance.controlRegionPolygon.getPath().getArray());
  }
  if (water.instance.interventionRegionPolygon) {
    iAoi = getPolygonArray(water.instance.interventionRegionPolygon.getPath().getArray());
  }
  return [cAoi, iAoi];
};

water.App.prototype.initPlot = function() {
	$('.submit').click(function(){
		$(".loader").toggle();
		var dates = getDates();
    var params = {
      before:dates[0].toString(),
      after: dates[1].toString()
    }
    var controlRegionAdmPolygon = false;
    var interventionRegionAdmPolygon = false;
    if (water.App.controlLat && water.App.controlLon) {
      controlRegionAdmPolygon = true;
    }
    if (water.App.interventionLat && water.App.interventionLon) {
      interventionRegionAdmPolygon = true;
    }
    if (controlRegionAdmPolygon) {
      params.controlAdmPolygon = controlRegionAdmPolygon;
      params.controlLat = water.App.controlLat;
      params.controlLon = water.App.controlLon;
    } else {
      var coords = getCoordinates();
      params.control = coords[0].toString();
    }
    if (interventionRegionAdmPolygon) {
      params.interventionAdmPolygon = interventionRegionAdmPolygon;
      params.interventionLat = water.App.interventionLat;
      params.interventionLon = water.App.interventionLon;
    } else {
      var coords = getCoordinates();
      params.intervention = coords[1].toString();
    }

		/*var coords = getCoordinates();
		var params = {
      before:dates[0].toString(),
			after: dates[1].toString(),
			control: coords[0].toString(),
			intervention: coords[1].toString()
		}*/

		$.ajax({
			url: "/timeHandler",
			data: params,
			dataType: "json",
			success: function (data) {
				showChart(data)
			},
			error: function (data) {
				alert("Uh-oh, an error occured! This is embarrassing! Here is the problem: "+data['error']+". Please try again.");
			}
		})
	}).bind(this)
};

// Modal Close Function
var closeModal = function () {
  $('.modal-body').html('');
  $('#chartModal').addClass('display-none-imp');
};

// Modal Open Function
var showModal = function () {
  $('#chartModal').removeClass('display-none-imp');
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target === $('#chartModal')[0]) {
    closeModal();
  }
};

var showChart = function (data) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

  var date_x = [];
  data.control.forEach(function (point) {
    var d = new Date(parseInt(point[0], 10))
    date_x.push(d.getFullYear() + " " + monthNames[d.getMonth()] + " " + (d.getDate() > 10 ? d.getDate() : '0' + d.getDate()));
  });

  var control_line = [];
  var intervention_line = [];
  var diff_line = [];
  data.control.forEach(function (point) {
    control_line.push(point[1]);
  });
  data.intervention.forEach(function (point) {
    intervention_line.push(point[1]);
  });
  data.difference.forEach(function (point) {
    diff_line.push(point[1]);
  });

  $('.modal-body').highcharts({
    chart: {
        type: 'line'
    },
    title: {
        text: 'BACI Analysis'
    },
    subtitle: {
        text: ''
    },
    xAxis: {
        categories: date_x
    },
    yAxis: {
        title: {
            text: 'Change in EVI'
        }
    },
    plotOptions: {
        line: {
            dataLabels: {
                enabled: false
            },
            enableMouseTracking: true
        }
    },
    series: [{
        name: 'Control',
        data: control_line
    }, {
        name: 'Intervention',
        data: intervention_line
    }, {
      name: 'Difference',
      data: diff_line
    }],
    credits: {
      enabled: false
    }
  });
  showModal();
};
/*var showChart = function(timeseries) {
	//document.getElementById('chart-window').style.display = "block";
	//document.getElementById('chart-info').style.display = "block";
  document.getElementById('chart').style.display = 'block';
	var DataArr = []
	timeseries.control.forEach(function(point) {
		point[0] = new Date(parseInt(point[0], 10));
		DataArr.push([point[0]]);
	firstGraph = 1
  });


  var count = 0;
  timeseries.intervention.forEach(function(point) {
	  DataArr[count].push(point[1]);
	  count = count +1;
  });

  chartData = new google.visualization.DataTable();
  chartData.addColumn('date','Date');
	chartData.addColumn('number','TSS');

  chartData.addRows(DataArr);

	// var data = google.visualization.arrayToDataTable([
	// 				timeseries
  //         // ['Year', 'Sales', 'Expenses'],
  //         // ['2004',  1000,      400],
  //         // ['2005',  1170,      460],
  //         // ['2006',  660,       1120],
  //         // ['2007',  1030,      540]
  //       ]);

  chartOptions = {
    title: 'TSS over time',
    // curveType: 'function',
    legend: { position: 'bottom' },
		vAxis: {title: 'TSS [mg/L]',minValue: 0},
		lineWidth: 1.5,
		pointSize: 3,
  };

  chart = new google.visualization.ScatterChart(document.getElementById('chart'));

  chart.draw(chartData,chartOptions);

	$('#Export').click(function () {
        var csvFormattedDataTable = google.visualization.dataTableToCsv(data);
        var encodedUri = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvFormattedDataTable);
        this.href = encodedUri;
        this.download = 'table-data.csv';
        this.target = '_blank';
    });

	$(".loader").toggle();

};*/



water.App.prototype.updateMap= function(){
	$('.update').click(function(){
		var dates = getDates()
		params = {beforeLow:dates[0][0],
							beforeHigh:dates[0][1],
							afterLow: dates[1][0],
							afterHigh: dates[1][1]
		}

		$('.loader').toggle()

		$.ajax({
			url: "/mapHandler",
			data: params,
			dataType: "json",
			success: function (data) {
				water.instance.showMap(data.eeMapId, data.eeToken, name, 0);
	    },
	    error: function (data) {
	      console.log(data.responseText);
	    }
		})
	}).bind(this)

	$('.loader').toggle()
}

/**
* Clear polygons from the map when changing region selection modes
**/
water.App.prototype.clearMap = function(){
	// remove all polygons
	this.map.data.forEach(function (feature) {
	  this.map.data.remove(feature);
	});
}

// Load administrative boundaries maps
water.App.prototype.loadAdmBoundsMap = function() {
  var name = 'adm_bounds';
  $.ajax({
    url: "/get_adm_bounds_map",
    dataType: "json",
    success: function (data) {
			water.instance.showMap(data.eeMapId, data.eeToken, name, 3);
    },
    error: function (data) {
      console.log(data.responseText);
    }
  });
}

// Load tiles maps
water.App.prototype.loadTilesMap = function() {
  var name = 'tiles';
	var zoom = this.map.getZoom()
	var params = {'zoom':zoom}
  $.ajax({
    url: "/get_tiles_map",
		data: params,
		dataType: "json",
    success: function (data) {
			water.instance.showMap(data.eeMapId, data.eeToken, name, 3);
    },
    error: function (data) {
      console.log(data.responseText);
    }
  });
}

// Show map
water.App.prototype.showMap = function(eeMapId, eeToken, name, index) {
	var EE_URL = 'https://earthengine.googleapis.com';
  var mapType = new ee.MapLayerOverlay(EE_URL + '/map', eeMapId, eeToken, {name: name});
  this.map.overlayMapTypes.push(mapType);        // old, just push to array, will always show latest layer on top
	//this.map.overlayMapTypes.setAt(index, mapType);  // new, use index to keep correct zIndex when adding/removing layers
};

// ---------------------------------------------------------------------------------- //
// Export functionality
// ---------------------------------------------------------------------------------- //

water.App.prototype.initExport = function() {
	$('.export').click(function () {
		// show panel
		$('.download_panel').css('display', 'block');
		// show prep message
		$('#download_prep').css('display', 'block');
		// clear any existing download links
		$('#link1').removeAttr('href');
		$('#link2').removeAttr('href');
		$('#link3').removeAttr('href');
		$('#link4').removeAttr('href');
		$('#link_metadata').removeAttr('href');
		$('#link_metadata').removeAttr('download');
		// remove download link(s) message
		$('#link1').css('display', 'none');
		$('#link2').css('display', 'none');
		$('#link3').css('display', 'none');
		$('#link4').css('display', 'none');
		$('#link_metadata').css('display', 'none');
		// get base parameters and export filename
		var base_params = water.App.prototype.getAllParams();
		var export_name = $("input[name='filename']").val();
		if (export_name == "") {
			export_name = 'Ecodash_BACI_' + base_params.time_start + '_' + base_params.time_end;
		}
		// get download link(s)
		var region_selection = $("input[name='control-selection-method']:checked").val();
		if (region_selection == 'Draw polygon') {
			var coords_array = water.instance.currentPolygon.latLngs.b[0].b;
			var coords_list  = []
			coords_array.forEach(function(coords) {
				var lat = coords.lat();
				var lng = coords.lng();
				coords_list.push([lng,lat]);
			});
			var params = $.extend(base_params, {coords: JSON.stringify(coords_list)}, {export_name: export_name});
			$.ajax({
				url: "/export_drawn",
				data: params,
				dataType: "json",
				success: function (data) {
					// hide prep message
					$('#download_prep').css('display', 'none');
					// show result
					//water.instance.showMap(data.eeMapId, data.eeToken, 'test', 4);
					//console.log(data);
					//window.location.replace(data);
					$('#link1').css('display', 'block');
					$('#link1').attr('href', data);
				},
				error: function (data) {
					console.log(data.responseText);
				}
			});
		} else {
			// use asynchronous ajax calls to allow getting/showing multiple download links at once
			var async_ajax_call_export_counter  = 0;
			var async_ajax_call_export_function = function(params) {
				$.ajax({
					url: "/export_selected",
					async: true,
					data: params,
					dataType: "json",
					success: function (data) {
						// hide prep message
						$('#download_prep').css('display', 'none');
						// show result
						//water.instance.showMap(data.eeMapId, data.eeToken, 'test', 4);
						//console.log(data);
						//window.location.replace(data);
						$('#link' + (async_ajax_call_export_counter+1)).css('display', 'block');
						$('#link' + (async_ajax_call_export_counter+1)).attr('href', data);
						async_ajax_call_export_counter++;
						if (async_ajax_call_export_counter < water.instance.points.length) {
							point  = water.instance.points[async_ajax_call_export_counter];
							params = $.extend(base_params, point, {export_name: export_name});
							async_ajax_call_export_function(params);
						}
					},
					error: function (data) {
						console.log(data.responseText);
						async_ajax_call_export_counter++;
						if (async_ajax_call_export_counter < water.instance.points.length) {
							point  = water.instance.points[async_ajax_call_export_counter];
							params = $.extend(base_params, point, {export_name: export_name});
							async_ajax_call_export_function(params);
						}
					}
				});
			}
			var point  = water.instance.points[0];
			var params = $.extend(base_params, point, {export_name: export_name}, {region_selection: region_selection});
			async_ajax_call_export_function(params);
		}
		// get metadata
		var metadata_header = Object.keys(water.App.prototype.getAllParams()).join().toString();
		var metadata_values = $.map(water.App.prototype.getAllParams(), function(x){return x}).join().toString();
		var metadata_csv    = metadata_header + '\n' + metadata_values
		$('#link_metadata').css('display', 'block');
		$('#link_metadata').attr('download', export_name + '.csv');
		$('#link_metadata').attr('href', encodeURI("data:text/csv;charset=utf-8" + ',' + metadata_csv));
	});
};

// ---------------------------------------------------------------------------------- //
// Static helpers and constants
// ---------------------------------------------------------------------------------- //

// Computes number of days between two dates
water.App.prototype.numberOfDays = function(day1, day2) {
  var oneDay     = 24*60*60*1000; // hours*minutes*seconds*milliseconds
  var firstDate  = new Date(day1);
  var secondDate = new Date(day2);
  return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
}

/**
 * NOTE: obsolete, using ee.MapLayerOverlay instead!
 * Generates a Google Maps map type (or layer) for the passed-in EE map id. See:
 * https://developers.google.com/maps/documentation/javascript/maptypes#ImageMapTypes
 * @param {string} eeMapId The Earth Engine map ID.
 * @param {string} eeToken The Earth Engine map token.
 * @return {google.maps.ImageMapType} A Google Maps ImageMapType object for the
 *     EE map with the given ID and token.
 */
water.App.getEeMapType = function(eeMapId, eeToken, name) {
  var eeMapOptions = {
    getTileUrl: function(tile, zoom) {
      var url = water.App.EE_URL + '/map/';
      url += [eeMapId, zoom, tile.x, tile.y].join('/');
      url += '?token=' + eeToken;
      return url;
    },
    tileSize: new google.maps.Size(256, 256),
	name: name,
	opacity: 1.0
  };
  return new google.maps.ImageMapType(eeMapOptions);
};

/**
 * Creates a drawing manager for the passed-in map.
 * @param {google.maps.Map} map The map for which to create a drawing
 *     manager.
 * @return {google.maps.drawing.DrawingManager} A drawing manager for
 *     the given map.
 */
water.App.createDrawingManager = function(map, type) {
  var drawingManagerOptions;
  if (type === 'controlRegion') {
    drawingManagerOptions = {
      drawingControl: false,
      polygonOptions: {
        fillColor: '#e8370b',
        strokeColor: '#e8370b'
      }
    };
  } else if (type === 'interventionRegion') {
    drawingManagerOptions = {
      drawingControl: false,
      polygonOptions: {
        fillColor: '#16e5b1',
        strokeColor: '#16e5b1'
      }
    };
  }
  var drawingManager = new google.maps.drawing.DrawingManager(drawingManagerOptions);
  drawingManager.setMap(map);
  return drawingManager;
};

/** @type {string} The Earth Engine API URL. */
EE_URL = 'https://earthengine.googleapis.com';

/** @type {number} The default zoom level for the map. */
water.App.DEFAULT_ZOOM = 3;

/** @type {number} The max allowed zoom level for the map. */
water.App.MAX_ZOOM = 14;

/** @type {Object} The default center of the map. */
water.App.DEFAULT_CENTER = {lng: 0.0, lat: 12.5};

/** @type {strin	g} The default date format. */
water.App.DATE_FORMAT = 'yyyy-mm-dd';

/** @type {number} The minimum allowed time period in days. */
water.App.MINIMUM_TIME_PERIOD_REGULAR = 90;

/** @type {number} The minimum allowed time period in days when climatology is activated. */
water.App.MINIMUM_TIME_PERIOD_CLIMATOLOGY = 1095;

/** @type {number} The max allowed selection of polygons for download/export. */
water.App.MAX_SELECTION = 4;

/** @type {number} Soft limit on download area size. */
water.App.AREA_LIMIT_1 = 1E9;

/** @type {number} Hard limit on download area size. */
water.App.AREA_LIMIT_2 = 1E9;

/** @type {Object} Control Polygon */
water.App.ControlPoly = new google.maps.Polygon();

/** @type {Object} Control Polygon */
water.App.InterventionPoly = new google.maps.Polygon();

water.App.controlLat = null;
water.App.controlLon = null;
water.App.interventionLat = null;
water.App.interventionLon = null;
