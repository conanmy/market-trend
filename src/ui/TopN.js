/**
 * topn排行榜组件
 * @param {Object} options 控件初始化配置
 * <pre>
 * 配置项定义如下：
 * {
 * 		main:	 [Object], [REQUIRED] 初始化基于的jQuery元素
 *      id:      [String], [REQUIRED] 控件ID
 *      isfixed: [Boolean],[OPTIONAL] 是否仅展现前N项数据，默认为true
 *      data:    [Array],  [REQUIRED] 要排行的数据源
 *      N:       [Number], [OPTIONAL] 要显示的Top条记录，未设置，全部显示给定的数据
 *      caption: [String], [OPTIONAL] 要显示的Top条记录的标题
 *      headers: [Array],  [OPTIONAL] 要显示的Top条记录的每一列的header信息，每一项都是html字符串。 
 *      keys:    [Array],  [REQUIRED] 要显示的Top条记录的每一列的数据访问的key，数组元素若未定义或者不存在，
 *                                    表示用数字序列号作为value显示
 *      values:  [Array],  [REQUIRED] 定制数据显示方式，数组元素为Function，将data[i]作为item给该函数作为参数，配置的函数需返回一段html
 * 									      一般传null即可 ，会显示data[i][key]
 *                                    若对应的keys中的值未定义或者不存在，则用其i+1来作为值显示。 
 *      mainKey: [String], [OPTIONAL] 用于topN记录排序的key。
 *      barKey:  [String], [OPTIONAL] 如果存在要显示成柱形条的数据渲染方式，必须配置该属性key，通过该key获取对应
 *                                    的数据值
 * }
 *
 * headers(如果有), keys, values的长度保持一致
 *
 * 如有柱状条，约定classname为valuebar，如果柱状条旁边需附有值说明，
 * 约定classname为valueliteral，如下在values对应数据元素项定义:
 * function(item) {
 *     return '<div class="value-bar"></div><span class="value-literal">100</span>';
 * }
 * <b>NOTICE:</b>为了让bar正常显示，要对每一列的宽度样式进行设置，对应列的样式设置.column* {...}，具体展现样式可以根据渲染出来元素再进行定制
 * </pre>
 */
function TopN(options){
	this.initOptions(options);
	this.barClass = 'value-bar';
	this.barLiteralClass = 'value-literal';
	this.type = 'topn';
	if (this.fixed == 'undefined') {
		this.fixed = true;
	}
	if (this.mainKey) {
        this.data.sort(this.sort());
    }
	this.render(this.main);
};
TopN.prototype = function(){
	/**
     * 获得HTML模版字符串
     */
    function getHTML(me) {
        var html = ['<table>'],
            i, len = me.keys.length;
        
        if (me.caption) {
            html.push('<caption>');
            html.push(me.caption);
            html.push('</caption>');
        }
        // 拼装header部分
        if (me.headers) {
            html.push('<thead><tr>');

            var headers = me.headers;
            for (i = 0, len = headers.length; i < len; i++) {
                html.push('<th class="column');
                html.push(i + 1);
                html.push('">');
                
                html.push(headers[i] || '&nbsp;');

                html.push('</th>');
            }

            html.push('</tr></thead>');
        }
        
        // 拼装排行部分
        html.push('<tbody>');

        // 遍历前N 项数据
        var keys = me.keys, key,
            values = me.values, value,
            items = me.data, item, 
            j, size = values.length;

        for (i = 0, len = me.N; i < len; i++) {
            item = items[i];

            html.push('<tr>');
            
            // 遍历每项数据的keys
            for (j = 0; j < size; j++) {
                key = keys[j];
                value = values[j];
                
                if (key) {
                    key = item[key];
                    if (typeof value === 'function') {
                        value = value(item);
                    } else if (typeof value !== 'function') {
                        value = key;
                    }
                } else {
                    // key为空表示序号项
                    key = i + 1;
                    if (typeof value === 'function') {
                        value = value(key);
                    } else if (typeof value !== 'function') {
                        value = key;
                    }
                }

                html.push('<td class="column');
                html.push(j + 1);
                html.push('">');
                html.push(value);
                html.push('</td>');
            }

            html.push('</tr>');
        }

        html.push('</tbody></table>');
        
        return html.join('');
    }
    // 设置valueBar的宽度
    function setBarWidth(bar, width) {
        if (isNaN(width)) {
            width = 4;
        }
        // 最小值不能小于4px
        width = Math.max(width, 4);

        bar.style.width = width + 'px';
        if (!bar.innerHTML) {
            bar.innerHTML = '&nbsp;';
        }
    }
    /**
     * 获得key属性的最大值所对应的数组索引
     */
    function getMaxIndex(key, me) {
        var data = me.data, maxIndex, maxValue, item;
        for (var i = 0, len = me.N; i < len; i++) {
            item = data[i];
            if (item && typeof item[key] !== 'undefined') {
                if (i > 0) {
                    if (item[key] > maxValue) {
                        maxValue = item[key];
                        maxIndex = i;
                    }
                } else {
                    // 是数组第一项就直接赋值
                    maxValue = item[key];
                    maxIndex = 0;
                }
            } 
        }
        return maxIndex;
    }
    function getWidth(el) {
        var paddingLeft = $(el).css('padding-left'),
            paddingRight = $(el).css('padding-right');
        return el.offsetWidth - parseInt(paddingLeft, 10) - parseInt(paddingRight, 10);
    }
    /**
     * 自适应宽度，主要是处理valueBar的宽度
     * 需要确保最小宽度为4px
     */
    function autoWidth(me) {
        var data = me.data, barKey = me.barKey;
        
        var maxIndex = getMaxIndex(barKey, me),
            maxItem = data[maxIndex];
        
        // 获得所需元素集
        var valueBars = me.main.find('.' + me.barClass),
            valueLiterals = me.main.find('.' + me.barLiteralClass);
        
        // 获得最大值所对应的valueBar和valueLiteral
        var maxValueBar = valueBars[maxIndex],
            maxValueLiteral = valueLiterals[maxIndex];
        
        // 相减可得最大宽度
        var maxWidth = getWidth(maxValueBar.parentNode);
        maxWidth -= maxValueLiteral ? maxValueLiteral.offsetWidth : 0;
        // 30px 作为留白，好看些
        maxWidth -= 30;

        // 获得最大值
        var maxValue = maxItem[barKey];
        
        var percent, width, bar;
        for (var i = valueBars.length - 1; i >= 0; i--) {
            // 计算宽度
            if (maxValue) {
                percent = data[i][barKey] / maxValue;
            } else {
                percent = 0;
            }
            
            width = maxWidth * percent;
            
            // 获得DOM元素
            bar = valueBars[i];
            setBarWidth(bar, width);
        }
    }
    
	return {
		initOptions : function(options){
			for (var key in options){
				this[key] = options[key];
			}
		},
		/**
	     * 获取dom子部件的css class
	     * 
	     * @protected
	     * @return {string}
	     */
	    getClass: function (key) {
	        var me = this,
	            type = me.type.toLowerCase(),
	            className = 'ui_' + type;
	        
	        if (key) {
	            className += '_' + key;
	        }
	        return className;
	    },
		/**
	     * 渲染控件
	     * 
	     * @protected
	     * @param {HTMLElement} main 控件挂载的DOM
	     */
	    baseRender: function (main) {
	        var me = this;
	        main.addClass(me.getClass());
	    },
		/**
		 * 渲染控件
		 * @method render
		 * @param {HTMLElement} main 控件挂载的DOM元素
		 */
		render: function(main) {
		    this.baseRender(main);
		    this.refresh(this.data);
		},
		/**
         * 根据给定数据进行渲染
         * 
         * @method refresh
         * @param {Array} data 要渲染的数据
         */
        refresh: function(data) {
            if (!data) return;

            this.data = data;
            
            if (this.mainKey) {
		        this.data.sort(this.sort());
		    };
            
            (this.isfixed == false) ? this.N = this.data.length : (this.N = this.N || this.data.length);

            var html = getHTML(this);
            this.main[0].innerHTML = html;

            if (this.main.find('.' + this.barClass)[0]) {
                autoWidth(this);
            }
        },
        /**
         * 排序方法，作为Array.prototype.sort()的参数
         * @return {Function}
         */
        sort: function(mainKey) {
            var key = mainKey || this.mainKey;
            return  function(item1, item2) {
                if (item1 && typeof item1[key] !== 'undefined' &&
                    item2 && typeof item2[key] !== 'undefined') {
                    var value1 = item1[key] - 0;
                    var value2 = item2[key] - 0;
                    return value2 - value1;
                }
            }
        }
	}
}();
