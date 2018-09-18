var map,
    eco_layer,
    eco_source,
    clear_coords,
    $chartModal,
    $loading;

$(function() {
  $('#control-button').attr('disabled','disabled');

  $chartModal = $("#chart-modal");
  $loading = $('#spinner');
  // Get the Open Layers map object from the Tethys MapView
  map = TETHYS_MAP_VIEW.getMap();

  var $layers_element = $('#layers');
  var $update_element = $('#update_button');

  var base_map = new ol.layer.Tile({
            crossOrigin: 'anonymous',
            source: new ol.source.XYZ({
                // attributions: [attribution],
                url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/' +
                'World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
            })
        });

  map.removeLayer(0)
  map.addLayer(base_map);


  //// *** Map updating *** ////

  eco_url = $layers_element.attr('data-eco-url');

  eco_source = new ol.source.XYZ({url:eco_url});
  eco_layer = new ol.layer.Tile(
    {
      source:eco_source
    }
  );

  map.addLayer(eco_layer)

  $('[name="update-button"]').on('click',function() {

    $loading.css('display','block');

    var bi = $('#before_date_ini').val()
    var be = $('#before_date_end').val()
    var ai = $('#after_date_ini').val()
    var ae = $('#after_date_end').val()

    var xhr = ajax_update_database('update_map',{'biDate':bi,'beDate':be,'aiDate':ai,'aeDate':ae},"layers");
    xhr.done(function(data) {
        if("success" in data) {
          eco_source = new ol.source.XYZ({url:data.url});
          eco_layer.setSource(eco_source)
          $loading.css('display','none');
        }else{
          alert('Opps, there was a problem processing the request. Please see the following error: '+data.error);
          $loading.css('display','none');
        }
    });
  });

  //// *** Map interactions *** ////

  var vector_C_source = new ol.source.Vector({
    wrapX: false
  });

  var vector_C_layer = new ol.layer.Vector({
    name: 'my_vectorlayer',
    source: vector_C_source,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(155, 155, 155, 0.8)'
        }),
        stroke: new ol.style.Stroke({
            color: '#29282A',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#29282A'
            })
        })
    })
  });

  var vector_I_source = new ol.source.Vector({
    wrapX: false
  });

  var vector_I_layer = new ol.layer.Vector({
    name: 'my_vectorlayer',
    source: vector_I_source,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(240, 240, 240, 0.8)'
        }),
        stroke: new ol.style.Stroke({
            color: '#757575',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#757575'
            })
        })
    })
  });

  map.addLayer(vector_C_layer)
  map.addLayer(vector_I_layer)

  //Code for adding interaction for drawing on the map
  var controlFeature, interventionFeature, Cdraw, Idraw, controlType, interventionType;

  //Clear the last feature before adding a new feature to the map
  var removeControlFeature = function () {
      if (controlFeature) vector_C_source.removeFeature(controlFeature);
  };
  //Clear the last feature before adding a new feature to the map
  var removeInterventionFeature = function () {
      if (interventionFeature) vector_I_source.removeFeature(interventionFeature);
  };

  //Add interaction to the map based on the selected interaction type
  var addControl = function (geomtype) {
      var typeSelect = document.getElementById('control-type');
      var value = typeSelect.value;
      $('#data').val('');
      if (value !== 'None') {
          if (Cdraw)
              map.removeInteraction(Cdraw);

          Cdraw = new ol.interaction.Draw({
              source: vector_C_source,
              type: geomtype
          });
          map.addInteraction(Cdraw);
      }
      if (typeSelect  === 'Polygon') {

          Cdraw.on('drawend', function (e) {
              $('#control-button').removeAttr('disabled');
              controlFeature = e.feature;
              map.removeInteraction(Cdraw);
          });

          Cdraw.on('drawstart', function (e) {
              $('#control-button').attr('disabled','disabled');
              vector_C_layer.getSource().clear();
          });
      }
  };

  //Add interaction to the map based on the selected interaction type
  var addIntervention = function (geomtype) {
      var typeSelect = document.getElementById('intervention-type');
      var value = typeSelect.value;
      $('#data').val('');
      if (value !== 'None') {
          if (Idraw)
              map.removeInteraction(Idraw);

          Idraw = new ol.interaction.Draw({
              source: vector_I_source,
              type: geomtype
          });


          map.addInteraction(Idraw);
      }
      if (typeSelect === 'Point' || typeSelect === 'Polygon' || typeSelect === 'Circle') {

          Idraw.on('drawend', function (e) {
              interventionFeature = e.feature;
              map.removeInteraction(Idraw);
          });

          Idraw.on('drawstart', function (e) {
              vector_I_layer.getSource().clear();
          });
      }
  };

  clear_C_coords = function(){
      $("#polyC-lat-lon").val('');
      $("#pointC-lat-lon").val('');
  };

  clear_I_coords = function(){
      $("#polyI-lat-lon").val('');
      $("#pointI-lat-lon").val('');
  };

  vector_C_layer.getSource().on('addfeature', function(event){
      //Extracting the point/polygon values from the drawn feature
      var feature_json = saveControlData();
      var parsed_feature = JSON.parse(feature_json);
      var feature_type = parsed_feature["features"][0]["geometry"]["type"];
      if (feature_type == 'Point'){
          var coords = parsed_feature["features"][0]["geometry"]["coordinates"];
          var proj_coords = ol.proj.transform(coords, 'EPSG:3857','EPSG:4326');
          $("#pointC-lat-lon").val(proj_coords);
      } else if (feature_type == 'Polygon'){
          var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
          proj_coords = [];
          coords.forEach(function (coord) {
              var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
              proj_coords.push('['+transformed+']');
          });
          var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
          $("#polyC-lat-lon").val(json_object);
      }
  });

  vector_I_layer.getSource().on('addfeature', function(event){
      //Extracting the point/polygon values from the drawn feature
      var feature_json = saveInterventionData();
      var parsed_feature = JSON.parse(feature_json);
      var feature_type = parsed_feature["features"][0]["geometry"]["type"];
      if (feature_type == 'Point'){
          var coords = parsed_feature["features"][0]["geometry"]["coordinates"];
          var proj_coords = ol.proj.transform(coords, 'EPSG:3857','EPSG:4326');
          $("#pointI-lat-lon").val(proj_coords);
      } else if (feature_type == 'Polygon'){
          var coords = parsed_feature["features"][0]["geometry"]["coordinates"][0];
          proj_coords = [];
          coords.forEach(function (coord) {
              var transformed = ol.proj.transform(coord,'EPSG:3857','EPSG:4326');
              proj_coords.push('['+transformed+']');
          });
          var json_object = '{"type":"Polygon","coordinates":[['+proj_coords+']]}';
          $("#polyI-lat-lon").val(json_object);
      }
  });

  function saveControlData() {
    // get the format the user has chosen
    var data_type = 'GeoJSON',
        // define a format the data shall be converted to
        format = new ol.format[data_type](),
        // this will be the data in the chosen format
        data;
    try {
        // convert the data of the vector_layer into the chosen format
        data = format.writeFeatures(vector_C_layer.getSource().getFeatures());
    } catch (e) {
        // at time of creation there is an error in the GPX format (18.7.2014)
        $('#data').val(e.name + ": " + e.message);
        return;
    }
    // $('#data').val(JSON.stringify(data, null, 4));
    return data;

  }
  function saveInterventionData() {
    // get the format the user has chosen
    var data_type = 'GeoJSON',
        // define a format the data shall be converted to
        format = new ol.format[data_type](),
        // this will be the data in the chosen format
        data;
    try {
        // convert the data of the vector_layer into the chosen format
        data = format.writeFeatures(vector_I_layer.getSource().getFeatures());
    } catch (e) {
        // at time of creation there is an error in the GPX format (18.7.2014)
        $('#data').val(e.name + ": " + e.message);
        return;
    }
    // $('#data').val(JSON.stringify(data, null, 4));
    return data;

  }
  $('#control-type').change(function (e) {
      controlType = $(this).find('option:selected').val();
      if(controlType == 'None'){
          $('#data').val('');
          clear_C_coords();
          map.removeInteraction(Cdraw);
          vector_C_layer.getSource().clear();
      }else if(controlType == 'Point')
      {
          clear_C_coords();
          addControl(controlType);
      }else if(controlType == 'Polygon'){
          clear_C_coords();
          addControl(controlType);
      }
  }).change();

  $('#intervention-type').change(function (e) {
      interventionType = $(this).find('option:selected').val();
      if(interventionType == 'None'){
          $('#data').val('');
          clear_I_coords();
          map.removeInteraction(Idraw);
          vector_I_layer.getSource().clear();
      }else if(interventionType == 'Point')
      {
          clear_I_coords();
          addIntervention(interventionType);
      }else if(interventionType == 'Polygon'){
          clear_I_coords();
          addIntervention(interventionType);
      }
  }).change();

  $('[name="remove-button"]').on('click',function() {
    vector_C_layer.getSource().clear()
    clear_C_coords()
    vector_I_layer.getSource().clear()
    clear_I_coords()
    $('#control-type').val('None')
    $('#intervention-type').val('None')
    if (Cdraw) {
      map.removeInteraction(Cdraw);
    }
    if (Idraw) {
      map.removeInteraction(Idraw);
    }
  });


  //// *** time series processing *** ////

  $('[name="chart-button"]').on('click',function() {

    $loading.css('display','block');

    var bi = $('#before_date_ini').val()
    var be = $('#before_date_end').val()
    var ai = $('#after_date_ini').val()
    var ae = $('#after_date_end').val()

    var controlSelect = document.getElementById('control-type');
    var interventionSelect = document.getElementById('intervention-type');

    var coordsC = $("#polyC-lat-lon").val()
    var coordsI = $("#polyI-lat-lon").val()

    var xhr = ajax_update_database('time_series',{'coordsC':coordsC,'coordsI':coordsI,'biDate':bi,'beDate':be,'aiDate':ai,'aeDate':ae});
    xhr.done(function(data) {
        if("success" in data) {
          console.log(data)
          $chartModal.modal('show');

          chart = Highcharts.stockChart('plotter',{
                            chart: {
                                type:'line',
                                zoomType: 'x',
                                height: 350,
                            },
                            tooltip: {
                                xDateFormat: '%Y-%m-%d'
                            },
                            xAxis: {
                                type: 'datetime',
                                dateTimeLabelFormats: { // don't display the dummy year
                                    month: '%e. %b',
                                    year: '%b'
                                },
                                title: {
                                    text: 'Date'
                                }
                            },
                            yAxis: {
                                title: {
                                    text: "EVI Change"
                                }
                            },
                            exporting: {
                                enabled: true
                            },
                            series: [{
                                data:data.control,
                                name: "Control",
                                color:"#f39c12"
                            },{
                                data:data.intervention,
                                name: "Intervention",
                                color: '#16a085'
                            },{
                                data:data.difference,
                                name: "Difference",
                                color: '#8e44ad'
                            }
                          ]
                        });
                        $("#plotter").removeClass('hidden');

          $loading.css('display','none');
        }else{
          alert('Opps, there was a problem processing the request. Please see the following error: '+data.error);
          $loading.css('display','none');
        }
    });
  });


  //// **** Data Download Functionality **** ////
  $('[name="control-button"]').on('click',function() {
    $loading.css('display','block');
    var coords = $("#polyC-lat-lon").val()
    var bi = $('#before_date_ini').val()
    var be = $('#before_date_end').val()
    var ai = $('#after_date_ini').val()
    var ae = $('#after_date_end').val()

    var xhr = ajax_update_database('export_data',{'coords':coords,'biDate':bi,'beDate':be,'aiDate':ai,'aeDate':ae});
    xhr.done(function(data) {
        if("success" in data) {
          window.open(data.url,"_self")
          $loading.css('display','none');
        }
        else {
          alert('Opps, there was a problem processing the request. Please see the following error: '+data.error);
          $loading.css('display','none');
        }
    });
  });

  $('[name="intervention-button"]').on('click',function() {
    $loading.css('display','block');
    var coords = $("#polyI-lat-lon").val()
    var bi = $('#before_date_ini').val()
    var be = $('#before_date_end').val()
    var ai = $('#after_date_ini').val()
    var ae = $('#after_date_end').val()

    var xhr = ajax_update_database('export_data',{'coords':coords,'biDate':bi,'beDate':be,'aiDate':ai,'aeDate':ae});
    xhr.done(function(data) {
        if("success" in data) {
          window.open(data.url,"_self")
          $loading.css('display','none');
        }
        else {
          alert('Opps, there was a problem processing the request. Please see the following error: '+data.error);
          $loading.css('display','none');
        }
    });
  });



// end of file
});
