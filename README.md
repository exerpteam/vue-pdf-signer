# Vue PDF Signer

A robust, reusable Vue 3 component for displaying a PDF and overlaying a user-drawn signature. Built with TypeScript and Vite.

## Status

**In Development.** The component's API is defined, but the core PDF rendering and signature functionality is currently a placeholder.

## Features (Target)

- **PDF Loading:** Renders a multi-page PDF provided as a base64 encoded string.
- **Signature Capture:** Provides a dedicated interface for drawing a signature.
- **Signature Placement:** Overlays the captured signature onto predefined locations in the PDF.
- **Vector-Based Export:** Generates the final signed PDF with the signature embedded as a high-quality vector graphic.
- **Responsive & Touch-Friendly:** Supports zoom, pan, and scroll gestures on both desktop and mobile.

## Local Development

This project includes a self-contained demo application for local development.

1.  **Install Dependencies:**

    ```bash
    pnpm install
    ```

2.  **Run the Demo App:**
    This command starts the Vite development server and opens the demo app, which imports the library components directly from the `src/lib` folder.

    ```bash
    pnpm dev
    ```

3.  **Make Changes:**
    Modify the component source code in `src/lib/components/`. The demo app will hot-reload to reflect your changes instantly.

## Building the Library

To build the distributable library files, run the following command. The output will be generated in the `/dist` directory.

```bash
pnpm build
```

## Installation and Usage

For instructions on how to install and use this library in a consuming application (like `exerp-go`), please see the **[Quick Start Guide](./QUICKSTART.md)**.
