'use strict';
let Service, Characteristic;
var request = require('request');

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-ip-sycmon', 'IP-Symcon', IPSymcon);
};

class IPSymcon {
  constructor (log, config) {
    this.log = log;
    this.debug = config["debug"] || false;
    this.name = config["name"];
    this.host = config["SymconHost"];
    this.SymconService = config["SymconService"];
    this.Brightness = config["Brightness"] || false // wird noch nicht verwendet
    this.username = config["username"] || ""; // wird noch nicht verwendet
    this.password = config["password"] || ""; // wird noch nicht verwendet
    this.polling = config["polling"] || false; // wird noch nicht verwendet
    this.pollingTime = config["pollingTime"] || 5;
    this.StatusURL = this.host + '/hook/siri?action=get';
    this.SetURLOn = this.host + '/hook/siri?action=setOn';
    this.SetURLOff = this.host + '/hook/siri?action=setOff';
    this.SetURLBrightness = this.host + '/hook/siri?action=setBrightness';

    this.log('Device '+ this.name +' initialization succeeded');
    this.informationService = new Service.AccessoryInformation();
    this.informationService
        .setCharacteristic(Characteristic.Manufacturer, "IP-Symcon")
        .setCharacteristic(Characteristic.Model, this.SymconService)
        .setCharacteristic(Characteristic.SerialNumber, "");
    switch (this.SymconService) {
      case "Temperatur":
        this.temperatureService = new Service.TemperatureSensor(this.name)
        this.temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getTemperature.bind(this))
        break;
      case "Switch":
        this.switchService = new Service.Switch(this.name);
        this.switchService
            .getCharacteristic(Characteristic.On)
            .on('set', this.setSwitchState.bind(this))
            .on('get', this.getSwitchState.bind(this))
        break;
        case "Luftfeuchtigkeit":
        this.humidityService = new Service.HumiditySensor(this.name);
        this.humidityService
            .getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.getHumidity.bind(this));
        break;
        case "Licht":
        this.lightbulbService = new Service.Lightbulb(this.name);
        this.lightbulbService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getLightbulbState.bind(this))
            .on('set', this.setLightbulbState.bind(this));
        if (this.Brightness == true) {
                  this.lightbulbService
          				.addCharacteristic(new Characteristic.Brightness())
          				.on('get', this.getBrightness.bind(this))
          				.on('set', this.setBrightness.bind(this));
                }
        break;

    }
    setInterval(this.devicePolling.bind(this), this.pollingTime * 1000);
  }

  httpRequest (url, body, method, username, password, sendimmediately, callback) {
    request({
      url: url,
      body: body,
      method: method,
      rejectUnauthorized: false,
      auth: {
        user: username,
        pass: password,
        sendImmediately: sendimmediately
      }
    },
    function (error, response, body) {
      callback(error, response, body)
    })
  }
  getTemperature (callback) {
    this.log('Getting Temperature...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('HTTP get power function failed: %s', error.message);
        callback(error);
      } else {
        var temperature = parseFloat(responseBody.replace(",","."));
      }
      if (this.debug == true) {
        this.log('Currently Temperature %s', temperature);
      }
      callback(null, temperature);
    }.bind(this));
  }

  getSwitchState (callback) {
    this.log('Getting Switch State...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getSwitchState function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody);
      }
      var powerOn = binaryState > 0;
      this.data = powerOn;
      if (this.debug == true) {
        this.log('Currently State %s', binaryState);
      }
      callback(null, powerOn);
    }.bind(this));
  }

  setSwitchState (value, callback, context) {
    this.log('Set Switch State...');
    var url
    if (this.data == 1) {
      url = encodeURI(this.SetURLOff + "&device="+ this.name)
    } else {
      url = encodeURI(this.SetURLOn + '&device='+ this.name)
    }
    this.log(url)
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getSwitchState function failed: %s', error.message)
        callback(error)
      } else {
        var binaryState = parseInt(responseBody)
        var powerOn = binaryState > 0
        this.data = powerOn
        if (this.debug == true) {
          this.log('Currently State %s', binaryState)
        }
      }
      callback();
    }.bind(this))
  }

  getHumidity (callback) {
    this.log('Getting Humidity...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('HTTP getHumidity failed: %s', error.message);
        callback(error);
      } else {
        var humidity = parseFloat(responseBody);
      }
      if (this.debug == true) {
        this.log('Currently Humidity %s', humidity);
      }
      callback(null, humidity);
    }.bind(this));
  }

  getLightbulbState (callback) {
    this.log('Getting Lightbulb State...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getLightbulbState function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody);
      }
      var powerOn = binaryState > 0;
      this.power = powerOn;
      if (this.debug == true) {
        this.log('Currently Lightbulb State %s', binaryState);
      }
      callback(null, powerOn);
    }.bind(this));
  }

  setLightbulbState (value, callback, context) {
    this.log('Set Lightbulb State...');
    var url
    this.log(this.power)
    if (this.power == 1) {
      url = encodeURI(this.SetURLOff + "&device="+ this.name)
    } else {
      url = encodeURI(this.SetURLOn + '&device='+ this.name)
    }
    this.log(url)
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('setLightbulbState function failed: %s', error.message)
        callback(error)
      } else {
        var binaryState = parseInt(responseBody)
        var powerOn = binaryState > 0
        this.power = powerOn
        if (this.debug == true) {
          this.log('Currently Lightbulb State %s', binaryState)
        }
      }
      callback();
    }.bind(this))
  }

  getBrightness (callback) {
    this.log('Getting Brightness...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name + '&brightness=1');
    this.log(this.StatusURL + '&device='+ this.name + '&brighness=1');
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getBrightness function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody.replace(/\D/g,"").substr(1));
      }
      var brightness = binaryState;
      this.data = brightness;
      if (this.debug == true) {
        this.log('Currently Brightness %s', binaryState);
      }
      callback(null, brightness);
    }.bind(this));
  }


  setBrightness (level, callback, context) {
    this.log('Setting Brightness...');
    var url = encodeURI(this.SetURLBrightness + '&device='+ this.name + '&Intensity=' +level);
    this.log(this.SetURLBrightness + '&device='+ this.name + '&Intensity=' +level);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getBrightness function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody.replace(/\D/g,"").substr(1));
      }
      var brightness = binaryState;
      this.data = brightness;
      if (this.debug == true) {
        this.log('Currently Brightness %s', binaryState);
      }
      callback(null, brightness);
    }.bind(this));
  }

  devicePolling () {
    switch (this.SymconService) {
      case "Temperatur":
        this.temperatureService
            .getCharacteristic(Characteristic.CurrentTemperature).getValue();
        break;
        case "Switch":
          this.switchService
              .getCharacteristic(Characteristic.On)
              .getValue();
        break;
      case "Luftfeuchtigkeit":
        this.humidityService
            .getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .getValue();
        break;
      case "Licht":
      this.lightbulbService
          .getCharacteristic(Characteristic.On)
          .getValue();
        if (this.Brightness == true) {
          this.lightbulbService
              .getCharacteristic(Characteristic.Brightness)
              .getValue();
        }
        break;

    }
  }

  getServices () {
    switch (this.SymconService) {
      case "Temperatur":
        return [this.informationService, this.temperatureService]
      case "Switch":
        return [this.informationService, this.switchService]
      case "Luftfeuchtigkeit":
        return [this.informationService, this.humidityService]
      case "Licht":
        return [this.informationService, this.lightbulbService]
    }
  }
}
