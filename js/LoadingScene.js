/**
 * LoadingScene 加载场景
 *
 * @param {Object} canvas   画布对象
 * @constructor
 * @author Wing-ho Law
 */
var LoadingScene = function (canvas) {
    Scene.call(this, canvas);

    this.logo = new Image();        // 游戏Logo
    this.loadingMsg = "Loading..."; // 加载信息
    this.progress = 0;              // 加载进度（已加载的文件数）
    this.total = 0;                 // 总进度（要加载的文件数）
    this.progressBarWidth = 500;    // 进度条宽度
    this.progressBarHeight = 20;    // 进度条高度
};

LoadingScene.prototype = Object.create(Scene.prototype);
LoadingScene.prototype.constructor = LoadingScene;

LoadingScene.prototype.init = function () {
    var mediaList = new MediaList();

    // 要加载的图片
    mediaList.addImage("title", "img/falling_balls.png");
    mediaList.addImage("seconds", "img/seconds.png");
    mediaList.addImage("points", "img/points.png");
    mediaList.addImage("menu", "img/menu.png");
    mediaList.addImage("share", "img/share.png");
    mediaList.addImage("replay", "img/replay.png");

    // 要加载的音频
    mediaList.addAudio("touchBtn", ["audio/touchBtn.wav"]);
    mediaList.addAudio("bounce", ["audio/bounce.wav"]);
    mediaList.addAudio("goal", ["audio/goal.wav"]);
    mediaList.addAudio("touchBuff", ["audio/touchBuff.wav"]);
    mediaList.addAudio("gameStart", ["audio/gameStart.wav"]);
    mediaList.addAudio("gameOver", ["audio/gameOver.wav"]);

    this.total = mediaList.length;

    var that = this;

    var preloader = new MediaPreloader();

    preloader.onPreload(function (mediaObjects, nLoaded) {
        if (nLoaded !== mediaObjects.length) {
            that.loadingMsg = "Loading Failed";
            console.error("Media did not load properly");
            return;
        }
        gameDirector.mediaObjects = mediaObjects;

        // 预解码音频为 Web Audio API Buffer
        gameDirector.audioManager.decodeAudioBuffers(mediaObjects, function () {
            that.branchToMenu();
        });
    });

    preloader.onUpdateUI(function (nLoaded) {
        that.progress = nLoaded;
        that.draw();
    });

    // 加载Logo后，开始画进度条和加载多媒体文件
    this.logo.src = 'img/logo.png';
    this.logo.onload = function () {
        that.draw();
        preloader.preloadMedia(mediaList);
    }
};

LoadingScene.prototype.start = function () {
    this.init();
};

LoadingScene.prototype.draw = function () {
    clearCanvas(this.canvas);

    // Logo
    this.ctx.fillStyle = "#eeeeee";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 缩放画布
    this.ctx.save();
    this.ctx.scale(this.scaledRatio, this.scaledRatio);

    this.ctx.drawImage(this.logo, this.scaledHcanvasWidth - this.logo.width / 2, this.scaledHcanvasHeight - this.logo.height - 100);
    this.drawProgressBar();

    this.ctx.restore();
};

LoadingScene.prototype.destroy = function () {
    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("DESTROY");
    }
};

LoadingScene.prototype.resize = function () {
    Scene.prototype.resize.call(this);
    this.draw();
};

LoadingScene.prototype.drawProgressBar = function () {
    var ratio = this.progress / this.total;
    var percentage = ratio.toFixed(2) * 100;

    // Loading
    this.ctx.fillStyle = "rgba(121, 85, 72, 1)";
    this.ctx.font = "italic 30px Arial";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(this.loadingMsg, this.scaledHcanvasWidth - this.progressBarWidth / 2,
        this.scaledHcanvasHeight + 60);

    // 进度百分比
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(percentage + "%", this.scaledHcanvasWidth + this.progressBarWidth / 2, this.scaledHcanvasHeight + 60);

    // 进度条背景
    this.ctx.fillStyle = "rgba(255,255,255,0.8)";
    this.ctx.fillRect(this.scaledHcanvasWidth - this.progressBarWidth / 2,
        this.scaledHcanvasHeight + 90, this.progressBarWidth, this.progressBarHeight);

    // 进度条前景
    this.ctx.fillStyle = "rgba(255,193,7,1)";
    this.ctx.fillRect(this.scaledHcanvasWidth - this.progressBarWidth / 2,
        this.scaledHcanvasHeight + 90, this.progressBarWidth * ratio, this.progressBarHeight);
};

LoadingScene.prototype.branchToMenu = function () {
    gameDirector.runScene(new StartScene(this.canvas));
};
