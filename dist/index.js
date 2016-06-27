'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_ADDRESS = 0x48,
    POITNER_CONVERSION = 0x00,
    POINTER_CONFIG = 0x01,
    POINTER_LOW_THRESHOLD = 0x02,
    POINTER_HIGH_THRESHOLD = 0x03,
    CONFIG_OS_SINGLE = 0x8000,
    MUX_OFFSET = 12,
    GAIN = {
  '2/3': 0x0000,
  1: 0x0200,
  2: 0x0400,
  4: 0x0600,
  8: 0x0800,
  16: 0x0A00
},
    MODE_CONTINOUS = 0x0000,
    MODE_SINGLE = 0x0100,
    ADS1015_DR = {
  128: 0x0000,
  250: 0x0020,
  490: 0x0040,
  920: 0x0060,
  1600: 0x0080,
  2400: 0x00A0,
  3300: 0x00C0
},
    ADS1115_DR = {
  8: 0x0000,
  16: 0x0020,
  32: 0x0040,
  64: 0x0060,
  128: 0x0080,
  250: 0x00A0,
  475: 0x00C0,
  860: 0x00E0
},
    COMP_WINDOW = 0x0010,
    COMP_ACTIVE_HIGH = 0x0008,
    COMP_LATCHING = 0x0004;
COMP_QUE = {
  1: 0x0000,
  2: 0x0001,
  4: 0x0002
}, COMP_QUE_DISABLE = 0x0003;

var i2c = require('i2c');

var ADS1x15 = function () {
  function ADS1x15() {
    _classCallCheck(this, ADS1x15);

    this._device = new i2c(arguments);
  }

  _createClass(ADS1x15, [{
    key: 'data_rate_default',
    value: function data_rate_default() {
      new Error('data_rate_default has not been implemented by the sub class');
    }
  }, {
    key: 'data_rate_config',
    value: function data_rate_config(data_rate) {
      new Error('Subclass must implement _data_rate_config function!');
    }
  }, {
    key: 'conversion_value',
    value: function conversion_value(low, high) {
      new Error('Subclass must implement _conversion_value!');
    }
  }, {
    key: '_read',
    value: function _read(_ref, cb) {
      var mux = _ref.mux;
      var gain = _ref.gain;
      var data_rate = _ref.data_rate;
      var mode = _ref.mode;

      process.nextTick(function () {
        var config = CONFIG_OS_SINGLE;
        config |= mux * 0x07 << MUX_OFFSET;

        if (!gain in CONFIG_GAIN) return cb(new Error('Gain must be one of: "2/3", 1, 2, 4, 8, 16'));
        config |= GAIN[gain];

        config |= mode;

        data_rate = data_rate ? data_rate : this._data_rate_default();
        config |= this._data_rate_cofnig(data_rate);
        config |= COMP_QUE_DISABLE;

        this._device.writeBytes(POINTER_CONFIG, [config >> 8 & 0xFF, config & 0xFF], function (err) {
          if (err) return cb(err);
          this._device.readBytes(POINTER_CONVERSION, 2, function (err, data) {
            if (err) return cb(err);
            cb(null, this._conversion_value(data[1], data[0]));
          });
        });
      });
    }
  }, {
    key: '_read_comparator',
    value: function _read_comparator(_ref2, cb) {
      var mux = _ref2.mux;
      var gain = _ref2.gain;
      var _ref2$data_rate = _ref2.data_rate;
      var data_rate = _ref2$data_rate === undefined ? this._data_rate_default() : _ref2$data_rate;
      var mode = _ref2.mode;
      var high_threshold = _ref2.high_threshold;
      var low_threshold = _ref2.low_threshold;
      var active_low = _ref2.active_low;
      var traditional = _ref2.traditional;
      var latching = _ref2.latching;
      var num_readings = _ref2.num_readings;

      if (!(num_readings === 1 || num_reading === 2 || num_reading === 4)) return cb(new Error('num_reading must be 1 or 2 or 5'));

      this._device.writeBytes(POINTER_HIGH_THRESHOLD, [high_threshold >> 8 & 0xFF, high_threshold & 0xFF], function (err) {
        if (err) return cb(err);

        this._device.writeBytes(POINTER_LOW_THRESHOLD, [low_threshold >> 8 & 0xFF, low_threshold & 0xFF], function () {
          if (err) return cb(err);

          var config = CONFIG_OS_SINGLE;
          config |= (mux & 0x07) << MUX_OFFSET;

          if (!(gain in GAIN)) return cb(new Error('Gain must be one of: "2/3", 1, 2, 4, 8, 16'));
          config |= GAIN[gain];

          config |= mode;
          config |= this._data_rate_config(data_rate);
          config = traditional ? config : config | COMP_WINDOW;
          config = active_low ? config : config | COMP_ACTIVE_HIGH;

          config = latching ? config | COMP_LATCHING : config;

          config |= COMP_QUE[num_readings];

          this._device.writeBytes(POINTER_CONFIG, [config >> 8 & 0xFF, config & 0xFF], function (err) {
            if (err) return cb(err);

            this._device.readBytes(POINTER_CONVERSION, 2, function (err, result) {
              if (err) return cb(err);
              cb(null, this._conversion_value(result[1], result[0]));
            });
          });
        });
      });
    }
  }, {
    key: 'read_adc',
    value: function read_adc(channel) {
      var gain = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
      var data_rate = arguments[2];
      var cb = arguments[3];

      if (channel < 0 || channel > 3) return cb(new Error('channel must be a value within 0-3!'));

      this._read(channel + 0x04, gain, data_rate, MODE_SINGLE, cb);
    }
  }, {
    key: 'read_adc_difference',
    value: function read_adc_difference(differential, gain, data_rate, cb) {
      gain = gain ? gain : 1;
      if (channel < 0 || channel > 3) return cb(new Error('differential must be a value within 0-3!'));

      this._read(differential, gain, data_rate, MODE_SINGLE, cb);
    }
  }, {
    key: 'start_adc',
    value: function start_adc(channel, gain, data_rate, cb) {
      gain = gain ? gain : 1;
      if (channel < 0 || channel > 3) return cb(new Error('channel must be a value within 0-3!'));

      this._read(channel + 0x04, gain, data_rate, MODE_CONTINUOUS, cb);
    }
  }, {
    key: 'start_acd_comparator',
    value: function start_acd_comparator(_ref3, cb) {
      var channel = _ref3.channel;
      var high_threshold = _ref3.high_threshold;
      var low_threshold = _ref3.low_threshold;
      var _ref3$gain = _ref3.gain;
      var gain = _ref3$gain === undefined ? 1 : _ref3$gain;
      var data_rate = _ref3.data_rate;
      var _ref3$active_low = _ref3.active_low;
      var active_low = _ref3$active_low === undefined ? true : _ref3$active_low;
      var _ref3$traditional = _ref3.traditional;
      var traditional = _ref3$traditional === undefined ? true : _ref3$traditional;
      var _ref3$latching = _ref3.latching;
      var latching = _ref3$latching === undefined ? false : _ref3$latching;
      var _ref3$num_readings = _ref3.num_readings;
      var num_readings = _ref3$num_readings === undefined ? 1 : _ref3$num_readings;

      if (channel < 0 || channel > 3) return cb(new Error('Channel must be a value within 0-3!'));
      cb(null, this._read_comparator({
        mux: channel + 0x04,
        gain: gain,
        data_rate: data_rate,
        mode: MODE_CONTINUOUS,
        high_threshold: high_threshold,
        low_threshold: low_threshold,
        active_low: active_low,
        traditional: traditional,
        latching: latching,
        num_readings: num_readings
      }, cb));
    }
  }, {
    key: 'start_acd_difference_comparator',
    value: function start_acd_difference_comparator(_ref4, cb) {
      var differential = _ref4.differential;
      var high_threshold = _ref4.high_threshold;
      var low_threshold = _ref4.low_threshold;
      var _ref4$gain = _ref4.gain;
      var gain = _ref4$gain === undefined ? 1 : _ref4$gain;
      var data_rate = _ref4.data_rate;
      var _ref4$active_low = _ref4.active_low;
      var active_low = _ref4$active_low === undefined ? true : _ref4$active_low;
      var _ref4$traditional = _ref4.traditional;
      var traditional = _ref4$traditional === undefined ? true : _ref4$traditional;
      var _ref4$latching = _ref4.latching;
      var latching = _ref4$latching === undefined ? false : _ref4$latching;
      var _ref4$num_readings = _ref4.num_readings;
      var num_readings = _ref4$num_readings === undefined ? 1 : _ref4$num_readings;

      if (differential < 0 || differential > 3) return cb(new Error('Differential must be a value within 0-3!'));
      cb(null, this._read_comparator({
        mux: differential,
        gain: gain,
        data_rate: data_rate,
        mode: MODE_CONTINUOUS,
        high_threshold: high_threshold,
        low_threshold: low_threshold,
        active_low: active_low,
        traditional: traditional,
        latching: latching,
        num_readings: num_readings
      }, cb));
    }
  }, {
    key: 'stop_adc',
    value: function stop_adc(cb) {
      var config = 0x8583;
      this._device.writeBytes(POINTER_CONFIG, [config >> 8 & 0xFF, config & 0xFF], function (err) {
        if (err) return cb(err);
        return cb(null);
      });
    }
  }, {
    key: 'get_last_result',
    value: function get_last_result(cb) {
      this._device.readBytes(POINTER_CONFIG, 2, function (err) {
        if (err) return cb(err);
        return cb(null, this._conversion_value(result[1], result[0]));
      });
    }
  }]);

  return ADS1x15;
}();

var ADS1115 = function (_ADS1x) {
  _inherits(ADS1115, _ADS1x);

  function ADS1115() {
    _classCallCheck(this, ADS1115);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ADS1115).call(this, arguments));
  }

  _createClass(ADS1115, [{
    key: '_data_rate_default',
    value: function _data_rate_default() {
      return 128;
    }
  }, {
    key: '_data_rate_config',
    value: function _data_rate_config(data_rate) {
      if (!(data_rate in ADS1115_CONFIG_DR)) throw new Error('Data rate must be one of 8, 16, 32, 64, 128, 250, 475, 860');
      return ADS1115_CONFIG_DR[data_rate];
    }
  }, {
    key: '_conversion_value',
    value: function _conversion_value(low, high) {
      value = (high & 0xFF) << 8 | low & 0xFF;
      return value & 0x8000 !== 0 ? value - (1 << 16) : value;
    }
  }]);

  return ADS1115;
}(ADS1x15);

var ADS1015 = function (_ADS1x2) {
  _inherits(ADS1015, _ADS1x2);

  function ADS1015() {
    _classCallCheck(this, ADS1015);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(ADS1015).call(this, arguments));
  }

  _createClass(ADS1015, [{
    key: '_data_rate_default',
    value: function _data_rate_default() {
      return 1600;
    }
  }, {
    key: '_data_rate_config',
    value: function _data_rate_config(data_rate) {
      if (!(data_rate in ADS1015_CONFIG_DR)) throw new Error('Data rate must be one of: 128, 250, 490, 920, 1600, 2400, 3300');
      return ADS1015_CONFIG_DR[data_rate];
    }
  }, {
    key: '_conversion_value',
    value: function _conversion_value(low, high) {
      value = (high & 0xFF) << 4 | (low & 0xFF) >> 4;
      return value & 0x8000 !== 0 ? value - (1 << 12) : value;
    }
  }]);

  return ADS1015;
}(ADS1x15);

module.exports = {
  ADS1015: ADS1015,
  ADS1115: ADS1115,
  ADS1x15: ADS1x15
};