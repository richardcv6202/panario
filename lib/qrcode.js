// ============================================================
// 📦 QRCODE.JS - Generador de códigos QR
// Basado en qrcode-generator de Kazuhiko Arase (MIT License)
// Adaptado para Panario - Exposición como window.QRCode
// Versión: 1.4.4 (standalone)
// 
// Uso:
//   const qr = new window.QRCode({
//       text: "Hola mundo",
//       width: 256,
//       height: 256,
//       colorDark: "#000000",
//       colorLight: "#ffffff",
//       correctLevel: "M" // L, M, Q, H
//   });
//   qr.toDataURL();  // → "data:image/png;base64,..."
//   qr.toCanvas();   // → HTMLCanvasElement
//   qr.toSVG();      // → String SVG
// ============================================================

(function(global) {
    'use strict';

    // ============================================================
    // CONSTANTES
    // ============================================================
    const QRMode = {
        MODE_NUMBER: 1 << 0,
        MODE_ALPHA_NUM: 1 << 1,
        MODE_8BIT_BYTE: 1 << 2,
        MODE_KANJI: 1 << 3
    };

    const QRErrorCorrectLevel = {
        L: 1,
        M: 0,
        Q: 3,
        H: 2
    };

    const QRMaskPattern = {
        PATTERN000: 0,
        PATTERN001: 1,
        PATTERN010: 2,
        PATTERN011: 3,
        PATTERN100: 4,
        PATTERN101: 5,
        PATTERN110: 6,
        PATTERN111: 7
    };

    // ============================================================
    // QR MATH
    // ============================================================
    const QRMath = (function() {
        const EXP_TABLE = new Array(256);
        const LOG_TABLE = new Array(256);

        for (let i = 0; i < 8; i++) {
            EXP_TABLE[i] = 1 << i;
        }
        for (let i = 8; i < 256; i++) {
            EXP_TABLE[i] = EXP_TABLE[i - 4] ^ EXP_TABLE[i - 5] ^ EXP_TABLE[i - 6] ^ EXP_TABLE[i - 8];
        }
        for (let i = 0; i < 255; i++) {
            LOG_TABLE[EXP_TABLE[i]] = i;
        }

        return {
            glog: function(n) {
                if (n < 1) throw new Error("glog(" + n + ")");
                return LOG_TABLE[n];
            },
            gexp: function(n) {
                while (n < 0) n += 255;
                while (n >= 256) n -= 255;
                return EXP_TABLE[n];
            }
        };
    })();

    // ============================================================
    // POLYNOMIAL
    // ============================================================
    function QRPolynomial(num, shift) {
        if (num.length === undefined) throw new Error(num.length + "/" + shift);
        let offset = 0;
        while (offset < num.length && num[offset] === 0) offset++;
        this.num = new Array(num.length - offset + shift);
        for (let i = 0; i < num.length - offset; i++) {
            this.num[i] = num[i + offset];
        }
    }

    QRPolynomial.prototype.get = function(index) {
        return this.num[index];
    };

    QRPolynomial.prototype.getLength = function() {
        return this.num.length;
    };

    QRPolynomial.prototype.multiply = function(e) {
        const num = new Array(this.getLength() + e.getLength() - 1);
        for (let i = 0; i < this.getLength(); i++) {
            for (let j = 0; j < e.getLength(); j++) {
                num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
            }
        }
        return new QRPolynomial(num, 0);
    };

    QRPolynomial.prototype.mod = function(e) {
        if (this.getLength() - e.getLength() < 0) return this;
        const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        const num = new Array(this.getLength());
        for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
        for (let i = 0; i < e.getLength(); i++) {
            num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
        }
        return new QRPolynomial(num, 0).mod(e);
    };

    // ============================================================
    // RS BLOCK
    // ============================================================
    function QRRSBlock(totalCount, dataCount) {
        this.totalCount = totalCount;
        this.dataCount = dataCount;
    }

    QRRSBlock.RS_BLOCK_TABLE = [
        // L
        [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
        [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
        [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
        [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
        [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
        [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
        [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
        [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
        [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
        [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],
        // M
        [1, 26, 16], [1, 26, 14], [1, 26, 11], [1, 26, 7],
        [1, 44, 28], [1, 44, 22], [1, 44, 17], [1, 44, 13],
        [1, 70, 44], [1, 70, 34], [2, 35, 13], [2, 35, 9],
        [1, 100, 64], [2, 50, 26], [2, 50, 18], [4, 25, 7],
        [1, 134, 86], [2, 67, 35], [2, 33, 12, 2, 34, 13], [2, 33, 9, 2, 34, 10],
        [2, 86, 54], [4, 43, 22], [4, 43, 15], [4, 43, 11],
        [2, 98, 62], [4, 49, 25], [2, 32, 11, 4, 33, 12], [4, 39, 11, 1, 40, 12],
        [2, 121, 78], [2, 60, 30, 2, 61, 31], [4, 40, 14, 2, 41, 15], [4, 40, 11, 2, 41, 12],
        [2, 146, 92], [3, 58, 29, 2, 59, 30], [4, 36, 13, 4, 37, 14], [4, 36, 9, 4, 37, 10],
        [2, 86, 54, 2, 87, 55], [4, 69, 34, 1, 70, 35], [6, 43, 15, 2, 44, 16], [6, 43, 11, 2, 44, 12],
        // Q
        [1, 26, 13], [1, 26, 12], [1, 26, 9], [1, 26, 5],
        [1, 44, 22], [1, 44, 18], [1, 44, 13], [1, 44, 9],
        [1, 70, 34], [1, 70, 26], [2, 35, 11], [2, 35, 7],
        [1, 100, 48], [2, 50, 20], [2, 50, 14], [4, 25, 5],
        [1, 134, 64], [2, 67, 27], [2, 33, 9, 2, 34, 10], [2, 33, 7, 2, 34, 8],
        [2, 86, 40], [4, 43, 17], [4, 43, 11], [4, 43, 8],
        [2, 98, 46], [4, 49, 19], [2, 32, 8, 4, 33, 9], [4, 39, 8, 1, 40, 9],
        [2, 121, 58], [2, 60, 22, 2, 61, 23], [4, 40, 10, 2, 41, 11], [4, 40, 8, 2, 41, 9],
        [2, 146, 68], [3, 58, 21, 2, 59, 22], [4, 36, 9, 4, 37, 10], [4, 36, 7, 4, 37, 8],
        [2, 86, 40, 2, 87, 41], [4, 69, 25, 1, 70, 26], [6, 43, 11, 2, 44, 12], [6, 43, 8, 2, 44, 9],
        // H
        [1, 26, 9], [1, 26, 8], [1, 26, 7], [1, 26, 4],
        [1, 44, 16], [1, 44, 12], [1, 44, 9], [1, 44, 6],
        [1, 70, 26], [1, 70, 20], [2, 35, 8], [2, 35, 5],
        [1, 100, 34], [2, 50, 16], [2, 50, 10], [4, 25, 4],
        [1, 134, 46], [2, 67, 19], [2, 33, 6, 2, 34, 7], [2, 33, 5, 2, 34, 6],
        [2, 86, 28], [4, 43, 12], [4, 43, 8], [4, 43, 6],
        [2, 98, 32], [4, 49, 14], [2, 32, 6, 4, 33, 7], [4, 39, 6, 1, 40, 7],
        [2, 121, 40], [2, 60, 15, 2, 61, 16], [4, 40, 7, 2, 41, 8], [4, 40, 6, 2, 41, 7],
        [2, 146, 46], [3, 58, 14, 2, 59, 15], [4, 36, 6, 4, 37, 7], [4, 36, 5, 4, 37, 6],
        [2, 86, 28, 2, 87, 29], [4, 69, 17, 1, 70, 18], [6, 43, 8, 2, 44, 9], [6, 43, 5, 2, 44, 6]
    ];

    QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
        const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
        if (rsBlock === undefined) {
            throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
        }
        const length = rsBlock.length / 3;
        const list = [];
        for (let i = 0; i < length; i++) {
            const count = rsBlock[i * 3 + 0];
            const totalCount = rsBlock[i * 3 + 1];
            const dataCount = rsBlock[i * 3 + 2];
            for (let j = 0; j < count; j++) {
                list.push(new QRRSBlock(totalCount, dataCount));
            }
        }
        return list;
    };

    QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {
        const offset = (typeNumber - 1) * 4;
        switch (errorCorrectLevel) {
            case QRErrorCorrectLevel.L: return QRRSBlock.RS_BLOCK_TABLE[offset + 0];
            case QRErrorCorrectLevel.M: return QRRSBlock.RS_BLOCK_TABLE[offset + 1];
            case QRErrorCorrectLevel.Q: return QRRSBlock.RS_BLOCK_TABLE[offset + 2];
            case QRErrorCorrectLevel.H: return QRRSBlock.RS_BLOCK_TABLE[offset + 3];
            default: return undefined;
        }
    };

    // ============================================================
    // BIT BUFFER
    // ============================================================
    function QRBitBuffer() {
        this.buffer = [];
        this.length = 0;
    }

    QRBitBuffer.prototype = {
        get: function(index) {
            const bufIndex = Math.floor(index / 8);
            return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
        },
        put: function(num, length) {
            for (let i = 0; i < length; i++) {
                this.putBit(((num >>> (length - i - 1)) & 1) === 1);
            }
        },
        getLengthInBits: function() {
            return this.length;
        },
        putBit: function(bit) {
            const bufIndex = Math.floor(this.length / 8);
            if (this.buffer.length <= bufIndex) this.buffer.push(0);
            if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
            this.length++;
        }
    };

    // ============================================================
    // QR 8BIT BYTE
    // ============================================================
    function QR8bitByte(data) {
        this.mode = QRMode.MODE_8BIT_BYTE;
        this.data = data;
        this.parsedData = [];

        for (let i = 0, l = this.data.length; i < l; i++) {
            const byteArray = [];
            const code = this.data.charCodeAt(i);

            if (code > 0x10000) {
                byteArray[0] = 0xF0 | ((code & 0x1C0000) >>> 18);
                byteArray[1] = 0x80 | ((code & 0x3F000) >>> 12);
                byteArray[2] = 0x80 | ((code & 0xFC0) >>> 6);
                byteArray[3] = 0x80 | (code & 0x3F);
            } else if (code > 0x800) {
                byteArray[0] = 0xE0 | ((code & 0xF000) >>> 12);
                byteArray[1] = 0x80 | ((code & 0xFC0) >>> 6);
                byteArray[2] = 0x80 | (code & 0x3F);
            } else if (code > 0x80) {
                byteArray[0] = 0xC0 | ((code & 0x7C0) >>> 6);
                byteArray[1] = 0x80 | (code & 0x3F);
            } else {
                byteArray[0] = code;
            }

            this.parsedData.push(byteArray);
        }

        this.parsedData = Array.prototype.concat.apply([], this.parsedData);

        if (this.parsedData.length !== this.data.length) {
            this.parsedData.unshift(191);
            this.parsedData.unshift(187);
            this.parsedData.unshift(239);
        }
    }

    QR8bitByte.prototype = {
        getLength: function() {
            return this.parsedData.length;
        },
        write: function(buffer) {
            for (let i = 0, l = this.parsedData.length; i < l; i++) {
                buffer.put(this.parsedData[i], 8);
            }
        }
    };

    // ============================================================
    // QR CODE MODEL
    // ============================================================
    function QRCodeModel(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    QRCodeModel.prototype = {
        addData: function(data) {
            const newData = new QR8bitByte(data);
            this.dataList.push(newData);
            this.dataCache = null;
        },

        isDark: function(row, col) {
            if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
                throw new Error(row + "," + col);
            }
            return this.modules[row][col];
        },

        getModuleCount: function() {
            return this.moduleCount;
        },

        make: function() {
            this.makeImpl(false, this.getBestMaskPattern());
        },

        makeImpl: function(test, maskPattern) {
            this.moduleCount = this.typeNumber * 4 + 17;
            this.modules = new Array(this.moduleCount);

            for (let row = 0; row < this.moduleCount; row++) {
                this.modules[row] = new Array(this.moduleCount);
                for (let col = 0; col < this.moduleCount; col++) {
                    this.modules[row][col] = null;
                }
            }

            this.setupPositionProbePattern(0, 0);
            this.setupPositionProbePattern(this.moduleCount - 7, 0);
            this.setupPositionProbePattern(0, this.moduleCount - 7);
            this.setupPositionAdjustPattern();
            this.setupTimingPattern();
            this.setupTypeInfo(test, maskPattern);

            if (this.typeNumber >= 7) {
                this.setupTypeNumber(test);
            }

            if (this.dataCache == null) {
                this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
            }

            this.mapData(this.dataCache, maskPattern);
        },

        setupPositionProbePattern: function(row, col) {
            for (let r = -1; r <= 7; r++) {
                if (row + r <= -1 || this.moduleCount <= row + r) continue;
                for (let c = -1; c <= 7; c++) {
                    if (col + c <= -1 || this.moduleCount <= col + c) continue;
                    if ((0 <= r && r <= 6 && (c === 0 || c === 6)) ||
                        (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
                        (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                        this.modules[row + r][col + c] = true;
                    } else {
                        this.modules[row + r][col + c] = false;
                    }
                }
            }
        },

        getBestMaskPattern: function() {
            let minLostPoint = 0;
            let pattern = 0;
            for (let i = 0; i < 8; i++) {
                this.makeImpl(true, i);
                const lostPoint = QRUtil.getLostPoint(this);
                if (i === 0 || minLostPoint > lostPoint) {
                    minLostPoint = lostPoint;
                    pattern = i;
                }
            }
            return pattern;
        },

        setupTimingPattern: function() {
            for (let r = 8; r < this.moduleCount - 8; r++) {
                if (this.modules[r][6] != null) continue;
                this.modules[r][6] = (r % 2 === 0);
            }
            for (let c = 8; c < this.moduleCount - 8; c++) {
                if (this.modules[6][c] != null) continue;
                this.modules[6][c] = (c % 2 === 0);
            }
        },

        setupPositionAdjustPattern: function() {
            const pos = QRUtil.getPatternPosition(this.typeNumber);
            for (let i = 0; i < pos.length; i++) {
                for (let j = 0; j < pos.length; j++) {
                    const row = pos[i];
                    const col = pos[j];
                    if (this.modules[row][col] != null) continue;
                    for (let r = -2; r <= 2; r++) {
                        for (let c = -2; c <= 2; c++) {
                            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
                                this.modules[row + r][col + c] = true;
                            } else {
                                this.modules[row + r][col + c] = false;
                            }
                        }
                    }
                }
            }
        },

        setupTypeNumber: function(test) {
            const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
            for (let i = 0; i < 18; i++) {
                const mod = (!test && ((bits >> i) & 1) === 1);
                this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
            }
            for (let i = 0; i < 18; i++) {
                const mod = (!test && ((bits >> i) & 1) === 1);
                this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
            }
        },

        setupTypeInfo: function(test, maskPattern) {
            const data = (this.errorCorrectLevel << 3) | maskPattern;
            const bits = QRUtil.getBCHTypeInfo(data);

            for (let i = 0; i < 15; i++) {
                const mod = (!test && ((bits >> i) & 1) === 1);
                if (i < 6) {
                    this.modules[i][8] = mod;
                } else if (i < 8) {
                    this.modules[i + 1][8] = mod;
                } else {
                    this.modules[this.moduleCount - 15 + i][8] = mod;
                }
            }

            for (let i = 0; i < 15; i++) {
                const mod = (!test && ((bits >> i) & 1) === 1);
                if (i < 8) {
                    this.modules[8][this.moduleCount - i - 1] = mod;
                } else if (i < 9) {
                    this.modules[8][15 - i - 1 + 1] = mod;
                } else {
                    this.modules[8][15 - i - 1] = mod;
                }
            }

            this.modules[this.moduleCount - 8][8] = (!test);
        },

        mapData: function(data, maskPattern) {
            let inc = -1;
            let row = this.moduleCount - 1;
            let bitIndex = 7;
            let byteIndex = 0;

            for (let col = this.moduleCount - 1; col > 0; col -= 2) {
                if (col === 6) col--;
                while (true) {
                    for (let c = 0; c < 2; c++) {
                        if (this.modules[row][col - c] == null) {
                            let dark = false;
                            if (byteIndex < data.length) {
                                dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
                            }
                            const mask = QRUtil.getMask(maskPattern, row, col - c);
                            if (mask) dark = !dark;
                            this.modules[row][col - c] = dark;
                            bitIndex--;
                            if (bitIndex === -1) {
                                byteIndex++;
                                bitIndex = 7;
                            }
                        }
                    }
                    row += inc;
                    if (row < 0 || this.moduleCount <= row) {
                        row -= inc;
                        inc = -inc;
                        break;
                    }
                }
            }
        }
    };

    QRCodeModel.PAD0 = 0xEC;
    QRCodeModel.PAD1 = 0x11;

    QRCodeModel.createData = function(typeNumber, errorCorrectLevel, dataList) {
        const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
        const buffer = new QRBitBuffer();

        for (let i = 0; i < dataList.length; i++) {
            const data = dataList[i];
            buffer.put(data.mode, 4);
            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
            data.write(buffer);
        }

        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
            totalDataCount += rsBlocks[i].dataCount;
        }

        if (buffer.getLengthInBits() > totalDataCount * 8) {
            throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
        }

        if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
            buffer.put(0, 4);
        }

        while (buffer.getLengthInBits() % 8 !== 0) {
            buffer.putBit(false);
        }

        while (true) {
            if (buffer.getLengthInBits() >= totalDataCount * 8) break;
            buffer.put(QRCodeModel.PAD0, 8);
            if (buffer.getLengthInBits() >= totalDataCount * 8) break;
            buffer.put(QRCodeModel.PAD1, 8);
        }

        return QRCodeModel.createBytes(buffer, rsBlocks);
    };

    QRCodeModel.createBytes = function(buffer, rsBlocks) {
        let offset = 0;
        let maxDcCount = 0;
        let maxEcCount = 0;
        const dcdata = new Array(rsBlocks.length);
        const ecdata = new Array(rsBlocks.length);

        for (let r = 0; r < rsBlocks.length; r++) {
            const dcCount = rsBlocks[r].dataCount;
            const ecCount = rsBlocks[r].totalCount - dcCount;
            maxDcCount = Math.max(maxDcCount, dcCount);
            maxEcCount = Math.max(maxEcCount, ecCount);
            dcdata[r] = new Array(dcCount);

            for (let i = 0; i < dcdata[r].length; i++) {
                dcdata[r][i] = 0xff & buffer.buffer[i + offset];
            }
            offset += dcCount;

            const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
            const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
            const modPoly = rawPoly.mod(rsPoly);
            ecdata[r] = new Array(rsPoly.getLength() - 1);

            for (let i = 0; i < ecdata[r].length; i++) {
                const modIndex = i + modPoly.getLength() - ecdata[r].length;
                ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
            }
        }

        let totalCodeCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) {
            totalCodeCount += rsBlocks[i].totalCount;
        }

        const data = new Array(totalCodeCount);
        let index = 0;

        for (let i = 0; i < maxDcCount; i++) {
            for (let r = 0; r < rsBlocks.length; r++) {
                if (i < dcdata[r].length) data[index++] = dcdata[r][i];
            }
        }

        for (let i = 0; i < maxEcCount; i++) {
            for (let r = 0; r < rsBlocks.length; r++) {
                if (i < ecdata[r].length) data[index++] = ecdata[r][i];
            }
        }

        return data;
    };

    // ============================================================
    // QR UTIL
    // ============================================================
    const QRUtil = (function() {
        const PATTERN_POSITION_TABLE = [
            [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
            [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
            [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66],
            [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
            [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
            [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
            [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114],
            [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126],
            [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138],
            [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146],
            [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
            [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162],
            [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]
        ];

        const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
        const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
        const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

        return {
            getBCHTypeInfo: function(data) {
                let d = data << 10;
                while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G15) >= 0) {
                    d ^= (G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G15)));
                }
                return ((data << 10) | d) ^ G15_MASK;
            },
            getBCHTypeNumber: function(data) {
                let d = data << 12;
                while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G18) >= 0) {
                    d ^= (G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(G18)));
                }
                return (data << 12) | d;
            },
            getBCHDigit: function(data) {
                let digit = 0;
                while (data !== 0) {
                    digit++;
                    data >>>= 1;
                }
                return digit;
            },
            getPatternPosition: function(typeNumber) {
                return PATTERN_POSITION_TABLE[typeNumber - 1];
            },
            getMask: function(maskPattern, i, j) {
                switch (maskPattern) {
                    case QRMaskPattern.PATTERN000: return (i + j) % 2 === 0;
                    case QRMaskPattern.PATTERN001: return i % 2 === 0;
                    case QRMaskPattern.PATTERN010: return j % 3 === 0;
                    case QRMaskPattern.PATTERN011: return (i + j) % 3 === 0;
                    case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
                    case QRMaskPattern.PATTERN101: return (i * j) % 2 + (i * j) % 3 === 0;
                    case QRMaskPattern.PATTERN110: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
                    case QRMaskPattern.PATTERN111: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
                    default: throw new Error("bad maskPattern:" + maskPattern);
                }
            },
            getErrorCorrectPolynomial: function(errorCorrectLength) {
                let a = new QRPolynomial([1], 0);
                for (let i = 0; i < errorCorrectLength; i++) {
                    a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
                }
                return a;
            },
            getLengthInBits: function(mode, type) {
                if (1 <= type && type < 10) {
                    switch (mode) {
                        case QRMode.MODE_NUMBER: return 10;
                        case QRMode.MODE_ALPHA_NUM: return 9;
                        case QRMode.MODE_8BIT_BYTE: return 8;
                        case QRMode.MODE_KANJI: return 8;
                        default: throw new Error("mode:" + mode);
                    }
                } else if (type < 27) {
                    switch (mode) {
                        case QRMode.MODE_NUMBER: return 12;
                        case QRMode.MODE_ALPHA_NUM: return 11;
                        case QRMode.MODE_8BIT_BYTE: return 16;
                        case QRMode.MODE_KANJI: return 10;
                        default: throw new Error("mode:" + mode);
                    }
                } else if (type < 41) {
                    switch (mode) {
                        case QRMode.MODE_NUMBER: return 14;
                        case QRMode.MODE_ALPHA_NUM: return 13;
                        case QRMode.MODE_8BIT_BYTE: return 16;
                        case QRMode.MODE_KANJI: return 12;
                        default: throw new Error("mode:" + mode);
                    }
                } else {
                    throw new Error("type:" + type);
                }
            },
            getLostPoint: function(qrCode) {
                const moduleCount = qrCode.getModuleCount();
                let lostPoint = 0;

                for (let row = 0; row < moduleCount; row++) {
                    for (let col = 0; col < moduleCount; col++) {
                        let sameCount = 0;
                        const dark = qrCode.isDark(row, col);

                        for (let r = -1; r <= 1; r++) {
                            if (row + r < 0 || moduleCount <= row + r) continue;
                            for (let c = -1; c <= 1; c++) {
                                if (col + c < 0 || moduleCount <= col + c) continue;
                                if (r === 0 && c === 0) continue;
                                if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
                            }
                        }

                        if (sameCount > 5) lostPoint += (3 + sameCount - 5);
                    }
                }

                for (let row = 0; row < moduleCount - 1; row++) {
                    for (let col = 0; col < moduleCount - 1; col++) {
                        let count = 0;
                        if (qrCode.isDark(row, col)) count++;
                        if (qrCode.isDark(row + 1, col)) count++;
                        if (qrCode.isDark(row, col + 1)) count++;
                        if (qrCode.isDark(row + 1, col + 1)) count++;
                        if (count === 0 || count === 4) lostPoint += 3;
                    }
                }

                for (let row = 0; row < moduleCount; row++) {
                    for (let col = 0; col < moduleCount - 6; col++) {
                        if (qrCode.isDark(row, col) &&
                            !qrCode.isDark(row, col + 1) &&
                            qrCode.isDark(row, col + 2) &&
                            qrCode.isDark(row, col + 3) &&
                            qrCode.isDark(row, col + 4) &&
                            !qrCode.isDark(row, col + 5) &&
                            qrCode.isDark(row, col + 6)) {
                            lostPoint += 40;
                        }
                    }
                }

                for (let col = 0; col < moduleCount; col++) {
                    for (let row = 0; row < moduleCount - 6; row++) {
                        if (qrCode.isDark(row, col) &&
                            !qrCode.isDark(row + 1, col) &&
                            qrCode.isDark(row + 2, col) &&
                            qrCode.isDark(row + 3, col) &&
                            qrCode.isDark(row + 4, col) &&
                            !qrCode.isDark(row + 5, col) &&
                            qrCode.isDark(row + 6, col)) {
                            lostPoint += 40;
                        }
                    }
                }

                let darkCount = 0;
                for (let col = 0; col < moduleCount; col++) {
                    for (let row = 0; row < moduleCount; row++) {
                        if (qrCode.isDark(row, col)) darkCount++;
                    }
                }

                const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
                lostPoint += ratio * 10;

                return lostPoint;
            }
        };
    })();

    // ============================================================
    // QRCODE API (Clase pública)
    // ============================================================
    function QRCode(options) {
        if (!(this instanceof QRCode)) {
            return new QRCode(options);
        }

        const opts = options || {};
        this.text = opts.text || '';
        this.width = opts.width || 256;
        this.height = opts.height || 256;
        this.colorDark = opts.colorDark || '#000000';
        this.colorLight = opts.colorLight || '#ffffff';
        this.correctLevel = opts.correctLevel || 'M';
        this.typeNumber = opts.typeNumber || 0;
        this.margin = opts.margin !== undefined ? opts.margin : 4;

        this._qr = null;
        this._make();
    }

    QRCode.prototype = {
        _make: function() {
            let typeNumber = this.typeNumber;
            const errorCorrectLevel = QRErrorCorrectLevel[this.correctLevel] !== undefined
                ? QRErrorCorrectLevel[this.correctLevel]
                : QRErrorCorrectLevel.M;

            if (!typeNumber) {
                for (typeNumber = 1; typeNumber < 40; typeNumber++) {
                    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
                    const buffer = new QRBitBuffer();
                    const data = new QR8bitByte(this.text);
                    buffer.put(data.mode, 4);
                    buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                    data.write(buffer);

                    let totalDataCount = 0;
                    for (let i = 0; i < rsBlocks.length; i++) {
                        totalDataCount += rsBlocks[i].dataCount;
                    }

                    if (buffer.getLengthInBits() <= totalDataCount * 8) break;
                }
            }

            this._qr = new QRCodeModel(typeNumber, errorCorrectLevel);
            this._qr.addData(this.text);
            this._qr.make();
        },

        isDark: function(row, col) {
            return this._qr.isDark(row, col);
        },

        getModuleCount: function() {
            return this._qr.getModuleCount();
        },

        toCanvas: function(canvasOrSize) {
            let canvas;
            if (canvasOrSize instanceof HTMLCanvasElement) {
                canvas = canvasOrSize;
                canvas.width = this.width;
                canvas.height = this.height;
            } else {
                canvas = document.createElement('canvas');
                canvas.width = this.width;
                canvas.height = this.height;
            }

            const ctx = canvas.getContext('2d');
            const moduleCount = this._qr.getModuleCount();
            const margin = this.margin;
            const size = Math.min(this.width, this.height);
            const tileSize = (size - margin * 2) / moduleCount;

            ctx.fillStyle = this.colorLight;
            ctx.fillRect(0, 0, this.width, this.height);
            ctx.fillStyle = this.colorDark;

            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (this._qr.isDark(row, col)) {
                        const x = margin + col * tileSize;
                        const y = margin + row * tileSize;
                        ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(tileSize), Math.ceil(tileSize));
                    }
                }
            }

            return canvas;
        },

        toDataURL: function() {
            const canvas = this.toCanvas();
            return canvas.toDataURL('image/png');
        },

        toSVG: function() {
            const moduleCount = this._qr.getModuleCount();
            const size = Math.min(this.width, this.height);
            const margin = this.margin;
            const tileSize = (size - margin * 2) / moduleCount;

            let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">`;
            svg += `<rect width="100%" height="100%" fill="${this.colorLight}"/>`;
            svg += `<g fill="${this.colorDark}">`;

            for (let row = 0; row < moduleCount; row++) {
                for (let col = 0; col < moduleCount; col++) {
                    if (this._qr.isDark(row, col)) {
                        const x = (margin + col * tileSize).toFixed(2);
                        const y = (margin + row * tileSize).toFixed(2);
                        const w = tileSize.toFixed(2);
                        svg += `<rect x="${x}" y="${y}" width="${w}" height="${w}"/>`;
                    }
                }
            }

            svg += '</g></svg>';
            return svg;
        },

        /**
         * Renderiza el QR directamente en un elemento del DOM.
         * @param {HTMLElement} container - Contenedor donde se inyecta el QR
         */
        renderTo: function(container) {
            if (!container) return;
            container.innerHTML = '';
            const canvas = this.toCanvas();
            canvas.style.width = '100%';
            canvas.style.height = 'auto';
            canvas.style.maxWidth = this.width + 'px';
            canvas.style.display = 'block';
            canvas.style.margin = '0 auto';
            container.appendChild(canvas);
            return canvas;
        }
    };

    QRCode.CorrectLevel = QRErrorCorrectLevel;

    // ============================================================
    // EXPORTACIÓN GLOBAL
    // ============================================================
    global.QRCode = QRCode;

})(typeof window !== 'undefined' ? window : this);

console.log('📦 QRCode.js cargado correctamente (standalone)');