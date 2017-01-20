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
    this.username = config["username"] || ""; // wird noch nicht verwendet
    this.password = config["password"] || ""; // wird noch nicht verwendet
    this.polling = config["polling"] || false; // wird noch nicht verwendet
    this.pollingTime = config["pollingTime"] || 5;
    this.StatusURL = this.host + '/hook/siri?action=get';
    this.SetURLOn = this.host + '/hook/siri?action=setOn';
    this.SetURLOff = this.host + '/hook/siri?action=setOff';

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
        var temperature = parseFloat(responseBody);
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
    }
  }
}
