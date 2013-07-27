define([
	'underscore',
	'text'
], function(_, textPlugin) {
	function Group(localRequire, name) {
		var outstanding = [];
		this.add = function(name, callback) {
			outstanding[outstanding.length] = [name, callback];
		};
		this.run = function(callback) {
			var self = this;
			var totalOutstanding = outstanding.length;
			//console.log('group(' + name + '): run');
			_.each(outstanding, function(item, i) {
				textPlugin.load(item[0], localRequire, function(template) {
					//console.log('group(' + name + '): got', item);
					if (item[1]) {
						item[1](template);
					}
					totalOutstanding--;
					if (totalOutstanding) {
						return;
					}
					callback();
				}, require.config);
			});
		};
	}
	function TextLoader(localRequire) {
		var groupItems = [];
		var defaultGroup;
		this.add = function(name, callback) {
			defaultGroup.add(name, callback);
		};
		this.group = function(name, callback) {
			var group = new Group(localRequire, name);
			groupItems[groupItems.length] = [name, callback, group];
			return group;
		};
		this.run = function(callback) {
			var totalGroupItems = groupItems.length;
			_.each(groupItems, function(groupItem, i) {
				groupItem[2].run(function() {
					//console.log('group(' + groupItem[0] + '): done', totalGroupItems);
					if (groupItem[1]) {
						groupItem[1](groupItem[2]);
					}
					totalGroupItems--;
					if (totalGroupItems) {
						return;
					}
					if (callback) {
						callback();
					}
				});
			});
		};
		defaultGroup = this.group('<default>');
	}
	return TextLoader;
});
