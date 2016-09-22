(function(Main){
	Main.businessTrend = {
		Model: Backbone.Model.extend({
		}),
		View: Backbone.View.extend({
			initialize: function(){
				this.model.bind('change:topnData', this.render, this);
				this.topnBusiness = new TopN({
					main: $('#topnDeveloped'),
					data: this.model.get('topnData'),
					keys: [null, 'name','value', 'value'],
					values: [null, function(item){
						return '<span title="' + item['name'] +'">' + $.getCutString(item['name'], 10, '..') + '</span>';
					},function(item){
						return '<div class="value-bar"></div><span class="value-literal">' + item['value'] +'</span>';
					}, function(item){
						return '<a busiId="' + item.id + '" busiName="' 
						+ item.name + '" class="view-detail link">趋势</a>';
					}],
					headers: ['排行', '行业', '热门程度'],
					mainKey: 'value',
					barKey: 'value'
				});
			},
			events: {
				'click .view-detail': 'initChart'
			},
			render: function(){
				this.topnBusiness.refresh(this.model.get('topnData'));
			},
			initChart: function(event){
				var busiId = $(event.target).attr('busiId'),
					busiName = $(event.target).attr('busiName');
				
				if (!Main.trendChart.model){
					Main.trendChart.model = new Main.wordRank.Model();
				}
				Main.trendChart.model.set({'busiName': busiName, 'busiId': busiId});
				if (!Main.trendChart.view){
					Main.trendChart.view = new Main.trendChart.View({
						model:  Main.trendChart.model,
						el: $('#businessTrend .detail_chart')
					});
				}else{
					//重新渲染
					Main.trendChart.model.unset('monthChartData', {silence: true});
					Main.trendChart.model.unset('quarterChartData', {silence: true});
					Main.trendChart.view.render();
				}
			}
		})
	};
})(market.module('main'));