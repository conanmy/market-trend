jQuery.extend({
    stringify  : function stringify(obj) {
        var t = typeof (obj);
        if (t != "object" || obj === null) {
            // simple data type
            if (t == "string") obj = '"' + obj + '"';
            return String(obj);
        } else {
            // recurse array or object
            var n, v, json = [], arr = (obj && obj.constructor == Array);

            for (n in obj) {
                v = obj[n];
                t = typeof(v);
                if (obj.hasOwnProperty(n)) {
                    if (t == "string") v = '"' + v + '"'; else if (t == "object" && v !== null) v = jQuery.stringify(v);
                    json.push((arr ? "" : '"' + n + '":') + String(v));
                }
            }
            return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
        }
    },
    dateToString: function(dateObj){
		function keepTwoChars(str){
			if (str.length < 2){
				return '0' + str;
			} else {
				return str;
			}
		}
		var dateString = String(dateObj.getFullYear()) + '-' + keepTwoChars(String(dateObj.getMonth() + 1)) + '-' + keepTwoChars(String(dateObj.getDate()));
		return dateString;
	},
	/**
	 * 字符串求长度(全角)
	 * @param {String} str 需要求长的字符串
	 * @return {Number} 长度
	 * @author zuming@baidu.com
	 */
	getLengthCase: function(str){
		var len = str.length;
		str.replace(/[\u0080-\ufff0]/g, function (){len++;})
		return len;	
	},
	
	/**
	 * 字符串截取部分(全角)
	 * @param {String} str 字符串
	 * @param {Number} len 截断保留长度
	 * @return {String} 截断后的字符串
	 * @author zuming@baidu.com
	 */
	subStrCase: function(str, len) {
		while ($.getLengthCase(str) > len) {
			str = str.substr(0, str.length - 1);
		}
		return str;
	},
	/**
	 * 截取字符串
	 * @param {Object} str 字符串
	 * @param {Object} len 长度
	 * @param {Object} tailStr 尾部添加
	 * @author zuming@baidu.com
	 */
	getCutString: function(str, len, tailStr) {
		if(typeof tailStr == 'undefined'){
			tailStr = '';
		}
		if ($.getLengthCase(str) > len) {
	        str = $.subStrCase(str,len) + tailStr;
			return str;
		} else {
	        return str;
		}
	}
});