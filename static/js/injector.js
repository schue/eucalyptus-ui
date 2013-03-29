// # Injector (class, requirejs plugin)
// 
// A requirejs plugin which allows to wire up functions whose arguments are
// to be looked up by name and injected.
//
// ## Usage:
// 
// Create a javascript source which imports Injector, registers some modules
// for it.  Reference it elsewhere as 
// ``require (['yourJSFileName!injectedThing'], function(injectedThing) { ... })``
define([], function() {

  function Injector() {
    var self = this;

    // Hash of modules belonging to this injector
    var modules = {};

    // trick to find argument names of functions for injection
    function argumentNames(func) {
      var names = func.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
              .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
              .replace(/\s+/g, '').split(',');
      if (names.length === 1 && names[0] === '') {
        names = [];
      }
      return names;
    }

    // Implementation of requirejs plugin.load()
    function doLoad(name, parentRequire, onload, config) {
      // Look up the registration info
      var m = modules[name];
      if (typeof m === 'undefined') {
        throw new Error("No module named " + name + " in " + JSON.stringify(modules))
      }
      // If it's an object, just return it
      if (typeof m['target'] !== 'function') {
        onload(m.target);
        return m.target;
      }
      // If we are supposed to cache the value and we have one, return it
      if (m.cacheResult && m.cache) {
        onload(m.cache.value);
        return m.cache.value;
      }

      // Find the arguments to the function, so we can inject those
      var args = argumentNames(m.target);
      // List of argument values we will populate
      var toPass = [];
      // Flags for each argument so we know when we've been called back
      // once for every argument and are ready to call back *our* callback
      var done = [];
      // Initialize for sanity's sake
      for (var i = 0; i < args.length; i++) {
        done[i] = false;
      }

      // Called when the arguments array is fully populated and we're ready to
      // invoke *our* module function
      function allDone() {
        var result = m.target.apply(this, toPass);
        if (m.cacheResult) {
          m.cache = {
            value: result
          }
        }
        onload(result);
      }

      // Recursively call ourselves for one method parameter, by name
      // This function really exists just to isolate the scope ``index`` 
      // is resolved in
      function loadOne(index, name) {
        function doneOne(value) {
          // store the argument value
          toPass[index] = value;
          // flag this argument as done
          done[index] = true;
          // see if we have a complete set of arguments
          var finished = true;
          for (var j = 0; j < done.length; j++) {
            finished &= done[j];
          }
          // If so, call back the callback passed into doLoad()
          if (finished) {
            allDone();
          }
        }
        doLoad(name, parentRequire, doneOne, config);
      }

      if (args.length > 0) {
        // If the function takes arguments, resolve those as other modules
        for (var i = 0; i < args.length; i++) {
          loadOne(i, args[i]);
        }
      } else {
        // Otherwise, we are ready to go
        allDone()
      }
    }

    self.load = doLoad;
    self.module = function(name, func, cacheResult) {
      modules[name] = {
        cacheResult: cacheResult || false,
        target: func
      }
      return self;
    };
    self.discard = function(name) {
      // Clear cached values
      var ref = modules[name];
      if (ref.cacheResult) {
        delete ref.cache;
      }
      return self;
    }
  }
  // Modules, for tests with node
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Injector;
  }
  return Injector;
});
