/**
 * Main file browser component
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles, buttonStyles, inputStyles } from './styles.js';
import { XFilesClient } from '../client/client.js';
import type { FileEntry, ServerConfig } from '../shared/types.js';
import './x-files-icon.js';
import './x-files-breadcrumb.js';

@customElement('x-files-browser')
export class XFilesBrowser extends LitElement {
  static override styles = [
    sharedStyles,
    buttonStyles,
    inputStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 300px;
        border: 1px solid var(--xf-border);
        border-radius: var(--xf-radius);
        overflow: hidden;
      }

      /* Toolbar */
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: var(--xf-padding);
        border-bottom: 1px solid var(--xf-border);
        background: var(--xf-bg);
      }

      .toolbar-spacer {
        flex: 1;
      }

      /* File list */
      .file-list {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .file-item {
        display: flex;
        align-items: center;
        padding: 0 var(--xf-padding);
        height: var(--xf-row-height);
        cursor: pointer;
        gap: 8px;
        border-bottom: 1px solid transparent;
      }

      .file-item:hover {
        background: var(--xf-bg-hover);
      }

      .file-item.selected {
        background: var(--xf-bg-selected);
      }

      .file-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .file-size {
        color: var(--xf-text-muted);
        font-size: 12px;
        min-width: 70px;
        text-align: right;
      }

      .file-date {
        color: var(--xf-text-muted);
        font-size: 12px;
        min-width: 140px;
        text-align: right;
      }

      /* Status bar */
      .status-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px var(--xf-padding);
        border-top: 1px solid var(--xf-border);
        font-size: 12px;
        color: var(--xf-text-muted);
        background: var(--xf-bg);
      }

      /* Loading & Error states */
      .loading, .error, .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--xf-text-muted);
        padding: 40px;
        text-align: center;
      }

      .error {
        color: #f44336;
      }

      .loading-spinner {
        animation: spin 1s linear infinite;
        margin-right: 8px;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Context menu */
      .context-menu {
        position: fixed;
        background: var(--xf-bg);
        border: 1px solid var(--xf-border);
        border-radius: var(--xf-radius);
        padding: 4px 0;
        min-width: 160px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
      }

      .context-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
        font-size: var(--xf-font-size);
      }

      .context-menu-item:hover {
        background: var(--xf-bg-hover);
      }

      .context-menu-item.danger {
        color: #f44336;
      }

      .context-menu-divider {
        height: 1px;
        background: var(--xf-border);
        margin: 4px 0;
      }

      /* Rename input */
      .rename-input {
        flex: 1;
        height: 22px;
      }

      /* Hidden file styling */
      .file-item.hidden-file {
        opacity: 0.6;
      }
    `,
  ];

  @property({ type: String }) url = '';
  @property({ type: String }) path = '';
  @property({ type: Boolean }) showHidden = false;
  @property({ type: Boolean }) readonly = false;

  @state() private client: XFilesClient | null = null;
  @state() private files: FileEntry[] = [];
  @state() private loading = false;
  @state() private error: string | null = null;
  @state() private connected = false;
  @state() private selectedFile: FileEntry | null = null;
  @state() private contextMenu: { x: number; y: number; file: FileEntry } | null = null;
  @state() private renaming: FileEntry | null = null;
  @state() private rootPath = '/';
  @state() private serverConfig: ServerConfig | null = null;

  override connectedCallback() {
    super.connectedCallback();
    if (this.url) {
      this.connect();
    }

    // Close context menu on outside click
    document.addEventListener('click', this.handleDocumentClick);
    document.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnect();
    document.removeEventListener('click', this.handleDocumentClick);
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleDocumentClick = () => {
    this.contextMenu = null;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.contextMenu = null;
      this.renaming = null;
    }
  };

  async connect() {
    if (!this.url) return;

    this.loading = true;
    this.error = null;

    try {
      this.client = new XFilesClient({ url: this.url });

      this.client.onConnect(() => {
        this.connected = true;
      });

      this.client.onDisconnect(() => {
        this.connected = false;
      });

      this.client.onError((err) => {
        this.error = err.message;
      });

      await this.client.connect();

      // Get server config
      const config = await this.client.getServerConfig();
      this.serverConfig = config;

      // Get allowed paths for root
      if (config?.allowedPaths?.length) {
        this.rootPath = config.allowedPaths[0];
        if (!this.path) {
          this.path = this.rootPath;
        }
      }

      // Load directory after path is set
      await this.loadDirectory();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Connection failed';
      this.loading = false;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.connected = false;
    }
  }

  private async loadDirectory() {
    if (!this.client || !this.path) return;

    this.loading = true;
    this.error = null;
    this.selectedFile = null;

    try {
      const files = await this.client.listDirectory(this.path);

      // Sort: folders first, then alphabetically
      this.files = files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // Filter hidden files if needed
      if (!this.showHidden) {
        this.files = this.files.filter((f) => !f.name.startsWith('.'));
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load directory';
    } finally {
      this.loading = false;
    }
  }

  private navigateTo(path: string) {
    this.path = path;
    this.loadDirectory();
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { path },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleFileClick(file: FileEntry) {
    this.selectedFile = file;
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: { file },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleFileDoubleClick(file: FileEntry) {
    if (file.isDirectory) {
      this.navigateTo(file.path);
    } else {
      this.dispatchEvent(
        new CustomEvent('open', {
          detail: { file },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private handleContextMenu(e: MouseEvent, file: FileEntry) {
    if (this.readonly) return;

    e.preventDefault();
    e.stopPropagation();

    this.selectedFile = file;
    this.contextMenu = { x: e.clientX, y: e.clientY, file };
  }

  private async handleRefresh() {
    await this.loadDirectory();
  }

  private handleNavigateUp() {
    if (this.path === this.rootPath || this.path === '/') return;

    const parentPath = this.path.split('/').slice(0, -1).join('/') || '/';
    // Handle Windows paths
    if (parentPath.length === 2 && parentPath.endsWith(':')) {
      this.navigateTo(parentPath + '/');
    } else {
      this.navigateTo(parentPath);
    }
  }

  private async handleNewFolder() {
    if (!this.client || !this.serverConfig?.allowWrite) return;

    const name = prompt('New folder name:');
    if (!name) return;

    try {
      const newPath = this.path === '/' ? `/${name}` : `${this.path}/${name}`;
      await this.client.createDirectory(newPath);
      await this.loadDirectory();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to create folder';
    }
  }

  private startRename(file: FileEntry) {
    this.renaming = file;
    this.contextMenu = null;
  }

  private async handleRename(e: KeyboardEvent, file: FileEntry) {
    if (e.key !== 'Enter') return;

    const input = e.target as HTMLInputElement;
    const newName = input.value.trim();

    if (!newName || newName === file.name || !this.client) {
      this.renaming = null;
      return;
    }

    try {
      const newPath = file.path.replace(/[^/\\]+$/, newName);
      await this.client.rename(file.path, newPath);
      await this.loadDirectory();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to rename';
    }

    this.renaming = null;
  }

  private async handleDelete(file: FileEntry) {
    if (!this.client || !this.serverConfig?.allowDelete) return;

    const confirmed = confirm(`Delete "${file.name}"?`);
    if (!confirmed) return;

    try {
      await this.client.deleteItem(file.path);
      await this.loadDirectory();
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to delete';
    }

    this.contextMenu = null;
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  override render() {
    return html`
      <x-files-breadcrumb
        .path=${this.path}
        .rootPath=${this.rootPath}
        @navigate=${(e: CustomEvent) => this.navigateTo(e.detail.path)}
      ></x-files-breadcrumb>

      <div class="toolbar">
        <button @click=${this.handleNavigateUp} title="Go up">
          ⬆️ Up
        </button>
        <button @click=${this.handleRefresh} title="Refresh">
          🔄 Refresh
        </button>
        ${!this.readonly && this.serverConfig?.allowWrite
          ? html`
              <button @click=${this.handleNewFolder} title="New folder">
                📁 New Folder
              </button>
            `
          : nothing}
        <span class="toolbar-spacer"></span>
        <button @click=${() => (this.showHidden = !this.showHidden)}>
          ${this.showHidden ? '👁️ Hide Hidden' : '👁️ Show Hidden'}
        </button>
      </div>

      <div class="file-list">
        ${this.loading
          ? html`
              <div class="loading">
                <span class="loading-spinner">⏳</span> Loading...
              </div>
            `
          : this.error
          ? html`<div class="error">❌ ${this.error}</div>`
          : this.files.length === 0
          ? html`<div class="empty">📂 Empty folder</div>`
          : this.files.map(
              (file) => html`
                <div
                  class="file-item ${this.selectedFile === file ? 'selected' : ''} ${file.name.startsWith('.') ? 'hidden-file' : ''}"
                  @click=${() => this.handleFileClick(file)}
                  @dblclick=${() => this.handleFileDoubleClick(file)}
                  @contextmenu=${(e: MouseEvent) => this.handleContextMenu(e, file)}
                >
                  <x-files-icon
                    .name=${file.name}
                    .isDirectory=${file.isDirectory}
                  ></x-files-icon>
                  ${this.renaming === file
                    ? html`
                        <input
                          class="rename-input"
                          type="text"
                          .value=${file.name}
                          @keydown=${(e: KeyboardEvent) => this.handleRename(e, file)}
                          @blur=${() => (this.renaming = null)}
                          autofocus
                        />
                      `
                    : html`<span class="file-name">${file.name}</span>`}
                  <span class="file-size">${file.isDirectory ? '-' : this.formatSize(file.size)}</span>
                  <span class="file-date">${this.formatDate(file.modified)}</span>
                </div>
              `
            )}
      </div>

      <div class="status-bar">
        <span>${this.files.length} items</span>
        <span>${this.connected ? '🟢 Connected' : '🔴 Disconnected'}</span>
      </div>

      ${this.contextMenu
        ? html`
            <div
              class="context-menu"
              style="left: ${this.contextMenu.x}px; top: ${this.contextMenu.y}px"
              @click=${(e: Event) => e.stopPropagation()}
            >
              ${this.contextMenu.file.isDirectory
                ? html`
                    <div
                      class="context-menu-item"
                      @click=${() => {
                        this.navigateTo(this.contextMenu!.file.path);
                        this.contextMenu = null;
                      }}
                    >
                      📂 Open
                    </div>
                  `
                : html`
                    <div
                      class="context-menu-item"
                      @click=${() => {
                        this.handleFileDoubleClick(this.contextMenu!.file);
                        this.contextMenu = null;
                      }}
                    >
                      📄 Open
                    </div>
                  `}
              ${this.serverConfig?.allowWrite
                ? html`
                    <div
                      class="context-menu-item"
                      @click=${() => this.startRename(this.contextMenu!.file)}
                    >
                      ✏️ Rename
                    </div>
                  `
                : nothing}
              ${this.serverConfig?.allowDelete
                ? html`
                    <div class="context-menu-divider"></div>
                    <div
                      class="context-menu-item danger"
                      @click=${() => this.handleDelete(this.contextMenu!.file)}
                    >
                      🗑️ Delete
                    </div>
                  `
                : nothing}
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'x-files-browser': XFilesBrowser;
  }
}
