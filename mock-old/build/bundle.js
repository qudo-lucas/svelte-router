
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function (Router) {
    'use strict';

    Router = Router && Object.prototype.hasOwnProperty.call(Router, 'default') ? Router['default'] : Router;

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
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
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
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
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

    function instance($$self) {
    	var _self = typeof window !== "undefined"
    		? window
    		: typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope
    			? self
    			: {},
    		Prism = (function (u) {
    			var c = /\blang(?:uage)?-([\w-]+)\b/i,
    				n = 0,
    				C = {
    					manual: u.Prism && u.Prism.manual,
    					disableWorkerMessageHandler: u.Prism && u.Prism.disableWorkerMessageHandler,
    					util: {
    						encode: function e(n) {
    							return n instanceof _
    							? new _(n.type, e(n.content), n.alias)
    							: Array.isArray(n)
    								? n.map(e)
    								: n.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\u00a0/g, " ");
    						},
    						type(e) {
    							return Object.prototype.toString.call(e).slice(8, -1);
    						},
    						objId(e) {
    							return (e.__id || Object.defineProperty(e, "__id", { value: ++n }), e.__id);
    						},
    						clone: function t(e, r) {
    							var a, n, l = C.util.type(e);

    							switch ((r = r || {}, l)) {
    								case "Object":
    									if ((n = C.util.objId(e), r[n])) {
    										return r[n];
    									}
    									for (var i in (a = {}, r[n] = a, e)) {
    										e.hasOwnProperty(i) && (a[i] = t(e[i], r));
    									}
    									return a;
    								case "Array":
    									return (n = C.util.objId(e), r[n]
    									? r[n]
    									: (a = [], r[n] = a, e.forEach((e, n) => {
    											a[n] = t(e, r);
    										}), a));
    								default:
    									return e;
    							}
    						},
    						getLanguage(e) {
    							for (; e && !c.test(e.className); ) {
    								e = e.parentElement;
    							}

    							return e
    							? (e.className.match(c) || [,"none"])[1].toLowerCase()
    							: "none";
    						},
    						currentScript() {
    							if (typeof document === "undefined") {
    								return null;
    							}

    							if ("currentScript" in document) {
    								return document.currentScript;
    							}

    							try {
    								throw new Error();
    							} catch(e) {
    								var n = ((/at [^(\r\n]*\((.*):.+:.+\)$/i).exec(e.stack) || [])[1];

    								if (n) {
    									var t = document.getElementsByTagName("script");

    									for (var r in t) {
    										if (t[r].src == n) {
    											return t[r];
    										}
    									}
    								}

    								return null;
    							}
    						}
    					},
    					languages: {
    						extend(e, n) {
    							var t = C.util.clone(C.languages[e]);

    							for (var r in n) {
    								t[r] = n[r];
    							}

    							return t;
    						},
    						insertBefore(t, e, n, r) {
    							var a = (r = r || C.languages)[t], l = {};

    							for (var i in a) {
    								if (a.hasOwnProperty(i)) {
    									if (i == e) {
    										for (var o in n) {
    											n.hasOwnProperty(o) && (l[o] = n[o]);
    										}
    									}

    									n.hasOwnProperty(i) || (l[i] = a[i]);
    								}
    							}

    							var s = r[t];

    							return (r[t] = l, C.languages.DFS(C.languages, function (e, n) {
    								n === s && e != t && (this[e] = l);
    							}), l);
    						},
    						DFS: function e(n, t, r, a) {
    							a = a || {};
    							var l = C.util.objId;

    							for (var i in n) {
    								if (n.hasOwnProperty(i)) {
    									t.call(n, i, n[i], r || i);
    									var o = n[i], s = C.util.type(o);

    									s !== "Object" || a[l(o)]
    									? s !== "Array" || a[l(o)] || (a[l(o)] = !0, e(o, t, i, a))
    									: (a[l(o)] = !0, e(o, t, null, a));
    								}
    							}
    						}
    					},
    					plugins: {},
    					highlightAll(e, n) {
    						C.highlightAllUnder(document, e, n);
    					},
    					highlightAllUnder(e, n, t) {
    						var r = {
    							callback: t,
    							container: e,
    							selector: "code[class*=\"language-\"], [class*=\"language-\"] code, code[class*=\"lang-\"], [class*=\"lang-\"] code"
    						};

    						(C.hooks.run("before-highlightall", r), r.elements = Array.prototype.slice.apply(r.container.querySelectorAll(r.selector)), C.hooks.run("before-all-elements-highlight", r));

    						for (var a, l = 0; a = r.elements[l++]; ) {
    							C.highlightElement(a, !0 === n, r.callback);
    						}
    					},
    					highlightElement(e, n, t) {
    						var r = C.util.getLanguage(e), a = C.languages[r];
    						e.className = `${e.className.replace(c, "").replace(/\s+/g, " ")} language-${r}`;
    						var l = e.parentNode;
    						l && l.nodeName.toLowerCase() === "pre" && (l.className = `${l.className.replace(c, "").replace(/\s+/g, " ")} language-${r}`);

    						var i = {
    							element: e,
    							language: r,
    							grammar: a,
    							code: e.textContent
    						};

    						function o(e) {
    							(i.highlightedCode = e, C.hooks.run("before-insert", i), i.element.innerHTML = i.highlightedCode, C.hooks.run("after-highlight", i), C.hooks.run("complete", i), t && t.call(i.element));
    						}

    						if ((C.hooks.run("before-sanity-check", i), !i.code)) {
    							return (C.hooks.run("complete", i), void (t && t.call(i.element)));
    						}

    						if ((C.hooks.run("before-highlight", i), i.grammar)) {
    							if (n && u.Worker) {
    								var s = new Worker(C.filename);

    								(s.onmessage = function (e) {
    									o(e.data);
    								}, s.postMessage(JSON.stringify({
    									language: i.language,
    									code: i.code,
    									immediateClose: !0
    								})));
    							} else {
    								o(C.highlight(i.code, i.grammar, i.language));
    							}
    						} else {
    							o(C.util.encode(i.code));
    						}
    					},
    					highlight(e, n, t) {
    						var r = { code: e, grammar: n, language: t };
    						return (C.hooks.run("before-tokenize", r), r.tokens = C.tokenize(r.code, r.grammar), C.hooks.run("after-tokenize", r), _.stringify(C.util.encode(r.tokens), r.language));
    					},
    					tokenize(e, n) {
    						var t = n.rest;

    						if (t) {
    							for (var r in t) {
    								n[r] = t[r];
    							}

    							delete n.rest;
    						}

    						var a = new l();

    						return (M(a, a.head, e), (function e(n, t, r, a, l, i, o) {
    							for (var s in r) {
    								if (r.hasOwnProperty(s) && r[s]) {
    									var u = r[s];
    									u = Array.isArray(u) ? u : [u];

    									for (var c = 0; c < u.length; ++c) {
    										if (o && o == `${s},${c}`) {
    											return;
    										}

    										var g = u[c],
    											f = g.inside,
    											h = Boolean(g.lookbehind),
    											d = Boolean(g.greedy),
    											v = 0,
    											p = g.alias;

    										if (d && !g.pattern.global) {
    											var m = g.pattern.toString().match(/[imsuy]*$/)[0];
    											g.pattern = RegExp(g.pattern.source, `${m}g`);
    										}

    										g = g.pattern || g;

    										for (var y = a.next, k = l; y !== t.tail; (k += y.value.length, y = y.next)) {
    											var b = y.value;

    											if (t.length > n.length) {
    												return;
    											}

    											if (!(b instanceof _)) {
    												var x = 1;

    												if (d && y != t.tail.prev) {
    													g.lastIndex = k;
    													var w = g.exec(n);

    													if (!w) {
    														break;
    													}

    													var A = w.index + (h && w[1] ? w[1].length : 0),
    														P = w.index + w[0].length,
    														S = k;

    													for (S += y.value.length; S <= A; ) {
    														(y = y.next, S += y.value.length);
    													}

    													if ((S -= y.value.length, k = S, y.value instanceof _)) {
    														continue;
    													}

    													for (var O = y; O !== t.tail && (S < P || typeof O.value === "string" && !O.prev.value.greedy); O = O.next) {
    														(x++, S += O.value.length);
    													}

    													(x--, b = n.slice(k, S), w.index -= k);
    												} else {
    													g.lastIndex = 0;
    													var w = g.exec(b);
    												}

    												if (w) {
    													h && (v = w[1] ? w[1].length : 0);

    													var A = w.index + v,
    														w = w[0].slice(v),
    														P = A + w.length,
    														E = b.slice(0, A),
    														N = b.slice(P),
    														j = y.prev;

    													(E && (j = M(t, j, E), k += E.length), W(t, j, x));
    													var L = new _(s, f ? C.tokenize(w, f) : w, p, w, d);

    													if ((y = M(t, j, L), N && M(t, y, N), x > 1 && e(n, t, r, y.prev, k, !0, `${s},${c}`), i)) {
    														break;
    													}
    												} else if (i) {
    													break;
    												}
    											}
    										}
    									}
    								}
    							}
    						})(e, a, n, a.head, 0), (function (e) {
    							var n = [], t = e.head.next;

    							for (; t !== e.tail; ) {
    								(n.push(t.value), t = t.next);
    							}

    							return n;
    						})(a));
    					},
    					hooks: {
    						all: {},
    						add(e, n) {
    							var t = C.hooks.all;
    							(t[e] = t[e] || [], t[e].push(n));
    						},
    						run(e, n) {
    							var t = C.hooks.all[e];

    							if (t && t.length) {
    								for (var r, a = 0; r = t[a++]; ) {
    									r(n);
    								}
    							}
    						}
    					},
    					Token: _
    				};

    			function _(e, n, t, r, a) {
    				(this.type = e, this.content = n, this.alias = t, this.length = 0 | (r || "").length, this.greedy = Boolean(a));
    			}

    			function l() {
    				var e = { value: null, prev: null, next: null },
    					n = { value: null, prev: e, next: null };

    				(e.next = n, this.head = e, this.tail = n, this.length = 0);
    			}

    			function M(e, n, t) {
    				var r = n.next, a = { value: t, prev: n, next: r };
    				return (n.next = a, r.prev = a, e.length++, a);
    			}

    			function W(e, n, t) {
    				for (var r = n.next, a = 0; a < t && r !== e.tail; a++) {
    					r = r.next;
    				}

    				((n.next = r).prev = n, e.length -= a);
    			}

    			if ((u.Prism = C, _.stringify = function n(e, t) {
    				if (typeof e === "string") {
    					return e;
    				}

    				if (Array.isArray(e)) {
    					var r = "";

    					return (e.forEach(e => {
    						r += n(e, t);
    					}), r);
    				}

    				var a = {
    						type: e.type,
    						content: n(e.content, t),
    						tag: "span",
    						classes: ["token", e.type],
    						attributes: {},
    						language: t
    					},
    					l = e.alias;

    				(l && (Array.isArray(l)
    				? Array.prototype.push.apply(a.classes, l)
    				: a.classes.push(l)), C.hooks.run("wrap", a));

    				var i = "";

    				for (var o in a.attributes) {
    					i += ` ${o}="${(a.attributes[o] || "").replace(/"/g, "&quot;")}"`;
    				}

    				return `<${a.tag} class="${a.classes.join(" ")}"${i}>${a.content}</${a.tag}>`;
    			}, !u.document)) {
    				return (u.addEventListener && (C.disableWorkerMessageHandler || u.addEventListener(
    					"message",
    					e => {
    						var n = JSON.parse(e.data),
    							t = n.language,
    							r = n.code,
    							a = n.immediateClose;

    						(u.postMessage(C.highlight(r, C.languages[t], t)), a && u.close());
    					},
    					!1
    				)), C);
    			}

    			var e = C.util.currentScript();

    			function t() {
    				C.manual || C.highlightAll();
    			}

    			if ((e && (C.filename = e.src, e.hasAttribute("data-manual") && (C.manual = !0)), !C.manual)) {
    				var r = document.readyState;

    				r === "loading" || r === "interactive" && e && e.defer
    				? document.addEventListener("DOMContentLoaded", t)
    				: window.requestAnimationFrame
    					? window.requestAnimationFrame(t)
    					: window.setTimeout(t, 16);
    			}

    			return C;
    		})(_self);

    	(typeof module !== "undefined" && module.exports && (module.exports = Prism), typeof global !== "undefined" && (global.Prism = Prism));

    	(Prism.languages.markup = {
    		comment: /<!--[\s\S]*?-->/,
    		prolog: /<\?[\s\S]+?\?>/,
    		doctype: {
    			pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
    			greedy: !0
    		},
    		cdata: /<!\[CDATA\[[\s\S]*?]]>/i,
    		tag: {
    			pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
    			greedy: !0,
    			inside: {
    				tag: {
    					pattern: /^<\/?[^\s>\/]+/,
    					inside: {
    						punctuation: /^<\/?/,
    						namespace: /^[^\s>\/:]+:/
    					}
    				},
    				"attr-value": {
    					pattern: /[=]\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
    					inside: {
    						punctuation: [
    							/^=/,
    							{
    								pattern: /^(\s*)["']|["']$/,
    								lookbehind: !0
    							}
    						]
    					}
    				},
    				punctuation: /\/?>/,
    				"attr-name": {
    					pattern: /[^\s>\/]+/,
    					inside: { namespace: /^[^\s>\/:]+:/ }
    				}
    			}
    		},
    		entity: /&#?[\da-z]{1,8};/i
    	}, Prism.languages.markup.tag.inside["attr-value"].inside.entity = Prism.languages.markup.entity, Prism.hooks.add("wrap", a => {
    		a.type === "entity" && (a.attributes.title = a.content.replace(/&amp;/, "&"));
    	}), Object.defineProperty(Prism.languages.markup.tag, "addInlined", {
    		value(a, e) {
    			var s = {};

    			(s[`language-${e}`] = {
    				pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
    				lookbehind: !0,
    				inside: Prism.languages[e]
    			}, s.cdata = /^<!\[CDATA\[|\]\]>$/i);

    			var n = {
    				"included-cdata": {
    					pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
    					inside: s
    				}
    			};

    			n[`language-${e}`] = {
    				pattern: /[\s\S]+/,
    				inside: Prism.languages[e]
    			};

    			var t = {};

    			(t[a] = {
    				pattern: RegExp(("(<__[^]*?>)(?:<!\\[CDATA\\[(?:[^\\]]|\\](?!\\]>))*\\]\\]>|(?!<!\\[CDATA\\[)[^])*?(?=</__>)").replace(/__/g, () => a), "i"),
    				lookbehind: !0,
    				greedy: !0,
    				inside: n
    			}, Prism.languages.insertBefore("markup", "cdata", t));
    		}
    	}), Prism.languages.html = Prism.languages.markup, Prism.languages.mathml = Prism.languages.markup, Prism.languages.svg = Prism.languages.markup, Prism.languages.xml = Prism.languages.extend("markup", {}), Prism.languages.ssml = Prism.languages.xml);

    	!(function (s) {
    		var e = /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/;

    		(s.languages.css = {
    			comment: /\/\*[\s\S]*?\*\//,
    			atrule: {
    				pattern: /@[\w-]+[\s\S]*?(?:;|(?=\s*\{))/,
    				inside: {
    					rule: /^@[\w-]+/,
    					"selector-function-argument": {
    						pattern: /(\bselector\s*\((?!\s*\))\s*)(?:[^()]|\((?:[^()]|\([^()]*\))*\))+?(?=\s*\))/,
    						lookbehind: !0,
    						alias: "selector"
    					}
    				}
    			},
    			url: {
    				pattern: RegExp(`url\\((?:${e.source}|[^\n\r()]*)\\)`, "i"),
    				greedy: !0,
    				inside: {
    					function: /^url/i,
    					punctuation: /^\(|\)$/
    				}
    			},
    			selector: RegExp(`[^{}\\s](?:[^{};"']|${e.source})*?(?=\\s*\\{)`),
    			string: { pattern: e, greedy: !0 },
    			property: /[-_a-z\xA0-\uFFFF][-\w\xA0-\uFFFF]*(?=\s*:)/i,
    			important: /!important\b/i,
    			function: /[-a-z0-9]+(?=\()/i,
    			punctuation: /[(){};:,]/
    		}, s.languages.css.atrule.inside.rest = s.languages.css);

    		var t = s.languages.markup;

    		t && (t.tag.addInlined("style", "css"), s.languages.insertBefore(
    			"inside",
    			"attr-value",
    			{
    				"style-attr": {
    					pattern: /\s*style=("|')(?:\\[\s\S]|(?!\1)[^\\])*\1/i,
    					inside: {
    						"attr-name": {
    							pattern: /^\s*style/i,
    							inside: t.tag.inside
    						},
    						punctuation: /^\s*=\s*['"]|['"]\s*$/,
    						"attr-value": { pattern: /.+/i, inside: s.languages.css }
    					},
    					alias: "language-css"
    				}
    			},
    			t.tag
    		));
    	})(Prism);

    	Prism.languages.clike = {
    		comment: [
    			{
    				pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
    				lookbehind: !0
    			},
    			{
    				pattern: /(^|[^\\:])\/\/.*/,
    				lookbehind: !0,
    				greedy: !0
    			}
    		],
    		string: {
    			pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    			greedy: !0
    		},
    		"class-name": {
    			pattern: /(\b(?:class|interface|extends|implements|trait|instanceof|new)\s+|\bcatch\s+\()[\w.\\]+/i,
    			lookbehind: !0,
    			inside: { punctuation: /[.\\]/ }
    		},
    		keyword: /\b(?:if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
    		boolean: /\b(?:true|false)\b/,
    		function: /\w+(?=\()/,
    		number: /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
    		operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
    		punctuation: /[{}[\];(),.:]/
    	};

    	(Prism.languages.javascript = Prism.languages.extend("clike", {
    		"class-name": [
    			Prism.languages.clike["class-name"],
    			{
    				pattern: /(^|[^$\w\xA0-\uFFFF])[_$A-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\.(?:prototype|constructor))/,
    				lookbehind: !0
    			}
    		],
    		keyword: [
    			{
    				pattern: /((?:^|})\s*)(?:catch|finally)\b/,
    				lookbehind: !0
    			},
    			{
    				pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
    				lookbehind: !0
    			}
    		],
    		number: /\b(?:(?:0[xX](?:[\dA-Fa-f](?:_[\dA-Fa-f])?)+|0[bB](?:[01](?:_[01])?)+|0[oO](?:[0-7](?:_[0-7])?)+)n?|(?:\d(?:_\d)?)+n|NaN|Infinity)\b|(?:\b(?:\d(?:_\d)?)+\.?(?:\d(?:_\d)?)*|\B\.(?:\d(?:_\d)?)+)(?:[Ee][+-]?(?:\d(?:_\d)?)+)?/,
    		function: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
    		operator: /--|\+\+|\*\*=?|=>|&&|\|\||[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?[.?]?|[~:]/
    	}), Prism.languages.javascript["class-name"][0].pattern = /(\b(?:class|interface|extends|implements|instanceof|new)\s+)[\w.\\]+/, Prism.languages.insertBefore("javascript", "keyword", {
    		regex: {
    			pattern: /((?:^|[^$\w\xA0-\uFFFF."'\])\s])\s*)\/(?:\[(?:[^\]\\\r\n]|\\.)*]|\\.|[^/\\\[\r\n])+\/[gimyus]{0,6}(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/,
    			lookbehind: !0,
    			greedy: !0
    		},
    		"function-variable": {
    			pattern: /#?[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|[_$a-zA-Z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)\s*=>))/,
    			alias: "function"
    		},
    		parameter: [
    			{
    				pattern: /(function(?:\s+[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*)?\s*\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\))/,
    				lookbehind: !0,
    				inside: Prism.languages.javascript
    			},
    			{
    				pattern: /[_$a-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*(?=\s*=>)/i,
    				inside: Prism.languages.javascript
    			},
    			{
    				pattern: /(\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*=>)/,
    				lookbehind: !0,
    				inside: Prism.languages.javascript
    			},
    			{
    				pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:[_$A-Za-z\xA0-\uFFFF][$\w\xA0-\uFFFF]*\s*)\(\s*)(?!\s)(?:[^()]|\([^()]*\))+?(?=\s*\)\s*\{)/,
    				lookbehind: !0,
    				inside: Prism.languages.javascript
    			}
    		],
    		constant: /\b[A-Z](?:[A-Z_]|\dx?)*\b/
    	}), Prism.languages.insertBefore("javascript", "string", {
    		"template-string": {
    			pattern: /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}|(?!\${)[^\\`])*`/,
    			greedy: !0,
    			inside: {
    				"template-punctuation": { pattern: /^`|`$/, alias: "string" },
    				interpolation: {
    					pattern: /((?:^|[^\\])(?:\\{2})*)\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})+}/,
    					lookbehind: !0,
    					inside: {
    						"interpolation-punctuation": { pattern: /^\${|}$/, alias: "punctuation" },
    						rest: Prism.languages.javascript
    					}
    				},
    				string: /[\s\S]+/
    			}
    		}
    	}), Prism.languages.markup && Prism.languages.markup.tag.addInlined("script", "javascript"), Prism.languages.js = Prism.languages.javascript);

    	return [];
    }

    class Prism_1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, null, safe_not_equal, {});
    	}
    }

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-88siea-style";
    	style.textContent = ".view.svelte-88siea{width:100vw;display:inline-flex;justify-content:center;box-sizing:border-box}";
    	append(document.head, style);
    }

    // (7:20) {#if back}
    function create_if_block_1(ctx) {
    	let button;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Back";
    			attr(button, "class", "\n                        mdl-button\n                        mdl-js-button\n                        mdl-button--raised");
    		},
    		m(target, anchor, remount) {
    			insert(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen(button, "click", /*click_handler*/ ctx[8]);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    // (15:20) {#if next}
    function create_if_block(ctx) {
    	let button;
    	let t;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text(/*nextName*/ ctx[3]);
    			attr(button, "class", "\n                        mdl-button\n                        mdl-js-button\n                        mdl-button--raised\n                        mdl-button--colored\n                        bg-orange\n                        ml-1");
    		},
    		m(target, anchor, remount) {
    			insert(target, button, anchor);
    			append(button, t);
    			if (remount) dispose();
    			dispose = listen(button, "click", /*click_handler_1*/ ctx[9]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*nextName*/ 8) set_data(t, /*nextName*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div4;
    	let div3;
    	let div2;
    	let div1;
    	let h1;
    	let t0;
    	let t1;
    	let div0;
    	let t2;
    	let t3;
    	let hr;
    	let t4;
    	let div4_class_value;
    	let t5;
    	let current;
    	let if_block0 = /*back*/ ctx[4] && create_if_block_1(ctx);
    	let if_block1 = /*next*/ ctx[2] && create_if_block(ctx);
    	const default_slot_template = /*$$slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);
    	const prism = new Prism_1({});

    	return {
    		c() {
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			t0 = text(/*title*/ ctx[1]);
    			t1 = space();
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			hr = element("hr");
    			t4 = space();
    			if (default_slot) default_slot.c();
    			t5 = space();
    			create_component(prism.$$.fragment);
    			attr(h1, "class", "m-0");
    			attr(div0, "class", "nav");
    			attr(div1, "class", "header d-flex justify-content-between align-items-center py-1");
    			attr(div2, "class", "mdl-card__supporting-text");
    			attr(div3, "class", "demo-card-square mdl-card mdl-shadow--2dp");
    			attr(div4, "class", div4_class_value = "view d-flex py-6 " + (/*centered*/ ctx[5] ? "align-self-center" : "") + " svelte-88siea");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div3);
    			append(div3, div2);
    			append(div2, div1);
    			append(div1, h1);
    			append(h1, t0);
    			append(div1, t1);
    			append(div1, div0);
    			if (if_block0) if_block0.m(div0, null);
    			append(div0, t2);
    			if (if_block1) if_block1.m(div0, null);
    			append(div2, t3);
    			append(div2, hr);
    			append(div2, t4);

    			if (default_slot) {
    				default_slot.m(div2, null);
    			}

    			insert(target, t5, anchor);
    			mount_component(prism, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 2) set_data(t0, /*title*/ ctx[1]);

    			if (/*back*/ ctx[4]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div0, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*next*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(div0, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 64) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[6], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[6], dirty, null));
    				}
    			}

    			if (!current || dirty & /*centered*/ 32 && div4_class_value !== (div4_class_value = "view d-flex py-6 " + (/*centered*/ ctx[5] ? "align-self-center" : "") + " svelte-88siea")) {
    				attr(div4, "class", div4_class_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(prism.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			transition_out(prism.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach(t5);
    			destroy_component(prism, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { router } = $$props;
    	let { title = "" } = $$props;
    	let { next = "" } = $$props;
    	let { nextName = "" } = $$props;
    	let { back = "" } = $$props;
    	let { centered = false } = $$props;
    	let { $$slots = {}, $$scope } = $$props;
    	const click_handler = () => router.send(back);
    	const click_handler_1 = () => router.send(next);

    	$$self.$set = $$props => {
    		if ("router" in $$props) $$invalidate(0, router = $$props.router);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("next" in $$props) $$invalidate(2, next = $$props.next);
    		if ("nextName" in $$props) $$invalidate(3, nextName = $$props.nextName);
    		if ("back" in $$props) $$invalidate(4, back = $$props.back);
    		if ("centered" in $$props) $$invalidate(5, centered = $$props.centered);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	return [
    		router,
    		title,
    		next,
    		nextName,
    		back,
    		centered,
    		$$scope,
    		$$slots,
    		click_handler,
    		click_handler_1
    	];
    }

    class View extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-88siea-style")) add_css();

    		init(this, options, instance$1, create_fragment, safe_not_equal, {
    			router: 0,
    			title: 1,
    			next: 2,
    			nextName: 3,
    			back: 4,
    			centered: 5
    		});
    	}
    }

    function add_css$1() {
    	var style = element("style");
    	style.id = "svelte-1fc88d5-style";
    	style.textContent = ".wrapper.svelte-1fc88d5{margin:0 auto;max-width:500px}";
    	append(document.head, style);
    }

    // (1:0) <View {router} next="usage" nextName="GET STARTED" centered={true} title="Hello" >
    function create_default_slot(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let h2;
    	let t2;
    	let div1;
    	let pre;
    	let code;

    	return {
    		c() {
    			div3 = element("div");
    			div0 = element("div");
    			div0.innerHTML = `<img src="logo.svg" alt="logo">`;
    			t0 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "A simple SPA router that enforces event driven user interfaces.";
    			t2 = space();
    			div1 = element("div");
    			pre = element("pre");
    			code = element("code");
    			code.textContent = `${`npm install svelte-event-router`}`;
    			attr(div0, "class", "");
    			attr(h2, "class", "mt-2 mb-5");
    			attr(code, "class", "language-js");
    			attr(div2, "class", "");
    			attr(div3, "class", "wrapper t-center py-6 svelte-1fc88d5");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div0);
    			append(div3, t0);
    			append(div3, div2);
    			append(div2, h2);
    			append(div2, t2);
    			append(div2, div1);
    			append(div1, pre);
    			append(pre, code);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div3);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let current;

    	const view = new View({
    			props: {
    				router: /*router*/ ctx[0],
    				next: "usage",
    				nextName: "GET STARTED",
    				centered: true,
    				title: "Hello",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(view.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(view, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const view_changes = {};
    			if (dirty & /*router*/ 1) view_changes.router = /*router*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				view_changes.$$scope = { dirty, ctx };
    			}

    			view.$set(view_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(view.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(view.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(view, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { router } = $$props;

    	$$self.$set = $$props => {
    		if ("router" in $$props) $$invalidate(0, router = $$props.router);
    	};

    	return [router];
    }

    class Home extends SvelteComponent {
    	constructor(options) {
    		super();
    		if (!document.getElementById("svelte-1fc88d5-style")) add_css$1();
    		init(this, options, instance$2, create_fragment$1, safe_not_equal, { router: 0 });
    	}
    }

    function create_default_slot$1(ctx) {
    	let div0;
    	let h6;
    	let t1;
    	let p;
    	let t3;
    	let pre0;
    	let code;
    	let t5;
    	let div1;
    	let t6;
    	let table;

    	return {
    		c() {
    			div0 = element("div");
    			h6 = element("h6");
    			h6.innerHTML = `<strong>Getting Started</strong>`;
    			t1 = space();
    			p = element("p");
    			p.textContent = "To get started, import Router and specify your views.";
    			t3 = space();
    			pre0 = element("pre");
    			code = element("code");

    			code.textContent = `${`
<div class="container">
    <Router initial="home" {views} />
</div>

<script>
import Router from "svelte-event-router";

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

    			t5 = space();
    			div1 = element("div");
    			t6 = space();
    			table = element("table");

    			table.innerHTML = `<thead><tr><th>option</th> 
                        <th>type</th> 
                        <th>description</th></tr></thead> 
                <tbody><tr><td><div class="option"><pre class="m-0">initial</pre></div></td> 
                    <td><strong>String (required)</strong></td> 
                    <td>The initial route to load. This will also be the fallback URL for when a user tries to visit an invalid route on page load. After a page is loaded, invalid routes/events will fail silently.</td></tr> 
                <tr><td><div class="option"><pre class="m-0">views</pre></div></td> 
                    <td><strong>Object (required)</strong></td> 
                    <td>An object full of components. The keys will become routes and the values are the components to be loaded.</td></tr> 
                <tr><td><div class="option"><pre class="m-0">base</pre></div></td> 
                    <td><strong>String (optional)</strong></td> 
                    <td>Primarily used in nested routers. This is the part of the URL that comes before your route name.<br><strong>Example:</strong> In <i>url.com/auth/signup</i>, <i>auth</i> would be the <strong>base</strong> and <i>signup</i> would be the route/view name.</td></tr></tbody>`;

    			attr(h6, "class", "mb-0");
    			attr(code, "class", "language-html");
    			attr(div1, "class", "py-4");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			append(div0, h6);
    			append(div0, t1);
    			append(div0, p);
    			append(div0, t3);
    			append(div0, pre0);
    			append(pre0, code);
    			insert(target, t5, anchor);
    			insert(target, div1, anchor);
    			insert(target, t6, anchor);
    			insert(target, table, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t5);
    			if (detaching) detach(div1);
    			if (detaching) detach(t6);
    			if (detaching) detach(table);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let current;

    	const view = new View({
    			props: {
    				router: /*router*/ ctx[0],
    				title: "Usage",
    				next: "events",
    				nextName: "EVENTS",
    				back: "home",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(view.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(view, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const view_changes = {};
    			if (dirty & /*router*/ 1) view_changes.router = /*router*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				view_changes.$$scope = { dirty, ctx };
    			}

    			view.$set(view_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(view.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(view.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(view, detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { router } = $$props;

    	$$self.$set = $$props => {
    		if ("router" in $$props) $$invalidate(0, router = $$props.router);
    	};

    	return [router];
    }

    class Usage extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$2, safe_not_equal, { router: 0 });
    	}
    }

    function create_default_slot$2(ctx) {
    	let div0;
    	let h60;
    	let t1;
    	let p0;
    	let t6;
    	let p1;
    	let t8;
    	let pre0;
    	let code0;
    	let t10;
    	let div1;
    	let h61;
    	let t12;
    	let p2;
    	let t18;
    	let p3;
    	let t20;
    	let pre1;
    	let code1;

    	return {
    		c() {
    			div0 = element("div");
    			h60 = element("h6");
    			h60.innerHTML = `<strong>Sending Events</strong>`;
    			t1 = space();
    			p0 = element("p");
    			p0.innerHTML = `Events allow you to update the current route as well as share data between routes. Each view component is passed an instance of <strong>router</strong> for quick access. To transition to another route, simply send the name of a view to the router. Events can also accept a payload to be received by the next route.<br><br><i>If you try to send an event that doesn&#39;t exist, the router will notify the console that you sent an invalid event and then fail silently. This way your app is only alowed to transition to where it can transition.</i>`;
    			t6 = space();
    			p1 = element("p");
    			p1.innerHTML = `<strong>events.svelte</strong>`;
    			t8 = space();
    			pre0 = element("pre");
    			code0 = element("code");

    			code0.textContent = `${`    
    <div class="events">
        <button on:click={back}>Back</button>
        <button on:click={next}>Nested Routes</button>
    </div>

    <script>
    export let router;

    // Transition to "usage" route
    const back = () => router.send("usage");

    // Transition to "nested" route with payload
    const next = () => router.send(
        "nested",
        { msg : "Message for next route"}
    );
    </script>
    `}`;

    			t10 = space();
    			div1 = element("div");
    			h61 = element("h6");
    			h61.innerHTML = `<strong>Receiving Events</strong>`;
    			t12 = space();
    			p2 = element("p");
    			p2.innerHTML = `Each router instance has an event property that contains the payload of the last event. The <strong>_event</strong> property on  <strong>router.event</strong> contains the payload from two events ago.`;
    			t18 = space();
    			p3 = element("p");
    			p3.innerHTML = `<strong>nested.svelte</strong>`;
    			t20 = space();
    			pre1 = element("pre");
    			code1 = element("code");

    			code1.textContent = `${`
    <p>Event Data: {event.msg}</h1>

    <script>
    export let router;
    const { event } = router;
    const lastLastEvent = event._event;
    </script>
    `}`;

    			attr(h60, "class", "mb-0");
    			attr(p1, "class", "mt-3");
    			attr(code0, "class", "language-html");
    			attr(div0, "class", "pb-4");
    			attr(h61, "class", "mb-0");
    			attr(p3, "class", "mt-3");
    			attr(code1, "class", "language-html");
    			attr(div1, "class", "py-4");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			append(div0, h60);
    			append(div0, t1);
    			append(div0, p0);
    			append(div0, t6);
    			append(div0, p1);
    			append(div0, t8);
    			append(div0, pre0);
    			append(pre0, code0);
    			insert(target, t10, anchor);
    			insert(target, div1, anchor);
    			append(div1, h61);
    			append(div1, t12);
    			append(div1, p2);
    			append(div1, t18);
    			append(div1, p3);
    			append(div1, t20);
    			append(div1, pre1);
    			append(pre1, code1);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t10);
    			if (detaching) detach(div1);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let current;

    	const view = new View({
    			props: {
    				router: /*router*/ ctx[0],
    				title: "Events",
    				next: "nested",
    				nextName: "NESTED ROUTERS",
    				back: "usage",
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(view.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(view, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const view_changes = {};
    			if (dirty & /*router*/ 1) view_changes.router = /*router*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				view_changes.$$scope = { dirty, ctx };
    			}

    			view.$set(view_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(view.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(view.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(view, detaching);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { router } = $$props;

    	$$self.$set = $$props => {
    		if ("router" in $$props) $$invalidate(0, router = $$props.router);
    	};

    	return [router];
    }

    class Events extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$3, safe_not_equal, { router: 0 });
    	}
    }

    function create_default_slot$3(ctx) {
    	let div2;
    	let div1;
    	let p;
    	let t3;
    	let div0;
    	let pre;
    	let code;

    	return {
    		c() {
    			div2 = element("div");
    			div1 = element("div");
    			p = element("p");
    			p.innerHTML = `Sometimes you need routers inside routers inside routers inside routers. SER makes it easy and keep track of your router instances. Add a nested router by adding a router to one of your existing views. The only difference between setting up a nested router and top level router is that you <strong>need to supply a base</strong>.`;
    			t3 = space();
    			div0 = element("div");
    			pre = element("pre");
    			code = element("code");

    			code.textContent = `${`
<div class="container">
    <Router
        {base}
        initial="signin"
        views={{
            signin,
            signup
        }} 
    />
</div>

<script>
import Router from "svelte-event-router";

// Views
import signin from "./views/signin.svelte";
import signup from "./views/signup.svelte";

// This tells the router to live at: url.com/#/users/auth/[here]
const base = "users/auth";
</script>
`}`;

    			attr(code, "class", "language-html");
    			attr(div1, "class", "");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div1);
    			append(div1, p);
    			append(div1, t3);
    			append(div1, div0);
    			append(div0, pre);
    			append(pre, code);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div2);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let current;

    	const view = new View({
    			props: {
    				router: /*router*/ ctx[0],
    				title: "Nested Routers",
    				back: "events",
    				next: "home",
    				nextName: "HOME",
    				$$slots: { default: [create_default_slot$3] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(view.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(view, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const view_changes = {};
    			if (dirty & /*router*/ 1) view_changes.router = /*router*/ ctx[0];

    			if (dirty & /*$$scope*/ 2) {
    				view_changes.$$scope = { dirty, ctx };
    			}

    			view.$set(view_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(view.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(view.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(view, detaching);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { router } = $$props;

    	$$self.$set = $$props => {
    		if ("router" in $$props) $$invalidate(0, router = $$props.router);
    	};

    	return [router];
    }

    class Nested extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$4, safe_not_equal, { router: 0 });
    	}
    }

    function add_css$2() {
    	var style = element("style");
    	style.id = "svelte-c5aenk-style";
    	style.textContent = ".container.svelte-c5aenk{box-sizing:border-box}.mdl-card{width:90vw !important;max-width:800px}.mdl-card__supporting-text{width:100% !important}.mdl-card__supporting-text{width:100% !important;box-sizing:border-box}h3{margin:0}.bg-orange{background-color:#fa3e01 !important}.option{display:inline-block;padding:.5rem 1rem;background:#dbdbdb;color:black;border-radius:3px}.m-0{margin:0}table{width:100%}tr{margin-top:1rem;display:block}td,th{min-width:150px;text-align:left;vertical-align:top}.d-flex{display:flex}.justify-content-between{justify-content:space-between}";
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
    			attr(div, "class", "container mdl-button--colored mdl-color--blue-600 svelte-c5aenk");
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
    		if (!document.getElementById("svelte-c5aenk-style")) add_css$2();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    var app = new App({
      target: document.body
    });

    return app;

}(Router));
