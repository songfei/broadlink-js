const BroadlinkDevice = require('./device');

class BroadlinkDeviceMP1 extends BroadlinkDevice {
    constructor(info) {
        super(info);
        this.getPowerCallbackList = [];
    }

    setPower(state, indexs = [0, 1, 2, 3]) {
        if(!Array.isArray(indexs)) {
            throw new TypeError();
        }

        let power = (state === 'on') ? 1 : 0;
        let mask = 0;
        for(let i in indexs){
            let value = indexs[i];
            if(value >= 0 && value < 4) {
                mask += 0x01 << value;
            }
        }

        var packet = Buffer.alloc(16,0);
        packet[0x00] = 0x0d;
        packet[0x02] = 0xa5;
        packet[0x03] = 0xa5;
        packet[0x04] = 0x5a;
        packet[0x05] = 0x5a;
        packet[0x06] = 0xb2 + (power ? (mask << 1) : mask);
        packet[0x07] = 0xc0;
        packet[0x08] = 0x02;
        packet[0x0a] = 0x03;
        packet[0x0d] = mask;
        packet[0x0e] = power ? mask : 0;

        this._sendPacket(0x6a, packet);
    }

    getPower(callback) {
        if (callback) {
            this.getPowerCallbackList.push(callback);
            let packet = Buffer.alloc(16, 0);
            packet[0x00] = 0x0a;
            packet[0x02] = 0xa5;
            packet[0x03] = 0xa5;
            packet[0x04] = 0x5a;
            packet[0x05] = 0x5a;
            packet[0x06] = 0xae;
            packet[0x07] = 0xc0;
            packet[0x08] = 0x01;

            this._sendPacket(0x6a, packet);
        }
    }

    _onPayloadReceived(command, errCode, payload) {
        super._onPayloadReceived(command, errCode, payload);
        if (errCode == 0 && payload[0] == 0x0e) {
            let state = payload[0x0e];

            let info = [];
            info[0] = (state & 0x01) == 0 ? 'off' : 'on';
            info[1] = (state & 0x02) == 0 ? 'off' : 'on';
            info[2] = (state & 0x04) == 0 ? 'off' : 'on';
            info[3] = (state & 0x08) == 0 ? 'off' : 'on';

            let callback = this.getPowerCallbackList.shift();
            if (callback) {
                callback(null, info);
            }
        }
    }
}

module.exports = BroadlinkDeviceMP1;