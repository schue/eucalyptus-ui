define([
   'underscore',
   './eucadialogview',
   'text!./connect.html!strip',
   'backbone',
   'vnc'
], function(_, EucaDialogView, template, Backbone, UI) {
    return EucaDialogView.extend({
        initialize : function(args) {
            var self = this;
            this.template = template;

            this.scope = {
				help: {title: null, content: help_edittags.dialog_content, url: help_edittags.dialog_content_url, pop_height: 600},

                cancelButton: {
                    click: function() {
                       self.close();
                    }
                },

                confirmButton: {
                  click: function() {
                       self.close();
                  }
                }
            }

            this._do_init();
        },
	});
});
