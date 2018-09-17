var map;
var eco_layer;
var eco_source;

$(function() {
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

  eco_url = $layers_element.attr('data-eco-url');

  eco_source = new ol.source.XYZ({url:eco_url});
  eco_layer = new ol.layer.Tile(
    {
      source:eco_source
    }
  );

  map.addLayer(eco_layer)

  $('[name="update-button"]').on('click',function() {

    $('#spinner').show();

    var bi = $('#before_date_ini').val()
    var be = $('#before_date_end').val()
    var ai = $('#after_date_ini').val()
    var ae = $('#after_date_end').val()

    console.log(bi,be,ai,ae)
    var xhr = ajax_update_database('update_map',{'biDate':bi,'beDate':be,'aiDate':ai,'aeDate':ae},"layers");
    xhr.done(function(data) {
        if("success" in data) {
          console.log(data)
          eco_source = new ol.source.XYZ({url:data.url});
          eco_layer.setSource(eco_source)
          $('#spinner').hide();
        }else{
          alert('Opps, there was a problem processing the request. Please see the following error: '+data.error);
          $('#spinner').hide();
        }
    });
  });

  var controlSelect = document.getElementById('control-type');
  var interventionSelect = document.getElementById('intervention-type');

      var draw; // global so we can remove it later
      function addInteraction() {
        var value = typeSelect.value;
        if (value !== 'None') {
          draw = new Draw({
            source: source,
            type: typeSelect.value
          });
          map.addInteraction(draw);
        }
      }


      /**
       * Handle change event.
       */
      typeSelect.onchange = function() {
        map.removeInteraction(draw);
        addInteraction();
      };

      addInteraction();
});
