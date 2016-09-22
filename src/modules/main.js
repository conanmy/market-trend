(function(Main){
	Main.init = function(){
		Main.rangeSelect.model = new Main.rangeSelect.Model;
		Main.rangeSelect.view = new Main.rangeSelect.View({model: Main.rangeSelect.model, el: $('#rangeSetting')});
	};
	
	//获取上个月同样日期的7天数据，再加上个月接下来的7天数据
	Main.getLastMonthCompare = function(){
        var begin = new Date(Config.now.getTime()),
            end = new Date(Config.now.getTime());
        
        end.setMonth(end.getMonth() - 1);
        end.setDate(end.getDate() + 6);
        
        begin.setMonth(begin.getMonth() - 1);
        begin.setDate(begin.getDate() - 7);
        begin.setHours(0,0,0,0);
		end.setHours(0,0,0,0);
        return {
            startDate:begin,
            endDate:end
        };
   	};
})(market.module('main'));