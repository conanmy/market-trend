/*
 * 地域选择组件
 * 
 * @params
 * defaultChecked {array}默认选中的地域项
 * 
 */
(function($){
	var region = function(){
		var source = Config.REGION_TREE,
			_dataMap = {},
			_type = 'Region',
			mainDivId = 'uiRegion',
			PROP_NAME ='region',
			checkboxClass = 'region-checkbox',
			rgDivTpl = '<div id="' + mainDivId + '" class="ui-region"><div class="main-region"></div>'
			+'<div class="toolbar"><span class="confirm">确定</span></div></div>',
			//多选选项的html模板
		    _tplOption = '<dt class="<%= bodyClass %>"><input type="checkbox" value="<%= id %>" optionId="<%= id %>"'
		    +'id="<%= completeId %>" class="<%= checkboxClass %>" level="<%= level %>"><label for="<%= completeId %>"><%= text %></label></dt>',
		    /**
		     * 获取dom子部件的css class
		     * 
		     * @protected
		     * @return {string}
		     */
		    __getClass = function ( name ) {
		        var type        = _type.toLowerCase(),
		            suffix      = (name ? '-' + name : ''),
		            className   = [ ('ui-' + type + suffix) ],
		            i, len;
		        
		        return className.join( ' ' );
		    },
		    /**
		     * 获取dom子部件的id
		     * 
		     * @protected
		     * @return {string}
		     */
		    __getId = function ( name ) {
		        var idPrefix = 'ctrl' + _type;
		        if ( name ) {
		            return idPrefix + name;
		        }
		        return idPrefix;
		    },
		    _bindHover = function(target, dontRefreshView){
			    target.delegate('.' + checkboxClass, 'click', function(ev){
			    	_checkHandler(ev.target, target);
			    });
		    },
		    _checkHandler = function(dom, target, dontRefreshView){
		    	var id          = $(dom).attr('optionId');
		        var data        = _dataMap[ id ];
		        var isChecked   = dom.checked;
		        var children    = data.children;
		        var len         = children instanceof Array && children.length;
		        var item;
		        var checkbox;
		        
		        if ( len ) {
		            while ( len-- ) {
		                item = children[ len ];
		                checkbox = target.find('#' + __getId(item.id))[0];
		                checkbox.checked = isChecked;
		                arguments.callee( checkbox, target, 1 );
		            }
		        }
				
		        if ( !dontRefreshView ) {
		            _updateAllCheck(target);
		        }
		    },
		    /*
		     * 根据子选项状态更新父选项状态
		     */
		    _updateAllCheck = function(target, data, dontResetValue){
		    	var data = data || {children: source};
		        if ( !dontResetValue ) {
		            _getInst(target).regionValue = [];
		        }
		        var children = data.children;
		        var len      = children instanceof Array && children.length;
		        var i;
		        var isChecked = true;
		        var isItemChecked;
		        var checkbox = data.id && target.find('#' + __getId(data.id))[0];
				
		        if ( len ) {
		            for ( i = 0; i < len; i++ ) {
		                isItemChecked = _updateAllCheck(target, children[ i ], 1 );
		                isChecked = isChecked && isItemChecked;
		            }
		
		            checkbox && ( checkbox.checked = isChecked );
		            return isChecked;
		        } else {
		            isChecked = checkbox.checked;
					isChecked && _getInst(target).regionValue.push(data.id);
		            return isChecked;
		        }
		    },
		    /**
		     * 初始化数据源，建立id与item的反向映射表
		     *
		     * @private
		     */
		    _initDatasource = function ( data ) {
		        walker.call( null, data, {children: data} );
		        
		        function walker( data, parent ) {
		            var len = data instanceof Array && data.length;
		            var i;
		            var item;
		            
		            if ( !len ) {
		                return;
		            }
		
		            for ( i = 0; i < len; i++ ) {
		                item = $.extend(true, {}, data[ i ] );
		                item.parent = parent;
		                _dataMap[ item.id ] = item;
		                walker.call( null, item.children, item );
		            }
		        }
		    },
		    _getInst = function(target){
		    	return $.data(target[0], PROP_NAME);
		    },
		    _initChecked = function(target, checkedArray){
		    	var len = checkedArray.length;
		    	for (var i = 0; i < len; i++){
		    		var dom = $('#' + __getId(checkedArray[i]));
		    		dom[0].checked = true;
		    	}
		    	_updateAllCheck(target);
		    },
		    /**
		     * 获取选项的html
		     *
		     * @private
		     * @param {Object} data 选项数据
		     * @param {number} level 选项层级
		     * @return {string}
		     */
		    _getOptionHtml = function ( data, level ) {
		        var id              = data.id;
		        var optionClass     = [];
		        var bodyClass       = __getClass('option-body');
		        var childrenClass   = __getClass('option-children');
		        var html            = [];
		        var children        = data.children;
		        var len             = children instanceof Array && children.length;
		        var i;
		        
		        optionClass.push(
		            __getClass('option'),
		            __getClass('option-' + id),
		            __getClass('option-level' + level)
		        );
				
		        html.push(
		            '<dl class="' + optionClass.join(' ') + '">',
		            _.template(
		                _tplOption,
		                {
		                id: id,
		                text: data.text,
		                completeId: __getId(id),
		                bodyClass: bodyClass,
		                level: level,
		                checkboxClass: checkboxClass
		                }
		            ) );
		        
		        if ( len ) {
		            html.push( '<dd class="' + childrenClass + '">' );
		            for ( i = 0; i < len; i++ ) {
		                html.push( _getOptionHtml( children[ i ], level + 1 ) );
		            }
		            html.push( '</dd>' );
		        }
		        html.push( '</dl>' );
		        
		        return html.join( '' );
		    };
		return {
			init: function(options){
				var data    = source;
		        var len     = data.length;
		        var html    = [];
		        var i;
		        var options = options || {};
		        
		        for ( i = 0; i < len; i++ ) {
		            html.push( _getOptionHtml( data[ i ], 0 ) );
		        }
		        
		        this.addClass('ui-region');
		        this.html( html.join( '' ) );
		        $.data(this[0], PROP_NAME, {regionValue: options.regionValue || []});
		        
		        _initDatasource(data);
		        _bindHover(this);
		        
		        if (options.defaultChecked){
		        	_initChecked(this, options.defaultChecked);
		        }
			},
			getSelectedRegion: function(){
				return $.data(this[0], PROP_NAME).regionValue;
			}
		}
	}();
	$.fn.region = region.init;
	$.fn.getSelectedRegion = region.getSelectedRegion;
	$.region = region;
})(jQuery);
