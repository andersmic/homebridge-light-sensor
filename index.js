var Service;
var Characteristic;

var gpio = require('rpi-gpio')
var crypto = require("crypto");

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-light-sensor", "LightSensor", LightSensorAccessory);
}

class LightSensorAccessory {

    constructor(log, config) {
        this.log = log;

        this.service = config.service;
        this.name = config.name;

        this.pin = parseInt(config.pin || "7");
        this.interval = parseInt(config.interval || 1000 * 5 * 60)

        if (config.sn){
            this.sn = config.sn;
        } else {
            var shasum = crypto.createHash('sha1');
            shasum.update(this.name);
            this.sn = shasum.digest('base64');
            this.log('Computed SN ' + this.sn);
        }

        this.log('Start detection')

	this.timer = null;
        this.lightState = null;

        gpio.on('change', this.onStateChange.bind(this));
	gpio.setup(this.pin, gpio.DIR_IN, gpio.EDGE_BOTH);

    }

    identify(callback) {
        this.log("Identify requested!");
        callback(null);
    }

    onStateChange(channel, pinState) {
        this.log("onStateChange: " + pinState)
	if (! this.timer && pinState != this.lightState) {
            this.log("Start timer with interval: " + this.interval)
	    this.timer = setTimeout(this.updateState.bind(this), this.interval);
	}
    }

    updateState() {
        this.log("updateState")
        gpio.read(this.pin, this.onStateRead.bind(this));
    }

    onStateRead(err, pinState) {
        if (err) {
	    this.log("Error reading state: " + err)
	    this.timer = null;
	    throw err;
	}

	if (! this.lightState || pinState != this.lightState) {
            this.log("State has changed.");
            this.log("It is now " + (pinState ? "dark" : "light"));
	    this.lightState = pinState;
	    if (pinState) { // only trigger event if it has turned dark
                this.service.getCharacteristic(Characteristic.MotionDetected).setValue(pinState);
//		setTimeout(function() {
                    this.service.getCharacteristic(Characteristic.MotionDetected).setValue(pinState ? 0 : 1);
//		}.bind(this), 3000);
	    }
	}
	else {
            this.log("State has not changed. Ignore!");
        }
	this.timer = null;
    }

    getServices() {
        this.log('getServices')
        var informationService = new Service.AccessoryInformation();

        informationService
          .setCharacteristic(Characteristic.Name, this.name)
          .setCharacteristic(Characteristic.Manufacturer, "PianosaLab")
          .setCharacteristic(Characteristic.Model, "Light Sensor")
          .setCharacteristic(Characteristic.SerialNumber, this.sn);

        this.service = new Service.MotionSensor();

        return [informationService, this.service];
    }

}
