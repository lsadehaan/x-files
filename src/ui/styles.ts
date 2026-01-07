/**
 * Shared styles and CSS custom properties for x-files components
 */

import { css } from 'lit';

export const sharedStyles = css`
  :host {
    /* Sizing (theme-independent) */
    --xf-font-size: var(--x-files-font-size, 13px);
    --xf-row-height: var(--x-files-row-height, 28px);
    --xf-icon-size: var(--x-files-icon-size, 16px);
    --xf-padding: var(--x-files-padding, 8px);
    --xf-radius: var(--x-files-radius, 4px);

    /* Inherit theme colors from parent, with dark defaults */
    --xf-bg: var(--x-files-bg, #1e1e1e);
    --xf-bg-hover: var(--x-files-bg-hover, #2d2d2d);
    --xf-bg-selected: var(--x-files-bg-selected, #094771);
    --xf-border: var(--x-files-border, #3c3c3c);
    --xf-text: var(--x-files-text, #cccccc);
    --xf-text-muted: var(--x-files-text-muted, #808080);
    --xf-accent: var(--x-files-accent, #0078d4);
    --xf-icon-folder: var(--x-files-icon-folder, #dcb67a);
    --xf-icon-file: var(--x-files-icon-file, #cccccc);
    --xf-danger: var(--x-files-danger, #f44336);

    display: block;
    font-family: var(--x-files-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
    font-size: var(--xf-font-size);
    color: var(--xf-text);
    background: var(--xf-bg);
  }

  * {
    box-sizing: border-box;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
`;

// Theme presets - applied to the main browser component
export const themeStyles = css`
  /* Light theme - sets CSS custom properties that cascade to children */
  :host([theme="light"]) {
    --x-files-bg: #ffffff;
    --x-files-bg-hover: #f3f4f6;
    --x-files-bg-selected: #dbeafe;
    --x-files-border: #e5e7eb;
    --x-files-text: #1f2937;
    --x-files-text-muted: #6b7280;
    --x-files-accent: #2563eb;
    --x-files-icon-folder: #f59e0b;
    --x-files-icon-file: #6b7280;
    --x-files-danger: #dc2626;
  }

  /* Auto theme - follows system preference */
  @media (prefers-color-scheme: light) {
    :host([theme="auto"]) {
      --x-files-bg: #ffffff;
      --x-files-bg-hover: #f3f4f6;
      --x-files-bg-selected: #dbeafe;
      --x-files-border: #e5e7eb;
      --x-files-text: #1f2937;
      --x-files-text-muted: #6b7280;
      --x-files-accent: #2563eb;
      --x-files-icon-folder: #f59e0b;
      --x-files-icon-file: #6b7280;
      --x-files-danger: #dc2626;
    }
  }
`;

export const buttonStyles = css`
  button {
    background: transparent;
    border: 1px solid var(--xf-border);
    color: var(--xf-text);
    padding: 4px 12px;
    border-radius: var(--xf-radius);
    cursor: pointer;
    font-size: var(--xf-font-size);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  button:hover {
    background: var(--xf-bg-hover);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.primary {
    background: var(--xf-accent);
    border-color: var(--xf-accent);
  }

  button.primary:hover {
    opacity: 0.9;
  }
`;

export const inputStyles = css`
  input[type="text"] {
    background: var(--xf-bg);
    border: 1px solid var(--xf-border);
    color: var(--xf-text);
    padding: 4px 8px;
    border-radius: var(--xf-radius);
    font-size: var(--xf-font-size);
    outline: none;
  }

  input[type="text"]:focus {
    border-color: var(--xf-accent);
  }
`;
