/**
 * @author Wing-ho Law
 */

// 媒体文件类型
var mediaType = {
    'mp3': 'audio/mpeg',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'aac': 'audio/aac',
    'm4a': 'audio/x-m4a'
};

/**
 * 获取文件的扩展名
 *
 * @param   {String} fileName   文件名
 * @returns {String}            扩展名
 */
function getExtentName(fileName) {
    return fileName.split('.').pop();
}

/**
 * MediaPreloader，媒体文件预加载器类
 *
 * @constructor
 */
var MediaPreloader = function () {
    this.nLoaded = 0;                           //已加载数目
    this.nProcessed = 0;                        //已完成数目（包括加载成功和失败）
    this.nMedia = 0;                            //媒体文件总数

    this.mediaObjects = new MediaList();        //媒体对象

    this.call_back_preload = new Function();    //储存预加载完成的回调函数
    this.call_back_update = new Function();     //储存界面更新的回调函数
};

MediaPreloader.prototype = {
    constructor: MediaPreloader,

    /**
     * 预加载媒体文件
     *
     * @param {MediaList} mediaList  媒体文件列表
     */
    preloadMedia: function (mediaList) {
        this.nMedia = mediaList.length;

        for (var imgName in mediaList.image.content) {
            if (mediaList.image.content.hasOwnProperty(imgName)) {
                this.preloadImage(imgName, mediaList.image.content[imgName]);
            }
        }

        for (var audioName in mediaList.audio.content) {
            if (mediaList.audio.content.hasOwnProperty(audioName)) {
                this.preloadAudio(audioName, mediaList.audio.content[audioName]);
            }
        }
    },

    /**
     * 预加载图片文件
     *
     * @param {String} name         图片名
     * @param {Array}  imagePath    图片路径
     */
    preloadImage: function (name, imagePath) {
        var imageObject = new Image();

        // 为图片对象的路径赋值
        imageObject.src = imagePath;

        // 事件回调函数
        imageObject.onload = this.onLoad;
        imageObject.onerror = this.onError;
        imageObject.onabort = this.onAbort;

        // 为图片对象增加预加载器指针和加载状态
        imageObject.ptrMediaPreloader = this;
        imageObject.isLoaded = false;

        // 添加到mediaObjects
        this.mediaObjects.addImage(name, imageObject);
    },

    /**
     * 预加载音频文件
     *
     * @param {String} name             音频名
     * @param {Array}  audioPathList    同一音频不同格式的路径列表
     */
    preloadAudio: function (name, audioPathList) {
        var audioObject = document.createElement('audio');
        var source = document.createElement('source');

        // 为音频对象的路径赋值
        for (var i = 0; i < audioPathList.length; i++) {
            source.src = audioPathList[i];
            source.type = mediaType[getExtentName(source.src)];
            audioObject.appendChild(source);
        }
        audioObject.playname = name;

        // 事件回调函数
        audioObject.onloadeddata = this.onLoad;
        audioObject.onerror = this.onError;
        audioObject.onabort = this.onAbort;

        // 为音频对象增加预加载器指针和加载状态
        audioObject.ptrMediaPreloader = this;
        audioObject.bLoaded = false;

        // 添加到mediaObjects
        this.mediaObjects.addAudio(name, audioObject);
    },

    /**
     * 一个媒体对象加载成功的回调函数
     */
    onLoad: function () {
        this.isLoaded = true;
        this.ptrMediaPreloader.nLoaded++;
        this.ptrMediaPreloader.onComplete();
    },

    /**
     * 一个媒体对象加载错误的回调函数
     */
    onError: function () {
        this.isError = true;
        this.ptrMediaPreloader.onComplete();
    },

    /**
     * 一个媒体对象加载放弃的回调函数
     */
    onAbort: function () {
        this.isAbort = true;
        this.ptrMediaPreloader.onComplete();
    },

    /**
     * 一个媒体对象加载完成的回调函数
     */
    onComplete: function () {
        this.nProcessed++;
        this.call_back_update(this.nLoaded);

        if (this.nProcessed == this.nMedia) {
            this.call_back_preload(this.mediaObjects, this.nLoaded);
        }
    },

    onPreload: function (call_back) {
        this.call_back_preload = call_back;
    },

    onUpdateUI: function (call_back) {
        this.call_back_update = call_back;
    }
};


/**
 * MediaList, 媒体列表类
 *
 * @constructor
 */
var MediaList = function () {
    // 媒体总数
    this.length = 0;

    // 图片对象
    this.image = {
        length: 0,
        content: {}
    };

    // 音频对象
    this.audio = {
        length: 0,
        content: {}
    }
};

MediaList.prototype = {
    constructor: MediaList,

    /**
     * 添加图片文件到媒体列表
     *
     * @param {String} name  提取名
     * @param {Object} value 提取值
     */
    addImage: function (name, value) {
        this.image.content[name] = value;
        this.image.length++;
        this.length++;
    },

    /**
     * 添加音频文件到媒体列表
     *
     * @param {String} name  提取名
     * @param {Object} value 提取值
     */
    addAudio: function (name, value) {
        this.audio.content[name] = value;
        this.audio.length++;
        this.length++;
    }
};