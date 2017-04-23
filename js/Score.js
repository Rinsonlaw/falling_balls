/**
 * Score 分数类
 *
 * @param {Number} posX 位置横坐标
 * @param {Number} posY 位置纵坐标
 * @constructor
 * @author Wing-ho Law
 */
var Score = function (posX, posY) {
    this.value = 0;
    this.posX = posX;
    this.posY = posY;
};

Score.prototype = {
    constructor: Score,

    /**
     * 更新分数
     */
    updateValue: function () {
        this.value++;
    },

    /**
     * 获取分数
     * @returns {Number} 分数
     */
    getValue: function () {
        return this.value;
    },

    /**
     * 重置分数为0
     */
    resetValue: function () {
        this.value = 0;
    },

    /**
     * 绘制分数
     *
     * @param {CanvasRenderingContext2D} ctx    画布上下文对象
     */
    draw: function (ctx) {
        var value = this.value.toString(10);
        ctx.font = TIPS_FONT_SIZE + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 超时或到达目标分数要变色
        if (value >= SCORE_LIMITED_TARGET && MODE == SCORE_LIMITED)
            ctx.fillStyle = "rgb(255,193,7)";
        else
            ctx.fillStyle = "#1e5574";
        ctx.fillText(value, this.posX, this.posY);
        //console.log(this.value);
    },

    /**
     * 调整分数的位置
     *
     * @param {Number} posX 位置横坐标
     * @param {Number} posY 位置纵坐标
     */
    resize: function (posX, posY) {
        this.posX = posX;
        this.posY = posY;
    }
};