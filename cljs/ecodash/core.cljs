(ns ecodash.core
  (:require [goog.dom :as dom]
            [reagent.core :as r]))

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
    [:img#google {:src "/static/images/googlelogo_color_272x92dp.png"}]
    [:img#adpc   {:src "/static/images/adpclogo.jpg"}]
    [:img#servir {:src "/static/images/servir.png"}]]
   [:nav
    [:ul
     [:li (make-nav-link-style 0) "Home"]
     [:li (make-nav-link-style 1) "About"]
     [:li (make-nav-link-style 2) "Application"]]]])

(defn page-content []
  [:div
   [:h1 "Eco Dash"]])

(defn ^:export main []
  (r/render [page-header] (dom/getElement "pageheader"))
  (r/render [page-content] (dom/getElement "pagecontent")))
