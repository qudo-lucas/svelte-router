
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    (function() {
        const env = {"NODE_ENV":false};
        try {
            if (process) {
                process.env = Object.assign({}, process.env);
                Object.assign(process.env, env);
                return;
            }
        } catch (e) {} // avoid ReferenceError: process is not defined
        globalThis.process = { env:env };
    })();

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }

      return self;
    }

    var assertThisInitialized = _assertThisInitialized;

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var setPrototypeOf = createCommonjsModule(function (module) {
    function _setPrototypeOf(o, p) {
      module.exports = _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
      };

      return _setPrototypeOf(o, p);
    }

    module.exports = _setPrototypeOf;
    });

    function _inherits(subClass, superClass) {
      if (typeof superClass !== "function" && superClass !== null) {
        throw new TypeError("Super expression must either be null or a function");
      }

      subClass.prototype = Object.create(superClass && superClass.prototype, {
        constructor: {
          value: subClass,
          writable: true,
          configurable: true
        }
      });
      if (superClass) setPrototypeOf(subClass, superClass);
    }

    var inherits = _inherits;

    var _typeof_1 = createCommonjsModule(function (module) {
    function _typeof(obj) {
      "@babel/helpers - typeof";

      if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
        module.exports = _typeof = function _typeof(obj) {
          return typeof obj;
        };
      } else {
        module.exports = _typeof = function _typeof(obj) {
          return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
        };
      }

      return _typeof(obj);
    }

    module.exports = _typeof;
    });

    function _possibleConstructorReturn(self, call) {
      if (call && (_typeof_1(call) === "object" || typeof call === "function")) {
        return call;
      }

      return assertThisInitialized(self);
    }

    var possibleConstructorReturn = _possibleConstructorReturn;

    var getPrototypeOf = createCommonjsModule(function (module) {
    function _getPrototypeOf(o) {
      module.exports = _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
        return o.__proto__ || Object.getPrototypeOf(o);
      };
      return _getPrototypeOf(o);
    }

    module.exports = _getPrototypeOf;
    });

    function _arrayWithHoles(arr) {
      if (Array.isArray(arr)) return arr;
    }

    var arrayWithHoles = _arrayWithHoles;

    function _iterableToArrayLimit(arr, i) {
      if (typeof Symbol === "undefined" || !(Symbol.iterator in Object(arr))) return;
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    var iterableToArrayLimit = _iterableToArrayLimit;

    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;

      for (var i = 0, arr2 = new Array(len); i < len; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    }

    var arrayLikeToArray = _arrayLikeToArray;

    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
    }

    var unsupportedIterableToArray = _unsupportedIterableToArray;

    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var nonIterableRest = _nonIterableRest;

    function _slicedToArray(arr, i) {
      return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || unsupportedIterableToArray(arr, i) || nonIterableRest();
    }

    var slicedToArray = _slicedToArray;

    function _classCallCheck(instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    }

    var classCallCheck = _classCallCheck;

    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      return Constructor;
    }

    var createClass = _createClass;

    function _arrayWithoutHoles(arr) {
      if (Array.isArray(arr)) return arrayLikeToArray(arr);
    }

    var arrayWithoutHoles = _arrayWithoutHoles;

    function _iterableToArray(iter) {
      if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
    }

    var iterableToArray = _iterableToArray;

    function _nonIterableSpread() {
      throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }

    var nonIterableSpread = _nonIterableSpread;

    function _toConsumableArray(arr) {
      return arrayWithoutHoles(arr) || iterableToArray(arr) || unsupportedIterableToArray(arr) || nonIterableSpread();
    }

    var toConsumableArray = _toConsumableArray;

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function () { var Super = getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return possibleConstructorReturn(this, result); }; }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

    function noop$1() {}

    function assign(tar, src) {
      // @ts-ignore
      for (var k in src) {
        tar[k] = src[k];
      }

      return tar;
    }

    function run$1(fn) {
      return fn();
    }

    function blank_object$1() {
      return Object.create(null);
    }

    function run_all$1(fns) {
      fns.forEach(run$1);
    }

    function is_function$1(thing) {
      return typeof thing === 'function';
    }

    function safe_not_equal$1(a, b) {
      return a != a ? b == b : a !== b || a && _typeof_1(a) === 'object' || typeof a === 'function';
    }

    function subscribe$1(store) {
      if (store == null) {
        return noop$1;
      }

      for (var _len = arguments.length, callbacks = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        callbacks[_key - 1] = arguments[_key];
      }

      var unsub = store.subscribe.apply(store, callbacks);
      return unsub.unsubscribe ? function () {
        return unsub.unsubscribe();
      } : unsub;
    }

    function component_subscribe(component, store, callback) {
      component.$$.on_destroy.push(subscribe$1(store, callback));
    }

    function set_store_value(store, ret) {
      var value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ret;
      store.set(value);
      return ret;
    }

    function insert$1(target, node, anchor) {
      target.insertBefore(node, anchor || null);
    }

    function detach$1(node) {
      node.parentNode.removeChild(node);
    }

    function text$1(data) {
      return document.createTextNode(data);
    }

    function empty() {
      return text$1('');
    }

    function children$1(element) {
      return Array.from(element.childNodes);
    }

    function custom_event(type, detail) {
      var e = document.createEvent('CustomEvent');
      e.initCustomEvent(type, false, false, detail);
      return e;
    }

    var current_component$1;

    function set_current_component$1(component) {
      current_component$1 = component;
    }

    function get_current_component() {
      if (!current_component$1) throw new Error("Function called outside component initialization");
      return current_component$1;
    }

    function onMount(fn) {
      get_current_component().$$.on_mount.push(fn);
    }

    function createEventDispatcher() {
      var component = get_current_component();
      return function (type, detail) {
        var callbacks = component.$$.callbacks[type];

        if (callbacks) {
          // TODO are there situations where events could be dispatched
          // in a server (non-DOM) environment?
          var event = custom_event(type, detail);
          callbacks.slice().forEach(function (fn) {
            fn.call(component, event);
          });
        }
      };
    }

    var dirty_components$1 = [];
    var binding_callbacks$1 = [];
    var render_callbacks$1 = [];
    var flush_callbacks$1 = [];
    var resolved_promise$1 = Promise.resolve();
    var update_scheduled$1 = false;

    function schedule_update$1() {
      if (!update_scheduled$1) {
        update_scheduled$1 = true;
        resolved_promise$1.then(flush$1);
      }
    }

    function add_render_callback$1(fn) {
      render_callbacks$1.push(fn);
    }

    var flushing$1 = false;
    var seen_callbacks$1 = new Set();

    function flush$1() {
      if (flushing$1) return;
      flushing$1 = true;

      do {
        // first, call beforeUpdate functions
        // and update components
        for (var i = 0; i < dirty_components$1.length; i += 1) {
          var component = dirty_components$1[i];
          set_current_component$1(component);
          update$1(component.$$);
        }

        dirty_components$1.length = 0;

        while (binding_callbacks$1.length) {
          binding_callbacks$1.pop()();
        } // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...


        for (var _i = 0; _i < render_callbacks$1.length; _i += 1) {
          var callback = render_callbacks$1[_i];

          if (!seen_callbacks$1.has(callback)) {
            // ...so guard against infinite loops
            seen_callbacks$1.add(callback);
            callback();
          }
        }

        render_callbacks$1.length = 0;
      } while (dirty_components$1.length);

      while (flush_callbacks$1.length) {
        flush_callbacks$1.pop()();
      }

      update_scheduled$1 = false;
      flushing$1 = false;
      seen_callbacks$1.clear();
    }

    function update$1($$) {
      if ($$.fragment !== null) {
        $$.update();
        run_all$1($$.before_update);
        var dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback$1);
      }
    }

    var outroing$1 = new Set();
    var outros$1;

    function group_outros() {
      outros$1 = {
        r: 0,
        c: [],
        p: outros$1 // parent group

      };
    }

    function check_outros() {
      if (!outros$1.r) {
        run_all$1(outros$1.c);
      }

      outros$1 = outros$1.p;
    }

    function transition_in$1(block, local) {
      if (block && block.i) {
        outroing$1["delete"](block);
        block.i(local);
      }
    }

    function transition_out$1(block, local, detach, callback) {
      if (block && block.o) {
        if (outroing$1.has(block)) return;
        outroing$1.add(block);
        outros$1.c.push(function () {
          outroing$1["delete"](block);

          if (callback) {
            if (detach) block.d(1);
            callback();
          }
        });
        block.o(local);
      }
    }

    function get_spread_update(levels, updates) {
      var update = {};
      var to_null_out = {};
      var accounted_for = {
        $$scope: 1
      };
      var i = levels.length;

      while (i--) {
        var o = levels[i];
        var n = updates[i];

        if (n) {
          for (var key in o) {
            if (!(key in n)) to_null_out[key] = 1;
          }

          for (var _key2 in n) {
            if (!accounted_for[_key2]) {
              update[_key2] = n[_key2];
              accounted_for[_key2] = 1;
            }
          }

          levels[i] = n;
        } else {
          for (var _key3 in o) {
            accounted_for[_key3] = 1;
          }
        }
      }

      for (var _key4 in to_null_out) {
        if (!(_key4 in update)) update[_key4] = undefined;
      }

      return update;
    }

    function get_spread_object(spread_props) {
      return _typeof_1(spread_props) === 'object' && spread_props !== null ? spread_props : {};
    }

    function create_component$1(block) {
      block && block.c();
    }

    function mount_component$1(component, target, anchor) {
      var _component$$$ = component.$$,
          fragment = _component$$$.fragment,
          on_mount = _component$$$.on_mount,
          on_destroy = _component$$$.on_destroy,
          after_update = _component$$$.after_update;
      fragment && fragment.m(target, anchor); // onMount happens before the initial afterUpdate

      add_render_callback$1(function () {
        var new_on_destroy = on_mount.map(run$1).filter(is_function$1);

        if (on_destroy) {
          on_destroy.push.apply(on_destroy, toConsumableArray(new_on_destroy));
        } else {
          // Edge case - component was destroyed immediately,
          // most likely as a result of a binding initialising
          run_all$1(new_on_destroy);
        }

        component.$$.on_mount = [];
      });
      after_update.forEach(add_render_callback$1);
    }

    function destroy_component$1(component, detaching) {
      var $$ = component.$$;

      if ($$.fragment !== null) {
        run_all$1($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)

        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
      }
    }

    function make_dirty$1(component, i) {
      if (component.$$.dirty[0] === -1) {
        dirty_components$1.push(component);
        schedule_update$1();
        component.$$.dirty.fill(0);
      }

      component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
    }

    function init$1(component, options, instance, create_fragment, not_equal, props) {
      var dirty = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : [-1];
      var parent_component = current_component$1;
      set_current_component$1(component);
      var prop_values = options.props || {};
      var $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props: props,
        update: noop$1,
        not_equal: not_equal,
        bound: blank_object$1(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object$1(),
        dirty: dirty
      };
      var ready = false;
      $$.ctx = instance ? instance(component, prop_values, function (i, ret) {
        var value = (arguments.length <= 2 ? 0 : arguments.length - 2) ? arguments.length <= 2 ? undefined : arguments[2] : ret;

        if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
          if ($$.bound[i]) $$.bound[i](value);
          if (ready) make_dirty$1(component, i);
        }

        return ret;
      }) : [];
      $$.update();
      ready = true;
      run_all$1($$.before_update); // `false` as a special case of no DOM component

      $$.fragment = create_fragment ? create_fragment($$.ctx) : false;

      if (options.target) {
        if (options.hydrate) {
          var nodes = children$1(options.target); // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

          $$.fragment && $$.fragment.l(nodes);
          nodes.forEach(detach$1);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          $$.fragment && $$.fragment.c();
        }

        if (options.intro) transition_in$1(component.$$.fragment);
        mount_component$1(component, options.target, options.anchor);
        flush$1();
      }

      set_current_component$1(parent_component);
    }

    var SvelteComponent$1 = /*#__PURE__*/function () {
      function SvelteComponent() {
        classCallCheck(this, SvelteComponent);
      }

      createClass(SvelteComponent, [{
        key: "$destroy",
        value: function $destroy() {
          destroy_component$1(this, 1);
          this.$destroy = noop$1;
        }
      }, {
        key: "$on",
        value: function $on(type, callback) {
          var callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
          callbacks.push(callback);
          return function () {
            var index = callbacks.indexOf(callback);
            if (index !== -1) callbacks.splice(index, 1);
          };
        }
      }, {
        key: "$set",
        value: function $set() {// overridden by instance, if it has props
        }
      }]);

      return SvelteComponent;
    }();

    var subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */

    function readable(value, start) {
      return {
        subscribe: writable(value, start).subscribe
      };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */


    function writable(value) {
      var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop$1;
      var stop;
      var subscribers = [];

      function set(new_value) {
        if (safe_not_equal$1(value, new_value)) {
          value = new_value;

          if (stop) {
            // store is ready
            var run_queue = !subscriber_queue.length;

            for (var i = 0; i < subscribers.length; i += 1) {
              var s = subscribers[i];
              s[1]();
              subscriber_queue.push(s, value);
            }

            if (run_queue) {
              for (var _i2 = 0; _i2 < subscriber_queue.length; _i2 += 2) {
                subscriber_queue[_i2][0](subscriber_queue[_i2 + 1]);
              }

              subscriber_queue.length = 0;
            }
          }
        }
      }

      function update(fn) {
        set(fn(value));
      }

      function subscribe(run) {
        var invalidate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : noop$1;
        var subscriber = [run, invalidate];
        subscribers.push(subscriber);

        if (subscribers.length === 1) {
          stop = start(set) || noop$1;
        }

        run(value);
        return function () {
          var index = subscribers.indexOf(subscriber);

          if (index !== -1) {
            subscribers.splice(index, 1);
          }

          if (subscribers.length === 0) {
            stop();
            stop = null;
          }
        };
      }

      return {
        set: set,
        update: update,
        subscribe: subscribe
      };
    }

    function derived(stores, fn, initial_value) {
      var single = !Array.isArray(stores);
      var stores_array = single ? [stores] : stores;
      var auto = fn.length < 2;
      return readable(initial_value, function (set) {
        var inited = false;
        var values = [];
        var pending = 0;
        var cleanup = noop$1;

        var sync = function sync() {
          if (pending) {
            return;
          }

          cleanup();
          var result = fn(single ? values[0] : values, set);

          if (auto) {
            set(result);
          } else {
            cleanup = is_function$1(result) ? result : noop$1;
          }
        };

        var unsubscribers = stores_array.map(function (store, i) {
          return subscribe$1(store, function (value) {
            values[i] = value;
            pending &= ~(1 << i);

            if (inited) {
              sync();
            }
          }, function () {
            pending |= 1 << i;
          });
        });
        inited = true;
        sync();
        return function stop() {
          run_all$1(unsubscribers);
          cleanup();
        };
      });
    }
    /* src/router.svelte generated by Svelte v3.22.0 */


    function create_fragment(ctx) {
      var switch_instance_anchor;
      var current;
      var switch_instance_spread_levels = [{
        send:
        /*sendEvent*/
        ctx[5]
      }, {
        router:
        /*sharedData*/
        ctx[4]
      },
      /*props*/
      ctx[0]];
      var switch_value =
      /*component*/
      ctx[1];

      function switch_props(ctx) {
        var switch_instance_props = {};

        for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
          switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
        }

        return {
          props: switch_instance_props
        };
      }

      if (switch_value) {
        var switch_instance = new switch_value(switch_props());
      }

      return {
        c: function c() {
          if (switch_instance) create_component$1(switch_instance.$$.fragment);
          switch_instance_anchor = empty();
        },
        m: function m(target, anchor) {
          if (switch_instance) {
            mount_component$1(switch_instance, target, anchor);
          }

          insert$1(target, switch_instance_anchor, anchor);
          current = true;
        },
        p: function p(ctx, _ref) {
          var _ref2 = slicedToArray(_ref, 1),
              dirty = _ref2[0];

          var switch_instance_changes = dirty &
          /*sendEvent, sharedData, props*/
          49 ? get_spread_update(switch_instance_spread_levels, [dirty &
          /*sendEvent*/
          32 && {
            send:
            /*sendEvent*/
            ctx[5]
          }, dirty &
          /*sharedData*/
          16 && {
            router:
            /*sharedData*/
            ctx[4]
          }, dirty &
          /*props*/
          1 && get_spread_object(
          /*props*/
          ctx[0])]) : {};

          if (switch_value !== (switch_value =
          /*component*/
          ctx[1])) {
            if (switch_instance) {
              group_outros();
              var old_component = switch_instance;
              transition_out$1(old_component.$$.fragment, 1, 0, function () {
                destroy_component$1(old_component, 1);
              });
              check_outros();
            }

            if (switch_value) {
              switch_instance = new switch_value(switch_props());
              create_component$1(switch_instance.$$.fragment);
              transition_in$1(switch_instance.$$.fragment, 1);
              mount_component$1(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
            } else {
              switch_instance = null;
            }
          } else if (switch_value) {
            switch_instance.$set(switch_instance_changes);
          }
        },
        i: function i(local) {
          if (current) return;
          if (switch_instance) transition_in$1(switch_instance.$$.fragment, local);
          current = true;
        },
        o: function o(local) {
          if (switch_instance) transition_out$1(switch_instance.$$.fragment, local);
          current = false;
        },
        d: function d(detaching) {
          if (detaching) detach$1(switch_instance_anchor);
          if (switch_instance) destroy_component$1(switch_instance, detaching);
        }
      };
    }

    function instance($$self, $$props, $$invalidate) {
      var $lastEvent;
      var $currentName;
      var dispatch = createEventDispatcher();
      var _$$props$base = $$props.base,
          base = _$$props$base === void 0 ? "" : _$$props$base;
      var initial = $$props.initial;
      var _$$props$views = $$props.views,
          views = _$$props$views === void 0 ? {} : _$$props$views;
      var _$$props$props = $$props.props,
          props = _$$props$props === void 0 ? {} : _$$props$props;
      var component;
      var currentName = writable("");
      component_subscribe($$self, currentName, function (value) {
        return $$invalidate(12, $currentName = value);
      });
      var lastEvent = writable({});
      component_subscribe($$self, lastEvent, function (value) {
        return $$invalidate(11, $lastEvent = value);
      }); // I feel like we shouldn't follow the docs and name the derived
      // stores with a "$" since we are inside a .svelte file not .js...idk.
      // Using a "_" instead just to be safe."

      var sharedData = derived([currentName, lastEvent], function (_ref3, set) {
        var _ref4 = slicedToArray(_ref3, 2),
            _currentName = _ref4[0],
            _ref4$ = _ref4[1],
            name = _ref4$.name,
            data = _ref4$.data,
            _event = _ref4$._event;

        return set({
          data: data,
          _event: _event,
          event: name,
          current: _currentName,
          params: mapParams() // Capture url params when anything happens

        });
      }); // Used to test if we are able to match
      // the current url with a component

      var urls = new Map(Object.entries(views).map(function (_ref5) {
        var _ref6 = slicedToArray(_ref5, 2),
            name = _ref6[0],
            component = _ref6[1];

        var url = "#/".concat(base).concat(base ? "/" : "").concat(name);
        return [url, name];
      })); // Remove leading and trailing slashes

      var sanitize = function sanitize(str) {
        return str.replace(/^\/|\/$/g, "");
      };

      var read = function read() {
        var start = "#/".concat(base).concat(base ? "/" : ""); // Ignore url params since sendEvent captures those. 

        var _window$location$hash = window.location.hash.split("?"),
            _window$location$hash2 = slicedToArray(_window$location$hash, 1),
            hash = _window$location$hash2[0];

        var _hash$replace$split = hash.replace(start, "").split("/"),
            _hash$replace$split2 = slicedToArray(_hash$replace$split, 1),
            name = _hash$replace$split2[0]; // // Put it back together


        var newUrl = "#/".concat(base).concat(base ? "/" : "").concat(name);

        if (urls.has(newUrl)) {
          $$invalidate(6, initial = urls.get(newUrl));
        }

        sendEvent(initial);
      };

      var params = function params() {
        var _window$location$href = window.location.href.split("?"),
            _window$location$href2 = slicedToArray(_window$location$href, 2),
            _window$location$href3 = _window$location$href2[1],
            params = _window$location$href3 === void 0 ? false : _window$location$href3;

        if (!params) {
          return params;
        }

        return params;
      };

      var mapParams = function mapParams() {
        if (!params()) {
          return new Map();
        }

        var segments = params().split("&");
        return new Map(segments.map(function (segment) {
          return segment.split("=");
        }));
      };

      var sendEvent = function sendEvent() {
        var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var _event = $lastEvent;
        var url = "#/".concat(base).concat(base ? "/" : "").concat(name);
        set_store_value(lastEvent, $lastEvent = {
          _event: _event,
          data: data,
          name: name
        });
        sanitize(name); // Test if we have a component for this url

        if (urls.has(url) && name !== $currentName) {
          // Render new component
          $$invalidate(1, component = views[name]);
          set_store_value(currentName, $currentName = name);
          console.log("ROUTER: View updated to \"".concat(name, "\"")); // Add the url to the address bar.
          // Slap the event on the browser history real quick:
          // We do this so that in theory, you could hit the 
          // browser back button and the page would load with 
          // whatever state it had the last time it got an event.

          history.pushState($lastEvent, name, "".concat(url).concat(params() ? "?".concat(params()) : ""));
        } else {
          console.log("ROUTER: No view found for event ".concat(name, ". Available views:"), Object.keys(views));
        }
      };

      window.onpopstate = function () {
        return read();
      };

      onMount(function () {
        return read();
      });
      var send = sendEvent;
      var router = sharedData;

      $$self.$set = function ($$props) {
        if ("base" in $$props) $$invalidate(7, base = $$props.base);
        if ("initial" in $$props) $$invalidate(6, initial = $$props.initial);
        if ("views" in $$props) $$invalidate(8, views = $$props.views);
        if ("props" in $$props) $$invalidate(0, props = $$props.props);
      };

      return [props, component, currentName, lastEvent, sharedData, sendEvent, initial, base, views, send, router];
    }

    var Router = /*#__PURE__*/function (_SvelteComponent) {
      inherits(Router, _SvelteComponent);

      var _super = _createSuper(Router);

      function Router(options) {
        var _this;

        classCallCheck(this, Router);

        _this = _super.call(this);
        init$1(assertThisInitialized(_this), options, instance, create_fragment, safe_not_equal$1, {
          base: 7,
          initial: 6,
          views: 8,
          props: 0,
          send: 9,
          router: 10
        });
        return _this;
      }

      createClass(Router, [{
        key: "send",
        get: function get() {
          return this.$$.ctx[9];
        }
      }, {
        key: "router",
        get: function get() {
          return this.$$.ctx[10];
        }
      }]);

      return Router;
    }(SvelteComponent$1);

    function create_fragment$1(ctx) {
    	let h1;

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Page One";
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(h1);
    		}
    	};
    }

    class Page_one extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$1, safe_not_equal, {});
    	}
    }

    function create_fragment$2(ctx) {
    	let h1;

    	return {
    		c() {
    			h1 = element("h1");
    			h1.textContent = "Page Two";
    		},
    		m(target, anchor) {
    			insert(target, h1, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(h1);
    		}
    	};
    }

    class Page_two extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$2, safe_not_equal, {});
    	}
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (2:4) {#each Object.keys(views) as view}
    function create_each_block(ctx) {
    	let button;
    	let t_value = /*view*/ ctx[9] + "";
    	let t;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[6](/*view*/ ctx[9], ...args);
    	}

    	return {
    		c() {
    			button = element("button");
    			t = text(t_value);
    		},
    		m(target, anchor, remount) {
    			insert(target, button, anchor);
    			append(button, t);
    			if (remount) dispose();
    			dispose = listen(button, "click", click_handler);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let main;
    	let t;
    	let updating_send;
    	let updating_router;
    	let current;
    	let each_value = Object.keys(/*views*/ ctx[2]);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	function router_1_send_binding(value) {
    		/*router_1_send_binding*/ ctx[7].call(null, value);
    	}

    	function router_1_router_binding(value) {
    		/*router_1_router_binding*/ ctx[8].call(null, value);
    	}

    	let router_1_props = {
    		views: /*views*/ ctx[2],
    		initial: "page-one"
    	};

    	if (/*send*/ ctx[0] !== void 0) {
    		router_1_props.send = /*send*/ ctx[0];
    	}

    	if (/*router*/ ctx[1] !== void 0) {
    		router_1_props.router = /*router*/ ctx[1];
    	}

    	const router_1 = new Router({ props: router_1_props });
    	binding_callbacks.push(() => bind(router_1, "send", router_1_send_binding));
    	binding_callbacks.push(() => bind(router_1, "router", router_1_router_binding));

    	return {
    		c() {
    			main = element("main");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			create_component(router_1.$$.fragment);
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}

    			append(main, t);
    			mount_component(router_1, main, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*send, Object, views*/ 5) {
    				each_value = Object.keys(/*views*/ ctx[2]);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(main, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			const router_1_changes = {};

    			if (!updating_send && dirty & /*send*/ 1) {
    				updating_send = true;
    				router_1_changes.send = /*send*/ ctx[0];
    				add_flush_callback(() => updating_send = false);
    			}

    			if (!updating_router && dirty & /*router*/ 2) {
    				updating_router = true;
    				router_1_changes.router = /*router*/ ctx[1];
    				add_flush_callback(() => updating_router = false);
    			}

    			router_1.$set(router_1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(router_1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(router_1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_each(each_blocks, detaching);
    			destroy_component(router_1);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $router,
    		$$unsubscribe_router = noop,
    		$$subscribe_router = () => ($$unsubscribe_router(), $$unsubscribe_router = subscribe(router, $$value => $$invalidate(5, $router = $$value)), router);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_router());
    	const views = { "page-one": Page_one, "page-two": Page_two };
    	let send;
    	let router;
    	$$subscribe_router();
    	const click_handler = view => send(view);

    	function router_1_send_binding(value) {
    		send = value;
    		$$invalidate(0, send);
    	}

    	function router_1_router_binding(value) {
    		router = value;
    		$$subscribe_router($$invalidate(1, router));
    	}

    	let event;
    	let params;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$router*/ 32) {
    			 $$invalidate(3, { event, params } = $router || {}, event, ($$invalidate(4, params), $$invalidate(5, $router)));
    		}

    		if ($$self.$$.dirty & /*$router, event, params*/ 56) {
    			 if ($router) {
    				event === "page-two" && console.log("I am at page two");
    				params.has("id") && console.log(params.get("id"));
    			}
    		}
    	};

    	return [
    		send,
    		router,
    		views,
    		event,
    		params,
    		$router,
    		click_handler,
    		router_1_send_binding,
    		router_1_router_binding
    	];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$3, safe_not_equal, {});
    	}
    }

    var app = new App({
      target: document.body
    });

    return app;

}());
