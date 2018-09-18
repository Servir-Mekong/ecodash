# EcoDash
A web application for providing a near real-time method for quantifying vegetation using cloud computing technology and remote-sensing data <a href="http://tethys.sig-gis.com/apps/ecodash">http://tethys.sig-gis.com/apps/ecodash</a>.

![Screenshot](static/images/screenshot.png)

Dependencies are:
- tethysplatform
- ee

## Installation

```terminal
git clone https://github.com/servir-mekong/ecodash.git
cd ecodash

git checkout branch tethysapp

cd tethysapp-ecodash
```

To install in development server
```
python setup.py develop
```
To install in production server
```
python setup.py install
```

