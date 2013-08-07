define([
   './landing_page_base',
   'backbone',
   'rivets',
   'text!./landing_page_eips.html!strip',
], function(LandingPage, Backbone, rivets, template) {
    return LandingPage.extend({
        initialize: function(args) {
            var self = this;
            this.template = template;
            console.log("LANDING_PAGE: initialize " + args.id);
            this.scope = {
              id: args.id,
              collection: args.collection,
              items: '',
              databox: '',
              clicked_row_callback: function(context, event) {
                // TEMP. SOL: THIS SHOUOLD BE DONE VIA RIVETS TEMPLATE - KYO 080613
                if( self.count_checked_items() === 0 ){
                  $menu = $('#more-actions-'+self.scope.id);
                  $menu.addClass("inactive-menu");
                }else{
                  $menu = $('#more-actions-'+self.scope.id);
                  $menu.removeClass("inactive-menu");
                }
              },
     	      expanded_row_callback: function(e){
                // ISSUE: EIP MODEL DOESN'T HAVE AN ID ATTRIBUTE - KYO 080613
                var thisItem = e.item.get('public_ip');
                var thisEscaped = String(thisItem).replace(/\./g, "-");
                var $placeholder = $('<div>').attr('id', "expanded-" + thisEscaped).addClass("expanded-row-inner-wrapper");
                if( e.item.get('expanded') === true ){
                  // IF EXPANDED, APPEND THE RENDER EXPANDED ROW VIEW TO THE PREVIOUS PLACEHOLDER, MATCHED BY ITEM'S ID
                  require(['app', 'views/expandos/ipaddress'], function(app, expando) {
                    var $el = $('<div>');
                    new expando({el: $el, model: app.data.eip.get(thisItem) });
                    $('#expanded-' + thisEscaped).children().remove();
                    $('#expanded-' + thisEscaped).append($el);
                  });
                }
                // IF NOT EXPANDED, RETURN THE PLACEHOLDER DIV
                return $('<div>').append($placeholder).html();
              },
              expand_row: function(context, event){              
                // ISSUE: EIP MODEL DOESN'T HAVE AN ID ATTRIBUTE - KYO 080613
                var thisItem = event.item.get('public_ip');
                var thisModel = this.items.where({public_ip: thisItem})[0];
                if( thisModel.get('expanded') === true ){
                  thisModel.set('expanded', false);
                }else{
                  thisModel.set('expanded', true);
                }
                self.render();
              },
            };
            this._do_init();
            console.log("LANDING_PAGE: initialize end");
        },
    });
});

