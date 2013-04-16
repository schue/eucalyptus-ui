define([
   './eucadialogview',
   'text!./create_security_group.html!strip',
   'app',
   'backbone',
   'models/sgroup'
], function(EucaDialogView, template, App, Backbone, SecurityGroup) {
    return EucaDialogView.extend({

        initialize : function(args) {
            var self = this;
            this.template = template;

            this.scope = {
                viewState: new Backbone.Model({
                    isPort: true
                }),

                securityGroup: new SecurityGroup(),

                newrule: new Backbone.Model({
                    port: 80,
                    protocol: 'Select protocol'
                }),

                cancelButton: {
                  click: function() {
                    self.close();
                  }
                },

                createButton: {
                  click: function() {
                    self.close();
       		      }
	            },

                classes: function() {
                        return !self.scope.securityGroup.isValid() ? "ui-state-disabled" : "";
                }
            }

            this.scope.newrule.on('change', function() {
                self.scope.viewState.set('isPort', self.scope.newrule.get('protocol').indexOf('ICMP') == -1);
                self.scope.viewState.set('isValid', self.scope.newrule.isValid());
            });

            sgscope = this.scope;

            this._do_init();
        },
	});
});
