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

(def home-page
  [:div#home
   [:h1 "Eco Dash"]
   [:h2 "Spatio-temporal EVI Mapping"]
   [:h3 "Explore historic vegetation change."]
   [:hr]
   [:p
    "Eco Dash is a collaborative effort between its developers and its "
    "community of users. We welcome suggestions for improvements on our "
    [:a {:href "https://github.com/Servir-Mekong/ecodash/issues"} "Github"]
    " issues page."]])

(def about-page
  [:div#about
   [:h1 "About Eco Dash"]
   [:p (str "Eco Dash is a custom built, open-source, high resolution satellite"
            " image viewing and interpretation system that is being developed"
            " by SERVIR-Mekong as a tool for use in projects that require land"
            " cover and/or land use reference data. Mapcha promotes consistency"
            " in locating, interpreting, and labeling reference data plots for"
            " use in classifying and monitoring land cover / land use change."
            " The full functionality of Mapcha including collaborative"
            " compilation of reference point databases is implemented online"
            " so there is no need for desktop installation.")]
   [:a {:href "http://www.sig-gis.com"} [:img {:src "/static/images/logosig.png"}]]
   [:p
    "Copyright &copy; "
    [:a {:href "http://www.sig-gis.com"} "SIG-GIS"]
    " 2016"]])

(defn page-content []
  (case @active-link
    0 home-page
    1 about-page
    2 [:h1 "Application"]))

(defn ^:export main []
  (r/render [page-header] (dom/getElement "pageheader"))
  (r/render [page-content] (dom/getElement "pagecontent")))
