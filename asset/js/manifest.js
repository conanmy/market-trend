/*********library**********/
document.write('<script type="text/javascript" src="src/lib/jquery-1.8.2.js"></script>');
document.write('<script type="text/javascript" src="src/lib/jquery-ui-1.9.0.custom.js"></script>');
document.write('<script type="text/javascript" src="src/lib/jquery.ui.datepicker-zh-CN.js"></script>');
/*********backbone系列*********/
document.write('<script type="text/javascript" src="src/lib/underscore-1.3.1.js"></script>');
document.write('<script type="text/javascript" src="src/lib/backbone.js"></script>');//依赖underscore和jquery
/*********chart*********/
document.write('<script type="text/javascript" src="src/lib/zrender.js"></script>');
/*********tool functions**********/
document.write('<script type="text/javascript" src="src/jq-extend.js"></script>');
/*********Core files*********/
document.write('<script type="text/javascript" src="src/market.js"></script>');
document.write('<script type="text/javascript" src="src/config.js"></script>');
document.write('<script type="text/javascript" src="src/request.js"></script>');
document.write('<script type="text/javascript" src="src/debug/request.js"></script>');
/*********UI，其中region依赖于config，multidatepicker依赖于jq-extend*********/
document.write('<script type="text/javascript" src="src/ui/MultiDatepicker.js"></script>');
document.write('<script type="text/javascript" src="src/ui/Region.js"></script>');
document.write('<script type="text/javascript" src="src/ui/TopN.js"></script>');
/*********modules*********/
document.write('<script type="text/javascript" src="src/modules/main.js"></script>');
document.write('<script type="text/javascript" src="src/modules/businessTrend.js"></script>');
document.write('<script type="text/javascript" src="src/modules/potentialBusiness.js"></script>');
document.write('<script type="text/javascript" src="src/modules/rangeSelect.js"></script>');
document.write('<script type="text/javascript" src="src/modules/trendChart.js"></script>');
document.write('<script type="text/javascript" src="src/modules/wordRank.js"></script>');