import { defineComponent as c, createElementBlock as o, openBlock as s, createElementVNode as p, createCommentVNode as i, toDisplayString as d } from "vue";
const m = { class: "vue-pdf-signer-container" }, _ = { key: 0 }, l = /* @__PURE__ */ c({
  __name: "PdfSigner",
  props: {
    message: {}
  },
  setup(e) {
    return (t, n) => (s(), o("div", m, [
      n[0] || (n[0] = p("h1", null, "Vue PDF Signer Component", -1)),
      t.message ? (s(), o("p", _, d(t.message), 1)) : i("", !0)
    ]));
  }
}), f = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [r, a] of t)
    n[r] = a;
  return n;
}, g = /* @__PURE__ */ f(l, [["__scopeId", "data-v-88e7fe2d"]]), v = {
  install(e) {
    e.component("PdfSigner", g);
  }
};
export {
  g as PdfSigner,
  v as default
};
