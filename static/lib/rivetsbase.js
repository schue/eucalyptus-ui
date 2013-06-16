// rivets.js
// version: 0.4.5
// author: Michael Richards
// license: MIT
(function() {
  var Binding, Rivets_binders, View, bindEvent, checkDefaultMethod, createInputBinder, defaultExpressionParser, eventDelegateHelper, expressionRegex, findBinder, getAdapter, iterate, keypathRegex, makeIdentiferRegex, rivets, trim, unbindEvent, _isIn, _map, __indexOf;

  trim = function(s) {
    return s.replace(/^\s+|\s+$/g, '');
  };

  _map = function(col, callback) {
    var A, O, k, len;
    O = Object(col);
    A = new Array(len = O.length >>> 0);
    k = 0;
    while (k < len) {
      if (k in O) {
        A[k] = callback(O[k], k, O);
      }
      k++;
    }
    return A;
  };

  _isIn = function(collection, item) {
    var l;
    l = collection.length - 1;
    while (l >= 0) {
      if (l in collection && collection[l] === item) {
        return true;
      }
      l--;
    }
    return false;
  };

  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  getAdapter = function() {
    return rivets.config.adapter;
  };

  makeIdentiferRegex = function(identifier) {
    return new RegExp("^" + (identifier.replace('*', '(.+)')) + "$");
  };

  findBinder = function(type, argStore) {
    var args, binder, binders, identifier;
    binders = rivets.binders;
    if (!(binder = binders[type])) {
      binder = binders['*'];
      for (identifier in binders) {
        if (/^.+\*/.test(identifier)) {
          if ((args = makeIdentiferRegex(identifier).exec(type)) != null) {
            binder = binders[identifier];
            (argStore.args = args).shift();
          }
        }
      }
    }
    if (binder instanceof Function) {
      binder = {
        routine: binder
      };
    }
    return binder;
  };

  checkDefaultMethod = function(store, name, method) {
    if (!(store[name] != null)) {
      store[name] = method;
    }
  };

  Binding = (function() {

    function Binding(el, type, model, keypath, options) {
      var _this = this;
      (function() {
        var installBindUnbindMethod;
        _this.el = el;
        _this.elParentNode = el.parentNode;
        _this.type = type;
        _this.model = model;
        _this.keypath = keypath;
        _this.options = (options || (options = {}));
        _this.binder = options.binder ? (_this.args = options.args, options.binder) : findBinder(type, _this);
        _this.formatters = options.formatters || [];
        checkDefaultMethod(_this, 'formattedValue', function(value) {
          model = _this.model;
          _map(_this.formatters, function(formatter) {
            var args, id, m;
            args = formatter.split(/\s+/);
            id = args.shift();
            m = getAdapter().read(model, id);
            formatter = m instanceof Function ? m : rivets.formatters[id];
            args.unshift(value);
            value = formatter ? formatter.read instanceof Function ? formatter.read.apply(formatter, args) : formatter instanceof Function ? formatter.apply(null, args) : value : value;
          });
          return value;
        });
        checkDefaultMethod(_this, 'set', function(value) {
          var binder, _ref;
          binder = _this.binder;
          value = _this.formattedValue(value instanceof Function && !binder["function"] ? value.call(_this.model, _this.options.bindContext) : value);
          if ((_ref = binder.routine) != null) {
            _ref.call(_this, _this.el, value);
          }
        });
        checkDefaultMethod(_this, 'sync', function() {
          keypath = _this.keypath;
          model = _this.model;
          _this.set(_this.options.bypass ? model[keypath] : getAdapter().read(model, keypath));
          if (_this.view) {
            _this.view.childSynced(_this);
          }
        });
        checkDefaultMethod(_this, 'publish', function() {
          var o, value;
          if (_this.binder.tokenizes) {
            return;
          }
          el = _this.el;
          value = (function() {
            var _i, _len, _results;
            switch (el.type) {
              case 'checkbox':
                return el.checked;
              case 'select-multiple':
                _results = [];
                for (_i = 0, _len = el.length; _i < _len; _i++) {
                  o = el[_i];
                  if (o.selected) {
                    _results.push(o.value);
                  }
                }
                return _results;
                break;
              default:
                return el.value;
            }
          })();
          _map(_this.formatters.slice(0).reverse(), function(formatter) {
            var args, f, id;
            args = formatter.split(/\s+/);
            id = args.shift();
            f = rivets.formatters[id];
            if (f && f.publish) {
              args.unshift(value);
              value = f.publish.apply(f, args);
            }
          });
          getAdapter().publish(_this.model, _this.keypath, value);
        });
        installBindUnbindMethod = function(methodName, eventName, impl) {
          checkDefaultMethod(_this, methodName, function() {
            var adapter, binder, eventCallback, outerModel, sync, _ref;
            adapter = getAdapter();
            keypath = _this.keypath;
            sync = _this.sync;
            outerModel = _this.model;
            binder = _this.binder;
            options = _this.options;
            if ((_ref = binder[methodName]) != null) {
              _ref.call(_this, _this.el);
            }
            eventCallback = function() {
              adapter[eventName].call(adapter, outerModel, keypath, sync);
            };
            impl(eventCallback, _this.options.bypass, keypath, sync, binder.tokenizes);
            _map(options.dependencies, function(dependency) {
              var matches;
              matches = keypathRegex.exec(dependency);
              if (matches && matches[1]) {
                model = adapter.read(_this.view.models, matches[1]);
                keypath = matches[2];
              } else {
                model = outerModel;
                keypath = dependency.substr(1);
              }
              adapter[eventName].call(adapter, model, keypath, sync);
            });
          });
        };
        installBindUnbindMethod('bind', 'subscribe', function(eventCallback, bypass, keypath, sync, binderTokenizes) {
          if (bypass) {
            sync();
          } else {
            if (keypath && !binderTokenizes) {
              eventCallback();
            }
            if (rivets.config.preloadData) {
              sync();
            }
          }
        });
        installBindUnbindMethod('unbind', 'unsubscribe', function(eventCallback, bypass, keypath, sync, binderTokenizes) {
          if (!bypass) {
            if (keypath && !binderTokenizes) {
              eventCallback();
            }
          }
        });
        checkDefaultMethod(_this, 'deconstruct', function() {
          _this.unbind();
          _this.el = document.createElement('div');
          if (_this.options.destroyedHandler) {
            _this.options.destroyedHandler(_this);
          }
        });
        var destroyCallback = function() {
          _this.deconstruct();
          //jQuery(el).off('destroyed', destroyCallback);
          getAdapter().unsubscribe(el, 'destroyed', destroyCallback);
        };
        getAdapter().subscribe(el, 'destroyed', destroyCallback);
      })();
    }

    return Binding;

  })();

  keypathRegex = /^([^\.:]*)[\.:](.*)/;

  expressionRegex = /(.*?)\{\{([^{}]+)\}\}/;

  defaultExpressionParser = function(view, node, type, models, value) {
    var adapter, binding, context, dependencies, firstPart, installBindUnbindMethod, keypath, matches, model, options, parsingSupport, path, pipes, splitPath, subBinding, subs, values;
    if (expressionRegex.test(value)) {
      binding = new Binding(node, type, models);
      values = [];
      subs = [];
      binding.options.destroyedHandler = function(child) {
        for (var i = 0; i < subs.length; i++) {
          if (subs[i] === child) {
            subs[i] = null;
          }
        }
      };
      while (value && ((matches = expressionRegex.exec(value)) != null)) {
        value = value.substring(matches[0].length);
        if (matches[1]) {
          values.push(matches[1]);
        }
        subs.push(subBinding = defaultExpressionParser(view, null, '*', models, matches[2]));
        subBinding.binder = (function(values) {
          var i;
          i = values.length;
          values[i] = null;
          return {
            routine: function(el, value) {
              values[i] = value;
              binding.sync();
            }
          };
        })(values);
      }
      if (value) {
        values.push(value);
      }
      binding.sync = function() {
        binding.set(values.join(''));
      };
      binding.publish = function() {};
      installBindUnbindMethod = function(methodName) {
        var origMethod;
        origMethod = binding[methodName];
        binding[methodName] = function() {
          var syncCalled = false;
          var origSync = binding.sync;
          binding.sync = function() {
            syncCalled = true;
          }
          origMethod();
          _map(subs, function(sub) {
            sub[methodName].call(sub);
          });
          binding.sync = origSync;
          if (syncCalled) {
            binding.sync();
          }
        };
      };
      installBindUnbindMethod('bind');
      installBindUnbindMethod('unbind');
      return binding;
    }
    pipes = _map(value.split('|'), trim);
    context = _map(pipes.shift().split('<'), trim);
    path = context.shift();
    options = {
      formatters: pipes,
      bindContext: models
    };
    adapter = getAdapter();
    parsingSupport = adapter.parsingSupport || (options.binder = findBinder(type, options)).tokenizes;
    if (parsingSupport) {
      model = models;
      keypath = path;
    } else {
      if (path.indexOf(':') !== -1) {
        options.bypass = true;
      }
      splitPath = keypathRegex.exec(path);
      firstPart = splitPath[1];
      model = firstPart ? adapter.read(models, firstPart) : models;
      keypath = splitPath[2];
    }
    if (model) {
      if (dependencies = context.shift()) {
        options.dependencies = dependencies.split(/\s+/);
      }
      binding = new Binding(node, type, model, keypath, options);
      binding.view = view;
    }
    return binding;
  };

  View = (function() {

    function View(els, models) {
      var binders, bindingRegExp, bindings, parse, skipNodes, outsideCall,
        _this = this;
      this.models = models;
      _map(['bind', 'unbind', 'sync'], function(method) {
        _this[method] = function() {
          outsideCall = true;
          try {
            _map(_this.bindings, function(binding) {
              if (binding != null) binding[method].call(binding);
            });
          } finally {
            outsideCall = false;
          }
        };
      });
      this.els = els = els.jquery || els instanceof Array ? els : [els];
      bindings = this.bindings = [];
      skipNodes = [];
      bindingRegExp = this.bindingRegExp();
      binders = rivets.binders;
      parse = function(node) {
        var attributes;
        attributes = node.attributes;
        if (!_isIn(skipNodes, node)) {
          _map(attributes, function(attribute) {
            var binder, identifier, n, type;
            n = attribute.name;
            if ((type = n.replace(bindingRegExp, '')) !== n) {
              if (!(binder = binders[type])) {
                binder = binders['*'];
                for (identifier in binders) {
                  if (/^.+\*/.test(identifier)) {
                    if (makeIdentiferRegex(identifier).test(type)) {
                      binder = binders[identifier];
                    }
                  }
                }
              }
              if (binder.block) {
                _map(node.getElementsByTagName('*'), function(n) {
                  skipNodes.push(n);
                });
                attributes = [attribute];
              }
            }
          });
          _map(attributes, function(attribute) {
            var binding, n, type;
            n = attribute.name;
            if ((type = n.replace(bindingRegExp, '')) !== n) {
              binding = defaultExpressionParser(_this, node, type, models, attribute.value);
              if (binding) {
                binding.options.destroyedHandler = function(child) {
                  var nullCount = 0, foundChild
                  for (var i = 0; i < bindings.length; i++) {
                    if (bindings[i] === child) {
                      bindings[i] = null;
                      foundChild = true;
                    }
                    if (bindings[i] === null) {
                      nullCount++;
                    }
                  }
                  if (foundChild && nullCount == bindings.length) {
                    _this.els = [];
                    _this.models = getAdapter().convertToModel ? getAdapter().convertToModel({}) : {};
                  }
                };
                bindings.push(binding);
              }
            }
          });
        }
      };
      _map(els, function(el) {
        parse(el);
        if (el.getElementsByTagName) {
          _map(el.getElementsByTagName('*'), parse);
        }
      });
      checkDefaultMethod(this, 'select', function() {
        var binding, _i, _len, _ref, _results;
        _ref = _this.bindings;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          binding = _ref[_i];
          if (binding != null && fn(binding)) {
            _results.push(binding);
          }
        }
        return _results;
      });
      checkDefaultMethod(this, 'publish', function() {
        _map(_this.select(function(b) {
          return b.binder.publishes;
        }), function(binding) {
          binding.publish();
        });
      });
      checkDefaultMethod(this, 'childSynced', function(childBinding) {
        var parentNodes, foundParent, foundBinding;
        if (!outsideCall) {
          parentNodes = [];
          var parentNode = childBinding.elParentNode;
          while (parentNode) {
            parentNodes.push(parentNode);
            parentNode = parentNode.parentNode;
          }
          foundParent = parentNodes.length;
          _map(_this.bindings, function(binding) {
            var i;
            i = __indexOf.call(parentNodes, binding.el);
            if (i != -1 && i < foundParent) {
              foundParent = i;
              foundBinding = binding;
            }
          });
          if (foundBinding) {
            foundBinding.sync();
          }
        }
      });
    }

    View.prototype.bindingRegExp = function() {
      var prefix;
      prefix = rivets.config.prefix;
      if (prefix) {
        return new RegExp("^data-" + prefix + "-");
      } else {
        return /^data-/;
      }
    };

    return View;

  })();

  eventDelegateHelper = function(el, jq1, jq2, w1, e1, event, fn) {
    var args;
    args = [event, fn];
    (window.jQuery != null ? (el = jQuery(el), el[jq1] || el[jq2]) : window[w1] != null ? (args.push(false), el[w1]) : (args[0] = 'on' + event, el[e1])).apply(el, args);
    return fn;
  };

  bindEvent = function(el, event, handler, context, bindContext) {
    return eventDelegateHelper(el, 'on', 'bind', 'addEventListener', 'attachEvent', event, function(e) {
      return handler.call(context, e, bindContext);
    });
  };

  unbindEvent = function(el, event, fn) {
    eventDelegateHelper(el, 'off', 'unbind', 'removeEventListener', 'detachEvent', event, fn);
  };

  iterate = function(collection, callback) {
    var adapter, n;
    adapter = getAdapter();
    if (adapter.iterate) {
      adapter.iterate(collection, callback);
    } else if (collection instanceof Array) {
      _map(collection, callback);
    } else {
      for (n in collection) {
        callback(collection[n], n);
      }
    }
  };

  createInputBinder = function(routine) {
    return {
      publishes: true,
      bind: function(el) {
        this.currentListener = bindEvent(el, 'change', this.publish);
      },
      unbind: function(el) {
        unbindEvent(el, 'change', this.currentListener);
      },
      routine: routine
    };
  };

  Rivets_binders = {
    enabled: function(el, value) {
      el.disabled = !value;
    },
    disabled: function(el, value) {
      el.disabled = !!value;
    },
    checked: createInputBinder(function(el, value) {
      el.checked = el.type === 'radio' ? el.value === value : !!value;
    }),
    unchecked: createInputBinder(function(el, value) {
      el.checked = el.type === 'radio' ? el.value !== value : !value;
    }),
    show: function(el, value) {
      el.style.display = value ? '' : 'none';
    },
    hide: function(el, value) {
      el.style.display = value ? 'none' : '';
    },
    html: function(el, value) {
//var $el = window.jQuery(el);
//$el.slideUp(function() {
      el.innerHTML = value != null ? value : '';
//      $el.slideDown();
//});
    },
    value: createInputBinder(function(el, value) {
      if (el.type === 'select-multiple') {
        _map(el, function(o) {
          if (value != null) {
            o.selected = _isIn(value, o.value);
          }
        });
      } else {
        el.value = value != null ? value : '';
      }
    }),
    text: function(el, value) {
//var $el = window.jQuery(el);
//$el.hide(function() {
      var newValue;
      newValue = value != null ? value : '';
      if (el.innerText != null) {
        el.innerText = newValue;
      } else {
        el.textContent = newValue;
      }
//      $el.show();
//});
    },
    "on-*": {
      "function": true,
      routine: function(el, value) {
        var currentListener, firstArg;
        firstArg = this.args[0];
        currentListener = this.currentListener;
        if (currentListener) {
          unbindEvent(el, firstArg, currentListener);
        }
        this.currentListener = bindEvent(el, firstArg, value, this.model, this.options.bindContext);
      }
    },
    "each-*": {
      block: true,
      bind: function(el) {
        parentNode = el.parentNode;
        this.marker = parentNode.insertBefore(document.createComment(" rivets: " + this.type + " "), el);
        parentNode.removeChild(el);
      },
      unbind: function(el) {
        var marker, parentNode;
        _map(this.iterated, function(view) {
          view.unbind();
          _map(view.els, function(e) {
            e.parentNode.removeChild(e);
          });
        });
        delete this.iterated;
        marker = this.marker;
        if (marker) {
          marker.parentNode.insertBefore(el, marker);
          marker.parentNode.removeChild(marker);
        }
        delete this.marker;
      },
      routine: function(el, collection) {
        var iterated, marker, parentNode, previous,
          _this = this;
        this.binder.unbind.call(this, el);
        this.binder.bind.call(this, el);
        marker = this.marker;
        this.iterated = iterated = [];
        if (collection) {
          previous = marker.nextSibling;
          iterate(collection, function(item, i) {
            var data, firstArg, newNode;
            data = {};
            firstArg = _this.args[0];
            iterate(_this.view.models, function(item, i) {
              data[i] = item;
            });
            data[firstArg] = item;
            data["" + firstArg + "_index"] = data['rivets_index'] = i;
            newNode = el.cloneNode(true);
            newNode.removeAttribute(['data', rivets.config.prefix, _this.type].join('-').replace('--', '-'));
            iterated.push(rivets.bind(marker.parentNode.insertBefore(newNode, previous), getAdapter().convertToModel ? getAdapter().convertToModel(data) : data));
            previous = newNode.nextSibling;
          });
        }
      }
    },
    "class-*": function(el, value) {
      var classOrder, firstArg, i;
      classOrder = el.className.split(' ');
      firstArg = this.args[0];
      i = __indexOf.call(classOrder, firstArg);
      console.log('class-*', el.className, this.args, classOrder, i);
      if (!value !== (i == -1)) {
        if (value) {
          classOrder.push(firstArg);
        } else {
          classOrder.splice(i, 1);
        }
        el.className = classOrder.join(' ');
      }
    },
    "*": function(el, value) {
      if (value) {
        el.setAttribute(this.type, value);
      } else {
        el.removeAttribute(this.type);
      }
    }
  };

  rivets = {
    binders: Rivets_binders,
    formatters: {},
    config: {
      preloadData: true
    },
    configure: function(options) {
      var property;
      options || (options = {});
      for (property in options) {
        rivets.config[property] = options[property];
      }
    },
    bind: function(el, models) {
      var view;
      (view = new View(el, models || {})).bind();
      return view;
    }
  };

  if (typeof module !== "undefined" && module !== null) {
    module.exports = rivets;
  } else {
    this.rivets = rivets;
  }

}).call(this);
