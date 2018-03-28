const EventEmitter = require('events');
const dgram = require('dgram');
const os = require('os');
const crypto = require('crypto');

const deviceTypeList = {
    //sp1
    '0x0': {
        'name': 'Broadlink SP1',
        'module': 'sp1',
    },

    //sp2
    '0x2711': {
        'name': 'Broadlink SP2',
        'module': 'sp2',
    },
    '0x2719': {
        'name': 'Honeywell SP2',
        'module': 'sp2',
    },
    '0x7919': {
        'name': 'Honeywell SP2',
        'module': 'sp2',
    },
    '0x271a': {
        'name': 'Honeywell SP2',
        'module': 'sp2',
    },
    '0x791a': {
        'name': 'Honeywell SP2',
        'module': 'sp2',
    },
    '0x2720': {
        'name': 'Broadlink SP Mini',
        'module': 'sp2',
    },
    '0x2733': {
        'name': 'OEM Branded SP Mini',
        'module': 'sp2',
    },
    '0x273e': {
        'name': 'OEM Branded SP Mini',
        'module': 'sp2',
    },
    '0x753e': {
        'name': 'Broadlink SP3',
        'module': 'sp2',
    },
    '0x2728': {
        'name': 'Broadlink SPMini 2',
        'module': 'sp2',
    },
    '0x2736': {
        'name': 'Broadlink SPMini Plus',
        'module': 'sp2',
    },

    //rm2
    '0x2712': {
        'name': 'Broadlink RM2',
        'module': 'rm2',
    },
    '0x2737': {
        'name': 'Broadlink RM Mini',
        'module': 'rm2',
    },
    '0x273d': {
        'name': 'Broadlink RM Pro Phicomm',
        'module': 'rm2',
    },
    '0x2783': {
        'name': 'Broadlink RM2 Home Plus',
        'module': 'rm2',
    },
    '0x277c': {
        'name': 'Broadlink RM2 Home Plus GDT',
        'module': 'rm2',
    },
    '0x272a': {
        'name': 'Broadlink RM2 Pro Plus',
        'module': 'rm2',
    },
    '0x2787': {
        'name': 'Broadlink RM2 Pro Plus v2',
        'module': 'rm2',
    },
    '0x278b': {
        'name': 'Broadlink RM2 Pro Plus BL',
        'module': 'rm2',
    },
    '0x278f': {
        'name': 'Broadlink RM Mini Shate',
        'module': 'rm2',
    },

    //a1
    '0x2714': {
        'name': 'Broadlink A1',
        'module': 'a1',
    },

    //mp1
    '0x4eb5': {
        'name': 'Broadlink MP1',
        'module': 'mp1',
    },

    //unknow
    '0x279d': {
        'name': 'Broadlink RM3 Pro Plus',
        'module': 'unknow',
    },
    '0x27a9': {
        'name': 'Broadlink RM3 Pro Plus v2',
        'module': 'unknow',
    },
    '0x2722': {
        'name': 'Broadlink S1 (SmartOne Alarm Kit)',
        'module': 'unknow',
    },
    '0x4e4d': {
        'name': 'Dooya DT360E (DOOYA_CURTAIN_V2) or Hysen Heating Controller',
        'module': 'unknow',
    },
}

class Broadlink extends EventEmitter {
    constructor() {
        super();
        this.sockets = [];
    }

    discover() {
        // Close existing sockets
        this.sockets.forEach((socket) => {
            socket.close();
        })

        this.sockets = [];

        // Open a UDP socket on each network interface/IP address
        const ipAddresses = this._getLocalIPAddresses();

        ipAddresses.forEach((ipAddress) => {
            const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.sockets.push(socket)

            socket.on('listening', this._onListening.bind(this, socket, ipAddress));
            socket.on('message', this._onMessage.bind(this));

            socket.bind(0, ipAddress);
        })
    }

    _getLocalIPAddresses() {
        const interfaces = os.networkInterfaces();
        const ipAddresses = [];

        Object.keys(interfaces).forEach((interfaceID) => {
            const currentInterface = interfaces[interfaceID];

            currentInterface.forEach((address) => {
                if (address.family === 'IPv4' && !address.internal) {
                    ipAddresses.push(address.address);
                }
            })
        })

        return ipAddresses;
    }

    _onListening(socket, ipAddress) {
        // Broadcase a multicast UDP message to let Broadlink devices know we're listening
        socket.setBroadcast(true);

        const splitIPAddress = ipAddress.split('.');
        const port = socket.address().port;
        this.emit('listen', { address: ipAddress, port: port });

        const now = new Date();
        const starttime = now.getTime();

        const timezone = now.getTimezoneOffset() / -3600;
        const packet = Buffer.alloc(0x30, 0);

        const year = now.getYear();

        if (timezone < 0) {
            packet[0x08] = 0xff + timezone - 1;
            packet[0x09] = 0xff;
            packet[0x0a] = 0xff;
            packet[0x0b] = 0xff;
        } else {
            packet[0x08] = timezone;
            packet[0x09] = 0;
            packet[0x0a] = 0;
            packet[0x0b] = 0;
        }

        packet[0x0c] = year & 0xff;
        packet[0x0d] = year >> 8;
        packet[0x0e] = now.getMinutes();
        packet[0x0f] = now.getHours();

        const subyear = year % 100;
        packet[0x10] = subyear;
        packet[0x11] = now.getDay();
        packet[0x12] = now.getDate();
        packet[0x13] = now.getMonth();
        packet[0x18] = parseInt(splitIPAddress[0]);
        packet[0x19] = parseInt(splitIPAddress[1]);
        packet[0x1a] = parseInt(splitIPAddress[2]);
        packet[0x1b] = parseInt(splitIPAddress[3]);
        packet[0x1c] = port & 0xff;
        packet[0x1d] = port >> 8;
        packet[0x26] = 6;

        let checksum = 0xbeaf;

        for (let i = 0; i < packet.length; i++) {
            checksum += packet[i];
        }

        checksum = checksum & 0xffff;
        packet[0x20] = checksum & 0xff;
        packet[0x21] = checksum >> 8;

        socket.sendto(packet, 0, packet.length, 80, '255.255.255.255');
    }

    _onMessage(message, host) {
        // Broadlink device has responded
        const macAddress = Buffer.alloc(6, 0);

        message.copy(macAddress, 0x00, 0x3D);
        message.copy(macAddress, 0x01, 0x3E);
        message.copy(macAddress, 0x02, 0x3F);
        message.copy(macAddress, 0x03, 0x3C);
        message.copy(macAddress, 0x04, 0x3B);
        message.copy(macAddress, 0x05, 0x3A);

        const deviceType = Buffer.alloc(2, 0);
        message.copy(deviceType, 0x00, 0x35);
        message.copy(deviceType, 0x01, 0x34);

        const deviceTypeKey = '0x' + deviceType.toString('hex');
        const type = deviceTypeList[deviceTypeKey];

        let info = {
            address: host.address,
            port: host.port,
            mac: macAddress,
            type: deviceType,
            name: type.name,
            module: type.module,
        }

        this.emit('discover', info);
    }
}

module.exports = Broadlink;