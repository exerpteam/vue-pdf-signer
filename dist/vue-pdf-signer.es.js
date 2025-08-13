import { defineComponent as l, createElementBlock as r, openBlock as d, createElementVNode as a } from "vue";
const p = { class: "vue-pdf-signer-container" }, m = /* @__PURE__ */ l({
  __name: "PdfSigner",
  props: {
    pdfData: {},
    signatureData: {},
    isDownload: { type: Boolean },
    translations: {},
    enableZoom: { type: Boolean }
  },
  emits: ["finish"],
  setup(n, { emit: i }) {
    const t = i;
    function o() {
      console.log("Save button clicked. Emitting a dummy finish event."), t("finish", {
        signedDocument: { type: "application/pdf", data: "dummy-pdf-base64" },
        signatureImage: { type: "image/png", data: "dummy-signature-base64" }
      });
    }
    return (s, e) => (d(), r("div", p, [
      e[0] || (e[0] = a("h2", null, "Vue PDF Signer (Placeholder)", -1)),
      e[1] || (e[1] = a("p", null, "The PDF viewer and signature functionality will be implemented here.", -1)),
      e[2] || (e[2] = a("p", null, "Props like `pdfData` and `signatureData` have been received.", -1)),
      a("button", { onClick: o }, "Simulate Save & Finish")
    ]));
  }
}), u = (n, i) => {
  const t = n.__vccOpts || n;
  for (const [o, s] of i)
    t[o] = s;
  return t;
}, c = /* @__PURE__ */ u(m, [["__scopeId", "data-v-70c58edf"]]), g = {
  install(n) {
    n.component("PdfSigner", c);
  }
};
export {
  c as PdfSigner,
  g as default
};
