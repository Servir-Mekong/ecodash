(ns ecodash.application
  (:require [goog.dom :as dom]
            [reagent.core :as r]))

(defn content []
  [:h1 "Application"])

(defonce country (google.maps.Data.))
(defonce province (google.maps.Data.))

(defn init [ee-map-id ee-token country-polygons province-polygons]
  (js/alert ee-map-id)
  (js/alert ee-token)
  (js/alert country-polygons)
  (js/alert province-polygons))
