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
    if (obj instanceof Node) {
        return callback(obj, keypath);
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

var modelClass, collectionClass;
modelClass = Backbone.Model.extend({
    parse: function(response) {
        var result = {};
        for (var key in response) {
            var oldValue = response[key];
            //console.log('key:', key, typeof oldValue, oldValue instanceof Array);
            result[key] = parseOne(oldValue);
        }
        return result;
    },
    set: function(key, val, options) {
        var attr, attrs, curVal, merge, nestedOptions, newVal;
        if (key == null) return this;

        if (typeof key === 'object') {
            attrs = key;
            options = val;
        } else {
            (attrs = {})[key] = val;
        }
        if (options && options.merge) {
            nestedOptions = {silent: false, merge: true};
            for (attr in attrs) {
                curVal = this.get(attr);
                newVal = attrs[attr];
                if (curVal instanceof modelClass && newVal instanceof modelClass)  {
                    delete attrs[attr];
                    curVal.set(newVal.attributes, nestedOptions);
                }
            }
        }
        return modelClass.__super__.set.call(this, attrs, options);
    }
});

collectionClass = Backbone.Collection.extend({
    model: modelClass
});

var parseOne = function(oldValue) {
    if (oldValue == null) {
    } else if (typeof oldValue == 'string') {
    } else if (oldValue instanceof Date) {
    } else if (oldValue instanceof Number) {
    } else if (oldValue instanceof Function) {
    } else if (oldValue instanceof Backbone.Model) {
    } else if (oldValue instanceof Backbone.Collection) {
    } else if (oldValue instanceof modelClass) {
    } else if (oldValue instanceof collectionClass) {
    } else if (oldValue instanceof Array) {
        var newValue = new collectionClass();
        for (var i = 0; i < oldValue.length; i++) {
            var r = parseOne(oldValue[i]);
            newValue.add(r);
        }
        return newValue;
    } else if (typeof oldValue == 'object') {
        return new modelClass(oldValue, {parse: true});
    } else {
    }
    return oldValue;
};

rivets.configure({
    adapter: {
        parsingSupport: true,
        convertToModel: function(data) {
            return parseOne(data);
        },
        iterate: function(obj, callback) {
            //console.log('iterate:', obj, callback);
            if (obj instanceof Backbone.Collection) {
                var l = obj.length;
                for (var i = 0; i < l; i++) {
                    callback(obj.at(i), i);
                }
            } else if (obj instanceof Backbone.Model) {
                var keys = obj.keys();
                for (var i = 0; i < keys.length; i++) {
                    callback(obj.get(keys[i]), keys[i]);
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
            //console.log('adapter subscribe', arguments);
            diveIntoObject(obj, keypath, function(obj, id) {
                if (obj instanceof Backbone.Model) {
                    var proxyData;
                    function checkValue() {
                        var value = doObjectRead(obj, id);
                        var lastValue = proxyData.lastValue;
                        if (lastValue && (value == null || value !== lastValue)) {
                            proxyData.lastValue.off('sync reset change', subCallback);
                            lastValue = proxyData.lastValue = null;
                        }
                        if (lastValue == null && value) {
                            var message;
                            if (value instanceof Backbone.Collection) {
                                message = 'sub collection';
                            } else if (value instanceof Backbone.Model) {
                                message = 'sub model';
                            }
                            if (message) {
                                proxyData.lastValue = value;
                                value.on('sync reset change', subCallback);
                            }
                        }
                    }
                    function proxyCallback() {
                        console.log('proxy callback', obj, keypath);
                        checkValue();
                        callback();
                    }
                    function subCallback() {
                        console.log('sub callback', obj, keypath);
                        callback();
                    };
                    callback._proxyData = proxyData = {proxyCallback: proxyCallback, subCallback: subCallback};
                    checkValue();
                    obj.on('change:' + id, proxyCallback);
                } else if (obj instanceof Backbone.Collection) {
                    obj.on('sync reset change', callback);
                } else if (obj instanceof Node) {
                    if (keypath == 'destroyed') {
                        jQuery(obj).on('destroyed', callback)
                    }
                } else {
                    //console.log('plain object');
                }
            });
        },
        unsubscribe: function(obj, keypath, callback) {
            //console.log('unsubscribe:', arguments);
            diveIntoObject(obj, keypath, function(obj, id) {
                if (obj instanceof Backbone.Model)  {
                    var proxyData = callback._proxyData;
                    obj.off('change:' + keypath, proxyData.proxyCallback);
                    if (proxyData.lastValue) {
                        proxyData.lastValue.off('sync reset change', proxyData.subCallback);
                        proxyData.lastValue = null;
                    }
                } else if (obj instanceof Backbone.Collection) {
                    obj.off('sync reset change', callback);
                } else if (obj instanceof Node) {
                    if (keypath == 'destroyed') {
                        jQuery(obj).off('destroyed', callback)
                    }
                } else {
                    //console.log('plain object');
                }
            });
        },
        read: function(obj, keypath) {
            //console.log('read:', obj, keypath);
            if (typeof keypath === 'undefined' || keypath === '') return obj;
            var r = diveIntoObject(obj, keypath, doObjectRead);
            //console.log('r=', r);
            return r;
        },
        publish: function(obj, keypath, value) {
            //console.log('publish:', obj, keypath);
            diveIntoObject(obj, keypath, function(obj, id) {
                value = parseOne(value);
                if (obj instanceof Backbone.Model)  {
                    obj.set(id, value);
                } else if (obj instanceof Backbone.Collection) {
                    obj.set(value, {at: id});
                } else {
                    obj[id] = value;
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
