from tethys_sdk.base import TethysAppBase, url_map_maker


class Ecodash(TethysAppBase):
    """
    Tethys app class for EcoDash.
    """

    name = 'EcoDash'
    index = 'ecodash:home'
    icon = 'ecodash/images/ecodash_logo.png'
    package = 'ecodash'
    root_url = 'ecodash'
    color = '#003a00'
    description = 'Place a brief description of your app here.'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='ecodash',
                controller='ecodash.controllers.home'
            ),
            UrlMap(
                name='update_map',
                url='ecodash/update_map',
                controller='ecodash.ajax_controllers.update_map'
            ),
            UrlMap(
                name='time_series',
                url='ecodash/time_series',
                controller='ecodash.ajax_controllers.time_series'
            ),
            UrlMap(
                name='export_data',
                url='ecodash/export_data',
                controller='ecodash.ajax_controllers.export_data'
            ),
        )

        return url_maps
