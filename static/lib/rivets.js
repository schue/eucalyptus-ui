var doObjectRead = function(obj, id) {
    if (obj === null) return obj;
    if (!id) return obj;
    //console.log('doObjectRead:', obj, id, obj instanceof Backbone.Model, obj instanceof Backbone.Collection);
    if (obj instanceof Backbone.Model)  {
        return obj.get(id);
    } else if (obj instanceof Backbone.Collection)  {
        return obj.at(id);
    } else if (obj != null) {
        return obj[id];
    }
};
var diveIntoObject = function(obj, keypath, callback) {
    if (!keypath) {
        return callback(obj, null);
    }
    //return callback(obj, keypath);
    var keyparts = keypath.replace(/^:/, '').split(/\./);
    //console.log('diveIntoObject(keyparts):', obj, keyparts);
    while (keyparts.length > 1) {
        var part = keyparts.shift();
        if (part.length == 0) {
            continue;
        }
        //console.log('diveIntoObject:', obj, part);
        obj = doObjectRead(obj, part);
    }
    //console.log('callback:', obj, keyparts[0]);
    return callback(obj, keyparts.shift());
};
rivets.configure({
    adapter: {
        parsingSupport: true,
        iterate: function(obj, callback) {
            if (obj instanceof Backbone.Collection) {
                var l = obj.length;
                for (var i = 0; i < l; i++) {
                    callback(obj.at(i), i);
                }
            } else if (obj instanceof Backbone.Model) {
                var jobj = obj.toJSON();
                for (var i in jobj) {
                    callback(obj.get(i), i);
                }
            } else if (obj instanceof Array) {
                for (var i = 0; i < obj.length; i++) {
                    callback(obj[i], i);
                }
            } else {
                for (var i in obj) {
                    callback(obj[i], i);
                }
            }
        },
	    subscribe: function(obj, keypath, callback) {
 //           console.log('subscribe', keypath);
            return diveIntoObject(obj, keypath, function(obj, keypath) {
                if (obj instanceof Backbone.Model) {
                    obj.on('change:' + keypath, callback);
                } else if (obj instanceof Backbone.Collection) {
                    obj.on('sync add remove reset change', callback);
                } else {
                    // No easy portable way to observe plain objects.
                    // console.log('plain object');
                }
            });
        },
        unsubscribe: function(obj, keypath, callback) {
//            console.log('unsubscribe', keypath);
            diveIntoObject(obj, keypath, function(obj, keypath) {
                if (obj instanceof Backbone.Model)  {
                 //   console.log('unsubscribe ', keypath, callback);
                    obj.off('change:' + keypath, callback);
                } else if (obj instanceof Backbone.Collection) {
                    obj.off('sync add remove reset change', callback);
                } else {
                    // No easy portable way to observe plain objects.
                    // console.log('plain object');
                }
            });
        },
        read: function(obj, keypath) {
            if (obj == null) return null;
            if (typeof keypath === 'undefined') return obj;

            return diveIntoObject(obj, keypath, doObjectRead);
        },
        publish: function(obj, keypath, value) {
            diveIntoObject(obj, keypath, function(obj, keypath) {
                if (obj instanceof Backbone.Model)  {
                    obj.set(keypath, value);
                } else if (obj instanceof Backbone.Collection) {
                    obj.at(keypath).set(value);
                } else {
                    obj[keypath] = value;
                }
            });
        }
    }
});

rivets.binders["ui-*"] = {
    block: true,
    tokenizes: true,
    bind: function(el) {
        var self = this;
        el.removeAttribute('data-ui-' + this.args[0]);
        var marker = this.marker;
        if (!marker) {
          var parentNode = el.parentNode;
          marker = this.marker = parentNode.insertBefore(document.createComment(" ui: " + this.args[0] + " "), el);
        }
        require(['views/ui/' + this.args[0] + '/index'], function(view) {
            self.bbView = new view({
                model: self.bbLastValue != null ? self.bbLastValue : {},
                binding: self,
                el: el
            });
            return el;
        });
    },
    routine: function(el, value) {
        this.bbLastValue = value;
        if (this.bbView) {
           this.bbView.render(value);
        }
    }
}

rivets.binders["addclass"] = {
    routine: function(el, value) {
        $(el).addClass(value);
    }
}

rivets.binders["msg"] = {
    tokenizes: true,
    routine: function(el, keyname) {
      var value = $.i18n.prop(this.keypath);

      if (value == null) return;

      if (el.innerText != null) {
        return el.innerText = value != null ? value : '';
      } else {
        return el.textContent = value != null ? value : '';
      }
    }
}

rivets.binders["tooltip"] = {
    tokenizes: true,
    routine: function(el, keyname) {
      var value = $.i18n.prop(this.keypath);

      if (value == '['+this.keypath+']') {
        // I think this would be better, than going directly to the method
        //value = getAdapter().read(this.model, this.keypath);
        value = diveIntoObject(this.model, this.keypath, doObjectRead);
      }

      if (value == null) return;

      return $(el).attr('title', value);
    }
}

rivets.binders["include"] = {
    bind: function(el) {
        var self = this;
        var path = $(el).text();
        require([path], function(view) {
            self.bbView = new view({
                model: self.bbLastValue ? self.bbLastValue : {},
            });
            $(el).replaceWith($(self.bbView.el).children());
            return self.bbView.el;
        });
    },
    routine: function(el, value) {
        this.bbLastValue = value;
        if (this.bbView) {
           this.bbView.model = value;
           this.bbView.render();
        }
    }
}

rivets.binders['entitytext'] = {
    routine: function(el, value) {
      return rivets.binders.text(el, $('<div/>').html(value).text());
    }
}
