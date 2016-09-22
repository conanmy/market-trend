/*
 * ZRender
 * Copyright 2012 Baidu Inc. All rights reserved.
 * 
 * desc:    ZRender是一个Canvas绘图类库，专注于可交互数据统计图表
 * author:  Kener (@Kener-林峰, linzhifeng@baidu.com)
 * 
 * shape级特性：
 * hable is short for hoverable ： 悬浮响应，默认为true
 * dable is short for dragable ： 可拖拽，默认为false
 * 
 * diagram级特性：
 * hable is short for hoverable ： 悬浮响应，默认为true
 * cable is short for calculable ：可计算，，默认为false，cable为true，则内部shape可悬浮响应可拖拽，hable和dable为true
 * 
 * Todo：撤销，删除，合并形式、导出
 */

var zrender = (function() {
    
    var self = {};
    var _idx = 0;           //zrender instance's id
    var _instances = {};    //zrender实例
    
    /**
     * zrender初始化
     * @param {HTMLElement} dom : html dom对象
     * @param {object} [params] :  
     *       shape : 自定义shape集合
     * 
     * @return {ZRender} ZRender实例
     */
    self.init = function(dom, params) { 
        var zi = new ZRender(++_idx + '', dom, params || {});
        _instances[_idx] = zi;
        return zi;
    };
    
    /**
     * zrender实例销毁
     * @param {ZRender} zi : ZRender对象，不传则销毁全部
     */
    self.dispose = function(zi){
        if (zi){
            zi.dispose();
        }else{
            for (var z in _instances){
                _instances[z].dispose();
            }
            _instances = {};
        }
    }
    
    /**
     * zrender实例删除
     * @param {string} id : ZRender对象索引，ZRender实例dispose时会调用
     */
    self.delInstance = function(id){
        _instances[id] && delete _instances[id];
    }
    
    /**
     * zrender实例存活判断
     * @param {string} id : ZRender对象索引，ZRender实例dispose时会调用
     * 
     * @return 生存true，死亡false
     */
    self.isLive = function(id){
        if (_instances[id]){
            return true;
        }
        return false;
    }
    
    return self;
})();

/**
 * debug选项：debugMode
 * 0 : 不生成debug数据
 * 1 : 控制台输出
 * 1+ : 异常抛出
 */
zrender.debugMode = 0;
zrender.log = function() {
    if(zrender.debugMode == 0) {
        return;
    } else if(zrender.debugMode == 1) {
        for(var k in arguments) {
            console.log(arguments[k]);
        }
    } else if(zrender.debugMode > 1) {
        for(var k in arguments) {
            throw new Error(arguments[k]);
        }
    }

    return zrender;
};

zrender.tools = {};             //工具,依赖类
zrender.shape = {};             //shape:元件，
zrender.component = {};         //component:组件，由shape组成
zrender.diagram = {};           //diagram:图表，由shape和component组成

/**
 * ZRender接口类，对外可用的所有接口都在这里！！
 * storage（M）、painter（V）、handler（C）为内部私有类，外部接口不可见 
 * 非get接口统一返回self支持链式调用~
 */
function ZRender(id, dom, params) {
    var self = this;

    var id = id + '';   //实例唯一标识
    var entity = [];    //存放实例下关联的各种类图     
    
    var storage = new Storage();
    var painter = new Painter(dom, storage, params.shape || zrender.shape);
    var handler = new Handler(dom, storage, painter, params.shape || zrender.shape);
    
    /**
     * 添加形状，id用于索引，更新，删除，高亮等 
     * @param {string} idx 形状对象唯一标识，可通过getNewID获得
     * @param {object} shape 形状对象，可用属性全集：
       {
        'idx'       : idx,          //唯一标识
        'shape'     :'circle',      //形状类型，undefined则被置为‘circle’，
        'zlevel'    : 1,            //z层level，决定绘画在哪层canvas中，undefined或小于1则被置为1
        'color'     :'#ccc',        //颜色，undefined则被置为#ccc
        'dable'     : false,        //dragable可拖拽，默认为false
        'hable'     : true,         //hover able，鼠标hover交互，默认为true
        'onBrush'   : function      //当前图形被刷新时回调，回传参数ctx（2D Context）, e（当前shape）, progress（进度），return true则不执行默认绘画，可用于自定义绘画
        'enter'     : 1,            //动画属性，默认为1，progress >= enter 时绘画开始
        'done'      : 100           //动画属性，默认为100，progress <= done 时绘画完毕
       }
     */
    this.addShape = function(idx, shape){
        if (!zrender.isLive(id)){
            return self;
        }
        storage.add(idx, shape);
        return self;
    }
    
    /**
     * 删除形状
     * @param {string} idx 形状对象唯一标识
     */
    this.delShape = function(idx){
        if (!zrender.isLive(id)){
            return self;
        }
        idx && storage.del(idx);
        return self;
    }
    
    /**
     * 修改形状 
     * @param {string} idx 形状对象唯一标识
     * @param {object} shape 形状对象
     */
    this.modShape = function(idx, shape){
        if (!zrender.isLive(id)){
            return self;
        }
        storage.mod(idx, shape);
        return self;
    }
    
    /**
     * 添加额外高亮层显示数据，仅对外提供添加方法，无清空修改方法 
     * @param {object} shape 形状对象
     * @param {boolean} isfirst 是否在z轴最顶层
     */
    this.addHoverShape = function(shape,isfirst){
        if (!zrender.isLive(id)){
            return self;
        }
        storage.addHover(shape,isfirst);
        return self;
    }
    
    /**
     * 添加孤岛数据，唯一标识会自动在storage.addIsland中添加到shape数据中
     * @param {object} shape 形状对象
     */
    this.addIslandShape = function(shape){
        if (!zrender.isLive(id)){
            return self;
        }
        shape.x = handler.mouseX;
        shape.y = handler.mouseY;
        storage.addIsland(shape);
        return self;
    }
    
    /**
     * 删除孤岛数据,唯一标识从shape中提取
     * @param {object} shape 形状对象
     */
    this.delIslandShape = function(shape){
        if (!zrender.isLive(id)){
            return self;
        }
        storage.delIsland(shape);
        return self;
    }
    
    /**
     * 渲染，构建各层Canvas
     * @param  {number} duration  渲染动画时长，毫秒，-1 mean immediately
     * @param  {function} callback  渲染结束后回调函数
     */
    this.render = function(duration, callback){
        if (!zrender.isLive(id)){
            return self;
        }
        painter.render(duration, callback);    
        return self;
    }
    
    /**
     * 视图更新
     * @param  {number} progress 视图绘画程度，动画由多个refresh调用传入递增progress实现，default 100% mean the steady state
     * @param  {function} callback  视图更新后回调函数
     */
    this.refresh = function(progress, callback){
        if (!zrender.isLive(id)){
            return self;
        }
        painter.refresh(progress, callback);
        return self;
    }
    
    /**
     * 默认loading显示
     * @param  {string} message loading话术
     */
    this.showLoading = function(message){
        if (!zrender.isLive(id)){
            return self;
        }
        painter.showLoading(message);
        return self;
    }
    
    /**
     * loading结束
     */
    this.loadingDone = function(){
        if (!zrender.isLive(id)){
            return self;
        }
        painter.loadingDone();
        return self;
    }
    
    /**
     * 事件绑定
     * @param {string} event 事件名称
     *     目前支持：resize，hover，mousewheel，mousemove，mousedown，mouseup，draging，dragdone
     * @param {function} eventHandler 响应函数
     */
    this.bind = function(event, eventHandler){
        if (!zrender.isLive(id)){
            return self;
        }
        handler.eventBind(event, eventHandler);
        return self;
    }
    
    /**
     * 事件解绑定
     * @param {string} event 事件名称
     * @param {function} eventHandler 响应函数
     */
    this.unbind = function(event, eventHandler){
        if (!zrender.isLive(id)){
            return self;
        }
        handler.eventUnBind(event, eventHandler);
        return self;
    }
    
    /**
     * 获取形状唯一ID
     * @param {string} [idPrefix] id前缀
     * @return {string} 不重复ID
     */
    this.getNewId = function(idPrefix){
        if (!zrender.isLive(id)){
            return self;
        }
        return storage.getNewId(idPrefix);
    }
    
    /**
     * 获取视图宽度 
     */
    this.getWidth = function(){
        if (!zrender.isLive(id)){
            return self;
        }
        return painter.getWidth();
    }
    
    /**
     * 获取视图高度
     */
    this.getHeight = function(){
        if (!zrender.isLive(id)){
            return self;
        }
        return painter.getHeight();
    }
    
    /**
     * 添加与当前ZR实例关联的类图实例索引
     * 仅在zrender.component._Base._drive和zrender.diagram._Base._drive调用
     * 用于clear & dispose时释放
     * @param {object} ent 实例
     */
    this._addEntity = function(ent){
        entity.push(ent);
        return self;
    }
    
    /**
     * 清除当前ZR实例下所有类图的数据、显示和事件绑定，clear后MVC还在，ZR可用 
     */
    this.clear = function(){
        if (!zrender.isLive(id)){
            return self;
        }
        storage.del();
        painter.clear();
        handler.eventUnBind();
        for (var i = 0, l = entity.length; i < l; i++){
            entity[i].dispose();
        }
        return self;
    }
    
    /**
     * 释放当前ZR实例和实例下所有类图的数据、显示和事件绑定，dispose后ZR不可用
     */
    this.dispose = function(){
        if (!zrender.isLive(id)){
            return self;
        }
        self.clear();
        storage.dispose(); 
        storage = null;
        painter.dispose();
        painter = null;
        handler.dispose();
        handler = null;
        zrender.delInstance(id);
        self = null;
        return null;
    }
}

/**
 * 内容仓库 (M)
 */
function Storage(){
    var self = this;
    
    var idBase = 0;
    
    /**
     * 初始化函数 
     */
    function _init() {
        self.elements = {};         //所有常规形状，id索引的map
        self.zElements = [];        //所有形状的z轴方向排列，提高遍历性能zElements[0]的形状在zElements[1]形状下方
        self.hoverElements = [];    //高亮层形状，不稳定，动态增删，数组位置靠前显示在上方
        self.islandElements = {};   //孤岛层形状，id索引的map
        return self;
    };
    
    /**
     * 形状数据的简单克隆，非递归 
     */
    function _clone(e){
        var n ={};
        for (var k in e){
            n[k] = e[k];
        }
        return n;
    }
    
    /**
     * 参数整形 
     * @param {object} [params] 形状参数{key:value}
     */
    function _reformValue(params){
        params = params || {};
        for(var k in params) {
            switch (k) {
                case 'x':
                case 'y':
                case 'sx':
                case 'sy':
                case 'ex':
                case 'ey':
                    if (params[k] != 'left'  && 
                        params[k] != 'right' &&
                        params[k] != 'top'   &&
                        params[k] != 'bottom'){
                        params[k] = +params[k];    
                    }
                    break;
                case 'r':
                case 'r1':
                case 'r2':
                case 'width':
                case 'height':
                case 'hPadding':
                case 'vPadding':
                case 'axHPadding':
                case 'axVPadding':
                case 'colorIdx' :
                    params[k] = +params[k];
                    break;
                case 'zlevel':
                    params[k] = +params[k];
                    params[k] = params[k] >= 1 ? params[k] : 1;
                    break;
                case 'dable':
                case 'hable':
                    params[k] = !!params[k];
                    break;
                case 'idx':
                case 'color':
                default:
                    params[k] = params[k];
            }
        }
        return params;
    }
    
    /**
     * 唯一标识id生成
     * @param {string} [idHead] 标识前缀
     */
    function getNewId(idHead){
        return (idHead || '') + (++idBase);
    }
    
    /**
     * 添加 
     * @param {string} idx 唯一标识
     * @param {object} [params] 参数
     */
    function add(idx, params){
        var e = {
            'idx':idx,
            'shape':'circle',       //necessary，必须
            'zlevel' : 1,           //necessary，必须
            'color':'#ccc',         //颜色
            'dable' : false,        //dragable可拖拽
            'hable' : true,         //hover able
            'enter': 1,
            'done' : 100
        };
        
        params = _reformValue(params);
        for(var k in params) {
            e[k] = params[k];
        }
        
        self.elements[idx] = e; 
        self.zElements[e.zlevel] = self.zElements[e.zlevel] || {}
        self.zElements[e.zlevel][idx] = e;
        return self
    }
    
    /**
     * 删除，idx不指定则全清空 
     * @param {string} [idx] 唯一标识
     */
    function del(idx){
        if (typeof idx != 'undefined'){
            if (self.elements[idx]){
                delete self.zElements[self.elements[idx].zlevel][idx]
                delete self.elements[idx];
            }
        }else{
            //不指定idx清空
            _init();
        }
        
        return self;
    }
    
    /**
     * 修改 
     * @param {string} [idx] 唯一标识
     * @param {object} [params] 参数
     */
    function mod(idx, params){
        if (self.elements[idx]){
            params = _reformValue(params);
            for(var k in params) {
                self.elements[idx][k] = params[k];
            }
        }
        return self;
    }
    
    /**
     * 添加高亮层数据 
     * @param {object} e 形状数据
     */
    function addHover(e){
        /*
        if (isfirst){
            var last = self.hoverElements;
            self.hoverElements = [e];
            for (var i = 0, l = last.length; i < l; i++){
                self.hoverElements.push(last[i]);
            }
        }else{
            self.hoverElements.push(e); 
        }
        */
        self.hoverElements.push(e); 
        return self;
    }
    
    /**
     * 清空高亮层数据 
     */
    function delHover(){
        self.hoverElements = [];
        return self;
    }
    
    /**
     * 拖拽产生的孤岛数据 ，跟delIsland调用顺不一定能保证，收养标识
     * @param {object} e 形状数据
     */
    function addIsland(e){
        if (!self.islandElements[e.idx]){
            //不存在则添加
            e = _clone(e);
            e.shape = 'island';
            e.r = 30;
            e.text = e.name + '(' + e.value + ')';
            e.zlevel = 'island';
            self.islandElements[e.idx] = e;
        }else{
            //孤岛数据已被收养
            self.islandElements[e.idx] == 'adopted' ? (delete self.islandElements[e.idx]) : '';
        }
        return self;
    }
    
    /**
     * 删除孤岛数据，跟addIsland调用顺序不一定能保证，收养标识
     * @param {object} e 形状数据 
     */
    function delIsland(e){
        if (self.islandElements[e.idx]){
            delete self.islandElements[e.idx];
        }else{
            //声明一个孤岛数据被收养
            self.islandElements[e.idx] = 'adopted';
        }
        return self;
    }
    
    /**
     * 形状位置漂移，常规形状或孤岛形状
     * @param {string} idx 形状唯一标识
     * 
     */
    function drift(idx, dx, dy){
        var e = self.elements[idx] || self.islandElements[idx];
        typeof e.x != 'undefined' && (e.x = e.x + dx);
        typeof e.y != 'undefined' && (e.y = e.y + dy);
        typeof e.sx != 'undefined' && (e.sx = e.sx + dx);
        typeof e.sy != 'undefined' && (e.sy = e.sy + dy);
        typeof e.ex != 'undefined' && (e.ex = e.ex + dx);
        typeof e.ey != 'undefined' && (e.ey = e.ey + dy);
        return self;
    }
        
    /**
     * 遍历迭代器
     * @param {function} fun 迭代回调函数，return true终止迭代 
     * @param {object} [option] 迭代参数，缺省是无序遍历所有孤岛形状和常规形状
     *     hover : true 迭代高亮层数据
     *     island : true 迭代孤岛数据
     *     zdirection : up | down 迭代孤岛数据同时z轴方向迭代常规形状
     */
    function iterShape(fun, option){
        if (option && option.hover){
            //高亮层数据遍历
            for (var i = self.hoverElements.length - 1; i >= 0; i--){
                if (fun(self.hoverElements[i])){
                    return;
                };
            }
            return;
        }
        
        //孤岛数据遍历
        if (!option || option.zdirection || option.island){
            for (var i in self.islandElements){
                if (fun(self.islandElements[i])){
                    return;
                };
            }
        }
        
        if (!option){
            //无序遍历
            for (var i in self.elements){
                if (fun(self.elements[i])){
                    return;
                };
            }
        } else if (option.zdirection){
            //z轴遍历，zdirction = ‘up’ or ‘down’
            var i,l,zlist;
            switch (option.zdirection){
                case 'up':
                    //升序遍历，底层优先
                    for (i = 0, l = self.zElements.length; i < l; i++){
                        zlist = self.zElements[i];
                        for (var k in zlist){
                            if(fun(zlist[k])){
                                return;
                            };
                        }
                    }
                    break;
               case 'down':
               default:
                    //降序遍历，高层优先
                    for (l = self.zElements.length - 1; l >= 0; l--){
                        zlist = self.zElements[l];
                        for (var k in zlist){
                            if(fun(zlist[k])){
                                return;
                            };
                        }
                    }
                    break;
            }
        }
    }
    
    /**
     * 释放 
     */
    function dispose(){
        self.elements = null;
        self.zElements = null;
        self.hoverElements = null;
        self.islandElements = null;
        return;
    }
    
    this.getNewId = getNewId;
    this.add = add;
    this.del = del;
    this.addHover = addHover;
    this.delHover = delHover;
    this.addIsland = addIsland;
    this.delIsland = delIsland;
    this.mod = mod;
    this.drift = drift;
    this.iterShape = iterShape;
    this.dispose = dispose;
    
    _init();
}

/**
 * 绘图类 (V)
 * @param {HTMLElement} domRoot 绘图区域
 * @param {storage} storageInstance Storage实例
 * @param {object} shapeLibrary shape库
 */
function Painter(domRoot, storageInstance, shapeLibrary){
    var self = this;
    
    var root = domRoot;
    var storage = storageInstance;
    var shape = shapeLibrary;
    
    /**
     * 初始化 
     */
    function _init(){
        self.domList = {};              //canvas dom元素
        self.ctxList = {};              //canvas 2D context对象，与domList对应
        self.width = root.offsetWidth;
        self.height = root.offsetHeight;
        //默认配置项
        self.FPS = 50;                  //50 frames per 1s
        self.MAX_Z_LEVEL = 100;         //最大zlevel控制，过多canvas性能影响
        self.curFrame = 1;
        self.maxFrame = 1;
        self.maxZlevel = 0;
        return self;
    }
    
    /**
     * 创建dom
     * @param {string} id dom id 待用
     * @param {string} type : dom type， such as canvas, div etc. 
     */
    function _createDom(id, type) {
        var newDom = document.createElement(type);
        newDom.style.position = 'absolute';
        newDom.setAttribute('width', self.width + 'px');
        newDom.setAttribute('height', self.height + 'px');
        newDom.style.width = self.width + 'px';
        newDom.style.height = self.height + 'px';
        root.appendChild(newDom);
        return newDom;
    };
    
    /**
     * 绘图，创建各种dom和context，真正绘画在refresh中
     * @param {number} duration 绘画动画时长，毫秒，非精确，-1为立即显示
     * @param {function} [callback] 绘画结束后的回调函数
     */
    function render(duration, callback){
        if (isLoading()){
            loadingDone();
        }
       
        root.innerHTML = '';
        self.domList = {};
        self.ctxList = {};
        duration = +duration || -1;
        self.maxFrame = duration > 0 ? Math.round(duration * self.FPS / 1000) : 1;
        self.curFrame = 1;
        //zrender.log(self.curFrame,self.maxFrame);
        
        self.maxZlevel = 0;
        //找出最大的zlevel
        storage.iterShape(function(e){
            self.maxZlevel = Math.max(self.maxZlevel,e.zlevel);
        });
        if (self.maxZlevel >= self.MAX_Z_LEVEL){
            zrender.log('Too much canvas, zlevel should be less than ' + self.MAX_Z_LEVEL);
            if (typeof callback == 'function') {
                callback();
            }
            return self;
        }
        
        //创建各层canvas
        //背景
        self.domList['bg'] = _createDom('bg','div');
        //实体
        for (var i = 1, max = self.maxZlevel; i <= max; i++){
            self.domList[i] = _createDom(i,'canvas');
            G_vmlCanvasManager && G_vmlCanvasManager.initElement(self.domList[i]);
            self.ctxList[i] = self.domList[i].getContext('2d');
        }
        //孤岛
        self.domList['island'] = _createDom('island','canvas');
        G_vmlCanvasManager && G_vmlCanvasManager.initElement(self.domList['island']);
        self.ctxList['island'] = self.domList['island'].getContext('2d');
        //高亮
        self.domList['hover'] = _createDom('hover','canvas');
        G_vmlCanvasManager && G_vmlCanvasManager.initElement(self.domList['hover']);
        self.ctxList['hover'] = self.domList['hover'].getContext('2d');
       
        clearInterval(self.paintingTimer);
        self.paintingTimer = setInterval(function(){
            if (self.curFrame <= self.maxFrame){
                self.refresh(Math.round(self.curFrame*100/self.maxFrame));
                self.curFrame++;
            }else{
                clearInterval(self.paintingTimer);
                if (typeof callback == 'function') {
                    callback();
                }
            }
        }, Math.round(1000/self.FPS));
        return self;
    }
    
    /**
     * 刷新，真正完成绘画的函数，render前refresh无用
     * @param {number} progress 绘图百分比，1~100，100为终态
     * @param {function} callback 刷新结束后的回调函数
     */
    function refresh(progress, callback){
        clear();
        progress = +progress || 100;
        //无需遍历即可，shape上的zlevel指定绘画图层的z轴层叠
        storage.iterShape(function(e){
            var ctx = self.ctxList[e.zlevel],
                brush = shape[e.shape].brush,
                enter = e.enter || 1,
                done = e.done || 100;
            if (enter > progress){
                return false;
            }
            if (ctx){
                if (!e.onBrush ||                                       //没有onBrush
                    (e.onBrush && !e.onBrush(ctx, e, progress))){       //有onBrush并且调用执行返回false或undefined则继续粉刷
                    if (typeof brush == 'function'){
                        try {
                            done <= progress ?  brush(ctx, e, 100) :
                                                brush(ctx, e, Math.round((progress-enter)/(done-enter) * 100));
                        }catch(error){
                            zrender.log('brush error of ' + e.shape + ' ' + e.idx);
                        }
                    } else{
                        zrender.log('can not find the brush of ' + e.idx);
                    }
                }
            } else {
                zrender.log('can not find the specific zlevel canvas!');
            }
        });
        
        if (typeof callback == 'function') {
            callback();
        }
        return self;
    }
    
    /**
     * 清除hover层外所有内容 
     */
    function clear(){
        for (var k in self.ctxList){
            if (k == 'hover'){
                continue;
            }
            self.ctxList[k].clearRect(0, 0, self.width, self.height);
        }
        return self;
    }
    
    /**
     * 刷新hover层
     * @param {object} [ehover] 动态添加的形状数据
     */
    function refreshHover(ehover){
        clearHover();
        
        var ctx = self.ctxList['hover'];
        ehover && storage.addHover(ehover);
        storage.iterShape(function(e){
            var brushHover = shape[e.shape].brushHover,
                brush = shape[e.shape].brush;
            if (ctx){
                if( typeof brushHover == 'function' || typeof brush == 'function') {
                    try {
                        brushHover ? brushHover(ctx, e) : brush(ctx, e, 100);
                    } catch(error) {
                        zrender.log('brush error of ' + e.shape + ' ' + e.idx, e);
                    }
                } else {
                    zrender.log('can not find the brush of ' + e.idx);
                }
            } else {
                zrender.log('can not find the specific zlevel canvas!');
            }
        },{hover:true})
        
        storage.delHover();
        return self;
    }
    
    /**
     * 清除hover层所有内容 
     */
    function clearHover(){
        self.ctxList && self.ctxList['hover'] && self.ctxList['hover'].clearRect(0, 0, self.width, self.height);
        return self;
    }
    
    /**
     * 显示loading，目前仅支持文字显示
     * @param {string} message loading话术 
     */
    function showLoading(message){
        //高亮
        if (!self.domList['hover']){
            //高亮
            self.domList['hover'] = _createDom('hover','canvas');
            G_vmlCanvasManager && G_vmlCanvasManager.initElement(self.domList['hover']);
            self.ctxList['hover'] = self.domList['hover'].getContext('2d');
        }
        clearInterval(self.loadingTimer);
        self.loadingTimer = setInterval(function(){
            refreshHover({
                shape : 'text',
                x : self.width/2,
                y : self.height/2,
                text : message || 'Loading...',
                align: 'center',
                baseline : 'middle',
                shadowBlur : 10,
                shadowColor : 'yellow',
                color:'rgb(' + Math.round(Math.random() * 256) + ',' + Math.round(Math.random() * 256) + ',' + Math.round(Math.random() * 256) + ')'
            })
        }, 200);
        
        self.loading = true;
        return self;
    }
    
    /**
     * loading结束 
     */
    function loadingDone(){
        clearInterval(self.loadingTimer);
        self.loading = false;
        clearHover();
        return self;
    }
    
    /**
     * loading结束判断 
     */
    function isLoading(){
        return self.loading;
    }
    
    /**
     * 获取绘图区域宽度 
     */
    function getWidth(){
        return self.width;
    }
    
    /**
     * 获取绘图区域高度 
     */
    function getHeight(){
        return self.height;
    }
    
    /**
     * 区域大小变化后重绘 
     */
    function resize(){
        var width,height,dom;
        for (var i in self.domList){
            dom = self.domList[i];
            dom.setAttribute('width', 'auto');
            dom.setAttribute('height', 'auto');
        }
        width = self.width = domRoot.offsetWidth;
        height = self.height = domRoot.offsetHeight;
        for (var i in self.domList){
            dom = self.domList[i];
            dom.setAttribute('width', width + 'px');
            dom.setAttribute('height', height + 'px');
        }
        self.refresh(100);
        return self;
    }
    
    /**
     * 变换
     * @param {number} xZoom  变换矩阵m11
     * @param {number} rotate 变换矩阵m12
     * @param {number} slant  变换矩阵m21
     * @param {number} yZoom  变换矩阵m22
     * @param {number} x      变换原点x坐标
     * @param {number} y      变换原点y坐标
     */
    function transform(xZoom, rotate, slant, yZoom, x, y){
        clear();
        for (var k in self.ctxList){
            self.ctxList[k].transform(xZoom, rotate, slant, yZoom, x, y);
        }
        refresh(100);
        return self;
    }
    
    /**
     * 释放 
     */
    function dispose(){
        clearInterval(self.paintingTimer);
        clearInterval(self.loadingTimer);
        root.innerHTML = '';
        
        root = null;
        storage = null;
        shape = null;
    
        self.domList = null;
        self.ctxList = null;
    }
    
    this.render = render;
    this.refresh = refresh;
    this.showLoading = showLoading;
    this.loadingDone = loadingDone;
    this.isLoading = isLoading;
    this.clear = clear;
    this.refreshHover = refreshHover;
    this.clearHover = clearHover;
    this.getWidth = getWidth;
    this.getHeight = getHeight;
    this.resize = resize;
    this.transform = transform;
    this.dispose = dispose;
    
    _init();
}

/**
 * 控制类 (C)
 * @param {HTMLElement} domRoot 绘图区域
 * @param {storage} storageInstance Storage实例
 * @param {painter} painterInstance Painter实例
 * @param {object} shapeLibrary shape库
 * 
 * 分发事件：resize，hover，mousewheel，mousemove，mousedown，mouseup，draging，dragdone
 */
function Handler(domRoot, storageInstance, painterInstance, shapeLibrary){
    //添加事件分发器特性
    zrender.tools.event.Dispatcher.call(this);
    
    var self = this;
    
    var root = domRoot;
    var storage = storageInstance;
    var painter  = painterInstance;
    var shape = shapeLibrary;
    
    //常用函数加速
    var getX = zrender.tools.event.getX;
    var getY = zrender.tools.event.getY;
    
    /**
     * 初始化 
     */
    function _init(){
        if (window.addEventListener) {
            window.addEventListener('resize', _resizeHandler);
        
            root.addEventListener('mousewheel', _mouseWheelHandler);
            root.addEventListener('mousemove', _mouseMoveHandler);
            root.addEventListener('mousedown', _mouseDownHandler);
            root.addEventListener('mouseup', _mouseUpHandler);
        } else {
            window.attachEvent('onresize', _resizeHandler);
        
            root.attachEvent('onmousewheel', _mouseWheelHandler);
            root.attachEvent('onmousemove', _mouseMoveHandler);
            root.attachEvent('onmousedown', _mouseDownHandler);
            root.attachEvent('onmouseup', _mouseUpHandler);
        }
        self.bind('resize',painter.resize);
        self.bind('mouseup',painter.refresh);
        
        //孤岛事件接管
        self.bind('dragging',_draggingHandlerForIsland);
        self.bind('dragdone',_dragdoneHandlerForIsland);
        self.bind('mousewheel',_calculateForIsland);
        
        self.customEvent = [];
        return self;
    }
    
    /**
     * 窗口大小改变响应函数
     * @param {event} event 事件对象 
     */
    function _resizeHandler(event){
        event = event || window.event;
        self.lastHover = null;
        self.isMouseDown = false;
        self.dispatch('resize',event);
        //zrender.tools.event.stop(event);
        return self;
    };
    
    /**
     * 鼠标滚轮响应函数
     * @param {event} event 事件对象 
     */
    function _mouseWheelHandler(event){
        event = event || window.event;
        /* 全图缩放用途不大
        var delta = zrender.tools.event.getDelta(event);
        if (delta > 0){
            painter.transform(1.02,0,0,1.02,0,0);
        }else{
            painter.transform(0.98,0,0,0.98,0,0);
        }
        */
        self.dispatch('mousewheel',event);
        //zrender.tools.event.stop(event);
        return self;
    }
    
    /**
     * 鼠标移动响应函数
     * @param {event} event 事件对象 
     */
    function _mouseMoveHandler(event){
        event = event || window.event;
        if (painter.isLoading()){
            return;
        }
        self.mouseMoveHandling = true;
        self.lastX = self.mouseX || 0;
        self.lastY = self.mouseY || 0;
        self.mouseX = getX(event);
        self.mouseY = getY(event);
        var found = false;
        //优先判断上一次hover
        if (self.lastHover && self.isMouseDown && self.lastHover.dable){
            root.style.cursor = 'move';
            storage.drift(self.lastHover.idx, self.mouseX - self.lastX, self.mouseY - self.lastY);
            self.draggingTarget = self.lastHover;  
            self.isDragging = true;
            self.dispatch('dragging',event, self.lastHover);
            found = true;
        }
        
        !found &&  storage.iterShape(function(e){
            if (!e.hable && !e.dable){
                return false;
            }
            var isCover = e.isCover || shape[e.shape].isCover;
            if (isCover && isCover(e, self.mouseX, self.mouseY)){
                self.lastHover = e;
                if (e.dable){
                    root.style.cursor = 'move';
                    if (self.isMouseDown){
                        storage.drift(e.idx, self.mouseX - self.lastX, self.mouseY - self.lastY);
                        self.draggingTarget = e;   
                        self.isDragging = true;
                        self.dispatch('dragging',event, e);
                    }
                }
                
                found = true;
                return true;
            }
        },{zdirection:'down'})
        
        if (!found){
            root.style.cursor = 'default';
            painter.clearHover();
            storage.delHover();
            self.lastHover = null;
        }else{
            self.dispatch('hover', event, self.lastHover);
            (self.lastHover.hable || self.lastHover.dable) && painter.refreshHover(self.lastHover);
        }
        
        self.dispatch('mousemove',event);
        //zrender.tools.event.stop(event);
        return self;
    }
    
    /**
     * 鼠标按下响应函数
     * @param {event} event 事件对象 
     */
    function _mouseDownHandler(event){
        event = event || window.event;
        self.isMouseDown = true;
        self.dispatch('mousedown',event);
        //zrender.tools.event.stop(event);
        return self;
    }
    
    /**
     * 鼠标抬起响应函数
     * @param {event} event 事件对象 
     */
    function _mouseUpHandler(event){
        event = event || window.event;
        self.isMouseDown = false;
        self.isDragging = false;
        root.style.cursor = 'default';
        if (self.draggingTarget){
            self.dispatch('dragdone',event, self.draggingTarget);
        }
        self.dispatch('mouseup',event);
        self.draggingTarget = null;
        //zrender.tools.event.stop(event);
        return self;
    }
    
    /**
     * 孤岛数据响应事件，拖拽中
     * @param {object} param 事件分发参数
     *   type : 事件类型
     *   content : event对象
     *   [attachment] : 附加信息 
     */
    function _draggingHandlerForIsland(param){
        var dragTarget = param.attachment,
            event = param.content,
            x = zrender.tools.event.getX(event),
            y = zrender.tools.event.getY(event);
            
        storage.iterShape(function(e){
            //拖拽中
            if (dragTarget.idx == e.idx){
                //忽略自己
                return false;
            }
            //是否位于孤岛上方
            if (zrender.tools.area.isInside('circle', {
                    x : e.x,
                    y : e.y,
                    r : e.r
                }, x, y))
            {
                storage.addHover({
                    shape : 'circle',
                    type : 'stroke',
                    x : e.x,
                    y : e.y,
                    r : e.r,
                    scolor:zrender.tools.color.getCableColor()
                });
            }
        },{island:true});
        return self;
    }
    
    /**
     * 孤岛数据响应事件，拖拽完成
     * @param {object} param 事件分发参数
     *   type : 事件类型
     *   content : event对象
     *   [attachment] : 附加信息 
     */
    function _dragdoneHandlerForIsland(param){
        var dragTarget = param.attachment,
            event = param.content,
            x = zrender.tools.event.getX(event),
            y = zrender.tools.event.getY(event);
            
        storage.iterShape(function(e){
            //拖拽结束
            if (dragTarget.idx == e.idx){
                //忽略自己
                return false;
            }
            //拖拽进入孤岛上方
            if (zrender.tools.area.isInside('circle', {
                    x : e.x,
                    y : e.y,
                    r : e.r
                }, x, y))
            {
                //孤岛数据合并，删除被拖拽孤岛，更新新孤岛
                if (dragTarget.name != e.name){
                    e.name += ('&' + dragTarget.name);
                }
                
                e.value += dragTarget.value;
                e.text = e.name + '(' + e.value + ')';
                e.color = zrender.tools.color.mix(e.color, dragTarget.color);
                storage.delIsland(dragTarget);
                return true;
            }
        },{island:true})
        return self;
    }
    
    /**
     * 孤岛数据响应事件，滚轮改变
     * @param {object} param 事件分发参数
     *   type : 事件类型
     *   content : event对象
     *   [attachment] : 附加信息 
     */
    function _calculateForIsland(param){
        var event = param.content,
            delta = zrender.tools.event.getDelta(event),
            x = zrender.tools.event.getX(event),
            y = zrender.tools.event.getY(event);
            
        storage.iterShape(function(e){
            //hover在自己上方
            if (zrender.tools.area.isInside('circle', {
                    x : e.x,
                    y : e.y,
                    r : e.r
                }, x, y)){
                var dvalue = Math.floor(e.value/100);
                dvalue = dvalue > 1 ? dvalue : 1;
                delta = delta > 0 ? 1 : (-1);
                e.value += dvalue*delta;
                e.text = e.name + '(' + e.value + ')';
                e.r += delta;
                e.r = e.r < 5 ? 5 : e.r;
                painter.refreshHover(e);
                painter.refresh(100);
                zrender.tools.event.stop(event);
                return true;
            }
        },{island:true});
        return self;
    }
    
    /**
     * 自定义事件绑定 
     * @param {string} event 事件名称，resize，hover，draging，etc~
     * @param {function} handler 响应函数
     */
    function eventBind(event, handler){
        self.customEvent.push({
            e : event,
            h : handler
        });
        self.bind(event, handler);
        return self;
    }
    
    /**
     * 自定义事件解绑 
     * @param {string} event 事件名称，resize，hover，draging，etc~
     * @param {function} handler 响应函数
     */
    function eventUnBind(event, handler){
        if(!event) {
            //清空自定义event
            self.customEvent.forEach(function(eh){
                self.unbind(eh.e, eh.h);
            });
            self.customEvent = [];
            return self;
        }

        if(handler) {
            //解绑定特定event特定handle
            self.unbind(event, handler);
            self.customEvent = self.customEvent.filter(function(eh){
                if (eh.e == event && eh.h == handler){
                    return false;
                }
                return true;
            });
        } else {
            //解绑定特定event全部handle
            self.customEvent.forEach(function(eh) {
                if (eh.e == event){
                    self.unbind(eh.e, eh.h);
                }
            });
            self.customEvent = self.customEvent.filter(function(eh){
                if (eh.e == event){
                    return false;
                }
                return true;
            });
        }
        return self;
    }
    
    /**
     * 释放 
     */
    function dispose(){
        if (window.removeEventListener){
            window.removeEventListener('resize', _resizeHandler);
            root.removeEventListener('mousewheel', _mouseWheelHandler);
            root.removeEventListener('mousemove', _mouseMoveHandler);
            root.removeEventListener('mousedown', _mouseDownHandler);
            root.removeEventListener('mouseup', _mouseUpHandler);
        }else{
            window.detachEvent('onresize', _resizeHandler);
            root.detachEvent('onmousewheel', _mouseWheelHandler);
            root.detachEvent('onmousemove', _mouseMoveHandler);
            root.detachEvent('onmousedown', _mouseDownHandler);
            root.detachEvent('onmouseup', _mouseUpHandler);
        }
        
        root = null;
        storage = null;
        painter  = null;
        shape = null;
        
        self.customEvent = null;
        self.unbind();
        return self;
    }
    
    this.eventBind = eventBind;
    this.eventUnBind = eventUnBind;
    this.dispose = dispose;
    
    _init();
}

// Adding Array helpers, if not present yet:
(function() {
  if (!Array.prototype.some) {
    Array.prototype.some = function(fun /*, thisp*/) {
      var len = this.length;
      if (typeof fun != 'function') {
        throw new TypeError();
      }

      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in this &&
            fun.call(thisp, this[i], i, this)) {
          return true;
        }
      }

      return false;
    };
  }

  if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(fun /*, thisp*/) {
      var len = this.length;
      if (typeof fun != 'function') {
        throw new TypeError();
      }

      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in this) {
          fun.call(thisp, this[i], i, this);
        }
      }
    };
  }

  if (!Array.prototype.map) {
    Array.prototype.map = function(fun /*, thisp*/) {
      var len = this.length;
      if (typeof fun != 'function') {
        throw new TypeError();
      }

      var res = new Array(len);
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in this) {
          res[i] = fun.call(thisp, this[i], i, this);
        }
      }

      return res;
    };
  }

  if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun /*, thisp*/) {
      var len = this.length;
      if (typeof fun != 'function')
        throw new TypeError();

      var res = new Array();
      var thisp = arguments[1];
      for (var i = 0; i < len; i++) {
        if (i in this) {
          var val = this[i]; // in case fun mutates this
          if (fun.call(thisp, val, i, this)) {
            res.push(val);
          }
        }
      }

      return res;
    };
  }

  if (!Object.keys) {
    Object.keys = (function() {
      var hasOwnProperty = Object.prototype.hasOwnProperty,
          hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
          dontEnums = [
            'toString',
            'toLocaleString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'constructor'
          ],
          dontEnumsLength = dontEnums.length;

      return function(obj) {
        if (typeof obj !== 'object' &&
            typeof obj !== 'function' ||
            obj === null
        ) {
          throw new TypeError('Object.keys called on non-object');
        }

        var result = [];

        for (var prop in obj) {
          if (hasOwnProperty.call(obj, prop)) result.push(prop);
        }

        if (hasDontEnumBug) {
          for (var i = 0; i < dontEnumsLength; i++) {
            if (hasOwnProperty.call(obj, dontEnums[i])) {
              result.push(dontEnums[i]);
            }
          }
        }
        return result;
      }
    })();
  }
})();
// Copyright 2006 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


// Known Issues:
//
// * Patterns only support repeat.
// * Radial gradient are not implemented. The VML version of these look very
//   different from the canvas one.
// * Clipping paths are not implemented.
// * Coordsize. The width and height attribute have higher priority than the
//   width and height style values which isn't correct.
// * Painting mode isn't implemented.
// * Canvas width/height should is using content-box by default. IE in
//   Quirks mode will draw the canvas using border-box. Either change your
//   doctype to HTML5
//   (http://www.whatwg.org/specs/web-apps/current-work/#the-doctype)
//   or use Box Sizing Behavior from WebFX
//   (http://webfx.eae.net/dhtml/boxsizing/boxsizing.html)
// * Non uniform scaling does not correctly scale strokes.
// * Optimize. There is always room for speed improvements.

// Only add this code if we do not already have a canvas implementation
if (!document.createElement('canvas').getContext) {

(function() {

  // alias some functions to make (compiled) code shorter
  var m = Math;
  var mr = m.round;
  var ms = m.sin;
  var mc = m.cos;
  var abs = m.abs;
  var sqrt = m.sqrt;

  // this is used for sub pixel precision
  var Z = 10;
  var Z2 = Z / 2;

  var IE_VERSION = +navigator.userAgent.match(/MSIE ([\d.]+)?/)[1];

  /**
   * This funtion is assigned to the <canvas> elements as element.getContext().
   * @this {HTMLElement}
   * @return {CanvasRenderingContext2D_}
   */
  function getContext() {
    return this.context_ ||
        (this.context_ = new CanvasRenderingContext2D_(this));
  }

  var slice = Array.prototype.slice;

  /**
   * Binds a function to an object. The returned function will always use the
   * passed in {@code obj} as {@code this}.
   *
   * Example:
   *
   *   g = bind(f, obj, a, b)
   *   g(c, d) // will do f.call(obj, a, b, c, d)
   *
   * @param {Function} f The function to bind the object to
   * @param {Object} obj The object that should act as this when the function
   *     is called
   * @param {*} var_args Rest arguments that will be used as the initial
   *     arguments when the function is called
   * @return {Function} A new function that has bound this
   */
  function bind(f, obj, var_args) {
    var a = slice.call(arguments, 2);
    return function() {
      return f.apply(obj, a.concat(slice.call(arguments)));
    };
  }

  function encodeHtmlAttribute(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function addNamespace(doc, prefix, urn) {
    if (!doc.namespaces[prefix]) {
      doc.namespaces.add(prefix, urn, '#default#VML');
    }
  }

  function addNamespacesAndStylesheet(doc) {
    addNamespace(doc, 'g_vml_', 'urn:schemas-microsoft-com:vml');
    addNamespace(doc, 'g_o_', 'urn:schemas-microsoft-com:office:office');

    // Setup default CSS.  Only add one style sheet per document
    if (!doc.styleSheets['ex_canvas_']) {
      var ss = doc.createStyleSheet();
      ss.owningElement.id = 'ex_canvas_';
      ss.cssText = 'canvas{display:inline-block;overflow:hidden;' +
          // default size is 300x150 in Gecko and Opera
          'text-align:left;width:300px;height:150px}';
    }
  }

  // Add namespaces and stylesheet at startup.
  addNamespacesAndStylesheet(document);

  var G_vmlCanvasManager_ = {
    init: function(opt_doc) {
      var doc = opt_doc || document;
      // Create a dummy element so that IE will allow canvas elements to be
      // recognized.
      doc.createElement('canvas');
      doc.attachEvent('onreadystatechange', bind(this.init_, this, doc));
    },

    init_: function(doc) {
      // find all canvas elements
      var els = doc.getElementsByTagName('canvas');
      for (var i = 0; i < els.length; i++) {
        this.initElement(els[i]);
      }
    },

    /**
     * Public initializes a canvas element so that it can be used as canvas
     * element from now on. This is called automatically before the page is
     * loaded but if you are creating elements using createElement you need to
     * make sure this is called on the element.
     * @param {HTMLElement} el The canvas element to initialize.
     * @return {HTMLElement} the element that was created.
     */
    initElement: function(el) {
      if (!el.getContext) {
        el.getContext = getContext;

        // Add namespaces and stylesheet to document of the element.
        addNamespacesAndStylesheet(el.ownerDocument);

        // Remove fallback content. There is no way to hide text nodes so we
        // just remove all childNodes. We could hide all elements and remove
        // text nodes but who really cares about the fallback content.
        el.innerHTML = '';

        // do not use inline function because that will leak memory
        el.attachEvent('onpropertychange', onPropertyChange);
        el.attachEvent('onresize', onResize);

        var attrs = el.attributes;
        if (attrs.width && attrs.width.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setWidth_(attrs.width.nodeValue);
          el.style.width = attrs.width.nodeValue;
        } else {
          el.width = el.clientWidth;
        }
        if (attrs.height && attrs.height.specified) {
          // TODO: use runtimeStyle and coordsize
          // el.getContext().setHeight_(attrs.height.nodeValue);
          el.style.height = attrs.height.nodeValue;
        } else {
          el.height = el.clientHeight;
        }
        //el.getContext().setCoordsize_()
      }
      return el;
    }
  };

  function onPropertyChange(e) {
    var el = e.srcElement;

    switch (e.propertyName) {
      case 'width':
        el.getContext().clearRect();
        el.style.width = el.attributes.width.nodeValue + 'px';
        // In IE8 this does not trigger onresize.
        el.firstChild.style.width =  el.clientWidth + 'px';
        break;
      case 'height':
        el.getContext().clearRect();
        el.style.height = el.attributes.height.nodeValue + 'px';
        el.firstChild.style.height = el.clientHeight + 'px';
        break;
    }
  }

  function onResize(e) {
    var el = e.srcElement;
    if (el.firstChild) {
      el.firstChild.style.width =  el.clientWidth + 'px';
      el.firstChild.style.height = el.clientHeight + 'px';
    }
  }

  G_vmlCanvasManager_.init();

  // precompute "00" to "FF"
  var decToHex = [];
  for (var i = 0; i < 16; i++) {
    for (var j = 0; j < 16; j++) {
      decToHex[i * 16 + j] = i.toString(16) + j.toString(16);
    }
  }

  function createMatrixIdentity() {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  }

  function matrixMultiply(m1, m2) {
    var result = createMatrixIdentity();

    for (var x = 0; x < 3; x++) {
      for (var y = 0; y < 3; y++) {
        var sum = 0;

        for (var z = 0; z < 3; z++) {
          sum += m1[x][z] * m2[z][y];
        }

        result[x][y] = sum;
      }
    }
    return result;
  }

  function copyState(o1, o2) {
    o2.fillStyle     = o1.fillStyle;
    o2.lineCap       = o1.lineCap;
    o2.lineJoin      = o1.lineJoin;
    o2.lineWidth     = o1.lineWidth;
    o2.miterLimit    = o1.miterLimit;
    o2.shadowBlur    = o1.shadowBlur;
    o2.shadowColor   = o1.shadowColor;
    o2.shadowOffsetX = o1.shadowOffsetX;
    o2.shadowOffsetY = o1.shadowOffsetY;
    o2.strokeStyle   = o1.strokeStyle;
    o2.globalAlpha   = o1.globalAlpha;
    o2.font          = o1.font;
    o2.textAlign     = o1.textAlign;
    o2.textBaseline  = o1.textBaseline;
    o2.arcScaleX_    = o1.arcScaleX_;
    o2.arcScaleY_    = o1.arcScaleY_;
    o2.lineScale_    = o1.lineScale_;
  }

  var colorData = {
    aliceblue: '#F0F8FF',
    antiquewhite: '#FAEBD7',
    aquamarine: '#7FFFD4',
    azure: '#F0FFFF',
    beige: '#F5F5DC',
    bisque: '#FFE4C4',
    black: '#000000',
    blanchedalmond: '#FFEBCD',
    blueviolet: '#8A2BE2',
    brown: '#A52A2A',
    burlywood: '#DEB887',
    cadetblue: '#5F9EA0',
    chartreuse: '#7FFF00',
    chocolate: '#D2691E',
    coral: '#FF7F50',
    cornflowerblue: '#6495ED',
    cornsilk: '#FFF8DC',
    crimson: '#DC143C',
    cyan: '#00FFFF',
    darkblue: '#00008B',
    darkcyan: '#008B8B',
    darkgoldenrod: '#B8860B',
    darkgray: '#A9A9A9',
    darkgreen: '#006400',
    darkgrey: '#A9A9A9',
    darkkhaki: '#BDB76B',
    darkmagenta: '#8B008B',
    darkolivegreen: '#556B2F',
    darkorange: '#FF8C00',
    darkorchid: '#9932CC',
    darkred: '#8B0000',
    darksalmon: '#E9967A',
    darkseagreen: '#8FBC8F',
    darkslateblue: '#483D8B',
    darkslategray: '#2F4F4F',
    darkslategrey: '#2F4F4F',
    darkturquoise: '#00CED1',
    darkviolet: '#9400D3',
    deeppink: '#FF1493',
    deepskyblue: '#00BFFF',
    dimgray: '#696969',
    dimgrey: '#696969',
    dodgerblue: '#1E90FF',
    firebrick: '#B22222',
    floralwhite: '#FFFAF0',
    forestgreen: '#228B22',
    gainsboro: '#DCDCDC',
    ghostwhite: '#F8F8FF',
    gold: '#FFD700',
    goldenrod: '#DAA520',
    grey: '#808080',
    greenyellow: '#ADFF2F',
    honeydew: '#F0FFF0',
    hotpink: '#FF69B4',
    indianred: '#CD5C5C',
    indigo: '#4B0082',
    ivory: '#FFFFF0',
    khaki: '#F0E68C',
    lavender: '#E6E6FA',
    lavenderblush: '#FFF0F5',
    lawngreen: '#7CFC00',
    lemonchiffon: '#FFFACD',
    lightblue: '#ADD8E6',
    lightcoral: '#F08080',
    lightcyan: '#E0FFFF',
    lightgoldenrodyellow: '#FAFAD2',
    lightgreen: '#90EE90',
    lightgrey: '#D3D3D3',
    lightpink: '#FFB6C1',
    lightsalmon: '#FFA07A',
    lightseagreen: '#20B2AA',
    lightskyblue: '#87CEFA',
    lightslategray: '#778899',
    lightslategrey: '#778899',
    lightsteelblue: '#B0C4DE',
    lightyellow: '#FFFFE0',
    limegreen: '#32CD32',
    linen: '#FAF0E6',
    magenta: '#FF00FF',
    mediumaquamarine: '#66CDAA',
    mediumblue: '#0000CD',
    mediumorchid: '#BA55D3',
    mediumpurple: '#9370DB',
    mediumseagreen: '#3CB371',
    mediumslateblue: '#7B68EE',
    mediumspringgreen: '#00FA9A',
    mediumturquoise: '#48D1CC',
    mediumvioletred: '#C71585',
    midnightblue: '#191970',
    mintcream: '#F5FFFA',
    mistyrose: '#FFE4E1',
    moccasin: '#FFE4B5',
    navajowhite: '#FFDEAD',
    oldlace: '#FDF5E6',
    olivedrab: '#6B8E23',
    orange: '#FFA500',
    orangered: '#FF4500',
    orchid: '#DA70D6',
    palegoldenrod: '#EEE8AA',
    palegreen: '#98FB98',
    paleturquoise: '#AFEEEE',
    palevioletred: '#DB7093',
    papayawhip: '#FFEFD5',
    peachpuff: '#FFDAB9',
    peru: '#CD853F',
    pink: '#FFC0CB',
    plum: '#DDA0DD',
    powderblue: '#B0E0E6',
    rosybrown: '#BC8F8F',
    royalblue: '#4169E1',
    saddlebrown: '#8B4513',
    salmon: '#FA8072',
    sandybrown: '#F4A460',
    seagreen: '#2E8B57',
    seashell: '#FFF5EE',
    sienna: '#A0522D',
    skyblue: '#87CEEB',
    slateblue: '#6A5ACD',
    slategray: '#708090',
    slategrey: '#708090',
    snow: '#FFFAFA',
    springgreen: '#00FF7F',
    steelblue: '#4682B4',
    tan: '#D2B48C',
    thistle: '#D8BFD8',
    tomato: '#FF6347',
    turquoise: '#40E0D0',
    violet: '#EE82EE',
    wheat: '#F5DEB3',
    whitesmoke: '#F5F5F5',
    yellowgreen: '#9ACD32'
  };


  function getRgbHslContent(styleString) {
    var start = styleString.indexOf('(', 3);
    var end = styleString.indexOf(')', start + 1);
    var parts = styleString.substring(start + 1, end).split(',');
    // add alpha if needed
    if (parts.length != 4 || styleString.charAt(3) != 'a') {
      parts[3] = 1;
    }
    return parts;
  }

  function percent(s) {
    return parseFloat(s) / 100;
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function hslToRgb(parts){
    var r, g, b, h, s, l;
    h = parseFloat(parts[0]) / 360 % 360;
    if (h < 0)
      h++;
    s = clamp(percent(parts[1]), 0, 1);
    l = clamp(percent(parts[2]), 0, 1);
    if (s == 0) {
      r = g = b = l; // achromatic
    } else {
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hueToRgb(p, q, h + 1 / 3);
      g = hueToRgb(p, q, h);
      b = hueToRgb(p, q, h - 1 / 3);
    }

    return '#' + decToHex[Math.floor(r * 255)] +
        decToHex[Math.floor(g * 255)] +
        decToHex[Math.floor(b * 255)];
  }

  function hueToRgb(m1, m2, h) {
    if (h < 0)
      h++;
    if (h > 1)
      h--;

    if (6 * h < 1)
      return m1 + (m2 - m1) * 6 * h;
    else if (2 * h < 1)
      return m2;
    else if (3 * h < 2)
      return m1 + (m2 - m1) * (2 / 3 - h) * 6;
    else
      return m1;
  }

  var processStyleCache = {};

  function processStyle(styleString) {
    if (styleString in processStyleCache) {
      return processStyleCache[styleString];
    }

    var str, alpha = 1;

    styleString = String(styleString);
    if (styleString.charAt(0) == '#') {
      str = styleString;
    } else if (/^rgb/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      var str = '#', n;
      for (var i = 0; i < 3; i++) {
        if (parts[i].indexOf('%') != -1) {
          n = Math.floor(percent(parts[i]) * 255);
        } else {
          n = +parts[i];
        }
        str += decToHex[clamp(n, 0, 255)];
      }
      alpha = +parts[3];
    } else if (/^hsl/.test(styleString)) {
      var parts = getRgbHslContent(styleString);
      str = hslToRgb(parts);
      alpha = parts[3];
    } else {
      str = colorData[styleString] || styleString;
    }
    return processStyleCache[styleString] = {color: str, alpha: alpha};
  }

  var DEFAULT_STYLE = {
    style: 'normal',
    variant: 'normal',
    weight: 'normal',
    size: 10,
    family: 'sans-serif'
  };

  // Internal text style cache
  var fontStyleCache = {};

  function processFontStyle(styleString) {
    if (fontStyleCache[styleString]) {
      return fontStyleCache[styleString];
    }

    var el = document.createElement('div');
    var style = el.style;
    try {
      style.font = styleString;
    } catch (ex) {
      // Ignore failures to set to invalid font.
    }

    return fontStyleCache[styleString] = {
      style: style.fontStyle || DEFAULT_STYLE.style,
      variant: style.fontVariant || DEFAULT_STYLE.variant,
      weight: style.fontWeight || DEFAULT_STYLE.weight,
      size: style.fontSize || DEFAULT_STYLE.size,
      family: style.fontFamily || DEFAULT_STYLE.family
    };
  }

  function getComputedStyle(style, element) {
    var computedStyle = {};

    for (var p in style) {
      computedStyle[p] = style[p];
    }

    // Compute the size
    var canvasFontSize = parseFloat(element.currentStyle.fontSize),
        fontSize = parseFloat(style.size);

    if (typeof style.size == 'number') {
      computedStyle.size = style.size;
    } else if (style.size.indexOf('px') != -1) {
      computedStyle.size = fontSize;
    } else if (style.size.indexOf('em') != -1) {
      computedStyle.size = canvasFontSize * fontSize;
    } else if(style.size.indexOf('%') != -1) {
      computedStyle.size = (canvasFontSize / 100) * fontSize;
    } else if (style.size.indexOf('pt') != -1) {
      computedStyle.size = fontSize / .75;
    } else {
      computedStyle.size = canvasFontSize;
    }

    // Different scaling between normal text and VML text. This was found using
    // trial and error to get the same size as non VML text.
    computedStyle.size *= 0.981;

    return computedStyle;
  }

  function buildStyle(style) {
    return style.style + ' ' + style.variant + ' ' + style.weight + ' ' +
        style.size + 'px ' + style.family;
  }

  var lineCapMap = {
    'butt': 'flat',
    'round': 'round'
  };

  function processLineCap(lineCap) {
    return lineCapMap[lineCap] || 'square';
  }

  /**
   * This class implements CanvasRenderingContext2D interface as described by
   * the WHATWG.
   * @param {HTMLElement} canvasElement The element that the 2D context should
   * be associated with
   */
  function CanvasRenderingContext2D_(canvasElement) {
    this.m_ = createMatrixIdentity();

    this.mStack_ = [];
    this.aStack_ = [];
    this.currentPath_ = [];

    // Canvas context properties
    this.strokeStyle = '#000';
    this.fillStyle = '#000';

    this.lineWidth = 1;
    this.lineJoin = 'miter';
    this.lineCap = 'butt';
    this.miterLimit = Z * 1;
    this.globalAlpha = 1;
    this.font = '10px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.canvas = canvasElement;

    var cssText = 'width:' + canvasElement.clientWidth + 'px;height:' +
        canvasElement.clientHeight + 'px;overflow:hidden;position:absolute';
    var el = canvasElement.ownerDocument.createElement('div');
    el.style.cssText = cssText;
    canvasElement.appendChild(el);

    var overlayEl = el.cloneNode(false);
    // Use a non transparent background.
    overlayEl.style.backgroundColor = 'red';
    overlayEl.style.filter = 'alpha(opacity=0)';
    canvasElement.appendChild(overlayEl);

    this.element_ = el;
    this.arcScaleX_ = 1;
    this.arcScaleY_ = 1;
    this.lineScale_ = 1;
  }

  var contextPrototype = CanvasRenderingContext2D_.prototype;
  contextPrototype.clearRect = function() {
    if (this.textMeasureEl_) {
      this.textMeasureEl_.removeNode(true);
      this.textMeasureEl_ = null;
    }
    this.element_.innerHTML = '';
  };

  contextPrototype.beginPath = function() {
    // TODO: Branch current matrix so that save/restore has no effect
    //       as per safari docs.
    this.currentPath_ = [];
  };

  contextPrototype.moveTo = function(aX, aY) {
    var p = getCoords(this, aX, aY);
    this.currentPath_.push({type: 'moveTo', x: p.x, y: p.y});
    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.lineTo = function(aX, aY) {
    var p = getCoords(this, aX, aY);
    this.currentPath_.push({type: 'lineTo', x: p.x, y: p.y});

    this.currentX_ = p.x;
    this.currentY_ = p.y;
  };

  contextPrototype.bezierCurveTo = function(aCP1x, aCP1y,
                                            aCP2x, aCP2y,
                                            aX, aY) {
    var p = getCoords(this, aX, aY);
    var cp1 = getCoords(this, aCP1x, aCP1y);
    var cp2 = getCoords(this, aCP2x, aCP2y);
    bezierCurveTo(this, cp1, cp2, p);
  };

  // Helper function that takes the already fixed cordinates.
  function bezierCurveTo(self, cp1, cp2, p) {
    self.currentPath_.push({
      type: 'bezierCurveTo',
      cp1x: cp1.x,
      cp1y: cp1.y,
      cp2x: cp2.x,
      cp2y: cp2.y,
      x: p.x,
      y: p.y
    });
    self.currentX_ = p.x;
    self.currentY_ = p.y;
  }

  contextPrototype.quadraticCurveTo = function(aCPx, aCPy, aX, aY) {
    // the following is lifted almost directly from
    // http://developer.mozilla.org/en/docs/Canvas_tutorial:Drawing_shapes

    var cp = getCoords(this, aCPx, aCPy);
    var p = getCoords(this, aX, aY);

    var cp1 = {
      x: this.currentX_ + 2.0 / 3.0 * (cp.x - this.currentX_),
      y: this.currentY_ + 2.0 / 3.0 * (cp.y - this.currentY_)
    };
    var cp2 = {
      x: cp1.x + (p.x - this.currentX_) / 3.0,
      y: cp1.y + (p.y - this.currentY_) / 3.0
    };

    bezierCurveTo(this, cp1, cp2, p);
  };

  contextPrototype.arc = function(aX, aY, aRadius,
                                  aStartAngle, aEndAngle, aClockwise) {
    aRadius *= Z;
    var arcType = aClockwise ? 'at' : 'wa';

    var xStart = aX + mc(aStartAngle) * aRadius - Z2;
    var yStart = aY + ms(aStartAngle) * aRadius - Z2;

    var xEnd = aX + mc(aEndAngle) * aRadius - Z2;
    var yEnd = aY + ms(aEndAngle) * aRadius - Z2;

    // IE won't render arches drawn counter clockwise if xStart == xEnd.
    if (xStart == xEnd && !aClockwise) {
      xStart += 0.125; // Offset xStart by 1/80 of a pixel. Use something
                       // that can be represented in binary
    }

    var p = getCoords(this, aX, aY);
    var pStart = getCoords(this, xStart, yStart);
    var pEnd = getCoords(this, xEnd, yEnd);

    this.currentPath_.push({type: arcType,
                           x: p.x,
                           y: p.y,
                           radius: aRadius,
                           xStart: pStart.x,
                           yStart: pStart.y,
                           xEnd: pEnd.x,
                           yEnd: pEnd.y});

  };

  contextPrototype.rect = function(aX, aY, aWidth, aHeight) {
    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
  };

  contextPrototype.strokeRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.stroke();

    this.currentPath_ = oldPath;
  };

  contextPrototype.fillRect = function(aX, aY, aWidth, aHeight) {
    var oldPath = this.currentPath_;
    this.beginPath();

    this.moveTo(aX, aY);
    this.lineTo(aX + aWidth, aY);
    this.lineTo(aX + aWidth, aY + aHeight);
    this.lineTo(aX, aY + aHeight);
    this.closePath();
    this.fill();

    this.currentPath_ = oldPath;
  };

  contextPrototype.createLinearGradient = function(aX0, aY0, aX1, aY1) {
    var gradient = new CanvasGradient_('gradient');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    return gradient;
  };

  contextPrototype.createRadialGradient = function(aX0, aY0, aR0,
                                                   aX1, aY1, aR1) {
    var gradient = new CanvasGradient_('gradientradial');
    gradient.x0_ = aX0;
    gradient.y0_ = aY0;
    gradient.r0_ = aR0;
    gradient.x1_ = aX1;
    gradient.y1_ = aY1;
    gradient.r1_ = aR1;
    return gradient;
  };

  contextPrototype.drawImage = function(image, var_args) {
    var dx, dy, dw, dh, sx, sy, sw, sh;

    // to find the original width we overide the width and height
    var oldRuntimeWidth = image.runtimeStyle.width;
    var oldRuntimeHeight = image.runtimeStyle.height;
    image.runtimeStyle.width = 'auto';
    image.runtimeStyle.height = 'auto';

    // get the original size
    var w = image.width;
    var h = image.height;

    // and remove overides
    image.runtimeStyle.width = oldRuntimeWidth;
    image.runtimeStyle.height = oldRuntimeHeight;

    if (arguments.length == 3) {
      dx = arguments[1];
      dy = arguments[2];
      sx = sy = 0;
      sw = dw = w;
      sh = dh = h;
    } else if (arguments.length == 5) {
      dx = arguments[1];
      dy = arguments[2];
      dw = arguments[3];
      dh = arguments[4];
      sx = sy = 0;
      sw = w;
      sh = h;
    } else if (arguments.length == 9) {
      sx = arguments[1];
      sy = arguments[2];
      sw = arguments[3];
      sh = arguments[4];
      dx = arguments[5];
      dy = arguments[6];
      dw = arguments[7];
      dh = arguments[8];
    } else {
      throw Error('Invalid number of arguments');
    }

    var d = getCoords(this, dx, dy);

    var w2 = sw / 2;
    var h2 = sh / 2;

    var vmlStr = [];

    var W = 10;
    var H = 10;

    // For some reason that I've now forgotten, using divs didn't work
    vmlStr.push(' <g_vml_:group',
                ' coordsize="', Z * W, ',', Z * H, '"',
                ' coordorigin="0,0"' ,
                ' style="width:', W, 'px;height:', H, 'px;position:absolute;');

    // If filters are necessary (rotation exists), create them
    // filters are bog-slow, so only create them if abbsolutely necessary
    // The following check doesn't account for skews (which don't exist
    // in the canvas spec (yet) anyway.

    if (this.m_[0][0] != 1 || this.m_[0][1] ||
        this.m_[1][1] != 1 || this.m_[1][0]) {
      var filter = [];

      // Note the 12/21 reversal
      filter.push('M11=', this.m_[0][0], ',',
                  'M12=', this.m_[1][0], ',',
                  'M21=', this.m_[0][1], ',',
                  'M22=', this.m_[1][1], ',',
                  'Dx=', mr(d.x / Z), ',',
                  'Dy=', mr(d.y / Z), '');

      // Bounding box calculation (need to minimize displayed area so that
      // filters don't waste time on unused pixels.
      var max = d;
      var c2 = getCoords(this, dx + dw, dy);
      var c3 = getCoords(this, dx, dy + dh);
      var c4 = getCoords(this, dx + dw, dy + dh);

      max.x = m.max(max.x, c2.x, c3.x, c4.x);
      max.y = m.max(max.y, c2.y, c3.y, c4.y);

      vmlStr.push('padding:0 ', mr(max.x / Z), 'px ', mr(max.y / Z),
                  'px 0;filter:progid:DXImageTransform.Microsoft.Matrix(',
                  filter.join(''), ", sizingmethod='clip');");

    } else {
      vmlStr.push('top:', mr(d.y / Z), 'px;left:', mr(d.x / Z), 'px;');
    }

    vmlStr.push(' ">' ,
                '<g_vml_:image src="', image.src, '"',
                ' style="width:', Z * dw, 'px;',
                ' height:', Z * dh, 'px"',
                ' cropleft="', sx / w, '"',
                ' croptop="', sy / h, '"',
                ' cropright="', (w - sx - sw) / w, '"',
                ' cropbottom="', (h - sy - sh) / h, '"',
                ' />',
                '</g_vml_:group>');

    this.element_.insertAdjacentHTML('BeforeEnd', vmlStr.join(''));
  };

  contextPrototype.stroke = function(aFill) {
    var lineStr = [];
    var lineOpen = false;

    var W = 10;
    var H = 10;

    lineStr.push('<g_vml_:shape',
                 ' filled="', !!aFill, '"',
                 ' style="position:absolute;width:', W, 'px;height:', H, 'px;"',
                 ' coordorigin="0,0"',
                 ' coordsize="', Z * W, ',', Z * H, '"',
                 ' stroked="', !aFill, '"',
                 ' path="');

    var newSeq = false;
    var min = {x: null, y: null};
    var max = {x: null, y: null};

    for (var i = 0; i < this.currentPath_.length; i++) {
      var p = this.currentPath_[i];
      var c;

      switch (p.type) {
        case 'moveTo':
          c = p;
          lineStr.push(' m ', mr(p.x), ',', mr(p.y));
          break;
        case 'lineTo':
          lineStr.push(' l ', mr(p.x), ',', mr(p.y));
          break;
        case 'close':
          lineStr.push(' x ');
          p = null;
          break;
        case 'bezierCurveTo':
          lineStr.push(' c ',
                       mr(p.cp1x), ',', mr(p.cp1y), ',',
                       mr(p.cp2x), ',', mr(p.cp2y), ',',
                       mr(p.x), ',', mr(p.y));
          break;
        case 'at':
        case 'wa':
          lineStr.push(' ', p.type, ' ',
                       mr(p.x - this.arcScaleX_ * p.radius), ',',
                       mr(p.y - this.arcScaleY_ * p.radius), ' ',
                       mr(p.x + this.arcScaleX_ * p.radius), ',',
                       mr(p.y + this.arcScaleY_ * p.radius), ' ',
                       mr(p.xStart), ',', mr(p.yStart), ' ',
                       mr(p.xEnd), ',', mr(p.yEnd));
          break;
      }


      // TODO: Following is broken for curves due to
      //       move to proper paths.

      // Figure out dimensions so we can do gradient fills
      // properly
      if (p) {
        if (min.x == null || p.x < min.x) {
          min.x = p.x;
        }
        if (max.x == null || p.x > max.x) {
          max.x = p.x;
        }
        if (min.y == null || p.y < min.y) {
          min.y = p.y;
        }
        if (max.y == null || p.y > max.y) {
          max.y = p.y;
        }
      }
    }
    lineStr.push(' ">');

    if (!aFill) {
      appendStroke(this, lineStr);
    } else {
      appendFill(this, lineStr, min, max);
    }

    lineStr.push('</g_vml_:shape>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  function appendStroke(ctx, lineStr) {
    var a = processStyle(ctx.strokeStyle);
    var color = a.color;
    var opacity = a.alpha * ctx.globalAlpha;
    var lineWidth = ctx.lineScale_ * ctx.lineWidth;

    // VML cannot correctly render a line if the width is less than 1px.
    // In that case, we dilute the color to make the line look thinner.
    if (lineWidth < 1) {
      opacity *= lineWidth;
    }

    lineStr.push(
      '<g_vml_:stroke',
      ' opacity="', opacity, '"',
      ' joinstyle="', ctx.lineJoin, '"',
      ' miterlimit="', ctx.miterLimit, '"',
      ' endcap="', processLineCap(ctx.lineCap), '"',
      ' weight="', lineWidth, 'px"',
      ' color="', color, '" />'
    );
  }

  function appendFill(ctx, lineStr, min, max) {
    var fillStyle = ctx.fillStyle;
    var arcScaleX = ctx.arcScaleX_;
    var arcScaleY = ctx.arcScaleY_;
    var width = max.x - min.x;
    var height = max.y - min.y;
    if (fillStyle instanceof CanvasGradient_) {
      // TODO: Gradients transformed with the transformation matrix.
      var angle = 0;
      var focus = {x: 0, y: 0};

      // additional offset
      var shift = 0;
      // scale factor for offset
      var expansion = 1;

      if (fillStyle.type_ == 'gradient') {
        var x0 = fillStyle.x0_ / arcScaleX;
        var y0 = fillStyle.y0_ / arcScaleY;
        var x1 = fillStyle.x1_ / arcScaleX;
        var y1 = fillStyle.y1_ / arcScaleY;
        var p0 = getCoords(ctx, x0, y0);
        var p1 = getCoords(ctx, x1, y1);
        var dx = p1.x - p0.x;
        var dy = p1.y - p0.y;
        angle = Math.atan2(dx, dy) * 180 / Math.PI;

        // The angle should be a non-negative number.
        if (angle < 0) {
          angle += 360;
        }

        // Very small angles produce an unexpected result because they are
        // converted to a scientific notation string.
        if (angle < 1e-6) {
          angle = 0;
        }
      } else {
        var p0 = getCoords(ctx, fillStyle.x0_, fillStyle.y0_);
        focus = {
          x: (p0.x - min.x) / width,
          y: (p0.y - min.y) / height
        };

        width  /= arcScaleX * Z;
        height /= arcScaleY * Z;
        var dimension = m.max(width, height);
        shift = 2 * fillStyle.r0_ / dimension;
        expansion = 2 * fillStyle.r1_ / dimension - shift;
      }

      // We need to sort the color stops in ascending order by offset,
      // otherwise IE won't interpret it correctly.
      var stops = fillStyle.colors_;
      stops.sort(function(cs1, cs2) {
        return cs1.offset - cs2.offset;
      });

      var length = stops.length;
      var color1 = stops[0].color;
      var color2 = stops[length - 1].color;
      var opacity1 = stops[0].alpha * ctx.globalAlpha;
      var opacity2 = stops[length - 1].alpha * ctx.globalAlpha;

      var colors = [];
      for (var i = 0; i < length; i++) {
        var stop = stops[i];
        colors.push(stop.offset * expansion + shift + ' ' + stop.color);
      }

      // When colors attribute is used, the meanings of opacity and o:opacity2
      // are reversed.
      lineStr.push('<g_vml_:fill type="', fillStyle.type_, '"',
                   ' method="none" focus="100%"',
                   ' color="', color1, '"',
                   ' color2="', color2, '"',
                   ' colors="', colors.join(','), '"',
                   ' opacity="', opacity2, '"',
                   ' g_o_:opacity2="', opacity1, '"',
                   ' angle="', angle, '"',
                   ' focusposition="', focus.x, ',', focus.y, '" />');
    } else if (fillStyle instanceof CanvasPattern_) {
      if (width && height) {
        var deltaLeft = -min.x;
        var deltaTop = -min.y;
        lineStr.push('<g_vml_:fill',
                     ' position="',
                     deltaLeft / width * arcScaleX * arcScaleX, ',',
                     deltaTop / height * arcScaleY * arcScaleY, '"',
                     ' type="tile"',
                     // TODO: Figure out the correct size to fit the scale.
                     //' size="', w, 'px ', h, 'px"',
                     ' src="', fillStyle.src_, '" />');
       }
    } else {
      var a = processStyle(ctx.fillStyle);
      var color = a.color;
      var opacity = a.alpha * ctx.globalAlpha;
      lineStr.push('<g_vml_:fill color="', color, '" opacity="', opacity,
                   '" />');
    }
  }

  contextPrototype.fill = function() {
    this.stroke(true);
  };

  contextPrototype.closePath = function() {
    this.currentPath_.push({type: 'close'});
  };

  function getCoords(ctx, aX, aY) {
    var m = ctx.m_;
    return {
      x: Z * (aX * m[0][0] + aY * m[1][0] + m[2][0]) - Z2,
      y: Z * (aX * m[0][1] + aY * m[1][1] + m[2][1]) - Z2
    };
  };

  contextPrototype.save = function() {
    var o = {};
    copyState(this, o);
    this.aStack_.push(o);
    this.mStack_.push(this.m_);
    this.m_ = matrixMultiply(createMatrixIdentity(), this.m_);
  };

  contextPrototype.restore = function() {
    if (this.aStack_.length) {
      copyState(this.aStack_.pop(), this);
      this.m_ = this.mStack_.pop();
    }
  };

  function matrixIsFinite(m) {
    return isFinite(m[0][0]) && isFinite(m[0][1]) &&
        isFinite(m[1][0]) && isFinite(m[1][1]) &&
        isFinite(m[2][0]) && isFinite(m[2][1]);
  }

  function setM(ctx, m, updateLineScale) {
    if (!matrixIsFinite(m)) {
      return;
    }
    ctx.m_ = m;

    if (updateLineScale) {
      // Get the line scale.
      // Determinant of this.m_ means how much the area is enlarged by the
      // transformation. So its square root can be used as a scale factor
      // for width.
      var det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
      ctx.lineScale_ = sqrt(abs(det));
    }
  }

  contextPrototype.translate = function(aX, aY) {
    var m1 = [
      [1,  0,  0],
      [0,  1,  0],
      [aX, aY, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.rotate = function(aRot) {
    var c = mc(aRot);
    var s = ms(aRot);

    var m1 = [
      [c,  s, 0],
      [-s, c, 0],
      [0,  0, 1]
    ];

    setM(this, matrixMultiply(m1, this.m_), false);
  };

  contextPrototype.scale = function(aX, aY) {
    this.arcScaleX_ *= aX;
    this.arcScaleY_ *= aY;
    var m1 = [
      [aX, 0,  0],
      [0,  aY, 0],
      [0,  0,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.transform = function(m11, m12, m21, m22, dx, dy) {
    var m1 = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, matrixMultiply(m1, this.m_), true);
  };

  contextPrototype.setTransform = function(m11, m12, m21, m22, dx, dy) {
    var m = [
      [m11, m12, 0],
      [m21, m22, 0],
      [dx,  dy,  1]
    ];

    setM(this, m, true);
  };

  /**
   * The text drawing function.
   * The maxWidth argument isn't taken in account, since no browser supports
   * it yet.
   */
  contextPrototype.drawText_ = function(text, x, y, maxWidth, stroke) {
    var m = this.m_,
        delta = 1000,
        left = 0,
        right = delta,
        offset = {x: 0, y: 0},
        lineStr = [];

    var fontStyle = getComputedStyle(processFontStyle(this.font),
                                     this.element_);

    var fontStyleString = buildStyle(fontStyle);

    var elementStyle = this.element_.currentStyle;
    var textAlign = this.textAlign.toLowerCase();
    switch (textAlign) {
      case 'left':
      case 'center':
      case 'right':
        break;
      case 'end':
        textAlign = elementStyle.direction == 'ltr' ? 'right' : 'left';
        break;
      case 'start':
        textAlign = elementStyle.direction == 'rtl' ? 'right' : 'left';
        break;
      default:
        textAlign = 'left';
    }

    // 1.75 is an arbitrary number, as there is no info about the text baseline
    switch (this.textBaseline) {
      case 'hanging':
      case 'top':
        offset.y = fontStyle.size / 1.75;
        break;
      case 'middle':
        break;
      default:
      case null:
      case 'alphabetic':
      case 'ideographic':
      case 'bottom':
        offset.y = -fontStyle.size / 2.25;
        break;
    }

    switch(textAlign) {
      case 'right':
        left = delta;
        right = 0.05;
        break;
      case 'center':
        left = right = delta / 2;
        break;
    }

    var d = getCoords(this, x + offset.x, y + offset.y);

    lineStr.push('<g_vml_:line from="', -left ,' 0" to="', right ,' 0.05" ',
                 ' coordsize="100 100" coordorigin="0 0"',
                 ' filled="', !stroke, '" stroked="', !!stroke,
                 '" style="position:absolute;width:1px;height:1px;">');

    if (stroke) {
      appendStroke(this, lineStr);
    } else {
      // TODO: Fix the min and max params.
      appendFill(this, lineStr, {x: -left, y: 0},
                 {x: right, y: fontStyle.size});
    }

    var skewM = m[0][0].toFixed(3) + ',' + m[1][0].toFixed(3) + ',' +
                m[0][1].toFixed(3) + ',' + m[1][1].toFixed(3) + ',0,0';

    var skewOffset = mr(d.x / Z) + ',' + mr(d.y / Z);

    lineStr.push('<g_vml_:skew on="t" matrix="', skewM ,'" ',
                 ' offset="', skewOffset, '" origin="', left ,' 0" />',
                 '<g_vml_:path textpathok="true" />',
                 '<g_vml_:textpath on="true" string="',
                 encodeHtmlAttribute(text),
                 '" style="v-text-align:', textAlign,
                 ';font:', encodeHtmlAttribute(fontStyleString),
                 '" /></g_vml_:line>');

    this.element_.insertAdjacentHTML('beforeEnd', lineStr.join(''));
  };

  contextPrototype.fillText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, false);
  };

  contextPrototype.strokeText = function(text, x, y, maxWidth) {
    this.drawText_(text, x, y, maxWidth, true);
  };

  contextPrototype.measureText = function(text) {
    if (!this.textMeasureEl_) {
      var s = '<span style="position:absolute;' +
          'top:-20000px;left:0;padding:0;margin:0;border:none;' +
          'white-space:pre;"></span>';
      this.element_.insertAdjacentHTML('beforeEnd', s);
      this.textMeasureEl_ = this.element_.lastChild;
    }
    var doc = this.element_.ownerDocument;
    this.textMeasureEl_.innerHTML = '';
    this.textMeasureEl_.style.font = this.font;
    // Don't use innerHTML or innerText because they allow markup/whitespace.
    this.textMeasureEl_.appendChild(doc.createTextNode(text));
    return {width: this.textMeasureEl_.offsetWidth};
  };

  /******** STUBS ********/
  contextPrototype.clip = function() {
    // TODO: Implement
  };

  contextPrototype.arcTo = function() {
    // TODO: Implement
  };

  contextPrototype.createPattern = function(image, repetition) {
    return new CanvasPattern_(image, repetition);
  };

  // Gradient / Pattern Stubs
  function CanvasGradient_(aType) {
    this.type_ = aType;
    this.x0_ = 0;
    this.y0_ = 0;
    this.r0_ = 0;
    this.x1_ = 0;
    this.y1_ = 0;
    this.r1_ = 0;
    this.colors_ = [];
  }

  CanvasGradient_.prototype.addColorStop = function(aOffset, aColor) {
    aColor = processStyle(aColor);
    this.colors_.push({offset: aOffset,
                       color: aColor.color,
                       alpha: aColor.alpha});
  };

  function CanvasPattern_(image, repetition) {
    assertImageIsValid(image);
    switch (repetition) {
      case 'repeat':
      case null:
      case '':
        this.repetition_ = 'repeat';
        break
      case 'repeat-x':
      case 'repeat-y':
      case 'no-repeat':
        this.repetition_ = repetition;
        break;
      default:
        throwException('SYNTAX_ERR');
    }

    this.src_ = image.src;
    this.width_ = image.width;
    this.height_ = image.height;
  }

  function throwException(s) {
    throw new DOMException_(s);
  }

  function assertImageIsValid(img) {
    if (!img || img.nodeType != 1 || img.tagName != 'IMG') {
      throwException('TYPE_MISMATCH_ERR');
    }
    if (img.readyState != 'complete') {
      throwException('INVALID_STATE_ERR');
    }
  }

  function DOMException_(s) {
    this.code = this[s];
    this.message = s +': DOM Exception ' + this.code;
  }
  var p = DOMException_.prototype = new Error;
  p.INDEX_SIZE_ERR = 1;
  p.DOMSTRING_SIZE_ERR = 2;
  p.HIERARCHY_REQUEST_ERR = 3;
  p.WRONG_DOCUMENT_ERR = 4;
  p.INVALID_CHARACTER_ERR = 5;
  p.NO_DATA_ALLOWED_ERR = 6;
  p.NO_MODIFICATION_ALLOWED_ERR = 7;
  p.NOT_FOUND_ERR = 8;
  p.NOT_SUPPORTED_ERR = 9;
  p.INUSE_ATTRIBUTE_ERR = 10;
  p.INVALID_STATE_ERR = 11;
  p.SYNTAX_ERR = 12;
  p.INVALID_MODIFICATION_ERR = 13;
  p.NAMESPACE_ERR = 14;
  p.INVALID_ACCESS_ERR = 15;
  p.VALIDATION_ERR = 16;
  p.TYPE_MISMATCH_ERR = 17;

  // set up externs
  G_vmlCanvasManager = G_vmlCanvasManager_;
  CanvasRenderingContext2D = CanvasRenderingContext2D_;
  CanvasGradient = CanvasGradient_;
  CanvasPattern = CanvasPattern_;
  DOMException = DOMException_;
})();

} // if

/**
 * 图形空间辅助类 
 */
zrender.tools.area = (function(){
    /**
     * 包含判断
     * @param {string} zoneType : 图形类别
     * @param {object} area ： shape，目标图形
     * @param {number} x ： 横坐标
     * @param {number} y ： 纵坐标
     */
    function isInside(zoneType, area, x, y){
        switch (zoneType){
            //线-----------------------
            case 'line':
                if (zrender.tools.area.isInside('rectangle',{
                    x : Math.min(area.sx,area.ex),
                    y : Math.min(area.sy,area.ey),
                    width : Math.abs(area.sx - area.ex),
                    height : Math.abs(area.sy - area.ey)
                },x,y)){
                    //在矩形内再说
                    return Math.abs(Math.abs((area.sx - x)*(area.sy - area.ey)/(area.sx - area.ex) - area.sy) - y) < (area.lineWidth || 1);
                }else{
                    return false;
                }
                
            //矩形----------------------
            case 'rectangle':
                if (x >= area.x && x <= (area.x + area.width) && y >= area.y && y <= (area.y + area.height)){
                    return true   ;
                }
                return false;
                
            //圆型----------------------
            case 'circle':
                if (Math.abs(x - area.x) > area.r || Math.abs(y - area.y) > area.r){
                    return false   ;
                }
                var l2 = Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2);
                return l2 < Math.pow((area.r||0),2);
                
            //扇形----------------------
            case 'sector':
                if (Math.abs(x - area.x) > area.r2 || Math.abs(y - area.y) > area.r2){
                    //大圆外
                    return false;
                }else{
                    //大圆内判断是否在小圆内
                    if (area.r1 > 0){
                        var l2 = Math.pow(x - area.x, 2) + Math.pow(y - area.y, 2);
                        if (l2 < Math.pow(area.r1,2)){
                            return false; 
                        }
                    }
                }
                //判断夹角
                var angle = Math.ceil((360 - Math.atan2(y - area.y, x - area.x) / Math.PI * 180) % 360);
                return (angle >= area.sAngle && angle <= area.eAngle);
            
            //多边形----------------------
            case 'polygon':
                /**
                 * 射线判别法
                 * 如果一个点在多边形内部，任意角度做射线肯定会与多边形要么有一个交点，要么有与多边形边界线重叠
                 * 如果一个点在多边形外部，任意角度做射线要么与多边形有一个交点，要么有两个交点，要么没有交点，要么有与多边形边界线重叠。。 
                 */
                var i,j,
                    polygon = area.pointList,
                    N = polygon.length,
                    inside = false,
                    redo = true,
                    v,
                    left = 0,
                    right = 0;
                    
                for (i = 0; i < N; ++i){
                    if (polygon[i][0] == x &&    // 是否在顶点上
                        polygon[i][1] == y )
                    {
                        redo = false;
                        inside = true;
                        break;
                    }
                }
                
                if (redo) {
                    redo = false;
                    inside = false;
                    for (i = 0,j = N - 1;i < N;j = i++) 
                    {
                        if ((polygon[i][1] < y && y < polygon[j][1]) || 
                            (polygon[j][1] < y && y < polygon[i][1]) ) 
                        {
                            if (x <= polygon[i][0] || x <= polygon[j][0]){
                                v = (y-polygon[i][1])*(polygon[j][0]-polygon[i][0])/(polygon[j][1]-polygon[i][1])+polygon[i][0];
                                if (x < v){          // 在线的左侧
                                    inside = !inside;
                                } else if (x == v){   // 在线上
                                    inside = true;
                                    break;
                                }
                            }
                        }
                        else if (y == polygon[i][1]) 
                        {
                            if (x < polygon[i][0]){    // 交点在顶点上
                                polygon[i][1] > polygon[j][1] ? --y : ++y;
                                //redo = true;
                                break;
                            }
                        }
                        else if (polygon[i][1] == polygon[j][1] && // 在水平的边界线上
                            y == polygon[i][1] &&
                            ((polygon[i][0] < x && x < polygon[j][0]) || 
                            (polygon[j][0] < x && x < polygon[i][0]) ) )
                        {
                            inside = true;
                            break;
                        }
                    }
                }
                return inside;
        }
    }
    
    /**
     * !isInside 
     */
    function isOutside(zoneType, area, x, y){
        return !isInside(zoneType, area, x, y);
    }
    return {
        isInside : isInside,
        isOutside : isOutside
    }
})();

/**
 * 颜色辅助类
 * getColor：获取标准颜色
 * getScaleColor：获取色尺颜色
 * getCableColor：获取可计算提醒颜色
 * reverse：颜色翻转  //Todo
 * mix：颜色混合 //Todo 
 */
zrender.tools.color = (function(){
    //Color palette is an array containing the default colors for the chart's series. When all colors are used, new colors are selected from the start again. Defaults to:
    //默认色板
    var palette = ['#ffa500','#b0c4de','#87cefa','#da70d6','#32cd32','#ff7f50','#ba55d3','#6495ed','#cd5c5c','#ff69b4','#1e90ff','#ff6347','#7b68ee','#00fa9a','#ffd700','#6b8e23','#ff00ff','#3cb371','#b8860b','#40e0d0','#9932cc','#9cf','#9c3','#f9c','#669','#6cc','#cf9','#cc3','#956','#ecd','#87e'];
    var _palette = palette;
    //默认蓝色色尺
    var bluePalette = ['#e0ffff','#cbf3fb','#afeeee','#87cefa','#00bfff','#1e90ff','#6495ed','#4682b4','#4169e1','#0000ff','#0000cd','#00008b'];
    var _bluePalette = bluePalette;
    
    /**
     * 定制全局色板 
     */
    function customPalette(type,customPalete){
        switch (type){
            case 'default':
                palette = customPalete;
                break;
            case 'blue':
                bluePalette = customPalete;
                break;
            default:
                palette = customPalete;
                break;
        }
    }
    
    /**
     * 复位默认色板 
     */
    function resetPalette(type){
        switch (type){
            case 'default':
                palette = _palette;
                break;
            case 'blue':
                bluePalette = _bluePalette;
                break;
            default:
                palette = _palette;
                break;
        }
    }
    /**
     * 获取标准颜色
     * @param {number} idx : 色板位置
     * @param {array} [customPalete] : 自定义色板
     * 
     * @return {color} 颜色#000000~#ffffff
     */
    function getColor(idx, customPalete){
        idx = +idx || 0;
        customPalete = customPalete || palette
        return customPalete[idx%customPalete.length]
    }
    
    /**
     * 获取色尺
     * @param {number} idx : 色尺位置
     * @param {string} [paleteType] : 色尺类型，默认bule，自定义色尺用getColor
     * 
     * @return {color} 颜色#000000~#ffffff
     */
    function getScaleColor(idx,paleteType){
        switch (paleteType){
            case 'blue':
                return bluePalette[idx%bluePalette.length];
            default:
                return bluePalette[idx%bluePalette.length];
        }
    }
    
    /**
     * calculable可计算颜色提示 
     */
    function getCableColor(){
        return '#f90';
    }
    
    /**
     * 颜色翻转 
     * Todo
     */
    function reverse(color1){
        return palette[Math.floor(Math.random()*palette.length)];
    }
    
    /**
     * 颜色混合 
     * Todo
     */
    function mix(color1, color2){
        return palette[Math.floor(Math.random()*palette.length)];
    }
    
    return {
        customPalette : customPalette,
        resetPalette : resetPalette,
        getColor : getColor,
        getScaleColor : getScaleColor,
        getCableColor : getCableColor,
        reverse : reverse,
        mix : mix
    };
})();
/**
 * 事件辅助类 
 */ 
zrender.tools.event = (function(){
    /**
    * Extract the local X position from a mouse event.
    * @private
    * @param  {event} e A mouse event.
    * @return {number} The local X value of the mouse.
    */
    function getX(e) {
        return e.offsetX != undefined && e.offsetX ||
               e.layerX != undefined && e.layerX ||
               e.clientX != undefined && e.clientX;
    };

    /**
    * Extract the local Y position from a mouse event.
    * @private
    * @param  {event} e A mouse event.
    * @return {number} The local Y value of the mouse.
    */
    function getY(e) {
        return e.offsetY != undefined && e.offsetY ||
               e.layerY != undefined && e.layerY ||
               e.clientY != undefined && e.clientY;
    };

    /**
     * Extract the wheel delta from a mouse event.
     * @private
     * @param  {event} e A mouse event.
     * @return {number} The wheel delta of the mouse.
     */
    function getDelta(e) {
        return e.wheelDelta != undefined && e.wheelDelta || e.detail != undefined && -e.detail;
    };
    
    /**
     * 停止传播 
     * @param {object} content : event对象
     */
    function stop(e){
        if(e.preventDefault) {
            e.preventDefault();
            e.stopPropagation();
        } else {
            e.returnValue = false;
        }
    }
    
    function Dispatcher() {
        var _self = this;
        var _h = {};
        
        /**
         * 单次触发，dispatch后销毁 
         * @param {array | string} events : 事件列表 or 空格分隔的事件字符串
         * @param {function} handler : 响应函数
         */
        function one(events, handler) {
            if(!handler || !events) {
                return _self;
            }
    
            var eArray = (( typeof events) == 'string') ? events.split(' ') : events;
    
            eArray.forEach(function(event) {
                if(!_h[event]) {
                    _h[event] = [];
                }
    
                _h[event].push({
                    'h' : handler,
                    'one' : true
                });
            });
    
            return _self;
        }
        
        /**
         * 事件绑定
         * @param {array | string} events : 事件列表 or 空格分隔的事件字符串
         * @param {function} handler : 响应函数
         */
        function bind(events, handler) {
            if(!handler || !events) {
                return _self;
            }
    
            var eArray = (( typeof events) == 'string') ? events.split(' ') : events;
    
            eArray.forEach(function(event) {
                if(!_h[event]) {
                    _h[event] = [];
                }
    
                _h[event].push({
                    'h' : handler,
                    'one' : false
                });
            });
    
            return _self;
        }
        
        /**
         * 事件解绑定
         * @param {array | string} events : 事件列表 or 空格分隔的事件字符串
         * @param {function} handler : 响应函数
         */
        function unbind(events, handler) {
            if(!events) {
                _h = {};
                return _self;
            }
    
            var eArray = typeof events == 'string' ? events.split(' ') : events;
    
            if(handler) {
                eArray.forEach(function(event) {
                    if(_h[event]) {
                        _h[event] = _h[event].filter(function(e) {
                            return e['h'] != handler;
                        });
                    }
    
                    if(_h[event] && _h[event].length == 0) {
                        delete _h[event];
                    }
                });
            } else {
                eArray.forEach(function(event) {
                    delete _h[event];
                });
            }
    
            return _self;
        }
        
        /**
         * 事件分发
         * @param {string} type : 事件类型
         * @param {object} content : event对象
         * @param {object} [attachment] : 附加信息
         */
        function dispatch(type, content, attachment) {
            if(_h[type]) {
                _h[type].forEach(function(e) {
                    e['h']({
                        'type' : type,
                        'content' : content,        
                        'attachment' : attachment,
                        'target' : _self
                    });
                });
    
                _h[type] = _h[type].filter(function(e) {
                    return !e['one'];
                });
            }
    
            return _self;
        }
        
        this.one = one;
        this.bind = bind;
        this.unbind = unbind;
        this.dispatch = dispatch;
    };
    return{
        getX : getX,
        getY : getY,
        getDelta : getDelta,
        stop : stop,
        Dispatcher : Dispatcher
    }
})();
/**
 * 公共辅助函数 
 */
zrender.tools.lib = {
    /**
     * 对一个object进行深度拷贝
     * 
     * @param {any} source 需要进行拷贝的对象
     * @return {any} 拷贝后的新对象
     */
    clone : function (source) {
        var result = source, i, len;
        if (!source
            || source instanceof Number
            || source instanceof String
            || source instanceof Boolean) {
            return result;
        } else if (source instanceof Array) {
            result = [];
            var resultLen = 0;
            for (i = 0, len = source.length; i < len; i++) {
                result[resultLen++] = zrender.tools.lib.clone(source[i]);
            }
        } else if (source instanceof Date) {
            result = new Date(source.getTime());
        } else if ('object' == typeof source) {
            result = {};
            for (i in source) {
                if (source.hasOwnProperty(i)) {
                    result[i] = zrender.tools.lib.clone(source[i]);
                }
            }
        }
        
        return result;
    }
}  

if (document.createElement('canvas').getContext) {
    G_vmlCanvasManager = false;
}

/**
 * 数学辅助类 
 */
zrender.tools.math = (function(){
    var cache = {
        sin:{},     //sin缓存
        cos:{}      //cos缓存
    };
    /**
     * @param radians 弧度参数 
     */
    function sin(radians){
        if(typeof cache.sin[radians] == 'undefined'){
            cache.sin[radians] = Math.sin(radians);
        }
        return cache.sin[radians];
    }
    /**
     * @param radians 弧度参数 
     */
    function cos(radians){
        if(typeof cache.cos[radians] == 'undefined'){
            cache.cos[radians] = Math.cos(radians);
        }
        return cache.cos[radians];
    }
    return {
        sin : sin,
        cos : cos
    };
})();
zrender.shape._InterFace = function(){
    var clazz = this,
        methods = [
            'brush', 
            'brushHover',
            'isCover'
        ],
        len = methods.length,
        i = 0,
        method,
        isCompleted = true;
        
    for (; i < len; i++) {
        method = methods[i];
        if (!clazz[method]) {
            zrender.log("Class " +clazz.type + " doesn't implement the required interface : " + method + " .");
            clazz[method] = function(){
                zrender.log("Class " +clazz.type + " doesn't implement the required interface : " + method + " .");
            };
            isCompleted = false;
        }
    }
    return isCompleted;
}
/**
 * 圆
 */
zrender.shape.Circle = function(){
    this.type = 'Circle';
    zrender.shape._InterFace.call(this);
}

zrender.shape.Circle.prototype =  {
    /**
     * 普通画刷
     * @param ctx       画布句柄
     * @param e         形状实体
     * @param progress  进度0~100，0不画，100全画
     */
    brush : function(ctx, e, progress){
        if (progress >= 0 && progress <= 100){
            var radius = e.r*progress/100;
            ctx.save();
            typeof e.color != 'undefined' ? (ctx.fillStyle = e.color) : '';
            typeof e.scolor != 'undefined' ? (ctx.strokeStyle = e.scolor) : '';
            typeof e.shadowBlur != 'undefined' ? (ctx.shadowBlur = e.shadowBlur) : '';
            typeof e.shadowColor != 'undefined' ? (ctx.shadowColor = e.shadowColor) : '';
            typeof e.shadowOffsetX != 'undefined' ? (ctx.shadowOffsetX = e.shadowOffsetX) : '';
            typeof e.shadowOffsetY != 'undefined' ? (ctx.shadowOffsetY = e.shadowOffsetY) : '';
            typeof e.lineWidth != 'undefined' ? (ctx.lineWidth = e.lineWidth) : '';
            ctx.beginPath();
            ctx.arc(e.x, e.y, radius, 0, Math.PI * 2, true);
            ctx.closePath();
            switch (e.type){
                case 'fill':
                    ctx.fill();
                case 'stroke':
                    ctx.stroke();
                    break;
                case 'both':
                    ctx.stroke();
                default:
                    ctx.fill();
            }
            if (e.text){
                ctx.font = 'normal 10px verdana';
                var al,bl,tx,ty,dd = 10;
                switch (e.textPosition){
                    case "in":
                        tx = e.x;
                        ty = e.y;
                        al = 'center';
                        bl = 'middle';
                        ctx.fillStyle = zrender.tools.color.reverse(e.color);
                        break;
                    case "left":
                        tx = e.x - e.r - dd;
                        ty = e.y;
                        al = 'end';
                        bl = 'middle';
                        break;
                    case "right":
                        tx = e.x + e.r + dd;
                        ty = e.y;
                        al = 'start';
                        bl = 'middle';
                        break;
                    case "down":
                        tx = e.x;
                        ty = e.y + e.r + dd;
                        al = 'center';
                        bl = 'top';
                        break;
                    case "up":
                    default:
                        tx = e.x;
                        ty = e.y - e.r - dd;
                        al = 'center';
                        bl = 'bottom';
                        break;
                }
                ctx.textAlign = al;
                ctx.textBaseline = bl;
                ctx.fillText(e.text, tx, ty);
            }
            ctx.restore();
            return true;
        }
        return false;
    },
    /**
     * 高亮画刷
     * @param ctx   画布句柄
     * @param e     形状实体 
     */
    brushHover : function(ctx, e){
        var gradient = ctx.createRadialGradient(e.x,e.y,e.r,e.x,e.y,e.r+5);
        gradient.addColorStop('0', e.color || '#fff');
        gradient.addColorStop('1','yellow');
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.strokeStyle = e.scolor || 'yellow';
        ctx.lineWidth = (e.lineWidth || 1) + 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r+5, 0, Math.PI * 2, true);
        ctx.closePath();
        switch (e.type){
            case 'fill':
                ctx.fill();
            case 'stroke':
                ctx.stroke();
                break;
            case 'both':
                ctx.stroke();
            default:
                ctx.fill();
        }
        if (e.text){
                ctx.font = 'normal 10px verdana';
                ctx.fillStyle = e.color || '#fff';
                var al,bl,tx,ty,dd = 10;
                switch (e.textPosition){
                    case "in":
                        tx = e.x;
                        ty = e.y;
                        al = 'center';
                        bl = 'middle';
                        ctx.font = 'bold 10px verdana';
                        ctx.fillStyle = zrender.tools.color.reverse(e.color);
                        break;
                    case "left":
                        tx = e.x - e.r - dd;
                        ty = e.y;
                        al = 'end';
                        bl = 'middle';
                        break;
                    case "right":
                        tx = e.x + e.r + dd;
                        ty = e.y;
                        al = 'start';
                        bl = 'middle';
                        break;
                    case "down":
                        tx = e.x;
                        ty = e.y + e.r + dd;
                        al = 'center';
                        bl = 'top';
                        break;
                    case "up":
                    default:
                        tx = e.x;
                        ty = e.y - e.r - dd;
                        al = 'center';
                        bl = 'bottom';
                        break;
                }
                ctx.textAlign = al;
                ctx.textBaseline = bl;
                ctx.fillText(e.text, tx, ty);
            }
        ctx.restore();
    },
    
    /**
     * @param e 实体
     * @param x 横坐标
     * @param y 纵坐标 
     */
    isCover : function(e, x, y){
        return zrender.tools.area.isInside('circle', e, x, y);
    }
}

zrender.shape.circle = new zrender.shape.Circle();

/**
 * 孤岛 -- 继承自圆 
 */
zrender.shape.Island = function(){
    this.type = 'Island';
    zrender.shape._InterFace.call(this);
}

zrender.shape.Island.prototype =  new zrender.shape.Circle();

zrender.shape.island = new zrender.shape.Island();
/**
 * 圆
 */
zrender.shape.Line = function(){
    this.type = 'Line';
    zrender.shape._InterFace.call(this);
}

zrender.shape.Line.prototype =  {
    brush : function(ctx, e, progress){
        if (progress >= 0 && progress <= 100){
            var ex,ey;
            if (progress == 100){
                ex = e.ex;
                ey = e.ey;
            }else{
                ex = (progress) * (e.ex - e.sx) / 100 + e.sx;
                ey = (progress) * (e.ey - e.sy) / 100 + e.sy;
            }
            ctx.save();
            ctx.strokeStyle = e.color || e.scolor;
            typeof e.shadowBlur != 'undefined' ? (ctx.shadowBlur = e.shadowBlur) : '';
            typeof e.shadowColor != 'undefined' ? (ctx.shadowColor = e.shadowColor) : '';
            typeof e.shadowOffsetX != 'undefined' ? (ctx.shadowOffsetX = e.shadowOffsetX) : '';
            typeof e.shadowOffsetY != 'undefined' ? (ctx.shadowOffsetY = e.shadowOffsetY) : '';
            ctx.lineWidth = e.lineWidth || 1;
            ctx.beginPath();
            ctx.moveTo(e.sx,e.sy)
            ctx.lineTo(ex,ey)
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
            return true;
        }
        return false;
    },
    /**
     * 高亮画刷
     * @param ctx   画布句柄
     * @param e     形状实体 
     */
    brushHover : function(ctx, e){
        //垂线方向高亮
        var width = (e.lineWidth || 1) + 2,
            a = Math.abs(e.sx - e.ex),
            b = Math.abs(e.sy - e.ey),
            c = Math.pow(Math.pow(a,2) + Math.pow(b,2), 0.5)
            dd = (e.sx - e.ex)*(e.sy - e.ey) > 0 ? +1 : -1,
            dx = b/c * width/2,
            dy = a/c * width/2;
        var gradient = ctx.createLinearGradient(e.sx + dx*dd,e.sy - dy, e.sx - dx*dd, e.sy + dy);
        gradient.addColorStop('0','yellow');
        gradient.addColorStop('0.5',e.color || e.scolor);
        gradient.addColorStop('1','yellow');
        ctx.save();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(e.sx,e.sy)
        ctx.lineTo(e.ex,e.ey)
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    },
    /**
     * @param e 实体
     * @param x 横坐标
     * @param y 纵坐标 
     */
    isCover : function(e, x, y){
        return zrender.tools.area.isInside('line', e, x, y);
    }
}

zrender.shape.line = new zrender.shape.Line();
/**
 * 多边形 
 */
zrender.shape.Polygon = function(){
    this.type = 'Polygon';
    zrender.shape._InterFace.call(this);
}

zrender.shape.Polygon.prototype = {
    /**
     * 创建多边形 
     * @param pointList 点坐标列表
     */
    createPolygon : function(ctx, pointList){
         ctx.moveTo(pointList[0][0],pointList[0][1]);
         for (var i = 1, l = pointList.length; i < l; i++){
             ctx.lineTo(pointList[i][0],pointList[i][1]);
         }
         ctx.lineTo(pointList[0][0],pointList[0][1]);
         return;
    },
    /**
     * 普通画刷
     * @param ctx       画布句柄
     * @param e         形状实体
     * @param progress  进度0~100，0不画，100全画
     */
    brush : function(ctx, e, progress){
        if (progress == 100){
            ctx.save();
            typeof e.color != 'undefined' ? (ctx.fillStyle = e.color) : '';
            typeof e.scolor != 'undefined' ? (ctx.strokeStyle = e.scolor) : '';
            typeof e.shadowBlur != 'undefined' ? (ctx.shadowBlur = e.shadowBlur) : '';
            typeof e.shadowColor != 'undefined' ? (ctx.shadowColor = e.shadowColor) : '';
            typeof e.shadowOffsetX != 'undefined' ? (ctx.shadowOffsetX = e.shadowOffsetX) : '';
            typeof e.shadowOffsetY != 'undefined' ? (ctx.shadowOffsetY = e.shadowOffsetY) : '';
            ctx.beginPath();
            zrender.shape.Polygon.prototype.createPolygon(ctx, e.pointList);
            ctx.closePath();
            switch (e.type){
                case 'fill':
                    ctx.fill();
                case 'stroke':
                    ctx.stroke();
                    break;
                case 'both':
                    ctx.stroke();
                default:
                    ctx.fill();
            }
            
            ctx.restore();
            return true;
        }
        return false;
    },
    /**
     * 高亮画刷
     * @param ctx   画布句柄
     * @param e     形状实体 
     */
    brushHover : function(ctx, e){
        ctx.save();
        typeof e.color != 'undefined' ? (ctx.fillStyle = e.color) : '';
        ctx.strokeStyle = e.scolor || 'yellow';
        typeof e.shadowBlur != 'undefined' ? (ctx.shadowBlur = e.shadowBlur) : '';
        typeof e.shadowColor != 'undefined' ? (ctx.shadowColor = e.shadowColor) : '';
        typeof e.shadowOffsetX != 'undefined' ? (ctx.shadowOffsetX = e.shadowOffsetX) : '';
        typeof e.shadowOffsetY != 'undefined' ? (ctx.shadowOffsetY = e.shadowOffsetY) : '';
        ctx.lineWidth = (e.lineWidth || 1) + 2;
        ctx.beginPath();
        zrender.shape.Polygon.prototype.createPolygon(ctx, e.pointList);
        ctx.closePath();
        switch (e.type){
            case 'fill':
                ctx.fill();
            case 'stroke':
                ctx.stroke();
                break;
            case 'both':
                ctx.stroke();
                ctx.fill();
                break;
            default:
                ctx.stroke();
        }
        
        ctx.restore();
        return true;
    },
    
    /**
     * @param e 实体
     * @param x 横坐标
     * @param y 纵坐标 
     */
    isCover : function(e, x, y){
        return zrender.tools.area.isInside('polygon', e, x, y);
    }
}
//zrender.shape.interFace.ensure(zrender.shape.Polygon);
zrender.shape.polygon = new zrender.shape.Polygon();
/**
 * 矩形：正方形&长方形
 */
zrender.shape.Rectangle = function(){
    this.type = 'Rectangle';
    zrender.shape._InterFace.call(this);
}
zrender.shape.Rectangle.prototype =  {
    brush : function(ctx, e, progress){
        if (progress >= 0 && progress <= 100){
            var x,y,w,h;
            e.direction = e.direction ? e.direction : 'up';
            switch (e.direction){
                case 'up':
                    h = Math.floor(progress * e.height / 100);
                    x = e.x;
                    y = e.y + e.height - h;
                    w = e.width;
                    break;
                case 'down':
                    x = e.x;
                    y = e.y;
                    w = e.width;
                    h = Math.floor(progress * e.height / 100); 
                    break;
                case 'left':
                    w = Math.floor(progress * e.width / 100);
                    x = e.x + e.width - w;
                    y = e.y;
                    h = e.height;
                    break;
                case 'right':
                    x = e.x;
                    y = e.y;
                    w = Math.floor(progress * e.width / 100);
                    h = e.height; 
                    break;
                default:
                    h = Math.floor(progress * e.height / 100);
                    x = e.x;
                    y = e.y + e.height - h;
                    w = e.width;
                    break;
            }
            ctx.save();
            ctx.lineWidth = (e.lineWidth || 1) + 2;
            typeof e.color != 'undefined' ? (ctx.fillStyle = e.color) : '';
            typeof e.scolor != 'undefined' ? (ctx.strokeStyle = e.scolor) : '';
            typeof e.shadowBlur != 'undefined' ? (ctx.shadowBlur = e.shadowBlur) : '';
            typeof e.shadowColor != 'undefined' ? (ctx.shadowColor = e.shadowColor) : '';
            typeof e.shadowOffsetX != 'undefined' ? (ctx.shadowOffsetX = e.shadowOffsetX) : '';
            typeof e.shadowOffsetY != 'undefined' ? (ctx.shadowOffsetY = e.shadowOffsetY) : '';
            switch (e.type){
                case 'fill':
                    ctx.fillRect(x, y, w, h);
                    break;
                case 'stroke':
                    ctx.strokeRect(x, y, w, h);
                    break;
                case 'both':
                    ctx.strokeRect(x, y, w, h);
                default:
                    ctx.fillRect(x, y, w, h);
            }
            
            if (e.text){
                ctx.font = 'normal 10px verdana';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(e.text, e.x + e.width/2, e.y + e.height/2);
            }
            ctx.restore();
            return true;
        }
        return false;
    },
    /**
     * 高亮画刷
     * @param ctx   画布句柄
     * @param e     形状实体 
     */
    brushHover : function(ctx, e){
        ctx.save();
        typeof e.color != 'undefined' ? (ctx.fillStyle = e.color) : '';
        ctx.strokeStyle = typeof e.scolor != 'undefined' ? e.scolor : 'yellow';
        typeof e.shadowBlur != 'undefined' ? (ctx.shadowBlur = e.shadowBlur) : '';
        typeof e.shadowColor != 'undefined' ? (ctx.shadowColor = e.shadowColor) : '';
        typeof e.shadowOffsetX != 'undefined' ? (ctx.shadowOffsetX = e.shadowOffsetX) : '';
        typeof e.shadowOffsetY != 'undefined' ? (ctx.shadowOffsetY = e.shadowOffsetY) : '';
        
        var ex = 2;
        ctx.lineWidth = (e.lineWidth || 1) + 2;
        switch (e.type){
            case 'fill':
                ctx.fillRect(e.x, e.y, e.width, e.height);
                break;
            case 'stroke':
                ctx.strokeRect(e.x - ex, e.y - ex, e.width + ex, e.height + ex);
                break;
            case 'both':
            default:
                ctx.strokeRect(e.x - ex, e.y - ex, e.width + ex, e.height + ex);
                ctx.fillRect(e.x, e.y, e.width, e.height);
        }
        ctx.restore();
    },
    /**
     * @param e 实体
     * @param x 横坐标
     * @param y 纵坐标 
     */
    isCover : function(e, x, y){
        return zrender.tools.area.isInside('rectangle', e, x, y);
    }
}
//zrender.shape.interFace.ensure(zrender.shape.Rectangle);
zrender.shape.rectangle = new zrender.shape.Rectangle();
/**
 * 扇形 
 */
zrender.shape.Sector = function(){
    this.type = 'Sector';
    zrender.shape._InterFace.call(this);
}

zrender.shape.Sector.prototype = {
    /**
     * 创建扇形图形 
     * @param x 圆心x
     * @param y 圆心y
     * @param r1 圆起始半径[0,r]
     * @param r2 圆结束半径(0,r]
     * @param sAngle 起始角度[0~360)
     * @param eAngle 结束角度(0~360]
     */
    createSector : function(ctx, x, y, r1, r2, sAngle, eAngle){
         var radians = Math.PI/180,
             PI2 = Math.PI * 2,
             p1 = {},p2 = {},p3 = {},p4 = {},
             math = zrender.tools.math,
             cosSAngel,sinSAngle,cosEAngle,sinEAngle;
         
         sAngle *= radians;
         eAngle *= radians;
         
         p1.x = math.cos(sAngle)*r1 + x;
         p1.y = y - math.sin(sAngle)*r1;
         p2.x = math.cos(sAngle)*r2 + x;
         p2.y = y - math.sin(sAngle)*r2;
         p3.x = math.cos(eAngle)*r2 + x;
         p3.y = y - math.sin(eAngle)*r2;
         p4.x = math.cos(eAngle)*r1 + x;
         p4.y = y - math.sin(eAngle)*r1;
         ctx.moveTo(p1.x, p1.y);
         ctx.lineTo(p2.x, p2.y);
         ctx.arc(x, y, r2, PI2 - sAngle, PI2 - eAngle, true);
         ctx.lineTo(p4.x, p4.y);
         //console.log(p1,p2,p3,p4)
         if (r1 != 0){
             ctx.arc(x, y, r1, PI2 - eAngle, PI2 - sAngle, false);
         }
         return;
    },
    /**
     * 普通画刷
     * @param ctx       画布句柄
     * @param e         形状实体
     * @param progress  进度0~100，0不画，100全画
     */
    brush : function(ctx, e, progress){
        if (progress >= 0 && progress <= 100){
            var r22 = ((e.r2-e.r1)*progress/100) + e.r1;
            ctx.save();
            ctx.fillStyle = e.color;
            typeof e.shadowBlur != 'undefined' ? (ctx.shadowBlur = e.shadowBlur) : '';
            typeof e.shadowColor != 'undefined' ? (ctx.shadowColor = e.shadowColor) : '';
            typeof e.shadowOffsetX != 'undefined' ? (ctx.shadowOffsetX = e.shadowOffsetX) : '';
            typeof e.shadowOffsetY != 'undefined' ? (ctx.shadowOffsetY = e.shadowOffsetY) : '';
            ctx.beginPath();
            zrender.shape.Sector.prototype.createSector(ctx, e.x, e.y, e.r1, r22, e.sAngle, e.eAngle);
            ctx.closePath();
            switch (e.type){
                case 'fill':
                    ctx.fill();
                case 'stroke':
                    ctx.stroke();
                    break;
                case 'both':
                    ctx.stroke();
                default:
                    ctx.fill();
            }
            ctx.restore();
            return true;
        }
        return false;
    },
    /**
     * 高亮画刷
     * @param ctx   画布句柄
     * @param e     形状实体 
     */
    brushHover : function(ctx, e){
        //画一个白色的挡住原来那个
        /*
        ctx.save();
        ctx.fillStyle = 'fff';
        ctx.beginPath();
        zrender.shape.Sector.prototype.createSector(ctx, e.x, e.y, e.r1, e.r2, e.sAngle, e.eAngle);
        ctx.closePath();
        ctx.fill();
        */
        var angleSize = e.eAngle - e.sAngle,
            mAngel = (angleSize/2 + e.sAngle) * Math.PI/180,
            deviation = 0,//20*(360-angleSize)/360,   //夹角越小需要偏离越开
            newX = e.x + zrender.tools.math.cos(mAngel)*deviation,
            newY = e.y - zrender.tools.math.sin(mAngel)*deviation;
        /*
        var gradient = ctx.createRadialGradient(newX,newY,e.r2-10,newX,newY,e.r2);
        gradient.addColorStop('0',e.color);
        gradient.addColorStop('0.9','yellow');
        */
       
        ctx.fillStyle = e.color;//gradient;
        ctx.strokeStyle = 'yellow';//
        ctx.lineWidth = (e.lineWidth || 1) + 5;
        ctx.beginPath();
        zrender.shape.Sector.prototype.createSector(ctx, newX, newY, e.r1, e.r2+10, e.sAngle, e.eAngle);
        ctx.closePath();
        switch (e.type){
            case 'fill':
                ctx.fill();
            case 'stroke':
                ctx.stroke();
                break;
            default:
            //case 'both':
                ctx.stroke();
                ctx.fill();
        }
        ctx.restore();
        return true;
    },
    
    /**
     * @param e 实体
     * @param x 横坐标
     * @param y 纵坐标 
     */
    isCover : function(e, x, y){
        return zrender.tools.area.isInside('sector', e, x, y);
    }
}
//zrender.shape.interFace.ensure(zrender.shape.Sector);
zrender.shape.sector = new zrender.shape.Sector();
/**
 * 文字
 */
zrender.shape.Text = function(){
    this.type = 'Text';
    zrender.shape._InterFace.call(this);
}
zrender.shape.Text.prototype =  {
    brush : function(ctx, e, progress){
        if (progress == 100){
            ctx.save();
            var font = [];
            font.push(e.fontStyle || 'normal');
            font.push((e.fontSize || '15') + 'px');
            font.push(e.fontFamily || 'verdana');
            ctx.font = font.join(' ');
            ctx.fillStyle = e.color;
            ctx.textAlign = e.align || 'start';
            ctx.textBaseline = e.baseline || 'top';
            typeof e.shadowBlur != 'undefined' ? (ctx.shadowBlur = e.shadowBlur) : '';
            typeof e.shadowColor != 'undefined' ? (ctx.shadowColor = e.shadowColor) : '';
            typeof e.shadowOffsetX != 'undefined' ? (ctx.shadowOffsetX = e.shadowOffsetX) : 0;
            typeof e.shadowOffsetY != 'undefined' ? (ctx.shadowOffsetY = e.shadowOffsetY) : 0;
            typeof e.transform != 'undefined' ? (ctx.transform(e.transform[0]||0,e.transform[1]||0,e.transform[2]||0,e.transform[3]||0,e.transform[4]||0,e.transform[5]||0)) : '';
            if (e.maxWidth){
                ctx.fillText(e.text, e.x, e.y, e.maxWidth);
            }else{
                ctx.fillText(e.text, e.x, e.y);
            }
            
            ctx.restore();
            return true;
        }
        return false;
    },
    /**
     * 高亮画刷
     * @param ctx   画布句柄
     * @param e     形状实体 
     */
    brushHover : function(ctx, e){
        ctx.save();
        var font = [];
        font.push(e.fontStyle || 'bold');
        font.push((e.fontSize || '20') + 'px');
        font.push(e.fontFamily || 'verdana');
        ctx.font = font.join(' ');
        ctx.fillStyle = e.color || 'red';
        ctx.textAlign = e.align || 'start';
        ctx.textBaseline = e.baseline || 'top';
        ctx.shadowBlur = typeof e.shadowBlur != 'undefined' ? e.shadowBlur : 5;
        ctx.shadowColor = typeof e.shadowColor != 'undefined' ? e.shadowColor : 'yellow';
        ctx.shadowOffsetX = typeof e.shadowOffsetX != 'undefined' ? e.shadowOffsetX : 0;
        ctx.shadowOffsetY = typeof e.shadowOffsetY != 'undefined' ? e.shadowOffsetY : 0;
        typeof e.transform != 'undefined' ? (ctx.transform(e.transform[0]||0,e.transform[1]||0,e.transform[2]||0,e.transform[3]||0,e.transform[4]||0,e.transform[5]||0)) : '';
        if (e.maxWidth){
            ctx.fillText(e.text, e.x, e.y, e.maxWidth);
        }else{
            ctx.fillText(e.text, e.x, e.y);
        }
        ctx.restore();
    },
    /**
     * @param e 实体
     * @param x 横坐标
     * @param y 纵坐标 
     */
    isCover : function(e, x, y){
        //暂不支持文字hover
        return false;
    }
}

//zrender.shape.interFace.ensure(zrender.shape.Text);
zrender.shape.text = new zrender.shape.Text();
/**
 * component和diagram的基类
 * 提供基础通用的配置、数据、事件增删合并方法
 */
zrender.component._Base = {
    /**
     * 实例驱动，用于实例的完整绑定和释放
     * @param {object} zr ZRender实例
     * @param {object} s  component or diagram实例
     */
    __drive : function(zr,s){
        zr._addEntity(s);   //zr.dispose能释放zr中所有实例
        this.__zr = zr;
    },
    
    /**
     * 图形数据增改
     * @param {array} data 原有数据
     * @param {array} dataArray [{name:xxx,value:[xxx]}]
     * dataArray[i].name
     *   已存在：则修改为value，newname修改
     *   不存在：则新增
     * 
     * @return {array} data [{name:xxx,value:[xxx]}]
     */
    __setData : function(data, dataArray){
        dataArray = dataArray || [];
        dataArray.forEach(function(dataParam){
            var found = false;
            data.forEach(function(d){
                if (d.name == dataParam.name){
                    //已存在则修改
                    found = true;
                    if (typeof dataParam.value != 'undefined'){
                        d.value = dataParam.value;
                    }
                    if (typeof dataParam.newname != 'undefined'){
                        d.name = dataParam.newname;
                    }
                }
            });
            //不存在则新增
            !found && data.push(dataParam);
        });
        return data;
    },
    
    /**
     * 图形数据增改
     * @param {array} data 原有数据
     * @param {array} [nameArray] [{name:xxx,value:[xxx]}]
     * nameArray
     *   非空：删除data中name == nameArray[i].name的值
     *   undefined or false ： 清空data为[]
     * 
     * @return {array} data [{name:xxx,value:[xxx]}]
     */
    __delData : function(data, nameArray){
        if (nameArray){
            nameArray.forEach(function(name){
                data = data.filter(function(d){
                    return d.name != name
                });
            });
        }else{
            data = [];
        }
        return data;
    },
    
    /**
     * 配置项合并 
     * @param {object} oldConf 原有配置项
     * @param {object} newConf 新增配置项
     * 
     * @return {object} oldConf {key:value}
     */
    __mergeConfig: function(oldConf,newConf){
        for (var k in newConf){
            oldConf[k] = newConf[k];
        }
        return oldConf;
    },
    
    /**
     * 配置项整形，进行默认类型转换和默认配置 
     * @param {object} configParam 原有配置
     * 
     * @return {objcet} cf 整形后配置项{key:value}
     */
    __reformConfig : function(configParam){
        configParam = configParam || {};
        
        var cf = {};
        
        for (var k in configParam){
            switch (k){
                case 'x':
                case 'y':
                case 'sx':
                case 'sy':
                case 'ex':
                case 'ey':
                    if (configParam[k] != 'left'  && 
                        configParam[k] != 'right' &&
                        configParam[k] != 'top'   &&
                        configParam[k] != 'bottom'){
                        configParam[k] = +configParam[k];    
                    }
                    break;
                case 'r':
                case 'r1':
                case 'r2':
                case 'width':
                case 'height':
                case 'hPadding':
                case 'vPadding':
                case 'axHPadding':
                case 'axVPadding':
                case 'colorIdx' :
                case 'zlevel':
                    configParam[k] = +configParam[k];
                    break;
                case 'cable':
                    configParam[k] = !!configParam[k];
            }
            cf[k] = configParam[k];
        }
        
        cf.zlevel = this.__configValue(cf.zlevel, 1);
        cf.cable = this.__configValue(cf.cable, false);
        cf.hable = this.__configValue(cf.hable, true);
        return cf;
    },
    
    /**
     * 配置方法
     * @param {object} newValue 新值
     * @param {object} defaultValue 默认值
     * 
     * @return newValue存在则返回 newValue，否则返回defaultValue
     */
    __configValue : function (newValue, defaultValue){
        return typeof newValue != 'undefined' ? newValue : defaultValue;
    },
    
    /**
     * 实例事件绑定 
     * @param {object} zr ZRender实例
     * @param {array} eList 事件列表[[eventName,enentHnadler],...]
     */
    __bind : function(zr, eList){
        if (!this.__eventBinded){
            this.__zr = zr;
            this.__eventBinded = [];
        }
        for (var i = 0, l = eList.length; i < l; i++){
            zr.bind(eList[i][0],eList[i][1]);
            this.__eventBinded.push(eList[i]);
        }
    },
    
    /**
     * 实例事件解绑定 
     * @param {object} zr ZRender实例
     * @param {array} eList 事件列表[[eventName,enentHnadler],...]
     *   eList不存在则全部清空
     */
    __unbind : function(zr, eList){
        if (!this.__eventBinded){
            this.__zr = zr;
            this.__eventBinded = [];
        }
        if (!eList){
            for (var i = 0, l = this.__eventBinded.length; i < l; i++){
                zr.unbind(this.__eventBinded[i][0],this.__eventBinded[i][1]);
            }
            this.__eventBinded = [];
        }else{
            for (var i = 0, l = eList.length; i < l; i++){
                zr.unbind(eList[i][0],eList[i][1]);
                this.__eventBinded = this.__eventBinded.filter(function(eb){
                    return (eb[0] != eList[i][0] && eb[1] != eList[i][1]);
                });
            }
        }
    }
}
/**
 * 坐标轴
 */
zrender.component.Axis = function(zrInstance, configParam){
    var self        = this,
        zr          = zrInstance,   //zrender实体
        cg          = {},           //配置参数
        shapeList   = {}; 
    
    //默认配置
    var MAX_X = 100,            
        MAX_Y = 100,
        GAP_X = 10,
        GAP_Y = 10,
        PADDING_H = 30,         //全图水平padding
        PADDING_V = 30,         //全图垂直padding
        PADDING_AX_H = 50,      //轴线水平padding
        PADDING_AX_V = 20,      //轴线垂直padding
        COLOR_AX = '#6495ed',   //主轴线颜色
        COLOR_AU = '#ccc';      //辅助线颜色
        
    function config(newConfigParam){
        //多次config进行差异合并
        self.__mergeConfig(configParam,newConfigParam);
        //通用标准化conifg
        var conf = self.__reformConfig(configParam);
        
        //组件差异config
        var zrWidth = zr.getWidth(),
            zrHeight = zr.getHeight();
        /**
         * x : x轴起点坐标
         * y : y轴起点坐标
         * width : 坐标轴宽度，默认满图
         * height : 坐标轴高度，默认满图
         * xText : [] x轴文字，xText[0]为坐标轴说明
         * yText : [] y轴文字，yText[0]为坐标轴说明
         * xMax : x轴最大值 
         * yMax : y轴最大值 
         * xGap : x轴间隔
         * yGap : y轴间隔
         * xDirection : 'right' || 'left' x轴延伸方向，默认left
         * yDirection : 'top' || 'down' y轴延伸方向，默认top
         */
        COLOR_AU = self.__configValue(conf.COLOR_AU, COLOR_AU);
        COLOR_AX = self.__configValue(conf.COLOR_AX, COLOR_AX);
        
        conf.xMax = self.__configValue(conf.xMax, MAX_X);
        conf.yMax = self.__configValue(conf.yMax, MAX_Y);
        
        conf.xGap = self.__configValue(conf.xGap, GAP_X);
        conf.yGap = self.__configValue(conf.yGap, GAP_Y);
        
        conf.hPadding = self.__configValue(conf.hPadding, PADDING_H);
        conf.vPadding = self.__configValue(conf.vPadding, PADDING_V);
        
        conf.xDirection = self.__configValue(conf.xDirection, 'right');
        conf.yDirection = self.__configValue(conf.yDirection, 'top');
        
        conf.color = self.__configValue(conf.color, COLOR_AX);
        conf.auColor = self.__configValue(conf.auColor, COLOR_AU);
        
        if (conf.xDirection == 'right'){
            conf.x = self.__configValue(conf.x, (conf.hPadding + PADDING_AX_H));
            conf.axHPadding = conf.x - conf.hPadding;
        }else{
            conf.x = self.__configValue(conf.x, (zrWidth - conf.hPadding - PADDING_AX_H));
            conf.axHPadding = zrWidth - conf.hPadding - conf.x;
        }
        
        if (conf.yDirection == 'top'){
            conf.y = self.__configValue(conf.y, (zrHeight - conf.vPadding - PADDING_AX_V));
            conf.axVPadding = zrHeight - conf.vPadding - conf.y;
        }else{
            conf.y = self.__configValue(conf.y, (conf.vPadding + PADDING_AX_V));
            conf.axVPadding = conf.y - conf.vPadding;
        }
         
        
        conf.width = self.__configValue(conf.width, (zrWidth - conf.hPadding * 2));
        conf.height = self.__configValue(conf.height,  (zrHeight - conf.vPadding * 2));
        
        cg = {};//清空原配置
        for (var k in conf){
            cg[k] = conf[k];
        }
        
        _buildShape();
    }
    
    //根据值换算位置
    function getX(xValue){
        xValue = xValue || 0;
        var d = xValue != 0 ? Math.ceil(xValue / cg.xMax * (cg.width - cg.axHPadding)) : 0;
        if (cg.xDirection == 'right'){
            return cg.x + d;
        }else{
            return cg.x - d;            
        }
        
    }
    function getY(yValue){
        yValue = yValue || 0;
        var d = yValue != 0 ? Math.ceil(yValue / cg.yMax * (cg.height - cg.axVPadding)) : 0;
        if (cg.yDirection == 'top'){
            return cg.y - d;   
        }else{
            return cg.y + d;
        }
        
    }
    function getPosition(xValue, yValue){
        return {
            x : getX(xValue),
            y : getY(yValue)
        };
    }
    function getArea(type){
        var x,y,w,h;
        if (typeof type == 'undefined' || type == 'inside'){
            //坐标系内部
            if (cg.xDirection == 'right'){
                x = getX(0);
                w = getX(cg.xMax) - x;
            }else{
                x = getX(cg.xMax);
                w = getX(0) - x;
            }
            
            if (cg.yDirection == 'top'){
                y = getY(cg.yMax);
                h = getY(0) - y;
            }else{
                y = getY(0);
                h = getY(cg.yMax) - y;
            }
        }else{
            //整个坐标系区域
            if (cg.xDirection == 'right'){
                x = getX(0) - cg.axHPadding;
            }else{
                x = getX(cg.xMax);
            }
            w = cg.width;
            
            if (cg.yDirection == 'top'){
                y = getY(cg.yMax);
            }else{
                y = getY(0) - cg.axVPadding;
            }
            h = cg.height;
        }
        
        return {
            x : x,
            y : y,
            width : w,
            height : h
        };
    }
    
    function _buildShape(){
        clear();
        _buildXShape();
        _buildYShape();
        for (var i in shapeList){
            zr.addShape(shapeList[i].idx,shapeList[i]);
        }
    }
    function _buildXShape(){
        var sx,sy,ex,ey;        //X轴起始坐标
        var tx,tAlign;          //y轴线文字x坐标和对齐方式
        if (cg.xDirection == 'right'){
            sx = cg.x - cg.axHPadding;
            ex = sx + cg.width;
            tx = cg.x - 5;
            tAlign = 'end';
        }else{
            sx = cg.x + cg.axHPadding;
            ex = sx - cg.width;
            tx = cg.x + 5;
            tAlign = 'start';
        }
        sy = getY(0);
        ey = sy;
        shapeList.x = {
            'idx' : zr.getNewId('axis'),
            'sx' : sx,
            'sy' : sy,
            'ex' : ex,
            'ey' : ey,
            'dable':false,
            'shape' : 'line',
            'zlevel' : cg.zlevel,
            'color' : cg.color,
            'lineWidth' : 2
        }
        
        //横向辅助线&Y轴线文字
        var d = cg.yGap,
            dy, auIdx, yText,
            autoAxisText;
        yText = cg.yText || ['Y'];
        autoAxisText = yText.length <= 1;
        
        yText = zrender.tools.lib.clone(yText);
        while (d <= cg.yMax){
            auIdx = zr.getNewId('axis');
            dy = getY(d);
            shapeList[auIdx] = {
                'idx' : auIdx,
                'sx' : cg.x,
                'sy' : dy,
                'ex' : ex,
                'ey' : dy,
                'shape' : 'line',
                'zlevel' : cg.zlevel,
                'hable' : false,
                'dable':false,
                'color' : cg.auColor,
                'lineWidth' : 0.5
            }
            if (autoAxisText){
                yText.push(d);
            }
            d += cg.yGap;
        }
        //y轴名称
        shapeList.yText = {
            'idx' : zr.getNewId('axisText'),
            'shape' : 'text',
            'dable':false,
            'x' : cg.xDirection == 'right' ? (tx + 10) : (tx - 10),
            'y' : getY(cg.yMax),
            'text': yText[0],
            'align': cg.xDirection == 'right' ? 'start' : 'end',
            'baseline': cg.yDirection == 'top' ? 'top' : 'bottom',
            'enter': 100,
            'zlevel' : cg.zlevel,
            'color' : cg.color
        };
        //y轴轴点
        d = cg.yGap;
        var textGap = yText.length > 10 ? Math.ceil(yText.length/10) : 1;
        for (var i = 1, l = yText.length; i < l; i += textGap){
            auIdx = zr.getNewId('axisText');
            dy = getY(d);
            shapeList[auIdx] = {
                'idx' : auIdx,
                'shape' : 'text',
                'dable':false,
                'x' : tx,
                'y' : dy,
                'maxWidth': cg.axHPadding,
                'text': yText[i],
                'align':tAlign,
                'baseline':'middle',
                'enter': 100,
                'zlevel' : cg.zlevel,
                'color' : cg.color
            };
            d += (cg.yGap*textGap);
        }
    }
    function _buildYShape(){
        var sx,sy,ex,ey;        //y轴起始坐标
        var ty,tBaseline;       //x轴线文字y坐标和对齐方式
        if (cg.yDirection == 'top'){
            sy = cg.y + cg.axVPadding;
            ey = sy - cg.height;
            ty = cg.y + 5;
            tBaseline = 'top';
        }else{
            sy = cg.y - cg.axVPadding;
            ey = sy + cg.height;
            ty = cg.y - 5;
            tBaseline = 'bottom';
        }
        sx = getX(0);
        ex = sx;
        shapeList.y = {
            'idx' : zr.getNewId('axis'),
            'sx' : sx,
            'sy' : sy,
            'ex' : ex,
            'ey' : ey,
            'dable':false,
            'shape' : 'line',
            'zlevel' : cg.zlevel,
            'color' : cg.color,
            'lineWidth' : 2
        }
        
        //纵向辅助线&X轴线文字
        var d = cg.xGap,
            dx, auIdx, xText,
            autoAxisText;
        xText = cg.xText || ['X'];
        autoAxisText = xText.length <= 1;
        
        xText = zrender.tools.lib.clone(xText);
        while (d <= cg.xMax){
            auIdx = zr.getNewId('axis');
            dx = getX(d);
            shapeList[auIdx] = {
                'idx' : auIdx,
                'sx' : dx,
                'sy' : cg.y,
                'ex' : dx,
                'ey' : ey,
                'shape' : 'line',
                'zlevel' : cg.zlevel,
                'hable' : false,
                'dable':false,
                'color' : cg.auColor,
                'lineWidth' : 0.5
            }
            if (autoAxisText){
                xText.push(d);
            }
            d += cg.xGap;
        }
        //x轴名称
        shapeList.xText = {
            'idx' : zr.getNewId('axisText'),
            'shape' : 'text',
            'dable':false,
            'x' : getX(cg.xMax) - 45,
            'y' : cg.yDirection == 'top' ? (ty - 10) : (ty + 10),
            'text': xText[0],
            'align': cg.xDirection == 'right' ? 'end' : 'start',
            'baseline': cg.yDirection == 'top' ? 'bottom' : 'top',
            'enter': 100,
            'zlevel' : cg.zlevel,
            'color' : cg.color
        };
        shapeList.xTextRect = {
            'idx' : zr.getNewId('axisText'),
            'shape' : 'rectangle',
            'x' : getX(cg.xMax) - 40,
            'y' : cg.yDirection == 'top' ? (ty - 25) : (ty + 10),
            'width' : 30,
            'height' : 15,
            'dable':false,
            'enter': 100,
            'zlevel' : cg.zlevel,
            'color' : cg.color
        };
        //x轴轴点
        d = cg.xGap;
        var textGap = xText.length > 10 ? Math.ceil(xText.length/10) : 1,
            textGapWidth = (cg.width - cg.axHPadding)/(xText.length/textGap) - 5;//Math.abs(getX(cg.xGap) - getX(0)) - 5;
        for (var i = 1, l = xText.length; i < l; i += textGap){
            auIdx = zr.getNewId('axisText');
            dx = getX(d);
            shapeList[auIdx] = {
                'idx' : auIdx,
                'shape' : 'text',
                'dable':false,
                'x' : dx,
                'y' : ty,
                'maxWidth': textGapWidth,
                'text': xText[i],
                'align':'center',
                'baseline':tBaseline,
                'enter': 100,
                'zlevel' : cg.zlevel,
                'color' : cg.color
            };
            d += (cg.xGap * textGap);
        }
    }
    
    /**
     * resize回调 
     */
    function __onResize(){
        config(configParam);
    }
    
    /**
     * 删除已存在图形数据 
     */
    function clear(){
        //删除已有数据
        for (var i in shapeList){
            zr.delShape(shapeList[i].idx);
        }
        shapeList = {};
    }
    
    /**
     * 释放 
     */
    function dispose(){
        //事件解绑定
        self.__unbind(zr);
        //清空数据
        clear();
        //更新视图
        zr.refresh(100);
    }
    
    //public:
    this.config = config;
    this.getX = getX;
    this.getY = getY;
    this.getPosition = getPosition;
    this.getArea = getArea;
    this.clear = clear;
    this.dispose = dispose;
    
    //special:
    //this.__onResize = __onResize;
    this.__bind(zr, [
        ['resize',__onResize]
    ]);
    
    this.__drive(zr,self);
    configParam = configParam || {};
    config(configParam);
}

zrender.component.Axis.prototype = zrender.component._Base;
/**
 * 图例
 */
zrender.component.Legend = function(zrInstance, configParam){
    var self        = this,
        zr          = zrInstance,   //zrender实体
        cg          = {},           //配置参数
        shapeList   = {},
        length      = 0,
        textTotalWidth = 0,         //横向排列时文字长度总和
        colorCache  = {};
         
    var PADDING_H = 20,      //水平padding
        PADDING_V = 20;      //垂直padding
            
    function config(newConfigParam){
        //多次config进行差异合并
        self.__mergeConfig(configParam,newConfigParam);
        //通用标准化conifg
        var conf = self.__reformConfig(configParam);
        
        //组件差异config
        var zrWidth = zr.getWidth(),
            zrHeight = zr.getHeight();
        /**
         * x : 起始坐标
         * y : 起始坐标
         * width : 图例宽度，默认30px
         * height : 图例高度，默认15px
         * colorIdx : 颜色索引起始
         * palette  : 自定义色板
         * direction ： 排列方向  "v" for vertical, "h" for horizontal
         * 
         */
        conf.width = self.__configValue(conf.width, 30);
        conf.height = self.__configValue(conf.height, 15);
        conf.direction = self.__configValue(conf.direction, 'v');
        conf.colorIdx = self.__configValue(conf.colorIdx, 0);
        
        if (conf.direction == 'v'){
            //垂直排列
            if (conf.x == 'left' || typeof conf.x == 'undefined'){
                conf.x = PADDING_H;
            }else if (conf.x = 'right'){
                conf.x = Math.floor(zrWidth - conf.width - PADDING_H);
            }else {
                conf.x = conf.x
            }
            conf.y = isNaN(+conf.y) ? PADDING_V : +conf.y;
        }else{
            //水平排列
            if (conf.y == 'top' || typeof conf.y == 'undefined'){
                conf.y = PADDING_V;
            }else if (conf.y = 'bottom'){
                conf.y = Math.floor(zrHeight - conf.height - PADDING_V);
            }else {
                conf.y = conf.y
            }
            conf.x = isNaN(+conf.x) ? PADDING_H : +conf.x;
        }
        
        cg = {};//清空原配置
        for (var k in conf){
            cg[k] = conf[k];
        }
        
        //if有数据，改配置重建
        for (var i in shapeList){
             _rePosition();
             return;
        }
    }
    function add(key, keyText){
        if (!shapeList[key]){
            //新建图形
            var x,y;
            if (cg.direction == 'v'){
                x = cg.x;
                y = cg.y + (cg.height + 10) * length;
            }else{
                x = cg.x + (cg.width + 10) * length + textTotalWidth;
                y = cg.y;
                if (x > (zr.getWidth() - 100)){
                    x = x % (zr.getWidth() - 100);
                    y += (cg.height + 10)*Math.floor(x / zr.getWidth() + 1);
                }
                textTotalWidth += _getStringWidth(keyText);
            }
            
            var color = getColor(key);
            //图例：图
            shapeList[key] = {
                sLegend : {
                    'idx' : zr.getNewId('sLegend'),
                    'shape' : 'rectangle',
                    'x' : x,
                    'y' : y,
                    'width' : cg.width,
                    'height' : cg.height,
                    'direction':'right',
                    'zlevel' : cg.zlevel,
                    'color' : color
                },
                //图例：文字
                tLegend : {
                    'idx' : zr.getNewId('tLegend'),
                    'shape' : 'text',
                    'x' : x + cg.width + 5,
                    'y' : y,
                    'text': keyText,
                    'align':'start',
                    'shadowBlur' : 5,
                    'shadowColor' : 'yellow',
                    'enter': 100,
                    'zlevel' : cg.zlevel,
                    'color' : color
                }
            }
            if (cg.direction == 'v' && configParam && configParam.x == 'right'){
                //垂直排列右对齐比较特殊
                shapeList[key].tLegend.x = x - 5;
                shapeList[key].tLegend.align = 'end';
            }
            length++;
            zr.addShape(shapeList[key].sLegend.idx,shapeList[key].sLegend);
            zr.addShape(shapeList[key].tLegend.idx,shapeList[key].tLegend);
        }else{
            //已存在则修改
            shapeList[key].tLegend.text = keyText;
            zr.modShape(shapeList[key].tLegend.idx,shapeList[key].tLegend);
        }
    }
    function del(key){
        if (shapeList[key]){
            zr.delShape(shapeList[key].sLegend.idx);
            zr.delShape(shapeList[key].tLegend.idx);
            delete shapeList[key];
            length--;
            _rePosition();
        }
    }
    /**
     * 删除已存在图形数据 
     */
    function clear(){
        //删除已有数据
        for (var i in shapeList){
            zr.delShape(shapeList[i].sLegend.idx);
            zr.delShape(shapeList[i].tLegend.idx);
        }
        shapeList = {};
        length = 0;
        textTotalWidth = 0;
    }
    
    //key索引获取颜色
    function getColor(key){
        var color = colorCache[key];
        if (!color){
            color = zrender.tools.color.getColor(cg.colorIdx++, cg.palette);
            colorCache[key] = color;
        }
        return color;
    }
    //key索引获取颜色
    function mergeColor(key, newColor){
        var color = colorCache[key];
        if (!color){
            colorCache[key] = newColor;
        }
    }
    /**
     * 根据data构建饼图图形 
     */
    function _rePosition(){
        var x,y,
            idx = 0;
        textTotalWidth = 0;
        for (var key in shapeList){
            if (cg.direction == 'v'){
                x = cg.x;
                y = cg.y + (cg.height + 10) * idx;
            }else{
                x = cg.x + (cg.width + 10) * idx + textTotalWidth;
                y = cg.y;
                if (x > (zr.getWidth() - 100)){
                      x = x % (zr.getWidth() - 100);
                      y += (cg.height + 10)*Math.floor(x / zr.getWidth() + 1);
                }
                textTotalWidth += _getStringWidth(shapeList[key].tLegend.text);
            }
            shapeList[key].sLegend.x = x;
            shapeList[key].sLegend.y = y;
            shapeList[key].tLegend.x = x + cg.width + 5;
            shapeList[key].tLegend.y = y;
            if (cg.direction == 'v' && configParam && configParam.x == 'right'){
                //垂直排列右对齐比较特殊
                shapeList[key].tLegend.x = x - 5;
                shapeList[key].tLegend.align = 'end';
            }
            idx++;
            zr.modShape(shapeList[key].sLegend.idx,shapeList[key].sLegend);
            zr.modShape(shapeList[key].tLegend.idx,shapeList[key].tLegend);
        }
    }
    
    function _getStringWidth(str){
        return str.length * 10;
    }
    
    /**
     * resize回调 
     */
    function __onResize(){
        config(configParam);
    }
    
    /**
     * 释放 
     */
    function dispose(){
        //事件解绑定
        self.__unbind(zr);
        //清空数据
        clear();
        //更新视图
        zr.refresh(100);
    }
    
    //public:
    this.config = config;
    this.add = add;
    this.del = del;
    this.clear = clear;
    this.getColor = getColor;
    this.mergeColor = mergeColor;
    this.dispose = dispose;
    
    //special:
    //this.__onResize = __onResize;
    this.__bind(zr, [
        ['resize',__onResize]
    ]);
    
    this.__drive(zr,self);
    configParam = configParam || {};
    config(configParam);
}

zrender.component.Legend.prototype = zrender.component._Base;
/**
 * 图例
 */
zrender.component.Colorscale = function(zrInstance, configParam){
    var self        = this,
        zr          = zrInstance,   //zrender实体
        cg          = {},           //配置参数
        shapeList   = {},
        max         = 10,
        gap         = 1,
        length      = 0,
        textTotalWidth = 0;         //横向排列时文字长度总和
         
    var PADDING_H = 20,      //水平padding
        PADDING_V = 20;      //垂直padding
            
    function config(newConfigParam){
        //多次config进行差异合并
        self.__mergeConfig(configParam,newConfigParam);
        //通用标准化conifg
        var conf = self.__reformConfig(configParam);
        
        //组件差异config                
        var zrWidth = zr.getWidth(),
            zrHeight = zr.getHeight();
        /**
         * x : 起始坐标
         * y : 起始坐标
         * width : 图例宽度，默认30px
         * height : 图例高度，默认15px
         * colorIdx : 颜色索引起始
         * palette  : 自定义色板
         * direction ： 排列方向  "v" for vertical, "h" for horizontal
         * 
         */
        conf.width = self.__configValue(conf.width, 30);
        conf.height = self.__configValue(conf.height, 15);
        conf.direction = self.__configValue(conf.direction, 'v');
        conf.colorIdx = self.__configValue(conf.colorIdx, 0);
        
        if (conf.direction == 'v'){
            //垂直排列
            if (conf.x == 'left' || typeof conf.x == 'undefined'){
                conf.x = PADDING_H;
            }else if (conf.x = 'right'){
                conf.x = Math.floor(zrWidth - conf.width - PADDING_H);
            }else {
                conf.x = conf.x
            }
            conf.y = isNaN(+conf.y) ? PADDING_V : +conf.y;
        }else{
            //水平排列
            if (conf.y == 'top' || typeof conf.y == 'undefined'){
                conf.y = PADDING_V;
            }else if (conf.y = 'bottom'){
                conf.y = Math.floor(zrHeight - conf.height - PADDING_V);
            }else {
                conf.y = conf.y
            }
            conf.x = isNaN(+conf.x) ? PADDING_H : +conf.x;
        }
        
        cg = {};//清空原配置
        for (var k in conf){
            cg[k] = conf[k];
        }
        
        //if有数据，改配置重建
        for (var i in shapeList){
             _rePosition();
             return;
        }
    }
    function set(newmax,newgap){
        clear();
        max = newmax;
        gap = newgap;
        var i;
        for (i = max; i > gap; i -= gap){
            _add(i, i + '-' + (i - gap));
        } 
        _add(i, i + '-0');       
    }
    function _add(key, keyText){
        if (!shapeList[key]){
            //新建图形
            var x,y;
            if (cg.direction == 'v'){
                x = cg.x;
                y = cg.y + (cg.height + 10) * length;
            }else{
                x = cg.x + (cg.width + 10) * length + textTotalWidth;
                y = cg.y;
                if (x > (zr.getWidth() - 100)){
                    x = x % (zr.getWidth() - 100);
                    y += (cg.height + 10)*Math.floor(x / zr.getWidth() + 1);
                }
                textTotalWidth += _getStringWidth(keyText);
            }
            
            var color = getColor(key);
            //图例：图
            shapeList[key] = {
                sLegend : {
                    'idx' : zr.getNewId('sLegend'),
                    'shape' : 'rectangle',
                    'x' : x,
                    'y' : y,
                    'width' : cg.width,
                    'height' : cg.height,
                    'direction':'right',
                    'zlevel' : cg.zlevel,
                    'color' : color
                },
                //图例：文字
                tLegend : {
                    'idx' : zr.getNewId('tLegend'),
                    'shape' : 'text',
                    'x' : x + cg.width + 5,
                    'y' : y,
                    'text': keyText,
                    'align':'start',
                    'shadowBlur' : 5,
                    'shadowColor' : 'yellow',
                    'enter': 100,
                    'zlevel' : cg.zlevel,
                    'color' : color
                }
            }
            if (cg.direction == 'v' && configParam && configParam.x == 'right'){
                //垂直排列右对齐比较特殊
                shapeList[key].tLegend.x = x - 5;
                shapeList[key].tLegend.align = 'end';
            }
            length++;
            zr.addShape(shapeList[key].sLegend.idx,shapeList[key].sLegend);
            zr.addShape(shapeList[key].tLegend.idx,shapeList[key].tLegend);
        }else{
            //已存在则修改
            shapeList[key].tLegend.text = keyText;
            zr.modShape(shapeList[key].tLegend.idx,shapeList[key].tLegend);
        }
    }
    /**
     * 删除已存在图形数据 
     */
    function clear(){
        //删除已有数据
        for (var i in shapeList){
            zr.delShape(shapeList[i].sLegend.idx);
            zr.delShape(shapeList[i].tLegend.idx);
        }
        shapeList = {};
        length = 0;
        textTotalWidth = 0;
    }
    
    //key索引获取颜色
    function getColor(key){
        var color,idx = 0;
        for (var i = 0; i <= max; i += gap){
            if (i <= key && key <= (i + gap)){
                color = zrender.tools.color.getScaleColor(idx, 'blue');
                break;
            }
            idx++;
        }
        //console.log(key,color)
        return color;
    }
    /**
     * 根据data构建饼图图形 
     */
    function _rePosition(){
        var x,y,
            idx = 0;
        textTotalWidth = 0;
        for (var key in shapeList){
            if (cg.direction == 'v'){
                x = cg.x;
                y = cg.y + (cg.height + 10) * idx;
            }else{
                x = cg.x + (cg.width + 10) * idx + textTotalWidth;
                y = cg.y;
                if (x > (zr.getWidth() - 100)){
                      x = x % (zr.getWidth() - 100);
                      y += (cg.height + 10)*Math.floor(x / zr.getWidth() + 1);
                }
                textTotalWidth += _getStringWidth(shapeList[key].tLegend.text);
            }
            shapeList[key].sLegend.x = x;
            shapeList[key].sLegend.y = y;
            shapeList[key].tLegend.x = x + cg.width + 5;
            shapeList[key].tLegend.y = y;
            if (cg.direction == 'v' && configParam && configParam.x == 'right'){
                //垂直排列右对齐比较特殊
                shapeList[key].tLegend.x = x - 5;
                shapeList[key].tLegend.align = 'end';
            }
            idx++;
            zr.modShape(shapeList[key].sLegend.idx,shapeList[key].sLegend);
            zr.modShape(shapeList[key].tLegend.idx,shapeList[key].tLegend);
        }
    }
    
    function _getStringWidth(str){
        return str.length * 10;
    }
    
    /**
     * resize回调 
     */
    function __onResize(){
        config(configParam);
    }
    
    /**
     * 释放 
     */
    function dispose(){
        //事件解绑定
        self.__unbind(zr);
        //清空数据
        clear();
        //更新视图
        zr.refresh(100);
    }
    
    //public:
    this.config = config;
    this.set = set;
    this.clear = clear;
    this.getColor = getColor;
    this.dispose = dispose;
    
    //special:
    //this.__onResize = __onResize;
    this.__bind(zr, [
        ['resize',__onResize]
    ]);
    
    this.__drive(zr,self);
    configParam = configParam || {};
    config(configParam);
}

zrender.component.Colorscale.prototype = zrender.component._Base;
zrender.diagram._Base = zrender.component._Base;
/**
 * 折线图
 */
zrender.diagram.BrokenLine = function(zrInstance, configParam){
    var self        = this,
        zr          = zrInstance,   //zrender实体
        cg          = {},           //配置参数
        shapeList   = {},
        data        = [];
    var VALUE_GAP_CONTROL = 10;     //默认最高值和最小值间差值均分10等分；
    
    function config(newConfigParam){
        //多次config进行差异合并
        self.__mergeConfig(configParam,newConfigParam);
        //通用标准化conifg
        var conf = self.__reformConfig(configParam);
        
        //组件差异config        
        /**
         * zlevel : Number axis的zlevel为1，所以bar的在level必须>2；
         * name : 'x' || 'y' name值映射到x轴或y轴上，默认为x
         */
        conf.zlevel = conf.zlevel > 1 ? conf.zlevel : 2;
        conf.name = self.__configValue(conf.name, 'x');
        
        cg = {};//清空原配置
        for (var k in conf){
            cg[k] = conf[k];
        }
        
        if (!cg.axis){
            /**
             * x : x轴起点坐标
             * y : y轴起点坐标
             * width : 坐标轴宽度，默认满图
             * height : 坐标轴高度，默认满图
             * xText : [] x轴文字，xText[0]为坐标轴说明
             * yText : [] y轴文字，yText[0]为坐标轴说明
             * xMax : x轴最大值 
             * yMax : y轴最大值 
             * xGap : x轴间隔
             * yGap : y轴间隔
             * xDirection : 'right' || 'left' x轴延伸方向，默认right
             * yDirection : 'top' || 'down' y轴延伸方向，默认top
             */
            cg.axis = new zrender.component.Axis(zr);
        }
        cg.axis.config(zrender.tools.lib.clone(configParam));
        
        //if有数据，改配置重建
        for (var i in shapeList){
             _buildShape();
             return;
        }
    }
    /**
     * 图形数据增改
     * @param {array} dataArray [{name:xxx,value:[xxx]}]
     * dataArray[i].name
     *   已存在：则修改为value，newname修改
     *   不存在：则新增
     */
    function setData(dataArray){
        data = self.__setData(data, dataArray);
        data.length > 0 && _buildShape();
    }
    /**
     * 图形数据删除清空
     * @param nameArray [name]
     * nameArray为undefined则清空
     */
    function delData(nameArray){
        data = self.__delData(data, nameArray);
        data.length > 0 ? _buildShape() : _clearShape();
    }
    
    function _getValue(name){
        var vlist = [];
        data.forEach(function(d){
            if (d.name == name){
                d.value.forEach(function(v){
                    vlist.push(v);
                });
            }
        });
        return vlist;
    }
    
    /**
     * 根据data构建折线图形 
     */
    function _buildShape(){
        var max = 0,
            min = Number.MAX_VALUE,
            maxLength = 0,
            gap = 0,
            kText = cg.nameText || [''],
            vText = cg.valueText || [''],
            autoNameText = kText.length <= 1;

        _clearShape();
        
        kText = zrender.tools.lib.clone(kText);
        vText = zrender.tools.lib.clone(vText);
        data.forEach(function(d){
            if(autoNameText){
                kText.push(d.name);
            }
            d.value.forEach(function(v){
                max = Math.max(max, v);
                min = Math.min(min, v);
            });
            maxLength = Math.max(maxLength, d.value.length);
        });
        
        //gap = Math.ceil((max - min) / (VALUE_GAP_CONTROL-1));
        gap = Math.ceil(max / (VALUE_GAP_CONTROL - 1)) || 1;
        if (cg.name == 'x'){
            //x轴分类y轴数据
            cg.axis.config({
                xMax : data.length + 1,
                xGap : 1,
                yMax : gap * VALUE_GAP_CONTROL,
                yGap : gap,
                xText : kText,
                yText : vText
            })
        }else{
            //y轴分类x轴数据
            cg.axis.config({
                yMax : data.length + 1,
                yGap : 1,
                xMax : gap * VALUE_GAP_CONTROL,
                xGap : gap,
                xText : vText,
                yText : kText
            })
        }
        
        if (!cg.multiValue || cg.multiValue == 'false'){
            //生成legend文字
            _buildLegend(cg.legend , cg.legendText, 1);
            //单值
            _buildSingleBrokenLine(0);
        }else{
            //生成legend文字
            _buildLegend(cg.legend , cg.legendText, maxLength);
            //多值
            for (var i = maxLength - 1; i >= 0; i--){
                _buildSingleBrokenLine(i);
            }
        }
        
        //console.log(shapeList)
        //console.log(data)
    }
    function _buildLegend(legend,legendText,maxLength){
        //生成legend文字，legend key is i！！！
        if (legend && legendText){
            for (var i = 0, l = Math.max(maxLength, legendText.length); i < l; i++){
                legend.add(i, legendText[i] || ('Legend' + (i + 1 - Math.min(maxLength, legendText.length))));
            }
        }
    }
    /**
     * mvCur：多组数据，当前第几组
     */
    function _buildSingleBrokenLine(mvCur){
        var sx,sy,ex,ey,
            color,
            curValue,
            sName = undefined,
            sValue = undefined,
            enter = 1,
            done = 1;
       
        if (cg.legend){
            color = cg.legend.getColor(mvCur);
        }else{
            color =  zrender.tools.color.getColor(mvCur);
        }
        
        for (var i = 0, l = data.length, pGap=Math.ceil(l/10); i < l; i++){
            curValue = data[i].value[mvCur] || '';
            if (typeof sValue != 'undefined' && curValue != ''){
                if (cg.name == 'x'){
                    //x轴分类y轴数据
                    sx = cg.axis.getX(sName);
                    sy = cg.axis.getY(sValue);
                    ex = cg.axis.getX(i + 1);
                    ey = cg.axis.getY(curValue);
                }else{
                    //y轴分类x轴数据
                    sx = cg.axis.getX(sValue);
                    sy = cg.axis.getY(sName);
                    ex = cg.axis.getX(curValue);
                    ey = cg.axis.getY(i + 1);
                }
                _buildPointAndLine(sx,sy,ex,ey,color,enter,done,i%pGap==0?5:3,i,mvCur,data[i].name,curValue);
            }
            if (curValue != ''){
                if (typeof sValue == 'undefined'){
                    if (cg.name == 'x'){
                        //x轴分类y轴数据
                        ex = cg.axis.getX(i + 1);
                        ey = cg.axis.getY(curValue);
                    }else{
                        //y轴分类x轴数据
                        ex = cg.axis.getX(curValue);
                        ey = cg.axis.getY(i + 1);
                    }
                    _buildFirstPoint(ex,ey,color,mvCur,data[i].name,curValue);
                }
                sName = i + 1;
                sValue = curValue;
                enter = done;
                done = 100/l*(i+1);
            }
        }
    }
    function _buildFirstPoint(x,y,color,mvCur,name,value){
        var idx,shape,mvText='';
        idx = zr.getNewId('blPoint');
        if (cg.legend && cg.legendText){
            mvText = cg.legendText[mvCur] || '';   
        }
        shape= {
            'idx' : idx,
            'shape' : 'circle',
            'x' : x,
            'y' : y,
            'r' : 5,
            'hable':cg.cable || cg.hable,
            'dable':cg.cable,     //diagram可计算则shape可拖拽
            'zlevel' : cg.zlevel,
            'color' : color,
            'mvCur' : mvCur,
            'mvText': mvText,
            'name' : name,
            'value' : value
        }
        zr.addShape(idx, shape);
        shapeList[idx] = shape;
    }
    function _buildPointAndLine(sx,sy,ex,ey,color,enter,done,pointSize,dataCur,mvCur,name,value){
        var idx,shape,mvText='';
        //end point
        idx = zr.getNewId('blPoint');
        if (cg.legend && cg.legendText){
            mvText = cg.legendText[mvCur] || '';   
        }
        shape= {
            'idx' : idx,
            'shape' : 'circle',
            'x' : ex,
            'y' : ey,
            'r' : pointSize || 5, //点密度太大的话需要间隔的画小点
            'hable':cg.cable || cg.hable,
            'dable':cg.cable,     //diagram可计算则shape可拖拽
            'zlevel' : cg.zlevel,
            'color' : color,
            'mvCur' : mvCur,
            'mvText': mvText,
            'name' : name,
            'value' : value
        }
        zr.addShape(idx, shape);
        shapeList[idx] = shape;
        
        //line
        idx = zr.getNewId('blLine');
        shape= {
            'idx' : idx,
            'shape' : 'line',
            'sx' : sx,
            'sy' : sy,
            'ex' : ex,
            'ey' : ey,
            'lineWidth' : 4,
            'hable' : false,
            'dable' : false,
            'zlevel' : cg.zlevel,
            'color' : color,
            'enter' : enter,
            'done' : done,
            'dataCur' : dataCur,
            'mvCur' : mvCur
        }
        zr.addShape(idx, shape);
        shapeList[idx] = shape;
    }
    /**
     * 删除已存在图形数据 
     */
    function _clearShape(){
        //删除已有legend
        if (cg.legend && cg.legendText){
            var maxLength = 0;
            data.forEach(function(d){
                maxLength = Math.max(maxLength, d.value.length);
            });
            for (var i = 0, l = Math.max(maxLength, cg.legendText.length); i < l; i++){
                cg.legend.del(i);
            }
        }
        cg.axis.clear();
        //删除已有数据
        for (var i in shapeList){
            zr.delShape(shapeList[i].idx);
        }
        
        shapeList = {};
    }
    
    /**
     * resize回调 
     */
    function __onResize(){
        config(configParam);
    }
    
    /**
     * hover回调 
     */
    function __onHover(param){
        var e = param.attachment,
            part = shapeList[e.idx],
            mX,temp,min,tarIdx;
        //临时方案，乱来！ 
        if (e.idx == 'kener'){
            mX = zrender.tools.event.getX(param.content);
            min = Number.MAX_VALUE;
            for (var i in shapeList){
                if(shapeList[i].mvCur == 1){
                    temp = Math.abs(shapeList[i].x - mX);
                    if (temp < min){
                        min = temp;
                        tarIdx = i;
                    }
                }
            }
            part = shapeList[tarIdx];
        }
            
        if (!part || part.idx != e.idx && e.idx != 'kener'){
            //hover在其他实例的shape上不响应
            return;
        }
        var name = part.name,
            value = part.value,
            mvText = part.mvText;
        if (mvText != ''){
            mvText = mvText + ' : ';
        }
        if (!cg.onHover ||                                     //没有onHover
            (cg.onHover && !cg.onHover(name, value, zr))){      //有onHover且调用返回false或undefined
            zr.addHoverShape({
                shape : 'text',
                x : part.x,
                y : part.y - 10,
                text : mvText + name + ' : ' + value,
                align: 'center',
                baseline : 'bottom',
                shadowBlur : 10,
                shadowColor : 'yellow',
                color:part.color
            });
        }
    }
    
    /**
     * dragging回调 
     */
    function __onDragging(param){
        if (!cg.cable){
            //不可重计算
            return;
        }
        var e = param.attachment,
            part = shapeList[e.idx],
            event = param.content;
        
        var x = zrender.tools.event.getX(event),
            y = zrender.tools.event.getY(event),
            rectangleAxis = cg.axis.getArea('inside'),
            rectangleAxisAll = cg.axis.getArea('all');
        
        if (zrender.tools.area.isInside('rectangle', rectangleAxisAll, x, y)){
            if(zrender.tools.area.isOutside('rectangle', rectangleAxis, x, y)){
                //添加进bar图内
                //y轴
                var axisYDetail;
                if (typeof cg.xDirection == 'undefined' || cg.xDirection == 'right'){
                    axisYDetail = 0
                }else{
                    axisYDetail = rectangleAxis.width;
                }
                zr.addHoverShape({
                    shape : 'line',
                    type : 'stroke',
                    lineWidth : 5,
                    sx : rectangleAxis.x + axisYDetail,
                    sy : rectangleAxis.y,
                    ex : rectangleAxis.x + axisYDetail,
                    ey : rectangleAxis.y + rectangleAxis.height,
                    scolor: zrender.tools.color.getCableColor()
                });
                
                //x轴
                var axisXDetail;
                if (typeof cg.yDirection == 'undefined' || cg.yDirection == 'top'){
                    axisXDetail = rectangleAxis.height;
                }else{
                    axisXDetail = 0;                    
                }
                zr.addHoverShape({
                    shape : 'line',
                    type : 'stroke',
                    lineWidth : 5,
                    sx : rectangleAxis.x,
                    sy : rectangleAxis.y + axisXDetail,
                    ex : rectangleAxis.x + rectangleAxis.width,
                    ey : rectangleAxis.y + axisXDetail,
                    scolor: zrender.tools.color.getCableColor()
                });
            }else{
                //检查是否在某个柱形上
                for (var i in shapeList){
                    if (shapeList[i].shape == 'circle' 
                        &&
                        zrender.tools.area.isInside('circle', shapeList[i], x, y))
                    {
                        //落在某个点上
                        zr.addHoverShape({
                            shape : 'circle',
                            type : 'stroke',
                            x : shapeList[i].x,
                            y : shapeList[i].y,
                            r : 10,
                            scolor: zrender.tools.color.getCableColor()
                        });
                        break;
                    }else if (shapeList[i].shape == 'line' 
                        &&
                        zrender.tools.area.isInside('line', shapeList[i], x, y))
                    {
                        //落在某段线上
                        zr.addHoverShape({
                            shape : 'line',
                            sx : shapeList[i].sx,
                            sy : shapeList[i].sy,
                            ex : shapeList[i].ex,
                            ey : shapeList[i].ey,
                            lineWidth : 4,
                            color: zrender.tools.color.getCableColor()
                        });
                        break;
                    }
                }
            }
        }
        return;
    }
    /**
     * dragging回调 
     */
    function __onDragdone(param){
        if (!cg.cable){
            //不可重计算
            return;
        }
        var e = param.attachment,
            part = shapeList[e.idx],
            event = param.content;
        
        var x = zrender.tools.event.getX(event),
            y = zrender.tools.event.getY(event),
            rectangleAxis = cg.axis.getArea('inside'),
            rectangleAxisAll = cg.axis.getArea('all');
        if (zrender.tools.area.isInside('rectangle', rectangleAxisAll, x, y)){
            if (zrender.tools.area.isOutside('rectangle', rectangleAxis, x, y)){
                //数据拖拽进坐标轴上
                if (!part || part.idx != e.idx){
                    //外部拖拽进来的
                    zr.delIslandShape(e);
                }else{
                    //自己拖到自己轴上没意义
                    _buildShape();
                    return;
                }
                var v = _getValue(e.name);
                if (v.length > 0){
                    v.push(e.value);
                }else{
                    //没找到
                    v = [e.value];
                }
                var d = [{
                    name : e.name,
                    value : v
                }];
                setData(d);
            }else{
                //在折线区域内拖拽结束
                //检查是否拖进某个点上:
                    //如是则修改该点数据，删除孤岛数据
                
                //检查被拖拽的是否自己的数据
                    //如是则需要修改柱状数据，产生孤岛
                var isFound = false;
                
                for (var i in shapeList){
                    if (shapeList[i].shape == 'circle' 
                        &&
                        zrender.tools.area.isInside('circle', shapeList[i], x, y))
                    {
                        if (shapeList[i].idx == e.idx){
                            //落在自己
                            _buildShape();
                            return;
                        }
                        //落在某个点上
                        if (!cg.multiValue || cg.multiValue == 'false'){
                            //单值
                            var n = [{
                                name : shapeList[i].name,
                                newname : shapeList[i].name + '&' + e.name,
                                value : [shapeList[i].value + e.value]
                            }]
                            setData(n);
                        }else{
                            //多值
                            var v = _getValue(shapeList[i].name),
                                nk = e.name;
                            v[shapeList[i].mvCur] = +shapeList[i].value + e.value
                            if (shapeList[i].name != e.name){
                                nk = shapeList[i].name + '&' + e.name;
                            }
                            var n = [{
                                name : shapeList[i].name,
                                newname : nk,
                                value : v
                            }]
                            setData(n);
                        }
                        isFound = true;
                        break;
                    }else if (shapeList[i].shape == 'line' 
                        &&
                        zrender.tools.area.isInside('line', shapeList[i], x, y))
                    {
                        //落在某条线上
                        if (shapeList[i].mvCur == e.mvCur){
                            //落在自己
                            _buildShape();
                            return;
                        }
                        if (!cg.multiValue || cg.multiValue == 'false'){
                            //单值
                            var n = [];
                            for (var j = 0; j < shapeList[i].dataCur; j++){
                                n.push(data[j]);
                            }
                            n.push({
                                name : e.name,
                                value : [e.value]
                            })
                            for (var j = shapeList[i].dataCur; j < data.length; j++){
                                n.push(data[j]);
                            }
                            delData();
                            setData(n);
                        }else{
                            //多值
                            var v = _getValue(e.name);
                            v[shapeList[i].mvCur] = e.value
                            
                            var n = [{
                                name : e.name,
                                value : v
                            }]
                            setData(n);
                        }
                        isFound = true;
                        break;
                    }
                }
                
                if (part && part.idx == e.idx){
                    //被拖拽的是自己的数据，修改原数据
                    if (!cg.multiValue || cg.multiValue == 'false'){
                        //单值
                        var d = [e.name];
                        delData(d);
                    }else {
                        //多值
                        var v = _getValue(e.name);
                        v[e.mvCur] = '';
                        setData([{
                            name : e.name,
                            value : v
                        }]);
                    }
                    if (!isFound){
                        //落地，需要产生孤岛数据
                        e.mvCur = -1;
                        zr.addIslandShape(e);
                        //console.log(shapeList)
                    }
                }else {
                    //被拖拽的是孤岛数据，落在柱形上则删除孤岛
                     if (isFound){
                         zr.delIslandShape(e);
                     }
                }
            }
        }
    }
    
    /**
     * 释放 
     */
    function dispose(){
        //事件解绑定
        self.__unbind(zr);
        //清空数据
        delData();
        //更新视图
        zr.refresh(100);
    }
    
    //public:
    this.config = config;
    this.setData = setData;
    this.delData = delData;
    this.dispose = dispose;
    
    //special:
    //this.__onResize = __onResize;
    //this.__onHover = __onHover;
    //this.__onDragging = __onDragging;
    //this.__onDragdone = __onDragdone;
    this.__bind(zr, [
        ['resize',__onResize],
        ['hover',__onHover],
        ['dragging',__onDragging],
        ['dragdone',__onDragdone]
    ]);
    
    this.__drive(zr,self);
    configParam = configParam || {};
    config(configParam);
}

zrender.diagram.BrokenLine.prototype = zrender.diagram._Base;
