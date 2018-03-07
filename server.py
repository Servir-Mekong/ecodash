#!/usr/bin/env python
"""Google Earth Engine python code for the SERVIR-Mekong Surface ecodash Tool"""

# This script handles the loading of the web application and its timeout settings,
# as well as the complete Earth Engine code for all the calculations.

import json
import os

import config
import ee
import math
import jinja2
import webapp2
import oauth2client.appengine

import socket

from google.appengine.api import urlfetch
from google.appengine.api import memcache
from google.appengine.api import users
from google.appengine.api import channel
from google.appengine.api import taskqueue

# ------------------------------------------------------------------------------------ #
# Initialization
# ------------------------------------------------------------------------------------ #

# Memcache is used to avoid exceeding our EE quota. Entries in the cache expire
# 24 hours after they are added. See:
# https://cloud.google.com/appengine/docs/python/memcache/
MEMCACHE_EXPIRATION = 60 * 60 * 24


# The URL fetch timeout time (seconds).
URL_FETCH_TIMEOUT = 60

WIKI_URL = ""

# Create the Jinja templating system we use to dynamically generate HTML. See:
# http://jinja.pocoo.org/docs/dev/
JINJA2_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    autoescape=True,
    extensions=['jinja2.ext.autoescape'])

ee.Initialize(config.EE_CREDENTIALS)

ee.data.setDeadline(URL_FETCH_TIMEOUT)
socket.setdefaulttimeout(URL_FETCH_TIMEOUT)
urlfetch.set_default_fetch_deadline(URL_FETCH_TIMEOUT)

# set the collection ID
IMAGE_COLLECTION_ID1 = ee.ImageCollection('MODIS/MYD13A1')
IMAGE_COLLECTION_ID2 = ee.ImageCollection('MODIS/MOD13A1')

IMAGE_COLLECTION_ID =  IMAGE_COLLECTION_ID1.merge(IMAGE_COLLECTION_ID2);

Adm_bounds = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw')#ee.FeatureCollection('USDOS/LSIB/2013')

ref_start = '2005-01-01'
ref_end = '2010-12-31'
series_start = '2011-01-01'
series_end = '2015-12-31'

counter = 0
CountryorProvince = 0

id_list = []
value_list = []

mylist = []

# The scale at which to reduce the polygons for the brightness time series.
REDUCTION_SCALE_METERS = 2500



# ------------------------------------------------------------------------------------ #
# Web request handlers
# ------------------------------------------------------------------------------------ #


# Main handler is called on init of application
# return the html template
class MainHandler(webapp2.RequestHandler):
    """A servlet to handle requests to load the main web page."""

    def get(self):
        mapid = updateMap(ref_start,ref_end,series_start,series_end)
        counter = self.request.get('mycounter')
        template_values = {
            'eeMapId': mapid['mapid'],
            'eeToken': mapid['token'],
        }
        template = JINJA2_ENVIRONMENT.get_template('index.html')
        self.response.out.write(template.render(template_values))


# detail handler is called when the user clicks a polyhgon
# return a list with dates and values to populate the chart
class DetailsHandler(webapp2.RequestHandler):
  """A servlet to handle requests for details about a Polygon."""

  def get(self):
    """Returns details about a polygon."""
    polygon = self.request.get('polygon_id')
    counter = self.request.get('mycounter')
    refLow = self.request.get('refLow')
    refHigh = self.request.get('refHigh')
    studyLow = self.request.get('studyLow')
    studyHigh = self.request.get('studyHigh')

    ref_start = refLow + '-01-01'
    ref_end = refHigh + '-12-31'
    series_start = studyLow + '-01-01'
    series_end = studyHigh + '-12-31'

    mode = int(self.request.get('folder'))

    if mode < 2:

		if mode == 0 :
			POLYGON_IDS = POLYGON_IDS_PROVINCE
			POLYGON_PATH = POLYGON_PATH_PROVINCE


		if mode == 1 :
			POLYGON_IDS = POLYGON_IDS_COUNTRY
			POLYGON_PATH = POLYGON_PATH_COUNTRY

		id_list.append(polygon)

		if polygon in POLYGON_IDS:
		  feature = ee.FeatureCollection(GetFeature(polygon,POLYGON_PATH))
		  content = GetPolygonTimeSeries(feature,ref_start,ref_end,series_start,series_end)
		else:
		  content = json.dumps({'error': 'Unrecognized polygon ID: ' + polygon})

    if mode == 2:
		coords = []

		for items in eval(polygon):
			coords.append([items[1],items[0]])

		feature =  ee.FeatureCollection(ee.Geometry.Polygon(coords))

		content = GetPolygonTimeSeries(feature,ref_start,ref_end,series_start,series_end)

    if mode ==  3:
		polygon = json.loads(unicode(self.request.get('polygon_id')))
		coords = []

		for items in polygon:
			coords.append([items[0],items[1]])

		mypoly =  ee.FeatureCollection(ee.Geometry.Polygon(coords))

		content = ComputePolygonDrawTimeSeries(mypoly,ref_start,ref_end,series_start,series_end)

    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(content)


class GetMapHandler(webapp2.RequestHandler):

    def get(self):

		refLow = self.request.get('refLow')
		refHigh = self.request.get('refHigh')
		studyLow = self.request.get('studyLow')
		studyHigh = self.request.get('studyHigh')

		mapid = updateMap(refLow,refHigh,studyLow,studyHigh)

		template_values = {
			'eeMapId': mapid['mapid'],
			'eeToken': mapid['token']
        }

		template = JINJA2_ENVIRONMENT.get_template('index.html')
		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(template_values))

class GetAdmBoundsMapHandler(webapp2.RequestHandler):
    """A servlet to handle requests to load the administrative boundaries fusion table."""

    def get(self):
        #mapid = Adm_bounds.getMapId({'color':'lightgrey'})
        mapid = ee.Image().byte().paint(Adm_bounds, 0, 2).getMapId({'color':'FFFFFF'})
        #'a5a5a5'
        content = {
            'eeMapId': mapid['mapid'],
            'eeToken': mapid['token']
        }
        print(content)
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(content))


class GetTilesMapHandler(webapp2.RequestHandler):
    """A servlet to handle requests to load the tiles fusion table."""

    def get(self):
        #mapid = Tiles.getMapId({'color':'lightgrey'})
        zoom = self.request.param.get('zoom')
        mapid = ee.Image().byte().paint(Tiles, 0, 2).getMapId()
        content = {
            'eeMapId': mapid['mapid'],
            'eeToken': mapid['token']
        }
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(content))


class GetSelectedAdmBoundsHandler(webapp2.RequestHandler):
    """A servlet to handle requests to select an administrative boundary from the fusion table."""

    def get(self):
        mode = self.request.params.get('mode')
        if mode == 'control':
            color = 'grey'
        else:
            color = 'magenta'
        lat   = ee.Number(float(self.request.params.get('lat')))
        lng   = ee.Number(float(self.request.params.get('lng')))
        point = ee.Geometry.Point([lng, lat])
        area  = ee.Feature(Adm_bounds.filterBounds(point).first())
        size  = area.geometry().area().divide(1e6).getInfo()
        mapid = area.getMapId({'color':color})
        content = {
            'eeMapId': mapid['mapid'],
            'eeToken': mapid['token'],
            'size': size
        }
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(content))


class GetSelectedTileHandler(webapp2.RequestHandler):
    """A servlet to handle requests to select a tile from the fusion table."""

    def get(self):
        lat   = ee.Number(float(self.request.params.get('lat')))
        lng   = ee.Number(float(self.request.params.get('lng')))
        point = ee.Geometry.Point([lng, lat])
        area  = ee.Feature(Tiles.filterBounds(point).first())
        mapid = area.getMapId({'color':'grey'})
        content = {
            'eeMapId': mapid['mapid'],
            'eeToken': mapid['token']
        }
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(content))

class GetTimeSeriesHandler(webapp2.RequestHandler):

    def get(self):

        def coords2poly(points):
            coords = []
            for items in eval(points):
    			coords.append([items[1],items[0]])

    	    return ee.FeatureCollection(ee.Geometry.Polygon(coords))

        control =  unicode(self.request.get('control'))
        intervention = unicode(self.request.get('intervention'))
        beforeIni = self.request.get('before')[0]
        beforeEnd = self.request.get('before')[1]
        afterIni = self.request.get('after')[0]
        afterEnd = self.request.get('after')[1]

        controlPoly = coords2poly(control)
        interventionPoly = coords2poly(intervention)

        cDetails = ComputePolygonDrawTimeSeries(controlPoly,beforeIni,beforeEnd,afterIni,afterEnd)
        iDetails = ComputePolygonDrawTimeSeries(interventionPoly,beforeIni,beforeEnd,afterIni,afterEnd)

        details = {'control':cDetails,'intervention':iDetails}
		#memcache.add(str(counter), json.dumps(details), MEMCACHE_EXPIRATION)
        content = json.dumps(details)

        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(content)


# Define webapp2 routing from URL paths to web request handlers. See:
# http://webapp-improved.appspot.com/tutorials/quickstart.html
app = webapp2.WSGIApplication([
    ('/details', DetailsHandler),
    ('/select_tile', GetSelectedTileHandler),
    ('/select_adm_bounds', GetSelectedAdmBoundsHandler),
    ('/get_adm_bounds_map', GetAdmBoundsMapHandler),
    ('/get_tiles_map', GetTilesMapHandler),
    ('/timeHandler', GetTimeSeriesHandler),
    ('/', MainHandler),
])

# ------------------------------------------------------------------------------------ #
# Helper functions
# ------------------------------------------------------------------------------------ #





def updateMap(ref_start,ref_end,series_start,series_end):

  cumulative = Calculation(ref_start,ref_end,series_start,series_end)

  countries = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw');
  country_names = ['Myanmar (Burma)','Thailand','Laos','Vietnam','Cambodia']; # Specify name of country. Ignored if "use_uploaded_fusion_table" == y
  mekongCountries = countries.filter(ee.Filter.inList('Country', country_names));

  myList = cumulative.toList(500)

  fit = ee.Image(myList.get(-1)) #.clip(mekongCountries)


  months = ee.Date(series_end).difference(ee.Date(series_start),"month").getInfo()

  Threshold1 = months * 0.06
  Threshold2 = months * -0.06

  return fit.getMapId({
      'min': Threshold2,
      'max': Threshold1,
      'bands': ' EVI',
      'palette' : '931206,ff1b05,fdff42,4bff0f,0fa713'
  })



def GetPolygonTimeSeries(feature,ref_start,ref_end,series_start,series_end):
  """Returns details about the polygon with the passed-in ID."""
  #details = memcache.get(polygon_id)

  # If we've cached details for this polygon, return them.
  #if details is not None:
  #  return details

  details = {}

  try:
    details['timeSeries'] = ComputePolygonTimeSeries(feature,ref_start,ref_end,series_start,series_end)
    # Store the results in memcache.
    #memcache.add(polygon_id, json.dumps(details), MEMCACHE_EXPIRATION)
  except ee.EEException as e:
    # Handle exceptions from the EE client library.
    details['error'] = str(e)

  # Send the results to the browser.
  return json.dumps(details)


def ComputePolygonTimeSeries(feature,ref_start,ref_end,series_start,series_end):

  """Returns a series of brightness over time for the polygon."""
  cumulative = Calculation(ref_start,ref_end,series_start,series_end)

  # Compute the mean brightness in the region in each image.
  def ComputeMean(img):
    reduction = img.reduceRegion(
        ee.Reducer.mean(), feature.geometry(), REDUCTION_SCALE_METERS)
    return ee.Feature(None, {
        'EVI': reduction.get('EVI'),
        'system:time_start': img.get('system:time_start')
    })

  # Extract the results as a list of lists.
  def ExtractMean(feature):
    return [
        feature['properties']['system:time_start'],
        feature['properties']['EVI']
    ]

  chart_data = cumulative.map(ComputeMean).getInfo()

  mymap = map(ExtractMean, chart_data['features'])

  return mymap


def ComputePolygonDrawTimeSeries(polygon,ref_start,ref_end,series_start,series_end):

  """Returns a series of brightness over time for the polygon."""
  cumulative = Calculation(ref_start,ref_end,series_start,series_end)

  # Compute the mean brightness in the region in each image.
  def ComputeMean(img):
    reduction = img.reduceRegion(
        ee.Reducer.mean(), feature.geometry(), REDUCTION_SCALE_METERS)


    return ee.Feature(None, {
        'EVI': reduction.get('EVI'),
        'system:time_start': img.get('system:time_start')
    })

  # Extract the results as a list of lists.
  def ExtractMean(feature):
    return [
        feature['properties']['system:time_start'],
        feature['properties']['EVI']
    ]

  feature = ee.FeatureCollection(polygon)

  chart_data = cumulative.map(ComputeMean).getInfo()

  mymap = map(ExtractMean, chart_data['features'])

  return mymap

def Calculation(ref_start,ref_end,series_start,series_end):

  def getQABits(image, start, end, newName):
    #Compute the bits we need to extract.
    pattern = 0;
    for i in range(start,end+1):
       pattern += math.pow(2, i);

    # Return a single band image of the extracted QA bits, giving the band
    # a new name.
    return image.select([0], [newName])\
                  .bitwiseAnd(int(pattern))\
                  .rightShift(start);

  def maskPoorQuality(img):
      # Select the QA band.
      QA = img.select('DetailedQA');
      # Get the internal_cloud_algorithm_flag bit.
      clouds = getQABits(QA,10, 10, 'cloud_flag');
      land = getQABits(QA,11, 13, 'land_flag');
      mask = clouds.eq(0).And(land.eq(1))
      # Return an image masking out cloudy areas.
      return img.updateMask(mask);


  collection = ee.ImageCollection(IMAGE_COLLECTION_ID).map(maskPoorQuality)
  reference = collection.filterDate(ref_start,ref_end ).sort('system:time_start').select('EVI')
  series = collection.filterDate(series_start, series_end).sort('system:time_start').select('EVI')

  def calcMonthlyMean(ref,col):

      mylist = ee.List([])
      years = range(int(series_start[0:4]),int(series_end[0:4])+1)
      months = range(1,13)
      for y in years:
		for m in months:
			# select all months in the reference period
			refmean = ref.filter(ee.Filter.calendarRange(m,m,'month')).mean().multiply(0.0001)
			# select all months in the study period
			studyselection = col.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month'));
			# get the time of the first item
			studytime = studyselection.first().get('system:time_start')
			# multiply the monthly mean map with 0.0001
			study = studyselection.mean().multiply(0.0001)
			result = study.subtract(refmean)
			mylist = mylist.add(result.set('year', y).set('month',m).set('date',ee.Date.fromYMD(y,m,1)).set('system:time_start',studytime))
      return ee.ImageCollection.fromImages(mylist)

  mycollection = ee.ImageCollection(calcMonthlyMean(reference,collection))

  time0 = series.first().get('system:time_start')
  first = ee.List([ee.Image(0).set('system:time_start', time0).select([0], ['EVI'])])

  ## This is a function to pass to Iterate().
  ## As anomaly images are computed, add them to the list.
  def accumulate(image, mylist):
    ## Get the latest cumulative anomaly image from the end of the list with
    ## get(-1).  Since the type of the list argument to the function is unknown,
    ## it needs to be cast to a List.  Since the return type of get() is unknown,
    ## cast it to Image.
    previous = ee.Image(ee.List(mylist).get(-1))
    ## Add the current anomaly to make a new cumulative anomaly image.
    added = image.add(previous).set('system:time_start', image.get('system:time_start'))
    ## Propagate metadata to the new image.
    #
    ## Return the list with the cumulative anomaly inserted.
    return ee.List(mylist).add(added)

  ## Create an ImageCollection of cumulative anomaly images by iterating.
  ## Since the return type of iterate is unknown, it needs to be cast to a List.
  cumulative = ee.ImageCollection(ee.List(mycollection.iterate(accumulate, first)))

  return cumulative
