/**
 * AudioPool 基于 Web Audio API 的音频池
 * 预解码音频，无播放延迟和 CPU 解码开销
 *
 * @param {AudioBuffer} audioBuffer  预解码的 AudioBuffer
 * @param {Number}      poolSize    池大小
 * @constructor
 */
var AudioPool = function (audioBuffer, poolSize) {
    this.buffer = audioBuffer;
    this.poolSize = poolSize || 4;
    this.pool = [];

    // 复用节点
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

        // 找一个空闲的节点
        for (var i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].isPlaying) {
                this._playNode(this.pool[i], volume);
                return;
            }
        }

        // 全部占用，覆盖第一个
        this._playNode(this.pool[0], volume);
    },

    _playNode: function (node, volume) {
        if (!audioContext || !this.buffer) {
            return;
        }

        // 停止之前的播放
        if (node.source) {
            try {
                node.source.stop();
            } catch (e) {}
        }

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

// Web Audio API 全局上下文
var audioContext = null;

/**
 * 初始化 Web Audio API 上下文（需用户交互后调用）
 */
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

/**
 * 预解码音频文件为 AudioBuffer
 *
 * @param {Array}   audioSrcList  音频 URL 数组
 * @param {Function} onComplete   全部解码完成回调
 * @param {Function} onProgress   进度回调
 */
function decodeAudioFiles(audioSrcList, onComplete, onProgress) {
    var buffers = [];
    var loaded = 0;

    audioSrcList.forEach(function (src) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', src, true);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function () {
            audioContext.decodeAudioData(xhr.response, function (buffer) {
                buffers.push(buffer);
                loaded++;
                if (onProgress) {
                    onProgress(loaded, audioSrcList.length);
                }
                if (loaded === audioSrcList.length && onComplete) {
                    onComplete(buffers);
                }
            }, function (e) {
                console.error('Decode error:', src, e);
                buffers.push(null);
                loaded++;
            });
        };

        xhr.onerror = function (e) {
            console.error('Load error:', src, e);
            buffers.push(null);
            loaded++;
        };

        xhr.send();
    });
}

// 物理引擎相关
var v = cp.v;   // vector类
var GRABABLE_MASK_BIT = 1 << 31;
var NOT_GRABABLE_MASK = ~GRABABLE_MASK_BIT;

// 碰撞类型
var COLLISION_TYPE = {
    BALL: 1,
    WALL: 2,
    PIN: 3,
    BASKET: 4,
    LINE: 5
};

/**
 * AnimationScene 动画场景（比赛中）
 *
 * @param {Object} canvas   画布对象
 * @author Wing-ho Law
 */
var AnimationScene = function (canvas) {
    Scene.call(this, canvas);

    // 多媒体对象
    this.imageArray = gameDirector.mediaObjects.image.content;
    this.audioArray = gameDirector.mediaObjects.audio.content;

    // 音频节点池（基于 Web Audio API 预解码 Buffer）
    // 顺序: touchBtn(0), bounce(1), goal(2), touchBuff(3), gameStart(4), gameOver(5)
    var buffers = gameDirector.audioBuffers || [];
    this.soundPoolBounce = new AudioPool(buffers[1], 4);
    this.soundPoolGoal = new AudioPool(buffers[2], 4);
    this.soundPoolTouchBuff = new AudioPool(buffers[3], 4);
    this.soundPoolGameStart = new AudioPool(buffers[4], 1);

    // 游戏控制相关
    this.space = new cp.Space();    // 重力空间
    this.fps = 0;                   // 帧率
    this.running = false;           // 运行标志
    this.scale = 1;                 // 缩放
    this.fixedTimeStep = 1 / 60;    // 固定物理步长（秒）
    this.accumulator = 0;           // 累积真实经过时间（秒）
    this.maxSubSteps = 5;           // 每帧最多推进次数，避免卡顿后补帧过多

    // 玩家分数
    this.score = new Score(this.canvas.width / 2, this.canvas.height / 16 * 15 - FallingBalls.TIPS_FONT_SIZE / 2);

    // 计时器
    if (FallingBalls.MODE === FallingBalls.TIME_LIMITED) {
        this.timer = new Timer(this.canvas.width - FallingBalls.TIPS_FONT_SIZE, this.canvas.height / 16 * 15 - FallingBalls.TIPS_FONT_SIZE / 2, FallingBalls.TIME_LIMITED_TARGET);
    } else {
        this.timer = new Timer(this.canvas.width - FallingBalls.TIPS_FONT_SIZE, this.canvas.height / 16 * 15 - FallingBalls.TIPS_FONT_SIZE / 2, 0);
    }

    // 篮子相关
    this.basket = null;                 // 篮子对象
    this.direction = FallingBalls.MOVE_CODE.STOP;    // 方向
    this.moveFlag = false;              // 篮子移动标志
    this.speed = 0;                     // 篮子移动速度
    this.pressKey = null;               // 按键

    // 键盘监听器
    this.bindOnPlayerKeyDown = this.onPlayerKeyDown.bind(this);
    this.bindOnPlayerKeyUp = this.onPlayerKeyUp.bind(this);

    // 按钮
    this.leftBtn = new Button(0, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 3, this.scaledRatio);
    this.rightBtn = new Button(this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 3, this.scaledRatio);

    // 按钮监听器
    this.bindOnTouchStartLeft = this.leftBtn.onTouchStartListener.bind(this.leftBtn);
    this.bindOnTouchEndLeft = this.leftBtn.onTouchEndListener.bind(this.leftBtn);

    this.bindOnTouchStartRight = this.rightBtn.onTouchStartListener.bind(this.rightBtn);
    this.bindOnTouchEndRight = this.rightBtn.onTouchEndListener.bind(this.rightBtn);

    // 绑定按钮监听事件回调函数
    this.leftBtn.onTouchStart = this.onPlayerTouchStartLeft.bind(this);
    this.leftBtn.onTouchEnd = this.onPlayerTouchEndLeft.bind(this);

    this.rightBtn.onTouchStart = this.onPlayerTouchStartRight.bind(this);
    this.rightBtn.onTouchEnd = this.onPlayerTouchEndRight.bind(this);

    // 数秒定时器
    this.intervalIds = [];

    // 优化5: 离屏 canvas 预渲染静态元素
    this.staticCanvas = document.createElement('canvas');
    this.staticCtx = null;

    // 优化2: 球对象池
    this.ballPool = [];
    this.ballPoolSize = 10;
    this.activeBalls = [];  // 活跃的球
};

AnimationScene.prototype = Object.create(Scene.prototype);
AnimationScene.prototype.constructor = AnimationScene;

AnimationScene.prototype.init = function () {
    setBoundary(this.getShortEdge());

    // 初始化离屏 canvas
    this.staticCanvas.width = this.canvas.width;
    this.staticCanvas.height = this.canvas.height;
    this.staticCtx = this.staticCanvas.getContext('2d');

    // 初始化球对象池
    this.initBallPool();

    this.setSpace();
    this.addWalls();
    this.addField();
    this.addLine();
    this.addBasket(this.hcanvasWidth - FallingBalls.BASKET_LENGTH / 2, FallingBalls.BASKET_LENGTH);

    // 预渲染静态元素
    this.renderStaticElements();

    this.spawnBall();

    var that = this;
    var intervalId;
    intervalId = setInterval(function () {
        that.spawnBall();
    }, 2000);
    this.intervalIds.push(intervalId);

    if (FallingBalls.MODE === FallingBalls.TIME_LIMITED) {
        intervalId = setInterval(function () {
            that.timer.downgradeValue();
        }, 1000);
        this.intervalIds.push(intervalId);
    } else {
        intervalId = setInterval(function () {
            that.timer.upgradeValue();
        }, 1000);
        this.intervalIds.push(intervalId);
    }


    // 设置按钮背景色
    this.leftBtn.setBackgroundColor(new Color(255, 193, 7, 0.05));
    this.rightBtn.setBackgroundColor(new Color(121, 85, 72, 0.05));

    // 注册监听器
    window.addEventListener("keydown", this.bindOnPlayerKeyDown);
    window.addEventListener("keyup", this.bindOnPlayerKeyUp);

    this.canvas.addEventListener("touchstart", this.bindOnTouchStartLeft);
    this.canvas.addEventListener("touchend", this.bindOnTouchEndLeft);

    this.canvas.addEventListener("touchstart", this.bindOnTouchStartRight);
    this.canvas.addEventListener("touchend", this.bindOnTouchEndRight);

    // 初始化 Web Audio 上下文（需用户交互后调用）
    initAudioContext();

    // 播放游戏开始音频
    this.soundPoolGameStart.play();
};

AnimationScene.prototype.start = function () {
    this.init();
    this.run();
};

AnimationScene.prototype.draw = function () {
    var ctx = this.ctx;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.font = "16px sans-serif";
    this.ctx.lineCap = 'round';

    // 优化5: 绘制预渲染的静态元素
    ctx.drawImage(this.staticCanvas, 0, 0);

    this.moveBracket();     // 移动挡板

    // 绘制篮筐（动态更新）
    if (this.basket && this.basket.style) {
        ctx.fillStyle = this.basket.style.toRgbaStr();
        ctx.strokeStyle = this.basket.style.toRgbaStr();
        this.basket.draw(ctx, this.scale, this.point2canvas);
    }

    // 优化3+4: 只遍历活跃的球，带屏幕剔除
    var canvasHeight = this.canvas.height;
    var ballRadius = FallingBalls.BALL_RADIUS;

    for (var i = 0; i < this.activeBalls.length; i++) {
        var ballData = this.activeBalls[i];
        var shape = ballData.shape;

        // 优化4: 屏幕剔除 - 跳过屏幕外的球
        var pos = shape.body.getPos();
        if (pos.y < -ballRadius * 2 || pos.y > canvasHeight + ballRadius * 2) {
            continue;
        }

        // 优化1: 缓存颜色字符串（通过 shape.style 提供）
        ctx.fillStyle = shape.style.toRgbaStr();
        ctx.strokeStyle = shape.style.toRgbaStr();

        // 生成球时，淡入透明度
        if (shape.isBorn === true) {
            if (shape.style.a >= 1) {
                shape.isBorn = false;
            } else {
                shape.style.a += 0.02;
            }
        }

        // 销毁球时，淡出透明度
        if (shape.isDead === true) {
            if (shape.style.a <= 0) {
                // 透明度为0时，回收到对象池
                this.releaseBall(ballData);
                continue;
            } else {
                shape.style.a -= 0.2;
            }
        }

        shape.draw(ctx, this.scale, this.point2canvas);
    }

    this.score.draw(ctx);   // 绘制分数
    this.timer.draw(ctx);   // 绘制计时器

    if (FallingBalls.IS_DEBUG_MODE) {
        this.ctx.save();
        this.ctx.scale(this.scaledRatio, this.scaledRatio);
        // 绘制按钮
        this.leftBtn.drawRect(ctx);
        this.rightBtn.drawRect(ctx);

        this.ctx.restore();
    }

    // 游戏结束的处理
    var result = {};
    if (FallingBalls.MODE === FallingBalls.TIME_LIMITED) {
        if (this.timer.getValue() === 0) {
            result["type"] = FallingBalls.TIME_LIMITED;
            result["score"] = this.score.getValue();
            gameDirector.runScene(new EndScene(gameDirector.canvas), result);
        }
    } else if (FallingBalls.MODE === FallingBalls.SCORE_LIMITED) {
        if (this.score.getValue() === FallingBalls.SCORE_LIMITED_TARGET) {
            result["type"] = FallingBalls.SCORE_LIMITED;
            result["score"] = this.timer.getValue();
            gameDirector.runScene(new EndScene(gameDirector.canvas), result);
        }
    }
};

AnimationScene.prototype.run = function () {
    this.running = true;

    var self = this;
    var lastTime = performance.now();
    var step = function (time) {
        self.step(time - lastTime);
        lastTime = time;

        if (self.running) {
            raf(step.bind(this));
        }
    };

    raf(step.bind(this));
};

AnimationScene.prototype.stop = function () {
    this.running = false;
};

AnimationScene.prototype.update = function (dt) {
    this.space.step(dt);
};

AnimationScene.prototype.step = function (dt) {
    // Update FPS
    if (dt > 0) {
        this.fps = 0.9 * this.fps + 0.1 * (1000 / dt);
    }

    // 将毫秒转换为秒并限制上限，避免切后台回前台时一次性跳太多
    var frameTime = Math.min(dt, 100) / 1000;
    this.accumulator += frameTime;

    // 用固定步长推进物理世界，保证不同刷新率下手感一致
    var subSteps = 0;
    while (this.accumulator >= this.fixedTimeStep && subSteps < this.maxSubSteps) {
        this.update(this.fixedTimeStep);
        this.accumulator -= this.fixedTimeStep;
        subSteps++;
    }

    this.draw();
};

AnimationScene.prototype.destroy = function () {
    // 销毁按钮监听器
    window.removeEventListener("keydown", this.bindOnPlayerKeyDown);
    window.removeEventListener("keyup", this.bindOnPlayerKeyUp);

    // 销毁按钮监听器
    this.canvas.removeEventListener("touchstart", this.bindOnTouchStartLeft);
    this.canvas.removeEventListener("touchend", this.bindOnTouchEndLeft);

    this.canvas.removeEventListener("touchstart", this.bindOnTouchStartRight);
    this.canvas.removeEventListener("touchend", this.bindOnTouchEndRight);


    var i;
    for (i = 0; i < this.intervalIds.length; i++) {
        clearInterval(this.intervalIds[i]);
    }

    this.stop();

    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("DESTROYED");
    }
};

AnimationScene.prototype.resize = function () {
    var oldCanvasWidth = this.hcanvasWidth * 2;
    var oldCanvasHeight = this.hcanvasHeight * 2;

    // 新场地信息
    this.ctx = this.canvas.getContext("2d");

    // 调用基类 resize，更新 hcanvasWidth/Height 和缩放信息
    Scene.prototype.resize.call(this);

    // 重设常量值
    setBoundary(this.getShortEdge());

    // 重绘static刚体
    var startX = this.basket.a.x;
    var that = this;
    this.space.eachShape(function (shape) {
        if (shape.collision_type == COLLISION_TYPE.WALL || shape.collision_type == COLLISION_TYPE.PIN
            || shape.collision_type == COLLISION_TYPE.LINE || shape.collision_type == COLLISION_TYPE.BASKET) {
            that.space.addPostStepCallback(function () {
                that.space.removeStaticShape(shape);
            });
        }
    });
    this.addWalls();
    this.addField();
    this.addLine();

    var scaleX = this.canvas.width / oldCanvasWidth;
    var scaleY = this.canvas.height / oldCanvasHeight;

    this.addBasket(startX * scaleX, FallingBalls.BASKET_LENGTH);

    this.space.eachBody(function (body) {
        var oldPos = body.getPos();
        body.setPos(v(oldPos.x * scaleX, oldPos.y * scaleY));
    });

    // 重绘分数和时间
    this.score.resize(this.canvas.width / 2, this.canvas.height / 16 * 15 - FallingBalls.TIPS_FONT_SIZE / 2);
    this.timer.resize(this.canvas.width - FallingBalls.TIPS_FONT_SIZE, this.canvas.height / 16 * 15 - FallingBalls.TIPS_FONT_SIZE / 2);

    // 修改按钮尺寸
    this.leftBtn.resize(0, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 3, this.scaledRatio);
    this.rightBtn.resize(this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 3, this.scaledRatio);
};

AnimationScene.prototype.getShortEdge = function () {
    var height = gameDirector.cssHeight;
    var width = gameDirector.cssWidth;

    if (gameDirector.isMobile) {
        height *= this.scaledRatio;
        width *= this.scaledRatio;
    }

    return (width < height) ? width : height;
};

AnimationScene.prototype.addWall = function (start, end) {
    var wall;
    wall = this.space.addShape(new cp.SegmentShape(this.space.staticBody, start, end, 0));
    wall.setElasticity(1);
    wall.setFriction(0);
    wall.setLayers(NOT_GRABABLE_MASK);
    wall.setCollisionType(COLLISION_TYPE.WALL);
};

AnimationScene.prototype.addWalls = function () {
    this.addWall(v(0, 0), v(this.canvas.width, 0));
    this.addWall(v(0, this.canvas.height), v(this.canvas.width, this.canvas.height));
    this.addWall(v(0, 0), v(0, this.canvas.height));
    this.addWall(v(this.canvas.width, 0), v(this.canvas.width, this.canvas.height));
};

AnimationScene.prototype.setSpace = function () {
    var space = this.space;
    space.iterations = 60;
    space.gravity = v(0, -500);
    space.collisionSlop = 0.5;

    var that = this;

    // 球与针的碰撞处理（添加冷却避免频繁播放）
    var lastBounceTime = 0;
    space.addCollisionHandler(COLLISION_TYPE.BALL, COLLISION_TYPE.PIN, null, null, null, function (arbiter, space) {
            var now = performance.now();
            if (now - lastBounceTime > 50) {  // 最多每50ms播放一次
                lastBounceTime = now;
                that.soundPoolBounce.play(0.1);
            }
            return true;
        }
    );

    // 球与挡板移动线的碰撞处理
    space.addCollisionHandler(COLLISION_TYPE.BALL, COLLISION_TYPE.LINE, null, null, function (arbiter, space) {
            var shapes = arbiter.getShapes();
            var shapeA = shapes[0];

            if (shapeA.isDead === false) {
                that.soundPoolGoal.play();
            }

            if (shapeA.isBorn === false) {
                shapeA.isDead = true;
            }

            return true;

        }, null
    );

    // 球与挡板的碰撞处理
    space.addCollisionHandler(COLLISION_TYPE.BALL, COLLISION_TYPE.BASKET, null, null, function (arbiter, space) {
            var shapes = arbiter.getShapes();
            var shapeA = shapes[0];

            if (shapeA.isDead === false) {
                that.soundPoolTouchBuff.play();
                that.score.updateValue();
            }

            if (shapeA.isBorn === false) {
                shapeA.isDead = true;
            }
            return true;

        }
    );
};

AnimationScene.prototype.addField = function () {
    var radius = FallingBalls.PIN_RADIUS;
    var strike_x = FallingBalls.PIN_RADIUS * 2 + FallingBalls.BALL_RADIUS * 3;
    var strike_y = strike_x * 0.5 * Math.tan(Math.PI / 3);

    var first_row_y = this.canvas.height / 8 * 7;
    var last_row_y = this.canvas.height / 8 * 3;
    var num_row = (first_row_y - last_row_y) / strike_y;

    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("ROW_NUM", num_row);
    }

    var row;
    var pin;
    var posX = 0;
    var posY = first_row_y;

    for (row = 0; row < num_row; row++) {
        if (row % 2 == 0) {
            posX = radius + strike_x;
        } else {
            posX = radius + strike_x * 1.5;
        }
        while (posX < this.canvas.width - radius - strike_x) {
            pin = this.space.addShape(new cp.CircleShape(this.space.staticBody, radius, v(posX, posY)));
            pin.setElasticity(0.8);
            pin.setFriction(0);
            pin.setLayers(NOT_GRABABLE_MASK);
            pin.setCollisionType(COLLISION_TYPE.PIN);

            var color = new Color();
            color.initWithHex("#444444", 1);

            pin.style = color;
            posX += strike_x;
        }
        posY -= strike_y;
    }
};

AnimationScene.prototype.addLine = function () {
    var line;
    line = this.space.addShape(new cp.SegmentShape(this.space.staticBody, v(0, this.canvas.height / 16 * 3), v(this.canvas.width, this.canvas.height / 16 * 3), 2));
    line.setElasticity(0);
    line.setFriction(0);
    line.setLayers(NOT_GRABABLE_MASK);
    line.setCollisionType(COLLISION_TYPE.LINE);
    line.style = new Color(0, 0, 0, 0.3);
};

AnimationScene.prototype.addBasket = function (startX, length) {
    this.basket = this.space.addShape(new cp.SegmentShape(this.space.staticBody, v(startX, this.canvas.height / 16 * 3), v(startX + length, this.canvas.height / 16 * 3), FallingBalls.PIN_RADIUS));
    this.basket.setElasticity(0);
    this.basket.setFriction(0);
    this.basket.setLayers(NOT_GRABABLE_MASK);
    this.basket.setCollisionType(COLLISION_TYPE.BASKET);

    var color = new Color();
    color.initWithHex("#1e5574", 1);

    this.basket.style = color;
};

AnimationScene.prototype.initBallPool = function () {
    var radius = FallingBalls.BALL_RADIUS;
    var mass = 3;

    for (var i = 0; i < this.ballPoolSize; i++) {
        var body = new cp.Body(mass, cp.momentForCircle(mass, 0, radius, v(0, 0)));
        var circle = new cp.CircleShape(body, radius, v(0, 0));
        circle.setElasticity(FallingBalls.BALL_ELASTIC);
        circle.setFriction(0);
        circle.setCollisionType(COLLISION_TYPE.BALL);

        var color = new Color();
        color.initWithHex(FallingBalls.BALL_COLORS[i % FallingBalls.BALL_COLORS.length], 0);
        circle.style = color;

        this.ballPool.push({
            body: body,
            shape: circle,
            active: false
        });
    }
};

AnimationScene.prototype.spawnBall = function () {
    // 优化2: 优先从对象池获取
    var ballData = null;

    for (var i = 0; i < this.ballPool.length; i++) {
        if (!this.ballPool[i].active) {
            ballData = this.ballPool[i];
            break;
        }
    }

    if (!ballData) {
        return; // 对象池已满
    }

    var radius = FallingBalls.BALL_RADIUS;
    var posX = radius + (this.canvas.width - radius * 2) * Math.random();

    ballData.body.setPos(v(posX, this.canvas.height / 9 * 8));
    ballData.body.setVel(v(0, 0));

    ballData.shape.isBorn = true;
    ballData.shape.isDead = false;
    ballData.shape.style.a = 0;
    ballData.active = true;

    this.space.addBody(ballData.body);
    this.space.addShape(ballData.shape);
    this.activeBalls.push(ballData);
};

AnimationScene.prototype.releaseBall = function (ballData) {
    ballData.active = false;
    ballData.shape.isDead = false;
    ballData.shape.isBorn = false;

    this.space.removeBody(ballData.body);
    this.space.removeShape(ballData.shape);

    var idx = this.activeBalls.indexOf(ballData);
    if (idx > -1) {
        this.activeBalls.splice(idx, 1);
    }
};

AnimationScene.prototype.renderStaticElements = function () {
    // 优化5: 预渲染静态元素（墙、针、线）到离屏 canvas
    var ctx = this.staticCtx;
    var self = this;
    ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
    ctx.save();
    ctx.scale(this.scale, this.scale);

    this.space.eachShape(function (shape) {
        if (shape.collision_type === COLLISION_TYPE.WALL ||
            shape.collision_type === COLLISION_TYPE.PIN ||
            shape.collision_type === COLLISION_TYPE.LINE) {
            if (shape.style) {
                ctx.fillStyle = shape.style.toRgbaStr();
                ctx.strokeStyle = shape.style.toRgbaStr();
            }
            shape.draw(ctx, self.scale, self.point2canvas);
        }
    });

    ctx.restore();
};

AnimationScene.prototype.canvas2point = function (x, y) {
    return v(x, this.canvas.height - y);
};

AnimationScene.prototype.point2canvas = function (point, canvasHeight) {
    return v(point.x, this.canvas.height - point.y);
};

AnimationScene.prototype.onPlayerKeyDown = function (e) {
    var keyID = e.keyCode ? e.keyCode : e.which;

    switch (keyID) {
        case 65:
        case 37:
            this.pressKey = keyID;
            this.setMovingStatus(FallingBalls.MOVE_CODE.LEFT);
            if (FallingBalls.IS_DEBUG_MODE) {
                console.log("KEY DOWN", "LEFT");
            }
            break;
        case 68:
        case 39:
            this.pressKey = keyID;
            this.setMovingStatus(FallingBalls.MOVE_CODE.RIGHT);
            if (FallingBalls.IS_DEBUG_MODE) {
                console.log("KEY DOWN", "RIGHT");
            }
            break;
    }
};

AnimationScene.prototype.onPlayerKeyUp = function (e) {
    var keyID = e.keyCode ? e.keyCode : e.which;
    if (keyID === this.pressKey) {
        switch (keyID) {
            case 65:
            case 37:
                this.setStopStatus();
                if (FallingBalls.IS_DEBUG_MODE) {
                    console.log("KEY UP", "LEFT");
                }
                break;
            case 68:
            case 39:
                this.setStopStatus();
                if (FallingBalls.IS_DEBUG_MODE) {
                    console.log("KEY UP", "RIGHT");
                }
                break;
        }
    }
};

AnimationScene.prototype.onPlayerTouchStartLeft = function () {
    this.pressKey = 65;
    this.setMovingStatus(FallingBalls.MOVE_CODE.LEFT);
    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("TOUCH START", "LEFT");
    }
};

AnimationScene.prototype.onPlayerTouchStartRight = function () {
    this.pressKey = 68;
    this.setMovingStatus(FallingBalls.MOVE_CODE.RIGHT);
    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("TOUCH START", "RIGHT");
    }
};

AnimationScene.prototype.onPlayerTouchEndLeft = function () {
    this.setStopStatus();
    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("TOUCH END", "LEFT");
    }
};

AnimationScene.prototype.onPlayerTouchEndRight = function () {
    this.setStopStatus();
    if (FallingBalls.IS_DEBUG_MODE) {
        console.log("TOUCH END", "RIGHT");
    }
};

AnimationScene.prototype.setMovingStatus = function (direction) {
    this.moveFlag = true;
    this.speed = FallingBalls.BASKET_VELOCITY_MAX;
    this.direction = direction;
};

AnimationScene.prototype.setStopStatus = function () {
    this.moveFlag = false;
};

AnimationScene.prototype.moveBracket = function () {
    if (!this.basket) {
        return;
    }

    if (!this.moveFlag) {
        this.speed *= 0.9;
    }

    var start = this.basket.a;
    var end = this.basket.b;
    var needsReindex = false;

    if (this.direction === FallingBalls.MOVE_CODE.RIGHT) {
        start = v.add(start, v(this.speed, 0));
        end = v.add(end, v(this.speed, 0));
        needsReindex = true;
    } else if (this.direction === FallingBalls.MOVE_CODE.LEFT) {
        start = v.sub(start, v(this.speed, 0));
        end = v.sub(end, v(this.speed, 0));
        needsReindex = true;
    }

    if (start.x < FallingBalls.PIN_RADIUS) {
        this.speed = 0;
        start.x = FallingBalls.PIN_RADIUS;
        end.x = FallingBalls.PIN_RADIUS + FallingBalls.BASKET_LENGTH;
        needsReindex = true;
    } else if (end.x > this.canvas.width - FallingBalls.PIN_RADIUS) {
        this.speed = 0;
        end.x = this.canvas.width - FallingBalls.PIN_RADIUS;
        start.x = end.x - FallingBalls.BASKET_LENGTH;
        needsReindex = true;
    }

    if (needsReindex) {
        this.basket.setEndpoints(start, end);
        this.space.reindexStatic();
    }
};

/**
 * 设置请求帧
 *
 * @type {Function} 请求帧函数
 */
var raf = window.requestAnimationFrame.bind(window);


// 绘图辅助函数

/**
 * 绘制圆形
 *
 * @param {Object}      ctx             画布上下文对象
 * @param {Number}      scale           比例
 * @param {Function}    point2canvas    重力场坐标转画布坐标函数
 * @param {Object}      c               圆心向量坐标
 * @param {Number}      radius          圆的半径
 */
var drawCircle = function (ctx, scale, point2canvas, c, radius) {
    var circle = point2canvas(c);
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, scale * radius, 0, 2 * Math.PI, false);
    ctx.fill();
    //ctx.stroke();
};

/**
 * 绘制线段
 *
 * @param {Object}      ctx             画布上下文对象
 * @param {Function}    point2canvas    重力场坐标转画布坐标函数
 * @param {Object}      a               起点向量坐标
 * @param {Number}      b               终点向量坐标
 */
var drawLine = function (ctx, point2canvas, a, b) {
    a = point2canvas(a);
    b = point2canvas(b);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
};

// 重载物理引擎的线段绘画
cp.SegmentShape.prototype.draw = function (ctx, scale, point2canvas) {
    var oldLineWidth = ctx.lineWidth;
    ctx.lineWidth = Math.max(1, this.r * scale * 2);
    drawLine(ctx, point2canvas, this.ta, this.tb);
    ctx.lineWidth = oldLineWidth;
};

// 重载物理引擎的圆形绘画
cp.CircleShape.prototype.draw = function (ctx, scale, point2canvas) {
    drawCircle(ctx, scale, point2canvas, this.tc, this.r);
};
