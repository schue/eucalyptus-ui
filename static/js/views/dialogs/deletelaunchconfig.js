define([
   'app',
   './eucadialogview',
   'text!./deletelaunchconfig.html!strip',
], function(app, EucaDialogView, template) {
    return EucaDialogView.extend({
        initialize : function(args) {
            var self = this;
            this.template = template;

            this.scope = {
                status: '',
                items: args.items, 
                help: {title: null,
                       content: help_scaling.dialog_delete_content,
                       url: help_scaling.dialog_delete_content_url,
                       pop_height: 600},
                

                cancelButton: {
                    id: 'button-dialog-deletelaunchconfig-cancel',
                    click: function() {
                       self.close();
                    }
                },

                deleteButton: {
                  id: 'button-dialog-deletelaunchconfig-delete',
                  click: function() {
                      doMultiAction(args.items, app.data.launchconfigs,
                                    function(model, options) {
                                      options['wait'] = true;
                                      model.destroy(options);
                                    },
                                    'delete_launch_config_progress',
                                    'delete_launch_config_done',
                                    'delete_launch_config_fail',
                                    function(response) {
                                      if (response.results && response.results.request_id) {
                                        return; // all good
                                      } else {
                                        return undefined_error;
                                      }
                                    });
                      self.close();
                  }
                }
            }

            this._do_init();
        },
	});
});
