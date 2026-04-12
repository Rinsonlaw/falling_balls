# Falling Balls!
▶ [PLAY](https://rinsonlaw.github.io/falling_balls/game)

一个基于 HTML5 Canvas 的物理解谜小游戏。控制挡板接住从顶部掉落的小球，避开针形障碍物，挑战高分！

## 游戏玩法

- 玩家控制底部**挡板**左右移动
- 小球从顶部随机位置掉落
- 小球会与**针形障碍物**碰撞反弹
- 小球落入挡板得分，碰到死亡线消失

## 两种游戏模式

| 模式 | 规则 |
|------|------|
| 限时模式 | 60 秒内尽可能多得分 |
| 限分数模式 | 达到 100 分所用时间最短 |

## 操作方式

- **键盘**: `A` / `←` 向左，`D` / `→` 向右
- **触屏**: 点击屏幕左/右区域

## 技术栈

- HTML5 Canvas
- jQuery
- Chipmunk 物理引擎
- Web Audio 音效

## 项目结构

```
falling_balls/
├── game.html              # 游戏入口页面
├── css/
│   └── style.css          # 样式文件
├── js/
│   ├── GameDirector.js    # 游戏导演，协调场景切换与全局状态
│   ├── LoadingScene.js    # 加载场景，资源预加载
│   ├── StartScene.js      # 开始场景，模式选择界面
│   ├── AnimationScene.js  # 游戏主场景，物理引擎、碰撞检测、渲染
│   ├── EndScene.js        # 结束场景，显示最终成绩
│   ├── Score.js           # 分数组件，负责分数的显示与更新
│   ├── Timer.js           # 计时器组件，支持计时/计数两种模式
│   ├── MediaPreloader.js  # 资源预加载器，统一加载图片与音频
│   ├── Button.js          # 按钮组件，支持鼠标与触屏事件
│   ├── cp.js              # Chipmunk 物理引擎库封装
│   ├── jquery-2.1.3.js    # jQuery 库
│   └── stats.min.js       # FPS 帧率显示工具（调试用）
├── img/                   # 游戏图片资源（标题、按钮图标等）
├── audio/                 # 游戏音效（进球、碰撞、游戏开始等）
└── README.md
```
