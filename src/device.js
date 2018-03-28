const EventEmitter = require('events');
const dgram = require('dgram');
const os = require('os');
const crypto = require('crypto');

class BroadlinkDevice extends EventEmitter {
    constructor(info) {
        super();
        this.address = info.address;
        this.port = info.port;
        this.mac = info.mac;

        this.count = Math.random() & 0xffff;
        this.key = new Buffer([0x09, 0x76, 0x28, 0x34, 0x3f, 0xe9, 0x9e, 0x23, 0x76, 0x5c, 0x15, 0x13, 0xac, 0xcf, 0x8b, 0x02]);
        this.iv = new Buffer([0x56, 0x2e, 0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58]);
        this.id = new Buffer([0, 0, 0, 0]);
        this.type = new Buffer([0, 0]);

        this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        this.socket.on('message', this._onMessage.bind(this))
        this.socket.bind();

        this._authenticate()
    }

    _onMessage(message) {
        //错误码
        const errCode = message[0x22] | (message[0x23] << 8);
        
        //得到加密数据
        const encryptedPayload = Buffer.alloc(message.length - 0x38, 0);
        message.copy(encryptedPayload, 0, 0x38);

        //解密
        const decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
        decipher.setAutoPadding(false);
        let payload = decipher.update(encryptedPayload);
        const payload2 = decipher.final();
        if (payload2) {
            payload = Buffer.concat([payload, payload2]);
        }
        if (!payload) {
            throw new Error('payload is empty');
        }

        //命令
        const command = message[0x26];
        if (errCode == 0 && command == 0xe9) {
            this.key = Buffer.alloc(0x10, 0);
            payload.copy(this.key, 0, 0x04, 0x14);

            this.id = Buffer.alloc(0x04, 0);
            payload.copy(this.id, 0, 0x00, 0x04);

            this.emit('ready', { id: this.id });
        }
        else {
            this._onPayloadReceived(command, errCode, payload);
        }
    }

    _sendPacket(command, payload) {
        this.count = (this.count + 1) & 0xffff;

        let packet = Buffer.alloc(0x38, 0);
        packet[0x00] = 0x5a;
        packet[0x01] = 0xa5;
        packet[0x02] = 0xaa;
        packet[0x03] = 0x55;
        packet[0x04] = 0x5a;
        packet[0x05] = 0xa5;
        packet[0x06] = 0xaa;
        packet[0x07] = 0x55;
        packet[0x24] = 0x2a;
        packet[0x25] = 0x27;
        packet[0x26] = command;
        packet[0x28] = this.count & 0xff;
        packet[0x29] = this.count >> 8;
        packet[0x2a] = this.mac[5];
        packet[0x2b] = this.mac[4];
        packet[0x2c] = this.mac[3];
        packet[0x2d] = this.mac[2];
        packet[0x2e] = this.mac[1];
        packet[0x2f] = this.mac[0];
        packet[0x30] = this.id[0];
        packet[0x31] = this.id[1];
        packet[0x32] = this.id[2];
        packet[0x33] = this.id[3];

        let checksum = 0xbeaf;
        for (let i = 0; i < payload.length; i++) {
            checksum += payload[i];
            checksum = checksum & 0xffff;
        }

        const cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
        payload = cipher.update(payload);

        packet[0x34] = checksum & 0xff;
        packet[0x35] = checksum >> 8;

        packet = Buffer.concat([packet, payload]);

        checksum = 0xbeaf;
        for (let i = 0; i < packet.length; i++) {
            checksum += packet[i];
            checksum = checksum & 0xffff;
        }
        packet[0x20] = checksum & 0xff;
        packet[0x21] = checksum >> 8;

        // console.log('\x1b[33m[DEBUG]\x1b[0m packet', packet.toString('hex'));

        this.socket.send(packet, 0, packet.length, this.port, this.address, (err, bytes) => {
            if (err) {
                throw err;
            }
            else {
                // console.log('\x1b[33m[DEBUG]\x1b[0m successfuly sent packet - bytes: ', bytes);
            }
        });
    }

    _authenticate() {
        const payload = Buffer.alloc(0x50, 0);
        payload[0x04] = 0x31;
        payload[0x05] = 0x31;
        payload[0x06] = 0x31;
        payload[0x07] = 0x31;
        payload[0x08] = 0x31;
        payload[0x09] = 0x31;
        payload[0x0a] = 0x31;
        payload[0x0b] = 0x31;
        payload[0x0c] = 0x31;
        payload[0x0d] = 0x31;
        payload[0x0e] = 0x31;
        payload[0x0f] = 0x31;
        payload[0x10] = 0x31;
        payload[0x11] = 0x31;
        payload[0x12] = 0x31;
        payload[0x1e] = 0x01;
        payload[0x2d] = 0x01;
        payload[0x30] = 'T'.charCodeAt(0);
        payload[0x31] = 'e'.charCodeAt(0);
        payload[0x32] = 's'.charCodeAt(0);
        payload[0x33] = 't'.charCodeAt(0);
        payload[0x34] = ' '.charCodeAt(0);
        payload[0x35] = ' '.charCodeAt(0);
        payload[0x36] = '1'.charCodeAt(0);

        this._sendPacket(0x65, payload);
    }

    _onPayloadReceived(command, errCode, payload) {
        // console.log('command:' + command + ' errCode:' + errCode + ' receive:' + payload.toString('hex'));
    }
}

module.exports = BroadlinkDevice;