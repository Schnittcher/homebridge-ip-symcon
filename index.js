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
    this.ThermostatDisplayUnit = config["ThermostatDisplayUnit"] || 0; // 0 = Celsius 1 = Fahrenheit
    this.pollingTime = config["pollingTime"] || 5;
    this.StatusURL = this.host + '/hook/siri?action=get';
    this.SetURLOn = this.host + '/hook/siri?action=setOn';
    this.SetURLOff = this.host + '/hook/siri?action=setOff';
    this.SetURLBrightness = this.host + '/hook/siri?action=setBrightness';
    this.SetURLThermostat = this.host + '/hook/siri?action=setThermostat';
    this.ThermostatValueOff = config["ThermostatValueOff"]//
    this.ThermostatValueHeat = config["ThermostatValueHeat"]//
    this.ThermostatValueCool = config["ThermostatValueCool"]//
    this.URL = this.host + '/hook/siri';

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
        //case "Luftfeuchtigkeit":
        //this.humidityService = new Service.HumiditySensor(this.name);
        //this.humidityService
        //    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        //    .on('get', this.getHumidity.bind(this));
        //break;
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
        case "Thermostat":
        this.ThermostatService = new Service.Thermostat(this.name);
        // Aktueller Modus
        this.ThermostatService
            .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
            .on('get', this.getCurrentHeatingCoolingState.bind(this));
        // Ziel Modus
        this.ThermostatService
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .on('get', this.getTargetHeatingCoolingState.bind(this))
            .on('set', this.setTargetHeatingCoolingState.bind(this));
        // Aktuelle Temperatur
        this.ThermostatService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this));
        // Ziel Temperatur
        this.ThermostatService
            .getCharacteristic(Characteristic.TargetTemperature)
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this));
        // Celsius oder Fahrenheit
        this.ThermostatService
            .getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .on('get', this.getTemperatureDisplayUnits.bind(this))
            .on('set', this.setTemperatureDisplayUnits.bind(this));
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
    url = encodeURI(this.URL + '?service=Temperatur&device='+this.name+'&get=Temperatur');
    this.log(url);
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
    url = encodeURI(this.URL + '?service=Switch&device='+this.name+'&get=State');
    this.log(url);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getSwitchState function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody);
      }
      this.log(binaryState);
      var powerOn = binaryState > 0;
      this.SwitchState = powerOn;
      this.log(this.SwitchState);
      if (this.debug == true) {
        this.log('Currently State %s', binaryState);
      }
      callback(null, powerOn);
    }.bind(this));
  }

  setSwitchState (value, callback, context) {
    this.log('Set Switch State...');
    var url
    this.log(this.SwitchState);
    if (this.SwitchState == true) {
      url = encodeURI(this.SetURLOff + "&device="+ this.name)
      url = encodeURI(this.URL + '?service=Switch&device='+this.name+'&set=State&value=0');
    } else {
      url = encodeURI(this.SetURLOn + '&device='+ this.name)
      url = encodeURI(this.URL + '?service=Switch&device='+this.name+'&set=State&value=1');
    }
    this.log(url)
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getSwitchState function failed: %s', error.message)
        callback(error)
      } else {
        var binaryState = parseInt(responseBody)
this.log("test" + url);
        var powerOn = binaryState > 0
        this.SwitchState = powerOn
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
    //url = encodeURI(this.URL + )
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
    url = encodeURI(this.URL + '?service=Lightbulb&device='+this.name+'&get=State')
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getLightbulbState function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody);
      }
      var powerOn = binaryState > 0;
      this.power = binaryState;
      if (this.debug == true) {
        this.log('Currently Lightbulb State %s', binaryState);
        this.log(url);
      }
      callback(null, powerOn);
    }.bind(this));
  }

  setLightbulbState (value, callback, context) {
    this.log('Set Lightbulb State...');
    var url
    if (this.power == 1) {
      url = encodeURI(this.SetURLOff + "&device="+ this.name)
      url = encodeURI(this.URL + '?service=Lightbulb&device='+this.name+'&set=State&value=0')
    } else {
      url = encodeURI(this.SetURLOn + '&device='+ this.name)
      url = encodeURI(this.URL + '?service=Lightbulb&device='+this.name+'&set=State&value=1')
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
    url = encodeURI(this.URL + '?service=Lightbulb&device='+this.name+'&get=Brightness')
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('getBrightness function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody.replace(/\D/g,"")); // .substr(1)
      }
      var brightness = binaryState;
      this.data = brightness;
      if (this.debug == true) {
        this.log('Currently Brightness %s', binaryState);
        this.log(url);
      }
      callback(null, brightness);
    }.bind(this));
  }


  setBrightness (level, callback, context) {
    this.log('Setting Brightness...');
    var url = encodeURI(this.SetURLBrightness + '&device='+ this.name + '&Intensity=' +level);
    url = encodeURI(this.URL + '?service=Lightbulb&device='+this.name+'&set=Brightness&value='+level)
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
      callback();
    }.bind(this));
  }

  // Thermostat
  // TemperatureDisplayUnits
  getTemperatureDisplayUnits(callback) {
    callback(null, this.TemperatureDisplayUnits)
  }

  setTemperatureDisplayUnits (value, callback, context) {
    this.TemperatureDisplayUnits = value;
    var error = null;
    callback(error);
  }

  getCurrentHeatingCoolingState (callback) {
    this.log('Getting Current Heating Cooling State...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name + '&CurrentHeatingCoolingState=1');
    url = encodeURI(this.URL + '?service=Thermostat&device='+this.name+'&get=CurrentHeatingCoolingState')
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('HTTP getCurrentHeatingCoolingState function failed: %s', error.message);
        callback(error);
      } else {
        var HeatingCoolingState = parseInt(responseBody);
        this.CurrentHeatingCoolingState = HeatingCoolingState;
        this.ThermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, this.CurrentHeatingCoolingState);
      }
      if (this.debug == true) {
        this.log('Currently HeatingCoolingState %s', HeatingCoolingState);
      }
      callback(null, HeatingCoolingState);
    }.bind(this));
  }


  getTargetHeatingCoolingState (callback) {
    this.log('Getting Target Heating Cooling State...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name + '&TargetHeatingCoolingState=1');
    url = encodeURI(this.URL + '?service=Thermostat&device='+this.name+'&get=TargetHeatingCoolingState')
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('HTTP getTargetHeatingCoolingState function failed: %s', error.message);
        callback(error);
      } else {
        var state = parseInt(responseBody);
        var HeatingCoolingState;
            switch (state) {
              case this.ThermostatValueOff:
              HeatingCoolingState = 0;
              break;
              case this.ThermostatValueHeat:
              HeatingCoolingState = 1;
              break;
              case this.ThermostatValueCool:
              HeatingCoolingState = 2;
              break;
            }
        this.CurrentHeatingCoolingState = HeatingCoolingState;
        this.ThermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, this.CurrentHeatingCoolingState);
      }
      if (this.debug == true) {
        this.log('Currently HeatingCoolingState %s', HeatingCoolingState);
      }
      callback(null, HeatingCoolingState);
    }.bind(this));
  }

  setTargetHeatingCoolingState (state, callback, context) {

var HeatingCoolingState;
    switch (state) {
      case 0:
      HeatingCoolingState = this.ThermostatValueOff;
      break;
      case 1:
      HeatingCoolingState = this.ThermostatValueHeat;
      break;
      case 2:
      HeatingCoolingState = this.ThermostatValueCool;
      break;
    }
    this.log('Setting Current Heating Cooling...'+ state);
    var url = encodeURI(this.SetURLThermostat + '&device='+ this.name + '&State=' +HeatingCoolingState);
    url = encodeURI(this.URL + '?service=Thermostat&device='+this.name+'&set=HeatingCoolingState&value=' + HeatingCoolingState)
    this.log(url);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('setTargetHeatingCoolingState function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody);
      }
      var state = binaryState;
      this.TargetHeatingCoolingState = state;
      if (this.debug == true) {
        this.log('Currently Current Heating Cooling %s', binaryState);
      }
      callback(null, state);
    }.bind(this));
  }

  getCurrentTemperature (callback) {
    this.log('Getting Current Temperature...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name + '&CurrentTemperature=1');
    url = encodeURI(this.URL + '?service=Thermostat&device='+this.name+'&get=CurrentTemperature')
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('HTTP getCurrentTemperature function failed: %s', error.message);
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

  getTargetTemperature (callback) {
    this.log('Getting Target Temperature...');
    var url = encodeURI(this.StatusURL + '&device='+ this.name + '&TargetTemperature=1');
    url = encodeURI(this.URL + '?service=Thermostat&device='+this.name+'&get=TargetTemperature')
    this.log(url);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('HTTP getTargetTemperature function failed: %s', error.message);
        callback(error);
      } else {
        var temperature = parseFloat(responseBody.replace(",","."));
      }
      if (this.debug == true) {
        this.log('Target Temperature %s', temperature);
      }
      callback(null, temperature);
    }.bind(this));
  }

  setTargetTemperature (state, callback, context) {
    this.log('Setting Target Temperature...');
    var url = encodeURI(this.SetURLThermostat + '&device='+ this.name + '&TargetTemperature=' +state);
    url = encodeURI(this.URL + '?service=Thermostat&device='+this.name+'&set=TargetTemperature&value=' + state)
    this.log(url);
    this.httpRequest(url, '', 'GET', '', '', '', function (error, response, responseBody) {
      if (error) {
        this.log('setTargetTemperature function failed: %s', error.message);
        callback(error);
      } else {
        var binaryState = parseInt(responseBody);
      }
      var state = binaryState;
      this.TargetTemperature = state;
      if (this.debug == true) {
        this.log('Currently Current Heating Cooling %s', binaryState);
      }
      callback(null, state);
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
      //case "Luftfeuchtigkeit":
      //  this.humidityService
      //      .getCharacteristic(Characteristic.CurrentRelativeHumidity)
      //      .getValue();
      //  break;
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
        case "Thermostat":
        this.ThermostatService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .getValue();
        this.ThermostatService
            .getCharacteristic(Characteristic.TargetHeatingCoolingState)
            .getValue();
        this.ThermostatService
            .getCharacteristic(Characteristic.TargetTemperature)
            .getValue();
        break;

    }
  }

  getServices () {
    switch (this.SymconService) {
      case "Temperatur":
        return [this.informationService, this.temperatureService]
      case "Switch":
        return [this.informationService, this.switchService]
      //case "Luftfeuchtigkeit":
      //  return [this.informationService, this.humidityService]
      case "Licht":
        return [this.informationService, this.lightbulbService]
      case "Thermostat":
        return [this.informationService, this.ThermostatService]
    }
  }
}
