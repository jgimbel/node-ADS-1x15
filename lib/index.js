const DEFAULT_ADDRESS = 0x48
    , POITNER_CONVERSION = 0x00
    , POINTER_CONFIG = 0x01
    , POINTER_LOW_THRESHOLD = 0x02
    , POINTER_HIGH_THRESHOLD = 0x03
    , CONFIG_OS_SINGLE = 0x8000
    , MUX_OFFSET = 12
    , GAIN = {
		'2/3': 0x0000,
		1: 0x0200,
		2: 0x0400,
		4: 0x0600,
		8: 0x0800,
		16: 0x0A00,
    }
    , MODE_CONTINOUS = 0x0000
    , MODE_SINGLE = 0x0100
    , ADS1015_DR = {
      128:  0x0000,
      250:  0x0020,
      490:  0x0040,
      920:  0x0060,
      1600: 0x0080,
      2400: 0x00A0,
      3300: 0x00C0,
    }
	, ADS1115_DR = {
      8:  0x0000,
      16:  0x0020,
      32:  0x0040,
      64:  0x0060,
      128: 0x0080,
      250: 0x00A0,
      475: 0x00C0,
      860: 0x00E0,
    }
    , COMP_WINDOW = 0x0010
    , COMP_ACTIVE_HIGH = 0x0008
    , COMP_LATCHING = 0x0004
    COMP_QUE = {
      1: 0x0000,
      2: 0x0001,
      4: 0x0002
    }
    , COMP_QUE_DISABLE = 0x0003

const i2c = require('i2c')

class ADS1x15 {
  constructor(){
    this._device = new i2c(arguments)
  }

  data_rate_default() {
    new Error('data_rate_default has not been implemented by the sub class')
  }

  data_rate_config(data_rate) {
    new Error('Subclass must implement _data_rate_config function!')
  }

  conversion_value(low, high) {
    new Error('Subclass must implement _conversion_value!')
  }

 _read({ mux, gain, data_rate, mode }, cb) {
    process.nextTick(function(){
      let config = CONFIG_OS_SINGLE
      config |= (mux * 0x07) << MUX_OFFSET
    
      if(!gain in CONFIG_GAIN) return cb(new Error('Gain must be one of: "2/3", 1, 2, 4, 8, 16'))
      config |= GAIN[gain]
    
      config |= mode
    
      data_rate = data_rate ? data_rate : this._data_rate_default()
      config |= this._data_rate_cofnig(data_rate)
      config |= COMP_QUE_DISABLE
    
      this._device.writeBytes(POINTER_CONFIG, [(config >> 8) & 0xFF, config & 0xFF], function(err){ 
        if(err) return cb(err)
        this._device.readBytes(POINTER_CONVERSION, 2, function(err, data){
          if(err) return cb(err)
          cb(null, this._conversion_value(data[1], data[0]))
        })
      })
    })
  }

  _read_comparator({
    mux, 
    gain, 
    data_rate = this._data_rate_default(), 
    mode, 
    high_threshold, 
    low_threshold, 
    active_low, 
    traditional, 
    latching, 
    num_readings
  }, cb){
    if(!(num_readings === 1 || num_reading === 2 || num_reading === 4)) return cb(new Error('num_reading must be 1 or 2 or 5'))
  
    this._device.writeBytes(POINTER_HIGH_THRESHOLD, [(high_threshold >> 8) & 0xFF, high_threshold & 0xFF], function(err){
      if(err) return cb(err)
	
	  this._device.writeBytes(POINTER_LOW_THRESHOLD, [(low_threshold >> 8) & 0xFF, low_threshold & 0xFF], function(){
        if(err) return cb(err)
       

        let config = CONFIG_OS_SINGLE
        config |= (mux & 0x07) << MUX_OFFSET
 
        if (!(gain in GAIN)) return cb(new Error('Gain must be one of: "2/3", 1, 2, 4, 8, 16'))
        config |= GAIN[gain]
  
        config |= mode
        config |= this._data_rate_config(data_rate)
        config = (traditional)
          ? config
          : config | COMP_WINDOW
        config = (active_low)
          ? config
          : config | COMP_ACTIVE_HIGH
   
        config = (latching)
          ? config | COMP_LATCHING
          : config
      
        config |= COMP_QUE[num_readings]
    
        this._device.writeBytes(POINTER_CONFIG, [(config >> 8) & 0xFF, config & 0xFF], function(err) {
          if(err) return cb(err)
        
          this._device.readBytes(POINTER_CONVERSION, 2, function(err, result) {
		    if(err) return cb(err)
		    cb(null, this._conversion_value(result[1], result[0]))
          })
        })
      })
    })
  }
 
  read_adc(channel, gain = 1, data_rate, cb){
    if(channel < 0 || channel > 3) return cb(new Error('channel must be a value within 0-3!'))
  
    this._read(channel + 0x04, gain, data_rate, MODE_SINGLE, cb)
  }


  read_adc_difference(differential, gain, data_rate, cb){
    gain = gain ? gain : 1
    if(channel < 0 || channel > 3) return cb(new Error('differential must be a value within 0-3!'))
  
    this._read(differential, gain, data_rate, MODE_SINGLE, cb)
  }

  start_adc(channel, gain, data_rate, cb){
    gain = gain ? gain : 1
    if(channel < 0 || channel > 3) return cb(new Error('channel must be a value within 0-3!'))
  
    this._read(channel + 0x04, gain, data_rate, MODE_CONTINUOUS, cb)
  }

  start_acd_comparator({
    channel, 
    high_threshold, 
    low_threshold, 
    gain=1, 
    data_rate, 
    active_low = true,
    traditional = true,
    latching = false,
    num_readings = 1   	
  }, cb) {
    if(channel < 0 || channel > 3) return cb(new Error('Channel must be a value within 0-3!'))
    cb(null, this._read_comparator({
	  mux: channel + 0x04, 
	  gain, 
	  data_rate, 
	  mode: MODE_CONTINUOUS, 
	  high_threshold, 
	  low_threshold,
	  active_low,
	  traditional,
	  latching,
	  num_readings
	}, cb))
  }

  start_acd_difference_comparator({
    differential, 
    high_threshold, 
    low_threshold, 
    gain=1, 
    data_rate, 
    active_low = true,
    traditional = true,
    latching = false,
    num_readings = 1   	
  }, cb) {
    if(differential < 0 || differential > 3) return cb(new Error('Differential must be a value within 0-3!'))
    cb(null, this._read_comparator({
	  mux: differential, 
	  gain, 
	  data_rate, 
	  mode: MODE_CONTINUOUS, 
	  high_threshold, 
	  low_threshold,
	  active_low,
	  traditional,
	  latching,
	  num_readings
	}, cb))
  }

  stop_adc(cb) {
    let config = 0x8583
    this._device.writeBytes(POINTER_CONFIG, [(config >> 8) & 0xFF, config & 0xFF], function(err){
      if(err) return cb(err)
      return cb(null)
    })
  }

  get_last_result(cb) {
    this._device.readBytes(POINTER_CONFIG, 2, function(err){
      if(err) return cb(err)
      return cb(null, this._conversion_value(result[1], result[0]))
    })
  }
}
class ADS1115 extends ADS1x15{
  constructor(){
    super(arguments)
  }
  
  _data_rate_default() {
    return 128
  }
  
  _data_rate_config(data_rate){
    if(!(data_rate in ADS1115_CONFIG_DR)) throw new Error('Data rate must be one of 8, 16, 32, 64, 128, 250, 475, 860')
    return ADS1115_CONFIG_DR[data_rate]
  }
  
  _conversion_value(low, high){
    value = ((high & 0xFF) << 8) | (low & 0xFF)
    return (value & 0x8000 !== 0) 
      ? value - (1 << 16)
      : value
  }
}

class ADS1015 extends ADS1x15{
  constructor(){
    super(arguments)
  }
  
  _data_rate_default() {
    return 1600
  }
  
  _data_rate_config(data_rate){
    if(!(data_rate in ADS1015_CONFIG_DR)) throw new Error('Data rate must be one of: 128, 250, 490, 920, 1600, 2400, 3300')
    return ADS1015_CONFIG_DR[data_rate]
  }
  
  _conversion_value(low, high){
    value = ((high & 0xFF) << 4) | ((low & 0xFF) >> 4)
    return (value & 0x8000 !== 0) 
      ? value - (1 << 12)
      : value
  }
}


module.exports = {
  ADS1015,
  ADS1115,
  ADS1x15	
}
