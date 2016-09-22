var market = {
	module: function(){
		var modules = {};
		return function(name){
			if (modules[name]){
				return modules[name];
			}
			
			return modules[name] = {};
		}
	}()
};
$(document).ready(function(){
	var marketMain = market.module('main').init();
});