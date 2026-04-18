/**
 * Scene 基类 - 所有场景的公共基类
 *
 * 封装画布初始化、缩放计算、按钮绑定等公共逻辑
 *
 * @param {HTMLCanvasElement} canvas 画布对象
 * @constructor
 */
var Scene = function (canvas) {
    // 画布信息
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hcanvasWidth = canvas.width / 2;
    this.hcanvasHeight = canvas.height / 2;

    // 缩放信息
    this.scaledRatio = this.canvas.height / REFERENCE_CANVAS_HEIGHT;
    this.scaledCanvasWidth = this.canvas.width / this.scaledRatio;
    this.scaledCanvasHeight = this.canvas.height / this.scaledRatio;
    this.scaledHcanvasWidth = this.hcanvasWidth / this.scaledRatio;
    this.scaledHcanvasHeight = this.hcanvasHeight / this.scaledRatio;

    this.requestID = null;  // 帧动画ID
};

Scene.prototype = {
    constructor: Scene,

    /**
     * 初始化场景
     */
    init: function () {
        throw new Error("NOT IMPLEMENT: init() must be overridden");
    },

    /**
     * 运行场景
     */
    start: function () {
        this.init();
    },

    /**
     * 绘制场景
     */
    draw: function () {
        throw new Error("NOT IMPLEMENT: draw() must be overridden");
    },

    /**
     * 销毁场景
     */
    destroy: function () {
        if (this.requestID) {
            window.cancelAnimationFrame(this.requestID);
        }
    },

    /**
     * 调整场景尺寸
     */
    resize: function () {
        // 画布信息
        this.hcanvasWidth = this.canvas.width / 2;
        this.hcanvasHeight = this.canvas.height / 2;

        // 缩放信息
        this.scaledRatio = this.canvas.height / REFERENCE_CANVAS_HEIGHT;
        this.scaledCanvasWidth = this.canvas.width / this.scaledRatio;
        this.scaledCanvasHeight = this.canvas.height / this.scaledRatio;
        this.scaledHcanvasWidth = this.hcanvasWidth / this.scaledRatio;
        this.scaledHcanvasHeight = this.hcanvasHeight / this.scaledRatio;
    },

    /**
     * 绑定按钮的触摸和鼠标事件
     * 替代重复的 onTouchEndListener/onMouseUpListener 绑定代码
     *
     * @param {Button}   btn            按钮对象
     * @param {Function} touchHandler  触摸结束时的回调
     * @param {Function} mouseHandler  鼠标释放时的回调
     * @returns {Object}               绑定的事件清理函数
     */
    bindButtonEvents: function (btn, touchHandler, mouseHandler) {
        var boundTouch = btn.onTouchEndListener.bind(btn);
        var boundMouse = btn.onMouseUpListener.bind(btn);

        this.canvas.addEventListener("touchend", boundTouch);
        this.canvas.addEventListener("mouseup", boundMouse);

        btn.onTouchEnd = touchHandler;
        btn.onMouseUp = mouseHandler;

        return {
            boundTouch: boundTouch,
            boundMouse: boundMouse
        };
    },

    /**
     * 注销按钮的触摸和鼠标事件
     *
     * @param {Button}   btn            按钮对象
     * @param {Object}   bindings      bindButtonEvents 返回的绑定对象
     */
    unbindButtonEvents: function (btn, bindings) {
        this.canvas.removeEventListener("touchend", bindings.boundTouch);
        this.canvas.removeEventListener("mouseup", bindings.boundMouse);
    }
};