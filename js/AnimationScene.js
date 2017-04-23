// 球的颜色
var fillSytles = ["#ff5722", "#aaaaaa", "#F44336", "#607D8B", "#FFC107", "#795548", "#4CAF50"];

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
    // 画布信息
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.hcanvasWidth = canvas.width / 2;
    this.hcanvasHeight = canvas.height / 2;

    // 缩放信息
    this.scaledRatio = canvas.height / REFERENCE_CANVAS_HEIGHT;
    this.scaledCanvasWidth = this.canvas.width / this.scaledRatio;
    this.scaledCanvasHeight = this.canvas.height / this.scaledRatio;
    this.scaledHcanvasWidth = this.hcanvasWidth / this.scaledRatio;
    this.scaledHcanvasHeight = this.hcanvasHeight / this.scaledRatio;

    this.requestID = null; // 帧动画ID

    // 多媒体对象
    this.imageArray = gameDirector.mediaObjects.image.content;
    this.audioArray = gameDirector.mediaObjects.audio.content;

    // 游戏控制相关
    this.space = new cp.Space();    // 重力空间
    this.fps = 0;                   // 帧率
    this.running = false;           // 运行标志
    this.scale = 1;                 // 缩放

    // 玩家分数
    this.score = new Score(this.canvas.width / 2, this.canvas.height / 16 * 15 - TIPS_FONT_SIZE / 2);

    // 计时器
    if (MODE == TIME_LIMITED) {
        this.timer = new Timer(this.canvas.width - TIPS_FONT_SIZE, this.canvas.height / 16 * 15 - TIPS_FONT_SIZE / 2, TIME_LIMITED_TARGET);
    } else {
        this.timer = new Timer(this.canvas.width - TIPS_FONT_SIZE, this.canvas.height / 16 * 15 - TIPS_FONT_SIZE / 2, 0);
    }

    // 篮子相关
    this.basket = null;                 // 篮子对象
    this.direction = MOVE_CODE.STOP;    // 方向
    this.moveFlag = false;              // 篮子移动标志
    this.speed = 0;                     // 篮子移动速度
    this.pressKey = null;               // 按键

    // 键盘监听器
    this.bindOnPlayerKeyDown = this.onPlayerKeyDown.bind(this);
    this.bindOnPlayerKeyUp = this.onPlayerKeyUp.bind(this);

    // 按钮
    //this.leftBtn = new Button(0, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, 100, this.scaledRatio);


    this.leftBtn = new Button(0, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 3, this.scaledRatio);
    this.rightBtn = new Button(this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 3, this.scaledRatio);

    // 按钮监听器
    this.bindOnTouchStartLeft = this.leftBtn.onTouchStartListener.bind(this.leftBtn);
    this.bindOnTouchEndLeft = this.leftBtn.onTouchEndListener.bind(this.leftBtn);

    this.bindOnTouchStartRight = this.leftBtn.onTouchStartListener.bind(this.rightBtn);
    this.bindOnTouchEndRight = this.rightBtn.onTouchEndListener.bind(this.rightBtn);

    // 绑定按钮监听事件回调函数
    this.leftBtn.onTouchStart = this.onPlayerTouchStartLeft.bind(this);
    this.leftBtn.onTouchEnd = this.onPlayerTouchEndLeft.bind(this);

    this.rightBtn.onTouchStart = this.onPlayerTouchStartRight.bind(this);
    this.rightBtn.onTouchEnd = this.onPlayerTouchEndRight.bind(this);

    // 数秒定时器
    this.intervalIds = [];

};

AnimationScene.prototype = {
    constructor: AnimationScene,

    /**
     * 初始化场景
     */
    init: function () {
        setBoundary(this.getShortEdge());

        this.setSpace();
        this.addWalls();
        this.addField();
        this.addLine();
        this.addBasket(this.hcanvasWidth - BASKET_LENGTH / 2, BASKET_LENGTH);
        this.addBall();

        var that = this;
        var intervalId;
        intervalId = setInterval(function () {
            that.addBall();
        }, 2000);
        this.intervalIds.push(intervalId);

        if (MODE == TIME_LIMITED) {
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

        // 播放游戏开始音频
        this.audioArray['gameStart'].play();
    },

    /**
     * 运行场景
     */
    start: function () {
        this.init();
        this.run();
    },

    /**
     * 绘制场景
     */
    draw: function () {
        var self = this;

        var ctx = this.ctx;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.font = "16px sans-serif";
        this.ctx.lineCap = 'round';

        this.moveBracket();     // 移动挡板

        var space = this.space;
        space.reindexStatic();  // 绘制挡板

        space.eachShape(function (shape) {

            if (shape.style) {
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

                        // 透明度为0时，销毁球
                        space.addPostStepCallback(function () {
                            space.removeShape(shape);
                            space.removeBody(shape.body);
                        });
                    } else {
                        shape.style.a -= 0.2;
                    }
                }
            }

            shape.draw(ctx, self.scale, self.point2canvas);
        });

        this.score.draw(ctx);   // 绘制分数
        this.timer.draw(ctx);   // 绘制计时器

        if (IS_DEBUG_MODE) {
            this.ctx.save();
            this.ctx.scale(this.scaledRatio, this.scaledRatio);
            // 绘制按钮
            this.leftBtn.drawRect(ctx);
            this.rightBtn.drawRect(ctx);

            this.ctx.restore();
        }

        // 游戏结束的处理
        var result = {};
        if (MODE == TIME_LIMITED) {
            if (this.timer.getValue() == 0) {
                result["type"] = TIME_LIMITED;
                result["score"] = this.score.getValue();
                gameDirector.runScene(new EndScene(gameDirector.canvas), result);
            }
        } else if (MODE == SCORE_LIMITED) {
            if (this.score.getValue() == SCORE_LIMITED_TARGET) {
                result["type"] = SCORE_LIMITED;
                result["score"] = this.timer.getValue();
                gameDirector.runScene(new EndScene(gameDirector.canvas), result);
            }
        }
    },

    /**
     * 运行场景
     */
    run: function () {
        this.running = true;

        var self = this;

        var lastTime = 0;
        var step = function (time) {
            self.step(time - lastTime);
            lastTime = time;

            if (self.running) {
                raf(step.bind(this));
            }
        };

        step(0);
    },

    /**
     * 停止运行场景
     */
    stop: function () {
        this.running = false;
    },

    /**
     * 更新重力空间
     *
     * @param {Number} dt   帧时间间隔
     */
    update: function (dt) {
        this.space.step(dt);
    },

    /**
     * 更新帧间隔，控制是否绘画
     *
     * @param {Number} dt   帧时间间隔
     */
    step: function (dt) {
        // Update FPS
        if (dt > 0) {
            this.fps = 0.9 * this.fps + 0.1 * (1000 / dt);
        }

        var lastNumActiveShapes = this.space.activeShapes.count;

        var now = Date.now();
        this.update(1 / 60);
        this.simulationTime += Date.now() - now;

        // 下面的判断条件是，如果没有物体在运动，则停止绘画
        // if (lastNumActiveShapes > 0) {
        now = Date.now();
        this.draw();
        this.drawTime += Date.now() - now;
        // }
    },

    /**
     * 销毁场景
     */
    destroy: function () {
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

        if (IS_DEBUG_MODE) {
            console.log("DESTROYED");
        }
    },

    /**
     * 调整场景尺寸
     */
    resize: function (parentId) {
        var oldCanvasWidth = this.hcanvasWidth * 2;
        var oldCanvasHeight = this.hcanvasHeight * 2;

        // 新场地信息
        this.ctx = this.canvas.getContext("2d");
        this.hcanvasWidth = this.canvas.width / 2;
        this.hcanvasHeight = this.canvas.height / 2;

        // 重设常量值
        setBoundary(this.getShortEdge());

        // 缩放信息
        this.scaledRatio = this.canvas.height / REFERENCE_CANVAS_HEIGHT;
        this.scaledCanvasWidth = this.canvas.width / this.scaledRatio;
        this.scaledCanvasHeight = this.canvas.height / this.scaledRatio;
        this.scaledHcanvasWidth = this.hcanvasWidth / this.scaledRatio;
        this.scaledHcanvasHeight = this.hcanvasHeight / this.scaledRatio;

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

        this.addBasket(startX * scaleX, BASKET_LENGTH);

        this.space.eachBody(function (body) {
            var oldPos = body.getPos();
            body.setPos(v(oldPos.x * scaleX, oldPos.y * scaleY));
        });

        // 重绘分数和时间
        this.score.resize(this.canvas.width / 2, this.canvas.height / 16 * 15 - TIPS_FONT_SIZE / 2);
        this.timer.resize(this.canvas.width - TIPS_FONT_SIZE, this.canvas.height / 16 * 15 - TIPS_FONT_SIZE / 2);

        // 修改按钮尺寸
        this.leftBtn.resize(0, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 3, this.scaledRatio);
        this.rightBtn.resize(this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 13, this.scaledHcanvasWidth, this.scaledCanvasHeight / 16 * 3, this.scaledRatio);
    },


    /**
     * 获取场地半径
     *
     * @returns {Number}
     */
    getShortEdge: function () {
        var height = this.hcanvasHeight;
        var width = this.hcanvasWidth;

        return (width < height) ? width : height;
    },

    /**
     * 添加一道墙
     *
     * @param start
     * @param end
     */
    addWall: function (start, end) {
        var wall;
        wall = this.space.addShape(new cp.SegmentShape(this.space.staticBody, start, end, 0));
        wall.setElasticity(1);
        wall.setFriction(0);
        wall.setLayers(NOT_GRABABLE_MASK);
        wall.setCollisionType(COLLISION_TYPE.WALL);
    },

    /**
     * 添加网页四周的墙
     */
    addWalls: function () {
        this.addWall(v(0, 0), v(this.canvas.width, 0));
        this.addWall(v(0, this.canvas.height), v(this.canvas.width, this.canvas.height));
        this.addWall(v(0, 0), v(0, this.canvas.height));
        this.addWall(v(this.canvas.width, 0), v(this.canvas.width, this.canvas.height));
    },

    /**
     * 设置重力空间
     */
    setSpace: function () {
        var space = this.space;
        space.iterations = 60;
        space.gravity = v(0, -500);
        //space.sleepTimeThreshold = 0.5;
        space.collisionSlop = 0.5;

        var that = this;

        // 球与针的碰撞处理
        space.addCollisionHandler(COLLISION_TYPE.BALL, COLLISION_TYPE.PIN, null, null, null, function (arbiter, space) {
                var audio = that.audioArray['bounce'].cloneNode(true);
                audio.volume = 0.1;
                audio.play();

                return true;
            }
        );

        // 球与挡板移动线的碰撞处理
        space.addCollisionHandler(COLLISION_TYPE.BALL, COLLISION_TYPE.LINE, null, null, function (arbiter, space) {
                var shapes = arbiter.getShapes();

                var shapeA = shapes[0];
                var shapeB = shapes[1];

                var collTypeA = shapeA.collision_type;
                var collTypeB = shapeB.collision_type;

                if (shapeA.isDead === false) {
                    var audio = that.audioArray['goal'].cloneNode(true);
                    audio.play();
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
                var shapeB = shapes[1];

                var collTypeA = shapeA.collision_type;
                var collTypeB = shapeB.collision_type;

                if (shapeA.isDead === false) {
                    var audio = that.audioArray['touchBuff'].cloneNode(true);
                    audio.play();
                    that.score.updateValue();
                }

                // console.log(that.score);

                if (shapeA.isBorn === false) {
                    shapeA.isDead = true;
                }
                return true;

            }
        );
    },

    /**
     * 添加针形场地
     */
    addField: function () {
        var radius = PIN_RADIUS;
        var strike_x = PIN_RADIUS * 2 + BALL_RADIUS * 3;
        var strike_y = strike_x * 0.5 * Math.tan(Math.PI / 3);

        var first_row_y = this.canvas.height / 8 * 7;
        var last_row_y = this.canvas.height / 8 * 3;
        var num_row = (first_row_y - last_row_y) / strike_y;

        if (IS_DEBUG_MODE) {
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
    },

    /**
     * 添加挡板移动线
     */
    addLine: function () {
        var line;
        line = this.space.addShape(new cp.SegmentShape(this.space.staticBody, v(0, this.canvas.height / 16 * 3), v(this.canvas.width, this.canvas.height / 16 * 3), 2));
        line.setElasticity(0);
        line.setFriction(0);
        line.setLayers(NOT_GRABABLE_MASK);
        line.setCollisionType(COLLISION_TYPE.LINE);
        line.style = new Color(0, 0, 0, 0.3);
    },

    /**
     * 添加挡板
     *
     * @param {Number} startX   起始横坐标
     * @param {Number} length   长度
     */
    addBasket: function (startX, length) {
        this.basket = this.space.addShape(new cp.SegmentShape(this.space.staticBody, v(startX, this.canvas.height / 16 * 3), v(startX + length, this.canvas.height / 16 * 3), PIN_RADIUS));
        this.basket.setElasticity(0);
        this.basket.setFriction(0);
        this.basket.setLayers(NOT_GRABABLE_MASK);
        this.basket.setCollisionType(COLLISION_TYPE.BASKET);

        var color = new Color();
        color.initWithHex("#1e5574", 1);

        this.basket.style = color;
    },

    /**
     * 添加球
     */
    addBall: function () {
        var space = this.space;
        var radius = BALL_RADIUS;
        var mass = 3;
        var body = space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, v(0, 0))));
        var posX = radius + (this.canvas.width - radius * 2) * Math.random();

        body.setPos(v(posX, this.canvas.height / 9 * 8));
        body.setVel(v(0, 0));

        var circle = space.addShape(new cp.CircleShape(body, radius, v(0, 0)));
        circle.setElasticity(BALL_ELASTIC);
        circle.setFriction(0);
        circle.setCollisionType(COLLISION_TYPE.BALL);

        var color = new Color();
        color.initWithHex(fillSytles[circle.hashid % fillSytles.length], 0);
        circle.style = color;

        circle.isBorn = true;
        circle.isDead = false;
    },

    /**
     * 画布坐标转重力场坐标
     *
     * @param {Number} x    画布横坐标
     * @param {Number} y    画布纵坐标
     */
    canvas2point: function (x, y) {
        return v(x, this.canvas.height - y);
    },

    /**
     * 重力场坐标转画布坐标
     *
     * @param {Object} point            重力场点的向量坐标
     * @param {Number} canvasHeight     画布高度
     */
    point2canvas: function (point, canvasHeight) {
        return v(point.x, this.canvas.height - point.y);
    },

    /**
     * 键盘按下事件监听函数
     *
     * @param {Event} e 事件
     */
    onPlayerKeyDown: function (e) {
        var keyID = e.keyCode ? e.keyCode : e.which;

        switch (keyID) {
            case 65:
            case 37:
                this.pressKey = keyID;
                this.setMovingStatus(MOVE_CODE.LEFT);
                if (IS_DEBUG_MODE) {
                    console.log("KEY DOWN", "LEFT");
                }
                break;
            case 68:
            case 39:
                this.pressKey = keyID;
                this.setMovingStatus(MOVE_CODE.RIGHT);
                if (IS_DEBUG_MODE) {
                    console.log("KEY DOWN", "RIGHT");
                }
                break;
        }
    },

    /**
     * 键盘抬起事件监听函数
     *
     * @param {Event} e 事件
     */
    onPlayerKeyUp: function (e) {
        var keyID = e.keyCode ? e.keyCode : e.which;
        if (keyID === this.pressKey) {
            switch (keyID) {
                case 65:
                case 37:
                    this.setStopStatus();
                    if (IS_DEBUG_MODE) {
                        console.log("KEY UP", "LEFT");
                    }
                    break;
                case 68:
                case 39:
                    this.setStopStatus();
                    if (IS_DEBUG_MODE) {
                        console.log("KEY UP", "RIGHT");
                    }
                    break;
            }
        }
    },

    onPlayerTouchStartLeft: function () {
        this.pressKey = 65;
        this.setMovingStatus(MOVE_CODE.LEFT);
        if (IS_DEBUG_MODE) {
            console.log("TOUCH START", "LEFT");
        }
    },

    onPlayerTouchStartRight: function () {
        this.pressKey = 68;
        this.setMovingStatus(MOVE_CODE.RIGHT);
        if (IS_DEBUG_MODE) {
            console.log("TOUCH START", "RIGHT");
        }
    },

    onPlayerTouchEndLeft: function () {
        this.setStopStatus();
        if (IS_DEBUG_MODE) {
            console.log("TOUCH END", "LEFT");
        }
    },

    onPlayerTouchEndRight: function () {
        this.setStopStatus();
        if (IS_DEBUG_MODE) {
            console.log("TOUCH END", "RIGHT");
        }
    },


    /**
     * 设置挡板为移动状态
     *
     * @param {Number} direction    方向代码
     */
    setMovingStatus: function (direction) {
        this.moveFlag = true;
        this.speed = BASKET_VELOCITY_MAX;
        this.direction = direction;
    },

    /**
     * 设置挡板为停止状态
     */
    setStopStatus: function () {
        this.moveFlag = false;
    },

    /**
     * 移动挡板
     */
    moveBracket: function () {
        if (!this.moveFlag) {
            this.speed *= 0.9;
        }

        var start = this.basket.a;
        var end = this.basket.b;
        if (this.direction == MOVE_CODE.RIGHT) {
            start = v.add(start, v(this.speed, 0));
            end = v.add(end, v(this.speed, 0));
        } else if (this.direction == MOVE_CODE.LEFT) {
            start = v.sub(start, v(this.speed, 0));
            end = v.sub(end, v(this.speed, 0));
        }

        if (start.x < PIN_RADIUS) {
            this.speed = 0;
            start.x = PIN_RADIUS;
            end.x = PIN_RADIUS + BASKET_LENGTH;
        } else if (end.x > this.canvas.width - PIN_RADIUS) {
            this.speed = 0;
            end.x = this.canvas.width - PIN_RADIUS;
            start.x = end.x - BASKET_LENGTH;
        }

        this.basket.setEndpoints(start, end);
    }
};

/**
 * 设置请求帧
 *
 * @type {*|Function} 请求帧函数
 */
var raf = window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.oRequestAnimationFrame
    || window.msRequestAnimationFrame
    || function (callback) {
        return window.setTimeout(callback, 1000 / 60);
    };


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