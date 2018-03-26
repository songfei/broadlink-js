let broadlink = require('../index.js');

let b = new broadlink.Broadlink();

b.on('listen', function(res) {
    console.log('listening', res);
})

b.on('discover', function(res) {
    console.log('discover', res);
    let d = new broadlink.BroadlinkDeviceSP2(res);
    d.on('ready', function(res) {
        console.log('ready', res);
        
        d.getPower(function(res) {
            console.log(res);
        });

        d.setPower(false);

        d.getPower(function (res) {
            console.log(res);
        });

        d.setPower(true);

        d.getPower(function (res) {
            console.log(res);
        });
    });
})

b.discover();