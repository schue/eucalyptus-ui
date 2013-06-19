define([
    'underscore',
    'app',
  'text!./tags.html!strip',
  'rivets',
  ],
  function(_, app, template, rivets) {
  return Backbone.View.extend({
    tpl: template,
    title: 'Tags',
    
    initialize: function() {
      var self = this;
      this.model.set('tags', new Backbone.Collection());
    
      var scope =  {
        tags: self.model,
      };

      $(this.el).html(this.tpl);
      this.rView = rivets.bind(this.$el, scope);
      this.render();
    },

    render: function() {
      this.rView.sync();
    },

    blur: function() {
      this.model.trigger('confirm');
    }
  });
});
