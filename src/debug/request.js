(function(Request){
	Request.debug = {
		returnTpl: function(){
			return {
				status: 200,
				data: {},
				error: {}
			};
		},
		response : function(url, options){
			if (options.success){
				setTimeout(function(){
					options.success(Request.debug[url]());
					setTimeout(function(){
						options.complete();
					}, 10);
				}, 1000);
			}
		}
	};
	Request.send = function(url, options){
		return this.debug.response(url, options);
	};
	
	//具体的伪造数据
	Request.debug['/cbd/capcity'] = function(params){
		var rel = new this.returnTpl();
		rel.data = {
			potential: [
			],
			trend: [
			]
		};
		for (var i = 0; i < 15; i++){
			var itemPo = {
					id: 3*i + 1,
					name: (i%2) ? '超级纸张制造业' : '植被绿化',
					value: $.getCutString(100*Math.random() + '', 4) - 0
				},
				itemTr = {
					id: 4*i + 1,
					name: (i%2) ? '少年儿童培训课程' : '英语学',
					value: Math.floor(100*Math.random())
				};
			rel.data.potential.push(itemPo);
			rel.data.trend.push(itemTr);
		};
		return rel;
	};
	Request.debug['/cbd/word'] = function(params){
		var rel = new this.returnTpl();
		rel.data = {
			search:[],
			show:[]
		};
		for (var i = 0; i < 30; i++){
			var itemSearch = {
					id: 3*i + 1,
					word: (i%2) ? '买优质纸杯' : '绿化植被用什么工具好呢',
					value: Math.floor(100*(Math.random())) + 2
				},
				itemShow = {
					id: 4*i + 1,
					word: (i%2) ? '女朋友的礼物' : '生活提案可以有什么好处',
					value: Math.floor(30000*(Math.random())) + 1
				};
			rel.data.search.push(itemSearch);
			rel.data.show.push(itemShow);
		};
		return rel;
	};
	Request.debug['/cbd/trend'] = function(params){
		var rel = new this.returnTpl();
		rel.data = {
			history:[],
			current:[]
		};
		for (var i = 0; i < 14; i++){
			var dateItemHistory = new Date();
			dateItemHistory.setDate(dateItemHistory.getDate() + i);
			dateItemHistory.setMonth(dateItemHistory.getMonth() - 1);
			var	itemHistory = {
					date: dateItemHistory.getTime(),
					value: 4*Math.floor(100*(Math.random())) + 2
				};
			rel.data.history.push(itemHistory);
		};
		for (var i = 0; i < 7; i++){
			var dateItemCurrent = new Date();
			dateItemCurrent.setDate(dateItemCurrent.getDate() + i);
			var	itemCurrent = {
					date: dateItemCurrent.getTime(),
					value: Math.floor(100*(Math.random())) + 1
				};
			rel.data.current.push(itemCurrent);
		};
		return rel;
	};
	Request.debug.file_keyword_download = function(params){
		var rel = new this.returnTpl();
		rel.data = {};
		return rel;
	};
})(market.module('request'));