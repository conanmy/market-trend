/*
 * 双日期选择，扩展自jQUery
 * 
 * 初始化
 * @params {object}
 * onSelect {function} 选择了日期后的回调函数
 * defaultDates {object} required 默认的初始日期，形如{startDate: '2012-09-12', endDate: '2012-10-02'}
 * 
 * 外部调用
 * @params
 * setDates 设置日历组件的初始日期，参数为{object}，形如{startDate: '2012-09-12', endDate: '2012-10-02'}
 * 设置触发按钮上的文字 setTriggerText，参数为{string}
 */
(function($){
	var PROP_NAME = 'multidateinst';
	function MultiDatepicker(){
		this._mainDivId = 'MultiDateWrapper';
		this.mdpDiv = $('<div id="' + this._mainDivId + '" class="ui-multidatepicker ui-widget ui-widget-content">'
						+ '<div class="quick-select">'
						+'<a qid="yesterday">昨天</a>|<a qid="week">最近七天</a>'
						+'|<a qid="lastweek">上周</a>|<a qid="month">本月</a>|<a qid="lastmonth">上个月</a></div>'
						+ '<div class="main-picker">'
							+ '<div class="start-picker"><h2>开始时间</h2><div id="startPicker"></div></div>'
							+ '<div class="end-picker"><h2>结束时间</h2><div id="endPicker"></div></div>'
						+ '</div>'
						+ '<div class="toolbar"><span class="confirm">确定</span><span class="cancel">取消</span></div>'
						+ '<a class="link"><span class="ui-icon ui-icon-closethick">close</span></a>'
					+　'</div>');
	};
	$.extend(MultiDatepicker.prototype, {
		markerClassName: 'hasDatepicker',
		init: function(target, options){
			var me = this,
				options = options || {};
			
			target.button({
				icons:{
					secondary: 'ui-icon-triangle-1-s'
				}
			});
			target.addClass($.multidatepicker.markerClassName);
			
			var inst = me._inst(options);
			$.data(target[0], PROP_NAME, inst);
			
			$('#startPicker').datepicker({
				changeMonth: true,
				numberOfMonths: 1,
				minDate: '2012-01-01',
				maxDate: $.dateToString(new Date(Config.now.getTime() - 24*60*60*1000)),
				onSelect: function(selectedDate){
					me._getInst(target).startDate = selectedDate;
					$('#endPicker').datepicker('option', 'minDate', selectedDate);
				}
			});
			$('#endPicker').datepicker({
				changeMonth: true,
				numberOfMonths: 1,
				minDate: '2012-01-01',
				maxDate: $.dateToString(new Date(Config.now.getTime() - 24*60*60*1000)),
				onSelect: function(selectedDate){
					me._getInst(target).endDate = selectedDate;
					$('#startPicker').datepicker('option', 'maxDate', selectedDate);
				}
			});
			
			if (options.defaultDates){
				me._setDatesMultidatepicker(target, options.defaultDates);
			}
			//需要在设置了默认日期，也就是按钮上有内容之后再给日历浮层定位
			me._posPicker(target);
			
			me._addListeners(target, options.onSelect);
		},
		_inst: function(options){
			if (options.rangeDate){
				//设置默认时间范围
			}
			return {
				mdpDiv: this.mdpDiv
			};
		},
		/*
		 * @param target {object} jq对象
		 */
		_getInst: function(target){
			return $.data(target[0], PROP_NAME);
		},
		_externalClickHandler: function(event){
			var $target = $(event.target);
			if (($target[0].id != $.multidatepicker._mainDivId) 
			&& ($target.parents('#' + $.multidatepicker._mainDivId).length == 0 ) 
			&& ($target.parents('.' + $.datepicker.markerClassName).length == 0 )){
				$.multidatepicker.mdpDiv.hide();
			}
		},
		_posPicker: function(target){
			var offset = target.offset();
			this._getInst(target).mdpDiv.css({position: 'absolute', left: offset.left, top: offset.top + target.height()});
		},
		//统一设置日历层的事件监听
		_addListeners: function(target, onSelect){
			var me = this,
				mdpDiv = me._getInst(target).mdpDiv;
			
			//确定和取消按钮
			var selectChange = function(){
				var dateRange ={};
				dateRange.startDate = me._getInst(target).startDate;
				dateRange.endDate = me._getInst(target).endDate;
				if (onSelect){
					onSelect(dateRange);
				}
				mdpDiv.hide();
			};
			mdpDiv.find('.confirm').button().mousedown(selectChange);
			mdpDiv.find('.cancel').button().mousedown(function(){
				me._getInst(target).mdpDiv.hide();
			});
			mdpDiv.find('.ui-icon-closethick').mousedown(function(){
				me._getInst(target).mdpDiv.hide();
			});
			
			//按钮点击时显示日历
			var showPicker = function(){
				if (me._getInst(target).startDate){
					mdpDiv.find('#startPicker').datepicker('setDate', me._getInst(target).startDate);
					mdpDiv.find('#endPicker').datepicker('option', 'minDate', me._getInst(target).startDate);
					mdpDiv.find('#endPicker').datepicker('setDate', me._getInst(target).endDate);
					mdpDiv.find('#startPicker').datepicker('option', 'maxDate', me._getInst(target).endDate);
				}
				mdpDiv.show();
			};
			target.click(showPicker);
			
			//快捷日期选择事件
			var quickSelect = function(event){
				$(event.target).parent().find('a').each(function(key, item){
					$(item).removeClass('selected-quick');
				});
				var	rangeId = $(event.target).addClass('selected-quick').attr('qid');
				var dateRange,
					startMillionSecond,
					endMillionSecond;
				switch(rangeId){
					case 'yesterday':
						dateRange = Config.dateOption['yesterday'].getValue();
						dateRange.startDate = $.dateToString(dateRange.startDate);
						dateRange.endDate = $.dateToString(dateRange.endDate);
						break;
					case 'week':
						dateRange = Config.dateOption['recentseven'].getValue();
						dateRange.startDate = $.dateToString(dateRange.startDate);
						dateRange.endDate = $.dateToString(dateRange.endDate);
						break;
					case 'lastweek':
						dateRange = Config.dateOption['lastweek'].getValue();
						dateRange.startDate = $.dateToString(dateRange.startDate);
						dateRange.endDate = $.dateToString(dateRange.endDate);
						break;
					case 'month':
						dateRange = Config.dateOption['month'].getValue();
						dateRange.startDate = $.dateToString(dateRange.startDate);
						dateRange.endDate = $.dateToString(dateRange.endDate);
						break;
					case 'lastmonth':
						dateRange = Config.dateOption['lastmonth'].getValue();
						dateRange.startDate = $.dateToString(dateRange.startDate);
						dateRange.endDate = $.dateToString(dateRange.endDate);
						break;
					default:
						break;
				}
				
				//设置_getInst(target).startDate和endDate的值
				me._getInst(target).startDate = dateRange.startDate;
				me._getInst(target).endDate = dateRange.endDate;
				
				mdpDiv.hide();
				onSelect(dateRange);
			};
			mdpDiv.find('.quick-select a').click(quickSelect);
		},
		_setDatesMultidatepicker: function(target, defaultDates){
			var pickerObj = this._getInst(target).mdpDiv;
			this._getInst(target).startDate = defaultDates.startDate;
			//pickerObj.find('#startPicker').datepicker('setDate', defaultDates.startDate);
			//mdpDiv.find('#endPicker').datepicker('option', 'minDate', me._getInst(target).startDate);
			this._getInst(target).endDate = defaultDates.endDate;
			//pickerObj.find('#endPicker').datepicker('setDate', defaultDates.endDate);
			//mdpDiv.find('#startPicker').datepicker('option', 'maxDate', me._getInst(target).endDate);
			//设置按钮文字
			target.button('option', 'label', defaultDates.startDate + '至' + defaultDates.endDate);
		}
	});
	
	$.multidatepicker = new MultiDatepicker();
	$.multidatepicker.initialized = false;
	$.fn.multidatepicker = function(options){
		if (!this.length){
			return this;
		}
		
		if (!$.multidatepicker.initialized){
			$.multidatepicker.mdpDiv.hide();
			$(document).mousedown($.multidatepicker._externalClickHandler).find(document.body).append($.multidatepicker.mdpDiv);
			$.multidatepicker.initialized = true;
		}
		
		var otherArgs = Array.prototype.slice.call(arguments, 1);
		if (typeof options == 'string' && arguments.length == 2){
			return $.multidatepicker['_' + options + 'Multidatepicker'].
			apply($.multidatepicker, [this].concat(otherArgs));
		}
		
		if (typeof options !== 'string'){
			$.multidatepicker.init(this, options);
		}
	};
})(jQuery);