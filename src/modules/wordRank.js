(function(Main){	
	Main.wordRank = {
		Model: Backbone.Model.extend({
			//目前的数据有weekTopnData，monthTopnData，monthInited(标识月排行是否完成了初始化)，busiName，busiId
		}),
		View: Backbone.View.extend({
			initialize: function(){
				var me = this;
				me.Dialog = $('#potentialBusiness .detail_ranking').dialog({
					width: 850,
					autoOpen: false,
					modal: true
				});
				//下载按钮
				$('#keywordDownload').button();
				
				me.render();
				me.model.set('monthInited', false);
			},
			events: {
				'click .label_choice': 'listenForChoice',
				'click #keywordDownload':'listenDownload'
			},
			//重置为另一个行业的关键词排行内容
			render: function(){
				var me = this;
				
				me.Dialog.dialog('option', 'title', '“' + me.model.get('busiName') + '”' + '行业详情');
				//初始化radio选项组件
				$('#subRankWeekRadio').prop('checked', true);
				$('#subRankMonthRadio').prop('checked', false);
				$('#subRankChoice').buttonset();
				//打开
				me.Dialog.dialog('open');
				//重新渲染周排行榜
				me.fetchData('week', function(){
					//确保周数据显示，月数据隐藏
					if ($('#topnWeek').is(':hidden')){
						$('#topnWeek').show();
					}
					if (!$('#topnMonth').is(':hidden')){
						$('#topnMonth').hide();
					}
					
					if (me.topnWeekSearch){
						me.refreshWeekTopn();
					}else{
						me.initWeekTopn();
					}
					me.model.set('range', 'week');
				});
			},
			/*
			 * @param type{string}week/month 标识获取周数据还是月数据
			 */
			fetchData: function(type, callback){
				var me = this,
					attrName = type + 'TopnData';
				
				//需要时间范围参数
				var range;
				switch(type){
					case 'week':
						range = Config.dateOption.recentseven.getValue();
						break;
					case 'month':
						range = Config.dateOption.recentmonth.getValue();
						break;
				}
				//提示加载中
				$('#wordrankLoadingTip').html(market.module('request').loadingTpl).show();
				market.module('request').send('/cbd/word', {
					data: {
						startDate: $.dateToString(range.startDate),
						endDate: $.dateToString(range.endDate),
						region: Main.rangeSelect.model.get('region').join(','),
						busiId: me.model.get('busiId')
					},
					complete: function(){
						//隐藏加载中
						$('#wordrankLoadingTip').hide();
					},
					success: function(response){
						var copyData = $.extend(true, {}, response.data);
						me.model.set(attrName, copyData);
						callback.call();
					}
				});
			},
			/*
			 * @param 
			 * range{string} week/month
			 * type{string} search/show
			 * @return 整个的config配置
			 */
			topnConfig: function(range, type){
				var tpl = {
					//main: $('#topnWeekSearch'),
					//data: this.model.get('weekTopnData').search,
					keys: [null, 'word','value'],
					values: [null, 
					function(item){
						return '<span title="' + item['word'] +'">' + $.getCutString(item['word'], 12, '..') + '</span>';
					},
					function(item){
						var text = '约' +　item['value'];
						if ((item['value'] - 0) > 20000){
							text = '>20000';
						}else if((item['value'] - 0) < 5){
							text = '<5';
						}
						return '<div class="value-bar"></div><span class="value-literal">' 
						+ text +'</span>';
					}],
					//headers: ['排行', '关键词', '搜索量'],
					mainKey: 'value',
					barKey: 'value'
				};
				switch(range){
					case 'week':
						switch(type){
							case 'show':
								tpl.main = $('#topnWeekShow');
								tpl.data = this.model.get('weekTopnData').show;
								tpl.headers = ['排行', '关键词', '展现量'];
								break;
							case 'search':
								tpl.main = $('#topnWeekSearch');
								tpl.data = this.model.get('weekTopnData').search;
								tpl.headers = ['排行', '关键词', '搜索量'];
								break;
						}
						break;
					case 'month':
						switch(type){
							case 'show':
								tpl.main = $('#topnMonthShow');
								tpl.data = this.model.get('monthTopnData').show;
								tpl.headers = ['排行', '关键词', '展现量'];
								break;
							case 'search':
								tpl.main = $('#topnMonthSearch');
								tpl.data = this.model.get('monthTopnData').search;
								tpl.headers = ['排行', '关键词', '搜索量'];
								break;
						}
						break;
				}
				
				return tpl;
			},
			initWeekTopn: function(){
				//周数据排行榜渲染
				this.topnWeekSearch = new TopN(this.topnConfig('week', 'search'));
				this.topnWeekShow = new TopN(this.topnConfig('week', 'show'));
			},
			initMonthTopn: function(){
				this.topnMonthSearch = new TopN(this.topnConfig('month', 'search'));
				this.topnMonthShow = new TopN(this.topnConfig('month', 'show'));
				
				this.model.set('monthInited', true);
			},
			refreshWeekTopn: function(){
				this.topnWeekSearch.refresh(this.model.get('weekTopnData').search);
				this.topnWeekShow.refresh(this.model.get('weekTopnData').show);
			},
			refreshMonthTopn: function(){
				this.topnMonthSearch.refresh(this.model.get('monthTopnData').search);
				this.topnMonthShow.refresh(this.model.get('monthTopnData').show);
			},
			listenForChoice: function(event){
				var me = this,
					targetDom = $(event.target).parent();
				if (targetDom.attr('aria-pressed')){
					var choice = targetDom.attr('mark');
					switch(choice){
						case 'week':
							if ($('#topnWeek').is(':hidden')){
								$('#topnWeek').show();
								$('#topnMonth').hide();
							}
							me.model.set('range', 'week');
							break;
						case 'month':
							//如果还没有打开过月排行
							if (!me.model.get('monthInited')){
								me.fetchData('month', function(){
									me.changeViewTo('month');
									me.initMonthTopn();
								});
							}else{
								//如果还没有获得本行业的月数据
								if (!me.model.get('monthTopnData')){
									me.fetchData('month', function(){
										me.changeViewTo('month');
										me.refreshMonthTopn();
									});
								}else{
									if ($('#topnMonth').is(':hidden')){
										me.changeViewTo('month');
									}
								}
							}
							me.model.set('range', 'month');
							break;
					}
				}
			},
			listenDownload: function(){
				var me = this;
				if (me.downloadDialog){
					me.downloadDialog.dialog('open');
				}else{
					var range,
						type = me.model.get('range');
					switch(type){
						case 'week':
							range = Config.dateOption.recentseven.getValue();
							break;
						case 'month':
							range = Config.dateOption.recentmonth.getValue();
							break;
					}
					
					me.downloadDialog = $('<div id="downloadDialog">'
					+ '<input type="radio" name="file_type" value="csv" checked="checked"/><label>CSV格式</label>'
					+ '<input type="radio" name="file_type" value="txt" /><label>TXT格式</label></div>').dialog({
						title: '下载关键词',
						zIndex: 1001,
						buttons: {
							下载: function(){
								var file_type = $(this).find('input[name="file_type"]:checked')[0].value,
									params = {
										//keywords: me.model.get(me.model.get('range') + 'topnData'),
										startDate: $.dateToString(range.startDate),
										endDate: $.dateToString(range.endDate),
										region: Main.rangeSelect.model.get('region').join(','),
										busiId: me.model.get('busiId'),
										format: file_type
									},
									form = $('#downloadWordsForm')[0];
								
						        form['params'].value = $.stringify(params);
						        
						        form.submit();
						        
								$(this).dialog('close');
							},
							取消: function(){
								$(this).dialog('close');
							}
						}
					});
				}
			},
			/*
			 * @param type {string}要切换到的类型 week/month
			 */
			changeViewTo: function(type){
				switch(type){
					case 'week':
						$('#topnWeek').show();
						$('#topnMonth').hide();
						break;
					case 'month':
						$('#topnMonth').show();
						$('#topnWeek').hide();
						break;
				}
			}
		})
	};
})(market.module('main'));