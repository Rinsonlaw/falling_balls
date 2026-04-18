/**
 * StartScene 开始场景，模式选择场景
 *
 * @param {Object} canvas   画布对象
 * @author Wing-ho Law
 */
var StartScene = function (canvas) {
    Scene.call(this, canvas);

    // 多媒体对象
    this.imageArray = gameDirector.mediaObjects.image.content;
    this.audioArray = gameDirector.mediaObjects.audio.content;

    // 按钮
    this.leftBtn = new Button(this.scaledHcanvasWidth - 180, this.scaledHcanvasHeight - 50, 400, 100, this.scaledRatio);
    this.rightBtn = new Button(this.scaledHcanvasWidth - 180, this.scaledHcanvasHeight - 50 + this.scaledHcanvasHeight * 0.3, 400, 100, this.scaledRatio);

    // 按钮监听器绑定
    this.bindOnTouchEndLeft = this.leftBtn.onTouchEndListener.bind(this.leftBtn);
    this.bindOnMouseUpLeft = this.leftBtn.onMouseUpListener.bind(this.leftBtn);

    this.bindOnTouchEndRight = this.rightBtn.onTouchEndListener.bind(this.rightBtn);
    this.bindOnMouseUpRight = this.rightBtn.onMouseUpListener.bind(this.rightBtn);
};

StartScene.prototype = Object.create(Scene.prototype);
StartScene.prototype.constructor = StartScene;

StartScene.prototype.init = function () {
    // 注册监听器
    this.canvas.addEventListener("touchend", this.bindOnTouchEndLeft);
    this.canvas.addEventListener("mouseup", this.bindOnMouseUpLeft);

    this.canvas.addEventListener("touchend", this.bindOnTouchEndRight);
    this.canvas.addEventListener("mouseup", this.bindOnMouseUpRight);

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

};

StartScene.prototype.start = function () {
    this.init();
    this.requestID = window.requestAnimationFrame(this.draw.bind(this));
};

StartScene.prototype.draw = function () {
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
};

StartScene.prototype.destroy = function () {
    // 销毁按钮监听器
    this.canvas.removeEventListener("touchend", this.bindOnTouchEndLeft);
    this.canvas.removeEventListener("mouseup", this.bindOnMouseUpLeft);

    this.canvas.removeEventListener("touchend", this.bindOnTouchEndRight);
    this.canvas.removeEventListener("mouseup", this.bindOnMouseUpRight);

    window.cancelAnimationFrame(this.requestID);

    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("DESTROY:" + this.requestID);
    }
};

StartScene.prototype.resize = function () {
    Scene.prototype.resize.call(this);

    // 修改按钮尺寸
    this.leftBtn.resize(this.scaledHcanvasWidth - 180, this.scaledHcanvasHeight - 50, 400, 100, this.scaledRatio);
    this.rightBtn.resize(this.scaledHcanvasWidth - 180, this.scaledHcanvasHeight - 50 + this.scaledHcanvasHeight * 0.3, 400, 100, this.scaledRatio);
};

StartScene.prototype.changePlayerMode = function () {
    this.audioArray['touchBtn'].play();
    FallingBalls.MODE = FallingBalls.TIME_LIMITED;

    gameDirector.runScene(new AnimationScene(this.canvas));
    if (FallingBalls.IS_DEBUG_MODE){
        console.info("CLICKED TIME MODE");
    }
};

StartScene.prototype.changeGroundMode = function () {
    this.audioArray['touchBtn'].play();
    FallingBalls.MODE = FallingBalls.SCORE_LIMITED;

    gameDirector.runScene(new AnimationScene(this.canvas));
    if (FallingBalls.IS_DEBUG_MODE){
        console.info("CLICKED SCORE MODE");
    }
};





