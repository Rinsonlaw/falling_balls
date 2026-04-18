/**
 * FallingBalls 全局配置命名空间
 *
 * 封装游戏的全局常量和配置
 */
var FallingBalls = {};

// 模式类型
FallingBalls.UNKNOWN = 0;
FallingBalls.TIME_LIMITED = 1;
FallingBalls.SCORE_LIMITED = 2;

// 当前模式
FallingBalls.MODE = FallingBalls.UNKNOWN;

// 挡板移动代码
FallingBalls.MOVE_CODE = {
    STOP: 0,
    LEFT: 1,
    RIGHT: 2
};

// 物理参数
FallingBalls.BALL_VELOCITY = 0;
FallingBalls.BALL_RADIUS = 0;
FallingBalls.BALL_ELASTIC = 0.99;
FallingBalls.PIN_RADIUS = 0;
FallingBalls.BASKET_VELOCITY_MAX = 8;
FallingBalls.BASKET_LENGTH = 200;
FallingBalls.TIPS_FONT_SIZE = 40;
FallingBalls.SCORE_LIMITED_TARGET = 100;
FallingBalls.TIME_LIMITED_TARGET = 60;

// 调试开关
FallingBalls.IS_SHOW_FPS = false;
FallingBalls.IS_DEBUG_MODE = false;
FallingBalls.REFERENCE_CANVAS_HEIGHT = 960;