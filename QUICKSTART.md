# Quick Start Guide: vue-pdf-signer

This guide provides instructions on how to install, use, and develop the `vue-pdf-signer` component library.

## A. Standard Installation

This is the recommended method for integrating the library into a project for production or CI/CD environments. It installs the library from a specific, stable commit.

1.  **Get the Commit Hash:** Find the full commit hash of the version you want to install from the project's Git history.

2.  **Add to `package.json`:** In your host project (e.g., `exerp-go`), open `package.json` and add the library as a dependency. Replace `<commit-hash>` with the actual hash.

    ```json
    "dependencies": {
      "vue-pdf-signer": "github:exerpteam/vue-pdf-signer#<commit-hash>"
    }
    ```

3.  **Install:** Run your package manager to install the new dependency.
    ```bash
    pnpm install
    ```

## B. Usage Example (Replacing `draw-sign-pdf`)

This example demonstrates how to replace the legacy `draw-sign-pdf` component with `vue-pdf-signer` in a component like `ContractsDisplay.vue`.

1.  **Update `package.json`:**
    Remove the old dependency and add the new one (as described in Section A).

    **Before:**

    ```json
    "draw-sign-pdf": "github:exerpteam/draw-sign-pdf#c4e6a1728925ada203e527185f4a9ceddbdc598b",
    ```

    **After:**

    ```json
    "vue-pdf-signer": "github:exerpteam/vue-pdf-signer#<your-commit-hash>",
    ```

2.  **Update the Vue Component:**
    In `ContractsDisplay.vue` (or its script file), change the import statement and the component tag. The props and event listeners can remain identical.

    **In the `<script>` section (e.g., in `ContractsDisplay.ts`):**

    **Before:**

    ```typescript
    import DrawSignPdf from 'draw-sign-pdf';
    // ...
    @Options({
      components: {
        // ...
        DrawSignPdf,
      },
    // ...
    ```

    **After:**

    ```typescript
    import { PdfSigner } from 'vue-pdf-signer';
    // ...
    @Options({
      components: {
        // ...
        PdfSigner,
      },
    // ...
    ```

    **In the `<template>` section (e.g., in `ContractsDisplay.vue`):**

    **Before:**

    ```html
    <DrawSignPdf
      v-if="document.signable && document.signaturesConfigurationData"
      :pdfData="getPdfData(document)"
      :signatureData="getSignatureData(document)"
      :isDownload="false"
      :translations="pdfTranslation"
      @finish="getSignedData"
      :enableZoom="true"
    />
    ```

    **After:**

    ```html
    <PdfSigner
      v-if="document.signable && document.signaturesConfigurationData"
      :pdfData="getPdfData(document)"
      :signatureData="getSignatureData(document)"
      :translations="pdfTranslation"
      @finish="getSignedData"
    />
    ```

## C. Local Development Workflow (Advanced)

This workflow is ideal when you need to actively develop `vue-pdf-signer` and see the changes reflected live inside a consuming application like `exerp-go`, without committing and reinstalling each time.

This process uses `pnpm link` to create a symbolic link.

1.  **Clone Both Repositories:**
    Ensure you have both `vue-pdf-signer` and `exerp-go` cloned locally in the same parent directory.

    ```
    /development
    ├──/vue-pdf-signer
    └──/exerp-go
    ```

2.  **Build the Library:**
    In the `vue-pdf-signer` directory, run the build command. The link will point to the built files in the `/dist` folder.

    ```bash
    cd ../vue-pdf-signer
    pnpm build
    ```

3.  **Create the Link:**
    Still in the `vue-pdf-signer` directory, create a global link to the package.

    ```bash
    pnpm link --global
    ```

4.  **Use the Link:**
    Navigate to the `exerp-go` directory and link it to the global `vue-pdf-signer` package.

    ```bash
    cd ../exerp-go/frontend
    yarn link --global vue-pdf-signer
    ```

5.  **Run the Host App:**
    Start the `exerp-go` development server. It will now use your local `vue-pdf-signer` build.

    ```bash
    yarn serve
    ```

6.  **Rebuild on Changes:**
    After making changes in `vue-pdf-signer`, you must **re-run `pnpm build`** in its directory. Vite's HMR in `exerp-go` should then automatically pick up the changes and refresh the browser.
