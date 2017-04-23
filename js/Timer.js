/**
 * Timer 计时器类
 *
 * @param {Number} posX 位置横坐标
 * @param {Number} posY 位置纵坐标
 * @param {Number} value 初始值（秒数）
 * @constructor
 * @author Wing-ho Law
 */
var Timer = function (posX, posY, value) {
    this.value = value;
    this.posX = posX;
    this.posY = posY;
};

Timer.prototype = {
    constructor: Timer,

    /**
     * 增加秒数
     */
    upgradeValue: function () {
        this.value++;
    },

    /**
     * 减少秒数
     */
    downgradeValue: function () {
        this.value--;
    },

    /**
     * 获取秒数
     * @returns {Number} 秒数
     */
    getValue: function () {
        return this.value;
    },

    /**
     * 重置秒数为0
     */
    resetValue: function () {
        this.value = 0;
    },

    /**
     * 绘制时间
     *
     * @param {CanvasRenderingContext2D} ctx    画布上下文对象
     */
    draw: function (ctx) {
        var value = this.value.toString(10);
        ctx.font = TIPS_FONT_SIZE + "px Arial";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";

        if (value <= 0 && MODE == TIME_LIMITED)
            ctx.fillStyle = "rgb(255,193,7)";
        else
            ctx.fillStyle = "#1e5574";
        ctx.fillText(value + "s", this.posX, this.posY);
        //console.log(this.value);
    },

    /**
     * 调整时间的位置
     *
     * @param {Number} posX 位置横坐标
     * @param {Number} posY 位置纵坐标
     */
    resize: function (posX, posY) {
        this.posX = posX;
        this.posY = posY;
    }
};