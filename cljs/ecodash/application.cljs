(ns ecodash.application
  (:require [goog.dom :as dom]
            [goog.string :as str]
            [reagent.core :as r]))

;;===========================
;; Show/Hide Page Components
;;===========================

(defonce visible-controls (r/atom #{:ui}))

(defn visible-control? [control]
  (contains? @visible-controls control))

(defn get-display-style [control]
  (if (visible-control? control)
    {:display "block"}
    {:display "none"}))

(defn show-control! [control]
  (swap! visible-controls conj control))

(defn hide-control! [control]
  (swap! visible-controls disj control))

;;===========================
;; Multi-Range Slider Widget
;;===========================

(defonce slider-vals (r/atom {}))

(defn get-slider-vals [slider-id]
  (let [[min max] (sort (vals (@slider-vals slider-id)))]
    (str min " - " max)))

(defn update-slider-vals! [slider-id idx slider-val]
  (swap! slider-vals assoc-in [slider-id idx] (str slider-val)))

(defn multi-range [slider-id min max step]
  (update-slider-vals! slider-id 0 min)
  (update-slider-vals! slider-id 1 max)
  (fn []
    [:div.range-slider
     [:p (get-slider-vals slider-id)]
     [:input {:type "range" :min (str min) :max (str max)
              :step (str step) :default-value (str min)
              :on-change #(let [val (.-value (.-currentTarget %))]
                            (update-slider-vals! slider-id 0 val))}]
     [:input {:type "range" :min (str min) :max (str max)
              :step (str step) :default-value (str max)
              :on-change #(let [val (.-value (.-currentTarget %))]
                            (update-slider-vals! slider-id 1 val))}]]))

;;==============
;; Map Controls
;;==============

(defonce multi-range1 (multi-range :baseline 2000 2017 1))
(defonce multi-range2 (multi-range :study 2000 2017 1))

(defonce polygon-selection-method (r/atom "Province"))
(defonce polygon-selection (r/atom ""))

(defonce spinner-visible? (r/atom false))

(defn toggle-spinner-visibility! []
  (swap! spinner-visible? not))

(defn get-spinner-visibility []
  (if @spinner-visible?
    {:visibility "visible"}
    {:visibility "hidden"}))

(declare show-map!)

(defn map-controls []
  [:div#controls
   [:hr]
   [:h2 "Spatial Analysis (Map)"]
   [:h3 "Step 1: Select a time period to use as the baseline EVI"]
   [multi-range1]
   [:h3 "Step 2: Select a time period to measure ∆EVI"]
   [multi-range2]
   [:h3 "Step 3: Update the map with the cumulative ∆EVI"]
   [:input {:type "button" :name "update-map" :value "Update Map"
            :on-click #(do (toggle-spinner-visibility!)
                           (show-map!))}]
   [:hr]
   [:h2 "Temporal Analysis (Chart)"]
   [:h3 "Step 1: Choose a polygon selection method"]
   [:ul
    [:li
     [:input {:type "radio" :name "polygon-selection-method" :value "Province"
              :default-checked "checked"
              :on-click #(reset! polygon-selection-method
                                 (.-value (.-currentTarget %)))}]
     [:label "Province"]]
    [:li
     [:input {:type "radio" :name "polygon-selection-method" :value "Country"
              :on-click #(reset! polygon-selection-method
                                 (.-value (.-currentTarget %)))}]
     [:label "Country"]]
    [:li
     [:input {:type "radio" :name "polygon-selection-method" :value "Draw Polygon"
              :on-click #(reset! polygon-selection-method
                                 (.-value (.-currentTarget %)))}]
     [:label "Draw Polygon"]]]
   [:h3 "Step 2: Click a polygon on the map or draw your own"]
   [:p#polygon (str @polygon-selection-method " Selection: " @polygon-selection)]
   [:h3 "Step 3: Review the historical ∆EVI in this region"]
   [:div#chart]])

;;=========================
;; Application Page Layout
;;=========================

(defonce opacity (r/atom 1.0))

(defn update-opacity! [val]
  (reset! opacity val))

(defn content []
  [:div#ecodash
   [:div#map]
   [:div#ui {:style (get-display-style :ui)}
    [:header
     [:h1 "Eco Dash Controls"]
     [:div#collapse-button {:on-click (fn []
                                        (hide-control! :ui)
                                        (show-control! :settings-button))}
      (str/unescapeEntities "&#171;")]
     [:input#info-button {:type "button" :name "info-button" :value "i"
                          :on-click (fn []
                                      (if (visible-control? :info)
                                        (hide-control! :info)
                                        (show-control! :info)))}]]
    [map-controls]]
   [:div#settings-button {:style (get-display-style :settings-button)
                          :on-click (fn []
                                      (hide-control! :settings-button)
                                      (show-control! :ui))}
    (str/unescapeEntities "&#9776;")]
   [:div#general-info {:style (get-display-style :info)}
    [:h1 "Welcome to Eco Dash"]
    [:p
     "Lorem ipsum dolor sit amet, nam et ac, ligula viverra dictumst"
     " turpis, nibh et vitae duis pulvinar sodales. Nullam viverra voluptas"
     " sit, pede pellentesque pellentesque dui suspendisse. Praesent quisque"
     " ultricies eget in purus viverra, elit neque mauris pretium ac, dolor"
     " massa in ac nulla, tempus per a vel eros vivamus arcu, elit dui mauris."]]
   [:div#legend
    [:h2 "∆EVI"]
    [:table
     [:tbody
      [:tr
       [:td {:row-span "3"} [:img {:src "/static/images/mylegend.png"}]]
       [:td "Increase"]]
      [:tr
       [:td "Stable"]]
      [:tr
       [:td "Decrease"]]]]]
   [:div#opacity
    [:p (str "Opacity: " @opacity)]
    [:input {:type "range" :min "0" :max "1" :step "0.1" :default-value "1"
             :on-change #(update-opacity! (.-value (.-currentTarget %)))}]]
   [:p#feedback [:a {:href "https://github.com/Servir-Mekong/ecodash/issues"
                     :target "_blank"}
                 "Give us Feedback!"]]
   [:div.spinner {:style (get-spinner-visibility)}]
   [:input#counter {:type "hidden" :name "counter" :value "0"}]])

;;===================
;; Application Logic
;;===================

;; (defonce country (google.maps.Data.))
;; (defonce province (google.maps.Data.))

(defn log [& vals]
  (.log js/console (apply str vals)))

(defn create-map []
  (google.maps.Map.
   (dom/getElement "map")
   #js {:center #js {:lng 105.8 :lat 11.8}
        :zoom 5
        :maxZoom 12
        :streetViewControl false}))

;; FIXME: stub
(defn init-date-picker []
  nil)

;; FIXME: stub
(defn init-slider [map]
  nil)

;; FIXME: stub
(defn handle-polygon-click []
  nil)

;; FIXME: stub
(defn init-button [map country-polygons province-polygons]
  nil)

;; FIXME: stub
(defn opacity-sliders []
  nil)

;; FIXME: stub
(defn show-map! []
  nil)

(defn get-ee-map-type [ee-map-id ee-token]
  (google.maps.ImageMapType.
   #js {:name "ecomap"
        :opacity 1.0
        :tileSize (google.maps.Size. 256 256)
        :getTileUrl (fn [tile zoom]
                      (str "https://earthengine.googleapis.com/map/"
                           ee-map-id "/" zoom "/" (.-x tile) "/" (.-y tile)
                           "?token=" ee-token))}))

(defn refresh-image [map ee-map-id ee-token]
  (.push (.-overlayMapTypes map)
         (get-ee-map-type ee-map-id ee-token)))

(defn init [ee-map-id ee-token country-polygons province-polygons]
  (log "EE Map ID: " ee-map-id)
  (log "EE Token: " ee-token)
  (log "Countries: " (count country-polygons))
  (log "Provinces: " (count province-polygons))
  (.load js/google "visualization" "1.0")
  (let [counter 0
        map (create-map)]
    (init-date-picker)
    (init-slider map)
    (.addListener (.-data map) "click" (handle-polygon-click)) ;; ???
    (init-button map country-polygons province-polygons)
    (opacity-sliders)
    (refresh-image map ee-map-id ee-token)))
