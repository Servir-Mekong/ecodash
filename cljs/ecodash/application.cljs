(ns ecodash.application
  (:require [goog.dom :as dom]
            [goog.string :as str]
            [reagent.core :as r]
            [cognitect.transit :as transit]
            [cljs-http.client :as http]
            [cljs.core.async :refer [<!]])
  (:require-macros [cljs.core.async.macros :refer [go]]))

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
  (into [] (sort (vals (@slider-vals slider-id)))))

(defn get-formatted-slider-vals [slider-id]
  (let [[min max] (get-slider-vals slider-id)]
    (str min " - " max)))

(defn update-slider-vals! [slider-id idx slider-val]
  (swap! slider-vals assoc-in [slider-id idx] (str slider-val)))

;; FIXME: slider :on-change should:
;; 1. hide div#chart
;; 2. call (.revertStyle (.-data map))
;; 3. (doseq [an-overlay @all-overlays]
;;      (.setMap (.-overlay an-overlay) nil))
;;    (reset! all-overlays [])
(defn multi-range [slider-id min max step]
  (update-slider-vals! slider-id 0 min)
  (update-slider-vals! slider-id 1 max)
  (fn []
    [:div.range-slider
     [:p (get-formatted-slider-vals slider-id)]
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

(defonce polygon-selection-method (r/atom ""))
(defonce polygon-selection (r/atom ""))

(defonce spinner-visible? (r/atom false))

(defn toggle-spinner-visibility! []
  (swap! spinner-visible? not))

(defn get-spinner-visibility []
  (if @spinner-visible?
    {:visibility "visible"}
    {:visibility "hidden"}))

(declare show-map! remove-map-features! enable-province-selection!
         enable-country-selection! enable-custom-polygon-selection!)

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
              :on-click #(do (reset! polygon-selection-method
                                     (.-value (.-currentTarget %)))
                             (remove-map-features!)
                             (enable-province-selection!))}]
     [:label "Province"]]
    [:li
     [:input {:type "radio" :name "polygon-selection-method" :value "Country"
              :on-click #(do (reset! polygon-selection-method
                                     (.-value (.-currentTarget %)))
                             (remove-map-features!)
                             (enable-country-selection!))}]
     [:label "Country"]]
    [:li
     [:input {:type "radio" :name "polygon-selection-method" :value "Draw Polygon"
              :on-click #(do (reset! polygon-selection-method
                                     (.-value (.-currentTarget %)))
                             (remove-map-features!)
                             (enable-custom-polygon-selection!))}]
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
   #js {:center #js {:lng 107.5 :lat 17.0}
        :zoom 5
        :maxZoom 12
        :streetViewControl false}))

(defonce google-map (atom nil))

;; FIXME: do this if checkbox == 1?
(defn remove-map-features! []
  (let [map-features (.-data @google-map)]
    (.forEach map-features #(.remove map-features %))))

(defonce province-names (atom []))

;; FIXME: set checkbox = 1 and CountryorProvince = 0
;; FIXME: remove all map overlays
;; FIXME: (if drawingManager (.setMap drawingManager nil))
(defn enable-province-selection! []
  (let [map-features (.-data @google-map)]
    (doseq [province @province-names]
      (.loadGeoJson map-features (str "/static/province/" province ".json")))
    (.setStyle map-features
               (fn [feature] #js {:fillColor "white"
                                  :strokeColor "white"
                                  :strokeWeight 2}))))

(defonce country-names (atom []))

;; FIXME: set checkbox = 1 and CountryorProvince = 1
;; FIXME: remove all map overlays
;; FIXME: (if drawingManager (.setMap drawingManager nil))
(defn enable-country-selection! []
  (let [map-features (.-data @google-map)]
    (doseq [country @country-names]
      (.loadGeoJson map-features (str "/static/country/" country ".json")))
    (.setStyle map-features
               (fn [feature] #js {:fillColor "white"
                                  :strokeColor "white"
                                  :strokeWeight 2}))))

(defonce css-colors
  ["Aqua" "Black" "Blue" "BlueViolet" "Brown" "Aquamarine" "BurlyWood" "CadetBlue"
   "Chartreuse" "Chocolate" "Coral" "CornflowerBlue" "Cornsilk" "Crimson" "Cyan"
   "DarkBlue" "DarkCyan" "DarkGoldenRod" "DarkGray" "DarkGrey" "DarkGreen"
   "DarkKhaki" "DarkMagenta" "DarkOliveGreen" "Darkorange" "DarkOrchid" "DarkRed"
   "DarkSalmon" "DarkSeaGreen" "DarkSlateBlue" "DarkSlateGray" "DarkSlateGrey"
   "DarkTurquoise" "DarkViolet" "DeepPink" "DeepSkyBlue" "DimGray" "DimGrey"
   "DodgerBlue" "FireBrick" "FloralWhite" "ForestGreen" "Fuchsia" "Gainsboro"
   "GhostWhite" "Gold" "GoldenRod" "Gray" "Grey" "Green" "GreenYellow" "HoneyDew"
   "HotPink" "IndianRed" "Indigo" "Ivory" "Khaki" "Lavender" "LavenderBlush"
   "LawnGreen" "LemonChiffon" "LightBlue" "LightCoral" "LightCyan"
   "LightGoldenRodYellow" "LightGray" "LightGrey" "LightGreen" "LightPink"
   "LightSalmon" "LightSeaGreen" "LightSkyBlue" "LightSlateGray" "LightSlateGrey"
   "LightSteelBlue" "LightYellow" "Lime" "LimeGreen" "Linen" "Magenta" "Maroon"
   "MediumAquaMarine" "MediumBlue" "MediumOrchid" "MediumPurple" "MediumSeaGreen"
   "MediumSlateBlue" "MediumSpringGreen" "MediumTurquoise" "MediumVioletRed"
   "MidnightBlue" "MintCream" "MistyRose" "Moccasin" "NavajoWhite" "Navy" "OldLace"
   "Olive" "OliveDrab" "Orange" "OrangeRed" "Orchid" "PaleGoldenRod" "PaleGreen"
   "PaleTurquoise" "PaleVioletRed" "PapayaWhip" "PeachPuff" "Peru" "Pink" "Plum"
   "PowderBlue" "Purple" "Red" "RosyBrown" "RoyalBlue" "SaddleBrown" "Salmon"
   "SandyBrown" "SeaGreen" "SeaShell" "Sienna" "Silver" "SkyBlue" "SlateBlue"
   "SlateGray" "SlateGrey" "Snow" "SpringGreen" "SteelBlue" "Tan" "Teal" "Thistle"
   "Tomato" "Turquoise" "Violet" "Wheat" "White" "WhiteSmoke" "Yellow"
   "YellowGreen"])

;; FIXME: make sure this is updated correctly
(defonce polygon-counter (atom 0))

;; FIXME: make sure this is updated correctly
(defonce all-overlays (atom #{}))

(defonce my-name (atom []))

;; FIXME: stub
(defn show-chart! [response]
  nil)

;; AJAX Response Example:
;; {:status 200
;;  :success true
;;  :body [[1105228800000 0]
;;         [1105228800000 -720.2132428209686]
;;         [1106611200000 -1655.7901306366732]
;;         ...]
;;  :headers {"content-type" "application/json",
;;            "cache-control" "no-cache",
;;            "content-length" "8589",
;;            "server" "Development/2.0",
;;            "date" "Mon, 26 Sep 2016 01:15:17 GMT"},
;;  :trace-redirects ["/polygon?polygon=(23.845649887659356%2C%2095.09765625)%2C(20.715015145512083%2C%2094.04296875)%2C(19.932041306115536%2C%2097.3828125)%2C(22.350075806124863%2C%2097.8662109375)&refLow=2006&refHigh=2011&studyLow=2005&studyHigh=2014"
;;                    "/polygon?polygon=(23.845649887659356%2C%2095.09765625)%2C(20.715015145512083%2C%2094.04296875)%2C(19.932041306115536%2C%2097.3828125)%2C(22.350075806124863%2C%2097.8662109375)&refLow=2006&refHigh=2011&studyLow=2005&studyHigh=2014"],
;;  :error-code :no-error,
;;  :error-text ""}
(defn custom-overlay-handler [drawing-manager event]
  ;; (show-progress!)
  (swap! all-overlays conj event)
  (swap! polygon-counter inc)
  (let [color (css-colors @polygon-counter)]
    (.setOptions drawing-manager
                 #js {:polygonOptions
                      #js {:fillColor color
                           :strokeColor color}}))
  (let [geom           (-> event .-overlay .getPath .getArray)
        baseline       (get-slider-vals :baseline)
        study          (get-slider-vals :study)
        polygon-url    (str "/polygon?"
                            "polygon=" geom "&"
                            "refLow=" (baseline 0) "&"
                            "refHigh=" (baseline 1) "&"
                            "studyLow=" (study 0) "&"
                            "studyHigh=" (study 1))]
    (log "AJAX Request: " polygon-url)
    (go (let [response (<! (http/get polygon-url))]
          (log "AJAX Response: " response)
          (if (:success response)
            (do (swap! my-name conj (str "my area " @polygon-counter))
                (show-chart! response)
                ;; (hide-progress!)
                )
            (js/alert "An error occurred! Please refresh the page."))))))

(defn enable-custom-polygon-selection! []
  (let [counter         @polygon-counter
        drawing-manager (google.maps.drawing.DrawingManager.
                         #js {:drawingMode google.maps.drawing.OverlayType.POLYGON
                              :drawingControl false
                              :polygonOptions
                              #js {:fillColor (css-colors counter)
                                   :strokeColor (css-colors counter)}})]
    (google.maps.event.addListener drawing-manager
                                   "overlaycomplete"
                                   #(custom-overlay-handler drawing-manager %))
    (.setMap drawing-manager @google-map)))

;; FIXME: stub
(defn show-map! []
  nil)

;; FIXME: stub
(defn handle-polygon-click []
  nil)

;; FIXME: stub
(defn opacity-sliders []
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

(defn refresh-image [ee-map-id ee-token]
  (.push (.-overlayMapTypes @google-map)
         (get-ee-map-type ee-map-id ee-token)))

(defn init [ee-map-id ee-token country-polygons province-polygons]
  (let [json-reader       (transit/reader :json)
        country-polygons  (transit/read json-reader country-polygons)
        province-polygons (transit/read json-reader province-polygons)]
    (log "EE Map ID: " ee-map-id)
    (log "EE Token: " ee-token)
    (log "Countries: " (count country-polygons))
    (log "Provinces: " (count province-polygons))
    (.load js/google "visualization" "1.0")
    (reset! google-map (create-map))
    (reset! country-names country-polygons)
    (reset! province-names province-polygons)
    (.addListener (.-data @google-map) "click" (handle-polygon-click)) ;; ???
    (opacity-sliders)
    (refresh-image ee-map-id ee-token)))
