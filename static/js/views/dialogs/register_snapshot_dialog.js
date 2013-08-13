define([
  './eucadialogview',
  'text!./register_snapshot_dialog.html!strip',
  'models/snapshot',
  'models/image',
  'app',
  'backbone',
], function(EucaDialogView, template, Snapshot, Image, App, Backbone) {
  return EucaDialogView.extend({
    setupInputValidation: function(args){
      var self = this;
      this.template = template;

      // SETUP INPUT VALIDATOR
      self.scope.snapshot.on('change', function() {
        self.scope.error.clear();
        self.scope.error.set(self.scope.snapshot.validate());
      });
    },

    initialize : function(args) {
      var self = this;
      this.template = template;

      this.scope = {
        status: '',
        snapshot: new Snapshot({snapshot_id: args.item}),
        error: new Backbone.Model({}),
        help: {title: null, content: help_snapshot.dialog_register_content, url: help_snapshot.dialog_register_content_url, pop_height: 600},
        del: 'true',


        cancelButton: {
          id: 'button-dialog-registersnapshot-cancel',
          click: function() {
            self.close();
          }
        },

        registerButton: new Backbone.Model({
          id: 'button-dialog-registersnapshot-save',
          disabled: true,
          click: function() {
            // GET THE INPUT FROM THE HTML VIEW
            var snapshotId = self.scope.snapshot.get('snapshot_id');
            var name = self.scope.snapshot.get('name');
            var description = self.scope.snapshot.get('description');
            var delOnTerm = self.scope.del;
            var isWindows = self.scope.snapshot.get('os') ? true : false;

            var imgOpts = {name: name, description: description};
            imgOpts['block_device_mapping'] = {'/dev/sda': {'snapshot_id':snapshotId,
                              'delete_on_termination':(delOnTerm?'true':'false')}};
            if (isWindows) imgOpts['platform'] = 'windows';
            var image = new Image(imgOpts);
            image.save({}, {
              success: function(model, response){   // AJAX CALL SUCCESS OPTION
                if ( response.results ) {
                  notifySuccess(null, $.i18n.prop('snapshot_register_success', snapshotId, response.results));   // XSS Risk -- Kyo 040813
                }else{
                  notifyError($.i18n.prop('snapshot_register_error', snapshotId), undefined_error);   // XSS Risk
                }
              },
              error: function(jqXHR, textStatus, errorThrown){  // AJAX CALL ERROR OPTION
                notifyError($.i18n.prop('snapshot_register_error', snapshotId), getErrorMessage(jqXHR));   // XSS Risk
              }
            });

	          // CLOSE THE DIALOG
	          self.close();
          }
        }),

        // EUCA-6106
        activateButton: function() {
          self.scope.registerButton.set('disabled', false);
        }
      };
      this._do_init();

      this.scope.snapshot.on('validated', function() {
        self.scope.registerButton.set('disabled', !self.scope.snapshot.isValid());
      });

      this.setupInputValidation(args);
    },
  });
});
