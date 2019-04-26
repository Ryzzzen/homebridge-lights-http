const request = require('request');
var Service, Characteristic;

module.exports = function(homebridge) {
  console.log("homebridge API version:", homebridge.version);

  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-lights-http', 'HTTPLightPlatform', HTTPLightPlatform);
}

// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
function HTTPLightPlatform(log, config, api) {
  log("HTTP LightPlatform Init");

  this.accessories = [];
  this.log = log;

  this.service = config.service;
  this.name = config.name;

  this.ip = config.ip;

  if (config.brightness)
    this.brightness = config.brightness;

  if (config.status)
    this.status = config.status;

  if (config.colors)
    this.colors = { hue: 0, saturation: 0 };
}

HTTPLightPlatform.identify = function(callback) {
  this.log('Identify requested!');
  callback();
};

var api = {
  getPowerState: function(callback) {
    request(`http://${this.ip}/api/get/state`, function(err, res, body) {
      if (err && err.code !== 'ECONNRESET') {
        this.log('getPowerState() failed: %s', err.message);
        callback(err);
      }
      else {
        var powerOn = parseInt(body) > 0;
        this.log('Power is currently %s', powerOn ? 'ON' : 'OFF');
        callback(null, powerOn);
      }
    }.bind(this));
  },
  setPowerState: function(state, callback) {
      request(`http://${this.ip}/api/set/state/${state ? '1' : '0'}`, function(err, res, body) {
        if (err && err.code !== 'ECONNRESET') {
          this.log('setPowerState() failed: %s', err.message);
          callback(err);
        }
        else {
          this.log('setPowerState() successfully set to %s', state ? 'ON' : 'OFF');
          callback(null, state);
        }
      }.bind(this));
  },
  getBrightness: function(callback) {
      if (!this.brightness) {
          this.log.warn("Ignoring request; No 'brightness' defined.");
          callback(new Error("No 'brightness' defined in configuration"));
          return;
      }

      request(`http://${this.ip}/api/get/brightness`, function(err, res, body) {
        if (err && err.code !== 'ECONNRESET') {
          this.log('getBrightness() failed: %s', err.message);
          callback(err);
        }
        else {
          var level = parseInt(body);
          this.log('Brightness is currently at %s %', level);
          callback(null, level);
        }
      }.bind(this));
  },
  setBrightness: function(level, callback) {
      if (!this.brightness) {
          this.log.warn("Ignoring request; No 'brightness' defined.");
          callback(new Error("No 'brightness' defined in configuration"));
          return;
      }

      request(`http://${this.ip}/api/set/brightness/${level}`, function(err, res, body) {
        if (err && err.code !== 'ECONNRESET') {
          this.log('setBrightness() failed: %s', err);
          callback(err);
        }
        else {
          this.log('setBrightness() successfully set to %s %', level);
          callback();
        }
      }.bind(this));
  }
};

HTTPLightPlatform.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();

  informationService
    .setCharacteristic(Characteristic.Manufacturer, 'Ryzzzen')
    .setCharacteristic(Characteristic.Model, 'homebridge-lights-http')
    .setCharacteristic(Characteristic.SerialNumber, Date.now());

    this.log('Creating Lightbulb');
    var lightbulbService = new Service.Lightbulb(this.name);

    if (this.status) {
        lightbulbService
            .getCharacteristic(Characteristic.On)
            .on('get', api.getPowerState.bind(this))
            .on('set', api.setPowerState.bind(this));
    } else {
        lightbulbService
            .getCharacteristic(Characteristic.On)
            .on('set', api.setPowerState.bind(this));
    }

    // Handle brightness
    if (this.brightness) {
        this.log('... Adding Brightness');
        lightbulbService
            .addCharacteristic(new Characteristic.Brightness())
            .on('get', api.getBrightness.bind(this))
            .on('set', api.setBrightness.bind(this));
    }

    if (this.color) {
        this.log('... Adding colors');
        lightbulbService
            .addCharacteristic(new Characteristic.Hue())
            .on('get', api.getHue.bind(this))
            .on('set', api.setHue.bind(this));

        lightbulbService
            .addCharacteristic(new Characteristic.Saturation())
            .on('get', api.getSaturation.bind(this))
            .on('set', api.setSaturation.bind(this));
    }

    return [informationService, lightbulbService];
};

HTTPLightPlatform.prototype.configureAccessory = function(accessory) {
  this.log(accessory.displayName, "Configure Accessory");
  var platform = this;

  accessory.reachable = true;

  accessory.on('identify', function(paired, callback) {
    platform.log(accessory.displayName, "Identifying");
    callback();
  });

  if (accessory.getService(Service.Lightbulb)) {
    let lightbulbService = accessory.getService(Service.Lightbulb);

    if (this.status) {
        lightbulbService
            .getCharacteristic(Characteristic.On)
            .on('get', this.getPowerState.bind(this))
            .on('set', this.setPowerState.bind(this));
    } else {
        lightbulbService
            .getCharacteristic(Characteristic.On)
            .on('set', this.setPowerState.bind(this));
    }

    if (this.brightness) {
        this.log('... Adding Brightness');
        lightbulbService
            .addCharacteristic(new Characteristic.Brightness())
            .on('get', this.getBrightness.bind(this))
            .on('set', this.setBrightness.bind(this));
    }

    if (this.color) {
        this.log('... Adding colors');
        lightbulbService
            .addCharacteristic(new Characteristic.Hue())
            .on('get', this.getHue.bind(this))
            .on('set', this.setHue.bind(this));

        lightbulbService
            .addCharacteristic(new Characteristic.Saturation())
            .on('get', this.getSaturation.bind(this))
            .on('set', this.setSaturation.bind(this));
    }
  }

  this.accessories.push(accessory);
};
