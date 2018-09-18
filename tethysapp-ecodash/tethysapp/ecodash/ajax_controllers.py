import ast
import utils
import json
from django.http import JsonResponse
import datetime

def update_map(request):
    return_obj = {}

    if request.method == 'POST':
        try:
            info = request.POST;
            biDate = info.get('biDate')
            beDate = info.get('beDate')
            aiDate = info.get('aiDate')
            aeDate = info.get('aeDate')

            eco_layer = utils.getEcoMap(biDate,beDate,aiDate,aeDate)

            return_obj["url"] = eco_layer
            return_obj["success"] = "success"

        except Exception as e:
            return_obj["error"] = "Error Processing Request. Error: "+ str(e)

    return JsonResponse(return_obj)


def time_series(request):
    return_obj = {}

    if request.method == 'POST':
        try:
            info = request.POST;
            biDate = info.get('biDate')
            beDate = info.get('beDate')
            aiDate = info.get('aiDate')
            aeDate = info.get('aeDate')
            coords_C = ast.literal_eval(info.get('coordsC'))
            coords_I = ast.literal_eval(info.get('coordsI'))

            print(coords_C['coordinates'])
            print(coords_I['coordinates'])

            controlTimeSeries = utils.ComputePolygonTimeSeries(coords_C,biDate,beDate,aiDate,aeDate)
            interventionTimeSeries = utils.ComputePolygonTimeSeries(coords_I,biDate,beDate,aiDate,aeDate)

            diff = []
            for i in range(len(controlTimeSeries)):
                off = interventionTimeSeries[i][1] - controlTimeSeries[i][1]
                diff.append([controlTimeSeries[i][0],off])

            return_obj["control"] = controlTimeSeries
            return_obj["intervention"] = interventionTimeSeries
            return_obj["difference"] = diff
            return_obj["success"] = "success"

        except Exception as e:
            return_obj["error"] = "Error Processing Request. Error: "+ str(e)

    return JsonResponse(return_obj)

def export_data(request):
    return_obj = {}

    if request.method == 'POST':
        try:
            info = request.POST;
            biDate = info.get('biDate')
            beDate = info.get('beDate')
            aiDate = info.get('aiDate')
            aeDate = info.get('aeDate')
            coords = ast.literal_eval(info.get('coords'))

            download_url = utils.GetDownloadURL(coords,biDate,beDate,aiDate,aeDate)

            return_obj["url"] = download_url
            return_obj["success"] = "success"

        except Exception as e:
            return_obj["error"] = "Error Processing Request. Error: "+ str(e)

    return JsonResponse(return_obj)
