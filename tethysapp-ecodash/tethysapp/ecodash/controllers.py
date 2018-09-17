from django.shortcuts import render, reverse
from django.contrib.auth.decorators import login_required
from tethys_sdk.gizmos import MapView, Button, SelectInput, MVView, DatePicker, RangeSlider

import ee
import utils

def home(request):
    """
    Controller for the app home page.
    """

    eco_layer = utils.getEcoMap('2002-01-01','2010-12-31','2011-01-01','2015-12-31')

    # Date Picker Options
    before_date_ini = DatePicker(name='before_date_ini',
                              # display_text='Start Date',
                              autoclose=True,
                              format='yyyy-mm-dd',
                              start_date='1/1/1990',
                              start_view='decade',
                              today_button=True,
                              initial='2002-01-01')

    # Date Picker Options
    before_date_end = DatePicker(name='before_date_end',
                              # display_text='End Date',
                              autoclose=True,
                              format='yyyy-mm-dd',
                              start_date='1/1/1990',
                              start_view='decade',
                              today_button=True,
                              initial='2010-12-31')

    # Date Picker Options
    after_date_ini = DatePicker(name='after_date_ini',
                              # display_text='Start Date',
                              autoclose=True,
                              format='yyyy-mm-dd',
                              start_date='1/1/1990',
                              start_view='decade',
                              today_button=True,
                              initial='2011-01-01')

    # Date Picker Options
    after_date_end = DatePicker(name='after_date_end',
                              # display_text='End Date',
                              autoclose=True,
                              format='yyyy-mm-dd',
                              start_date='1/1/1990',
                              start_view='decade',
                              today_button=True,
                              initial='2015-12-31')

    update_button = Button(
        display_text='Update map',
        name='update-button',
        icon='glyphicon glyphicon-refresh',
        style='success'
    )

    download_button = Button(
        display_text='Download Data',
        name='download-button',
        icon='glyphicon glyphicon-download-alt',
        style='success'
    )

    view_options = MVView(
        projection='EPSG:4326',
        center=[0,7.5],
        zoom=3,
        maxZoom=18,
        minZoom=2
    )

    eco_map = MapView(
        height='100%',
        width='100%',
        controls=['FullScreen',
                  {'MousePosition': {'projection': 'EPSG:4326'}}],
        basemap='OpenSteetMap',
        view=view_options
    )

    context = {
        'before_date_ini': before_date_ini,
        'before_date_end': before_date_end,
        'after_date_ini': after_date_ini,
        'after_date_end': after_date_end,
        'update-button': update_button,
        'download_button': download_button,
        'eco_layer': eco_layer,
        'eco_map': eco_map,
        # 'product_selection': product_selection,
    }

    return render(request, 'ecodash/home.html', context)
