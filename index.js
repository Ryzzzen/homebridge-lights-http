'use strict'

const request = require('request');
let Service, Characteristic;

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-lights-http', 'HTTPLightbulbAccessory', LightbulbAccessory);
}

class LightbulbAccessory {
  constructor (log, config) {
    this.log = log;
    this.config = config;

    this.service = new Service.Lightbulb(this.config.name);
    this.context = {};
  }

  getServices () {
    const informationService = new Service.AccessoryInformation()
        .setCharacteristic(Characteristic.Manufacturer, 'Ryzzzen Enterprises LTD')
        .setCharacteristic(Characteristic.Model, 'HTTP-Light')
        .setCharacteristic(Characteristic.SerialNumber, this.config.serialNumber || Date.now().toString());

    /*
     * For each of the service characteristics we need to register setters and getter functions
     * 'get' is called when HomeKit wants to retrieve the current state of the characteristic
     * 'set' is called when HomeKit wants to update the value of the characteristic
     */
    this.service.getCharacteristic(Characteristic.On)
      .on('get', this.getOnCharacteristicHandler.bind(this))
      .on('set', this.setOnCharacteristicHandler.bind(this))

      if (this.config.hasBrightness) {
          this.log('... Adding Brightness');
          this.service
              .addCharacteristic(new Characteristic.Brightness())
              .on('get', this.getBrightnessCharacteristicHandler.bind(this))
              .on('set', this.setBrightnessCharacteristicHandler.bind(this));
      }

      /*
      if (this.config.hasColors) {
          this.log('... Adding colors');
          lightbulbService
              .addCharacteristic(new Characteristic.Hue())
              .on('get', api.getHue.bind(this))
              .on('set', api.setHue.bind(this));

          lightbulbService
              .addCharacteristic(new Characteristic.Saturation())
              .on('get', api.getSaturation.bind(this))
              .on('set', api.setSaturation.bind(this));
      }*/

    /* Return both the main service (this.service) and the informationService */
    return [informationService, this.service];
  }

  setOnCharacteristicHandler (value, callback) {
    request(`http://${this.config.ip}/api/set/state/${value ? '1' : '0'}`, (err, res, body) => {
      if (err && err.code !== 'ECONNRESET') {
        this.log('setPowerState() failed: %s', err.message);
        callback(err);
      }
      else {
        this.log('setPowerState() successfully set to %s', value ? 'ON' : 'OFF');
        callback(null, this.context.on = value);
      }
    });
  }

  getOnCharacteristicHandler (callback) {
    if (this.context.on) return callback(null, this.context.on);

    request(`http://${this.config.ip}/api/get/state`, (err, res, body) => {
      if (err && err.code !== 'ECONNRESET') {
        this.log('getPowerState() failed: %s', err.message);
        callback(err);
      }
      else {
        this.context.on = parseInt(body) > 0;
        this.log('Power is currently %s', this.context.on ? 'ON' : 'OFF');
        callback(null, this.context.on);
      }
    });
  }

  setBrightnessCharacteristicHandler (value, callback) {
    if (!this.config.hasBrightness) {
        this.log.warn("Ignoring request; No 'brightness' defined.");
        return callback(new Error("No 'brightness' defined in configuration"));
    }

    request(`http://${this.config.ip}/api/set/brightness/${value}`, (err, res, body) => {
      if (err && err.code !== 'ECONNRESET') {
        this.log('setBrightness() failed: %s', err);
        callback(err);
      }
      else {
        this.log('setBrightness() successfully set to %s %', this.context.brightness = value);
        callback();
      }
    });
  }

  getBrightnessCharacteristicHandler (callback) {
    if (!this.config.hasBrightness) {
        this.log.warn("Ignoring request; No 'brightness' defined.");
        callback(new Error("No 'brightness' defined in configuration"));
        return;
    }

    if (this.context.brightness) return callback(null, this.context.brightness);

    request(`http://${this.config.ip}/api/get/brightness`, (err, res, body) => {
      if (err && err.code !== 'ECONNRESET') {
        this.log('getBrightness() failed: %s', err.message);
        callback(err);
      }
      else {
        this.context.brightness = parseInt(body);
        this.log('Brightness is currently at %s %', this.context.brightness);
        callback(null, this.context.brightness);
      }
    });
  }

};
