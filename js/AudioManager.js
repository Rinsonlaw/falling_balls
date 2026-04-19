/**
 * AudioManager 音频管理器
 *
 * 基于 Web Audio API 的音频池管理
 * @author Wing-ho Law
 */
var AudioManager = function () {
    this.audioContext = null;
    this.audioBuffers = [];
};

// 音频 Buffer 索引常量
AudioManager.AUDIO_TOUCH_BTN = 0;
AudioManager.AUDIO_BOUNCE = 1;
AudioManager.AUDIO_GOAL = 2;
AudioManager.AUDIO_TOUCH_BUFF = 3;
AudioManager.AUDIO_GAME_START = 4;
AudioManager.AUDIO_GAME_OVER = 5;
AudioManager.AUDIO_COUNT = 6;

/**
 * 初始化 Web Audio API 上下文
 */
AudioManager.prototype.initContext = function () {
    if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.audioContext;
};

/**
 * 设置预解码的音频 Buffer
 *
 * @param {Array} buffers  AudioBuffer 数组
 */
AudioManager.prototype.setBuffers = function (buffers) {
    this.audioBuffers = buffers || [];
};

/**
 * 创建音频池
 *
 * @param {Number} audioType  音频类型索引
 * @param {Number} poolSize   池大小
 * @returns {AudioPool}       音频池实例
 */
AudioManager.prototype.createPool = function (audioType, poolSize) {
    var buffer = this.audioBuffers[audioType] || null;
    return new AudioPool(buffer, poolSize, this.audioContext);
};

/**
 * 预解码音频文件为 AudioBuffer
 *
 * @param {Object}   mediaObjects  媒体对象
 * @param {Function} onComplete    解码完成回调
 */
AudioManager.prototype.decodeAudioBuffers = function (mediaObjects, onComplete) {
    var audioContent = mediaObjects.audio.content;
    var audioNames = Object.keys(audioContent);
    var buffers = [];

    // 初始化 AudioContext
    this.initContext();
    var audioCtx = this.audioContext;

    if (audioNames.length === 0) {
        onComplete();
        return;
    }

    // 将相对 URL 转换为绝对 URL
    function resolveUrl(relativeUrl) {
        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://') || relativeUrl.startsWith('//')) {
            return relativeUrl;
        }
        return new URL(relativeUrl, window.location.href).href;
    }

    // 使用 Promise.all 并行解码所有音频
    var promises = audioNames.map(function (name) {
        var audioEl = audioContent[name];
        var src = audioEl.src || audioEl.currentSrc;
        if (!src && audioEl.querySelector) {
            var sourceEl = audioEl.querySelector('source');
            if (sourceEl) {
                src = sourceEl.src;
            }
        }
        if (!src) {
            return Promise.resolve({ name: name, buffer: null });
        }

        src = resolveUrl(src);

        return fetch(src)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.arrayBuffer();
            })
            .then(function (arrayBuffer) {
                return audioCtx.decodeAudioData(arrayBuffer);
            })
            .then(function (buffer) {
                return { name: name, buffer: buffer };
            })
            .catch(function (e) {
                console.warn('Decode failed for:', name, '- will use HTML Audio fallback');
                return { name: name, buffer: null };
            });
    });

    Promise.all(promises).then(function (results) {
        results.forEach(function (result) {
            buffers.push(result.buffer);
        });
        this.setBuffers(buffers);
        onComplete();
    }.bind(this));
};

/**
 * 音频池类
 *
 * @param {AudioBuffer} audioBuffer  预解码的 AudioBuffer
 * @param {Number}      poolSize     池大小
 * @constructor
 */
var AudioPool = function (audioBuffer, poolSize, audioContext) {
    this.buffer = audioBuffer;
    this.poolSize = poolSize || 4;
    this.audioContext = audioContext;
    this.pool = [];

    for (var i = 0; i < this.poolSize; i++) {
        this.pool.push({
            source: null,
            isPlaying: false
        });
    }
};

AudioPool.prototype = {
    constructor: AudioPool,

    /**
     * 播放音频
     *
     * @param {Number} volume  音量 (0-1)
     */
    play: function (volume) {
        volume = volume !== undefined ? volume : 1.0;

        if (!this.buffer) return;

        for (var i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].isPlaying) {
                this._playNode(this.pool[i], volume);
                return;
            }
        }

        this._playNode(this.pool[0], volume);
    },

    _playNode: function (node, volume) {
        if (!this.buffer) return;

        if (node.source) {
            try {
                node.source.stop();
            } catch (e) {}
        }

        var audioContext = this.audioContext;
        if (!audioContext) return;

        node.source = audioContext.createBufferSource();
        node.source.buffer = this.buffer;

        var gainNode = audioContext.createGain();
        gainNode.gain.value = volume;

        node.source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        node.isPlaying = true;
        node.source.start();

        node.source.onended = function () {
            node.isPlaying = false;
        };
    }
};
