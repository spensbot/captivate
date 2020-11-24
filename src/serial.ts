// const serialport = require('serialport');
const serialport = window.require('serialport')

serialport.list().then(ports => {
    console.log('ports', ports)
})
.catch(err => {
    console.log(err)
})
