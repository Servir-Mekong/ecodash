(ns ecodash.application
  (:require [goog.string :as str]
            [reagent.core :as r]))

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

(defn content []
  [:div#ecodash
   [:div#map]
   [:div#ui {:style (get-display-style :ui)}
    [:header
     [:h1 "Map Controls"]
     [:div#collapse-button {:on-click (fn []
                                        (hide-control! :ui)
                                        (show-control! :settings-button))}
      (str/unescapeEntities "&#171;")]
     [:input#info-button {:type "button" :name "info-button" :value "i"
                          :on-click (fn []
                                      (if (visible-control? :info)
                                        (hide-control! :info)
                                        (show-control! :info)))}]]
    [:h2 "Temporal Analysis"]
    [:h3 "Step 1: Select a time period to use as the baseline EVI"]
    [:h3 "Step 2: Select a time period to measure ∆EVI"]
    [:h3 "Step 3: Update the map with the cumulative ∆EVI"]
    [:h2 "Spatial Analysis"]
    [:h3 "Step 1: Choose a polygon selection method"]
    [:h3 "Step 2: Click a polygon on the map or draw your own"]
    [:h3 "Step 3: Review the historical ∆EVI in this region"]]
   [:div#settings-button {:style (get-display-style :settings-button)
                          :on-click (fn []
                                      (hide-control! :settings-button)
                                      (show-control! :ui))}
    (str/unescapeEntities "&#9776;")]
   [:div#general-info {:style (get-display-style :info)}
    [:h1 "Welcome to the Eco Dash"]
    [:p
     "Lorem ipsum dolor sit amet, nam et ac, ligula viverra dictumst"
     " turpis, nibh et vitae duis pulvinar sodales. Nullam viverra voluptas"
     " sit, pede pellentesque pellentesque dui suspendisse. Praesent quisque"
     " ultricies eget in purus viverra, elit neque mauris pretium ac, dolor"
     " massa in ac nulla, tempus per a vel eros vivamus arcu, elit dui mauris."]]
   [:div#legend
    [:h2 "Legend"]
    [:table
     [:tbody
      [:tr
       [:td {:row-span "3"} [:img {:src "/static/images/mylegend.png"}]]
       [:td "Increase"]]
      [:tr
       [:td "Stable"]]
      [:tr
       [:td "Decrease"]]]]]
   [:input#counter {:type "hidden" :name "counter" :value "0"}]])

(defonce country (google.maps.Data.))
(defonce province (google.maps.Data.))

(defn log [& vals]
  (.log js/console (apply str vals)))

(defn init [ee-map-id ee-token country-polygons province-polygons]
  (log ee-map-id)
  (log ee-token)
  (log country-polygons)
  (log province-polygons))
