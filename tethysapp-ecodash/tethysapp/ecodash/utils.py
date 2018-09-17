import ee
import math
import datetime


# set the collection ID
IMAGE_COLLECTION_ID1 = ee.ImageCollection('MODIS/006/MYD13Q1')
IMAGE_COLLECTION_ID2 = ee.ImageCollection('MODIS/006/MOD13A1')

IMAGE_COLLECTION_ID =  IMAGE_COLLECTION_ID1.merge(IMAGE_COLLECTION_ID2);

Adm_bounds = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw')#ee.FeatureCollection('USDOS/LSIB/2013')


def initEE(serviceAccount,keyFile):
    credentials = ee.ServiceAccountCredentials(serviceAccount, keyFile)
    ee.Initialize(credentials)
    return


def getTileLayerUrl(ee_image_object):
    map_id = ee.Image(ee_image_object).getMapId()
    tile_url_template = "https://earthengine.googleapis.com/map/{mapid}/{{z}}/{{x}}/{{y}}?token={token}"
    return tile_url_template.format(**map_id)


def getEcoMap(before_start,before_end,after_start,after_end):

  cumulative = Calculation(before_start,before_end,after_start,after_end)

  myList = cumulative.toList(500)

  fit = ee.Image(myList.get(-1)) #.clip(mekongCountries)

  months = ee.Date(after_end).difference(ee.Date(after_start),"month").getInfo()

  Threshold1 = months * 0.06
  Threshold2 = months * -0.06

  return getTileLayerUrl(fit.visualize(**{
      'min': Threshold2,
      'max': Threshold1,
      'bands': 'EVI',
      'palette' : '931206,ff1b05,fdff42,4bff0f,0fa713'
  }))



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

  featureArea = feature.geometry().area().getInfo()

  print(featureArea)

  if featureArea > 50000*1E6:
      REDUCTION_SCALE_METERS = 10000

  """Returns a series of brightness over time for the polygon."""
  cumulative = Calculation(ref_start,ref_end,series_start,series_end)

  # Compute the mean brightness in the region in each image.
  def ComputeMean(img):
    reduction = img.reduceRegion(
        ee.Reducer.mean(), feature.geometry(), REDUCTION_SCALE_METERS,None,None,True)
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

def Calculation(before_start,before_end,after_start,after_end):

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
      qual = getQABits(QA,2, 5, 'quality_flag');
      mask = clouds.eq(0).And(land.eq(1))
      # Return an image masking out cloudy areas.
      return img.updateMask(mask.And(qual.lt(12)));

  collection = ee.ImageCollection(IMAGE_COLLECTION_ID).map(maskPoorQuality)
  reference = collection.filterDate(before_start,before_end).sort('system:time_start').select('EVI')
  series = collection.filterDate(after_start, after_end).sort('system:time_start').select('EVI')

  def calcMonthlyMean(ref,col):

      mylist = ee.List([])
      years = range(int(after_start[0:4]),int(after_end[0:4])+1)
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

  time0 = ee.Image(series.first()).get('system:time_start')
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
