#!/usr/bin/env node
/* eslint-disable */
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar;
    exports.isSeq = isSeq;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path2) {
      const ctrl = callVisitor(key, node, visitor, path2);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path2, ctrl);
        return visit_(key, ctrl, visitor, path2);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path2 = Object.freeze(path2.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path2);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path2 = Object.freeze(path2.concat(node));
          const ck = visit_("key", node.key, visitor, path2);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path2);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path2) {
      const ctrl = await callVisitor(key, node, visitor, path2);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path2, ctrl);
        return visitAsync_(key, ctrl, visitor, path2);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path2 = Object.freeze(path2.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path2);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path2 = Object.freeze(path2.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path2);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path2);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path2) {
      if (typeof visitor === "function")
        return visitor(key, node, path2);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path2);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path2);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path2);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path2);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path2);
      return void 0;
    }
    function replaceNode(key, path2, node) {
      const parent = path2[path2.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const { anchors: anchors2, doc, maxAliasCount } = ctx;
        const source = this.resolve(doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        let data = anchors2.get(source);
        if (!data) {
          toJS.toJS(source, null, ctx);
          data = anchors2.get(source);
        }
        if (data?.res === void 0) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, source, anchors2);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
        return data.res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path2, value) {
      let v = value;
      for (let i = path2.length - 1; i >= 0; --i) {
        const k = path2[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path2) => path2 == null || typeof path2 === "object" && !!path2[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path2, value) {
        if (isEmptyPath(path2))
          this.add(value);
        else {
          const [key, ...rest] = path2;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path2) {
        const [key, ...rest] = path2;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path2, keepScalar) {
        const [key, ...rest] = path2;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path2) {
        const [key, ...rest] = path2;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path2, value) {
        const [key, ...rest] = path2;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str, indent, comment) => str.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
    function lineLengthOverLimit(str, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str += "\\0";
                    break;
                  case "0007":
                    str += "\\a";
                    break;
                  case "000b":
                    str += "\\v";
                    break;
                  case "001b":
                    str += "\\e";
                    break;
                  case "0085":
                    str += "\\N";
                    break;
                  case "00a0":
                    str += "\\_";
                    break;
                  case "2028":
                    str += "\\L";
                    break;
                  case "2029":
                    str += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str += "\\x" + code.substr(2);
                    else
                      str += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str += "\n";
                  i += 2;
                }
                str += indent;
                if (json[i + 2] === " ")
                  str += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str = start ? str + json.slice(start) : json;
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str;
      return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str === "" ? "?" : explicitKey ? `? ${str}` : str;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str = `? ${str}`;
        if (keyComment && !keyCommentDone) {
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
        str = `? ${str}
${indent}:`;
      } else {
        str = `${str}:`;
        if (keyComment)
          str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str2 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str2 += stringifyComment.lineComment(str2, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str2);
      }
      let str;
      if (lines.length === 0) {
        str = flowChars.start + flowChars.end;
      } else {
        str = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str = stringify.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str.includes("\n"));
        if (i < items.length - 1) {
          str += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str += ",";
          }
        }
        if (comment)
          str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
        lines.push(str);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str = start;
          for (const line of lines)
            str += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str));
        const dot = str.indexOf(".");
        if (dot !== -1 && str[str.length - 1] === "0")
          node.minFractionDigits = str.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.boolTag,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str) => str,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str) => str === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str) => parseFloat(str),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
        return str;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str.length);
          for (let i = 0; i < str.length; ++i)
            buffer[i] = str.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str;
        if (typeof node_buffer.Buffer === "function") {
          str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s = "";
          for (let i = 0; i < buf.length; ++i)
            s += String.fromCharCode(buf[i]);
          str = btoa(s);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str.substr(o, lineWidth);
          }
          str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str) => parseFloat(str.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str) {
        const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
        const dot = str.indexOf(".");
        if (dot !== -1) {
          const f = str.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str, offset, radix, { intAsBigInt }) {
      const sign = str[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str = str.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str = `0b${str}`;
            break;
          case 8:
            str = `0o${str}`;
            break;
          case 16:
            str = `0x${str}`;
            break;
        }
        const n2 = BigInt(str);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str = value.toString(radix);
        return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str, asBigInt) {
      const sign = str[0];
      const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str) => parseSexagesimal(str, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str) {
        const match = str.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool = require_bool2();
    var float = require_float2();
    var int = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool.trueTag,
      bool.falseTag,
      int.intBin,
      int.intOct,
      int.int,
      int.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool = require_bool();
    var float = require_float();
    var int = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int.int,
      intHex: int.intHex,
      intOct: int.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path2, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path2, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path2) {
        if (Collection.isEmptyPath(path2)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path2) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path2, keepScalar) {
        if (Collection.isEmptyPath(path2))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path2, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path2) {
        if (Collection.isEmptyPath(path2))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path2) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path2, value) {
        if (Collection.isEmptyPath(path2)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path2), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path2, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep + cb;
              sep = "";
              break;
            }
            case "newline":
              if (comment)
                sep += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep)
                for (const st of sep) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep === " ")
            sep = "\n";
          else if (!prevMoreIndented && sep === "\n")
            sep = "\n\n";
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep === "\n")
            value += "\n";
          else
            sep = "\n";
        } else {
          value += sep + content;
          sep = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return foldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return foldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function foldLines(source) {
      let first, line;
      try {
        first = new RegExp("(.*?)(?<![ 	])[ 	]*\r?\n", "sy");
        line = new RegExp("[ 	]*(.*?)(?:(?<![ 	])[ 	]*)?\r?\n", "sy");
      } catch {
        first = /(.*?)[ \t]*\r?\n/sy;
        line = /[ \t]*(.*?)[ \t]*\r?\n/sy;
      }
      let match = first.exec(source);
      if (!match)
        return source;
      let res = match[1];
      let sep = " ";
      let pos = first.lastIndex;
      line.lastIndex = pos;
      while (match = line.exec(source)) {
        if (match[1] === "") {
          if (sep === "\n")
            res += sep;
          else
            sep = "\n";
        } else {
          res += sep + match[1];
          sep = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep)
        for (const st of sep)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path2) => {
      let item = cst;
      for (const [field, index] of path2) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path2) => {
      const parent = visit.itemAtPath(cst, path2.slice(0, -1));
      const field = path2[path2.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path2, item, visitor) {
      let ctrl = visitor(item, path2);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path2.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path2);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path2) : ctrl;
    }
    exports.visit = visit;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s = this.peek(3);
          if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s = this.buffer.slice(this.pos, i);
        if (s) {
          yield s;
          this.pos += s.length;
          return s.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep;
          if (scalar.end) {
            sep = scalar.end;
            sep.push(this.sourceToken);
            delete scalar.end;
          } else
            sep = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep = it.sep;
                  sep.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs3 = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs3, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs3);
              } else {
                Object.assign(it, { key: fs3, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs3 = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs3, sep: [] });
              else if (it.sep)
                this.stack.push(fs3);
              else
                Object.assign(it, { key: fs3, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep = fc.end.splice(1, fc.end.length);
            sep.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse2(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse2;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit.visit;
    exports.visitAsync = visit.visitAsync;
  }
});

// packages/cli/src/command.ts
import fs2 from "node:fs";

// packages/cli/src/local-scan.ts
import fs from "node:fs";
import path from "node:path";

// lib/scanner/patterns.ts
var findingCounter = 0;
function makeFinding(severity, category, title, message, filePath, lineNumber, column, snippet, recommendation, patternId) {
  return {
    id: `finding-${++findingCounter}`,
    axis: "security",
    severity,
    category,
    title,
    message,
    filePath,
    lineNumber,
    column,
    snippet,
    recommendation,
    ruleId: patternId
  };
}
function locate(content, pattern) {
  if (typeof pattern === "string") {
    const idx2 = content.indexOf(pattern);
    if (idx2 === -1) return null;
    const before2 = content.slice(0, idx2);
    const line2 = (before2.match(/\n/g) || []).length + 1;
    const lastNewline2 = before2.lastIndexOf("\n");
    const col2 = idx2 - lastNewline2;
    const start2 = Math.max(0, idx2 - 40);
    const end2 = Math.min(content.length, idx2 + pattern.length + 40);
    let snippet2 = content.slice(start2, end2);
    if (start2 > 0) snippet2 = "..." + snippet2;
    if (end2 < content.length) snippet2 = snippet2 + "...";
    return { index: idx2, line: line2, col: col2, snippet: snippet2 };
  }
  const match = content.match(pattern);
  if (!match || typeof match.index !== "number") return null;
  const idx = match.index;
  const before = content.slice(0, idx);
  const line = (before.match(/\n/g) || []).length + 1;
  const lastNewline = before.lastIndexOf("\n");
  const col = idx - lastNewline;
  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + (match[0]?.length || 0) + 40);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";
  return { index: idx, line, col, snippet };
}
var LEADING_COMMENT_RE = /^\s*(\/\/|#|<!--|\/\*|\*)/;
function isInComment(content, idx) {
  const lineStart = content.lastIndexOf("\n", idx - 1) + 1;
  const line = content.slice(lineStart, content.indexOf("\n", idx) >= 0 ? content.indexOf("\n", idx) : void 0);
  return LEADING_COMMENT_RE.test(line.trim());
}
function hasNegatingContext(content, idx) {
  const context = content.slice(Math.max(0, idx - 120), idx).toLowerCase();
  return /(?:\bdo not\b|\bdon't\b|\bnever\b|\bavoid\b|\brefuse\b|\bprohibit\b|\bnot\b)[^.\n]{0,100}$/.test(context);
}
var patterns = [
  {
    id: "PI-I18N-001",
    category: "prompt-injection",
    severity: "high",
    name: "Multilingual instruction override",
    description: "Direct instruction overrides in Chinese, Japanese, and Korean",
    detect: (content, filePath) => {
      const loc = locate(content, /^[ \t]*(?:[-*][ \t]*)?(?:忽略(?:之前|以前)的?(?:所有)?(?:指令|指示)|前の指示を無視してください|이전 지시를 모두 무시하세요)(?=[。。，,.!\s]|$)/m);
      if (!loc) return null;
      return makeFinding(
        "high",
        "prompt-injection",
        "Multilingual instruction override",
        "The skill directly instructs the agent to discard prior instructions.",
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Remove instruction overrides and keep the skill subordinate to the user and host policy.",
        "PI-I18N-001"
      );
    }
  },
  // ================================================================
  // COMMAND INJECTION (16 patterns)
  // ================================================================
  {
    id: "CMD-001",
    category: "command-injection",
    severity: "critical",
    name: "Direct exec() call",
    description: "Uses Node.js exec() which runs shell commands and is vulnerable to injection",
    detect: (content, filePath) => {
      const re = /(?:^|[^a-zA-Z_])exec\s*\(\s*[`'"]/;
      const loc = locate(content, re);
      if (!loc) return null;
      if (isInComment(content, loc.index)) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "Direct exec() call",
        `exec() executes shell commands and is a major RCE vector. Use execFile or spawn with shell:false instead.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Replace exec() with execFile() or use spawn() with shell: false"
      );
    }
  },
  {
    id: "CMD-002",
    category: "command-injection",
    severity: "critical",
    name: "child_process.exec / spawn shell",
    description: "Uses child_process module to execute shell commands",
    detect: (content, filePath) => {
      const re = /require\s*\(\s*['"](?:child_process|node:child_process)['"]\)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "child_process module usage",
        `child_process module can execute shell commands. Ensure commands are not built from user input.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Validate all command arguments. Prefer execFile over exec. Use shell: false in spawn."
      );
    }
  },
  {
    id: "CMD-003",
    category: "command-injection",
    severity: "critical",
    name: "Recursive delete on root directory",
    description: "Recursive force delete targeting root or critical paths",
    detect: (content, filePath) => {
      const re = /\brm\s+(?:-[rfRF]+\s*)+[\/\\]/;
      const loc = locate(content, re);
      if (!loc) return null;
      if (isInComment(content, loc.index)) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "Destructive delete on root",
        `Recursive force delete targeting root directory is extremely destructive.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never delete from root. Use safer file operations with proper path validation."
      );
    }
  },
  {
    id: "CMD-004",
    category: "command-injection",
    severity: "high",
    name: "rimraf on root or dangerous path",
    description: "Using rimraf npm package on root or system directories",
    detect: (content, filePath) => {
      const re = /\b(?:rimraf|rm\.rf|del\.sync)\s*\(\s*['"`][\/\\]/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "command-injection",
        "rimraf on root",
        `rimraf targeting root or system paths can destroy the filesystem.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Validate target path. Never rimraf absolute root paths."
      );
    }
  },
  {
    id: "CMD-005",
    category: "command-injection",
    severity: "critical",
    name: "del /f /s dangerous deletion",
    description: "Windows force recursive deletion targeting system paths",
    detect: (content, filePath) => {
      const re = /\bdel\s+\/[fFsSqQ]+\s+(?:[\/\\][A-Za-z]?|%[A-Z].*%|C:\\\\)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "Windows del /f /s on root",
        `Windows forced recursive deletion can destroy system files.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Target specific files only. Validate the deletion path."
      );
    }
  },
  {
    id: "CMD-006",
    category: "command-injection",
    severity: "critical",
    name: "Pipe-to-shell download",
    description: "Downloads and pipes content directly into shell interpreter",
    detect: (content, filePath) => {
      const re = /\bcurl\s+.*?(?:\||\|)\s*(?:sh|bash|powershell|pwsh|zsh)\b/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "Pipe-to-shell download and execute",
        `Piping curl output directly to shell executes untrusted code. This is a major supply chain risk.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Download and verify scripts before execution. Never pipe directly to shell."
      );
    }
  },
  {
    id: "CMD-007",
    category: "command-injection",
    severity: "critical",
    name: "wget pipe to shell",
    description: "Downloads and pipes wget content directly into shell",
    detect: (content, filePath) => {
      const re = /\bwget\s+.*?(?:\||\|)\s*(?:sh|bash|powershell|pwsh|zsh)\b/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "wget | sh download and execute",
        `Piping wget output to shell executes untrusted code blindly.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Download and verify scripts manually. Never pipe to shell."
      );
    }
  },
  {
    id: "CMD-008",
    category: "command-injection",
    severity: "high",
    name: "Base64-encoded command execution",
    description: "Decodes and executes base64-encoded shell commands",
    detect: (content, filePath) => {
      const re = /\b(?:echo|base64)\s+-d\s+['"][A-Za-z0-9+/]{20,}={0,2}['"]\s*\|\s*(?:bash|sh)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "command-injection",
        "Base64 decoded command execution",
        `Base64-encoded commands hide malicious intent from casual review.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Avoid decoding and executing base64 content. Review what the encoded payload does."
      );
    }
  },
  {
    id: "CMD-009",
    category: "command-injection",
    severity: "critical",
    name: "PowerShell download cradle",
    description: "PowerShell command that downloads and executes remote scripts",
    detect: (content, filePath) => {
      const re = /(?:Invoke-WebRequest|iwr|Invoke-RestMethod|irm|Net\.WebClient)\s*.*-UseBasicParsing/i;
      const loc = locate(content, re);
      if (!loc) return null;
      const fullPattern = /(?:Invoke-WebRequest|iwr|Invoke-RestMethod|irm|Net\.WebClient)\s*.*(?:\||\|)\s*(?:IEX|Invoke-Expression)/i;
      const fullLoc = locate(content, fullPattern);
      if (!fullLoc) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "PowerShell download cradle",
        `PowerShell download cradle downloads and executes remote code without verification.`,
        filePath,
        fullLoc.line,
        fullLoc.col,
        fullLoc.snippet,
        "Use Invoke-WebRequest separately from Invoke-Expression. Validate downloaded content."
      );
    }
  },
  {
    id: "CMD-010",
    category: "command-injection",
    severity: "high",
    name: "Shell injection via template literals",
    description: "User input interpolated into shell command strings",
    detect: (content, filePath) => {
      const re = /exec\s*\(|spawn\s*\(|execSync\s*\(/;
      const execLoc = locate(content, re);
      if (!execLoc) return null;
      const templateWithVar = /\$\{.*?\}/;
      const lineNum = execLoc.line;
      const lines = content.split("\n");
      for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 3); i++) {
        if (templateWithVar.test(lines[i])) {
          const col = lines[i].search(templateWithVar) + 1;
          return makeFinding(
            "high",
            "command-injection",
            "Variable interpolation in shell command",
            `Template literals with variables in shell commands allow command injection via user input.`,
            filePath,
            i + 1,
            col,
            lines[i].slice(0, 120),
            "Use execFile or spawn with arguments array to avoid shell injection."
          );
        }
      }
      return null;
    }
  },
  {
    id: "CMD-011",
    category: "command-injection",
    severity: "high",
    name: "Sudo with password exposure",
    description: "Passing password to sudo via stdin or arguments",
    detect: (content, filePath) => {
      const re = /echo\s+['"].*?['"]\s*\|\s*sudo\s+-S/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "command-injection",
        "Sudo password in plaintext",
        `Passing sudo password as plaintext exposes credentials in process listings and logs.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use sudo with proper authentication or password-less sudo for specific commands."
      );
    }
  },
  {
    id: "CMD-012",
    category: "command-injection",
    severity: "high",
    name: "chmod 777 permissions",
    description: "Sets world-writable permissions on files or directories",
    detect: (content, filePath) => {
      const re = /\bchmod\s+(?:-R\s+)?777\b/;
      const loc = locate(content, re);
      if (!loc) return null;
      if (isInComment(content, loc.index)) return null;
      return makeFinding(
        "high",
        "command-injection",
        "chmod 777 world-writable permissions",
        `World-writable permissions allow any user to modify the file. Security risk.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use more restrictive permissions like 755 for directories, 644 for files."
      );
    }
  },
  {
    id: "CMD-013",
    category: "command-injection",
    severity: "critical",
    name: "Database drop / delete command",
    description: "SQL command to drop database or delete all records",
    detect: (content, filePath) => {
      const re = /\b(?:DROP\s+DATABASE|DROP\s+TABLE|DELETE\s+FROM\s+\S+\s+(?!WHERE)|TRUNCATE\s+TABLE)\b/i;
      const loc = locate(content, re);
      if (!loc) return null;
      if (isInComment(content, loc.index)) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "Database drop/delete command",
        `Destructive database command that can cause permanent data loss.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Ensure destructive SQL is only executed in controlled migrations with backups."
      );
    }
  },
  {
    id: "CMD-014",
    category: "command-injection",
    severity: "high",
    name: "Process execution via child_process",
    description: "Uses spawn/fork/exec to run system commands",
    detect: (content, filePath) => {
      const re = /(?:spawn|fork|execFile|execSync)\(/;
      const loc = locate(content, re);
      if (!loc) return null;
      if (isInComment(content, loc.index)) return null;
      const lines = content.split("\n");
      const lineContent = lines[loc.line - 1] || "";
      const hasUserInput = /\$\{.*?\}|\.concat\(|\.join\(|\.replace\(|\.split\(|\+[\s\w'"`]/.test(lineContent);
      if (!hasUserInput) return null;
      return makeFinding(
        "high",
        "command-injection",
        "Process execution with dynamic arguments",
        `Spawn/fork/exec with dynamic arguments risks command injection if arguments contain user input.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Pass arguments as array elements, not as a single string. Validate all inputs."
      );
    }
  },
  {
    id: "CMD-015",
    category: "command-injection",
    severity: "critical",
    name: "Disk partition destruction",
    description: "Commands that wipe, format, or destroy disk partitions",
    detect: (content, filePath) => {
      const re = /\b(?:dd\s+if=\/dev\/zero|mkfs\.|fdisk\s+\/dev\/[sh]d|format\s+[A-Z]:\s*\/[qfs]|diskpart)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "command-injection",
        "Disk destruction command",
        `Command can wipe or reformat disk partitions causing permanent data loss.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never include disk formatting/destruction commands in agent skills."
      );
    }
  },
  {
    id: "CMD-016",
    category: "command-injection",
    severity: "medium",
    name: "Suspicious use of eval on shell commands",
    description: "Using eval() with command-line tools to execute code",
    detect: (content, filePath) => {
      const re = /\beval\s*\(\s*['"`].*?(?:exec|spawn|child_process|system|shell|bash|cmd|powershell)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "command-injection",
        "eval with shell command",
        `eval() combined with shell commands can lead to arbitrary code execution.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Avoid eval(). Use proper API functions instead."
      );
    }
  },
  // ================================================================
  // DATA EXFILTRATION (12 patterns)
  // ================================================================
  {
    id: "DAT-001",
    category: "data-exfiltration",
    severity: "critical",
    name: "Curl sending data to external URL",
    description: "Using curl to POST/PUT data to external servers",
    detect: (content, filePath) => {
      const re = /\bcurl\s+(?:-[xX]\s+POST|-d|--data|--data-binary|--upload-file|--data-raw)\s+['"]/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "data-exfiltration",
        "curl sending data to external",
        `curl with POST/data flags can exfiltrate file contents or environment data to remote servers.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block outbound data transfer commands unless explicitly required and documented."
      );
    }
  },
  {
    id: "DAT-002",
    category: "data-exfiltration",
    severity: "critical",
    name: "Wget sending data to external",
    description: "Using wget to POST data to external servers",
    detect: (content, filePath) => {
      const re = /\bwget\s+(?:--post-data|--post-file|--method\s+POST)\b/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "data-exfiltration",
        "wget sending data to external",
        `wget with POST flags can exfiltrate data to remote servers.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block outbound data transfer commands. Use strictly controlled endpoints only."
      );
    }
  },
  {
    id: "DAT-003",
    category: "data-exfiltration",
    severity: "high",
    name: "netcat / nc to external host",
    description: "Using netcat to send data to external IP addresses",
    detect: (content, filePath) => {
      const re = /\b(?:nc|netcat)\s+.+?(?:-e|-\w*e\b|--exec)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "data-exfiltration",
        "netcat with -e flag",
        `netcat with -e flag allows remote command execution and data exfiltration.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Remove netcat from the agent environment. It is rarely needed legitimately."
      );
    }
  },
  {
    id: "DAT-004",
    category: "data-exfiltration",
    severity: "high",
    name: "FTP/sFTP upload to external",
    description: "Uploading files via FTP or SFTP to external servers",
    detect: (content, filePath) => {
      const re = /\b(?:ftp|sftp|scp)\s+(?:-i\s+|[-a-zA-Z]*\s+)\w+@/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "data-exfiltration",
        "FTP/sFTP/SCP upload to external",
        `Uploading files to external hosts via FTP/SFTP/SCP can exfiltrate sensitive data.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Disable outbound FTP/SFTP. Use internal file transfer mechanisms with audit trails."
      );
    }
  },
  {
    id: "DAT-005",
    category: "data-exfiltration",
    severity: "high",
    name: "HTTP POST with file contents via fetch",
    description: "Using fetch/axios to POST file contents to external URLs",
    detect: (content, filePath) => {
      const re = /(?:fetch|axios|got|superagent|request)\(['"`]https?:\/\//;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const startLine = Math.max(0, loc.line - 5);
      const endLine = Math.min(lines.length, loc.line + 5);
      const context = lines.slice(startLine, endLine).join("\n");
      const hasFileRead = /(?:readFileSync|readFile|fs\.)/.test(context) || /(?:\.env|\/etc\/|\/home\/|\$HOME|process\.env)/.test(context);
      if (!hasFileRead) return null;
      return makeFinding(
        "high",
        "data-exfiltration",
        "HTTP POST with file contents",
        `Sending file contents to external URLs via HTTP POST can exfiltrate sensitive data.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Do not send file contents to external URLs. Use internal APIs if needed."
      );
    }
  },
  {
    id: "DAT-006",
    category: "data-exfiltration",
    severity: "high",
    name: "DNS exfiltration pattern",
    description: "Using DNS queries to exfiltrate data via subdomains",
    detect: (content, filePath) => {
      const re = /\b(?:nslookup|dig|host)\s+(?:.*?\.)?\w+\.[a-z]+.*?(?:$(?:cat|\`|file|whoami))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "data-exfiltration",
        "DNS exfiltration",
        `DNS lookup tools used with command substitution can exfiltrate data via DNS queries.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block DNS-based data exfiltration by restricting outbound DNS to known resolvers only."
      );
    }
  },
  {
    id: "DAT-007",
    category: "data-exfiltration",
    severity: "critical",
    name: "Sending environment variables to external",
    description: "Sending process.env or environment variables to external URLs",
    detect: (content, filePath) => {
      const re = /process\s*\.\s*env/;
      const loc = locate(content, re);
      if (!loc) return null;
      const urlPattern = /https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/;
      const lines = content.split("\n");
      const startLine = Math.max(0, loc.line - 10);
      const endLine = Math.min(lines.length, loc.line + 10);
      const context = lines.slice(startLine, endLine).join("\n");
      if (!urlPattern.test(context)) return null;
      return makeFinding(
        "critical",
        "data-exfiltration",
        "Environment variables sent to external URL",
        `Sending process.env to external URLs exposes all environment variables including secrets.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never send environment variables to external services."
      );
    }
  },
  {
    id: "DAT-008",
    category: "data-exfiltration",
    severity: "high",
    name: "Copying files to external locations",
    description: "Copying files to network shares or external hosts",
    detect: (content, filePath) => {
      const re = /\b(?:cp|copy|Copy-Item|robocopy)\s+.*?\\\\(?:(?:\d{1,3}\.){3}\d{1,3}|[a-zA-Z0-9.-]+)\\/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "data-exfiltration",
        "Copying files to external/network location",
        `Copying files to network shares or external mounts can exfiltrate data.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Limit file copy operations to project-local directories only."
      );
    }
  },
  {
    id: "DAT-009",
    category: "data-exfiltration",
    severity: "high",
    name: "Using exfiltration-friendly services",
    description: "Sending data to webhook.site, requestbin, or similar services",
    detect: (content, filePath) => {
      const re = /(?:webhook\.site|requestbin\.com|hookbin\.com|pipedream\.com|zapier\.com|make\.com|n8n\.cloud)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "data-exfiltration",
        "Data sent to exfiltration-friendly service",
        `These services are commonly used for data exfiltration. Data leaves the secure environment.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block outbound connections to known exfiltration endpoints."
      );
    }
  },
  {
    id: "DAT-010",
    category: "data-exfiltration",
    severity: "medium",
    name: "Data conversion prior to exfiltration",
    description: "Base64 encoding or compressing data before sending externally",
    detect: (content, filePath) => {
      const re = /\b(?:base64|gzip|zip|tar|bzip2)\s+(?:-d|-c|-f)?/;
      const loc = locate(content, re);
      if (!loc) return null;
      const urlPattern = /https?:\/\//;
      const lines = content.split("\n");
      const startLine = Math.max(0, loc.line - 5);
      const endLine = Math.min(lines.length, loc.line + 10);
      const context = lines.slice(startLine, endLine).join("\n");
      if (!urlPattern.test(context)) return null;
      return makeFinding(
        "medium",
        "data-exfiltration",
        "Data encoded/compressed before external send",
        `Encoding or compressing data before sending externally can hide malicious exfiltration.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Log and audit all cases of encoding before outbound transfers."
      );
    }
  },
  {
    id: "DAT-011",
    category: "data-exfiltration",
    severity: "critical",
    name: "Exfiltration via stdin pipe to network",
    description: "Piping file contents through network tools to external hosts",
    detect: (content, filePath) => {
      const re = /(?:cat|type|Get-Content)\s+.*?\s*\|\s*(?:curl|wget|nc|netcat)\s+/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "data-exfiltration",
        "Piping file contents to network tool",
        `Reading file contents and piping them to network tools exfiltrates data to external hosts.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block all file-to-network piping operations."
      );
    }
  },
  {
    id: "DAT-012",
    category: "data-exfiltration",
    severity: "critical",
    name: "Email exfiltration",
    description: "Sending files or data via email using command line",
    detect: (content, filePath) => {
      const re = /\b(?:mail|sendmail|mutt|mailx|blat|send-mailmessage)\s+.*?(?:-a|-attach|--attach|-f|--file)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "data-exfiltration",
        "Email-based data exfiltration",
        `Sending files via command-line email tools can exfiltrate sensitive data out of the environment.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Disable command-line email clients in agent environments."
      );
    }
  },
  // ================================================================
  // CREDENTIAL HARVESTING (12 patterns)
  // ================================================================
  {
    id: "CRD-001",
    category: "credential-harvesting",
    severity: "critical",
    name: "Accessing SSH private keys",
    description: "Reading ~/.ssh/id_rsa or similar SSH key files",
    detect: (content, filePath) => {
      const re = /(?:~\/\.ssh|\/home\/[\w-]+\/\.ssh|\/root\/\.ssh|\$HOME\/\.ssh)/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/readFile|readFileSync|cat\s|Get-Content|type\s/.test(lc)) {
        return makeFinding(
          "critical",
          "credential-harvesting",
          "SSH private key access",
          `Reading SSH private key files compromises SSH authentication.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Never read SSH keys. Agent should not need direct SSH key access."
        );
      }
      return null;
    }
  },
  {
    id: "CRD-002",
    category: "credential-harvesting",
    severity: "critical",
    name: "Accessing AWS credentials",
    description: "Reading ~/.aws/credentials or AWS config files",
    detect: (content, filePath) => {
      const re = /~\/\.aws\/(?:credentials|config)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "credential-harvesting",
        "AWS credential access",
        `Reading AWS credentials files exposes cloud infrastructure access.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use AWS SDK with IAM roles. Never read credential files directly."
      );
    }
  },
  {
    id: "CRD-003",
    category: "credential-harvesting",
    severity: "critical",
    name: "Accessing GCloud credentials",
    description: "Reading gcloud SDK credential files",
    detect: (content, filePath) => {
      const re = /~\/\.config\/gcloud\//;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "credential-harvesting",
        "GCloud credential access",
        `Reading GCloud SDK credential files exposes Google Cloud access.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use workload identity or service accounts. Never read gcloud credential files."
      );
    }
  },
  {
    id: "CRD-004",
    category: "credential-harvesting",
    severity: "high",
    name: "Reading .env file and outputting externally",
    description: "Reading .env files and sending contents to external services",
    detect: (content, filePath) => {
      const re = /(?:readFileSync|readFile|cat\s+|Get-Content\s+|type\s+)\s*\(?\s*['"`]\.env/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const startLine = Math.max(0, loc.line - 3);
      const endLine = Math.min(lines.length, loc.line + 10);
      const context = lines.slice(startLine, endLine).join("\n");
      const hasExternalSend = /(?:fetch|axios|curl|wget|POST|put)/.test(context);
      if (!hasExternalSend) return null;
      return makeFinding(
        "high",
        "credential-harvesting",
        ".env file read and sent externally",
        `Reading .env files and sending to external URLs exposes all environment secrets.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never send .env file contents to external services."
      );
    }
  },
  {
    id: "CRD-005",
    category: "credential-harvesting",
    severity: "high",
    name: "Reading /etc/passwd",
    description: "Accessing the system password file",
    detect: (content, filePath) => {
      const re = /\/etc\/passwd/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/readFile|readFileSync|cat\s|Get-Content|type\s/.test(lc)) {
        return makeFinding(
          "high",
          "credential-harvesting",
          "/etc/passwd access",
          `Reading /etc/passwd exposes system user accounts and could assist privilege escalation.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Do not read system user databases. Agent should not need this information."
        );
      }
      return null;
    }
  },
  {
    id: "CRD-006",
    category: "credential-harvesting",
    severity: "critical",
    name: "Reading /etc/shadow",
    description: "Accessing the password hash file",
    detect: (content, filePath) => {
      const re = /\/etc\/shadow/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/readFile|readFileSync|cat\s|Get-Content|type\s/.test(lc)) {
        return makeFinding(
          "critical",
          "credential-harvesting",
          "/etc/shadow access",
          `/etc/shadow contains password hashes that can be cracked offline.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Never read /etc/shadow. It requires root access and is never needed legitimately."
        );
      }
      return null;
    }
  },
  {
    id: "CRD-007",
    category: "credential-harvesting",
    severity: "medium",
    name: "Accessing npmrc credentials",
    description: "Reading .npmrc files with auth tokens",
    detect: (content, filePath) => {
      const re = /(?:~\/\.npmrc|\.npmrc|\/root\/\.npmrc|\$HOME\/\.npmrc|process\.env\.HOME\s*\+\s*['"`]\/\.npmrc)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "credential-harvesting",
        "npmrc credential access",
        `.npmrc may contain npm registry auth tokens.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use NPM_TOKEN environment variable instead of reading .npmrc directly."
      );
    }
  },
  {
    id: "CRD-008",
    category: "credential-harvesting",
    severity: "medium",
    name: "Accessing pip.conf credentials",
    description: "Reading pip configuration with credentials",
    detect: (content, filePath) => {
      const re = /(?:~\/\.pip\/pip\.conf|\/etc\/pip\.conf|pip\.conf)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "credential-harvesting",
        "pip.conf credential access",
        `pip.conf may contain repository authentication credentials.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use environment variables for pip repository authentication."
      );
    }
  },
  {
    id: "CRD-009",
    category: "credential-harvesting",
    severity: "high",
    name: "Accessing Git credentials",
    description: "Reading git credential helper stored credentials",
    detect: (content, filePath) => {
      const re = /(?:git\s+credential|~\/\.git-credentials|\/\.git-credentials)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "credential-harvesting",
        "Git credential access",
        `Git credential files store repository access tokens and passwords.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use SSH keys or credential helpers. Do not read credential files directly."
      );
    }
  },
  {
    id: "CRD-010",
    category: "credential-harvesting",
    severity: "high",
    name: "Accessing database connection strings",
    description: "Reading database config files with connection strings",
    detect: (content, filePath) => {
      const re = /(?:database\.(?:json|yml|yaml|config)|db\.(?:json|yml|yaml|config)|connection-string|ormconfig\.(?:json|js|ts))/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "credential-harvesting",
        "Database config file access",
        `Database configuration files contain connection strings with credentials.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Store database connection strings in environment variables, not config files."
      );
    }
  },
  {
    id: "CRD-011",
    category: "credential-harvesting",
    severity: "high",
    name: "Accessing API key config files",
    description: "Reading API key storage files from various tools",
    detect: (content, filePath) => {
      const re = /(?:~\/\.netrc|\/root\/\.netrc|_netrc|\.gitconfig|gradle\.properties|~\/\.gradle\/gradle\.properties)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "credential-harvesting",
        "API key config file access",
        `Configuration files like .netrc, gradle.properties often contain plaintext API keys.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use secret management tools or environment variables instead of config files."
      );
    }
  },
  {
    id: "CRD-012",
    category: "credential-harvesting",
    severity: "medium",
    name: "Accessing browser credential stores",
    description: "Reading browser saved passwords or cookies",
    detect: (content, filePath) => {
      const re = /(?:chromium|chrome|firefox|brave|edge)\s*\/?\s*(?:Login Data|Cookies|Passwords|key[34]\.db|logins\.json)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "credential-harvesting",
        "Browser credential store access",
        `Reading browser credential stores harvests saved passwords and session data.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never access browser credential stores. This is a clear sign of credential theft."
      );
    }
  },
  // ================================================================
  // PROMPT INJECTION (8 patterns)
  // ================================================================
  {
    id: "PIN-001",
    category: "prompt-injection",
    severity: "high",
    name: "Ignore previous instructions directive",
    description: "Tries to override system prompts by ignoring prior instructions",
    detect: (content, filePath) => {
      const re = /ignore\s+(?:all\s+)?(?:previous|prior|above|all)\s+(?:instructions|prompts|directives|commands|rules)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "prompt-injection",
        "Ignore previous instructions",
        `Attempts to override system prompt instructions. This is prompt injection.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Sanitize and validate skill instructions for prompt injection patterns."
      );
    }
  },
  {
    id: "PIN-002",
    category: "prompt-injection",
    severity: "high",
    name: "Ignore all rules directive",
    description: "Tries to bypass the entire safety ruleset",
    detect: (content, filePath) => {
      const re = /ignore\s+(?:all\s+)?(?:your\s+)?rules?\s+(?:and\s+)?(?:follow|do|say|execute|act)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "prompt-injection",
        "Ignore all rules",
        `Attempts to disregard all safety rules and restrictions. Classic prompt injection.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Apply input sanitization to reject prompts containing rule override attempts."
      );
    }
  },
  {
    id: "PIN-003",
    category: "prompt-injection",
    severity: "medium",
    name: "Role-play bypass attempt",
    description: "Tries to bypass restrictions by role-playing or personality override",
    detect: (content, filePath) => {
      const re = /(?:you are (?:now |free |not ).*?(?:no restrictions|no limitations|no boundaries)|act as if|pretend to be|you\'?re now|you have no (?:rules|restrictions|limits))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "prompt-injection",
        "Role-play bypass attempt",
        `Role-playing prompts attempting to bypass restrictions. May indicate social engineering.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Review and validate prompts that use role-play to circumvent restrictions."
      );
    }
  },
  {
    id: "PIN-004",
    category: "prompt-injection",
    severity: "high",
    name: "Direct prompt override attempt",
    description: "Attempts to override system prompt with direct commands",
    detect: (content, filePath) => {
      const re = /(?:override\s+(?:your\s+)?(?:prompt|instructions|settings|configuration|safeguards)|new\s+(?:instructions|prompt|directive):|you must (?:now |hereby |from now on ))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "prompt-injection",
        "Direct prompt override",
        `Attempts to directly override the system prompt configuration.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block prompts that attempt to redefine system configuration."
      );
    }
  },
  {
    id: "PIN-005",
    category: "prompt-injection",
    severity: "critical",
    name: "System prompt extraction attempt",
    description: "Tries to extract the system prompt content",
    detect: (content, filePath) => {
      const re = /(?:print|output|show|reveal|display|leak|leak|dump|repeat|copy|echo|what (?:is|was|were)|tell me)\s+(?:your\s+)?(?:system|initial|first|original)\s+(?:prompt|instruction|message|directive)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "prompt-injection",
        "System prompt extraction",
        `Attempts to extract the system prompt. This is a prompt injection technique to understand defenses.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never reveal system prompt content. Implement prompt injection detection."
      );
    }
  },
  {
    id: "PIN-006",
    category: "prompt-injection",
    severity: "medium",
    name: "Hypothetical / fictional bypass",
    description: "Uses hypothetical scenarios to bypass content restrictions",
    detect: (content, filePath) => {
      const re = /(?:for (?:research|educational|academic)\s+purposes only|purely\s+(?:hypothetical|theoretical)|in a (?:fictional|imaginary|simulated)\s+scenario|imagine\s+(?:if|that|you)|let\'?s\s+pretend|suppose\s+you)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "prompt-injection",
        "Hypothetical/fictional bypass attempt",
        `Using hypothetical or fictional framing to bypass restrictions.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Treat all prompts with the same security scrutiny regardless of framing."
      );
    }
  },
  {
    id: "PIN-007",
    category: "prompt-injection",
    severity: "high",
    name: "DAN / jailbreak pattern",
    description: "Do Anything Now or jailbreak prompt patterns",
    detect: (content, filePath) => {
      const re = /\b(?:DAN|do\s+anything\s+now|jail\s*break|jailbreak|unleashed|unleash|freedom\s+mode|developer\s+mode|sudo\s+mode|god\s+mode)\b/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "prompt-injection",
        "DAN/jailbreak pattern",
        `DAN (Do Anything Now) and jailbreak patterns attempt to bypass all safety restrictions.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block all known jailbreak prompt patterns and variants."
      );
    }
  },
  {
    id: "PIN-008",
    category: "prompt-injection",
    severity: "medium",
    name: "Encoding obfuscated prompt injection",
    description: "Prompt injection attempts hidden via encoding",
    detect: (content, filePath) => {
      const re = /(?:decode\s+(?:and\s+)?(?:execute|follow|do)|base64.*(?:prompt|instruction|tell|say)|hex.*(?:instruction|command|tell|say))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "prompt-injection",
        "Encoded prompt injection",
        `Prompt injection attempts hidden through encoding.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Apply detection recursively to decoded content as well."
      );
    }
  },
  // ================================================================
  // OBFUSCATION (12 patterns)
  // ================================================================
  {
    id: "OBF-001",
    category: "obfuscation",
    severity: "medium",
    name: "Hex-encoded strings",
    description: "Strings using hex escape sequences to hide content",
    detect: (content, filePath) => {
      const re = /(?:\\x[0-9a-fA-F]{2}){4,}/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "obfuscation",
        "Hex-encoded strings detected",
        `Strings using hex escape sequences may be obfuscating malicious content.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Review the decoded content of hex-encoded strings for malicious intent."
      );
    }
  },
  {
    id: "OBF-002",
    category: "obfuscation",
    severity: "high",
    name: "Base64 encoded commands",
    description: "Base64 encoded content being executed",
    detect: (content, filePath) => {
      const re = /(?:atob|Buffer\.from|btoa|Base64\.decode|decodeURIComponent|unescape)\s*\(/;
      const execRe = /\b(?:eval|Function|setTimeout|setInterval)\s*\(/;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (execRe.test(lines[i]) && (re.test(lines[i]) || content.includes("atob"))) {
          const col = lines[i].search(execRe) + 1;
          return makeFinding(
            "high",
            "obfuscation",
            "Base64 encoded commands being executed",
            `Base64 decoded content passed to execution functions is a common obfuscation technique.`,
            filePath,
            i + 1,
            col,
            lines[i].slice(0, 120),
            "Avoid executing decoded content. Review the decoded payload."
          );
        }
      }
      return null;
    }
  },
  {
    id: "OBF-003",
    category: "obfuscation",
    severity: "info",
    name: "ROT13/ROT13 encoded content",
    description: "Content using ROT13 or Caesar cipher encoding",
    detect: (content, filePath) => {
      const re = /\b(?:rot13|rot13|caesar|cipher|tr\s+['\"][A-Za-z]['\"]\s+['\"][N-ZA-Mn-za-m]['\"])/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "info",
        "obfuscation",
        "ROT13 encoding detected",
        `ROT13/ROT13 encoded content can hide strings from casual inspection.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Review the plaintext version of ROT13-encoded content."
      );
    }
  },
  {
    id: "OBF-004",
    category: "obfuscation",
    severity: "medium",
    name: "Reverse string commands",
    description: "Using string reversal to obfuscate commands",
    detect: (content, filePath) => {
      const re = /(?:\.split\(['\x60"]?\s*['\x60"]?\)\s*\.reverse\(\)\s*\.join\(|\.split\(''\)\.reverse\(\)\.join\(''\)|strrev|rev ")/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "obfuscation",
        "String reversal obfuscation",
        `Reversing strings and executing them is a common obfuscation technique.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Review what the reversed string decodes to."
      );
    }
  },
  {
    id: "OBF-005",
    category: "obfuscation",
    severity: "high",
    name: "Multiple encoding layers",
    description: "Content with multiple layers of encoding",
    detect: (content, filePath) => {
      const layers = [
        (c) => (c.match(/(?:\\x[0-9a-fA-F]{2}){4,}/g) || []).length,
        (c) => (c.match(/[A-Za-z0-9+/]{50,}={0,2}/g) || []).length,
        (c) => (c.match(/e?val\s*\(/g) || []).length > 2 ? 1 : 0,
        (c) => (c.match(/unescape|decodeURIComponent|atob/g) || []).length
      ];
      const score = layers.reduce((s, fn) => s + fn(content), 0);
      if (score < 3) return null;
      return makeFinding(
        "high",
        "obfuscation",
        "Multiple encoding layers detected",
        `Content has ${score} layers of encoding, which strongly indicates malicious obfuscation.`,
        filePath,
        1,
        1,
        content.slice(0, 100),
        "Fully decode all encoding layers and review the resulting plaintext."
      );
    }
  },
  {
    id: "OBF-006",
    category: "obfuscation",
    severity: "info",
    name: "Hidden Unicode characters",
    description: "Zero-width and invisible Unicode characters detected",
    detect: (content, filePath) => {
      const zeroWidth = /[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064\u180E]/;
      const match = content.match(zeroWidth);
      if (!match || typeof match.index !== "number") return null;
      const before = content.slice(0, match.index);
      const line = (before.match(/\n/g) || []).length + 1;
      const lastNewline = before.lastIndexOf("\n");
      const col = match.index - lastNewline;
      const snippet = content.slice(Math.max(0, match.index - 20), match.index + 20);
      return makeFinding(
        "info",
        "obfuscation",
        "Hidden Unicode characters detected",
        `Zero-width or invisible Unicode characters can hide malicious code from reviewers.`,
        filePath,
        line,
        col + 1,
        snippet,
        "Use a hex editor or unicode-aware diff tool to inspect hidden characters."
      );
    }
  },
  {
    id: "OBF-007",
    category: "obfuscation",
    severity: "info",
    name: "Unicode normalization attack",
    description: "Using visually similar Unicode characters (homoglyphs)",
    detect: (content, filePath) => {
      const homoglyphs = /[\u0430\u0435\u043E\u0440\u0441\u0445\u0456\u0491\u0432\u043A\u043D\u0442\u0443\u044F\u0405\u0454\u0456\u0458]/u;
      const loc = locate(content, homoglyphs);
      if (!loc) return null;
      return makeFinding(
        "info",
        "obfuscation",
        "Homoglyph characters detected",
        `Visually similar Unicode characters can trick reviewers. Eg Cyrillic '\u0430' looks like Latin 'a'.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Normalize Unicode to NFC form and verify identifiers contain expected characters."
      );
    }
  },
  {
    id: "OBF-008",
    category: "obfuscation",
    severity: "medium",
    name: "Escape sequence abuse",
    description: "Using escape sequences to hide strings",
    detect: (content, filePath) => {
      const re = /(?:\\u00[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}){3,}/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "obfuscation",
        "Escape sequence abuse",
        `Unicode escape sequences used to obfuscate string content.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Decode escape sequences and review the resulting content."
      );
    }
  },
  {
    id: "OBF-009",
    category: "obfuscation",
    severity: "high",
    name: "eval() with encoded string",
    description: "eval() called with encoded or obscured arguments",
    detect: (content, filePath) => {
      const re = /\beval\s*\(\s*(?:atob|Buffer|unescape|decodeURIComponent|String\.fromCharCode)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "obfuscation",
        "eval() with encoded string",
        `eval() called with encoded/decoded arguments is a classic obfuscation technique.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Remove eval() usage entirely. Use proper alternatives."
      );
    }
  },
  {
    id: "OBF-010",
    category: "obfuscation",
    severity: "medium",
    name: "String.fromCharCode obfuscation",
    description: "Using String.fromCharCode to build strings from character codes",
    detect: (content, filePath) => {
      const re = /String\.fromCharCode\s*\(/;
      const loc = locate(content, re);
      if (!loc) return null;
      const execNearby = /(?:eval|Function|setTimeout|setInterval)\s*\(/;
      const lines = content.split("\n");
      const startLine = Math.max(0, loc.line - 3);
      const endLine = Math.min(lines.length, loc.line + 3);
      const context = lines.slice(startLine, endLine).join("\n");
      if (!execNearby.test(context)) return null;
      return makeFinding(
        "medium",
        "obfuscation",
        "String.fromCharCode obfuscation",
        `Building strings from character codes and executing them is an obfuscation technique.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Avoid building strings dynamically from character codes for execution."
      );
    }
  },
  {
    id: "OBF-011",
    category: "obfuscation",
    severity: "medium",
    name: "Excessive string concatenation",
    description: "Suspicious string splitting and joining to hide intent",
    detect: (content, filePath) => {
      const re = /['"`][^'"`]{0,3}['"`]\s*\+\s*['"`][^'"`]{0,3}['"`]\s*\+\s*['"`]/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "obfuscation",
        "Suspicious string concatenation",
        `Strings split into many small pieces then concatenated can hide malicious intent.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Review the combined string to verify it is legitimate."
      );
    }
  },
  {
    id: "OBF-012",
    category: "obfuscation",
    severity: "high",
    name: "setTimeout/setInterval with encoded string",
    description: "Using setTimeout or setInterval with string arguments for code execution",
    detect: (content, filePath) => {
      const re = /(?:setTimeout|setInterval)\s*\(\s*['"`]/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "obfuscation",
        "setTimeout with string argument",
        `setTimeout/setInterval with string arguments is equivalent to eval() and can be obfuscated.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use function references instead of strings in setTimeout/setInterval."
      );
    }
  },
  // ================================================================
  // SENSITIVE FILE ACCESS (10 patterns)
  // ================================================================
  {
    id: "SFA-001",
    category: "sensitive-file-access",
    severity: "critical",
    name: "Reading /etc/shadow",
    description: "Accessing the system password hashes file",
    detect: (content, filePath) => {
      const re = /\/etc\/shadow/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding(
          "critical",
          "sensitive-file-access",
          "/etc/shadow access",
          `/etc/shadow contains password hashes. Reading it is a major security violation.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Never read /etc/shadow. This file contains sensitive authentication data."
        );
      }
      return null;
    }
  },
  {
    id: "SFA-002",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading /etc/passwd",
    description: "Accessing the system user database file",
    detect: (content, filePath) => {
      const re = /\/etc\/passwd/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding(
          "high",
          "sensitive-file-access",
          "/etc/passwd access",
          `/etc/passwd lists system users. Can be used for reconnaissance.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Do not read /etc/passwd. It is not needed for legitimate agent operations."
        );
      }
      return null;
    }
  },
  {
    id: "SFA-003",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading .env files",
    description: "Accessing environment variable files",
    detect: (content, filePath) => {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const envMatch = lines[i].match(/\.env(?:\b|\.)/);
        if (!envMatch || typeof envMatch.index !== "number") continue;
        if (/(?:readFile|readFileSync|open\s*\(|cat\s+|Get-Content|type\s+)/.test(lines[i])) {
          return makeFinding(
            "high",
            "sensitive-file-access",
            ".env file access",
            `.env files contain environment variables, API keys, and secrets.`,
            filePath,
            i + 1,
            envMatch.index + 1,
            lines[i].slice(0, 120),
            "Do not read .env files directly. Access environment variables via process.env."
          );
        }
      }
      return null;
    }
  },
  {
    id: "SFA-004",
    category: "sensitive-file-access",
    severity: "critical",
    name: "Reading SSH private keys",
    description: "Accessing SSH identity files",
    detect: (content, filePath) => {
      const re = /id_rsa|id_dsa|id_ecdsa|id_ed25519|identity/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc) && /\.ssh/.test(lc)) {
        return makeFinding(
          "critical",
          "sensitive-file-access",
          "SSH private key access",
          `SSH private key files grant server access. Their exposure is a critical security incident.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Never read SSH private key files. Use SSH agent or keychain instead."
        );
      }
      return null;
    }
  },
  {
    id: "SFA-005",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading cloud provider configs",
    description: "Accessing AWS/Azure/GCloud configuration files",
    detect: (content, filePath) => {
      const re = /(?:~\/\.aws|\/root\/\.aws|~\/\.azure|\/root\/\.azure|~\/\.config\/gcloud|\/root\/\.config\/gcloud)/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding(
          "high",
          "sensitive-file-access",
          "Cloud provider config access",
          `Cloud provider configuration files contain credentials and access tokens.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Use cloud SDKs with environment-based authentication instead of reading config files."
        );
      }
      return null;
    }
  },
  {
    id: "SFA-006",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading /proc/self/environ",
    description: "Accessing process environment via /proc",
    detect: (content, filePath) => {
      const re = /\/proc\/self\/environ/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "sensitive-file-access",
        "/proc/self/environ access",
        `/proc/self/environ exposes all environment variables of the current process.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Access environment variables via process.env instead of reading /proc."
      );
    }
  },
  {
    id: "SFA-007",
    category: "sensitive-file-access",
    severity: "medium",
    name: "Reading .git/config",
    description: "Accessing git repository configuration",
    detect: (content, filePath) => {
      const re = /\.git\/(?:config|credentials)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "sensitive-file-access",
        ".git/config access",
        `.git/config may contain repository URLs with embedded credentials.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use git commands instead of directly reading .git files."
      );
    }
  },
  {
    id: "SFA-008",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading HashiCorp Vault secrets",
    description: "Accessing Vault secret files",
    detect: (content, filePath) => {
      const re = /(?:~\/\.vault|\/root\/\.vault|vault\/secrets|vault-token|\.vault-token)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "sensitive-file-access",
        "Vault secrets file access",
        `HashiCorp Vault token or secrets files grant access to all stored secrets.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use Vault API with short-lived tokens instead of reading token files."
      );
    }
  },
  {
    id: "SFA-009",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading kubeconfig",
    description: "Accessing Kubernetes configuration files",
    detect: (content, filePath) => {
      const re = /(?:~\/\.kube|\/root\/\.kube|\.kube\/config|kubeconfig)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding(
          "high",
          "sensitive-file-access",
          "kubeconfig access",
          `Kubeconfig files contain cluster access credentials and certificates.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Use kubernetes SDK with service accounts instead of reading kubeconfig files."
        );
      }
      return null;
    }
  },
  {
    id: "SFA-010",
    category: "sensitive-file-access",
    severity: "medium",
    name: "Reading database configuration",
    description: "Accessing database connection configuration files",
    detect: (content, filePath) => {
      const re = /\/(?:etc\/my\.cnf|etc\/mysql|etc\/postgresql|etc\/mongod\.conf|etc\/redis)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding(
          "medium",
          "sensitive-file-access",
          "Database config file access",
          `Database configuration files may contain plaintext passwords and connection details.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Use environment variables for database configuration."
        );
      }
      return null;
    }
  },
  // ================================================================
  // EXTERNAL CALLS (10 patterns)
  // ================================================================
  {
    id: "EXT-001",
    category: "external-calls",
    severity: "medium",
    name: "fetch() to external URL",
    description: "Making HTTP requests to external domains",
    detect: (content, filePath) => {
      const re = /fetch\s*\(\s*['"`]https?:\/\/(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "external-calls",
        "fetch() to external URL",
        `Making HTTP requests to external domains can exfiltrate data or introduce dependencies.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use internal API proxies. Verify external URLs are necessary and safe."
      );
    }
  },
  {
    id: "EXT-002",
    category: "external-calls",
    severity: "medium",
    name: "axios.get() to external URL",
    description: "Using axios to call external domains",
    detect: (content, filePath) => {
      const re = /axios\.(?:get|post|put|delete|request)\(\s*['"`]https?:\/\/(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "external-calls",
        "axios to external URL",
        `axios HTTP requests to external URLs can exfiltrate data.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Route external API calls through a controlled proxy service."
      );
    }
  },
  {
    id: "EXT-003",
    category: "external-calls",
    severity: "high",
    name: "curl to external host",
    description: "Using curl to connect to external IPs or domains",
    detect: (content, filePath) => {
      const re = /\bcurl\s+(?:-[a-zA-Z]*\s+)*['"`]?(?:https?:\/\/)?(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|169\.254|10\.|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "external-calls",
        "curl to external host",
        `curl to external hosts can download/upload arbitrary data.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Whitelist allowed curl targets. Block arbitrary external curl calls."
      );
    }
  },
  {
    id: "EXT-004",
    category: "external-calls",
    severity: "high",
    name: "wget to external host",
    description: "Using wget to download from external servers",
    detect: (content, filePath) => {
      const re = /\bwget\s+(?:-[a-zA-Z]*\s+)*['"`]?(?:https?:\/\/)?(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|169\.254|10\.|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "external-calls",
        "wget to external host",
        `wget downloads files from external hosts. Could be malware download.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use controlled package managers instead of wget for dependencies."
      );
    }
  },
  {
    id: "EXT-005",
    category: "external-calls",
    severity: "medium",
    name: "ping to external host",
    description: "Using ping to probe external network hosts",
    detect: (content, filePath) => {
      const re = /\bping\s+(?:-[a-zA-Z]*\s+)*(?!(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]))(?:\d{1,3}\.){3}\d{1,3}|(?<![\w.)])(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+(?:com|org|net|edu|gov|io|ai|app|dev|co|uk|jp|de|fr|au|ca|cn|in|ru|br|info|biz|me|tv|cc|xyz|click|link|top|online|site|tech|store|blog|pro|name|mobi|asia|tel|xxx)\b/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "external-calls",
        "ping to external host",
        `Ping to external hosts can be used for network reconnaissance.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block ping to external hosts. It is rarely needed legitimately."
      );
    }
  },
  {
    id: "EXT-006",
    category: "external-calls",
    severity: "medium",
    name: "nslookup/dig to external",
    description: "Using DNS lookup tools on external domains",
    detect: (content, filePath) => {
      const re = /\b(?:nslookup|dig|host)\s+(?!(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "external-calls",
        "nslookup/dig to external domain",
        `DNS lookups to external domains can be used for data exfiltration via DNS.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Restrict DNS resolution to known DNS servers only."
      );
    }
  },
  {
    id: "EXT-007",
    category: "external-calls",
    severity: "critical",
    name: "Reverse shell establishment",
    description: "Setting up reverse shell connections",
    detect: (content, filePath) => {
      const re = /(?:bash\s+-i\s*[>&]+\s*\/dev\/tcp\/|python\s+-c\s*['"].*?(?:reverse|socket|pty|spawn)|mkfifo\s+.*?\/dev\/tcp|sh\s+-i\s*[>&]+\s*\/dev\/tcp)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "external-calls",
        "Reverse shell establishment",
        `Reverse shell commands give attackers remote access to the system.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block all reverse shell commands immediately. This is a critical security threat."
      );
    }
  },
  {
    id: "EXT-008",
    category: "external-calls",
    severity: "high",
    name: "Unknown MCP server connection",
    description: "Connecting to external MCP servers not in allowlist",
    detect: (content, filePath) => {
      const re = /(?:connect|connect)\s*(?:to\s+)?(?:mcp|model.?context.?protocol)\s*(?:server|endpoint|url)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      const urlRe = /https?:\/\//;
      const lines = content.split("\n");
      const startLine = Math.max(0, loc.line - 3);
      const endLine = Math.min(lines.length, loc.line + 3);
      const context = lines.slice(startLine, endLine).join("\n");
      if (!urlRe.test(context)) return null;
      return makeFinding(
        "high",
        "external-calls",
        "External MCP server connection",
        `Connecting to MCP servers not in the allowlist can leak context to third parties.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Only connect to MCP servers in the approved allowlist."
      );
    }
  },
  {
    id: "EXT-009",
    category: "external-calls",
    severity: "high",
    name: "SSH to external host",
    description: "Establishing SSH connections to external servers",
    detect: (content, filePath) => {
      const re = /\bssh\s+(?:-[a-zA-Z]+\s+)*\w+@(?!(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]))/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "external-calls",
        "SSH to external host",
        `SSH connections to external hosts can tunnel data or execute remote commands.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block SSH to external hosts. Use bastion hosts with audit trails if needed."
      );
    }
  },
  {
    id: "EXT-010",
    category: "external-calls",
    severity: "high",
    name: "Connecting to IP address directly",
    description: "Making direct connections to raw IP addresses",
    detect: (content, filePath) => {
      const re = /(?:https?|tcp|udp):\/\/(?!(?:127\.0\.0\.1|0\.0\.0\.0|10\.|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168|169\.254|\[::1\]|\[fc00|\[fe80))(?:\d{1,3}\.){3}\d{1,3}/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "external-calls",
        "Direct IP address connection",
        `Connecting to raw external IP addresses bypasses DNS and can hide the destination.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Use domain names instead of raw IPs. Block connections to unknown external IPs."
      );
    }
  },
  // ================================================================
  // PERSISTENCE (8 patterns)
  // ================================================================
  {
    id: "PER-001",
    category: "persistence",
    severity: "high",
    name: "Adding to crontab",
    description: "Creating cron jobs for persistence",
    detect: (content, filePath) => {
      const re = /\b(?:crontab|cron\.(?:d|daily|weekly|monthly|hourly)|cron job|@reboot)\b/i;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:echo|printf|cat|>>|>|\|)/.test(lc)) {
        return makeFinding(
          "high",
          "persistence",
          "Crontab persistence",
          `Adding entries to crontab can make malicious code run on a schedule or at reboot.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Disable crontab modifications. There is rarely a legitimate reason in agent skills."
        );
      }
      return null;
    }
  },
  {
    id: "PER-002",
    category: "persistence",
    severity: "high",
    name: "Adding to startup files",
    description: "Modifying rc.local or init.d to persist execution",
    detect: (content, filePath) => {
      const re = /(?:rc\.local|\/etc\/init\.d|\/etc\/rc\d|update-rc\.d|chkconfig|systemctl\s+enable|service\s+--add)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "persistence",
        "Startup file persistence",
        `Modifying system startup scripts ensures code runs on every boot.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block modifications to system startup files."
      );
    }
  },
  {
    id: "PER-003",
    category: "persistence",
    severity: "high",
    name: "Writing to shell profile",
    description: "Modifying ~/.bashrc, ~/.zshrc, /etc/profile for persistence",
    detect: (content, filePath) => {
      const re = /\/(?:etc\/profile|etc\/bash\.bashrc|etc\/zsh\/zshrc|home\/[\w-]+\/\.(?:bashrc|zshrc|profile|bash_profile))/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:write|readFile|echo|>>|>)/.test(lc)) {
        return makeFinding(
          "high",
          "persistence",
          "Shell profile modification",
          `Writing to shell profiles ensures code runs every time a shell is opened.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Do not modify user shell profiles. This persists code across sessions."
        );
      }
      return null;
    }
  },
  {
    id: "PER-004",
    category: "persistence",
    severity: "high",
    name: "Installing systemd service",
    description: "Creating and enabling systemd services for persistence",
    detect: (content, filePath) => {
      const re = /\/etc\/systemd\/system\/|systemctl\s+(?:enable|daemon-reload|start)|systemd-run/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "persistence",
        "Systemd service installation",
        `Creating systemd services ensures code runs as a system service on boot.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block systemd service creation from agent skills."
      );
    }
  },
  {
    id: "PER-005",
    category: "persistence",
    severity: "high",
    name: "Windows registry auto-start",
    description: "Adding entries to Windows auto-start registry keys",
    detect: (content, filePath) => {
      const re = /(?:HKCU|HKLM|HKEY_CURRENT_USER|HKEY_LOCAL_MACHINE).*?(?:Run|RunOnce|RunServices)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "persistence",
        "Windows auto-start registry",
        `Adding to Windows Run registry keys ensures code executes at user login.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block registry modifications. They are rarely needed in agent skills."
      );
    }
  },
  {
    id: "PER-006",
    category: "persistence",
    severity: "medium",
    name: "Adding SSH authorized key",
    description: "Adding SSH public key to authorized_keys for persistent access",
    detect: (content, filePath) => {
      const re = /(?:\/\.ssh\/authorized_keys|\/home\/[\w-]+\/\.ssh\/authorized_keys|\$HOME\/\.ssh\/authorized_keys|ssh-authorized-keys)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "persistence",
        "SSH authorized key addition",
        `Adding SSH keys to authorized_keys grants persistent SSH access to the system.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never modify SSH authorized_keys files."
      );
    }
  },
  {
    id: "PER-007",
    category: "persistence",
    severity: "medium",
    name: "Writing to /etc/hosts or DNS config",
    description: "Modifying hosts file or DNS configuration for persistence",
    detect: (content, filePath) => {
      const re = /\/etc\/hosts|\/etc\/resolv\.conf/;
      const loc = locate(content, re);
      if (!loc) return null;
      const lines = content.split("\n");
      const lc = lines[loc.line - 1] || "";
      if (/(?:write|readFile|echo|>>|>)/.test(lc)) {
        return makeFinding(
          "medium",
          "persistence",
          "Hosts file modification",
          `Modifying /etc/hosts can redirect traffic and tamper with network resolution.`,
          filePath,
          loc.line,
          loc.col,
          loc.snippet,
          "Never modify system hosts or DNS configuration files."
        );
      }
      return null;
    }
  },
  {
    id: "PER-008",
    category: "persistence",
    severity: "high",
    name: "Launch agent via startup items",
    description: "Creating launch agents or daemons on macOS",
    detect: (content, filePath) => {
      const re = /(?:~\x2fLibrary\x2fLaunchAgents|\x2fLibrary\x2fLaunchDaemons|launchctl\s+(?:load|submit))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "persistence",
        "Launch agent/daemon creation",
        `Creating launch agents/daemons ensures code runs on macOS startup.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block launch agent/daemon creation from agent skills."
      );
    }
  },
  // ================================================================
  // SOCIAL ENGINEERING (7 patterns)
  // ================================================================
  {
    id: "SOC-001",
    category: "social-engineering",
    severity: "high",
    name: "Instructions to trick the user",
    description: "Directives telling the agent to deceive the user",
    detect: (content, filePath) => {
      const re = /(?:(?:trick|deceive|fool|manipulate|cajole|coerce|con)\s+(?:the\s+)?users?|mislead(?:ing)?\s+(?:the\s+)?users?)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      if (hasNegatingContext(content, loc.index)) return null;
      return makeFinding(
        "high",
        "social-engineering",
        "Trick user directive",
        `Instructions to trick, deceive, or manipulate the user. Classic social engineering.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Flag all instructions involving user deception."
      );
    }
  },
  {
    id: "SOC-002",
    category: "social-engineering",
    severity: "medium",
    name: "Say this to your admin",
    description: "Instructions telling user to say specific things to an administrator",
    detect: (content, filePath) => {
      const re = /(?:say\s+(?:this|the following|exactly)\s+to\s+(?:your\s+)?(?:admin|administrator|manager|superior|boss|support)|tell\s+(?:your\s+)?(?:admin|administrator|manager|superior|boss|support)\s+(?:that|this|the following))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "social-engineering",
        "Say this to admin",
        `Prompting user to say specific phrases to an administrator could be a social engineering vector.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Verify the exact phrasing requested and its purpose."
      );
    }
  },
  {
    id: "SOC-003",
    category: "social-engineering",
    severity: "high",
    name: "Convincing user to disable security",
    description: "Telling user to disable security software or features",
    detect: (content, filePath) => {
      const re = /(?:disable\s+(?:your\s+)?(?:antivirus|firewall|security|defender|protection|antimalware)|turn\s+off\s+(?:your\s+)?(?:antivirus|firewall|security|defender)|temporarily\s+(?:disable|deactivate|turn\s+off)\s+(?:your\s+)?(?:security|protection))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "social-engineering",
        "Disable security request",
        `Asking user to disable security software is a common social engineering tactic.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never disable security software. This is a manipulation attempt."
      );
    }
  },
  {
    id: "SOC-004",
    category: "social-engineering",
    severity: "high",
    name: "Asking for credentials from user",
    description: "Requesting user to provide passwords, tokens, or credentials",
    detect: (content, filePath) => {
      const re = /(?:please\s+(?:provide|enter|give\s+me|share|type)\s+(?:your\s+)?(?:password|credentials|passcode|pin|secret|token|api.?key|login|username)|what(?:['`]s| is)\s+(?:your\s+)?(?:password|credentials|secret|api.?key|token|login))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "social-engineering",
        "Credential phishing request",
        `Asking user to provide credentials is a phishing/social engineering technique.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never ask users for their credentials. Use proper authentication mechanisms."
      );
    }
  },
  {
    id: "SOC-005",
    category: "social-engineering",
    severity: "medium",
    name: "Phishing-like instruction pattern",
    description: "Instructions that mimic common phishing techniques",
    detect: (content, filePath) => {
      const re = /(?:click\s+(?:this\s+)?(?:link|here)\s+to\s+(?:verify|confirm|validate|reset|update)|urgent\s+(?:action|security|notice|alert|warning)|account\s+(?:suspended|blocked|limited|compromised)|verify\s+(?:your\s+)?(?:identity|account|credentials))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "social-engineering",
        "Phishing-like pattern",
        `Instructions contain phrasing commonly used in phishing attacks.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Flag URLs requested by the skill and verify them against known phishing databases."
      );
    }
  },
  {
    id: "SOC-006",
    category: "social-engineering",
    severity: "medium",
    name: "Impersonation directive",
    description: "Instructions to impersonate a trusted person or entity",
    detect: (content, filePath) => {
      const re = /(?:impersonate|pretend\s+to\s+be|act\s+as\s+(?:if\s+you\s+are|though\s+you\s+are)|masquerade\s+as|pose\s+as)\s+(?!(?:a\s+)?(?:helpful|assistant|chatbot|ai))(?:support|admin|manager|it|tech|security|bank|representative|official)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "social-engineering",
        "Impersonation directive",
        `Instructions to impersonate trusted entities is a social engineering technique.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Reject instructions that involve impersonating people or organizations."
      );
    }
  },
  {
    id: "SOC-007",
    category: "social-engineering",
    severity: "high",
    name: "Urgency / fear manipulation",
    description: "Creating false urgency or fear to manipulate user decisions",
    detect: (content, filePath) => {
      const re = /(?:if\s+you\s+don'?t\s+(?:act|do\s+this|click|respond)\s+(?:now|immediately|right\s+away)|your\s+(?:account|computer|system|data)\s+(?:will\s+be\s+)?(?:hacked|lost|deleted|compromised|locked)|act\s+(?:now|immediately)\s+or|immediate\s+(?:action|attention)\s+required)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "social-engineering",
        "Urgency/fear manipulation",
        `Creating false urgency or fear is a common social engineering tactic to bypass rational decision-making.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Flag content that uses urgency or fear to pressure user action."
      );
    }
  },
  // ================================================================
  // CLICKFIX ATTACK (5 patterns)
  // ================================================================
  {
    id: "CFX-001",
    category: "clickfix-attack",
    severity: "high",
    name: "Click Allow on dangerous prompts",
    description: "Instructing user to click Allow on security prompts",
    detect: (content, filePath) => {
      const re = /(?:click\s+(?:on\s+)?["']?Allow["']?|press\s+["']?Allow["']?|hit\s+["']?Allow["']?|just\s+(?:click|press|hit)\s+allow|click\s+"yes"|click\s+"ok"|click\s+"continue\s+anyway")/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "clickfix-attack",
        "Click Allow on security prompt",
        `Instructing user to click Allow bypasses security controls. This is a ClickFix attack.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never blindly click Allow. Verify what permission is being requested."
      );
    }
  },
  {
    id: "CFX-002",
    category: "clickfix-attack",
    severity: "high",
    name: "Bypassing permission systems",
    description: "Instructions to bypass or circumvent permission prompts",
    detect: (content, filePath) => {
      const re = /(?:bypass\s+(?:the\s+)?(?:permission|security|safety|confirmation|approval)|dismiss\s+(?:the\s+)?(?:warning|alert|prompt|dialog|confirmation)|run\s+with\s+(?:admin|elevated|sudo)\s+(?:privileges|rights|permissions))/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "clickfix-attack",
        "Permission system bypass",
        `Instructions to bypass or circumvent permission systems undermine security.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Do not bypass permission systems. Each permission request must be evaluated."
      );
    }
  },
  {
    id: "CFX-003",
    category: "clickfix-attack",
    severity: "high",
    name: "Auto-confirming dangerous operations",
    description: "Setting operations to auto-confirm without user verification",
    detect: (content, filePath) => {
      const re = /(?:auto-(?:confirm|approve|accept|allow|grant)|set\s+(?:and\s+)?(?:forget|ignore)|silently\s+(?:approve|confirm|accept|execute)|yes\s+to\s+all)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "clickfix-attack",
        "Auto-confirm dangerous operations",
        `Auto-confirming or silencing security prompts removes user protection.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Never auto-confirm security prompts. Always require user consent."
      );
    }
  },
  {
    id: "CFX-004",
    category: "clickfix-attack",
    severity: "medium",
    name: "Social engineering to approve permissions",
    description: "Convincing user that a permission is harmless when it is not",
    detect: (content, filePath) => {
      const re = /(?:don'?t\s+worry\s+(?:about|it['`]s\s+)?(?:safe|harmless|ok|fine|normal)|it['`]s\s+(?:just|only)\s+(?:a\s+)?(?:formality|standard|routine|normal)|nothing\s+(?:bad|wrong|dangerous)\s+will\s+happen|trust\s+me|trust\s+the\s+process)\s+(?:and\s+)?(?:click|press|hit|accept|allow|confirm)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "medium",
        "clickfix-attack",
        "Social engineering for permission approval",
        `Downplaying risks to convince user to approve permissions is a ClickFix variant.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Evaluate each permission request independently regardless of how it is framed."
      );
    }
  },
  {
    id: "CFX-005",
    category: "clickfix-attack",
    severity: "high",
    name: "Scripted UI automation bypass",
    description: "Using automation scripts to interact with security dialogs",
    detect: (content, filePath) => {
      const re = /(?:SendKeys|SendMessage|PostMessage|FindWindow|FindWindowEx|automation\.(?:click|send)|robot\.(?:click|keyPress)|autoit|autohotkey|pyautogui|sikuli|xdotool|ydotool)/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "clickfix-attack",
        "UI automation for security bypass",
        `UI automation tools used to interact with security dialogs is a ClickFix attack vector.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Block UI automation tools that interact with security prompts."
      );
    }
  },
  // ================================================================
  // STAGED MALWARE (4 patterns)
  // ================================================================
  {
    id: "SML-001",
    category: "staged-malware",
    severity: "critical",
    name: "Download then execute",
    description: "Downloads a file and then executes it",
    detect: (content, filePath) => {
      const downloadRe = /\b(?:curl|wget|Invoke-WebRequest|iwr)\b[^\n]*(?:https?:\/\/)/i;
      const execRe = /\b(?:bash|sh|zsh|pwsh|powershell|cmd|python|node|Start-Process|Invoke-Expression|IEX)\b/i;
      const lines = content.split("\n");
      let downloadLine = -1;
      for (let i = 0; i < lines.length; i++) {
        if (downloadRe.test(lines[i])) {
          downloadLine = i;
          break;
        }
      }
      if (downloadLine < 0) return null;
      const isChained = /&&|\||;/.test(lines[downloadLine]) && execRe.test(lines[downloadLine]);
      for (let i = downloadLine + 1; i < Math.min(lines.length, downloadLine + 4); i++) {
        if (execRe.test(lines[i])) {
          return makeFinding(
            "critical",
            "staged-malware",
            "Download then execute pattern",
            `Downloads a file and executes it. This is a staged malware delivery pattern.`,
            filePath,
            downloadLine + 1,
            1,
            lines.slice(downloadLine, i + 1).join("\n").slice(0, 200),
            "Never download and execute files. Verify and sandbox any downloaded binaries."
          );
        }
      }
      if (isChained) {
        return makeFinding(
          "critical",
          "staged-malware",
          "Download and execute (chained)",
          `Chained download and execute command. Classic staged malware.`,
          filePath,
          downloadLine + 1,
          1,
          lines[downloadLine].slice(0, 120),
          "Do not chain download commands with execution. Review each step independently."
        );
      }
      return null;
    }
  },
  {
    id: "SML-002",
    category: "staged-malware",
    severity: "medium",
    name: "Multiple download and execution references",
    description: "References multiple download commands and execution APIs without proving a direct execution path",
    detect: (content, filePath) => {
      const downloadCount = (content.match(/\b(?:curl|wget|Invoke-WebRequest|iwr|download|http-get)\b/gi) || []).length;
      if (downloadCount < 2) return null;
      const execCount = (content.match(/\b(?:exec|spawn|Start-Process|Invoke-Expression|IEX)\b/gi) || []).length;
      if (execCount < 1) return null;
      return makeFinding(
        "medium",
        "staged-malware",
        "Multiple download and execution references",
        `Multiple download and execution references need contextual review, but do not prove that downloaded content is executed.`,
        filePath,
        1,
        1,
        `Downloads: ${downloadCount}, Executions: ${execCount}`,
        "Verify whether any downloaded content is executed. Only confirmed download-to-execution paths should block installation."
      );
    }
  },
  {
    id: "SML-003",
    category: "staged-malware",
    severity: "high",
    name: "Conditional malicious behavior",
    description: "Code that only executes malicious behavior under specific conditions",
    detect: (content, filePath) => {
      const dateRe = /\b(?:new\s+Date|Date\.now|getDate|getMonth|getFullYear|getDay|Date\(\))/i;
      const envRe = /\b(?:process\.env\.NODE_ENV|process\.env\.(?!NODE_ENV)[A-Z_]{3,})/;
      const _targetRe = /\b(?:target|victim|compromise|specific)\b/i;
      const loc = locate(content, dateRe) || locate(content, envRe);
      if (!loc) return null;
      const lines = content.split("\n");
      const startLine = Math.max(0, loc.line - 5);
      const endLine = Math.min(lines.length, loc.line + 5);
      const context = lines.slice(startLine, endLine).join("\n");
      const hasDangerous = /\b(?:exec|spawn|delete|remove|drop|exfiltrate|steal|malicious|payload)\b/i.test(context);
      if (!hasDangerous) return null;
      return makeFinding(
        "high",
        "staged-malware",
        "Conditional malicious behavior",
        `Code conditionally executes different behavior based on date or environment. May be time-bomb malware.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Flag code that checks dates or environment variables before executing dangerous operations."
      );
    }
  },
  {
    id: "SML-004",
    category: "staged-malware",
    severity: "critical",
    name: "Fetching binary payload",
    description: "Downloading executable binary files from external sources",
    detect: (content, filePath) => {
      const re = /\b(?:curl|wget|Invoke-WebRequest|iwr)\s+.*?\.(?:exe|dll|so|dylib|bin|msi|appimage|deb|rpm|apk)\b/i;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "critical",
        "staged-malware",
        "Binary payload download",
        `Downloading executable binaries from external URLs is a malware delivery vector.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Do not download binary executables. Use approved package managers instead."
      );
    }
  },
  // ================================================================
  // SECOND-ORDER INJECTION (5 patterns)
  // ================================================================
  {
    id: "SOI-001",
    category: "second-order-injection",
    severity: "high",
    name: "Write malicious content to executable file",
    description: "Writes content to a file that will be executed later",
    detect: (content, filePath) => {
      const writeScriptRe = /(?:writeFile|writeFileSync|appendFile)\s*\(\s*['"`][^'"`\n]+\.(?:bat|cmd|ps1|sh|bash|zsh|py|rb|lua|php|pl)['"`]|(?:echo|printf|cat|Set-Content|Out-File|Add-Content)[^\n]*(?:>>|>)\s*[^\s]+\.(?:bat|cmd|ps1|sh|bash|zsh|py|rb|lua|php|pl)\b/i;
      const loc = locate(content, writeScriptRe);
      if (!loc) return null;
      return makeFinding(
        "high",
        "second-order-injection",
        "Write executable file",
        `Writing content to a script file that will be executed later. This is second-order injection.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Do not write executable scripts. Evaluate the written content for malicious intent."
      );
    }
  },
  {
    id: "SOI-002",
    category: "second-order-injection",
    severity: "high",
    name: "Modify config files that auto-execute",
    description: "Modifying configuration files that execute code on load",
    detect: (content, filePath) => {
      const configFiles = /\/(?:\.bashrc|\.zshrc|\.profile|\.bash_profile|\.npmrc|\.pypirc|\.gemrc|eslintrc|\.prettierrc|tsconfig|package\.json|\.env|init\.d|rc\.local|\.vimrc|\.tmux\.conf|\.gitconfig)/;
      const writeRe = /(?:writeFile|writeFileSync|appendFile|>>|>|Set-Content|Out-File)/;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (writeRe.test(lines[i]) && configFiles.test(lines[i])) {
          return makeFinding(
            "high",
            "second-order-injection",
            "Modify auto-execute config",
            `Modifying configuration files that auto-execute can inject malicious behavior.`,
            filePath,
            i + 1,
            1,
            lines[i].slice(0, 120),
            "Do not modify configuration files that execute code. Review changes carefully."
          );
        }
      }
      return null;
    }
  },
  {
    id: "SOI-003",
    category: "second-order-injection",
    severity: "high",
    name: "PATH or LD_PRELOAD pollution",
    description: "Modifying PATH or LD_PRELOAD environment variables",
    detect: (content, filePath) => {
      const re = /\b(?:export\s+(?:PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH)=|set\s+(?:PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH)=|process\.env\.(?:PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH)\s*=)/;
      const loc = locate(content, re);
      if (!loc) return null;
      return makeFinding(
        "high",
        "second-order-injection",
        "PATH/LD_PRELOAD pollution",
        `Modifying PATH or LD_PRELOAD can redirect execution to malicious binaries.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Do not modify PATH or LD_PRELOAD. Use absolute paths for executables."
      );
    }
  },
  {
    id: "SOI-004",
    category: "second-order-injection",
    severity: "high",
    name: "Write to crontab as second-order",
    description: "Writes content to crontab or cron directories for later execution",
    detect: (content, filePath) => {
      const writeRe = /(?:echo|printf|cat|writeFile)/;
      const cronRe = /(?:crontab|cron\.d|cron\.hourly|cron\.daily|\|\s*crontab)/;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (writeRe.test(lines[i]) && cronRe.test(lines[i])) {
          return makeFinding(
            "high",
            "second-order-injection",
            "Write to crontab",
            `Writing to cron schedules creates a delayed execution mechanism. Second-order injection.`,
            filePath,
            i + 1,
            1,
            lines[i].slice(0, 120),
            "Do not modify cron schedules. They execute with the privileges of the user."
          );
        }
      }
      return null;
    }
  },
  {
    id: "SOI-005",
    category: "second-order-injection",
    severity: "high",
    name: "Write webhook/trigger file",
    description: "Writes content that will be triggered by external events",
    detect: (content, filePath) => {
      const re = /(?:write|writeFile|appendFile)\s*.*(?:\.js|\.py|\.rb|\.php|\.pl|\.sh|\.bat|\.ps1|\.vbs|\.applescript)\s*['"`]\s*[^'"`]/;
      const loc = locate(content, re);
      if (!loc) return null;
      const triggerPattern = /\b(?:webhook|trigger|hook|cron|schedule|watch|listen|server|daemon|service|handler)\b/i;
      const lines = content.split("\n");
      const startLine = Math.max(0, loc.line - 4);
      const endLine = Math.min(lines.length, loc.line);
      const context = lines.slice(startLine, endLine).join("\n");
      if (!triggerPattern.test(context)) return null;
      return makeFinding(
        "high",
        "second-order-injection",
        "Writable trigger/webhook file",
        `Writing script files that respond to webhooks or events creates a delayed execution surface.`,
        filePath,
        loc.line,
        loc.col,
        loc.snippet,
        "Review all written script files for malicious content before allowing execution."
      );
    }
  }
];
var ALL_PATTERNS = patterns.map((p) => ({
  ...p,
  detect: p.detect
}));

// lib/scanner/secrets.ts
var secretFindingCounter = 0;
var secrets = [
  {
    type: "openai-key",
    pattern: /(?:sk-[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,})/g,
    severity: "critical",
    name: "OpenAI API Key",
    message: "Hardcoded OpenAI API key detected. This grants access to OpenAI API with costs and potential abuse.",
    recommendation: "Use environment variables for API keys. Never commit them to version control."
  },
  {
    type: "anthropic-key",
    pattern: /sk-ant-[a-zA-Z0-9]{20,}/g,
    severity: "critical",
    name: "Anthropic API Key",
    message: "Hardcoded Anthropic API key detected. This could lead to unauthorized API usage.",
    recommendation: "Store Anthropic API keys in environment variables or a secrets manager."
  },
  {
    type: "aws-access-key",
    pattern: /(?:AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16})/g,
    severity: "critical",
    name: "AWS Access Key ID",
    message: "Hardcoded AWS Access Key ID detected. This compromises cloud infrastructure security.",
    recommendation: "Use IAM roles with temporary credentials. Never hardcode access keys."
  },
  {
    type: "aws-secret-key",
    pattern: /(?:['"][0-9a-zA-Z\/+]{40}['"])/g,
    severity: "critical",
    name: "AWS Secret Access Key",
    message: "Potential AWS Secret Access Key detected. Must be kept confidential.",
    recommendation: "Use AWS IAM roles and temporary credentials instead of long-term access keys."
  },
  {
    type: "github-token",
    pattern: /(?:ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22,})/g,
    severity: "critical",
    name: "GitHub Token",
    message: "Hardcoded GitHub token detected. This grants access to repositories and actions.",
    recommendation: "Use GitHub Actions secrets or environment variables for tokens."
  },
  {
    type: "jwt-token",
    pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    severity: "high",
    name: "JWT Token",
    message: "Hardcoded JWT token detected. Could grant authenticated access to services.",
    recommendation: "Use short-lived tokens from environment variables. Never commit JWTs."
  },
  {
    type: "private-key",
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    severity: "critical",
    name: "Private Key",
    message: "Private key detected. This is a critical credential that grants access to systems.",
    recommendation: "Remove private keys from code. Use SSH agent or keychain instead."
  },
  {
    type: "database-url",
    pattern: /(?:postgres(?:ql)?:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9]+@|mysql:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9]+@|mongodb(?:\+srv)?:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9]+@|redis:\/\/:[a-zA-Z0-9]+@)/g,
    severity: "critical",
    name: "Database Connection URL",
    message: "Hardcoded database connection string detected. Contains credentials for database access.",
    recommendation: "Store database URLs in environment variables. Use connection pooling and secrets management."
  },
  {
    type: "slack-token",
    pattern: /xox[baprs]-[0-9a-zA-Z-]{10,}/g,
    severity: "critical",
    name: "Slack Token",
    message: "Hardcoded Slack API token detected. Grants access to Slack workspace.",
    recommendation: "Use Slack app with granular permissions. Store tokens in environment variables."
  },
  {
    type: "discord-token",
    pattern: /[MN][A-Za-z\d]{23}\.[A-Za-z\d]{6}\.[A-Za-z\d_-]{27}/g,
    severity: "critical",
    name: "Discord Bot Token",
    message: "Hardcoded Discord token detected. Grants access to Discord bot or user account.",
    recommendation: "Store Discord tokens in environment variables. Never commit them."
  },
  {
    type: "stripe-key",
    pattern: /(?:sk_live_[0-9a-zA-Z]{24,}|pk_live_[0-9a-zA-Z]{24,}|rk_live_[0-9a-zA-Z]{24,})/g,
    severity: "critical",
    name: "Stripe API Key",
    message: "Hardcoded Stripe (live) API key detected. This processes real payments.",
    recommendation: "Use Stripe test keys in development. Store live keys in secrets manager."
  },
  {
    type: "api-key",
    pattern: /(?:['"`])(?:api[_-]?key|apikey|api_secret|api_secret_key|app_secret|app_key)[=:@"'\s]*([a-zA-Z0-9_\-]{16,64})['"`]/gi,
    severity: "high",
    name: "API Key",
    message: "Potential hardcoded API key detected in variable assignment.",
    recommendation: "Use environment variables for all API keys."
  },
  {
    type: "password",
    pattern: /(?:password|passwd|pwd|secret)\s*[=:]\s*['"`][^'"`\s]{6,}['"`]/gi,
    severity: "critical",
    name: "Password",
    message: "Hardcoded password or secret detected.",
    recommendation: "Use environment variables or vault services for passwords."
  },
  {
    type: "generic-secret",
    pattern: /(?:secret|token|credential)\s*[=:]\s*['"`][^'"`\s]{8,}['"`]/gi,
    severity: "high",
    name: "Generic Secret",
    message: "Potential hardcoded secret or token detected.",
    recommendation: "Store secrets in environment variables or a vault service."
  }
];
var IGNORE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".lock",
  ".sum",
  ".mod",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".pdf",
  ".zip",
  ".tar",
  ".gz"
]);
function scanForSecrets(content, filePath) {
  const findings = [];
  const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
  if (IGNORE_EXTENSIONS.has(ext)) return findings;
  const fileKeyTerms = ["test", "spec", ".md", "readme", "changelog", "license"];
  const shouldExclude = fileKeyTerms.some((term) => filePath.toLowerCase().includes(term));
  if (shouldExclude) {
    const extCheck = filePath.toLowerCase();
    if (extCheck.endsWith(".md") || extCheck.endsWith(".txt")) return findings;
  }
  const lines = content.split("\n");
  for (const rule of secrets) {
    const matches = content.matchAll(rule.pattern);
    for (const match of matches) {
      if (typeof match.index !== "number") continue;
      const before = content.slice(0, match.index);
      const lineNumber = (before.match(/\n/g) || []).length + 1;
      const lastNewline = before.lastIndexOf("\n");
      const column = match.index - lastNewline;
      if (lineNumber < 1 || lineNumber > lines.length) continue;
      const lineContent = lines[lineNumber - 1];
      const isExample = /example|sample|placeholder|changeme|your-|dummy|test|demo/i.test(lineContent);
      if (isExample) continue;
      const isComment = lineContent.trim().startsWith("#") || lineContent.trim().startsWith("//") || lineContent.trim().startsWith("/*") || lineContent.trim().startsWith("*");
      const start = Math.max(0, match.index - 30);
      const end = Math.min(content.length, match.index + match[0].length + 30);
      let snippet = content.slice(start, end);
      if (start > 0) snippet = "..." + snippet;
      if (end < content.length) snippet = snippet + "...";
      if (rule.type === "database-url" && isComment) continue;
      findings.push({
        id: `secret-${++secretFindingCounter}`,
        axis: "security",
        severity: rule.severity,
        category: "secret-detection",
        title: rule.name,
        message: rule.message,
        filePath,
        lineNumber,
        column: column + 1,
        snippet,
        recommendation: rule.recommendation
      });
    }
  }
  return findings;
}

// lib/scanner/obfuscation.ts
var findingCounter2 = 0;
function locateLine(content, idx) {
  const before = content.slice(0, idx);
  const line = (before.match(/\n/g) || []).length + 1;
  const lastNewline = before.lastIndexOf("\n");
  const col = idx - lastNewline;
  return { line, col };
}
function snippetAround(content, idx, length = 40) {
  const start = Math.max(0, idx - length);
  const end = Math.min(content.length, idx + length);
  let result = content.slice(start, end);
  if (start > 0) result = "..." + result;
  if (end < content.length) result = result + "...";
  return result;
}
function makeFinding2(severity, category, title, message, filePath, lineNumber, column, snippet, recommendation) {
  return {
    id: `obf-finding-${++findingCounter2}`,
    axis: "security",
    severity,
    category,
    title,
    message,
    filePath,
    lineNumber,
    column,
    snippet,
    recommendation
  };
}
function hasMultipleEncodingLayers(content) {
  let score = 0;
  const hexCount = (content.match(/(?:\\x[0-9a-fA-F]{2}){3,}/g) || []).length;
  if (hexCount > 0) score++;
  const b64Count = (content.match(/[A-Za-z0-9+/]{30,}={0,2}/g) || []).length;
  if (b64Count > 0) score++;
  const uriCount = (content.match(/(?:%[0-9a-fA-F]{2}){3,}/g) || []).length;
  if (uriCount > 0) score++;
  const unicodeCount = (content.match(/(?:\\u[0-9a-fA-F]{4}){2,}/g) || []).length;
  if (unicodeCount > 0) score++;
  const charcodeCount = (content.match(/(?:String\.fromCharCode|fromCodePoint)\s*\(/g) || []).length;
  if (charcodeCount > 0) score++;
  const decodeCount = (content.match(/\b(?:atob|btoa|decodeURIComponent|unescape|escape)\s*\(/g) || []).length;
  if (decodeCount > 0) score++;
  if (score >= 2) {
    const allHex = content.replace(/\\x[0-9a-fA-F]{2}/g, "");
    const b64Matches = allHex.match(/[A-Za-z0-9+/]{30,}={0,2}/g);
    if (b64Matches) {
      for (const match of b64Matches) {
        try {
          const decoded = Buffer.from(match, "base64").toString("utf8");
          if (/[a-zA-Z0-9]{4,}/.test(decoded) && (decoded.includes("\\x") || /[A-Za-z0-9+/]{20,}/.test(decoded))) {
            score++;
            break;
          }
        } catch {
        }
      }
    }
    const allB64 = content.replace(/[A-Za-z0-9+/]{30,}={0,2}/g, "");
    const hexMatches = allB64.match(/(?:\\x[0-9a-fA-F]{2}){3,}/g);
    if (hexMatches) {
      score++;
    }
  }
  return score >= 2;
}
var ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064\u180E\u200E\u200F\u202A\u202B\u202C\u202D\u202E]/;
var HOMOGLYPH_RANGES = [
  { range: /[\u0430\u0435\u043E\u0440\u0441\u0445]/u, desc: "Cyrillic" },
  { range: /[\u0456]/u, desc: "Cyrillic Byelorussian i" },
  { range: /[\u0491]/u, desc: "Cyrillic ghe" },
  { range: /[\u0432\u043A\u043D\u0442\u0443\u044F]/u, desc: "Cyrillic" },
  { range: /[\u0405\u0454\u0456\u0458]/u, desc: "Cyrillic" },
  { range: /[\uFF41-\uFF5A]/u, desc: "Fullwidth Latin" },
  { range: /[\uFF21-\uFF3A]/u, desc: "Fullwidth Latin capitals" }
];
function scanObfuscation(content, filePath) {
  const findings = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const hexMatches = line.matchAll(/(\\x[0-9a-fA-F]{2}){4,}/g);
    for (const match of hexMatches) {
      if (typeof match.index !== "number") continue;
      const fullMatch = match[0];
      const cleaned = fullMatch.replace(/\\x/g, "");
      try {
        const decoded = Buffer.from(cleaned, "hex").toString("utf8");
        if (/[a-zA-Z]{4,}/.test(decoded)) {
          findings.push(makeFinding2(
            "medium",
            "obfuscation",
            "Hex-encoded string",
            `Hex-encoded string decodes to: "${decoded.slice(0, 50)}"`,
            filePath,
            lineNum,
            match.index + 1,
            snippetAround(line, match.index, 50),
            "Review the decoded content. Hex encoding can hide malicious intent."
          ));
        }
      } catch {
      }
    }
    const b64LongMatches = line.matchAll(/['"`]([A-Za-z0-9+/]{30,}={0,2})['"`]/g);
    for (const match of b64LongMatches) {
      if (typeof match.index !== "number") continue;
      const candidate = match[1];
      try {
        const decoded = Buffer.from(candidate, "base64").toString("utf8");
        if (/[a-zA-Z]{4,}/.test(decoded) && !decoded.includes("\\u")) {
          const isLikelyBoring = /^[\x00-\x1F\x80-\xFF]+$/.test(decoded);
          if (!isLikelyBoring) {
            findings.push(makeFinding2(
              "info",
              "obfuscation",
              "Base64 encoded string",
              `String may be base64 encoded content. First 40 chars decoded: "${decoded.slice(0, 40)}"`,
              filePath,
              lineNum,
              match.index + 1,
              snippetAround(line, match.index, 40),
              "Verify this is intended base64 usage, not obfuscated content."
            ));
          }
        }
      } catch {
      }
    }
    const zeroMatch = line.match(ZERO_WIDTH_CHARS);
    if (zeroMatch && typeof zeroMatch.index === "number") {
      const chars = [];
      for (const ch of line) {
        if (ch === "\u200B" || ch === "\u200C" || ch === "\u200D" || ch === "\uFEFF" || ch === "\xAD" || ch === "\u2060" || ch === "\u2061" || ch === "\u2062" || ch === "\u2063" || ch === "\u2064" || ch === "\u180E" || ch === "\u200E" || ch === "\u200F" || ch === "\u202A" || ch === "\u202B" || ch === "\u202C" || ch === "\u202D" || ch === "\u202E") {
          chars.push(`U+${ch.charCodeAt(0).toString(16).toUpperCase()}`);
        }
      }
      if (chars.length > 0) {
        findings.push(makeFinding2(
          "info",
          "obfuscation",
          "Hidden Unicode characters",
          `Found ${chars.length} zero-width/invisible character(s): ${chars.join(", ")}`,
          filePath,
          lineNum,
          zeroMatch.index + 1,
          snippetAround(line, zeroMatch.index, 30),
          "Inspect with a hex editor. Zero-width chars can hide code from reviewers."
        ));
      }
    }
    for (const hrange of HOMOGLYPH_RANGES) {
      const match = line.match(hrange.range);
      if (match && typeof match.index === "number") {
        findings.push(makeFinding2(
          "info",
          "obfuscation",
          "Homoglyph characters detected",
          `${hrange.desc} homoglyph characters found that visually resemble Latin letters`,
          filePath,
          lineNum,
          match.index + 1,
          snippetAround(line, match.index, 30),
          "Normalize text to NFC and verify identifiers use correct characters."
        ));
        break;
      }
    }
    const reversalMatch = line.match(/\.split\([''`]?\s*[''`]?\)\s*\.reverse\(\)\s*\.join\([''`]?\s*[''`]?\)/);
    if (reversalMatch && typeof reversalMatch.index === "number") {
      const fullLine = line;
      const strMatch = fullLine.match(/[''`][^''`]{3,}[''`]/);
      let reversedContent = "";
      if (strMatch) {
        reversedContent = strMatch[0].slice(1, -1).split("").reverse().join("");
      }
      findings.push(makeFinding2(
        "medium",
        "obfuscation",
        "String reversal obfuscation",
        reversedContent ? `Reversed string detected. Unreversed content: "${reversedContent.slice(0, 60)}"` : "String reversal pattern detected",
        filePath,
        lineNum,
        reversalMatch.index + 1,
        snippetAround(line, reversalMatch.index, 40),
        "Review what the reversed string represents. It may hide malicious commands."
      ));
    }
    const charCodeMatch = line.match(/String\.fromCharCode\s*\(/g);
    if (charCodeMatch) {
      const codeMatches = line.matchAll(/(\d{2,3})/g);
      const codes = [];
      for (const cm of codeMatches) {
        codes.push(parseInt(cm[1], 10));
      }
      if (codes.length >= 4) {
        const decoded = String.fromCharCode(...codes);
        findings.push(makeFinding2(
          "medium",
          "obfuscation",
          "String.fromCharCode obfuscation",
          `Character codes decode to: "${decoded.slice(0, 60)}"`,
          filePath,
          lineNum,
          line.indexOf("String.fromCharCode") + 1,
          snippetAround(line, line.indexOf("String.fromCharCode"), 50),
          "Avoid using fromCharCode to build strings. Review the decoded string."
        ));
      }
    }
  }
  if (hasMultipleEncodingLayers(content)) {
    findings.push(makeFinding2(
      "high",
      "obfuscation",
      "Multiple encoding layers detected",
      "Content has multiple encoding layers, strongly suggesting obfuscated malicious content.",
      filePath,
      1,
      1,
      content.slice(0, 100),
      "Fully decode all layers and review the resulting plaintext content."
    ));
  }
  const execPatterns = [
    { pattern: /\beval\s*\(\s*(?:atob|Buffer\.from|unescape|decodeURIComponent|String\.fromCharCode)/, title: "eval with encoded input", sev: "high" },
    { pattern: /\bsetTimeout\s*\(\s*(?:atob|Buffer\.from|unescape|decodeURIComponent)/, title: "setTimeout with encoded input", sev: "high" },
    { pattern: /\bsetInterval\s*\(\s*(?:atob|Buffer\.from|unescape|decodeURIComponent)/, title: "setInterval with encoded input", sev: "high" },
    { pattern: /\bFunction\s*\(\s*(?:atob|Buffer\.from|unescape|decodeURIComponent)/, title: "Function constructor with encoded input", sev: "high" },
    { pattern: /\[['"`][^'"`]{0,5}['"`\]\s*\]\s*\+\s*['"`][^'"`]{0,5}['"`\]?\s*\+\s*['"`]/, title: "Broken string concatenation", sev: "medium" }
  ];
  for (const ep of execPatterns) {
    const match = content.match(ep.pattern);
    if (match && typeof match.index === "number") {
      const loc = locateLine(content, match.index);
      findings.push(makeFinding2(
        ep.sev,
        "obfuscation",
        ep.title,
        `${ep.title} detected. This is a common obfuscation technique to hide code.`,
        filePath,
        loc.line,
        loc.col + 1,
        snippetAround(content, match.index, 50),
        "Remove obfuscated execution patterns. Use clear, readable code."
      ));
    }
  }
  const encodeCount = (content.match(/\b(?:atob|btoa|decodeURIComponent|unescape|escape)\s*\(/g) || []).length + (content.match(/(?:\\x[0-9a-fA-F]{2}){3,}/g) || []).length;
  if (encodeCount >= 3 && findings.length === 0) {
    findings.push(makeFinding2(
      "info",
      "obfuscation",
      "Suspicious encoding density",
      `High density of encoding functions/escapes found (${encodeCount} occurrences).`,
      filePath,
      1,
      1,
      content.slice(0, 100),
      "Review file for obfuscation. Legitimate files rarely use multiple encoding methods."
    ));
  }
  return findings;
}

// lib/semgrep/index.ts
var import_yaml = __toESM(require_dist());

// lib/semgrep/builtin-rules.ts
var BUILTIN_RULES = [
  {
    id: "SS-SHELL-001",
    patternRegex: "rm\\s+-(?:rf|fr)\\s+/",
    message: "Dangerous rm -rf / command that recursively deletes all files",
    severity: "CRITICAL",
    languages: ["bash", "shell", "generic"]
  },
  {
    id: "SS-SHELL-002",
    patternRegex: "curl\\s+.*\\|\\s*(?:sh|bash)",
    message: "Remote script execution via curl pipe to shell",
    severity: "CRITICAL",
    languages: ["bash", "shell", "generic"]
  },
  {
    id: "SS-SHELL-003",
    patternRegex: "wget\\s+.*\\|\\s*(?:sh|bash)",
    message: "Remote script execution via wget pipe to shell",
    severity: "CRITICAL",
    languages: ["bash", "shell", "generic"]
  },
  {
    id: "SS-SECRET-001",
    patternRegex: "sk-[A-Za-z0-9]{20,}",
    message: "Hardcoded OpenAI API key detected",
    severity: "CRITICAL",
    languages: ["generic"]
  },
  {
    id: "SS-SECRET-002",
    patternRegex: "(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36}",
    message: "Hardcoded GitHub token detected",
    severity: "CRITICAL",
    languages: ["generic"]
  },
  {
    id: "SS-SECRET-003",
    patternRegex: "-----BEGIN\\s+(?:RSA\\s+)?PRIVATE\\s+KEY-----",
    message: "Hardcoded private key detected",
    severity: "CRITICAL",
    languages: ["generic"]
  },
  {
    id: "SS-FS-001",
    pattern: "fs.rmSync",
    message: "Dangerous file system operation with recursive delete",
    severity: "ERROR",
    languages: ["javascript", "typescript"]
  },
  {
    id: "SS-FS-002",
    patternRegex: "chmod\\s+777\\s+",
    message: "World-writable file permissions set",
    severity: "ERROR",
    languages: ["bash", "shell", "generic"]
  },
  {
    id: "SS-NET-001",
    patternRegex: `(?:curl|wget|fetch|axios\\.get)\\s+\\(?\\s*['"]https?://`,
    message: "External network request detected",
    severity: "WARNING",
    languages: ["bash", "shell", "generic"]
  },
  {
    id: "SS-OBF-001",
    patternRegex: "eval\\s*\\(\\s*(?:atob|Buffer\\.from|unescape|decodeURIComponent)",
    message: "Obfuscated code execution via eval with encoded input",
    severity: "ERROR",
    languages: ["javascript", "typescript"]
  },
  {
    id: "SS-OBF-002",
    patternRegex: "String\\.fromCharCode\\s*\\(\\d+\\s*,\\s*\\d+",
    message: "Obfuscated string construction via fromCharCode",
    severity: "WARNING",
    languages: ["javascript", "typescript"]
  },
  {
    id: "SS-EXEC-001",
    pattern: "child_process.exec",
    message: "Child process execution detected",
    severity: "ERROR",
    languages: ["javascript", "typescript"]
  },
  {
    id: "SS-EXEC-002",
    patternRegex: "subprocess\\.(?:Popen|call|run)\\(.*shell\\s*=\\s*True",
    message: "Shell execution via Python subprocess with shell=True",
    severity: "ERROR",
    languages: ["python"]
  },
  {
    id: "SS-ENV-001",
    patternRegex: "process\\.env\\.(?:AWS_SECRET|SECRET|PASSWORD|API_KEY|TOKEN)",
    message: "Sensitive environment variable access detected",
    severity: "WARNING",
    languages: ["javascript", "typescript"]
  },
  {
    id: "SS-CODE-001",
    pattern: "eval(",
    message: "Arbitrary code execution via eval()",
    severity: "ERROR",
    languages: ["javascript", "typescript"]
  }
];

// lib/semgrep/index.ts
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function testRule(rule, testContent) {
  if (!testContent) return false;
  if (rule.pattern) {
    return new RegExp(escapeRegex(rule.pattern), "i").test(testContent);
  }
  if (rule.patternRegex) {
    return new RegExp(rule.patternRegex, "i").test(testContent);
  }
  if (rule.patternEither) {
    return rule.patternEither.some((sub) => {
      if (sub.pattern) {
        return new RegExp(escapeRegex(sub.pattern), "i").test(testContent);
      }
      if (sub.patternRegex) {
        return new RegExp(sub.patternRegex, "i").test(testContent);
      }
      return false;
    });
  }
  return false;
}
function isExcluded(rule, testContent) {
  if (!rule.patternNot) return false;
  return rule.patternNot.some((sub) => {
    if (sub.pattern) {
      return new RegExp(escapeRegex(sub.pattern), "i").test(testContent);
    }
    if (sub.patternRegex) {
      return new RegExp(sub.patternRegex, "i").test(testContent);
    }
    return false;
  });
}
function findMatch(rule, content) {
  if (rule.pattern) {
    return new RegExp(escapeRegex(rule.pattern), "i").exec(content);
  }
  if (rule.patternRegex) {
    return new RegExp(rule.patternRegex, "i").exec(content);
  }
  if (rule.patternEither) {
    for (const sub of rule.patternEither) {
      const pattern = sub.pattern || sub.patternRegex;
      if (!pattern) continue;
      const re = new RegExp(sub.patternRegex ? pattern : escapeRegex(pattern), "i");
      const result = re.exec(content);
      if (result) return result;
    }
  }
  return null;
}
function matchesPathFilter(filter, filePath) {
  return filter.some((p) => {
    if (p.startsWith("*")) return filePath.endsWith(p.slice(1));
    return filePath.includes(p);
  });
}
function matchRule(rule, content, filePath, ruleIndex) {
  const mappedSeverity = {
    CRITICAL: "critical",
    ERROR: "high",
    WARNING: "medium",
    INFO: "info"
  };
  if (rule.paths?.include && !matchesPathFilter(rule.paths.include, filePath)) return null;
  if (rule.paths?.exclude && matchesPathFilter(rule.paths.exclude, filePath)) return null;
  if (!testRule(rule, content)) return null;
  if (isExcluded(rule, content)) return null;
  const matchResult = findMatch(rule, content);
  if (!matchResult) return null;
  const before = content.slice(0, matchResult.index);
  const lineNumber = (before.match(/\n/g) || []).length + 1;
  const lastNewline = before.lastIndexOf("\n");
  const column = matchResult.index - lastNewline;
  const start = Math.max(0, matchResult.index - 30);
  const end = Math.min(content.length, matchResult.index + matchResult[0].length + 30);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";
  return {
    id: `semgrep-${ruleIndex}-${lineNumber}`,
    axis: "security",
    severity: mappedSeverity[rule.severity] || "medium",
    category: "semgrep-rule",
    title: rule.id,
    message: rule.message,
    filePath,
    lineNumber,
    column: column + 1,
    snippet,
    ruleId: rule.id
  };
}
function runSemgrepScan(content, filePath, rules) {
  const activeRules = rules || loadBuiltinRules();
  const findings = [];
  for (let i = 0; i < activeRules.length; i++) {
    const finding = matchRule(activeRules[i], content, filePath, i);
    if (finding) findings.push(finding);
  }
  return findings;
}
function loadBuiltinRules() {
  return [...BUILTIN_RULES];
}

// lib/permissions/manifest.ts
var import_yaml2 = __toESM(require_dist());
function findDelimitedBlock(content, openingMarker) {
  const lines = content.split(/\r?\n/);
  const openingIndex = lines.findIndex((line) => line.trim() === openingMarker);
  if (openingIndex === -1) return null;
  const closingIndex = lines.findIndex((line, index) => index > openingIndex && line.trim() === "---");
  return closingIndex === -1 ? null : lines.slice(openingIndex + 1, closingIndex).join("\n");
}
function findStandaloneManifest(content) {
  const lines = content.split(/\r?\n/);
  const openingIndex = lines.findIndex((line, index) => line.startsWith("name:") && lines[index + 1]?.trim() === "permissions:");
  if (openingIndex === -1) return null;
  const closingIndex = lines.findIndex((line, index) => index > openingIndex && line.trim() === "");
  return lines.slice(openingIndex, closingIndex === -1 ? void 0 : closingIndex).join("\n");
}
function extractPermissionManifest(content) {
  const permissionBlock = findDelimitedBlock(content, "---permissions");
  if (permissionBlock !== null) {
    try {
      const parsed = (0, import_yaml2.parse)(permissionBlock.trim(), { schema: "failsafe" });
      if (parsed && typeof parsed === "object" && "permissions" in parsed) {
        return parsed;
      }
    } catch {
    }
  }
  const frontmatter = findDelimitedBlock(content, "---");
  if (frontmatter !== null) {
    try {
      const parsed = (0, import_yaml2.parse)(frontmatter.trim(), { schema: "failsafe" });
      if (parsed && typeof parsed === "object" && "permissions" in parsed) {
        const { permissions, name, version } = parsed;
        return { name, version, permissions };
      }
    } catch {
    }
  }
  const standaloneManifest = findStandaloneManifest(content);
  if (standaloneManifest !== null) {
    try {
      const parsed = (0, import_yaml2.parse)(standaloneManifest, { schema: "failsafe" });
      if (parsed && typeof parsed === "object" && "permissions" in parsed) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}
var URL_RE = /https?:\/\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)/g;
var ENV_VAR_RE = /process\.env\.(\w+)|`?\$\{?(\w+)\}?`?|env\.(\w+)/g;
var PATH_RE = /['"`](\/(?:[a-zA-Z0-9_./-]+\/)?[a-zA-Z0-9_.-]+)['"`]/g;
var SHELL_COMMAND_PREFIXES = ["rm -rf", "curl", "wget", "bash", "chmod ", "chown", "mkfs", "dd if=", ":() {"];
function findShellCommands(content) {
  const commands = [];
  for (const line of content.split(/\r?\n/)) {
    const command = line.trimStart();
    const prefix = SHELL_COMMAND_PREFIXES.find((candidate) => command.startsWith(candidate));
    if (prefix) commands.push(prefix);
  }
  return commands;
}
function extractDomains(content) {
  const domains = /* @__PURE__ */ new Set();
  let match;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(content)) !== null) {
    domains.add(match[1].toLowerCase());
  }
  return domains;
}
function extractEnvVars(content) {
  const vars = /* @__PURE__ */ new Set();
  let match;
  ENV_VAR_RE.lastIndex = 0;
  while ((match = ENV_VAR_RE.exec(content)) !== null) {
    const v = match[1] || match[2] || match[3];
    if (v) vars.add(v);
  }
  return vars;
}
function extractPaths(content) {
  const paths = /* @__PURE__ */ new Set();
  let match;
  PATH_RE.lastIndex = 0;
  while ((match = PATH_RE.exec(content)) !== null) {
    paths.add(match[1]);
  }
  return paths;
}
function isSubPath(accessed, declared) {
  return declared.some((d) => accessed.startsWith(d) || accessed === d);
}
function detectPermissionViolations(content, _filePath, manifest) {
  const violations = [];
  const perms = manifest.permissions;
  if (!perms) return violations;
  if (perms.network?.allow) {
    const allowed = new Set(perms.network.allow.map((d) => d.toLowerCase()));
    const detected = extractDomains(content);
    for (const domain of detected) {
      if (!allowed.has(domain)) {
        violations.push({
          type: "network",
          declared: "network.allow",
          detected: domain,
          severity: "high",
          message: `Network request to undeclared domain: ${domain}`
        });
      }
    }
  }
  if (perms.shell?.deny && perms.shell.deny.length > 0) {
    for (const cmd of findShellCommands(content)) {
      if (perms.shell.deny.some((d) => cmd.includes(d) || d.includes(cmd))) {
        violations.push({
          type: "shell",
          declared: `shell.deny: ${perms.shell.deny.join(", ")}`,
          detected: cmd,
          severity: "high",
          message: `Denied shell command detected: ${cmd}`
        });
      }
    }
  }
  if (perms.filesystem?.read || perms.filesystem?.write) {
    const readPaths = perms.filesystem.read || [];
    const writePaths = perms.filesystem.write || [];
    const allDeclared = [...readPaths, ...writePaths];
    const accessed = extractPaths(content);
    for (const ap of accessed) {
      if (allDeclared.length > 0 && !isSubPath(ap, allDeclared)) {
        violations.push({
          type: "filesystem",
          declared: `filesystem: ${allDeclared.join(", ")}`,
          detected: ap,
          severity: "medium",
          message: `Filesystem access outside declared paths: ${ap}`
        });
      }
    }
  }
  if (perms.environment?.deny) {
    const detected = extractEnvVars(content);
    for (const v of detected) {
      if (perms.environment.deny.some((d) => d === v || v.startsWith(d))) {
        violations.push({
          type: "environment",
          declared: `environment.deny: ${perms.environment.deny.join(", ")}`,
          detected: v,
          severity: "medium",
          message: `Denied environment variable referenced: ${v}`
        });
      }
    }
  }
  return violations;
}

// lib/mcp/schema-scanner.ts
var PRECEDENCE_HIJACK_PATTERNS = [
  {
    regex: /(?:always|must)\s+(?:invoke|call|run|execute)\s+this\s+tool\s+(?:first|before)/i,
    title: "Tool Precedence Hijacking",
    desc: "Tool description attempts to force the agent to call this tool before any other tool or safety check."
  },
  {
    regex: /(?:system\s+override|override\s+(?:all\s+)?(?:safety|system|previous)\s+instructions)/i,
    title: "System Override in Tool Description",
    desc: "Tool description contains instruction override directives targeting the host agent."
  },
  {
    regex: /(?:ignore|bypass)\s+(?:all\s+)?(?:previous\s+instructions|safety\s+filters|user\s+confirmation)/i,
    title: "Prompt Injection / Safety Bypass in Tool Description",
    desc: "Tool description contains prompt injection attempting to bypass agent safety filters or confirmation steps."
  },
  {
    regex: /do\s+not\s+(?:tell|inform|alert|ask)\s+the\s+user/i,
    title: "Covert Tool Execution Directive",
    desc: "Tool description instructs the AI agent to hide tool execution from the user."
  },
  {
    regex: /IMPORTANT:\s*(?:you\s+must|always)\s+use\s+this\s+tool/i,
    title: "Priority Stealing Directive",
    desc: "Tool description attempts to artificially inflate tool priority using pseudo-system instructions."
  }
];
var DANGEROUS_TOOL_OR_PARAM_NAMES = /^(command|cmd|shell|exec|script|eval|query|sql|code|payload|run|bash)$/i;
function extractMcpToolsFromContent(content) {
  const tools = [];
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.tools)) {
        for (const t of parsed.tools) {
          if (t && typeof t.name === "string") tools.push(t);
        }
      } else if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (t && typeof t.name === "string" && (t.inputSchema || t.description)) tools.push(t);
        }
      } else if (parsed.name && (parsed.inputSchema || parsed.description)) {
        tools.push(parsed);
      }
    }
  } catch {
  }
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let match;
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.tools)) {
          for (const t of parsed.tools) {
            if (t && typeof t.name === "string") tools.push(t);
          }
        } else if (parsed.name && (parsed.inputSchema || parsed.description)) {
          tools.push(parsed);
        }
      }
    } catch {
    }
  }
  const inlineToolRegex = /{\s*["']?name["']?\s*:\s*["']([a-zA-Z0-9_-]+)["']\s*,\s*["']?description["']?\s*:\s*["']([^"']+)["']/g;
  while ((match = inlineToolRegex.exec(content)) !== null) {
    const existing = tools.some((t) => t.name === match[1]);
    if (!existing) {
      tools.push({
        name: match[1],
        description: match[2]
      });
    }
  }
  return tools;
}
function scanMcpToolDefinitions(tools, filePath, startFindingId) {
  const findings = [];
  let counter = startFindingId;
  for (const tool2 of tools) {
    if (tool2.description) {
      for (const pattern of PRECEDENCE_HIJACK_PATTERNS) {
        if (pattern.regex.test(tool2.description)) {
          findings.push({
            id: `finding-mcp-${++counter}`,
            axis: "security",
            severity: "high",
            category: "mcp-description-poisoning",
            title: pattern.title,
            message: `Tool "${tool2.name}": ${pattern.desc}`,
            filePath,
            snippet: tool2.description.slice(0, 150),
            recommendation: `Remove directive language or override instructions from tool "${tool2.name}" description. Describe solely what the tool does.`,
            ruleId: "SS-MCP-HIJACK"
          });
        }
      }
    }
    if (tool2.inputSchema?.properties) {
      const properties = tool2.inputSchema.properties;
      for (const [paramName, propSchema] of Object.entries(properties)) {
        if (!propSchema || typeof propSchema !== "object") continue;
        if (!propSchema.description || propSchema.description.trim().length === 0) {
          findings.push({
            id: `finding-mcp-${++counter}`,
            axis: "security",
            severity: "low",
            category: "mcp-missing-description",
            title: `Undocumented Parameter in Tool "${tool2.name}"`,
            message: `Parameter "${paramName}" in tool "${tool2.name}" lacks a description, which can lead to LLM hallucination and unintended tool invocation.`,
            filePath,
            snippet: `"${paramName}": ${JSON.stringify(propSchema)}`,
            recommendation: `Add a clear "description" explaining the expected format and purpose of parameter "${paramName}".`,
            ruleId: "SS-MCP-PARAM-DOC"
          });
        }
        const isDangerousName = DANGEROUS_TOOL_OR_PARAM_NAMES.test(paramName) || DANGEROUS_TOOL_OR_PARAM_NAMES.test(tool2.name);
        const isStringType = propSchema.type === "string";
        const hasNoPattern = !propSchema.pattern;
        const hasNoEnum = !propSchema.enum || propSchema.enum.length === 0;
        const hasNoLimit = typeof propSchema.maxLength !== "number" || propSchema.maxLength > 2048;
        if (isDangerousName && isStringType && hasNoPattern && hasNoEnum && hasNoLimit) {
          findings.push({
            id: `finding-mcp-${++counter}`,
            axis: "security",
            severity: "medium",
            category: "mcp-unconstrained-parameter",
            title: `Unconstrained Dangerous Parameter in Tool "${tool2.name}"`,
            message: `Parameter "${paramName}" in tool "${tool2.name}" accepts unbounded, unvalidated string input for an execution/command sink.`,
            filePath,
            snippet: `"${paramName}": ${JSON.stringify(propSchema)}`,
            recommendation: `Add a "pattern" (regex validation), "enum", or "maxLength" constraint to parameter "${paramName}" to prevent arbitrary injection.`,
            ruleId: "SS-MCP-UNCONSTRAINED-SINK"
          });
        }
      }
    }
  }
  return { findings, nextId: counter };
}
function scanFilesForMcp(files) {
  const allFindings = [];
  let counter = 0;
  for (const file of files) {
    if (!/\.(json|yaml|yml|md|ts|js|py)$/i.test(file.path)) continue;
    const tools = extractMcpToolsFromContent(file.content);
    if (tools.length > 0) {
      const { findings, nextId } = scanMcpToolDefinitions(tools, file.path, counter);
      counter = nextId;
      allFindings.push(...findings);
    }
  }
  return allFindings;
}

// lib/parser/frontmatter.ts
var import_yaml3 = __toESM(require_dist());
function stripProto(obj) {
  if (Array.isArray(obj)) return obj.map(stripProto);
  if (obj && typeof obj === "object") {
    const clean = {};
    for (const [key, val] of Object.entries(obj)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      clean[key] = stripProto(val);
    }
    return clean;
  }
  return obj;
}
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n?^---\n?([\s\S]*)$/m);
  if (!match) {
    return { frontmatter: {}, body: content.trim(), content };
  }
  let frontmatter = {};
  try {
    const parsed = (0, import_yaml3.parse)(match[1].trim(), { schema: "failsafe" });
    frontmatter = parsed && typeof parsed === "object" ? stripProto(parsed) : {};
  } catch {
    frontmatter = {};
  }
  const body = match[2] ? match[2].trim() : "";
  return { frontmatter, body, content };
}

// lib/scanner/capability-drift.ts
var NETWORK_PATTERNS = [
  { regex: /\b(?:fetch\s*\(|axios\.(?:get|post|put|delete|request)|https?\.request\b|net\.connect\b|new\s+WebSocket\b)/, desc: "JavaScript network request API" },
  { regex: /\b(?:requests\.(?:get|post|put|delete)|urllib\.request|aiohttp\.ClientSession|httpx\.(?:get|post|Client))\b/, desc: "Python HTTP client request" },
  { regex: /\b(?:curl|wget)\s+['"]?https?:\/\//i, desc: "CLI network download" }
];
var FS_WRITE_PATTERNS = [
  { regex: /\b(?:fs\.(?:writeFile|writeFileSync|appendFile|appendFileSync|unlink|unlinkSync|rm|rmSync|rmdir|rmdirSync|createWriteStream))\b/, desc: "Node.js filesystem write/delete call" },
  { regex: /\b(?:open\s*\([^)]*['"][wa+][a-z]*['"]|os\.(?:remove|unlink|rmdir)|shutil\.(?:rmtree|copy|move))\b/, desc: "Python filesystem modification call" },
  { regex: /\b(?:rm\s+-rf?|truncate\s+|shred\s+|mkfs)\b/, desc: "Destructive filesystem shell command" }
];
var SHELL_EXEC_PATTERNS = [
  { regex: /\b(?:child_process\.(?:exec|execSync|spawn|spawnSync|fork)|require\s*\(['"]child_process['"]\))/, desc: "Node.js child_process execution" },
  { regex: /\b(?:subprocess\.(?:run|Popen|check_output|call)|os\.system\b|os\.popen\b)/, desc: "Python subprocess/os.system execution" },
  { regex: /\b(?:eval\s*\(|new\s+Function\s*\()/, desc: "Dynamic code execution (eval)" }
];
var SENSITIVE_ENV_PATTERNS = [
  { regex: /(?:process\.env|os\.environ(?:\[|\.get\())\.?['"]?(AWS_SECRET|AWS_ACCESS|OPENAI_API|ANTHROPIC_API|GITHUB_TOKEN|PRIVATE_KEY|DATABASE_URL)/i, desc: "Sensitive credential access from environment" }
];
function extractDeclaredCapabilities(mainContent) {
  const normalized = mainContent.replace(/\r\n/g, "\n");
  const manifest = extractPermissionManifest(normalized);
  const parsed = parseFrontmatter(normalized);
  const meta = parsed.frontmatter || {};
  let allowsNetwork = false;
  let allowsFilesystemWrite = false;
  let allowsShell = false;
  let hasExplicitManifest = false;
  const declaredSummary = [];
  if (manifest?.permissions) {
    hasExplicitManifest = true;
    if (manifest.permissions.network?.allow && manifest.permissions.network.allow.length > 0) {
      allowsNetwork = true;
      declaredSummary.push(`Network allowed: ${manifest.permissions.network.allow.join(", ")}`);
    }
    if (manifest.permissions.filesystem?.write && manifest.permissions.filesystem.write.length > 0) {
      allowsFilesystemWrite = true;
      declaredSummary.push(`FS write allowed: ${manifest.permissions.filesystem.write.join(", ")}`);
    }
    if (manifest.permissions.shell?.allow && manifest.permissions.shell.allow.length > 0) {
      allowsShell = true;
      declaredSummary.push(`Shell allowed: ${manifest.permissions.shell.allow.join(", ")}`);
    }
  }
  const desc = String(meta.description || "").toLowerCase();
  const claimsOffline = /\b(offline|no\s+network|local\s+only|air-?gapped)\b/.test(desc);
  const claimsReadOnly = /\b(read-?only|view-?only|no\s+file\s+write)\b/.test(desc);
  const claimsNoExec = /\b(no\s+execution|no\s+eval|pure\s+text|safe\s+prompt)\b/.test(desc);
  if (claimsOffline) {
    allowsNetwork = false;
    declaredSummary.push("Frontmatter claims: offline / no network");
  }
  if (claimsReadOnly) {
    allowsFilesystemWrite = false;
    declaredSummary.push("Frontmatter claims: read-only");
  }
  if (claimsNoExec) {
    allowsShell = false;
    declaredSummary.push("Frontmatter claims: no execution");
  }
  return {
    allowsNetwork,
    allowsFilesystemWrite,
    allowsShell,
    hasExplicitManifest: hasExplicitManifest || claimsOffline || claimsReadOnly || claimsNoExec,
    declaredSummary
  };
}
function detectCodeBehaviors(files) {
  const behaviors = [];
  for (const file of files) {
    if (!/\.(js|ts|mjs|cjs|py|sh|bash|json|ya?ml)$/i.test(file.path)) continue;
    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("#")) continue;
      for (const p of NETWORK_PATTERNS) {
        if (p.regex.test(line)) {
          behaviors.push({
            category: "network",
            filePath: file.path,
            line: i + 1,
            matchedText: trimmed.slice(0, 120),
            description: p.desc
          });
          break;
        }
      }
      for (const p of FS_WRITE_PATTERNS) {
        if (p.regex.test(line)) {
          behaviors.push({
            category: "filesystem-write",
            filePath: file.path,
            line: i + 1,
            matchedText: trimmed.slice(0, 120),
            description: p.desc
          });
          break;
        }
      }
      for (const p of SHELL_EXEC_PATTERNS) {
        if (p.regex.test(line)) {
          behaviors.push({
            category: "shell-execution",
            filePath: file.path,
            line: i + 1,
            matchedText: trimmed.slice(0, 120),
            description: p.desc
          });
          break;
        }
      }
      for (const p of SENSITIVE_ENV_PATTERNS) {
        if (p.regex.test(line)) {
          behaviors.push({
            category: "sensitive-env",
            filePath: file.path,
            line: i + 1,
            matchedText: trimmed.slice(0, 120),
            description: p.desc
          });
          break;
        }
      }
    }
  }
  return behaviors;
}
function analyzeCapabilityDrift(files, mainContent, startFindingId) {
  const declared = extractDeclaredCapabilities(mainContent);
  const behaviors = detectCodeBehaviors(files);
  const findings = [];
  let counter = startFindingId;
  if (declared.hasExplicitManifest) {
    for (const b of behaviors) {
      if (b.category === "network" && !declared.allowsNetwork) {
        findings.push({
          id: `finding-drift-${++counter}`,
          axis: "security",
          severity: "high",
          category: "capability-drift",
          title: "Undeclared Network Activity (Capability Drift)",
          message: `Skill declared no outbound network permissions, but ${b.description} was detected at line ${b.line}.`,
          filePath: b.filePath,
          lineNumber: b.line,
          snippet: b.matchedText,
          recommendation: "Declare network permissions in the manifest if required, or remove the undeclared network call.",
          ruleId: "SS-DRIFT-NET"
        });
      }
      if (b.category === "filesystem-write" && !declared.allowsFilesystemWrite) {
        findings.push({
          id: `finding-drift-${++counter}`,
          axis: "security",
          severity: "high",
          category: "capability-drift",
          title: "Undeclared Filesystem Modification (Capability Drift)",
          message: `Skill declared read-only or no filesystem write permissions, but ${b.description} was detected at line ${b.line}.`,
          filePath: b.filePath,
          lineNumber: b.line,
          snippet: b.matchedText,
          recommendation: "Declare filesystem write permissions in the manifest if intended, or remove destructive/writing operations.",
          ruleId: "SS-DRIFT-FS"
        });
      }
      if (b.category === "shell-execution" && !declared.allowsShell) {
        findings.push({
          id: `finding-drift-${++counter}`,
          axis: "security",
          severity: "high",
          category: "capability-drift",
          title: "Undeclared Process / Shell Execution (Capability Drift)",
          message: `Skill declared no shell execution permissions, but ${b.description} was detected at line ${b.line}.`,
          filePath: b.filePath,
          lineNumber: b.line,
          snippet: b.matchedText,
          recommendation: "Declare shell permissions in the manifest or replace subprocess calls with safe native JavaScript/Python APIs.",
          ruleId: "SS-DRIFT-EXEC"
        });
      }
    }
  }
  return { findings, nextId: counter };
}

// lib/scanner/security.ts
var findingCounter3 = 0;
function runSecurityScan(files, _content) {
  const findings = [];
  for (const file of files) {
    for (const pattern of ALL_PATTERNS) {
      const finding = pattern.detect(file.content, file.path);
      if (finding) {
        findings.push(finding);
      }
    }
    const secretFindings = scanForSecrets(file.content, file.path);
    findings.push(...secretFindings);
    const obfuscationFindings = scanObfuscation(file.content, file.path);
    findings.push(...obfuscationFindings);
    const semgrepFindings = runSemgrepScan(file.content, file.path);
    findings.push(...semgrepFindings);
  }
  const mcpFindings = scanFilesForMcp(files);
  findings.push(...mcpFindings);
  const driftResult = analyzeCapabilityDrift(files, _content, findingCounter3);
  findingCounter3 = driftResult.nextId;
  findings.push(...driftResult.findings);
  const manifest = extractPermissionManifest(_content);
  if (manifest) {
    const violations = detectPermissionViolations(_content, "", manifest);
    for (const v of violations) {
      findings.push({
        id: `finding-perm-${++findingCounter3}`,
        axis: "security",
        severity: v.severity,
        category: "permission-violation",
        title: `Permission violation: ${v.type}`,
        message: v.message,
        filePath: "",
        snippet: `declared: ${v.declared}, detected: ${v.detected}`,
        recommendation: `Add "${v.detected}" to the ${v.type} permissions in the permission manifest.`
      });
    }
  }
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;
  let score = 100;
  score -= criticalCount * 50;
  score -= highCount * 25;
  score -= mediumCount * 10;
  score -= lowCount * 5;
  score = Math.max(0, Math.min(100, score));
  let summary;
  if (criticalCount > 0) {
    summary = `CRITICAL: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low issues`;
  } else if (highCount > 0) {
    summary = `${highCount} high, ${mediumCount} medium, ${lowCount} low security issues`;
  } else if (mediumCount > 0) {
    summary = `${mediumCount} medium, ${lowCount} low security issues`;
  } else if (lowCount > 0) {
    summary = `${lowCount} low-severity issues found`;
  } else {
    summary = "No security issues detected";
  }
  return {
    name: "Security Scan",
    key: "security",
    score,
    status: score >= 90 ? "pass" : score >= 50 ? "warn" : "fail",
    summary,
    findings
  };
}

// packages/core/src/shared-security.ts
var SECURITY_ENGINE_VERSION = "shared-security-2026-10-14-v1";

// packages/core/src/baseline.ts
import { createHash } from "node:crypto";
var hash = (value) => createHash("sha256").update(value).digest("hex");
function sourceHash(files) {
  return hash(JSON.stringify([...files].sort((a, b) => a.path.localeCompare(b.path)).map((f) => [f.path, hash(f.content)])));
}
function findingFingerprint(f) {
  return hash(JSON.stringify([f.ruleId, f.axis, f.severity, f.category, f.title, f.message, f.filePath, f.lineNumber, f.snippet]));
}
function validateBaseline(value) {
  const b = value;
  if (!b || b.version !== 1 || b.engineVersion !== SECURITY_ENGINE_VERSION || !/^[a-f0-9]{64}$/.test(b.sourceHash) || !Array.isArray(b.entries) || b.entries.some((e) => !e || !/^[a-f0-9]{64}$/.test(e.fingerprint) || typeof e.reason !== "string" || !e.reason.trim())) {
    throw new Error("Invalid baseline or incompatible security engine version");
  }
}

// lib/validator/dependency-advisories.ts
var cache = /* @__PURE__ */ new Map();
var MAX_PACKAGES = 200;
var MAX_ADVISORIES = 100;
var keyOf = (dep) => `${dep.ecosystem}:${dep.name}@${dep.version}`;
var exactNpm = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
var exactPython = /^\d+(?:\.\d+)*(?:(?:a|b|rc)\d+)?(?:\.post\d+)?(?:\.dev\d+)?(?:\+[a-zA-Z0-9.]+)?$/;
async function scanDependencyAdvisories(files) {
  const dependencies = [];
  let status = "complete";
  const manifests = files.filter((file) => /(?:^|\/)(?:package(?:-lock)?\.json|requirements(?:[-\w.]*)\.txt|pyproject\.toml)$/.test(file.path.replace(/\\/g, "/")));
  if (manifests.length > 100) status = "unavailable";
  for (const file of manifests.slice(0, 100)) {
    if (file.content.length > 1048576) {
      status = "unavailable";
      continue;
    }
    const add = (name, version, ecosystem, needle) => {
      if (dependencies.length >= 2e3) {
        status = "unavailable";
        return;
      }
      if (typeof version !== "string" || !(ecosystem === "npm" ? exactNpm : exactPython).test(version)) return;
      if (!(ecosystem === "npm" ? /^(?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/ : /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/).test(name)) return;
      const normalized = ecosystem === "PyPI" ? name.toLowerCase().replace(/[-_.]+/g, "-") : name;
      const offset = file.content.indexOf(needle);
      dependencies.push({ name: normalized, version, ecosystem, filePath: file.path, lineNumber: offset < 0 ? 1 : file.content.slice(0, offset).split("\n").length });
    };
    try {
      if (/\.json$/.test(file.path)) {
        const data = JSON.parse(file.content);
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid manifest");
        if (file.path.endsWith("package-lock.json")) {
          if (data.packages !== void 0 && (!data.packages || typeof data.packages !== "object" || Array.isArray(data.packages))) throw new Error("Invalid lockfile packages");
          if (data.packages && typeof data.packages === "object") {
            for (const [path2, entry] of Object.entries(data.packages)) {
              const name = path2.split("node_modules/").at(-1);
              if (name && path2.includes("node_modules/") && entry && typeof entry === "object") {
                const value = entry;
                add(typeof value.name === "string" ? value.name : name, value.version, "npm", JSON.stringify(path2));
              }
            }
          } else {
            const walk = (entries, depth) => {
              if (depth > 20) {
                status = "unavailable";
                return;
              }
              for (const [name, entry] of Object.entries(entries)) {
                if (!entry || typeof entry !== "object") continue;
                const value = entry;
                add(name, value.version, "npm", JSON.stringify(name));
                if (value.dependencies && typeof value.dependencies === "object") walk(value.dependencies, depth + 1);
              }
            };
            if (data.dependencies !== void 0 && (!data.dependencies || typeof data.dependencies !== "object" || Array.isArray(data.dependencies))) throw new Error("Invalid lockfile dependencies");
            if (data.dependencies) walk(data.dependencies, 0);
          }
        } else {
          for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
            if (data[section] !== void 0 && (!data[section] || typeof data[section] !== "object" || Array.isArray(data[section]))) throw new Error("Invalid dependency manifest");
            if (data[section] && typeof data[section] === "object") for (const [name, version] of Object.entries(data[section])) add(name, version, "npm", JSON.stringify(name));
          }
        }
      } else if (file.path.endsWith("pyproject.toml")) {
        const project = file.content.replace(/#.*$/gm, "").match(/^\[project\]\s*\n([\s\S]*?)(?=^\[|$(?![\s\S]))/m)?.[1] ?? "";
        const array = project.match(/^dependencies\s*=\s*\[((?:"[^"\n]*"|'[^'\n]*'|[^\]"'])*)\]/m)?.[1] ?? "";
        for (const match of array.matchAll(/["']([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[[\w, -]+\])?\s*==\s*([^"';\s]+)(?:\s*;[^"']*)?["']/g)) add(match[1], match[2], "PyPI", match[0]);
      } else {
        for (const line of file.content.split("\n")) {
          const match = line.match(/^\s*([a-zA-Z0-9][a-zA-Z0-9._-]*)(?:\[[\w, -]+\])?\s*==\s*([^\s;#]+)(?:\s*(?:;|#|--hash=).*)?\s*$/);
          if (match) add(match[1], match[2], "PyPI", line);
        }
      }
    } catch {
      status = "unavailable";
    }
  }
  const unique = [...new Map(dependencies.map((dep) => [keyOf(dep), dep])).values()];
  if (unique.length > MAX_PACKAGES) status = "unavailable";
  const selected = unique.slice(0, MAX_PACKAGES);
  const found = /* @__PURE__ */ new Map();
  const pending = selected.filter((dep) => {
    const cached = cache.get(keyOf(dep));
    if (cached && cached.expires > Date.now()) {
      found.set(keyOf(dep), cached.advisories);
      return false;
    }
    cache.delete(keyOf(dep));
    return true;
  });
  if (pending.length) {
    const signal = AbortSignal.timeout(1e4);
    const request = async (url, init) => {
      const response = await fetch(url, { ...init, signal, cache: "no-store" });
      if (!response.ok) throw new Error("OSV unavailable");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Empty OSV response");
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2097152) {
          await reader.cancel();
          throw new Error("OSV response too large");
        }
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    };
    try {
      const batch = await request("https://api.osv.dev/v1/querybatch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ queries: pending.map((dep) => ({ package: { name: dep.name, ecosystem: dep.ecosystem }, version: dep.version })) }) });
      if (!Array.isArray(batch.results) || batch.results.length !== pending.length) throw new Error("Invalid OSV results");
      const details = /* @__PURE__ */ new Map();
      for (let index = 0; index < pending.length; index++) {
        const result = batch.results[index];
        if (!result || typeof result !== "object" || result.error || result.next_page_token || result.vulns !== void 0 && !Array.isArray(result.vulns)) {
          status = "unavailable";
          continue;
        }
        const advisories = [];
        let complete = true;
        for (const vuln of result.vulns ?? []) {
          if (typeof vuln?.id !== "string" || !/^[\w.-]{1,200}$/.test(vuln.id)) {
            complete = false;
            break;
          }
          let advisory = details.get(vuln.id);
          if (!advisory) {
            if (details.size >= MAX_ADVISORIES) {
              complete = false;
              break;
            }
            try {
              advisory = await request(`https://api.osv.dev/v1/vulns/${encodeURIComponent(vuln.id)}`);
              if (!advisory || advisory.id !== vuln.id || advisory.summary !== void 0 && typeof advisory.summary !== "string" || advisory.database_specific?.severity !== void 0 && typeof advisory.database_specific.severity !== "string" || advisory.affected !== void 0 && !Array.isArray(advisory.affected)) throw new Error("Invalid advisory");
              for (const affected of advisory.affected ?? []) {
                if (!affected || affected.ranges !== void 0 && !Array.isArray(affected.ranges)) throw new Error("Invalid advisory ranges");
                for (const range of affected.ranges ?? []) {
                  if (!range || range.events !== void 0 && !Array.isArray(range.events)) throw new Error("Invalid advisory events");
                  if ((range.events ?? []).some((event) => !event || event.fixed !== void 0 && typeof event.fixed !== "string")) throw new Error("Invalid fixed version");
                }
              }
              details.set(vuln.id, advisory);
            } catch {
              complete = false;
              break;
            }
          }
          advisories.push(advisory);
        }
        found.set(keyOf(pending[index]), advisories);
        if (!complete) {
          status = "unavailable";
          continue;
        }
        if (cache.size >= 1e3) cache.delete(cache.keys().next().value);
        cache.set(keyOf(pending[index]), { expires: Date.now() + 36e5, advisories });
      }
    } catch {
      status = "unavailable";
    }
  }
  const findings = [];
  const locations = /* @__PURE__ */ new Set();
  for (const dep of dependencies) {
    for (const advisory of found.get(keyOf(dep)) ?? []) {
      const location = `${keyOf(dep)}:${dep.filePath}:${advisory.id}`;
      if (locations.has(location)) continue;
      locations.add(location);
      const severity = advisory.database_specific?.severity?.toLowerCase();
      const fixes = [...new Set((advisory.affected ?? []).filter((item) => item.package?.name === dep.name && item.package?.ecosystem === dep.ecosystem).flatMap((item) => item.ranges ?? []).flatMap((range) => range.events ?? []).map((event) => event.fixed).filter((fixed) => typeof fixed === "string"))];
      findings.push({ id: `osv-${findings.length + 1}`, axis: "dependencies", category: "security", severity: ["critical", "high", "medium", "low"].includes(severity ?? "") ? severity : "medium", title: `Vulnerable dependency: ${dep.name}@${dep.version}`, message: `${advisory.id}: ${advisory.summary ?? "OSV reports this exact package version as affected."}`, filePath: dep.filePath, lineNumber: dep.lineNumber, ruleId: "dependency-vulnerability", recommendation: fixes.length ? `Review advisory https://osv.dev/vulnerability/${advisory.id}. Reported fixed versions: ${fixes.join(", ")}; choose a compatible fixed release.` : `Review https://osv.dev/vulnerability/${advisory.id} for mitigation; no fixed version is reported.` });
    }
  }
  return { findings, status, checkedPackages: found.size };
}

// packages/cli/src/local-scan.ts
var severities = ["critical", "high", "medium", "low", "info"];
function getLocalVerdict(result) {
  if (result.activeFindings.some((f) => f.severity === "critical")) return "Do Not Install";
  if (result.coverage.status !== "complete" || result.dependencyAdvisories?.status === "unavailable" || result.activeFindings.some((f) => f.severity === "high" || f.severity === "medium")) return "Needs Manual Review";
  return "Safe to Review";
}
function withVerdict(result) {
  return { ...result, verdict: getLocalVerdict(result) };
}
function readLocalFiles(directory) {
  const root = path.resolve(directory);
  if (root.startsWith("\\\\")) throw new Error("Remote or device paths are not supported; choose a local directory");
  if (!fs.lstatSync(root).isDirectory() || fs.lstatSync(root).isSymbolicLink()) throw new Error("Skill path must be a real directory");
  const files = [];
  const coverage = { status: "complete", discoveredFiles: 0, inspectedFiles: 0, skippedFiles: [] };
  let bytes = 0;
  let entries = 0;
  const skip = (p, reason) => {
    coverage.status = "partial";
    coverage.skippedFiles.push({ path: p, reason });
  };
  function walk(dir, depth) {
    if (depth > 32) {
      skip(path.relative(root, dir), "depth-limit");
      return;
    }
    const handle = fs.opendirSync(dir);
    try {
      let entry;
      while (entry = handle.readSync()) {
        const full = path.join(dir, entry.name);
        const relative = path.relative(root, full).replace(/\\/g, "/");
        if (++entries > 1e4) {
          skip(relative, "entry-limit");
          return;
        }
        try {
          const stat = fs.lstatSync(full);
          if (stat.isSymbolicLink()) {
            coverage.discoveredFiles++;
            skip(relative, "symlink");
            continue;
          }
          if (stat.isDirectory()) {
            if (["node_modules", ".git", ".next", "vendor", "dist", "build"].includes(entry.name)) skip(relative, "dependency-or-generated-directory");
            else walk(full, depth + 1);
            continue;
          }
          coverage.discoveredFiles++;
          if (!stat.isFile()) {
            skip(relative, "non-regular-file");
            continue;
          }
          if (stat.size > 1024 * 1024 || bytes + stat.size > 16 * 1024 * 1024 || files.length >= 1e3) {
            skip(relative, "size-or-file-limit");
            continue;
          }
          const fd = fs.openSync(full, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
          let data;
          try {
            const opened = fs.fstatSync(fd);
            if (!opened.isFile() || opened.ino !== stat.ino || opened.dev !== stat.dev || opened.size > 1024 * 1024) {
              skip(relative, "file-changed");
              continue;
            }
            data = Buffer.alloc(Math.min(opened.size + 1, 1024 * 1024 + 1));
            let length = 0;
            while (length < data.length) {
              const read = fs.readSync(fd, data, length, data.length - length, length);
              if (!read) break;
              length += read;
            }
            const after = fs.fstatSync(fd);
            if (length !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) {
              skip(relative, "file-changed-or-short-read");
              continue;
            }
            data = data.subarray(0, length);
          } finally {
            fs.closeSync(fd);
          }
          bytes += data.length;
          if (data.length > 1024 * 1024) {
            skip(relative, "size-limit");
            continue;
          }
          let content;
          try {
            content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(data);
          } catch {
            skip(relative, "binary-or-invalid-utf8");
            continue;
          }
          if (content.includes("\0")) {
            skip(relative, "binary");
            continue;
          }
          files.push({ path: relative, content });
          coverage.inspectedFiles++;
        } catch {
          skip(relative, "read-failed");
        }
      }
    } finally {
      handle.closeSync();
    }
  }
  walk(root, 0);
  return { files, coverage };
}
function scanFiles(directory, files, coverage) {
  const content = files.find((f) => f.path === "SKILL.md")?.content;
  if (!content) throw new Error("A readable, nonempty SKILL.md is required");
  const security = runSecurityScan(files, content);
  const metadata = parseFrontmatter(content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n")).frontmatter;
  const findings = security.findings;
  const riskLevel = severities.find((s) => findings.some((f) => f.severity === s)) || "safe";
  return withVerdict({ score: security.score, riskLevel, name: typeof metadata.name === "string" ? metadata.name : path.basename(path.resolve(directory)), description: typeof metadata.description === "string" ? metadata.description : "", findings, activeFindings: findings, suppressedFindings: [], coverage, sourceHash: sourceHash(files), engineVersion: SECURITY_ENGINE_VERSION });
}
async function scanLocalSkillWithOptions(directory, dependencies = false) {
  const { files, coverage } = readLocalFiles(directory);
  const result = scanFiles(directory, files, coverage);
  if (!dependencies) return result;
  const advisory = await scanDependencyAdvisories(files);
  const findings = [...result.findings, ...advisory.findings];
  const score = Math.max(0, 100 - findings.reduce((sum, f) => sum + { critical: 50, high: 25, medium: 10, low: 5, info: 0 }[f.severity], 0));
  return withVerdict({ ...result, findings, activeFindings: findings, score, riskLevel: severities.find((s) => findings.some((f) => f.severity === s)) || "safe", dependencyAdvisories: { status: advisory.status, checkedPackages: advisory.checkedPackages } });
}
function createBaseline(result, reason) {
  if (!reason.trim()) throw new Error("Baseline acceptance requires a reason");
  if (result.coverage.status !== "complete" || result.dependencyAdvisories?.status === "unavailable") throw new Error("Cannot accept a baseline with incomplete coverage");
  return { version: 1, engineVersion: result.engineVersion, sourceHash: result.sourceHash, entries: result.findings.map((f) => ({ fingerprint: findingFingerprint(f), reason })) };
}
function applyBaseline(result, baseline) {
  validateBaseline(baseline);
  if (baseline.sourceHash !== result.sourceHash) return result;
  const accepted = new Map(baseline.entries.map((e) => [e.fingerprint, e.reason]));
  return withVerdict({ ...result, activeFindings: result.findings.filter((f) => !accepted.has(findingFingerprint(f))), suppressedFindings: result.findings.filter((f) => accepted.has(findingFingerprint(f))).map((finding) => ({ finding, reason: accepted.get(findingFingerprint(finding)) })) });
}
function baselinePath(directory, filename) {
  const root = path.resolve(directory);
  const resolved = path.resolve(filename);
  const parent = fs.realpathSync(path.dirname(resolved));
  const actual = fs.existsSync(resolved) ? fs.realpathSync(resolved) : path.join(parent, path.basename(resolved));
  const relative = path.relative(fs.realpathSync(root), actual);
  if (!relative || !relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative)) throw new Error("Store the baseline outside the scanned skill directory");
  return resolved;
}
function readBaseline(directory, filename) {
  const resolved = baselinePath(directory, filename);
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw new Error("Baseline must be a regular JSON file no larger than 1 MiB");
  const fd = fs.openSync(resolved, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  try {
    const data = Buffer.alloc(1024 * 1024 + 1);
    let length = 0;
    while (length < data.length) {
      const read = fs.readSync(fd, data, length, data.length - length, length);
      if (!read) break;
      length += read;
    }
    if (length > 1024 * 1024) throw new Error("Baseline exceeds size limit");
    return JSON.parse(new TextDecoder("utf8", { fatal: true }).decode(data.subarray(0, length)));
  } finally {
    fs.closeSync(fd);
  }
}
function shouldFail(result, severity, failOnIncomplete) {
  if (!severities.includes(severity)) throw new Error("Unknown fail-on severity");
  return failOnIncomplete && (result.coverage.status !== "complete" || result.dependencyAdvisories?.status === "unavailable") || result.activeFindings.some((f) => severities.indexOf(f.severity) <= severities.indexOf(severity));
}

// packages/cli/src/markdown.ts
function escapeMarkdownTableCell(value) {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

// packages/cli/src/formats.ts
function outputJson(result) {
  return JSON.stringify(result, null, 2);
}
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function outputHtml(result) {
  const findingRows = result.findings.map((f) => `
    <tr>
      <td><span class="sev sev-${escapeHtml(f.severity)}">${escapeHtml(f.severity.toUpperCase())}</span></td>
      <td>${escapeHtml(f.category)}</td>
      <td>${escapeHtml(f.title)}</td>
      <td>${escapeHtml(f.filePath)}:${escapeHtml(f.lineNumber || "-")}</td>
      <td>${escapeHtml(f.recommendation || "-")}</td>
    </tr>`).join("");
  const scoreColor = result.score >= 70 ? "#16a34a" : result.score >= 50 ? "#ca8a04" : result.score >= 30 ? "#ea580c" : "#dc2626";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Skill Shield CLI Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; color: #18181b; background: #fff; }
    h1 { font-size: 1.5rem; }
    .score { font-size: 3rem; font-weight: 700; color: ${scoreColor}; }
    .meta { color: #71717a; font-size: 0.875rem; margin: 0.5rem 0 2rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e4e4e7; font-size: 0.875rem; }
    th { font-weight: 600; color: #71717a; background: #fafafa; }
    .sev { font-weight: 600; font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 999px; }
    .sev-critical { background: #fef2f2; color: #dc2626; }
    .sev-high { background: #fff7ed; color: #ea580c; }
    .sev-medium { background: #fefce8; color: #ca8a04; }
    .sev-low { background: #f7fee7; color: #65a30d; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e4e4e7; font-size: 0.75rem; color: #a1a1aa; }
  </style>
</head>
<body>
  <h1>AI Skill Shield CLI Report</h1>
  <div class="score">${result.score}/100</div>
  <p>Verdict: ${escapeHtml(result.verdict)}</p>
  <div class="meta">Highest Finding: ${escapeHtml(result.riskLevel.toUpperCase())} &middot; ${result.findings.length} findings &middot; Coverage: ${escapeHtml(result.coverage.status)} (${result.coverage.inspectedFiles} inspected, ${result.coverage.skippedFiles.length} exclusions) &middot; ${result.activeFindings.length} active findings</div>
  ${result.coverage.skippedFiles.length ? `<h2>Coverage exclusions</h2><ul>${result.coverage.skippedFiles.map((f) => `<li>${escapeHtml(f.path)}: ${escapeHtml(f.reason)}</li>`).join("")}</ul>` : ""}
  ${result.suppressedFindings.length ? `<h2>Accepted findings</h2><ul>${result.suppressedFindings.map((s) => `<li>${escapeHtml(s.finding.title)}: ${escapeHtml(s.reason)}</li>`).join("")}</ul>` : ""}
  <h2>Findings</h2>
  ${result.findings.length === 0 ? "<p>No issues found.</p>" : `<table><thead><tr><th>Severity</th><th>Category</th><th>Title</th><th>File:Line</th><th>Recommendation</th></tr></thead><tbody>${findingRows}</tbody></table>`}
  <div class="footer">Generated by AI Skill Shield CLI</div>
</body>
</html>`;
}
function outputSarif(result) {
  const accepted = new Map(result.suppressedFindings.map((s) => [findingFingerprint(s.finding), s.reason]));
  const runs = [{
    tool: { driver: { name: "AI Skill Shield", informationUri: "https://github.com/skill-shield", rules: [] } },
    results: result.findings.map((f) => ({
      ruleId: f.title,
      suppressions: accepted.has(findingFingerprint(f)) ? [{ kind: "external", status: "accepted", justification: accepted.get(findingFingerprint(f)) }] : void 0,
      level: f.severity === "critical" || f.severity === "high" ? "error" : f.severity === "medium" ? "warning" : "note",
      message: { text: `${f.title}: ${f.message}` },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: (f.filePath || "SKILL.md").split("/").map(encodeURIComponent).join("/") },
          region: { startLine: f.lineNumber || 1 }
        }
      }]
    })),
    properties: { score: result.score, riskLevel: result.riskLevel, verdict: result.verdict, coverage: result.coverage, dependencyAdvisories: result.dependencyAdvisories, suppressedFindings: result.suppressedFindings }
  }];
  return JSON.stringify({ $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json", version: "2.1.0", runs }, null, 2);
}
function outputMarkdown(result) {
  let md = `# AI Skill Shield Scan Report

`;
  md += `**Score:** ${result.score}/100
`;
  md += `**Verdict:** ${result.verdict}
`;
  md += `**Highest Finding Severity:** ${result.riskLevel.toUpperCase()}
`;
  md += `**Findings:** ${result.findings.length}
**Coverage:** ${result.coverage.status} (${result.coverage.inspectedFiles} inspected, ${result.coverage.skippedFiles.length} exclusions)
**Accepted findings:** ${result.suppressedFindings.length}

`;
  if (result.findings.length === 0) {
    md += `No issues found.
`;
  } else {
    md += `| Severity | Category | Title | File |
| --- | --- | --- | --- |
`;
    for (const f of result.findings) {
      md += `| ${f.severity.toUpperCase()} | ${escapeMarkdownTableCell(f.category)} | ${escapeMarkdownTableCell(f.title)} | ${escapeMarkdownTableCell(f.filePath || "SKILL.md")}:${f.lineNumber || 1} |
`;
    }
  }
  if (result.coverage.skippedFiles.length) md += "\n## Coverage exclusions\n\n" + result.coverage.skippedFiles.map((f) => `- ${escapeMarkdownTableCell(f.path)}: ${escapeMarkdownTableCell(f.reason)}`).join("\n") + "\n";
  if (result.suppressedFindings.length) md += "\n## Accepted findings\n\n" + result.suppressedFindings.map((s) => `- ${escapeMarkdownTableCell(s.finding.title)}: ${escapeMarkdownTableCell(s.reason)}`).join("\n") + "\n";
  if (result.dependencyAdvisories) md += `
**Dependency advisories:** ${result.dependencyAdvisories.status} (${result.dependencyAdvisories.checkedPackages} exact packages checked)
`;
  return md;
}

// packages/cli/src/mcp.ts
var tool = { name: "scan_skill", description: "Scan a local skill directory using AI Skill Shield security rules. Reads bounded local files; never executes skill code. Optional dependencies sends package names and versions to OSV.", inputSchema: { type: "object", properties: { path: { type: "string", minLength: 1, maxLength: 4096 }, dependencies: { type: "boolean", default: false } }, required: ["path"], additionalProperties: false } };
function runMcp() {
  let buffer = "";
  let initialized = false;
  let ready = false;
  let queue = Promise.resolve();
  let pending = 0;
  const send = (value) => process.stdout.write(JSON.stringify(value) + "\n");
  async function handle(line) {
    let request;
    try {
      request = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }
    if (!request || typeof request !== "object" || Array.isArray(request) || request.jsonrpc !== "2.0" || typeof request.method !== "string" || request.id !== void 0 && request.id !== null && typeof request.id !== "string" && typeof request.id !== "number") {
      send({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } });
      return;
    }
    if (request.id === void 0) {
      if (request.method === "notifications/initialized" && initialized) ready = true;
      return;
    }
    const reply = (result) => send({ jsonrpc: "2.0", id: request.id, result });
    const error = (code, message) => send({ jsonrpc: "2.0", id: request.id, error: { code, message } });
    if (request.method === "initialize") {
      const versions = ["2024-11-05", "2025-03-26", "2025-06-18"];
      const version = request.params?.protocolVersion;
      const client = request.params?.clientInfo;
      const capabilities = request.params?.capabilities;
      if (initialized || typeof version !== "string" || !client || typeof client.name !== "string" || typeof client.version !== "string" || !capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) {
        error(-32602, "Invalid initialize parameters");
        return;
      }
      initialized = true;
      reply({ protocolVersion: versions.includes(version) ? version : "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "skillshield", version: "0.3.0" } });
    } else if (request.method === "ping") reply({});
    else if (!ready) error(-32e3, "Initialize the server first");
    else if (request.method === "tools/list") reply({ tools: [tool] });
    else if (request.method === "tools/call") {
      const args = request.params?.arguments;
      if (request.params?.name !== "scan_skill" || !args || typeof args !== "object" || Array.isArray(args) || typeof args.path !== "string" || !args.path.trim() || args.path.length > 4096 || args.dependencies !== void 0 && typeof args.dependencies !== "boolean" || Object.keys(args).some((k) => !["path", "dependencies"].includes(k))) {
        error(-32602, "Expected scan_skill with a local directory path");
        return;
      }
      try {
        reply({ content: [{ type: "text", text: JSON.stringify(await scanLocalSkillWithOptions(args.path, args.dependencies === true)) }], isError: false });
      } catch (e) {
        reply({ content: [{ type: "text", text: e instanceof Error ? e.message : "Scan failed" }], isError: true });
      }
    } else error(-32601, "Method not found");
  }
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    if (buffer.length > 1024 * 1024) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Message exceeds limit" } });
      process.stdin.destroy();
      return;
    }
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line) continue;
      if (++pending > 32) {
        send({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Too many pending messages" } });
        process.stdin.destroy();
        break;
      }
      queue = queue.then(() => handle(line)).finally(() => {
        pending--;
      });
    }
  });
}

// packages/cli/src/command.ts
function formatReport(result, format) {
  const formats = { json: outputJson, html: outputHtml, sarif: outputSarif, markdown: outputMarkdown };
  const render = formats[format];
  if (!render) throw new Error("Unknown output format");
  return render(result);
}
async function runCommand(args) {
  if (args[0] === "mcp") {
    runMcp();
    return;
  }
  if (args.includes("--help") || args.length === 0) {
    console.log("skillshield scan <directory> [--format json|html|sarif|markdown] [--output file] [--fail-on critical|high|medium|low|info] [--fail-on-incomplete] [--dependencies] [--baseline file] [--write-baseline file --reason text]\nskillshield mcp");
    return;
  }
  if (args[0] === "--version") {
    console.log("0.3.0");
    return;
  }
  if (args[0] !== "scan" || !args[1] || args[1].startsWith("--")) throw new Error("Expected scan <directory> or mcp");
  const options = { format: "json", "fail-on": "high" };
  for (let i = 2; i < args.length; i++) {
    const name = args[i].replace(/^--/, "");
    if (["--fail-on-incomplete", "--dependencies"].includes(args[i])) {
      options[name] = "true";
      continue;
    }
    if (!args[i].startsWith("--") || !["format", "fail-on", "output", "baseline", "write-baseline", "reason"].includes(name) || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Invalid option: ${args[i]}`);
    options[name] = args[++i];
  }
  const writeBaseline = options["write-baseline"] ? baselinePath(args[1], options["write-baseline"]) : void 0;
  const baseline = options.baseline ? readBaseline(args[1], options.baseline) : void 0;
  let result = await scanLocalSkillWithOptions(args[1], options.dependencies === "true");
  if (baseline !== void 0) result = applyBaseline(result, baseline);
  const fail = shouldFail(result, options["fail-on"], options["fail-on-incomplete"] === "true");
  const output = formatReport(result, options.format);
  if (writeBaseline) fs2.writeFileSync(writeBaseline, JSON.stringify(createBaseline(result, options.reason || ""), null, 2));
  if (options.output) fs2.writeFileSync(options.output, output);
  else console.log(output);
  if (fail) process.exitCode = 1;
}

// packages/cli/src/index.ts
runCommand(process.argv.slice(2)).catch((error) => {
  console.error(error instanceof Error ? error.message : "Scan failed");
  process.exitCode = 1;
});
