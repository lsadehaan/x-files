/**
 * Shared styles and CSS custom properties for x-files components
 */

import { css } from 'lit';

export const sharedStyles = css`
  :host {
    /* Colors */
    --xf-bg: var(--x-files-bg, #1e1e1e);
    --xf-bg-hover: var(--x-files-bg-hover, #2d2d2d);
    --xf-bg-selected: var(--x-files-bg-selected, #094771);
    --xf-border: var(--x-files-border, #3c3c3c);
    --xf-text: var(--x-files-text, #cccccc);
    --xf-text-muted: var(--x-files-text-muted, #808080);
    --xf-accent: var(--x-files-accent, #0078d4);

    /* Icons */
    --xf-icon-folder: var(--x-files-icon-folder, #dcb67a);
    --xf-icon-file: var(--x-files-icon-file, #cccccc);

    /* Sizing */
    --xf-font-size: var(--x-files-font-size, 13px);
    --xf-row-height: var(--x-files-row-height, 28px);
    --xf-icon-size: var(--x-files-icon-size, 16px);
    --xf-padding: var(--x-files-padding, 8px);
    --xf-radius: var(--x-files-radius, 4px);

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
