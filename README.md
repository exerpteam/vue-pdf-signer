# Vue PDF Signer

A robust, reusable Vue 3 component for displaying a PDF and overlaying a user-drawn signature. Built with TypeScript and Vite.

## Status

**Stable.** The component is feature-complete and implements all requirements from the initial specification. It is ready for integration and testing.

## Features

- **PDF Loading & Rendering:** Renders multi-page PDFs provided as a base64 encoded string using `pdf.js`.
- **Signature Capture:** Provides a responsive, touch-friendly modal for drawing a signature.
- **Vector-Based Signature Placement:** Overlays the captured signature onto one or more predefined locations. The signature is embedded as a true vector graphic using `pdf-lib`, ensuring crisp quality at any zoom level.
- **Pan & Zoom:** Supports interactive panning and zooming of the PDF document via mouse, trackpad, and touch gestures (e.g., pinch-to-zoom).
- **Simple API:** Accepts a single `document` prop, making integration straightforward.
- **Customizable UI:** All user-facing text can be customized via a `translations` prop.
- **Responsive & Touch-Friendly:** Designed for a seamless experience on both desktop and mobile browsers.

## Component API

### Props

| Prop                  | Type               | Required | Default | Description                                                                                       |
| --------------------- | ------------------ | :------: | :-----: | ------------------------------------------------------------------------------------------------- |
| `document`            | `SignableDocument` |   Yes    |    -    | The core object containing the PDF data and signature placement information. See structure below. |
| `translations`        | `Object`           |    No    |  `{}`   | An object to override the default UI text (e.g., `{ save: 'Confirm & Save' }`). See keys below.   |
| `debug`               | `boolean`          |    No    | `false` | Enables verbose console logging for development purposes.                                         |
| `showSignatureBounds` | `boolean`          |    No    | `false` | Displays a dashed border around signature placement areas, useful for debugging layout.           |

### Events

| Event    | Payload         | Description                                                                      |
| -------- | --------------- | -------------------------------------------------------------------------------- |
| `finish` | `FinishPayload` | Emitted when the user confirms and saves the signed document. See payload below. |

### Type Definitions

**`SignableDocument` (for the `document` prop):**

```typescript
interface SignableDocument {
  name?: string
  data: string // The PDF document as a base64 string.
  placements: SignaturePlacement[]
}

interface SignaturePlacement {
  left: number // Distance from the left edge of the page (cm).
  top: number // Distance from the top edge of the page (cm).
  width: number // The width of the signature box (cm).
  height: number // The height of the signature box (cm).
  page: number // The page number to place the signature on (1-indexed).
}
```

**`FinishPayload` (for the `finish` event):**

```typescript
interface FinishPayload {
  signedDocument: {
    type: 'application/pdf'
    data: string // The signed PDF as a base64 string.
  }
  signatureImage: {
    type: 'image/png'
    data: string // The captured signature as a base64 PNG string.
  }
}
```

### Translations

Provide an object to the `translations` prop with any of the following keys to override the default English text.

| Key               | Default Value                                            | Description                                                        |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| `updateSignature` | "Change Signature"                                       | Text for the main action button after a signature has been drawn.  |
| `drawSignature`   | "Sign Here"                                              | Text for the main action button before a signature has been drawn. |
| `save`            | "Save"                                                   | Text for the save button.                                          |
| `saving`          | "Saving..."                                              | Text for the save button while the document is being processed.    |
| `modalTitle`      | "Draw Signature"                                         | The title of the signature drawing modal.                          |
| `modalSubtitle`   | "Use your mouse or finger to draw your signature below." | The instructional text below the title in the signature modal.     |
| `modalCancel`     | "Cancel"                                                 | Text for the cancel button in the signature modal.                 |
| `modalClear`      | "Clear"                                                  | Text for the button that clears the signature canvas.              |
| `modalDone`       | "Done"                                                   | Text for the button that confirms the signature drawing.           |

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
