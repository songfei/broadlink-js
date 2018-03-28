const BroadlinkDevice = require('./device');

class BroadlinkDeviceSP2 extends BroadlinkDevice {
    constructor(info) {
        super(info);
        this.getPowerCallbackList = [];
    }

    setPower(state) {
        let packet = Buffer.alloc(16, 0);
        packet[0] = 2;
        packet[4] = state === 'on' ? 1 : 0;
        this._sendPacket(0x6a, packet);
    }

    getPower(callback) {
        if (callback) {
            this.getPowerCallbackList.push(callback);
            let packet = Buffer.alloc(16, 0);
            packet[0] = 1;
            this._sendPacket(0x6a, packet);
        }
    }

    _onPayloadReceived(command, errCode, payload) {
        super._onPayloadReceived(command, errCode, payload);
        if (errCode == 0 && payload[0] == 1) {
            let state = payload[4] == 1 ? 'on' : 'off';

            let callback = this.getPowerCallbackList.shift();
            if (callback) {
                callback(null, state);
            }
        }
    }
}

module.exports = BroadlinkDeviceSP2;