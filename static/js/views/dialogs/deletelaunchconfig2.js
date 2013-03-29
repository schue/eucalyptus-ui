define([
   './eucadialogview',
   'text!./deletelaunchconfig2.html!strip',
], function(EucaDialogView, template) {
    return EucaDialogView.extend({
        initialize : function(args) {
            var self = this;
            this.template = template;

            this.scope = {
                status: '',
                items: args.items, 

                cancelButton: {
                    click: function() {
                       self.close();
                    }
                },
            }

            this._do_init();
        },
	});
});
