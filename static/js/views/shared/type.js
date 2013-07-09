define([
  'app',
  'text!./type.html!strip',
  'rivets',
	], function( app, template, rivets ) {
  return Backbone.View.extend({
    tpl: template,
    title: app.msg("launch_instance_section_header_type"),
    next: app.msg('launch_instance_btn_next_security'),

    initialize : function() {

      var self = this;
      this.model.set('tags', new Backbone.Collection());
      this.model.set('zones', app.data.zone);
      this.model.set('type_names', new Backbone.Collection());
      this.t_names = this.model.get('type_names');

      // for the instance types/sizes pulldown, sorted asc
      var typesTemp = new Backbone.Collection();
      typesTemp.comparator = function(type) {
          return (+type.get('cpu')) + (+type.get('ram'));
      };
      var typeObjects = $.eucaData.g_session['instance_type'];
      _.each(typeObjects, function(val, key) {
        typesTemp.add({name: key, cpu: val[0], ram: val[1], disk: val[2]});
      });
      this.model.set('types', typesTemp.sort());

      this.model.set('type_number', 1); // preload 1
      this.model.set('min_count', 1);
      this.model.set('max_count', 1);

      this.model.set('zone', 'Any'); // preload no zone preference


      var scope = {
        typeModel: self.model,
        tags_col: self.model.get('tags'),

        isZoneSelected: function(obj) { 
          if (self.model.get('zone') == obj.zone.get('name')) {
            return true;
          } 
          return false;
        },


        setField: function(e, el) {
          var target = e.target;
          switch(target.id) {
            case 'launch-instance-names':
              if(target.value == '') {
                self.t_names.reset();
              } else {
                var names = target.value.split(',');
                self.t_names.reset();
                for(i=0; i<names.length; i++) {
                  var trimmed = names[i].replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                  self.t_names.add({name: "Name", value: trimmed});
                }
                self.model.trigger('addTag', new Backbone.Model({name: 'Name', value: target.value}), true);
              }
              break;
            default:
          }
        },

        iconClass: function() {
          return self.model.get('image_iconclass'); 
        },

        tags:  self.model,

        formatType: function(obj) {
          var buf = obj.type.get('name') + ": ";
          buf += obj.type.get('cpu') + " " + app.msg('launch_wizard_type_description_cpus') + ", ";
          buf += obj.type.get('ram') + " " + app.msg('launch_wizard_type_description_memory') + ", ";
          buf += obj.type.get('disk') + " " + app.msg('launch_wizard_type_description_disk') + ", ";
          return buf;
        },

        isSelected: function(objects) {
          if(objects.type.get('name') == self.model.get('instance_type')) {
            return true;
          }
        },

        setMinMax: function(e) {
          var regex1 = /^[1-9]+$/;
          var regex2 = /^[1-9]+-[0-9]+$/;
          var val = e.target.value;
          self.model.unset('min_count');
          self.model.unset('max_count');
          if(regex1.test(val)) {
            self.model.set('min_count', val);
            self.model.set('max_count', val);
            return val;
          }
          if(regex2.test(val)) {
            self.model.set('min_count', val.substring(0, val.indexOf('-')));
            self.model.set('max_count', val.substring(val.indexOf('-')+1));
            return val;
          }
        },
    
        launchConfigErrors: {
          type_number: '',
          instance_type: '',
          type_names_count: '',
          tag_limit_reached: ''
        }
    };

    self.model.on('validated:invalid', function(model, errors) {
      if(errors.min_count||errors.max_count) {
        scope.launchConfigErrors.type_number = errors.min_count;
        scope.launchConfigErrors.type_number = errors.max_count;
      }
      scope.launchConfigErrors.instance_type = errors.instance_type;
      scope.launchConfigErrors.type_names_count = errors.type_names_count;
      scope.launchConfigErrors.tag_limit_reached = errors.tag_limit_reached;
      self.render();
    });

    self.model.on('validated:valid change', function(model, errors) {
      scope.launchConfigErrors.min_count = null;
      scope.launchConfigErrors.max_count = null;
      scope.launchConfigErrors.type_number = null;
      scope.launchConfigErrors.instance_type = null;
      scope.launchConfigErrors.type_names_count = null;
      scope.launchConfigErrors.tag_limit_reached = null;
      self.render();
    });
  
    // used for instance name/number congruity validation... see below
    self.t_names.on('add reset sync change remove', function() {
      self.model.set('type_names_count', self.model.get('type_names').length);
    });

    self.model.on('change:instance_type', function() {
      $.cookie('instance_type', self.model.get('instance_type'));
      self.render();
    });

    scope.tags_col.on('add', function() {
      self.model.set('type_hasTags', true);
    });

    $(this.el).html(this.tpl);
     this.rView = rivets.bind(this.$el, scope);
     this.render();

     if($.cookie('instance_type')) {
       this.model.set('instance_type', $.cookie('instance_type'));
     } else {
       this.model.set('instance_type', 'm1.small'); // preload first choice if no cookie value
     }
    },

    render: function() {
      this.rView.sync();
    },

    isValid: function() {
      var json = this.model.toJSON();
      this.model.validate(_.pick(this.model.toJSON(),'min_count', 'max_count'));
      if (!this.model.isValid())
        return false;

      this.model.validate(_.pick(this.model.toJSON(),'instance_type'));
      if (!this.model.isValid())
        return false;

      // cannot pass a collection like type_names in here. Have to maintain
      // the count of the collection separately.
      this.model.validate(_.pick(json, 'type_names_count'));
      if (!this.model.isValid())
        return false;

      return true;
    },

    // called from wizard.js when each step is displayed.
    // there is also a matching blur() hook. 
    focus: function() {
      this.model.set('type_show', true);
    },

    blur: function() {
      this.model.trigger('confirm', true);
    },

  });
});
