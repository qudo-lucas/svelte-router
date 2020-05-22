var app = (function () {
    'use strict';

    (function() {
        const env = {"NODE_ENV":true};
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    function create_fragment(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return { props: { router: /*router*/ ctx[1] } };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const switch_instance_changes = {};
    			if (dirty & /*router*/ 2) switch_instance_changes.router = /*router*/ ctx[1];

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    function instance_1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let { base = "" } = $$props;
    	let { initial } = $$props;
    	let { views = {} } = $$props;
    	let _event;
    	let component;
    	let currentName;

    	// Used to test if we are able to match
    	// the current url with a component
    	const urls = new Map(Object.entries(views).map(([name, component]) => {
    			const url = `#/${base}${base ? "/" : ""}${name}`;
    			return [url, name];
    		}));

    	// Remove leading and trailing slashes
    	const sanitize = str => {
    		return str.replace(/^\/|\/$/g, "");
    	};

    	const read = () => {
    		const start = `#/${base}${base ? "/" : ""}`;
    		const hash = window.location.hash;
    		const [name] = hash.replace(start, "").split("/");

    		// // Put it back together
    		const newUrl = `#/${base}${base ? "/" : ""}${name}`;

    		if (urls.has(newUrl)) {
    			$$invalidate(2, initial = urls.get(newUrl));
    		}

    		router.send(initial);
    	};

    	const router = {
    		event: {},
    		send: (name = "", data = {}) => {
    			let url = `#/${base}${base ? "/" : ""}${name}`;
    			sanitize(name);

    			// Send the same event as a svelte event
    			dispatch(name, data);

    			dispatch("event", { name, data });

    			// Test if we have a component for this url
    			if (!urls.has(url)) {
    				$$invalidate(0, component);
    				return;
    			}

    			_event = router.event.data;

    			// Leave existing
    			if (name === currentName) {
    				return component;
    			}

    			// Render new component
    			$$invalidate(0, component = views[name]);

    			currentName = name;

    			// Add the url to the address bar.
    			// Slap the event on the browser history real quick:
    			// We do this so that in theory, you could hit the 
    			// browser back button and the page would load with 
    			// whatever state it hadthe last time it got an event.
    			history.pushState({ _event, data, name }, name, url);

    			// Pull it off the browser history to make it available in component
    			$$invalidate(1, router.event = history.state, router);
    		}
    	};

    	window.onpopstate = () => read();
    	onMount(() => read());
    	let { instance = router } = $$props;

    	$$self.$set = $$props => {
    		if ("base" in $$props) $$invalidate(3, base = $$props.base);
    		if ("initial" in $$props) $$invalidate(2, initial = $$props.initial);
    		if ("views" in $$props) $$invalidate(4, views = $$props.views);
    		if ("instance" in $$props) $$invalidate(5, instance = $$props.instance);
    	};

    	return [component, router, initial, base, views, instance];
    }

    class Router extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance_1, create_fragment, safe_not_equal, {
    			base: 3,
    			initial: 2,
    			views: 4,
    			instance: 5
    		});
    	}
    }

    function create_fragment$1(ctx) {
    	let div5;
    	let div4;
    	let div0;
    	let t0;
    	let div2;
    	let p;
    	let t2;
    	let div1;
    	let pre;
    	let code;
    	let t4;
    	let div3;
    	let button;
    	let dispose;

    	return {
    		c() {
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			div0.innerHTML = `<img src="logo.svg" alt="logo">`;
    			t0 = space();
    			div2 = element("div");
    			p = element("p");
    			p.textContent = "A simple router that enforces event driven user interfaces.";
    			t2 = space();
    			div1 = element("div");
    			pre = element("pre");
    			code = element("code");
    			code.textContent = `${`npm install svelte-event-router`}`;
    			t4 = space();
    			div3 = element("div");
    			button = element("button");
    			button.textContent = "Get Started";
    			attr(div0, "class", "mdl-card__title mdl-card--expand");
    			attr(p, "class", "m-0");
    			attr(code, "class", "language-js");
    			attr(div1, "class", "py-4");
    			attr(div2, "class", "mdl-card__supporting-text");
    			attr(button, "class", "\n                mdl-button\n                mdl-js-button\n                mdl-button--raised\n                mdl-button--colored\n                bg-orange");
    			attr(div3, "class", "mdl-card__actions mdl-card--border");
    			attr(div4, "class", "mdl-card mdl-shadow--2dp");
    			attr(div5, "class", "view");
    		},
    		m(target, anchor, remount) {
    			insert(target, div5, anchor);
    			append(div5, div4);
    			append(div4, div0);
    			append(div4, t0);
    			append(div4, div2);
    			append(div2, p);
    			append(div2, t2);
    			append(div2, div1);
    			append(div1, pre);
    			append(pre, code);
    			append(div4, t4);
    			append(div4, div3);
    			append(div3, button);
    			/*div5_binding*/ ctx[3](div5);
    			if (remount) dispose();
    			dispose = listen(button, "click", /*click_handler*/ ctx[2]);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div5);
    			/*div5_binding*/ ctx[3](null);
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { router } = $$props;
    	let view;

    	onMount(() => {
    		var script = document.createElement("script");
    		script.src = "prism.js";
    		view.appendChild(script);
    	});

    	const click_handler = () => router.send("usage");

    	function div5_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, view = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("router" in $$props) $$invalidate(0, router = $$props.router);
    	};

    	return [router, view, click_handler, div5_binding];
    }

    class Home extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment$1, safe_not_equal, { router: 0 });
    	}
    }

    function create_fragment$2(ctx) {
    	let div8;
    	let div7;
    	let div5;
    	let div0;
    	let h3;
    	let t1;
    	let hr;
    	let t2;
    	let pre0;
    	let code;
    	let t4;
    	let div1;
    	let t5;
    	let table;
    	let t39;
    	let div6;
    	let button0;
    	let t41;
    	let button1;
    	let dispose;

    	return {
    		c() {
    			div8 = element("div");
    			div7 = element("div");
    			div5 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Usage";
    			t1 = space();
    			hr = element("hr");
    			t2 = space();
    			pre0 = element("pre");
    			code = element("code");

    			code.textContent = `${`
<div class="container">
    <Router initial="home" {views} />
</div>

<script>
import Router from "svelte-router";

// Views
import home from "./views/home.svelte";
import usage from "./views/usage.svelte";
import events from "./views/events.svelte";
import nested from "./views/nested.svelte";

const views = {
    home,                   // url.com/#/home                      
    usage,                  // url.com/#/usage                        
    events,                 // url.com/#/events                 
    renamed : nested,       // url.com/#/renamed
}
</script>
`}`;

    			t4 = space();
    			div1 = element("div");
    			t5 = space();
    			table = element("table");

    			table.innerHTML = `<thead><tr><th>option</th> 
                        <th>type</th> 
                        <th>description</th></tr></thead> 
                <tbody><tr><td><div class="option"><pre class="m-0">initial</pre></div></td> 
                    <td><strong>String (required)</strong></td> 
                    <td>The initial route to load. This will also be the fallback URL for when a user tries to visit an invalid route on page load. After a page it loaded, invalid routes will fail silently.</td></tr> 
                <tr><td><div class="option"><pre class="m-0">views</pre></div></td> 
                    <td><strong>Object (required)</strong></td> 
                    <td>An object full of components. The keys will become routes and the values are the components to be loaded.</td></tr> 
                <tr><td><div class="option"><pre class="m-0">base</pre></div></td> 
                    <td><strong>String (optional)</strong></td> 
                    <td>Primarily used in nested routers. This is the part of the URL that comes before your route name.<br><strong>Example:</strong> In <i>url.com/auth/signup</i>, <i>auth</i> would be the <strong>base</strong> and <i>signup</i> would be the route/view name.</td></tr></tbody>`;

    			t39 = space();
    			div6 = element("div");
    			button0 = element("button");
    			button0.textContent = "Back";
    			t41 = space();
    			button1 = element("button");
    			button1.textContent = "Events";
    			attr(code, "class", "language-html");
    			attr(div0, "class", "py-4");
    			attr(div1, "class", "py-4");
    			attr(div5, "class", "mdl-card__supporting-text");
    			attr(button0, "class", "\n                mdl-button\n                mdl-js-button\n                mdl-button--raised");
    			attr(button1, "class", "\n                mdl-button\n                mdl-js-button\n                mdl-button--raised\n                mdl-button--colored\n                bg-orange");
    			attr(div6, "class", "mdl-card__actions mdl-card--border d-flex justify-content-between");
    			attr(div7, "class", "demo-card-square mdl-card mdl-shadow--2dp");
    			attr(div8, "class", "view");
    		},
    		m(target, anchor, remount) {
    			insert(target, div8, anchor);
    			append(div8, div7);
    			append(div7, div5);
    			append(div5, div0);
    			append(div0, h3);
    			append(div0, t1);
    			append(div0, hr);
    			append(div0, t2);
    			append(div0, pre0);
    			append(pre0, code);
    			append(div5, t4);
    			append(div5, div1);
    			append(div5, t5);
    			append(div5, table);
    			append(div7, t39);
    			append(div7, div6);
    			append(div6, button0);
    			append(div6, t41);
    			append(div6, button1);
    			/*div8_binding*/ ctx[4](div8);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen(button0, "click", /*click_handler*/ ctx[2]),
    				listen(button1, "click", /*click_handler_1*/ ctx[3])
    			];
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div8);
    			/*div8_binding*/ ctx[4](null);
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { router } = $$props;
    	let view;

    	onMount(() => {
    		var script = document.createElement("script");
    		script.src = "prism.js";
    		view.appendChild(script);
    	});

    	const click_handler = () => router.send("home");
    	const click_handler_1 = () => router.send("events");

    	function div8_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, view = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("router" in $$props) $$invalidate(0, router = $$props.router);
    	};

    	return [router, view, click_handler, click_handler_1, div8_binding];
    }

    class Usage extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, { router: 0 });
    	}
    }

    function create_fragment$3(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "view");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    class Events extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$3, safe_not_equal, {});
    	}
    }

    function create_fragment$4(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "view");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    class Nested extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$4, safe_not_equal, {});
    	}
    }

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-e2qiv7-style";
    	style.textContent = ".view{width:100vw;height:100vh;display:flex;justify-content:center;align-items:center}.mdl-card{width:90vw !important;max-width:600px}.mdl-card__supporting-text{width:100% !important}.mdl-card__supporting-text{width:100% !important;box-sizing:border-box}h3{margin:0}.bg-orange{background-color:#fa3e01 !important}.option{display:inline-block;padding:.5rem 1rem;background:#dbdbdb;color:black;border-radius:3px}.m-0{margin:0}table{width:100%}tr{margin-top:1rem;display:block}td,th{min-width:150px;text-align:left;vertical-align:top}.d-flex{display:flex}.justify-content-between{justify-content:space-between}";
    	append(document.head, style);
    }

    function create_fragment$5(ctx) {
    	let div;
    	let current;

    	const router = new Router({
    			props: {
    				initial: "home",
    				views: { home: Home, usage: Usage, events: Events, nested: Nested }
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(router.$$.fragment);
    			attr(div, "class", "container mdl-button--colored mdl-color--blue-600");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(router, div, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(router);
    		}
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-e2qiv7-style")) add_css();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    var app = new App({
      target: document.body
    });

    return app;

}());
