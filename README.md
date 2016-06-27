#Node-ADS1x15

This is a port of Adafruit's ADS1x15 controller from python to nodejs.  The functionality to has been left the same as much as possible, while also using node's async callback style.

##Install
`npm i --save jgimbel/node-ads-1x15`

##Usage
```js
const ads1x15 = require('ads-1x15')

const ADS1115 = new ads1x15.ADS1115(0x18, {device: '/dev/i2c-1'}) //Same parameters as node-i2c

[0,1,2,3].forEach(function(channel){
  ADS1115.read_adc(channel, '2/3', null, function(err, val){
    if(err) console.error(err)
    console.log(val)    
  })
})
```
 
