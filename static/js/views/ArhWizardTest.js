define([
	'require',
	'backbone',
	'underscore',
	'rivets',
	'views/wizard/index'
], function(/*app, */localRequire, Backbone, _, rivets, WizardView) {
	var UseView = Backbone.View.extend({
		initialize: function(args) {
			var self = this;
			var creditCard = new Backbone.Model({});
			var scope;
			function stepDoneLoading(stepData) {
				switch (stepData.name) {
					case 'payment':
						stepData.sticky = function(wizard, step) {
							//checkStepForErrors(step);
							return !creditCard.isValid(true);
						};
						break;
				}
				stepData.scope = function(wizard) {
					return scope;
				};
			}		
			var wizardLoader = new WizardView.Loader(localRequire, 'arh-test');
			wizardLoader.add('frame', './frame.html!strip');
			wizardLoader.add('intro', './intro.html!strip', 'global-intro');
			wizardLoader.createStep({name: 'orderdetails', class: 'wizard-step orderdetails-step', label: 'Order Details', parts: ['body']}, stepDoneLoading);
			wizardLoader.createStep({name: 'payment', class: 'wizard-step payment-step', label: 'Payment Method', parts: ['body']}, stepDoneLoading);
			wizardLoader.createStep({name: 'placeorder', class: 'wizard-step placeorder-step', label: 'Place Order', parts: ['body']}, stepDoneLoading);
			wizardLoader.run(function(wizard, html) {
				wizard.on('updated-step', function(oldStep, newStep) {
					WizardView.flashPane(self.$el);
				});
				var scope = new Backbone.Model({
					wizard: wizard,
					creditCard: creditCard
				});
				wizard.startWizard();
				var $contents = self.$el.html(html.frame).children();
				self.rview = rivets.bind($contents, scope);
			});
		},
		render: function() {
			if (this.rview) {
				this.rview.sync();
			}
		}
	});
	return UseView;
});
