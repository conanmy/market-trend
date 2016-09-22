var Config ={};
/**
 * 地域列表
 */
Config.REGION_TREE = [
    {
        id: 'China',
        text: '全部地区',//中国地区
        children: [
            {
                id: "North",
                text: "华北地区",
                children: [
                    {id: "1", text: "北京"},
                    {id: "3", text: "天津"},
                    {id: "13", text: "河北"},
                    {id: "26", text: "山西"},
                    {id: "22", text: "内蒙古"}
                ]
            },
            {
                id: "NorthEast",
                text: "东北地区",
                children: [
                    {id: "21", text: "辽宁"},
                    {id: "18", text: "吉林"},
                    {id: "15", text: "黑龙江"}
                ]
            },
            {
                id: "East",
                text: "华东地区",
                children: [
                    {id: "2", text: "上海"},
                    {id: "19", text: "江苏"},
                    {id: "32", text: "浙江"},
                    {id: "9", text: "安徽"},
                    {id: "5", text: "福建"},
                    {id: "20", text: "江西"},
                    {id: "25", text: "山东"}
                ]
            },
            {
                id: "Middle",
                text: "华中地区",
                children: [
                    {id: "14", text: "河南"},
                    {id: "16", text: "湖北"},
                    {id: "17", text: "湖南"}
                ]
            },
            {
                id: "South",
                text: "华南地区",
                children: [
                    {id: "4", text: "广东"},
                    {id: "8", text: "海南"},
                    {id: "12", text: "广西"}
                ]
            },
            {
                id: "SouthWest",
                text: "西南地区",
                children: [
                    {id: "33", text: "重庆"},
                    {id: "28", text: "四川"},
                    {id: "10", text: "贵州"},
                    {id: "31", text: "云南"},
                    {id: "29", text: "西藏"}
                ]
            },
            {
                id: "NorthWest",
                text: "西北地区",
                children: [
                    {id: "27", text: "陕西"},
                    {id: "11", text: "甘肃"},
                    {id: "24", text: "青海"},
                    {id: "23", text: "宁夏"},
                    {id: "30", text: "新疆"}
                ]
            }/*,
            {
                id: "Other",
                text: "其他地区",
                children: [
                    {id: "34", text: "香港"},
                    {id: "36", text: "澳门"},
                    {id: "35", text: "台湾"}
                ]
            }*/
        ]
    }/*,
    {
        id: 'Abroad',
        text: '国外',
        children: [
            {id: '7', text: '日本'},
            {id: '37', text: '其他国家'}
        ]
    }*/
];
/**
 * 日历快捷控件的配置项
 */
Config.now = new Date();
Config.dateOption = {
	yesterday: {
        text:'昨天',
		optionIdx:0,
        getValue: function () {
            var yesterday = new Date(Config.now.getTime());
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0,0,0,0);
            return {
                startDate: yesterday,
                endDate: yesterday
            };
        }
    },
    recentseven: {
        text:'最近7天',
		optionIdx:1,
        getValue: function () {
            var begin = new Date(Config.now.getTime()),
                end = new Date(Config.now.getTime());
            
            end.setDate(end.getDate() - 1);
            begin.setDate(begin.getDate() - 7);
            begin.setHours(0,0,0,0);
			end.setHours(0,0,0,0);
            return {
                startDate:begin,
                endDate:end
            };
        }
    },
    lastweek: {
        text:'上周',
		optionIdx:2,
        getValue: function () {
            var now = Config.now,
                begin = new Date(now.getTime()),
				end = new Date(now.getTime()),
				_wd = 1; //周一为第一天;
           	
			if (begin.getDay() < _wd%7) {
				begin.setDate(begin.getDate() - 14 + _wd - begin.getDay());
			} else {
				begin.setDate(begin.getDate() - 7 - begin.getDay() + _wd % 7);
			}				
			begin.setHours(0,0,0,0);		
			end.setFullYear(begin.getFullYear(), begin.getMonth(), begin.getDate() + 6);
			end.setHours(0,0,0,0);
			                 
            return {
                startDate:begin,
                endDate:end
            };
        }
    },
    month: {
        text:'本月',
		optionIdx:3,
        getValue: function () {
            var now = Config.now,
                begin = new Date(now.getTime()),
				end = new Date(now.getTime());
            begin.setDate(1);
            begin.setHours(0,0,0,0);
            end.setDate(end.getDate() - 1);
			end.setHours(0,0,0,0);
            return {
                startDate:begin,
                endDate:end
            };
        }
    },
    lastmonth: {
        text:'上个月',
		optionIdx:4,
        getValue: function () {
            var now = Config.now,
                begin = new Date(now.getFullYear(), now.getMonth() - 1, 1),
                end = new Date(now.getFullYear(), now.getMonth(), 1);
            end.setDate(end.getDate() - 1);
            begin.setHours(0,0,0,0);
			end.setHours(0,0,0,0);
            return {
                startDate:begin,
                endDate:end
            };
        }
    },
    quarter: {
		text:'本季度',
		optionIdx: 8,
        getValue: function () {
            var now = Config.now,
                begin = new Date(now.getFullYear(), now.getMonth() - now.getMonth()%3, 1),
                end = new Date(now.getTime());
            end.setDate(end.getDate() - 1);
            begin.setHours(0,0,0,0);
			end.setHours(0,0,0,0);
            return {
                startDate:begin,
                endDate:end
            };
        }
	},
    lastquarter: {
        text:'上个季度',
		optionIdx:5,
        getValue: function () {
            var now = Config.now,
                begin = new Date(now.getFullYear(), now.getMonth() - now.getMonth()%3 - 3, 1),
                end = new Date(now.getFullYear(), now.getMonth() - now.getMonth()%3, 1);
            end.setDate(end.getDate() - 1);
            begin.setHours(0,0,0,0);
			end.setHours(0,0,0,0);
            return {
                startDate:begin,
                endDate:end
            };
        }
    },
    recentfourteen: {
        text:'最近14天',
		optionIdx:7,
        getValue: function () {
            var begin = new Date(this.now.getTime()),
                end = new Date(this.now.getTime());
            
            end.setDate(end.getDate() - 1);
            begin.setDate(begin.getDate() - 14);
            begin.setHours(0,0,0,0);
			end.setHours(0,0,0,0);
            return {
                startDate:begin,
                endDate:end
            };
        }
    },
    recentmonth: {
        text:'最近一个月',
		optionIdx:9,
        getValue: function () {
            var now = Config.now,
                begin = new Date(now.getTime()),
				end = new Date(now.getTime());
            begin.setMonth(begin.getMonth() - 1);
            end.setDate(end.getDate() - 1);
            begin.setHours(0,0,0,0);
			end.setHours(0,0,0,0);
            return {
                startDate:begin,
                endDate:end
            };
        }
    },
    all: {
        text:'所有时间',
		optionIdx:6,
        getValue: function () {                
            return {
                startDate:"",
                endDate:""
            };
        }
    }
};
Config.getRegionMap = function(){
	var regionMap = {};
	//设置默认地域数组变量
	for (var countryKey in Config.REGION_TREE){
		for (var areaKey in Config.REGION_TREE[countryKey].children){
			if (!Config.REGION_TREE[countryKey].children[areaKey].children){
				var areaItem = Config.REGION_TREE[countryKey].children[areaKey];
				regionMap[areaItem.id] = areaItem.text;
			}else{
				for (var key in Config.REGION_TREE[countryKey].children[areaKey].children){
					var item = Config.REGION_TREE[countryKey].children[areaKey].children[key];
					regionMap[item.id] = item.text;
				}
			}
		}
	}
	return regionMap;
};

/*Config.regionMap = [["全部地域",0],["北京",1],["上海",2],["天津",3],["广东",4],["福建",5],[],["日本",7],["海南",8],["安徽",9],["贵州",10],["甘肃",11],
			["广西",12],["河北",13],["河南",14],["黑龙江",15],["湖北",16],["湖南",17],["吉林",18],["江苏",19],["江西",20],
			["辽宁",21],["内蒙古",22],["宁夏",23],["青海",24],["山东",25],["山西",26],["陕西",27],["四川",28],["西藏",29],
			["新疆",30],["云南",31],["浙江",32],["重庆",33],["香港",34],["台湾",35],["澳门",36],["其他国家",37] ];*/