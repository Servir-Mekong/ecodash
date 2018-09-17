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
