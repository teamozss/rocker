class Rockers {
    // 定义参数、默认值
    static options = {
        moveRangeRadius: 100, // 移动范围半径
        rockerRadius: 30, // 移动元素大小，默认半径为 50的 灰色圆形
        rockerStyle: {}, // 移动元素样式
        safedis: 0, // 移动安全距离，移动的距离在此范围内，不会触发方向回调；防止轻轻移动即刻触发。但点击会，因为点击时移动元素会到达临界
        lackDir: true, // 锁定方向（true: 只能上、下、左、右， false: 可360度旋转）
        action: () => {}, // 移动触发的函数
    };
    // 方向临界
    static directionAngle = { // 固定方向所对应的角度区间, 可以选择多个区间
        up: [ [315, 360], [0, 45] ],
        down: [ [135, 225] ],
        left: [ [225, 315] ],
        right: [ [45, 135] ],
    }
    // dom
    static RockersDom = null;
    static moveDom = null;
    static moveRangeDom = null;

    // 构造
    constructor(domId, options = {}) {
        Rockers.RockersDom = document.getElementById(domId);
        Rockers.options = Object.assign(Rockers.options, options);
        // 初始化
        Rockers.initRocker();
    }
    /**
     * 初始化 创建 dom、绑定事件
     */
    static initRocker() {
        Rockers.creatRangeDom();
        Rockers.bindMoveDomEvents();
        Rockers.bindRangeDomEvents();
    }

    /**
     * 创建dom节点
     * @param {*} temp 如： "<div class="testclass">test</div>"
     * @returns 节点node
     */
    static creatElementNode(temp) {
        temp = document.createRange().createContextualFragment(temp);
        const fragmentDom = document.createDocumentFragment();
        fragmentDom.appendChild(temp);
        return fragmentDom;
    }

    /**
     * 创建移动范围dom
     */
    static creatRangeDom() {
        const { moveRangeRadius, rockerRadius, rockerStyle } = Rockers.options;
        // 宽高
        const rangeWidth = moveRangeRadius * 2;
        const rockerWidth = rockerRadius * 2;
        // 样式
        const rangeStyle = `transform: translate(0px, 0px);display: inline-block;border-radius: 100%;width: ${rangeWidth}px; height: ${rangeWidth}px`;
        const styleList = [
            `transform: translate(${ moveRangeRadius - rockerRadius }px,${ moveRangeRadius - rockerRadius }px)`,
            `display: inline-block`,
            `background-color:rgba(0, 0, 0, 0.3)`,
            `border-radius: 100%`,
            `width: ${rockerWidth}px`,
            `height: ${rockerWidth}px`
        ];
        for (const key in rockerStyle) { styleList.push(`${ key }: ${ rockerStyle[key] }`); } // 拼接style
        
        const rangeDomId = "rockers-range-wrap";
        const rockerDomId = "rockers-move-wrap";
        const tem = `<div id="${ rangeDomId }" style="${ rangeStyle }"> <div id="${ rockerDomId }" style="${ styleList.join(';') }"></div> </div>`;
        Rockers.RockersDom.appendChild(Rockers.creatElementNode(tem));
        Rockers.moveRangeDom = document.getElementById(rangeDomId);
        Rockers.moveDom = document.getElementById(rockerDomId);
        // 计算中心坐标
        if (Rockers.moveRangeDom) {
            const { x, y } = Rockers.moveRangeDom.getBoundingClientRect()
            Rockers.options.center = [x + moveRangeRadius, y + moveRangeRadius];
        }
    }

    /**
     * 绑定事件
     */
    static bindMoveDomEvents() {
        const moveDom = Rockers.moveDom;
        const { moveRangeRadius, rockerRadius } = Rockers.options;
        let fingerTouchStartX = 0, fingerTouchStartY = 0, fingerTouchEndX = 0, fingerTouchEndY = 0;

        const touchstart = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (event.targetTouches.length > 1) { return }; // 存在多个(一个以上)手指的情况
            const touches = event.targetTouches[0];
            fingerTouchStartX = touches.clientX;
            fingerTouchStartY = touches.clientY;
            moveDom.ontouchmove = touchmove;
            moveDom.ontouchend = touchend;
            moveDom.ontouchcancel = touchend;
        }
        const touchmove = (event) => {
            const touches = event.targetTouches[0];
            fingerTouchEndX = touches.clientX;
            fingerTouchEndY = touches.clientY;
            let fingerMoveX = fingerTouchEndX - fingerTouchStartX;
            let fingerMoveY = fingerTouchEndY - fingerTouchStartY;
            Rockers.moveRockers(fingerMoveX, fingerMoveY);
        }
        const touchend = (e) => {
            moveDom.ontouchmove = null;
            moveDom.ontouchend = null;
            moveDom.ontouchcancel = null;
            moveDom.style.transform = `translate(${ moveRangeRadius - rockerRadius }px, ${ moveRangeRadius - rockerRadius }px)`;
            Rockers.callback({ direction: 'reset', angle: 0 }); // 摇杆复位
        }
        moveDom.ontouchstart = touchstart;
    }

    /**
     * 移动范围绑定touch事件
     * 点击摇杆外部区域摇杆会发生位置移动
     */
    static bindRangeDomEvents() {
        const moveRangeDom = Rockers.moveRangeDom;
        const moveDom = Rockers.moveDom;
        const { lackDir, moveRangeRadius, rockerRadius, center } = Rockers.options;

        const rangeDomTouchstart = (event) => {
            event.preventDefault();
            event.stopPropagation();
            moveRangeDom.ontouchend = rangeDomTouchend;
            moveRangeDom.ontouchcancel = rangeDomTouchend;
            if (event.targetTouches.length > 1) { return };
            const touch = event.targetTouches[0];
            const clickX = touch.clientX;
            const clickY = touch.clientY;
            const disX = clickX - center[0];
            const disY = clickY - center[1];
            if (!lackDir) {
                // 360拖动模式:
                Rockers.moveRockers(disX * 100, disY * 100); // 放大 100倍，点击时，变相将点击区域放置移动范围外
            } else {
                // 固定方向模式: 
                const matchDir = Rockers.getDirectionByRules(disX, disY);
                console.log(matchDir);
                Rockers.setPositionByAngle({up: 0, right: 90, down: 180, left: 270 }[matchDir]); // 通过角度值 手动将摇杆移动到指定位置
                Rockers.callback({ angle: {up: 0, right: 90, down: 180, left: 270 }[matchDir] });
            }
        }
        const rangeDomTouchend = (event) => {
            moveRangeDom.ontouchend = null;
            moveRangeDom.ontouchcancel = null;
            moveDom.style.transform = `translate(${ moveRangeRadius - rockerRadius }px, ${ moveRangeRadius - rockerRadius }px)`;
            Rockers.callback({ direction: 'reset', angle: 0 }); // 摇杆复位
        }

        moveRangeDom.ontouchstart = rangeDomTouchstart
    }

    /**
     * 移动摇杆
     * moveX: 手指开始按压x点 到 移动结束位置x的距离
     * moveX: 手指开始按压y点 到 移动结束位置y的距离
     */
    static moveRockers (fingerMoveX, fingerMoveY) {
        const moveDom = Rockers.moveDom;
        const { moveRangeRadius, rockerRadius, safedis, lackDir } = Rockers.options;
        
        // 手指移动的实际距离
        let fingerMoveDis = Math.sqrt(fingerMoveX * fingerMoveX + fingerMoveY * fingerMoveY);// 手指移动的实际距离
        const maxdis = moveRangeRadius - rockerRadius; // 最大移动距离（两圆半径差）
        let isover = fingerMoveDis >= maxdis; // 是否到达移动边界或者超出移动边界
        // 计算比例
        const cons = fingerMoveX / fingerMoveDis;
        const sins = fingerMoveY / fingerMoveDis;
        fingerMoveDis = isover ? maxdis : fingerMoveDis; // 超出移动边界则不能再移动；

        // 获取角度
        let angle = Rockers.getMoveAngle(fingerMoveX, fingerMoveY);

        let newMoveX = fingerMoveDis * cons; // 手指x位移转换元素x位移
        let newMoveY = fingerMoveDis * sins; // 手指y位移转换元素y位移

        // 锁定方向，则只能上下左右移动
        if (lackDir) {
            const matchDir = Rockers.getDirectionByRules(fingerMoveX, fingerMoveY);
            if (!matchDir) { return; }
            switch (matchDir) {
                case 'up':
                case 'down':
                    newMoveX = 0;
                    angle = matchDir == 'up' ? 0 : 180;
                    break;
                case 'left':
                case 'right':
                    angle = matchDir == 'right' ? 90 : 270;
                    newMoveY = 0;
                    break;
                default:
                    break;
            }
        }

        // 设置移动元素位置
        moveDom.style.transform = `translate(${ moveRangeRadius - rockerRadius + newMoveX }px, ${ moveRangeRadius - rockerRadius + newMoveY }px)`;

        // 当移动超出设置的安全距离，则会触发方向变更
        if (fingerMoveDis > safedis) {
            Rockers.callback({ angle });
        }
    }

    /**
     * 按照设定的匹配规则，获取方向值
     */
    static getDirectionByRules(disX, disY) {
        const dirKeys = Object.keys(Rockers.directionAngle);
        const touchAngle = Rockers.getMoveAngle(disX, disY); // 获取角度
        let matchDir = null; // 匹配的方向
        // 按照配置的方向规则找出具体方向值
        for (let index = 0; index < dirKeys.length; index++) {
            const dir = dirKeys[index];
            let ismatch = false;
            for (let angleIndex = 0; angleIndex < Rockers.directionAngle[dir].length; angleIndex++) {
                const angles = Rockers.directionAngle[dir][angleIndex];
                if (angles[0] <= touchAngle && touchAngle <= angles[1]) {
                    ismatch = true;
                    break;
                }
            }
            if ( ismatch ) { matchDir = dir; break; }
        }
        return matchDir;
    }

    /**
     * 通过角度设置摇杆位置
     * @param {*} angle (0-360)
     */
     static setPositionByAngle(angle) {
        if (angle === undefined || isNaN(angle)) { return; }
        if (angle < 0 || angle > 360) { console.error("Angle needs to be between 0 and 360"); return; }
        const moveDom = Rockers.moveDom;
        const { moveRangeRadius, rockerRadius, moveDomCenter } = Rockers.options;
        let moveX = 0, moveY = 0;
        const maxdis = moveRangeRadius - rockerRadius; // 最大移动距离(两半径差)
        const pre = 2 * Math.PI / 360;
        if ( angle >= 0 && angle <= 90 ) {
            moveX = maxdis * Math.sin(pre * angle);
            moveY = -(maxdis * Math.cos(pre * angle));
        }
        if (angle > 90 && angle <= 180) {
            moveX = maxdis * Math.sin(pre * (180 - angle));
            moveY = maxdis * Math.cos(pre * (180 - angle));
        }
        if (angle > 180 && angle <= 270) {
            moveX = -maxdis * Math.sin(pre * (angle - 180));
            moveY = maxdis * Math.cos(pre * (angle - 180));
        }
        if (angle > 270 && angle <= 360) {
            moveX = -maxdis * Math.sin(pre * (360 - angle));
            moveY = -maxdis * Math.cos(pre * (360 - angle));
        }
        moveDom.style.transform = `translate(${ moveRangeRadius - rockerRadius + moveX }px, ${ moveRangeRadius - rockerRadius + moveY }px)`;
    }

    /**
     * 重置摇杆位置
     */
    static resetRockerPosition () {
        const moveDom = Rockers.moveDom;
        const { moveRangeRadius, rockerRadius } = Rockers.options;
        moveDom.style.transform = `translate(${ moveRangeRadius - rockerRadius }px, ${ moveRangeRadius - rockerRadius }px)`;
    }

    /**
     * 判断方向 暂时遗弃
     * @param {*} x 
     * @param {*} y 
     * @returns direction（方向： up、down、left、right）
     */
    static judgmentDirection (x, y) {
        let direction = '';
        // 上
        if ( y < 0 && Math.abs(x) <= Math.abs(y)) { return direction = 'up'; }
        // 下 
        if ( y > 0 && y >= Math.abs(x)) { return direction = 'down'; }
        // 左
        if ( x < 0 && Math.abs(x) > Math.abs(y)) { return direction = 'left'; }
        // 右
        if (x > 0 && x > Math.abs(y)) { return direction = 'right'; }
        
    }

    /**
     * 计算移动元素相对圆形的角度
     * @param {*} x 移动元素相对圆心坐标 x
     * @param {*} y 移动元素相对圆心坐标 y
     */
    static getMoveAngle (x, y) {
        let angle = 0; // 角度
        // 特殊角度
        if ( x == 0 && y < 0 ) { return angle = 0; }
        if ( x == 0 && y > 0 ) { return angle = 180; }
        if ( y == 0 && x > 0 ) { return angle = 90; }
        if ( y == 0 && x < 0 ) { return angle = 270; }
        // 计算得出角度
        if (x > 0 && y < 0) { return Math.round(Math.atan(x / -y) * 180 / Math.PI); } // 第一象限
        if (x > 0 && y > 0) { return 180 - Math.round(Math.atan(x / y) * 180 / Math.PI); } // 第四象限
        if (x < 0 && y > 0) { return 180 + Math.round(Math.atan(-x / y) * 180 / Math.PI); } // 第三象限
        // 第二象限
        if (x < 0 && y < 0) {
            angle = 360 - Math.round(Math.atan(-x / -y) * 180 / Math.PI);
            return angle == 360 ? 0 : angle;
        }
    }

    /**
     * 移动回调函数
     */
    static callback(obj) {
        Rockers.options.action && Rockers.options.action(obj);
    }
}

class Rocker extends Rockers {
    constructor(domId, op) {
        super(domId, op);
    }

    /**
     * 给定角度，设置位置
     * @param {*} angle 
     */
    setPositionByAngle (angle) {
        Rockers.setPositionByAngle(angle);
    }

    /**
     * 重置摇杆位置
     */
    resetRockerPosition () {
        Rockers.resetRockerPosition();
    }
}
export { Rocker };