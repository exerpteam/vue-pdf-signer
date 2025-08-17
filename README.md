# Vue PDF Signer

A robust, reusable Vue 3 component for displaying and signing multiple PDF documents, with each document receiving its own unique signature. Built with TypeScript and Vite.

## Status

**Stable.** The component is feature-complete and implements all requirements from the initial specification. It is ready for integration and testing.

## Features

- **Multi-Document Management:** Displays a list of PDF documents and allows the user to switch between them.
- **Per-Document Signature Capture:** Each document gets its own unique, user-drawn signature.
- **PDF Loading & Rendering:** Renders multi-page PDFs provided as a base64 encoded string using `pdf.js`.
- **Vector-Based Signature Placement:** Overlays the captured signature onto one or more predefined locations. The signature is embedded as a true vector graphic using `pdf-lib`, ensuring crisp quality at any zoom level.
- **Pan & Zoom:** Supports interactive panning and zooming of the PDF document via mouse, trackpad, and touch gestures (e.g., pinch-to-zoom).
- **Simple API:** Accepts a single `documents` prop, making integration straightforward.
- **Customizable UI:** All user-facing text can be customized via a `translations` prop.
- **Responsive & Touch-Friendly:** Designed for a seamless experience on both desktop and mobile browsers.

## Component API

**Important Integration Note:** This component manages its own state, including unsaved signatures. It is designed to control its own dismissal via the `finish` and `cancel` events. The host application **should not** wrap this component in a dialog with an external close button (e.g., an 'X' icon) that would unmount the component without user interaction from within `PdfSigner`. Doing so could lead to data loss. Instead, listen for the `finish` and `cancel` events to programmatically close the container or view that holds the `PdfSigner` component.

### Props

| Prop                  | Type             | Required | Default | Description                                                                                                                        |
| --------------------- | ---------------- | :------: | :-----: | ---------------------------------------------------------------------------------------------------------------------------------- |
| `documents`           | `PdfDocument[]`  |   Yes    |    -    | An array of document objects to be signed. See structure below.                                                                    |
| `signingPolicy`       | `'all' \| 'any'` |    No    | `'all'` | Determines the condition for enabling the save button. `'all'`: all required docs must be signed. `'any'`: save is always enabled. |
| `translations`        | `Object`         |    No    |  `{}`   | An object to override the default UI text (e.g., `{ save: 'Confirm & Save' }`). See keys below.                                    |
| `debug`               | `boolean`        |    No    | `false` | Enables verbose console logging for development purposes.                                                                          |
| `showSignatureBounds` | `boolean`        |    No    | `false` | Displays a dashed border around signature placement areas, useful for debugging layout.                                            |

### Events

| Event    | Payload         | Description                                                                                                                                               |
| -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `finish` | `FinishPayload` | Emitted when the user saves. The payload is a map of document keys to their corresponding signature results.                                              |
| `cancel` | `undefined`     | Emitted when the user clicks the cancel button. If there are unsaved signatures, the user will be prompted for confirmation before this event is emitted. |

### Type Definitions

**`PdfDocument` (for the `documents` prop):**

```typescript
interface PdfDocument {
  key: string // A unique identifier for the document.
  name?: string
  data: string // The PDF document as a base64 string.
  placements: SignaturePlacement[]
  signed?: boolean // Indicates if the document is already considered signed.
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
// A map where each key is a document's `key` and the value is its result.
type FinishPayload = Record<string, SignatureResult>

interface SignatureResult {
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

| Key               | Default Value                                                                  | Description                                                            |
| ----------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `updateSignature` | "Change Signature"                                                             | Text for the action button when a document can be signed or re-signed. |
| `drawSignature`   | "Sign Document"                                                                | Text for the action button when a document has not yet been signed.    |
| `save`            | "Save"                                                                         | Text for the save button.                                              |
| `saving`          | "Saving..."                                                                    | Text for the save button while the document is being processed.        |
| `modalTitle`      | "Draw Signature"                                                               | The title of the signature drawing modal.                              |
| `modalSubtitle`   | "Use your mouse or finger to draw your signature below."                       | The instructional text below the title in the signature modal.         |
| `modalCancel`     | "Cancel"                                                                       | Text for the cancel button in the signature modal.                     |
| `modalClear`      | "Clear"                                                                        | Text for the button that clears the signature canvas.                  |
| `modalDone`       | "Done"                                                                         | Text for the button that confirms the signature drawing.               |
| `cancel`          | "Cancel"                                                                       | Text for the cancel button in the main toolbar.                        |
| `cancelWarning`   | "You have unsigned changes. Are you sure you want to discard them and cancel?" | The confirmation message shown when canceling with unsaved signatures. |

### Theming (Customization)

The component's visual appearance can be customized by overriding its CSS Custom Properties (variables). To apply a custom theme, define new values for these variables in your own stylesheet, targeting the `.vue-pdf-signer` class.

**Example:**

```css
/* In your host application's stylesheet */
.vue-pdf-signer {
  --vps-primary-bg-color: #d9534f;
  --vps-primary-text-color: #ffffff;
  --vps-primary-border-color: #d43f3a;
  --vps-primary-bg-hover-color: #c9302c;

  --vps-font-family: 'Georgia', serif;
}
```

**Available Variables:**

| Variable                         | Default Value                      | Description                                   |
| -------------------------------- | ---------------------------------- | --------------------------------------------- |
| `--vps-font-family`              | `system-ui`, `-apple-system`, etc. | The font used throughout the component.       |
| `--vps-border-color`             | `#e0e0e0`                          | The main component border color.              |
| `--vps-bg-color`                 | `#f5f5f5`                          | The background color of the PDF viewing area. |
| `--vps-header-bg-color`          | `#ffffff`                          | The background color of the top toolbar.      |
| **Primary Button**               |                                    | (e.g., Save, active document tab)             |
| `--vps-primary-bg-color`         | `#007aff`                          | Background color.                             |
| `--vps-primary-text-color`       | `white`                            | Text color.                                   |
| `--vps-primary-border-color`     | `#007aff`                          | Border color.                                 |
| `--vps-primary-bg-hover-color`   | `#005ecb`                          | Background color on hover.                    |
| **Secondary Button**             |                                    | (e.g., Sign Document)                         |
| `--vps-secondary-bg-color`       | `#6c757d`                          | Background color.                             |
| `--vps-secondary-text-color`     | `white`                            | Text color.                                   |
| `--vps-secondary-border-color`   | `#6c757d`                          | Border color.                                 |
| `--vps-secondary-bg-hover-color` | `#5a6268`                          | Background color on hover.                    |
| **Standard Button**              |                                    | (e.g., Cancel)                                |
| `--vps-btn-bg-color`             | `#fff`                             | Background color.                             |
| `--vps-btn-text-color`           | `#333`                             | Text color.                                   |
| `--vps-btn-border-color`         | `#ccc`                             | Border color.                                 |
| `--vps-btn-bg-hover-color`       | `#f8f8f8`                          | Background color on hover.                    |
| `--vps-btn-border-hover-color`   | `#999`                             | Border color on hover.                        |
| **Disabled State**               |                                    |                                               |
| `--vps-disabled-bg-color`        | `#aeb1b4`                          | Background color for any disabled button.     |
| `--vps-disabled-text-color`      | `#e9ecef`                          | Text color for any disabled button.           |
| `--vps-disabled-border-color`    | `#aeb1b4`                          | Border color for any disabled button.         |

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
