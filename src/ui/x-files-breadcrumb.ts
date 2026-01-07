/**
 * Breadcrumb navigation component
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedStyles } from './styles.js';

@customElement('x-files-breadcrumb')
export class XFilesBreadcrumb extends LitElement {
  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        align-items: center;
        padding: var(--xf-padding);
        border-bottom: 1px solid var(--xf-border);
        gap: 4px;
        overflow-x: auto;
        white-space: nowrap;
      }

      .segment {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .path-button {
        background: transparent;
        border: none;
        color: var(--xf-text);
        padding: 4px 8px;
        border-radius: var(--xf-radius);
        cursor: pointer;
        font-size: var(--xf-font-size);
      }

      .path-button:hover {
        background: var(--xf-bg-hover);
        color: var(--xf-accent);
      }

      .path-button.current {
        color: var(--xf-text);
        cursor: default;
      }

      .path-button.current:hover {
        background: transparent;
        color: var(--xf-text);
      }

      .separator {
        color: var(--xf-text-muted);
        font-size: 10px;
      }

      .home-icon {
        font-size: 14px;
      }
    `,
  ];

  @property({ type: String }) path = '/';
  @property({ type: String }) rootPath = '/';

  private getSegments(): { name: string; path: string }[] {
    // Remove rootPath prefix for display
    let displayPath = this.path;
    if (this.rootPath !== '/' && this.path.startsWith(this.rootPath)) {
      displayPath = this.path.slice(this.rootPath.length) || '/';
    }

    const parts = displayPath.split('/').filter(Boolean);
    const segments: { name: string; path: string }[] = [
      { name: '~', path: this.rootPath },
    ];

    let currentPath = this.rootPath;
    for (const part of parts) {
      currentPath = currentPath === '/' ? `/${part}` : `${currentPath}/${part}`;
      // Handle Windows paths
      if (this.rootPath.includes(':') && currentPath.startsWith('/')) {
        currentPath = currentPath.slice(1);
      }
      segments.push({ name: part, path: currentPath });
    }

    return segments;
  }

  private handleClick(path: string) {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { path },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const segments = this.getSegments();

    return html`
      ${segments.map(
        (segment, index) => html`
          <span class="segment">
            ${index > 0 ? html`<span class="separator">›</span>` : ''}
            <button
              class="path-button ${index === segments.length - 1 ? 'current' : ''}"
              @click=${() => index < segments.length - 1 && this.handleClick(segment.path)}
              ?disabled=${index === segments.length - 1}
            >
              ${index === 0 ? html`<span class="home-icon">🏠</span>` : segment.name}
            </button>
          </span>
        `
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'x-files-breadcrumb': XFilesBreadcrumb;
  }
}
