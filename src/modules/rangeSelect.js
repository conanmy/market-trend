(function(Main){
	Main.rangeSelect = {
		Model: Backbone.Model.extend({
			//存有dateRange/region
		}),
		View: Backbone.View.extend({
			//其他属性有 defaultRegion {arraty} 默认地域,allRegionLabel {string} 表示选中全部区域的文字
			initialize: function(){
				var me = this;
				
				me.initDate();
				me.initRegion();
				
				//设置model数据监听
				me.model.bind('change:date', me.onResetDate, me);
				me.model.bind('change:region', me.onResetRegion, me);
				
				me.queryTopnBusiness();
			},
			events: {
				'click #regionShow': 'showRegionDialog',
				'click #goSearch': 'queryTopnBusiness'
			},
			initDate: function(){
				var me = this;
				//日期默认设置
				var triggerText;
				if (window.localStorage && localStorage.getItem('date')){
					var dateRange = $.parseJSON(localStorage.getItem('date'));
					me.model.set('date', dateRange);
				}else{
					var defaultDate = me.getDefaultDate();
					me.model.set('date', defaultDate);
				}
				//初始化多选日历组件
				$('#dateSetting').multidatepicker({
					onSelect: function(dateRange){
						//设置model的日期范围数据,{startDate:xx, endDate:xx}
						me.model.set('date', dateRange);
						
					},
					defaultDates: me.model.get('date')
				});
			},
			initRegion: function(){
				var me = this;
				me.allRegionLabel = '全部地区';
				//初始化地域按钮
				$('#regionShow').button({
					icons:{
						secondary: 'ui-icon-triangle-1-s'
					}
				});
				$('#goSearch').button();
				
				me.defaultRegion = me.getDefaultRegion()
				//地域默认设置
				if (window.localStorage && localStorage.getItem('region')){
					var region = localStorage.getItem('region').split(',');
					me.model.set('region', region);
					if (me.model.get('region').length < me.defaultRegion.length){
						labelText = $.getCutString(me.getRegionString(me.model.get('region')), 30, '..');
					}else{
						labelText = me.allRegionLabel;
					}
					$('#regionShow').button('option', 'label', labelText);
				}else{
					me.model.set('region', me.defaultRegion);
					$('#regionShow').button('option', 'label', me.allRegionLabel);
				}
			},
			onResetDate: function(){
				var dateRange = this.model.get('date');
				window.localStorage && localStorage.setItem('date', $.stringify(dateRange));
				$('#dateSetting').button('option', 'label', dateRange.startDate + '至' + dateRange.endDate);
			},
			onResetRegion: function(){
				var me = this,
					labelText,
					region = me.model.get('region').join(',');
				window.localStorage && localStorage.setItem('region', region);
				if (me.model.get('region').length < me.defaultRegion.length){
					labelText = $.getCutString(me.getRegionString(me.model.get('region')), 30, '..');
				}else{
					labelText = me.allRegionLabel;
				}
				$('#regionShow').button('option', 'label', labelText);
			},
			getDefaultDate: function(){
				var defaultDate = Config.dateOption['recentseven'].getValue();
				//设置默认日期变量
				defaultDate.startDate = $.dateToString(defaultDate.startDate);
				defaultDate.endDate = $.dateToString(defaultDate.endDate);
				return defaultDate;
			},
			getDefaultRegion: function(){
				var defaultRegion = [];
				//设置默认地域数组变量
				for (var countryKey in Config.REGION_TREE){
					for (var areaKey in Config.REGION_TREE[countryKey].children){
						if (!Config.REGION_TREE[countryKey].children[areaKey].children){
							var areaIdA = Config.REGION_TREE[countryKey].children[areaKey].id;
							areaIdA && defaultRegion.push(areaIdA);
						}else{
							for (var key in Config.REGION_TREE[countryKey].children[areaKey].children){
								var areaIdB = Config.REGION_TREE[countryKey].children[areaKey].children[key].id;
								areaIdB && defaultRegion.push(areaIdB);
							}
						}
					}
				}
				return defaultRegion;
			},
			/*
			 * @param {array} regionArray 标识地域的数字组成的数组
			 */
			getRegionString: function(regionArray){
				var regionString = '',
					len = regionArray.length,
					regionMap = Config.getRegionMap();
				
				for (var i = 0; i < len; i ++){
					regionString = regionString + regionMap[regionArray[i]] + ' ';
				}
				
				return regionString;
			},
			queryTopnBusiness: function(){
				var me = this;
				//提示加载中
				$('#rangeLoadingTip').html(market.module('request').loadingTpl).show();
				market.module('request').send('/cbd/capcity', {
					data: {
						startDate: me.model.get('date').startDate,
						endDate: me.model.get('date').endDate,
						region: me.model.get('region').join(',')
					},
					complete: function(){
						//隐藏加载中
						$('#rangeLoadingTip').hide();
					},
					success: function(response){
						if ($('.catalog-tab').is(':hidden')){
							$('.catalog-tab').show();
						}
						var copyData = $.extend(true, {}, response.data);
						//潜力行业排行
						if (!Main.potentialBusiness.model) {
							Main.potentialBusiness.model = new Main.potentialBusiness.Model();
						};
						Main.potentialBusiness.model.set({'topnData': copyData.potential});
						if (!Main.potentialBusiness.view) {
							Main.potentialBusiness.view = new Main.potentialBusiness.View({
								model:  Main.potentialBusiness.model,
								el: $('#potentialBusiness')
							});
						};
						//趋势行业排行
						if (!Main.businessTrend.model){
							Main.businessTrend.model = new Main.businessTrend.Model();
						}
						Main.businessTrend.model.set({'topnData': copyData.trend});
						if (!Main.businessTrend.view){
							Main.businessTrend.view = new Main.businessTrend.View({
								model:  Main.businessTrend.model,
								el: $('#businessTrend')
							});
						}
					}
				});
			},
			showRegionDialog: function(){
				var me = this;
				if (document.getElementById('regionDialog')){
					$('#regionDialog').dialog('open');
				}else{
					var regionObj = $('<div id="regionDialog"><div id="regionSetting"></div><div class="toolbar"></div></div>');
					regionObj.appendTo(document.body).dialog({
						title:'账户推广地域',
						width: 500,
						height: 380,
						buttons: {
							确定: function(){
								//设置model的地域范围数据（数组）
								me.model.set('region', $('#regionSetting').getSelectedRegion());
								
								$( this ).dialog( "close" );
							},
							取消: function(){
								$( this ).dialog( "close" );
							}
						}
					});
					$('#regionSetting').region({
						defaultChecked: me.model.get('region')
					});
				}
			}
		})
	};
})(market.module('main'));