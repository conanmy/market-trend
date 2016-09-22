(function(Main){
	Main.potentialBusiness = {
		Model: Backbone.Model.extend({
		}),
		View: Backbone.View.extend({
			initialize: function(){
				this.model.bind('change:topnData', this.render, this);
				this.topnBusiness = new TopN({
					main: $('#topnPotential'),
					data: this.model.get('topnData'),
					keys: [null, 'name','value', 'value'],
					values: [null, function(item){
						return '<span title="' + item['name'] +'">' + $.getCutString(item['name'], 10, '..') + '</span>';
					},function(item){
						return '<div class="value-bar"></div><span class="value-literal">' + item['value'] +'%</span>';
					}, function(item){
						return '<a busiId="' + item.id + '" busiName="' 
						+ item.name + '" class="view-detail link">详情</a>';
					}],
					headers: ['排行', '行业', '不饱和度'],
					mainKey: 'value',
					barKey: 'value'
				});
			},
			events: {
				'click .view-detail': 'initWords'
			},
			render: function(){
				this.topnBusiness.refresh(this.model.get('topnData'));
			},
			initWords: function(event){
				var busiId = $(event.target).attr('busiId'),
					busiName = $(event.target).attr('busiName');
				if (!Main.wordRank.model){
					Main.wordRank.model = new Main.wordRank.Model();
				}
				Main.wordRank.model.set({
					'busiName': busiName,
					'busiId': busiId
				});
				if (!Main.wordRank.view){
					Main.wordRank.view = new Main.wordRank.View({
						model:  Main.wordRank.model,
						el: $('#potentialBusiness .detail_ranking')
					});
				}else{
					//重新渲染
					Main.wordRank.model.unset('monthTopnData', {silence: true});
					Main.wordRank.view.render();
				}
			}
		})
	};
})(market.module('main'));