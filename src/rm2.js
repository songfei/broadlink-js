const BroadlinkDevice = require('./device');

class BroadlinkDeviceRM2 extends BroadlinkDevice {
    constructor(info) {
        super(info);

        this.getTemperatureCallbackList = [];
        this.learnCodeCallbackList = [];
        this.learning = false;
    }

    sendData(data) {
        let packet = new Buffer([0x02, 0x00, 0x00, 0x00]);
        packet = Buffer.concat([packet, data]);
        this._sendPacket(0x6a, packet);
    }

    getTemperature(callback) {
        if(callback) {
            this.getTemperatureCallbackList.push(callback);
            let packet = Buffer.alloc(16,0);
            packet[0] = 0x01;
            this._sendPacket(0x6a, packet);
        }
    }

    _checkData() {
        if(this.learning) {
            let packet = Buffer.alloc(16,0);
            packet[0] = 0x04;
            this._sendPacket(0x6a, packet);
            setTimeout(this._checkData.bind(this), 1000);
        }
    }

    learnCode(callback) {
        if(callback) {
            this.learnCodeCallbackList.push(callback);
            let packet = Buffer.alloc(16,0);
            packet[0] = 0x03;
            this._sendPacket(0x6a, packet);
            this.learning = true;
            this._checkData();
        }
    }

    cancelLearnCode() {
        const packet = Buffer.alloc(16, 0);
        packet[0] = 0x1e;
        this._sendPacket(0x6a, packet);
        this.learning = false;
    }

    _onPayloadReceived(command, errCode, payload) {
        super._onPayloadReceived(command, errCode, payload);
        //温度
        if (errCode == 0 && payload[0] == 0x01) {
            let temp = (payload[0x04] * 10 + payload[0x05]) / 10.0;
            let callback = this.getTemperatureCallbackList.shift();
            if (callback) {
                callback(null, temp);
            }
        }
        //学习包
        else if (errCode == 0 && payload[0] == 0x04) {
            let data = Buffer.alloc(payload.length - 4, 0);
            payload.copy(data, 0, 4);
            let callback = this.learnCodeCallbackList.shift();
            if (callback) {
                callback(null, data);
            }
            this.learning = false;
        }
    }
}

module.exports = BroadlinkDeviceRM2;