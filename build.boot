(task-options!
 pom  {:project     'Servir-Mekong/ecodash
       :version     "1.0.0-SNAPSHOT"
       :description "EVI web explorer for Southeast Asia"
       :url         "http://eco-dash.appspot.com"}
 repl {:eval        '(set! *warn-on-reflection* true)})

(set-env!
 :source-paths   #{"cljs"}
 :resource-paths #{"static"}
 :dependencies   '[[org.clojure/clojure         "1.8.0"]
                   [org.clojure/clojurescript   "1.8.51"]
                   [org.clojure/core.async      "0.2.391"]
                   [cljs-http                   "0.1.41"]
                   [reagent                     "0.6.0"]
                   [adzerk/boot-cljs            "1.7.228-1" :scope "test"]
                   [adzerk/boot-cljs-repl       "0.3.0"     :scope "test"]
                   [crisptrutski/boot-cljs-test "0.2.1"     :scope "test"]
                   [com.cemerick/piggieback     "0.2.1"     :scope "test"]
                   [weasel                      "0.7.0"     :scope "test"]
                   [org.clojure/tools.nrepl     "0.2.12"    :scope "test"]])

(require
  '[adzerk.boot-cljs      :refer [cljs]]
  '[adzerk.boot-cljs-repl :refer [cljs-repl start-repl]])

(deftask dev []
  (comp (watch)
        (cljs-repl)
        (cljs :optimizations    :none
              :source-map       true
              :compiler-options {:asset-path "static/ecodash.out"})
        (target :dir #{"target"})))

(deftask prod []
  (comp (cljs :optimizations :advanced
              :source-map    true)
        (target :dir #{"target"})))
