/**
 * EndScene 结束场景
 *
 * @param {Object} canvas   画布对象
 * @author Wing-ho Law
 */
var EndScene = function (canvas) {
    Scene.call(this, canvas);

    // 多媒体对象
    this.imageArray = gameDirector.mediaObjects.image.content;

    // 游戏结果信息
    this.resultStr = "";
    this.result = null;

    // 按钮
    this.menuBtn = new Button(0, this.scaledHcanvasHeight, this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2, this.scaledRatio);
    this.shareBtn = new Button(this.scaledHcanvasWidth, this.scaledHcanvasHeight, this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2, this.scaledRatio);
    this.playBtn = new Button(0, this.scaledHcanvasHeight + this.scaledHcanvasHeight / 2, this.scaledCanvasWidth, this.scaledHcanvasHeight / 2, this.scaledRatio);

    // 按钮监听器
    this.bindOnTouchMenu = this.menuBtn.onTouchEndListener.bind(this.menuBtn);
    this.bindOnMouseUpMenu = this.menuBtn.onMouseUpListener.bind(this.menuBtn);

    this.bindOnTouchShare = this.shareBtn.onTouchEndListener.bind(this.shareBtn);
    this.bindOnMouseUpShare = this.shareBtn.onMouseUpListener.bind(this.shareBtn);

    this.bindOnTouchPlay = this.playBtn.onTouchEndListener.bind(this.playBtn);
    this.bindOnMouseUpPlay = this.playBtn.onMouseUpListener.bind(this.playBtn);

};

EndScene.prototype = Object.create(Scene.prototype);
EndScene.prototype.constructor = EndScene;

EndScene.prototype.init = function () {
    // 初始化 Web Audio 上下文（需用户交互后调用）
    initAudioContext();

    // 音频节点池（基于 Web Audio API）
    var buffers = gameDirector.audioBuffers || [];
    // 顺序: touchBtn(0), bounce(1), goal(2), touchBuff(3), gameStart(4), gameOver(5)
    this.soundPoolGameOver = new AudioPool(buffers[5], 1);
    this.soundPoolTouchBtn = new AudioPool(buffers[0], 1);

    // 注册监听器
    this.canvas.addEventListener("touchend", this.bindOnTouchMenu);
    this.canvas.addEventListener("mouseup", this.bindOnMouseUpMenu);

    this.canvas.addEventListener("touchend", this.bindOnTouchShare);
    this.canvas.addEventListener("mouseup", this.bindOnMouseUpShare);

    this.canvas.addEventListener("touchend", this.bindOnTouchPlay);
    this.canvas.addEventListener("mouseup", this.bindOnMouseUpPlay);

    // 绑定按钮监听事件回调函数
    this.menuBtn.onTouchEnd = this.branchToMenu.bind(this);
    this.menuBtn.onMouseUp = this.branchToMenu.bind(this);

    this.shareBtn.onTouchEnd = this.branchToShare.bind(this);
    this.shareBtn.onMouseUp = this.branchToShare.bind(this);

    this.playBtn.onTouchEnd = this.branchToPlay.bind(this);
    this.playBtn.onMouseUp = this.branchToPlay.bind(this);

    // 设置按钮背景色
    this.menuBtn.setBackgroundColor(new Color(255, 193, 7, 1));
    this.shareBtn.setBackgroundColor(new Color(121, 85, 72, 1));
    this.playBtn.setBackgroundColor(new Color(30, 85, 116, 1));

    // 设置按钮贴图
    this.menuBtn.setImage(this.imageArray['menu']);
    this.shareBtn.setImage(this.imageArray['share']);
    this.playBtn.setImage(this.imageArray['replay']);

    // 播放游戏结束音频
    this.soundPoolGameOver.play();

    // 动态生成提示文字装载框
    var $body = $("body");
    if ($body.find("#snackbar-container").length === 0) {
        $("<div>", {
                id: "snackbar-container"
            }
        ).appendTo($body);
    }
};

EndScene.prototype.start = function (result) {
    this.init();

    this.result = result;
    if (arguments.length === 1) {
        if (result["type"] === FallingBalls.TIME_LIMITED) {
            this.resultStr = result["score"].toString(10);
        } else if (result["type"] === FallingBalls.SCORE_LIMITED) {
            this.resultStr = result["score"].toString(10);
        }
    }

    this.requestID = window.requestAnimationFrame(this.draw.bind(this));
};

EndScene.prototype.draw = function () {
    clearCanvas(this.canvas);

    this.ctx.save();
    this.ctx.scale(this.scaledRatio, this.scaledRatio);

    // 绘制分数或比赛结果
    this.ctx.fillStyle = "#1e5574";
    this.ctx.font = "italic bold 90px Arial";
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "center";
    this.ctx.fillText(this.resultStr, this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2);
    if (this.result["type"] === FallingBalls.TIME_LIMITED) {
        this.ctx.fillText("You Got", this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2 - 120);
        this.ctx.fillText("Points", this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2 + 120);
    }
    if (this.result["type"] === FallingBalls.SCORE_LIMITED) {
        this.ctx.fillText("You Spent", this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2 - 120);
        this.ctx.fillText("Seconds", this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2 + 120);
    }

    // 绘制按钮
    this.menuBtn.drawRect(this.ctx);
    this.menuBtn.drawImage(this.ctx);

    this.shareBtn.drawRect(this.ctx);
    this.shareBtn.drawImage(this.ctx);

    this.playBtn.drawRect(this.ctx);
    this.playBtn.drawImage(this.ctx);

    this.ctx.restore();

    this.requestID = window.requestAnimationFrame(this.draw.bind(this));
};

EndScene.prototype.destroy = function () {
    // 销毁按钮监听器
    this.canvas.removeEventListener("touchend", this.bindOnTouchMenu);
    this.canvas.removeEventListener("mouseup", this.bindOnMouseUpMenu);

    this.canvas.removeEventListener("touchend", this.bindOnTouchShare);
    this.canvas.removeEventListener("mouseup", this.bindOnMouseUpShare);

    this.canvas.removeEventListener("touchend", this.bindOnTouchPlay);
    this.canvas.removeEventListener("mouseup", this.bindOnMouseUpPlay);

    window.cancelAnimationFrame(this.requestID);

    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("DESTROY:" + this.requestID);
    }
};

EndScene.prototype.resize = function () {
    Scene.prototype.resize.call(this);

    // 修改按钮尺寸
    this.menuBtn.resize(0, this.scaledHcanvasHeight, this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2, this.scaledRatio);
    this.shareBtn.resize(this.scaledHcanvasWidth, this.scaledHcanvasHeight, this.scaledHcanvasWidth, this.scaledHcanvasHeight / 2, this.scaledRatio);
    this.playBtn.resize(0, this.scaledHcanvasHeight + this.scaledHcanvasHeight / 2, this.scaledCanvasWidth, this.scaledHcanvasHeight / 2, this.scaledRatio);
};

EndScene.prototype.branchToMenu = function () {
    this.soundPoolTouchBtn.play();
    gameDirector.runScene(new StartScene(this.canvas));

    if (FallingBalls.IS_DEBUG_MODE){
        console.info("CLICKED MENU");
    }
};

EndScene.prototype.branchToShare = function () {
    this.soundPoolTouchBtn.play();

    // 动态生成提示框（同时只允许一个框出现）
    var $container = $("#snackbar-container");
    if ($container.find(".snackbar").length === 0) {

        var snackbar = $("<div>", {
            class: "snackbar",
            text: "请打开浏览器菜单，点击分享按钮",
            click: function () {
                $(this).fadeOut(function () {
                    $(this).remove();
                })
            }
        });

        $container.append(snackbar);
        snackbar.fadeIn();

        setTimeout(function () {
            snackbar.fadeOut(function () {
                snackbar.remove();
            })
        }, 2000);
    }

    if (FallingBalls.IS_DEBUG_MODE){
        console.info("CLICKED MENU");
    }
};

EndScene.prototype.branchToPlay = function () {
    this.soundPoolTouchBtn.play();
    gameDirector.runScene(new AnimationScene(this.canvas));

    if (FallingBalls.IS_DEBUG_MODE){
        console.info("CLICKED PLAY");
    }
};
