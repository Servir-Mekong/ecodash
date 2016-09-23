(ns ecodash.application
  (:require [goog.dom :as dom]
            [goog.string :as str]
            [reagent.core :as r]))

(defonce visible-controls (r/atom :ui))

(defn get-display-style [control]
  (if (= @visible-controls control)
    {:display "block"}
    {:display "none"}))

(defn content []
  [:div#ecodash
   [:div#map]
   [:div#ui
    {:style (get-display-style :ui)}
    [:input#counter {:type "hidden" :name "counter" :value 0}]
    [:header
     [:h1 "Eco Dash"]
     [:div#collapse-button
      {:on-click #(reset! visible-controls :settings-button)}
      (str/unescapeEntities "&#171;")]
     [:input#info-button {:type "button" :name "info-button" :value "i"}]]]
   [:div#settings-button
    {:style (get-display-style :settings-button)
     :on-click #(reset! visible-controls :ui)}
    (str/unescapeEntities "&#9776;")]])

(defonce country (google.maps.Data.))
(defonce province (google.maps.Data.))

(defn log [& vals]
  (.log js/console (apply str vals)))

(defn init [ee-map-id ee-token country-polygons province-polygons]
  (log ee-map-id)
  (log ee-token)
  (log country-polygons)
  (log province-polygons))
