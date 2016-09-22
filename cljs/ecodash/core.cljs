(ns ecodash.core
  (:require [goog.dom :as dom]
            [reagent.core :as r]))

(defn page-body []
  [:header
   [:div#logos
    [:img#usaid  {:src "/static/images/usaid.png"}]
    [:img#nasa   {:src "/static/images/nasa.png"}]
    [:img#google {:src "/static/images/googlelogo_color_272x92dp.png"}]
    [:img#adpc   {:src "/static/images/adpclogo.jpg"}]
    [:img#servir {:src "/static/images/servir.png"}]]
   [:nav
    [:ul
     [:li {:on-click #(js/alert "Clicked Home")} "Home"]
     [:li {:on-click #(js/alert "Clicked About")} "About"]
     [:li {:on-click #(js/alert "Clicked Application")} "Application"]]]])

(defn ^:export main []
  (r/render [page-body] (dom/getElement "ecodash")))
