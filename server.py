#!/usr/bin/env python
"""Google Earth Engine python code for the SERVIR-Mekong Surface ecodash Tool"""

# This script handles the loading of the web application and its timeout settings,
# as well as the complete Earth Engine code for all the calculations.

import json
import os

import config
import ee
import jinja2
import webapp2

import socket

from google.appengine.api import urlfetch
from google.appengine.api import memcache

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

IMAGE_COLLECTION_ID = 'MODIS/MYD13A1'

ref_start = '2000-01-01'
ref_end = '2008-12-31'
series_start = '2006-01-01'
series_end = '2016-12-31'

counter = 0
CountryorProvince = 0

id_list = []
value_list = []

# The file system folder path to the folder with GeoJSON polygon files.
POLYGON_PATH_COUNTRY = 'static/country/'
POLYGON_PATH_PROVINCE = 'static/province/'

# Read the polygon IDs from the file system.
POLYGON_IDS_COUNTRY = [name.replace('.json', '') for name in os.listdir(POLYGON_PATH_COUNTRY)]
POLYGON_IDS_PROVINCE = [name.replace('.json', '') for name in os.listdir(POLYGON_PATH_PROVINCE)]

mylist = []

# The scale at which to reduce the polygons for the brightness time series.
REDUCTION_SCALE_METERS = 20000


# ------------------------------------------------------------------------------------ #
# Web request handlers
# ------------------------------------------------------------------------------------ #

class MainHandler(webapp2.RequestHandler):
    """A servlet to handle requests to load the main web page."""
    
    def get(self):
        mapid = GetMapId()
        counter = self.request.get('mycounter')
        template_values = {
            'eeMapId': mapid['mapid'],
            'eeToken': mapid['token'],
            'serializedPolygonIds_country': json.dumps(POLYGON_IDS_COUNTRY),
            'serializedPolygonIds_province': json.dumps(POLYGON_IDS_PROVINCE)
        }
        template = JINJA2_ENVIRONMENT.get_template('index.html')
        self.response.out.write(template.render(template_values))

# Define webapp2 routing from URL paths to web request handlers. See:
# http://webapp-improved.appspot.com/tutorials/quickstart.html
app = webapp2.WSGIApplication([('/', MainHandler)], debug=True)

class DetailsHandler(webapp2.RequestHandler):
  """A servlet to handle requests for details about a Polygon."""
  
  def get(self):
    """Returns details about a polygon."""
    print "entering handler"
    polygon_id = self.request.get('polygon_id') 
    counter = self.request.get('mycounter')
    refLow = self.request.get('refLow')
    refHigh = self.request.get('refHigh')
    studyLow = self.request.get('studyLow')
    studyHigh = self.request.get('studyHigh')
    
    ref_start = refLow + '-01-01'
    ref_end = refHigh + '-12-31'
    series_start = studyLow + '-01-01'
    series_end = studyHigh + '-12-31'

    print refLow,refHigh,studyLow,studyHigh
    print ref_start,ref_end,series_start,series_end
    CountryorProvince = int(self.request.get('folder'))
   
    if CountryorProvince == 0 :
		POLYGON_IDS = POLYGON_IDS_PROVINCE
		POLYGON_PATH = POLYGON_PATH_PROVINCE  
    
    if CountryorProvince == 1 :
		POLYGON_IDS = POLYGON_IDS_COUNTRY
		POLYGON_PATH = POLYGON_PATH_COUNTRY
    
    
    id_list.append(polygon_id)
    
    if polygon_id in POLYGON_IDS:
      content = GetPolygonTimeSeries(polygon_id,POLYGON_PATH,ref_start,ref_end,series_start,series_end)
    else:
      content = json.dumps({'error': 'Unrecognized polygon ID: ' + polygon_id})
    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(content)

    #get_values = self.request.GET


# Define webapp2 routing from URL paths to web request handlers. See:
# http://webapp-improved.appspot.com/tutorials/quickstart.html
app = webapp2.WSGIApplication([
    ('/details', DetailsHandler),
    ('/', MainHandler),
])

class PolygonHandler(webapp2.RequestHandler):
    def get(self):
		
		print "entering"
		polygon =  unicode(self.request.get('polygon')) 
		refLow = self.request.get('refLow')
		refHigh = self.request.get('refHigh')
		studyLow = self.request.get('studyLow')
		studyHigh = self.request.get('studyHigh')
    
		ref_start = refLow + '-01-01'
		ref_end = refHigh + '-12-31'
		series_start = studyLow + '-01-01'
		series_end = studyHigh + '-12-31'
		
			
		coords = []
				
		for items in eval(polygon):
			coords.append([items[1],items[0]])
		
		mypoly =  ee.FeatureCollection(ee.Geometry.Polygon(coords))
		self.response.write('Hello, World!')

		#content = ComputePolygonDrawTimeSeries(mypoly,ref_start,ref_end,series_start,series_end)
		#self.response.headers['Content-Type'] = 'application/json'
		#self.response.out.write(content)

		#self.response.out.write(content)
		#return content
        
# Define webapp2 routing from URL paths to web request handlers. See:
# http://webapp-improved.appspot.com/tutorials/quickstart.html
app = webapp2.WSGIApplication([
    ('/details', DetailsHandler),
    ('/polygon', PolygonHandler),
    ('/', MainHandler),
])

# ------------------------------------------------------------------------------------ #
# Helper functions
# ------------------------------------------------------------------------------------ #

def GetMapId():
    return EcoDashCalculation()

def EcoDashCalculation():

  """Returns the MapID for the night-time lights trend map."""
  collection = ee.ImageCollection(IMAGE_COLLECTION_ID)
  reference = collection.filterDate(ref_start,ref_end ).sort('system:time_start')
  series = collection.filterDate(series_start, series_end).sort('system:time_start')
  
  mymean = ee.Image(reference.mean())

  # Add a band containing image date as years since 1991.
  def subtractmean(img):
    myimg = img.subtract(mymean) #.subtract(mymean) #.subtract(1991)
    return ee.Image(myimg) #.float().addBands(img)
  
  mycollection = series.select('EVI').map(subtractmean)
  
  countries = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw');
  country_names = ['Myanmar (Burma)','Thailand','Laos','Vietnam','Cambodia']; # Specify name of country. Ignored if "use_uploaded_fusion_table" == y
  mekongCountries = countries.filter(ee.Filter.inList('Country', country_names));
  
  fit = mycollection.reduce(ee.Reducer.mean()).clip(mekongCountries)
  
  return fit.getMapId({
      'min': '-400',
      'max': '400',
      'bands': ' EVI_mean',
      'palette' : '931206,ff1b05,fdff42,4bff0f,0fa713'
  })
	
def GetPolygonTimeSeries(polygon_id,mypath,ref_start,ref_end,series_start,series_end):
  """Returns details about the polygon with the passed-in ID."""
  details = memcache.get(polygon_id)

  # If we've cached details for this polygon, return them.
  if details is not None:
    return details

  details = {'wikiUrl': WIKI_URL + polygon_id.replace('-', '%20')}

  try:
    details['timeSeries'] = ComputePolygonTimeSeries(polygon_id,mypath,ref_start,ref_end,series_start,series_end)
    # Store the results in memcache.
    memcache.add(polygon_id, json.dumps(details), MEMCACHE_EXPIRATION)
  except ee.EEException as e:
    # Handle exceptions from the EE client library.
    details['error'] = str(e)

  # Send the results to the browser.
  return json.dumps(details)

def ComputePolygonTimeSeries(polygon_id,mypath,ref_start,ref_end,series_start,series_end):
  """Returns a series of brightness over time for the polygon."""
  
  print ref_start,ref_end,series_start,series_end
  collection = ee.ImageCollection(IMAGE_COLLECTION_ID) #.filterDate('2008-01-01', '2010-12-31').sort('system:time_start')
  reference = collection.filterDate(ref_start,ref_end ).sort('system:time_start')
  series = collection.filterDate(series_start, series_end).sort('system:time_start')
  
  print "starting.."
  mymean = ee.Image(reference.mean())
  
  #mylist.append(polygon_id)
  
  # Add a band containing image date as years since 1991.
  def subtract(img):
    #myimg = img.float().subtract(mymean) #.subtract(1991)
    myimg = img.subtract(mymean) #.set('date', ee.Date(img.get('system:time_start')).format('YYYY-MM-dd')) #.subtract(1991)
    return ee.Image(myimg).set({"system:time_start": img.get("system:time_start")}) #.float().addBands(img)
    
  mycollection = series.map(subtract)
  
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


  myfeat = GetFeature(polygon_id,mypath)
  feature = ee.FeatureCollection(GetFeature(polygon_id,mypath))
  chart_data = cumulative.map(ComputeMean).getInfo()
  mymap = map(ExtractMean, chart_data['features'])
  

  print "finished"
  return mymap

def ComputePolygonDrawTimeSeries(polygon,ref_start,ref_end,series_start,series_end):
  """Returns a series of brightness over time for the polygon."""
  collection = ee.ImageCollection(IMAGE_COLLECTION_ID) #.filterDate('2008-01-01', '2010-12-31').sort('system:time_start')
  reference = collection.filterDate(ref_start,ref_end ).sort('system:time_start')
  series = collection.filterDate(series_start, series_end).sort('system:time_start')
  
  mymean = ee.Image(reference.mean())
  
  
  # Add a band containing image date as years since 1991.
  def subtract(img):
    #myimg = img.float().subtract(mymean) #.subtract(1991)
    myimg = img.subtract(mymean) #.set('date', ee.Date(img.get('system:time_start')).format('YYYY-MM-dd')) #.subtract(1991)
    return ee.Image(myimg).set({"system:time_start": img.get("system:time_start")}) #.float().addBands(img)
    
  mycollection = series.map(subtract)
  
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


 
  feature = polygon

  chart_data = cumulative.map(ComputeMean).getInfo()
  
  
  print chart_data
  mymap = map(ExtractMean, chart_data['features'])

  return mymap



def GetFeature(polygon_id,mypath):
  """Returns an ee.Feature for the polygon with the given ID."""
  # Note: The polygon IDs are read from the filesystem in the initialization
  # section below. "sample-id" corresponds to "static/polygons/sample-id.json". 
  path = mypath + polygon_id + '.json'
 
  path = os.path.join(os.path.split(__file__)[0], path)
  with open(path) as f:
    myfeature =  ee.Feature(json.load(f));
  return myfeature
