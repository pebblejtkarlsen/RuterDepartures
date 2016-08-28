/**
 * @Author: Jan Karlsen
 * @Version: 1.0.0
 */

var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');

// Text variables
var stopsMenuTitle = 'Nearby stops';
var getLocationText = 'Determining location';
var getStopsText = 'Fetching stops';
var getDeparturesText = 'Fetching departures';
var errorLocationText = 'Unable to determine location';
var errorStopsText = 'Unable to fetch stops';
var errorDeparturesText = 'Unable to fetch departure data';

// URL variables
var baseUrl = 'http://reisapi.ruter.no/';

// Show splash screen while waiting for data
var splashWindow = new UI.Window();
// Text element to inform user
var text = new UI.Text({
  position: new Vector2(0, 0),
  size: new Vector2(144, 168),
  text:'Starter opp',
  font:'GOTHIC_28_BOLD',
  color:'black',
  textOverflow:'wrap',
  textAlign:'center',
  backgroundColor:'white'
});

// Add to splashWindow and show
splashWindow.add(text);
splashWindow.show();

function setupStopsMenu(stops) {
	var items = [];
  for(var i = 0; i < stops.length; i++) {
    // Always upper case the description string
    var title = stops[i].Name;
    title = title.charAt(0).toUpperCase() + title.substring(1);

    // Add to menu items array
    items.push({
      title:title,
      subtitle:''
    });
  }

  // Construct Menu to show to user
	var stopsMenu = new UI.Menu({
		sections: [{
			title: stopsMenuTitle,
			items: items
		}]
	});
	
	// Add a click listener for select button click
	stopsMenu.on('select', function(event) {
		getDepartures(stops[event.itemIndex]);
	});

	// Show the Menu, hide the splash
	stopsMenu.show();
	splashWindow.hide();
}

function getDepartures(stop, oldMenu) {
	showInfo(getDeparturesText);
	var stopId = stop.ID;
	
	var getDeparturesURL = baseUrl+'StopVisit/GetDepartures/'+stopId;
	ajax(
  {
		url: getDeparturesURL,
    type: 'json'
  },
  function(data) {
    // Success!
    console.log("Successfully fetched departures data!");
		console.log(JSON.stringify(data));
		var departures = data.slice(0,29);
		console.log(JSON.stringify(departures));
		displayDepartures(stop, departures, oldMenu);
  },
  function(error) {
    // Failure!
    console.log('Failed fetching departures data: ' + JSON.stringify(error));
		showInfo(errorDeparturesText);
  }
	);
}

function displayDepartures(stop, departures, oldMenu) {
	var items = [];
	for (var i = 0; i<departures.length; i++)  {
		var title = departures[i].MonitoredVehicleJourney.LineRef+' '+departures[i].MonitoredVehicleJourney.DestinationName;
		var time = formatTimeMinutes(departures[i].MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime)+' Platf. '+departures[i].MonitoredVehicleJourney.MonitoredCall.DeparturePlatformName;
    // Add to menu items array
    items.push({
      title:title,
      subtitle:time
    });
	}
	if (oldMenu !== undefined) {
		oldMenu.hide();
	}	
	var departuresMenu = new UI.Menu({
		sections: [{
			title: stop.Name,
			items: items
		}]
	});
	
	departuresMenu.on('longSelect', function() {
		getDepartures(stop, departuresMenu);
	});
	departuresMenu.on('select', function(event) {
		displaySingleDeparture(stop, departures[event.itemIndex]);
	});
	
	departuresMenu.show();
	splashWindow.hide();
}

function displaySingleDeparture(stop, departure) {

	var title = new UI.Text({
		text: departure.MonitoredVehicleJourney.LineRef+' '+departure.MonitoredVehicleJourney.DestinationName,
		position: new Vector2(0, 0),
		size: new Vector2(144, 40),
		font:'GOTHIC_28_BOLD',
		color:'white',
		textOverflow:'fill',
		textAlign:'left',
		backgroundColor:'black'
	});
	var time = new UI.Text({
		text: formatTimeSeconds(departure.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime),
		position: new Vector2(0, 40),
		size: new Vector2(144, 60),
		font:'Bitham_42_Bold',
		color:'black',
		textOverflow:'wrap',
		textAlign:'center',
		backgroundColor:'white'
	});
	var platformText = 'Platform '+departure.MonitoredVehicleJourney.MonitoredCall.DeparturePlatformName;
	var height=calculateUITextHeight(30, 16, platformText);
	var platform = new UI.Text({
		text: platformText,
		position: new Vector2(0, 100),
		size: new Vector2(144, height),
		font:'GOTHIC_28_BOLD',
		color:'white',
		textOverflow:'wrap',
		textAlign:'left',
		backgroundColor:'black'
	});
	var departureWindow = new UI.Window({scrollable: true});
	departureWindow.add(title);
	departureWindow.add(time);
	departureWindow.add(platform);
	departureWindow.show();
	
	var elapsedTimeCounter = 0;
	var elapsedTimeInterval = setInterval(function(){ 
		console.log(elapsedTimeCounter);
		elapsedTimeCounter++;
		time.text(formatTimeSeconds(departure.MonitoredVehicleJourney.MonitoredCall.ExpectedDepartureTime));
		if (elapsedTimeCounter === 60) {
			elapsedTimeCounter = 0;
			updateDepartureTime(stop, departure);
		}
  }, 1000);
	
	departureWindow.on('hide', function() {
		clearInterval(elapsedTimeInterval);
	});
}

/**
	*
	* Three next functions copied from: https://forums.getpebble.com/discussion/27182/pebble-js-sizing-ui-text-element-with-dynamic-text
	*
**/
function strTruncate(string, width) {
	string = string.replace(/[\s\r\n]+/, ' ');
	if (string.length >= width) {
    var result = string[width - 1] === ' ' ? string.substr(0, width - 1) : string.substr(0, string.substr(0, width).lastIndexOf(' '));
    if (result.length === 0)
      result = string.substr(0, width - 1);
    return result;
	}
	return string;
}
function strTruncateWhole(string, width) {
	var arr = [];
	string = string.replace(/[\s\r\n]+/, ' ');
	var b = 0;
	while (b < string.length) {
		arr.push(strTruncate(string.substring(b), width));
		b += arr[arr.length - 1].length;
	}
	return arr;
}
function calculateUITextHeight(fontSize, charsPerLine, string) {
	var split = strTruncateWhole(string, charsPerLine);
	var height = split.length * fontSize;
	return height;
}
/**
	End of copied code
**/


function updateDepartureTime(stop, departure) {
	var stopId = stop.ID;
	var getDeparturesURL = baseUrl+'StopVisit/GetDepartures/'+stopId;
	ajax(
  {
		url: getDeparturesURL,
    type: 'json'
  },
  function(data) {
    console.log("Successfully fetched departures data!");
		console.log(JSON.stringify(data));
		for (var i = 0; i<data.length; i++) {
			if (departure.MonitoredVehicleJourney.BlockRef === data[i].MonitoredVehicleJourney.BlockRef) {
				departure = data[i];
				break;
			}
		}
  },
  function(error) {
    console.log('Failed fetching departures data: ' + JSON.stringify(error));
  }
	);
}

function formatTimeMinutes(departureTimeString) {
	var currentTime = new Date();
	var departureTime = new Date(departureTimeString);
	if (departureTime - currentTime < 15*60*1000) {
		return Math.floor((departureTime - currentTime)/1000/60) + ' Min.';
	}	
	return departureTime.getHours()+':'+departureTime.getMinutes();
}

function formatTimeSeconds(departureTimeString) {
	var currentTime = new Date();
	var departureTime = new Date(departureTimeString);
	var diffTime = departureTime - currentTime;
	var diffHours = Math.floor(diffTime/1000/60/60);
	var diffMinutes = Math.floor(diffTime/1000/60);
	var diffSeconds = Math.floor(diffTime/1000);
	if (diffHours > 0) {
		return 'H'+leadingZero(diffHours)+':'+leadingZero(diffMinutes%60);
	} else {
		if (diffSeconds < 0) {
			return '-'+leadingZero(diffMinutes%60)+':'+leadingZero(diffSeconds%60);
		}
		return leadingZero(diffMinutes%60)+':'+leadingZero(diffSeconds%60);
	}
}

function leadingZero(n) {
	var number = (n+'').replace('-', '');
	if ((number+'').length < 2) {
		return "0" + number;
	} else return number;
}

function showInfo(message) {
	splashWindow.hide();
	splashWindow = new UI.Window();
	var text = new UI.Text({
		position: new Vector2(0, 0),
		size: new Vector2(144, 168),
		text: message,
		font:'GOTHIC_28_BOLD',
		color:'black',
		textOverflow:'wrap',
		textAlign:'center',
		backgroundColor:'white'
	});
  splashWindow.add(text);
	splashWindow.show();
}


var locationOptions = {
  enableHighAccuracy: true, 
  maximumAge: 0, 
  timeout: 10000
};

function locationSuccess(pos) {
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);
	getClosestStops(pos.coords.latitude, pos.coords.longitude);
	// Testing coordinates in Oslo city center: getClosestStops(59.9101063,10.7499532)
}

function locationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
	showInfo(errorLocationText);
}

function getClosestStops(lat, long) {
	showInfo(getStopsText);
	var latlong = {lat: lat, long: long};
	var utmCoords = UTMConverter.converter.latLonToUTM(latlong);
	console.log('UTM COORDS: '+JSON.stringify(utmCoords));
	var getClosestStopsURL = baseUrl+'Place/GetClosestStops?coordinates=(X='+utmCoords.easting.toFixed(0)+',Y='+utmCoords.northing.toFixed(0)+')&proposals=10&maxdistance=2000';
	// Make the request
	ajax(
  {
		url: getClosestStopsURL,
    type: 'json'
  },
  function(data) {
    // Success!
    console.log("Successfully fetched stops data!");
		console.log(JSON.stringify(data));

		setupStopsMenu(data);
  },
  function(error) {
    // Failure!
    console.log('Failed fetching stops data: ' + JSON.stringify(error));
		showInfo(errorStopsText);
  }
	);
}

showInfo(getLocationText);
// Request current position
navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);







/*
 *
 * Not written by me, copied from GitHub at: https://github.com/s3rgiosan/utm-utilities/blob/bc3a142414c8ca8d61f3088389aeb578e52d60a7/utm.converter.js
 *
 * Coordinate Converter
 *
 * References:
 *  http://www.ibm.com/developerworks/java/library/j-coordconvert/index.html
 *  http://en.wikipedia.org/wiki/Universal_Transverse_Mercator_coordinate_system
 *
 * @version 1.0.0
 * @author  Sérgio Santos
 * @email   me@s3rgiosan.com
 * @url     http://s3rgiosan.com
 */

var UTMConverter = {
  semiMajor:  6378137,                // Equatorial radius
  semiMinor:  6356752.314,            // Polar radius
  e:          0.081819190842622,      // Eccentricity
  k0:         0.9996,                 // Scale factor
  sin1:       Math.PI / (180 * 3600), // Seconds to radians
  debug:      false,
  utils: {
    /*
     * Calculate the eccentricity prime squared
     */
    e1sq: function() {
      
      var e1sq = UTMConverter.e * UTMConverter.e / (1 - UTMConverter.e * UTMConverter.e);
      
      if(UTMConverter.debug) {
        console.log("e: %d", UTMConverter.e);
        console.log("e1sq: %d", e1sq);
      }
      return e1sq;
    },

    /*
     * Convert degrees to radians
     * 
     * @params  {Number} degree: Coordinate in degrees
     */
    degreeToRadian: function(degree) {

      var rad = degree * Math.PI / 180;

      if(UTMConverter.debug) {
        console.log("degreeToRadian: %d -> %d", degree, rad);
      }
      return rad;
    },

    /*
     * Convert radians to degrees
     *
     * @params  {Number} radian: Coordinate in radians
     */
    radianToDegree: function(radian) {

      var deg = radian * 180 / Math.PI;

      if(UTMConverter.debug) {
        console.log("radianToDegree: %d -> %d", radian, deg);
      }
      return deg;
    },

    /*
     * Check if a pair latitude and longitude is valid
     *
     * @params  {Number} lat: Latitude in degrees
     * @params  {Number} lon: Longitude in degrees
     */
    validLatLon: function(lat, lon) {
      if(isNaN(lat) || lat < -90.0 || lat > 90.0) {
        console.log("Invalid range: "+ lat);
        return false;
      } 
      if(isNaN(lon) || lon < -180.0 || lon >= 180.0) {
        console.log("Invalid range: "+ lon);
        return false;
      }
      return true;
    },

    /*
     * Calculate the UTM zone
     *
     * @params  {Number} lon: Longitude in degrees
     */
    calcUTMZone: function(lon) {

      var zone;
      if(lon < 0) {
        zone = Math.floor((lon + 180) / 6) + 1;
      }
      else {
        zone = Math.floor(lon / 6) + 31;
      }

      if(UTMConverter.debug) {
        console.log("zone for %d: %d", lon, zone);
      }
      return zone;
    },

    /*
     * Calculate the central meridian of an UTM zone
     * @params  {Number} zone: UTM zone number
     */
    calcCentralMeridian: function(zone) {

      var zoneCM = 6 * zone - 183;

      if(UTMConverter.debug) {
        console.log("zoneCM for %d: %d", zone, zoneCM);
      }
      return zoneCM;
    },

    /*
     * Calculate the meridional arc length
     *
     * @params  {Number} lat: Latitude in radians
     */
    calcMeridianArc: function(lat) {
      
      var n = (UTMConverter.semiMajor - UTMConverter.semiMinor) / (UTMConverter.semiMajor + UTMConverter.semiMinor);
      
      var A0 = UTMConverter.semiMajor * (1 - n + (5 * Math.pow(n, 2) / 4) * (1 - n) + (81 * Math.pow(n, 4) / 64) * (1 - n));
      var B0 = (3 * UTMConverter.semiMajor * n / 2) * (1 - n - (7 * Math.pow(n, 2) / 8) * (1 - n) + 55 * Math.pow(n, 4) / 64);
      var C0 = (15 * UTMConverter.semiMajor * Math.pow(n, 2) / 16) * (1 - n + (3 * Math.pow(n, 2) / 4) * (1 - n));
      var D0 = (35 * UTMConverter.semiMajor * Math.pow(n, 3) / 48) * (1 - n + 11 * Math.pow(n, 2) / 16);
      var E0 = (315 * UTMConverter.semiMajor * Math.pow(n, 4) / 51) * (1 - n);

      var arc = A0 * lat - B0 * Math.sin(2 * lat) + C0 * Math.sin(4 * lat) - D0 * Math.sin(6 * lat) + E0 * Math.sin(8 * lat);

      if(UTMConverter.debug) {
        console.log("meridian arc: %d", arc);
      }

      return arc;
    },

    /*
     * Get the northing
     * 
     * @params  {Number} lat: Latitude in radians
     * @params  {Number} p: Delta long
     * @params  {Number} K1: First coefficient
     * @params  {Number} K2: Second coefficient
     * @params  {Number} K3: Third coefficient
     */
    getNorthing: function(lat, p, K1, K2, K3) {

      var northing = K1 + K2 * p * p + K3 * Math.pow(p, 4);
      if(lat < 0.0) {
        northing = 10000000 + northing;
      }

      if(UTMConverter.debug) {
        console.log("northing: %d", northing);
      }
      return northing;
    },

    /*
     * Get the easting
     * 
     * @params  {Number} p: Delta long
     * @params  {Number} K4: Fourth coefficient
     * @params  {Number} K5: Fifth coefficient
     */
    getEasting: function(p, K4, K5) {

      var easting = 500000 + (K4 * p + K5 * Math.pow(p, 3));

      if(UTMConverter.debug) {
        console.log("easting: %d", easting);
      }
      return easting;
    },

    /*
     * Get the long zone
     *
     * @params  {Number} zone: UTM zone number
     */
    getLongZone: function(zone) {

      var longZone = 8 * ((zone - 1) % 3) + 1;

      if(UTMConverter.debug) {
        console.log("longZone: %d", longZone);
      }
      return longZone;
    },

    /*
     * Get the lat zone
     *
     * @params  {Number} zone: UTM zone number
     */
    getLatZone: function(zone) {

      var latZone = 1 + 5 * ((zone - 1) % 2);

      if(UTMConverter.debug) {
        console.log("latZone: %d", latZone);
      }
      return latZone;
    },

    /*
     * Check if a set of UTM coordinates is valid
     *
     * @params  {Number} easting: Easting
     * @params  {Number} northing: Northing
     * @params  {Number} zone: UTM zone
     */
    validUTM: function(easting, northing, zone) {
      if(isNaN(easting) || easting > 900000 || easting < 100000) {
        console.log("Invalid range: %d", easting);
        return false;
      } 
      if(isNaN(northing) || northing > 10002000 || northing < -10002000) {
        console.log("Invalid range: %d", northing);
        return false;
      }
      if(isNaN(zone) || zone > 60 || zone < 1) {
        console.log("Invalid range: %d", zone);
        return false;
      }
      return true;
    },

    /*
     * Calculate the footprint latitude
     *
     * @params  {Number} northing: Northing
     */
    calcFootprintLat: function(northing) {
      
      var arc = northing / UTMConverter.k0;
      var mu = arc / (UTMConverter.semiMajor * (1 - Math.pow(UTMConverter.e, 2) / 4 - 3 * Math.pow(UTMConverter.e, 4) / 64 - 5 * Math.pow(UTMConverter.e, 6) / 256));
      var e1 = (1 - Math.pow(1 - UTMConverter.e * UTMConverter.e, 1/2)) / (1 + Math.pow(1 - UTMConverter.e * UTMConverter.e, 1/2));
      var CA = 3 * e1/2 - 7 * Math.pow(e1, 3) / 32;
      var CB = 21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32;
      var CC = 151 * Math.pow(e1, 3) / 96;
      var CD = 1097 * Math.pow(e1, 4) / 512;

      var footprint = mu + CA * Math.sin(2 * mu) + CB * Math.sin(4 * mu) + CC * Math.sin(6 * mu) + CD * Math.sin(8 * mu);

      if(UTMConverter.debug) {
        console.log("footprint latitude: %d", footprint);
      }

      return footprint;
    },

    /*
     * Get the latitude
     * 
     * @params  {Number} footprint: Footprint latitude
     * @params  {Number} K1: First coefficient
     * @params  {Number} K2: Second coefficient
     * @params  {Number} K3: Third coefficient
     * @params  {Number} K4: Fourth coefficient
     */
    getLatitude: function(footprint, K1, K2, K3, K4) {

      var latitude = 180 * (footprint - K1 *(K2 + K3 + K4)) / Math.PI;

      if(UTMConverter.debug) {
        console.log("latitude: %d", latitude);
      }
      return latitude;
    },

    /*
     * Calculate the central longitude of an UTM zone
     *
     * @params  {Number} zone: UTM zone number
     */
    calcCentralLongitude: function(zone) {

      var zoneCL;
      if(zone > 0) {
        zoneCL = 6 * zone - 183;
      }
      else {
        zoneCL = 3;
      }

      if(UTMConverter.debug) {
        console.log("zoneCL for %d: %d", zone, zoneCL);
      }
      return zoneCL;
    },

    /*
     * Get the longitude
     * 
     * @params  {Number} zone: UTM zone number
     * @params  {Number} footprint: Footprint latitude
     * @params  {Number} K1: First coefficient
     * @params  {Number} K2: Second coefficient
     * @params  {Number} K3: Third coefficient
     */
    getLongitude: function(zone, footprint, K1, K2, K3, K4) {

      var longitude = zone - (((K1 - K2 + K3) / Math.cos(footprint)) * 180 / Math.PI);

      if(UTMConverter.debug) {
        console.log("longitude: %d", longitude);
      }
      return longitude;
    }
  },
  converter: {
    /*
     * Convert latitude and longitude to UTM
     *
     * @params  {Object} latlon: Latitude and longitude coordinates in decimal
     */
    latLonToUTM: function(latlon) {
			console.log('latlonToUTM params: '+JSON.stringify(latlon));
      var lat = latlon.lat;
      var lon = latlon.long;

      // Check if the latitude and longitude are valid
      if(UTMConverter.utils.validLatLon(lat, lon)) {

        // Calculate the eccentricity prime squared
        var e1sq = UTMConverter.utils.e1sq();

        // Convert to radians
        lat = UTMConverter.utils.degreeToRadian(lat);

        // Calculate UTM zone number
        var zone = UTMConverter.utils.calcUTMZone(lon);

        // Calculate UTM zone central meridian
        var zoneCM = UTMConverter.utils.calcCentralMeridian(zone);

        // Calculate intermediate terms
        var rho = UTMConverter.semiMajor * (1 - UTMConverter.e * UTMConverter.e) / Math.pow(1 - Math.pow(UTMConverter.e * Math.sin(lat), 2), 3 / 2);
        var nu = UTMConverter.semiMajor / Math.pow(1 - Math.pow(UTMConverter.e * Math.sin(lat), 2), (1 / 2));

        // Calculate meridional arc length
        var S = UTMConverter.utils.calcMeridianArc(lat);
        
        // Calculate delta long in radians
        p = UTMConverter.utils.degreeToRadian(lon - zoneCM);

        // Coefficients for UTM coordinates
        var K1 = S * UTMConverter.k0;
        var K2 = nu * Math.sin(lat) * Math.cos(lat) * UTMConverter.k0 / 2;
        var K3 = (nu * Math.sin(lat) * Math.pow(Math.cos(lat), 3) / 24) * (5 - Math.pow(Math.tan(lat), 2) + 9 * e1sq * Math.pow(Math.cos(lat), 2) + 4 * Math.pow(e1sq, 2) * Math.pow(Math.cos(lat), 4)) * UTMConverter.k0;
        var K4 = nu * Math.cos(lat) * UTMConverter.k0;
        var K5 = Math.pow(Math.cos(lat), 3) * (nu / 6) * (1 - Math.pow(Math.tan(lat), 2) + e1sq * Math.pow(Math.cos(lat), 2)) * UTMConverter.k0;
        
        var A6 = (Math.pow(p * UTMConverter.sin1, 6) * nu * Math.sin(lat) * Math.pow(Math.cos(lat), 5) / 720) * (61 - 58 * Math.pow(Math.tan(lat), 2) + Math.pow(Math.tan(lat), 4) + 270 * e1sq * Math.pow(Math.cos(lat), 2) - 330 * e1sq * Math.pow(Math.sin(lat), 2)) * UTMConverter.k0 * Math.pow(10, 24);

        UTM = {
          'northing':   UTMConverter.utils.getNorthing(lat, p, K1, K2, K3),
          'easting':    UTMConverter.utils.getEasting(p, K4, K5),
          'zone':     zone
        };

        if(UTMConverter.debug) {
          console.log("rho: %d", rho);
          console.log("nu: %d", nu);
          console.log("S: %d", S);
          console.log("K1: %d", K1);
          console.log("K2: %d", K2);
          console.log("K3: %d", K3);
          console.log("K4: %d", K4);
          console.log("K5: %d", K5);
          console.log("A6: %d", A6);
          console.log("UTM: ", UTM);
        }
        return UTM;
      }
    },

    /*
     * Convert UTM to latitude and longitude
     *
     * @params  {Object} utm: UTM coordinates
     */
    utmToLatLon: function(utm) {

      var easting = utm.easting;
      var northing = utm.northing;
      var zone = utm.zone;
      
      // Check if the easting, the northing and the zone are valid
      if(UTMConverter.utils.validUTM(easting, northing, zone)) {

        // Calculate the eccentricity prime squared
        var e1sq = UTMConverter.utils.e1sq();

        // Calculate footprint latitude
        var footprint = UTMConverter.utils.calcFootprintLat(northing);

        // Constants for formulas
        var n0 = UTMConverter.semiMajor / Math.pow(1 - Math.pow(UTMConverter.e * Math.sin(footprint), 2), 1/2);
        var r0 = UTMConverter.semiMajor * (1 - UTMConverter.e * UTMConverter.e) / Math.pow(1 - Math.pow(UTMConverter.e * Math.sin(footprint), 2), 3/2);
        var d0 = (500000 - easting) / (n0 * UTMConverter.k0);
        var q0 = e1sq * Math.pow(Math.cos(footprint), 2);
        var t0 = Math.pow(Math.tan(footprint), 2)

        // Coefficients for calculating latitude
        var latK1 = n0 * Math.tan(footprint) / r0;
        var latK2 = d0 * d0 / 2;
        var latK3 = (5 + 3 * t0 + 10 * q0 - 4 * q0 * q0 - 9 * e1sq) * Math.pow(d0, 4) / 24;
        var latK4 = (61 + 90 * t0 + 298 * q0 + 45 * t0 * t0 - 252 * e1sq - 3 * q0 * q0) * Math.pow(d0, 6) / 720;

        // Calculate the central longitude of an UTM zone 
        var zoneCL = UTMConverter.utils.calcCentralLongitude(zone);

        // Coefficients for calculating longitude
        var lonK1 = d0;
        var lonK2 = (1 + 2 * t0 + q0) * Math.pow(d0, 3) / 6;
        var lonK3 = (5 - 2 * q0 + 28 * t0 - 3 * Math.pow(q0, 2) + 8 * e1sq + 24 * Math.pow(t0, 2)) * Math.pow(d0, 5) / 120;

        LATLON = {
          'lat':  UTMConverter.utils.getLatitude(footprint, latK1, latK2, latK3, latK4),
          'lon':  UTMConverter.utils.getLongitude(zoneCL, footprint, lonK1, lonK2, lonK3)
        };

        if(UTMConverter.debug) {
          console.log("n0: %d", n0);
          console.log("r0: %d", r0);
          console.log("d0: %d", d0);
          console.log("q0: %d", q0);
          console.log("t0: %d", t0);
          console.log("Latitude K1: %d", latK1);
          console.log("Latitude K2: %d", latK2);
          console.log("Latitude K3: %d", latK3);
          console.log("Latitude K4: %d", latK4);
          console.log("Longitude K1: %d", lonK1);
          console.log("Longitude K2: %d", lonK2);
          console.log("Longitude K3: %d", lonK3);
          console.log("UTM: ", LATLON);
        }
        return LATLON;
      }
    }
  }
};