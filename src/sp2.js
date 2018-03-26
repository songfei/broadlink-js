const BroadlinkDevice = require('./device');

class BroadlinkDeviceSP2 extends BroadlinkDevice {
    constructor(info) {
        super(info);
        this.getPowerCallbackList = [];
    }

    setPower(state) {
        let packet = Buffer.alloc(16, 0);
        packet[0] = 2;
        packet[4] = state ? 1 : 0;
        this._sendPacket(0x6a, packet);
    }

    getPower(cb) {
        if (cb) {
            this.getPowerCallbackList.push(cb);
            let packet = Buffer.alloc(16, 0);
            packet[0] = 1;
            this._sendPacket(0x6a, packet);
        }
    }

    _onPayloadReceived(payload) {
        super._onPayloadReceived(payload);
        if (payload[0] == 1) {
            let info = {};
            info.code = payload[4];
            info.power = payload[4] == 1 ? 'on' : 'off';

            let callback = this.getPowerCallbackList.shift();
            if (callback) {
                callback(info);
            }
        }
    }
}

module.exports = BroadlinkDeviceSP2;