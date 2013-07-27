define([
	'underscore',
	'backbone'
], function(_, Backbone) {
	console.log('Model(wizard): require');
	var ActionModelBase = Backbone.Model.extend({
		idAttribute: 'name',
		initialize: function(data, options) {
			if (options) {
				this.wizard = options.wizard;
				this._action = options.action;
			}
			return ActionModelBase.__super__.initialize.call(this, data, options);
		},
		call: function(ignoreThis, e) {
			if (this._action) {
				if (this._action()) {
					return true;
				}
				this.wizard.trigger('action-false:' + this.get('name'), this, e);
				this.wizard.trigger('action-false', this, e);
			}
			return false;
		}
	});
	var ActionModel = ActionModelBase.extend({
		initialize: function(data, options) {
			options = _.clone(options);
			options.action = function() {
				var name = this.get('name');
				console.log('click', name, this);
				return this.wizard.doAction(name);
			};
			return ActionModel.__super__.initialize.apply(this, arguments);
		}
	});
	var StepModel = Backbone.Model.extend({
		idAttribute: 'name',
		initialize: function(data, options) {
			this.wizard = options.wizard;
			this.set({isActive: true, isCurrent: false, visited: false});
			return StepModel.__super__.initialize.apply(this, arguments);
		},
		parse: function(data, options) {
			var newData = _.clone(data);
			this.scope = newData.scope;
			delete newData.scope;
			return StepModel.__super__.parse.call(this, data, options);
		},
		getIndex: function() {
			return this.wizard.get('steps').indexOf(this);
		},
		call: function(ignoreThis, e) {
			if (this.get('isActive') && !this.wizard.doAction('jump', this)) {
				this.wizard.trigger('action-false:' + this.get('name'), this, e);
				this.wizard.trigger('action-false', this, e);
			}
			return false;
		}
	});
	var WizardModel = Backbone.Model.extend({
		initialize: function(data, options) {
			this.set('actions', new Backbone.Model({
				prev: new ActionModel({name: 'prev', class: 'button prev-button', isActive: true}, {wizard: this}),
				next: new ActionModel({name: 'next', class: 'button next-button', isActive: true}, {wizard: this}),
			}));
			return WizardModel.__super__.initialize.apply(this, arguments);
		},
		parse: function(data, options) {
			var newData = {};
			if (data.steps) {
				var steps = [];
				for (var i = 0; i < data.steps.length; i++) {
					steps[i] = new StepModel(data.steps[i], {parse: true, wizard: this});
				}
				newData.steps = new Backbone.Collection(steps);
			}
			return newData;
		},
		_updateCurrent: function(newStepIdx, options) {
			var steps = this.get('steps');
			steps.each(function(step, index) {
				var isCurrent = step.get('isCurrent');
				if (index != newStepIdx) {
					if (isCurrent) {
						step.set('isCurrent', false);
					}
				} else {
					if (!isCurrent) {
						step.set('isCurrent', true);
					}
				}
			});
			var newStep = steps.at(newStepIdx);
			var visited = newStep.get('visited');
			if (!visited) {
				newStep.set('visited', true);
			}
			var oldStep = this.get('currentStep');
			this.set('currentStep', newStep);
			if (!options.silent) {
				this.trigger('updated-step', oldStep, newStep);
			}
			this._updateActions(options);
		},
		_updateActions: function(options) {
			var currentStepIdx = this.get('currentStep').getIndex();
			var actions = this.get('actions');
			actions.get('next').set('isActive', this._findStep(currentStepIdx, 1) !== false);
			actions.get('prev').set('isActive', this._findStep(currentStepIdx, -1) !== false);
			if (!options.silent) {
				this.trigger('updated-actions');
			}
		},
		_findStep: function(stepIdx, stepChange) {
			var steps = this.get('steps');
			stepIdx += stepChange;
			while (stepIdx >= 0 && stepIdx < steps.size() && stepChange) {
				var step = steps.at(stepIdx);
				if (step.get('isActive')) {
					break;
				}
				stepIdx += stepChange;
			}
			return stepIdx >= 0 && stepIdx < steps.size() ? stepIdx : false;
		},
		startWizard: function(initialStep) {
			this._updateCurrent(initialStep || 0, {silent: true});
		},
		doAction: function(name, arg1, arg2) {
			var steps = this.get('steps');
			var actions = this.get('actions');
			var currentStep = this.get('currentStep');
			var currentStepIdx = steps.indexOf(currentStep);
			var stepChange;
			var options = {};
			function enable_handler(container) {
				container.get(arg1).set('isActive', true);
			}
			function disable_handler(container) {
				container.get(arg1).set('isActive', false);
			}
			function active_handler(container) {
				var item = container.get(arg1);
				if (arg2 != null) {
					item.set('isActive', arg2);
				} else {
					return item.get('isActive');
				}
			}
			switch (name) {
				case '_updateSteps':
					throw new Exception();
					stepChange = 0;
					options.silent = true;
					break;
				case 'prev':
					stepChange = -1;
					break;
				case 'next':
					stepChange = 1;
					break;
				case 'jump':
					if (typeof arg1 == 'string') {
						arg1 = steps.get(arg1);
					}
					var newStepIdx = steps.indexOf(arg1);
					if (currentStepIdx == newStepIdx) {
						return true;
					}
					currentStepIdx = newStepIdx;
					stepChange = 0;
					break;
				case 'step:enable':
					enable_handler(steps);
					steps.get(arg1).set('isActive', true);
					break;
				case 'step:disable':
					disable_handler(steps);
					break;
				case 'step:active':
					var r = active_handler(steps);
					if (r !== undefined) {
						return r;
					}
					break;
				case 'action:enable':
					enable_handler(actions);
					break;
				case 'action:disable':
					disable_handler(actions);
					break;
				case 'action:active':
					var r = active_handler(actions);
					if (r !== undefined) {
						return r;
					}
					break;
			}
			if (currentStepIdx != null && stepChange != null) {
				var sticky = currentStep.get('sticky');
				if (_.isFunction(sticky)) {
					sticky = sticky(this, currentStep);
				}
				if (sticky) {
					return false;
				}
				var newStepIdx = this._findStep(currentStepIdx, stepChange);
				if (newStepIdx !== false) {
					this._updateCurrent(newStepIdx, options);
				}
				return true;
			}
		}
	});
	WizardModel.ActionModel = ActionModelBase;
	return WizardModel;
});
