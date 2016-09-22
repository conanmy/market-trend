(function(Request){
	Request.send = function(url, options){
		//统一设置发生物理失败时的响应
		options.error = function(jqXHR, textStatus){
			$('<div id="errorDialog"><span>' + textStatus + '</span></div>').dialog({
				title: '请求失败',
				close: function(){
					$(this).dialog('destroy');
				}
			});
		};
		
		var userCallback = options.success;
		
		options.success = function(response){
			Request.response(response, userCallback);
		};
		
		var tempData = options.data;
		options.data = {
			params: tempData
		};
		options.data.params = $.stringify(options.data.params);
		return $.ajax(url, options);
	};
	//有数据返回时的响应，在对数据做处理后判断是否成功再调用配置的callback
	Request.response = function(response, callback){
		response = $.parseJSON(response);
		
		if (response && response.status == '200'){
			callback(response);
		}else{
			$('<div id="errorDialog"><span>数据响应出现异常</span></div>').dialog({
				title: '数据异常',
				close: function(){
					$(this).dialog('destroy');
				}
			});
		}
	};
	Request.loadingTpl = '数据加载中<span class="loading_icon"></span>';
})(market.module('request'));
