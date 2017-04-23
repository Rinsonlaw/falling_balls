// 模式类型
var UNKNOWN = 0;        // 未知
var TIME_LIMITED = 1;   // 限时模式
var SCORE_LIMITED = 2;  // 限分数模式

// 模式信息
var MODE = UNKNOWN;

/**
 * StartScene 开始场景，模式选择场景
 *
 * @param {Object} canvas   画布对象
 * @author Wing-ho Law
 */
var StartScene = function (canvas) {
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

    // 多媒体对象
    this.imageArray = gameDirector.mediaObjects.image.content;
    this.audioArray = gameDirector.mediaObjects.audio.content;

    // 按钮
    this.leftBtn = new Button(this.scaledHcanvasWidth - 180, this.scaledHcanvasHeight - 50, 400, 100, this.scaledRatio);
    this.rightBtn = new Button(this.scaledHcanvasWidth - 180, this.scaledHcanvasHeight - 50 + this.scaledHcanvasHeight * 0.3, 400, 100, this.scaledRatio);

    // 按钮监听器
    this.bindOnTouchEndLeft = this.leftBtn.onTouchEndListener.bind(this.leftBtn);
    this.bindOnMouseUpRight = this.leftBtn.onMouseUpListener.bind(this.leftBtn);

    this.bindOnTouchScoreShape = this.leftBtn.onTouchEndListener.bind(this.rightBtn);
    this.bindOnMouseUpScoreShape = this.leftBtn.onMouseUpListener.bind(this.rightBtn);
};

StartScene.prototype = {
    constructor: StartScene,

    /**
     * 初始化场景
     */
    init: function () {
        // 注册监听器
        this.canvas.addEventListener("touchend", this.bindOnTouchEndLeft);
        this.canvas.addEventListener("mouseup", this.bindOnMouseUpRight);

        this.canvas.addEventListener("touchend", this.bindOnTouchScoreShape);
        this.canvas.addEventListener("mouseup", this.bindOnMouseUpScoreShape);

        // 绑定按钮监听事件回调函数
        this.leftBtn.onTouchEnd = this.changePlayerMode.bind(this);
        this.leftBtn.onMouseUp = this.changePlayerMode.bind(this);

        this.rightBtn.onTouchEnd = this.changeGroundMode.bind(this);
        this.rightBtn.onMouseUp = this.changeGroundMode.bind(this);

        // 设置按钮背景色
        this.leftBtn.setBackgroundColor(new Color(255, 193, 7, 1));
        this.rightBtn.setBackgroundColor(new Color(121, 85, 72, 1));

        // 设置按钮贴图
        this.leftBtn.setImage(this.imageArray['seconds']);
        this.rightBtn.setImage(this.imageArray['points']);

    },

    /**
     * 运行场景
     */
    start: function () {
        this.init();
        this.requestID = window.requestAnimationFrame(this.draw.bind(this));
    },

    /**
     * 绘制场景
     */
    draw: function () {
        clearCanvas(this.canvas);

        this.ctx.save();
        this.ctx.scale(this.scaledRatio, this.scaledRatio);

        // 绘制游戏标题
        this.ctx.drawImage(this.imageArray['title'], this.scaledHcanvasWidth - this.imageArray['title'].width / 2,
            this.scaledHcanvasHeight - this.imageArray['title'].height / 2 - this.scaledCanvasHeight * 0.3);

        // 绘制按钮
        this.leftBtn.drawRoundedRect(this.ctx, 4);
        this.leftBtn.drawImage(this.ctx);

        this.rightBtn.drawRoundedRect(this.ctx, 4);
        this.rightBtn.drawImage(this.ctx);

        this.ctx.restore();

        this.requestID = window.requestAnimationFrame(this.draw.bind(this));
    },

    /**
     * 销毁场景
     */
    destroy: function () {
        // 销毁按钮监听器
        this.canvas.removeEventListener("touchend", this.bindOnTouchEndLeft);
        this.canvas.removeEventListener("mouseup", this.bindOnMouseUpRight);

        this.canvas.removeEventListener("touchend", this.bindOnTouchScoreShape);
        this.canvas.removeEventListener("mouseup", this.bindOnMouseUpScoreShape);

        window.cancelAnimationFrame(this.requestID);

        if (IS_DEBUG_MODE) {
            console.log("DESTROY:" + this.requestID);
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

        // 修改按钮尺寸
        this.leftBtn.resize(this.scaledHcanvasWidth - 180, this.scaledHcanvasHeight - 50, 400, 100, this.scaledRatio);
        this.rightBtn.resize(this.scaledHcanvasWidth - 180, this.scaledHcanvasHeight - 50 + this.scaledHcanvasHeight * 0.3, 400, 100, this.scaledRatio);
    },

    /**
     * 选择限时模式
     */
    changePlayerMode: function () {
        this.audioArray['touchBtn'].play();
        MODE = TIME_LIMITED;

        gameDirector.runScene(new AnimationScene(this.canvas));
        if (IS_DEBUG_MODE){
            console.info("CLICKED TIME MODE");
        }
    },

    /**
     * 选择限分数模式
     */
    changeGroundMode: function () {
        this.audioArray['touchBtn'].play();
        MODE = SCORE_LIMITED;

        gameDirector.runScene(new AnimationScene(this.canvas));
        if (IS_DEBUG_MODE){
            console.info("CLICKED SCORE MODE");
        }
    }
};





