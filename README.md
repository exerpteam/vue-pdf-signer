# Vue PDF Signer

A robust, reusable Vue 3 component for displaying a PDF and overlaying a user-drawn signature. Built with TypeScript and Vite, it provides a seamless, responsive signing experience on both desktop and mobile devices.

## Features

- **PDF Loading:** Renders multi-page PDFs provided as a base64 encoded string.
- **Responsive & Touch-Friendly:** Supports zoom, pan, and scroll gestures on both desktop and mobile.
- **Signature Capture:** Provides a dedicated, clean interface for drawing a signature.
- **Dynamic Signature Placement:** Overlays the captured signature onto one or more predefined locations within the PDF.
- **Vector-Based Export:** Generates the final signed PDF with the signature embedded as a high-quality vector graphic, ensuring clarity at any zoom level.
- **Customizable UI:** All user-facing text can be customized through a `translations` prop.

## Quick API Reference

### Props

| Prop            | Type            | Required | Description                                                            |
| --------------- | --------------- | :------: | ---------------------------------------------------------------------- |
| `pdfData`       | `String`        |   Yes    | The PDF document, encoded as a base64 string.                          |
| `signatureData` | `Array<Object>` |   Yes    | An array of objects defining the position and size for each signature. |
| `translations`  | `Object`        |    No    | An object for customizing UI text.                                     |

### Events

| Event    | Payload  | Description                                                                    |
| -------- | -------- | ------------------------------------------------------------------------------ |
| `finish` | `Object` | Emitted when the user saves. Contains the signed PDF and signature image data. |

_(For detailed API information, please refer to the specification document.)_

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
