define([
	'require',
	'backbone',
	'underscore',
	'models/TextLoader',
	'models/Wizard'
], function(/*app, */localRequire, Backbone, _, TextLoader, Wizard) {
	function WizardLoader(localRequire, regionPrefix) {
		var html = {};
		var steps = [];
		var textLoader = new TextLoader(localRequire);
		this.add = function(name, path, regionName) {
			/*
			if (regionPrefix && regionName) {
				var region = app.getRegion(regionPrefix + '-' + regionName);
				if (region) {
					html[name] = region;
					return;
				}
			}
			*/
			textLoader.add(path, function(template) {
				console.log('html[' + name + ']');
				html[name] = template;
			});
			return this;
		};
		this.createSteps = function(stepConfigurationList, callback) {
			var self = this;
			_.each(stepConfigurationList, function(stepData) {
				self.createStep(stepData, callback);
			});
		};
		this.createStep = function(stepData, callback) {
			stepData = _.clone(stepData);
			var overrideParts = stepData.overrideParts;
			var parts = _.clone(stepData.parts);
			delete stepData.overrideParts;
			delete stepData.parts;
			steps[steps.length] = stepData;
			_.each(overrideParts, function(part) {
				/*
				if (regionPrefix) {
					var region = app.getRegion(regionPrefix + '-step-' + stepData.name + '-' + part);
					if (region) {
						stepData[part] = region;
						return;
					}
				}
				*/
				parts[parts.length] = part;
			});
			var group = textLoader.group('step[' + stepData.name + ']', function() {
				console.log('group[' + stepData.name + ']');
				if (callback) {
					callback(stepData);
				}
			});
			_.each(parts, function(part, i) {
				group.add('./' + stepData.name + '-' + part + '.html!strip', function(template) {
					console.log('step(' + stepData.name + ') load(' + part + ')');
					stepData[part] = Backbone.$(Backbone.$.parseHTML(template));
				});
			});
			return this;
		};
		this.run = function(callback) {
			textLoader.run(function() {
				console.log('creating wizard');
				var wizard = new Wizard({steps: steps}, {parse: true});
				callback(wizard, html);
			});
		};
	}

	var baseBackboneRivetsView = Backbone.View.extend({
		initialize: function(args) {
			if (args.htmlPath) {
				this.loadHtmlPath(args.htmlPath);
			} else if (args.templateName) {
				this.setTemplateName(args.templateName);
			} else if (this.defaultTemplateName) {
				this.setTemplateName(this.defaultTemplateName);
			}
		},
		setTemplateName: function(name) {
			this.templateName = name;
			this.loadHtmlPath('text!./' + name + '.html!strip');
		},
		loadHtmlPath: function(htmlPath) {
			var self = this;
			this.$el.addClass('ui-loading');
			this.require([htmlPath], function(htmlTemplate) {
				self.$el.removeClass('ui-loading');
				self.rivets_unbind();
				self.trigger('rivets-html-clearing');
				self.$contents = self.$el.html(htmlTemplate).children();
				self.trigger('rivets-html-attached');
				self.rivets_bind();
			});
		},
		rivets_unbind: function() {
			if (this.binding) {
				this.trigger('rivets-unbinding');
				this.binding.unbind();
				delete this.binding;
				this.trigger('rivets-unbound');
			}
		},
		rivets_bind: function() {
			if (this.$contents && this.lastValue) {
				this.trigger('rivets-binding');
				this.binding = rivets.bind(this.$contents, this.makeRivetsModel(this.makeRivetsScope(this.lastValue)));
				this.trigger('rivets-bound');
			}
		},
		makeRivetsModel: function(scope) {
			return scope instanceof Backbone.Model ? scope : new Backbone.Model(scope, {parse: true});
		},
		routine: function(value) {
			this.rivets_unbind();
			this.lastValue = value;
			this.rivets_bind();
		}
	});

	var WizardView = baseBackboneRivetsView.extend({
		defaultTemplateName: 'standard-frame',
		initialize: function(args) {
			if (args.args.length) {
				args.templateName = args.args[0];
			}
			this.viewModel = args.viewModel;
			this.constructor.__super__.initialize.apply(this, arguments);
			//binding.uiView = new uiViewClass({el: el, parentModel: binding.view.models, viewModel: binding.model, keypath: binding.keypath, args: viewBindingArgs});
		},
		require: localRequire,
		makeRivetsScope: function(value) {
			var model = this.viewModel.clone();
			model.set('wizard', value);
			return model;
		}
	}, {
		flashPane: function($el) {
			var $content = $el.find('.widget-wizard-content:first');
			$content.find('> div').each(function() {
				var $this = Backbone.$(this);
				var oldColor = $this.css('backgroundColor');
				$this.animate({
					backgroundColor: '#ffdddd'
				}, 250).animate({
					backgroundColor: oldColor
				}, 250, function() {
					$this.css('backgroundColor', '');
				});
			});
		},
		Model: Wizard,
		Loader: WizardLoader
	});
	return WizardView;
});
