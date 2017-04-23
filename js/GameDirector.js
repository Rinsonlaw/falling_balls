/**
 * @author Wing-ho Law
 */

var IS_SHOW_FPS = false;            //帧率显示器
var IS_DEBUG_MODE = false;           //debug模式：console有输出
var REFERENCE_CANVAS_HEIGHT = 960;  //参考高

// 挡板移动代码
var MOVE_CODE = {
    STOP: 0,
    LEFT: 1,
    RIGHT: 2
};

var BALL_VELOCITY = 0;              // 小球最小速度
var BALL_RADIUS = 0;                // 小球半径
var BALL_ELASTIC = 0.99;            // 小球弹性系数
var PIN_RADIUS = 0;
var BASKET_VELOCITY_MAX = 8;
var BASKET_LENGTH = 200;
var TIPS_FONT_SIZE = 40;            // 提示信息的字体大小
var SCORE_LIMITED_TARGET = 100;     // 对打模式的目标分数
var TIME_LIMITED_TARGET = 60;

var gameDirector;                   //游戏导演

$(document).ready(function () {
    // 按后退键返回上一页
    $(window).keydown(function (e) {
        var keyID = e.keyCode ? e.keyCode : e.which;
        if (keyID == 81) {
            history.go(-1);
        }
    });

    // 浏览器窗口变化监听
    window.onresize = resizeCanvas;

    // 初始化游戏导演
    gameDirector = new GameDirector('canvas');
    gameDirector.runScene(new LoadingScene(gameDirector.canvas));

    // 帧率显示器
    if (IS_SHOW_FPS) {
        showFPS();
    }
});

/**
 * GameDirector 游戏导演类
 *
 * @param {String} canvasId 画布id
 * @constructor
 */
var GameDirector = function (canvasId) {
    this.devicePixelRatio = getDevicePixelRatio();

    this.canvas = document.getElementById(canvasId);
    this.canvas.width = document.body.clientWidth * this.devicePixelRatio;
    this.canvas.height = document.body.clientHeight * this.devicePixelRatio;

    this.currentScene = null;   //当前场景
    this.mediaObjects = null;   //媒体对象
};

GameDirector.prototype = {
    constructor: GameDirector,

    /**
     * 运行场景
     *
     * @param scene
     * @param result
     */
    runScene: function (scene, result) {
        // 结束当前场景
        if (this.currentScene !== null) {
            this.currentScene.destroy();
        }

        // 运行新场景
        $("#" + this.canvas.id).fadeOut(function () {
            clearCanvas(gameDirector.canvas);
            $("#" + gameDirector.canvas.id).fadeIn();

            gameDirector.currentScene = scene;
            gameDirector.currentScene.start(result);
        });
    }
};

/**
 * 清空画布
 *
 * @param {Object} canvas   画布对象
 */
function clearCanvas(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * 当浏览器窗口变化时，调整画布大小
 */
function resizeCanvas() {
    if (IS_DEBUG_MODE) {
        console.log("RESIZE");
    }

    gameDirector.devicePixelRatio = getDevicePixelRatio();
    gameDirector.canvas.width = document.body.clientWidth * this.devicePixelRatio;
    gameDirector.canvas.height = document.body.clientHeight * this.devicePixelRatio;

    // 调整场景及其游戏组件
    gameDirector.currentScene.resize();
}

/**
 * 获取设备的devicePixelRatio，用于设定画布大小
 *
 * @returns {Number}    设备的devicePixelRatio
 */
function getDevicePixelRatio() {
    return (window.devicePixelRatio != undefined) ? window.devicePixelRatio : 1;
}

/**
 * 设置常量的值或范围
 *
 * @param {Number} reference    参考量
 */
function setBoundary(reference) {
    BALL_RADIUS = parseInt(reference * 0.05);
    PIN_RADIUS = parseInt(reference * 0.02);
    BASKET_LENGTH = Math.max(parseInt(gameDirector.canvas.width * 0.1), 100);
    TIPS_FONT_SIZE = parseInt(reference * 0.1);

    if (IS_DEBUG_MODE) {
        console.log("RACKET VELOCITY MAX:", BASKET_VELOCITY_MAX);
        console.log("BALL RADIUS:", BALL_RADIUS);
        console.log("TIPS FONT SIZE:", TIPS_FONT_SIZE);
    }
}

/**
 * 显示帧率显示器
 */
function showFPS() {
    var stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms, 2: mb
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';
    document.body.appendChild(stats.domElement);

    function drawFPS() {
        stats.update();
        window.requestAnimationFrame(drawFPS);
    }

    window.requestAnimationFrame(drawFPS);
}

/**
 * 绘制圆角矩形
 *
 * @param {CanvasRenderingContext2D}    ctx     画布上下文对象
 * @param {Number}                      x       左上点横坐标
 * @param {Number}                      y       左上点纵坐标
 * @param {Number}                      width   矩形的宽
 * @param {Number}                      height  矩形的高
 * @param {Number}                      radius  角半径
 */
function fillRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.lineTo(x, y + height - radius);
    ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
    ctx.lineTo(x + width - radius, y + height);
    ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
    ctx.lineTo(x + width, y + radius);
    ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
    ctx.lineTo(x + radius, y);
    ctx.quadraticCurveTo(x, y, x, y + radius);
    ctx.fill();
}


/**
 * Color 颜色类
 * @param {Number} r    red分量（0-255）
 * @param {Number} g    green分量（0-255）
 * @param {Number} b    blue分量（0-255）
 * @param {Number} a    alpha分量（0-1）
 * @constructor
 */
var Color = function (r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
};

Color.prototype = {
    constructor: Color,

    /**
     * 通过16进制串初始化颜色
     *
     * @param {String} hex      16进制颜色字符串
     * @param {Number} opacity  透明度
     */
    initWithHex: function (hex, opacity) {
        var h = hex.charAt(0) == "#" ? hex.substring(1) : hex;
        this.r = parseInt(h.substring(0, 2), 16);
        this.g = parseInt(h.substring(2, 4), 16);
        this.b = parseInt(h.substring(4, 6), 16);
        this.a = opacity;
    },

    /**
     * 设置RGB分量
     *
     * @param {Number} r    red分量（0-255）
     * @param {Number} g    green分量（0-255）
     * @param {Number} b    blue分量（0-255）
     */
    setRgb: function (r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    },

    /**
     * 设置透明度
     *
     * @param {Number} opacity  透明度（0-1）
     */
    setOpacity: function (opacity) {
        this.a = opacity;
    },

    /**
     * 转化成rgba颜色串
     *
     * @returns {string} rgba颜色串
     */
    toRgbaStr: function () {
        return "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")";
    },

    /**
     * 转化成16进制颜色串
     *
     * @returns {String} 16进制颜色串
     */
    toHexStr: function () {
        return "#" + this.r.toString(16) + this.g.toString(16) + this.b.toString(16);
    }
};

/**
 * 复制Color对象
 *
 * @param   {Color} color   原Color对象
 * @returns {Color}         复制出来的Color对象
 */
function colorCopy(color) {
    return new Color(color.r, color.g, color.b, color.a);
}

var randColor = function () {
    return Math.floor(Math.random() * 256);
};


/**
 * Button 按钮类
 *
 * @param {Number} x            左上点横坐标
 * @param {Number} y            左上点纵坐标
 * @param {Number} width        按钮的宽
 * @param {Number} height       按钮的高
 * @param {Number} scaleRatio   缩放比例
 * @constructor
 */
var Button = function (x, y, width, height, scaleRatio) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.scaleRatio = scaleRatio;
    this.backgroundColor = new Color(255, 255, 255, 1);
    this.image = null;
};

Button.prototype = {
    /**
     * 设置按钮背景色
     *
     * @param {Color} color 背景颜色
     */
    setBackgroundColor: function (color) {
        this.backgroundColor = color;
    },

    /**
     * 设置按钮贴图
     *
     * @param {Image} image 按钮贴图
     */
    setImage: function (image) {
        this.image = image;
    },

    /**
     * 绘制矩形按钮
     *
     * @param {CanvasRenderingContext2D}    ctx     画布上下文对象
     */
    drawRect: function (ctx) {
        ctx.fillStyle = this.backgroundColor.toRgbaStr();
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },

    /**
     * 绘制圆角矩形按钮
     *
     * @param {CanvasRenderingContext2D}    ctx     画布上下文对象
     * @param {Number}                      radius  圆角矩形半径
     */
    drawRoundedRect: function (ctx, radius) {
        ctx.fillStyle = this.backgroundColor.toRgbaStr();
        fillRoundedRect(ctx, this.x, this.y, this.width, this.height, radius);
    },

    /**
     * 绘制按钮贴图，贴图位于按钮中心
     *
     * @param {CanvasRenderingContext2D}    ctx     画布上下文对象
     */
    drawImage: function (ctx) {
        var offset_x = (this.width - this.image.width) / 2;
        var offset_y = (this.height - this.image.height) / 2;

        ctx.drawImage(this.image, this.x + offset_x, this.y + offset_y);
    },

    /**
     * 调整按钮尺寸
     *
     * @param {Number} x            左上点横坐标
     * @param {Number} y            左上点纵坐标
     * @param {Number} width        按钮的宽
     * @param {Number} height       按钮的高
     * @param {Number} scaleRatio   缩放比例
     */
    resize: function (x, y, width, height, scaleRatio) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.scaleRatio = scaleRatio;
    },

    /**
     * 鼠标按下事件监听函数
     *
     * @param {Event} e 事件
     */
    onMouseDownListener: function (e) {
        var event = window.event || e;
        var mouseX = event.clientX* gameDirector.devicePixelRatio;
        var mouseY = event.clientY* gameDirector.devicePixelRatio;

        if (IS_DEBUG_MODE) {
            console.info("MOUSE DOWN: (" + mouseX + ", " + mouseY + ")");
        }

        if (isInRect(mouseX, mouseY, this.x * this.scaleRatio, this.y * this.scaleRatio, this.width * this.scaleRatio, this.height * this.scaleRatio)) {
            this.onMouseDown();
        }
    },

    /**
     * 鼠标按下事件回调函数
     */
    onMouseDown: function () {
        throw "NOT IMPLEMENT";
    },

    /**
     * 鼠标抬起事件监听函数
     *
     * @param {Event} e 事件
     */
    onMouseUpListener: function (e) {
        var event = window.event || e;
        var mouseX = event.clientX* gameDirector.devicePixelRatio;
        var mouseY = event.clientY* gameDirector.devicePixelRatio;

        if (IS_DEBUG_MODE) {
            console.info("MOUSE UP: (" + mouseX + ", " + mouseY + ")");
        }

        if (isInRect(mouseX, mouseY, this.x * this.scaleRatio, this.y * this.scaleRatio, this.width * this.scaleRatio, this.height * this.scaleRatio)) {
            this.onMouseUp();
        }
    },

    /**
     * 鼠标抬起事件回调函数
     */
    onMouseUp: function () {
        throw "NOT IMPLEMENT";
    },

    /**
     * 触屏开始事件监听函数
     *
     * @param {Event} e 事件
     */
    onTouchStartListener: function (e) {
        e.preventDefault();              //阻止触摸时浏览器的缩放、滚动条滚动等
        var touch = e.changedTouches[0]; //获取第一个触点
        var x = Number(touch.pageX) * gameDirector.devicePixelRatio; //页面触点X坐标
        var y = Number(touch.pageY) * gameDirector.devicePixelRatio; //页面触点Y坐标

        if (IS_DEBUG_MODE) {
            console.info("TOUCH START: (" + x + ", " + y + ")");
        }

        if (isInRect(x, y, this.x * this.scaleRatio, this.y * this.scaleRatio, this.width * this.scaleRatio, this.height * this.scaleRatio)) {
            this.onTouchStart();
        }
    },

    /**
     * 触屏开始事件回调函数
     */
    onTouchStart: function () {
        throw "NOT IMPLEMENT";
    },

    /**
     * 触屏结束事件监听函数
     *
     * @param {Event} e 事件
     */
    onTouchEndListener: function (e) {
        e.preventDefault();              //阻止触摸时浏览器的缩放、滚动条滚动等
        var touch = e.changedTouches[0]; //获取第一个触点
        var x = Number(touch.pageX) * gameDirector.devicePixelRatio; //页面触点X坐标
        var y = Number(touch.pageY) * gameDirector.devicePixelRatio; //页面触点Y坐标

        if (IS_DEBUG_MODE) {
            console.info("TOUCH END: (" + x + ", " + y + ")");
        }

        if (isInRect(x, y, this.x * this.scaleRatio, this.y * this.scaleRatio, this.width * this.scaleRatio, this.height * this.scaleRatio)) {
            this.onTouchEnd();
        }
    },

    /**
     * 触屏结束事件回调函数
     */
    onTouchEnd: function () {
        throw "NOT IMPLEMENT";
    }
};

/**
 * 检测点是否在矩形区域之内
 *
 * @param   {Number}    px  被检测点横坐标
 * @param   {Number}    py  被检测点纵坐标
 * @param   {Number}    x   矩形左上点横坐标
 * @param   {Number}    y   矩形左上点总坐标
 * @param   {Number}    w   矩形宽
 * @param   {Number}    h   矩形高
 * @returns {Boolean}       被检测点是否在矩形内
 */
function isInRect(px, py, x, y, w, h) {
    return (px >= x && px <= x + w) && (py >= y && py <= y + h);
}