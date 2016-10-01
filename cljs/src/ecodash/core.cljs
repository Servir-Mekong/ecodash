(ns ecodash.core
  (:require [goog.dom :as dom]
            [goog.string :as str]
            [reagent.core :as r]
            [ecodash.application :as app]))

;;=============
;; Page Header
;;=============

(defonce active-link (r/atom 0))

(defonce hover-link (r/atom nil))

(defn make-nav-link-style [link-num]
  {:class (if (or (= @active-link link-num)
                  (= @hover-link link-num))
            "highlight" "")
   :on-mouse-over #(reset! hover-link link-num)
   :on-mouse-out #(reset! hover-link nil)
   :on-click #(reset! active-link link-num)})

(defn page-header []
  [:header
   [:div#logos
    [:img#usaid  {:src "/static/images/usaid.png"}]
    [:img#nasa   {:src "/static/images/nasa.png"}]
    [:img#adpc   {:src "/static/images/adpclogo.jpg"}]
    [:img#servir {:src "/static/images/servir.png"}]]
   [:nav
    [:ul
     [:li (make-nav-link-style 0) "Home"]
     [:li (make-nav-link-style 1) "About"]]]])

;;===========
;; Page Body
;;===========

(defn make-page-visibility-style [link-num]
  (if (= @active-link link-num)
    {:style {:visibility "visible"}}
    {:style {:visibility "hidden"}}))

(defn about-page [page-visibility]
  [:div#about page-visibility
   [:h1 "About the Sustainable Landscapes Ecosystem Monitoring Tool"]
   [:p
    "Maintaining ecological stability and/or biological productivity over a"
    " large area is a common goal of landscape scale policy or management"
    " interventions. The development of this tool was prompted by a need"
    " expressed by project managers to track the success of their efforts in"
    " this context. In the current version, the focus is on the Enhanced"
    " Vegetation Index (EVI) calculated using MODIS multispectral data with"
    " a pixel resolution of 250 x 250 m. EVI is a measure of relative biomass"
    " particularly suited to high-biomass areas of the globe."]
   [:p
    "The tool is made possible by connecting the user interface with Google"
    " Earth Engine, a cloud computing platform that links extensive data archives"
    " with substantial processing power. This architecture makes formerly heavy"
    " analyses time and cost effective for users. The  comparison of broad-scale"
    " biological productivity in an area from one period to another has"
    " applications beyond projects seeking to monitor the effects of their"
    " interventions. This tool can also potentially be used to provide insight"
    " into changes related to climate change, urban expansion, infrastructure"
    " development, and other impacts."]
   [:p
    "Beyond the comparison of EVI, the design of this tool reflects a more"
    " general \"proof of concept\" of an application that is particularly"
    " well-served by large scale remotely sensed data: the comparison of"
    " conditions in a large area from one time period with another using"
    " calculations based on remotely sensed gridded data. In its general"
    " architecture, the tool can support the analysis of any type of gridded"
    " data and future iterations will allow users to select from a number of"
    " possible datasets."]
   [:hr]
   [:h1 "Development and Acknowledgment"]
   [:p
    "This tool was developed by SERVIR-Mekong in close consultation with the"
    " Vietnam Forests and Deltas project and their partners in Vietnam, in"
    " particular the Ministry of Agriculture and Rural Development and"
    " constituent agencies."]
   [:p
    "The Python code for Google Earth Engine was developed by Winrock International"
    " in partnership with members of the Google Earth Engine team."]
   [:p
    "The user interface was developed by Spatial Informatics Group (SIG) using"
    " Clojurescript, Google Closure, and the Google App Engine SDK."]
   [:div#about-logos
    [:img {:src "/static/images/servir.png"}]
    [:img {:src "/static/images/usaid.png"}]
    [:img {:src "/static/images/nasa.png"}]
    [:img {:src "/static/images/adpclogo.jpg"}]
    [:img {:src "/static/images/googlelogo_color_272x92dp.png"}]
    [:img {:src "/static/images/logosig.png"}]
    [:img {:src "/static/images/winrocklogo.jpg"}]
    [:img {:src "/static/images/mardlogo.jpg"}]
    [:img {:src "/static/images/sei_tr.png"}]
    [:img {:src "/static/images/deltares_tr.png"}]]
   [:p#copyright
    "Copyright "
    (str/unescapeEntities "&copy;")
    " Winrock and "
    [:a {:href "http://www.sig-gis.com" :target "_blank"} "SIG-GIS"]
    " 2016"]
   [:div#bottom-spacer]])

(defn page-content []
  [:div#all-pages
   [app/content (make-page-visibility-style 0)]
   [about-page  (make-page-visibility-style 1)]])

;;==================
;; CLJS Entry Point
;;==================

(defn ^:export main [ee-map-id ee-token country-polygons province-polygons]
  (r/render [page-header] (dom/getElement "pageheader"))
  (r/render [page-content] (dom/getElement "pagecontent"))
  (app/init ee-map-id ee-token country-polygons province-polygons))
