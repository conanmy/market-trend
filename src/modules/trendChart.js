(function(Main){
	Main.trendChart = {
		Model: Backbone.Model.extend({
			//目前的数据有weekChartData，monthChartData，quarterChartData，monthInited(标识月排行是否完成了初始化)，quarterInited，busiName，busiId
		}),
		View: Backbone.View.extend({
			initialize: function(){
				var me = this;
				me.Dialog = $('#businessTrend .detail_chart').dialog({
					width: 1050,
					autoOpen: false,
					modal: true
				});
				
				me.model.set('range', 'week');
				me.model.bind('change:range', me.refreshData, me);
				me.render();
			},
			events: {
				'click .label_choice': 'listenForChoice'
			},
			render: function(){
				var me = this;
				me.Dialog.dialog('option', 'title', '“' + me.model.get('busiName') + '”' + '行业详情');
				
				$('#subChartWeekRadio').prop('checked', true);
				$('#subChartMonthRadio').prop('checked', false);
				$('#subChartQuarterRadio').prop('checked', false);
				$('#subChartChoice').buttonset();
				
				me.fetchData('week', function(){
					me.Dialog.dialog('open');
					me.model.set('range', 'week', {silence: true});
					me.refreshData();
				});
			},
			refreshData: function(){
				var me = this;
				me.renderDiagram(me.model.get(me.model.get('range') + 'ChartData').history, 
					me.model.get(me.model.get('range') + 'ChartData').current,
					'detailChart');
			},
			/*
			 * @param type{string}week/month/quarter 标识获取周数据月数据或者季度数据
			 */
			fetchData: function(type, callback){
				var me = this,
					attrName = type + 'ChartData';
				
				//需要时间范围参数
				var historyRange, currentRange;
				switch(type){
					case 'week':
						historyRange = Main.getLastMonthCompare();
						currentRange = Config.dateOption.recentseven.getValue();
						break;
					case 'month':
						historyRange = Config.dateOption.lastmonth.getValue();
						currentRange = Config.dateOption.month.getValue();
						break;
					case 'quarter':
						historyRange = Config.dateOption.lastquarter.getValue();
						currentRange = Config.dateOption.quarter.getValue();
						break;
				}
				//提示加载中
				$('#trendchartLoadingTip').html(market.module('request').loadingTpl).show();
				market.module('request').send('/cbd/trend', {
					data: {
						startDate: $.dateToString(currentRange.startDate),
						endDate: $.dateToString(currentRange.endDate),
						historyStartDate: $.dateToString(historyRange.startDate),
						historyEndDate: $.dateToString(historyRange.endDate),
						region: Main.rangeSelect.model.get('region').join(','),
						busiId: me.model.get('busiId')
					},
					complete: function(){
						//隐藏加载中
						$('#trendchartLoadingTip').hide();
					},
					success: function(response){
						var chartData = me.processData(response.data);
						me.model.set(attrName, chartData);
						callback.call();
					}
				});
			},
			//处理后端返回的图表数据,return新数据
			processData: function(data){
				var currentLen = data.current.length,
					historyLen = data.history.length,
					lastCurDate = data.current[currentLen - 1].date;
				//补全当前日期对应历史的范围
				for (var i = currentLen; i < historyLen; i ++){
					lastCurDate = lastCurDate + 24*3600*1000;
					data.current.push({
						date: lastCurDate,
						value: ''
					});
				}
				
				var tempDate = new Date,
					newData = {
						current: [],
						history: []
					};
				for (var j = 0; j < historyLen; j++){
					tempDate.setTime(data.current[j].date);
					newData.current.push({name: $.dateToString(tempDate), value: data.current[j].value});
					tempDate.setTime(data.history[j].date);
					newData.history.push({name: $.dateToString(tempDate), value: data.history[j].value});
				}
				
				return newData;
				
			},
			//zrender渲染图表方法
			renderDiagram: function(oldData, newData, domId){
		        var reformData = [], 
		            xTextOld = ['历史趋势'], 
		            xTextNew = ['新趋势'];
		        for (var i = 0, l = oldData.length; i < l; i++){
		            reformData.push({
		                name : newData[i].name,
		                value : [newData[i].value, oldData[i].value]
		            });
		            xTextOld.push(oldData[i].name);
		        }
		        zrender.dispose();
		        
		        var zr = zrender.init(document.getElementById(domId));
		        zr.clear();
		        //乱来
		        zr.addShape('kener',{
		            idx:'kener',
		            type:'fill',
		            'shape' : 'rectangle',
		            'x' : 80,
		            'y' : 40,
		            'width' : zr.getWidth() - 130,
		            'height' : zr.getHeight() - 100,
		            'color' : "rgba(255,255,255,0.01)"
		        });
		        var axOld = new zrender.component.Axis(zr,{
		            xMax : xTextOld.length,
		            xGap : 1,
		            y:30,
		            height:300,
		            COLOR_AU : '#fff',
		            COLOR_AX : '#b0c4de',
		            yDirection : 'down',
		            xText : xTextOld,
		            yText : [' ',' ']
		        });
		        
		        var axNew = new zrender.component.Axis(zr,{
		            COLOR_AX:'#ffa500'
		        });
		        var bl = new zrender.diagram.BrokenLine(zr,{
		            axis : axNew,
		            nameText  : xTextNew,
		            multiValue : 'compare',
		            onHover : function(name, value){
		                var idx = 0;
		                for (var i = 0, l = oldData.length; i < l; i++){
		                    if (newData[i].name == name){
		                        idx = i;
		                        break;
		                    }
		                }
		                //垂直线------
		                var x, area = axNew.getArea();
		                x = axNew.getX(idx + 1);
		                zr.addHoverShape({
		                    'sx' : x,
		                    'sy' : area.y,
		                    'ex' : x,
		                    'ey' : area.y + area.height,
		                    'shape' : 'line',
		                    'color' : 'green',
		                    'lineWidth' : 2
		                });
		                //两水平方块+文字-----
		                var xFrom,yFromOld,yFromNew,
		                    align = 'center',
		                    baseline = 'top',
		                    blockWidth = 220, //方块宽度
		                    blockHeight = 26; //方块高度
		                if (area.x + area.width - x > blockWidth){
		                    //放垂直线右侧
		                    xFrom = x;
		                }else{
		                    //放垂直线左侧
		                    xFrom = x - blockWidth;
		                }
		                if (oldData[idx].value > newData[idx].value){
		                    //旧数据显示在上方
		                    yFromOld = axNew.getY(oldData[idx].value) - blockHeight;
		                    yFromNew = axNew.getY(newData[idx].value);
		                }else{
		                    //新数据显示在上方
		                    yFromOld = axNew.getY(oldData[idx].value);
		                    yFromNew = axNew.getY(newData[idx].value) - blockHeight;
		                }
		                
		                if (oldData[idx].value != ''){
		                    zr.addHoverShape({
		                        shape : 'text',
		                        x : xFrom + Math.ceil(blockWidth/2),
		                        y : yFromOld + 5,
		                        text : '历史趋势(' + oldData[idx].name + ') : ' + oldData[idx].value,
		                        align: align,
		                        baseline : baseline,
		                        maxWidth : blockWidth,
		                        fontSize : 12,
		                        color : 'white',
		                        shadowBlur : 8,
		                        shadowColor : 'yellow'
		                    });
		                    zr.addHoverShape({
		                        'shape' : 'rectangle',
		                        'x' : xFrom,
		                        'y' : yFromOld,
		                        'width' : blockWidth,
		                        'height' : blockHeight,
		                        'color' : zrender.tools.color.getColor(1)
		                    });
		                }
		                
		                if (newData[idx].value != ''){
		                    zr.addHoverShape({
		                        shape : 'text',
		                        x : xFrom + Math.ceil(blockWidth/2),
		                        y : yFromNew + 5,
		                        text : '新趋势(' + newData[idx].name + ') : ' + newData[idx].value,
		                        align: align,
		                        baseline : baseline,
		                        maxWidth : blockWidth,
		                        fontSize : 12,
		                        color : 'white',
		                        shadowBlur : 8,
		                        shadowColor : 'yellow'
		                    });
		                    zr.addHoverShape({
		                        'shape' : 'rectangle',
		                        'x' : xFrom,
		                        'y' : yFromNew,
		                        'width' : blockWidth,
		                        'height' : blockHeight,
		                        'color' : zrender.tools.color.getColor(0)
		                    });
		                }
		                
		                return true;
		            }
		        });
		        bl.setData(reformData)
		       
		        zr.render(1000);
		    },
			listenForChoice: function(event){
				var me =this,
					targetDom = $(event.target).parent();
				if (targetDom.attr('aria-pressed')){
					var choice = targetDom.attr('mark');
					switch(choice){
						case 'week':
							me.model.set('range', 'week');
							break;
						case 'month':
							if (!me.model.get('monthChartData')){
								me.fetchData('month', function(){
									me.model.set('range', 'month');
								});
							}else{
								me.model.set('range', 'month');
							}
							break;
						case 'quarter':
							if (!me.model.get('quarterChartData')){
								me.fetchData('quarter', function(){
									me.model.set('range', 'quarter');
								});
							}else{
								me.model.set('range', 'quarter');
							}
							break;
					}
				}
			}
		})
	};
})(market.module('main'));