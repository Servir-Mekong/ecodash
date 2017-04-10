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
IMAGE_COLLECTION_ID = 'MODIS/MYD13A1'

ref_start = '2006-01-01'
ref_end = '2008-12-31'
series_start = '2009-01-01'
series_end = '2011-12-31'

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
            'serializedPolygonIds_country': json.dumps(POLYGON_IDS_COUNTRY),
            'serializedPolygonIds_province': json.dumps(POLYGON_IDS_PROVINCE)
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


# PieChartHandler is called when the user clicks a polygon
# return a list with 5 values for the piechart
class PieChartHandler(webapp2.RequestHandler):
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
    
    # 
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
		  content = calcPie(feature,ref_start,ref_end,series_start,series_end)
		else:
		  content = json.dumps({'error': 'Unrecognized polygon ID: ' + polygon})
    
    # drawing mode
    if mode ==  2:
		coords = []
			
		for items in eval(polygon):
			coords.append([items[1],items[0]])
		
		feature =  ee.FeatureCollection(ee.Geometry.Polygon(coords))
		content = calcPie(feature,ref_start,ref_end,series_start,series_end)
	
	# upload mode
    if mode ==  3:
		polygon = json.loads(unicode(self.request.get('polygon_id')))
		coords = []
			
		for items in polygon:
			coords.append([items[0],items[1]])
		
		mypoly =  ee.FeatureCollection(ee.Geometry.Polygon(coords))

		content = calcPie(mypoly,ref_start,ref_end,series_start,series_end)
		
    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(content)


'''
# PolygonuploadHandler is called when the user uploads a polygon
# return a list with dates and values to populate the chart
class PolygonUploadHandler(webapp2.RequestHandler):
    def get(self):
		
		polygon = json.loads(unicode(self.request.get('polygon')))
		refLow = self.request.get('refLow')
		refHigh = self.request.get('refHigh')
		studyLow = self.request.get('studyLow')
		studyHigh = self.request.get('studyHigh')
    
		ref_start = refLow + '-01-01'
		ref_end = refHigh + '-12-31'
		series_start = studyLow + '-01-01'
		series_end = studyHigh + '-12-31'

		coords = []
				
		for items in polygon:
			coords.append([items[0],items[1]])
		
		mypoly =  ee.FeatureCollection(ee.Geometry.Polygon(coords))
		
		details = ComputePolygonDrawTimeSeries(mypoly,ref_start,ref_end,series_start,series_end)
	
		content = json.dumps(details) 
		
		self.response.headers['Content-Type'] = 'application/json'   
	
		self.response.out.write(content)
'''

# Getmap is called when the user updates the map
# returns a map
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

# Download handler to download the map
# returns a url to download
class DownloadHandler(webapp2.RequestHandler):
    """A servlet to handle requests to load the main web page."""
    
    def get(self):
		
		poly = json.loads(unicode(self.request.get('polygon')))
		
		coords = []
		
		refLow = self.request.get('refLow')
		refHigh = self.request.get('refHigh')
		studyLow = self.request.get('studyLow')
		studyHigh = self.request.get('studyHigh')
			
		for items in poly:
			coords.append([items[0],items[1]])
		
		polygon = ee.FeatureCollection(ee.Geometry.Polygon(coords))
		downloadURL = downloadMap(polygon,coords,refLow,refHigh,studyLow,studyHigh)

		content = json.dumps(downloadURL) 
		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(content)
	
	
	
# Define webapp2 routing from URL paths to web request handlers. See:
# http://webapp-improved.appspot.com/tutorials/quickstart.html
app = webapp2.WSGIApplication([
    ('/details', DetailsHandler),
    ('/downloadHandler', DownloadHandler),
    ('/pieChart', PieChartHandler),
    ('/getmap', GetMapHandler),
    ('/', MainHandler),
])

# ------------------------------------------------------------------------------------ #
# Helper functions
# ------------------------------------------------------------------------------------ #

# function to download the map
# returns a download url
def downloadMap(polygon,coords,ref_start,ref_end,series_start,series_end):

  cumulative = Calculation(ref_start,ref_end,series_start,series_end)
    
  myList = cumulative.toList(500)
   
  fit = ee.Image(myList.get(-1)).select("EVI")
  
  fit = fit.clip(polygon)
  
  path = fit.getDownloadURL({
		'scale': 250,
		'crs': 'EPSG:4326',
		'region': coords
		});

  return path

  

def updateMap(ref_start,ref_end,series_start,series_end):

  cumulative = Calculation(ref_start,ref_end,series_start,series_end)
  
  countries = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw');
  country_names = ['Myanmar (Burma)','Thailand','Laos','Vietnam','Cambodia']; # Specify name of country. Ignored if "use_uploaded_fusion_table" == y
  mekongCountries = countries.filter(ee.Filter.inList('Country', country_names));
  
  myList = cumulative.toList(500)
   
  fit = ee.Image(myList.get(-1)).clip(mekongCountries)
  

  months = ee.Date(series_end).difference(ee.Date(series_start),"month").getInfo()
  
  Threshold1 = months * 0.06
  Threshold2 = months * -0.06
  
  return fit.getMapId({
      'min': Threshold2,
      'max': Threshold1,
      'bands': ' EVI',
      'palette' : '931206,ff1b05,fdff42,4bff0f,0fa713'
  })
	  
def calcPie(feature,ref_start,ref_end,series_start,series_end):


  cumulative = Calculation(ref_start,ref_end,series_start,series_end)
  
  countries = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw');
  country_names = ['Myanmar (Burma)','Thailand','Laos','Vietnam','Cambodia']; # Specify name of country. Ignored if "use_uploaded_fusion_table" == y
  mekongCountries = countries.filter(ee.Filter.inList('Country', country_names));
  
  myList = cumulative.toList(500)
  
  fit = ee.Image(myList.get(-1))
  
  months = ee.Date(series_end).difference(ee.Date(series_start),"month").getInfo()
  
  Threshold1 = months * 0.030
  Threshold2 = months * 0.015

  Threshold3 = months * -0.015
  Threshold4 = months * -0.030
  
  T1 = fit.where(fit.lt(Threshold1),0)
  T1 = T1.where(T1.gt(0),1).reduceRegion(ee.Reducer.sum(), feature.geometry(), REDUCTION_SCALE_METERS).getInfo()['EVI']
  
  T2 = fit.where(fit.lt(Threshold2),0)
  T2 = T2.where(T2.gt(0),1).reduceRegion(ee.Reducer.sum(), feature.geometry(), REDUCTION_SCALE_METERS).getInfo()['EVI']
  
  T3 = fit.where(fit.gt(Threshold3),0)
  T3 = T3.where(T3.lt(0),1).reduceRegion(ee.Reducer.sum(), feature.geometry(), REDUCTION_SCALE_METERS).getInfo()['EVI']
  
  T4 = fit.where(fit.gt(Threshold4),0)
  T4 = T4.where(T4.lt(0),1).reduceRegion(ee.Reducer.sum(), feature.geometry(), REDUCTION_SCALE_METERS).getInfo()['EVI']
  
  T5 = fit.where(fit.gt(-9999),1).reduceRegion(ee.Reducer.sum(), feature.geometry(), REDUCTION_SCALE_METERS).getInfo()['EVI']

  p1 = T1*0.5*0.5 
  p2 = (T2 - T1)*0.5*0.5
  
  m1 = T4*0.5*0.5
  m2 = (T3 - T4)*0.5*0.5
  
  middle = (T5*0.5*0.5) - p1 - p2 - m1 - m2
  
  myArray = [p1,p2,middle,m2,m1]
  
  return myArray
  
   
	
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
	
  collection = ee.ImageCollection(IMAGE_COLLECTION_ID) #.filterDate('2008-01-01', '2010-12-31').sort('system:time_start')
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


def GetFeature(polygon_id,mypath):
  """Returns an ee.Feature for the polygon with the given ID."""
  # Note: The polygon IDs are read from the filesystem in the initialization
  # section below. "sample-id" corresponds to "static/polygons/sample-id.json". 
  path = mypath + polygon_id + '.json'
 
  path = os.path.join(os.path.split(__file__)[0], path)
  with open(path) as f:
    myfeature =  ee.Feature(json.load(f));
  return myfeature


