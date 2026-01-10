/**
 * Tabbed file browser component
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { sharedStyles, buttonStyles, themeStyles } from './styles.js';
import { XFilesClient } from '../client/client.js';
import type { FileEntry, ServerConfig } from '../shared/types.js';
import './x-files-browser.js';

interface Tab {
  id: string;
  title: string;
  path: string;
  active: boolean;
  client?: XFilesClient;
  files: FileEntry[];
  selectedFile: FileEntry | null;
  loading: boolean;
  error: string | null;
}

@customElement('x-files-tabbed-browser')
export class XFilesTabbedBrowser extends LitElement {
  static override styles = [
    sharedStyles,
    themeStyles,
    buttonStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 300px;
        border: 1px solid var(--xf-border);
        border-radius: var(--xf-radius);
        overflow: hidden;
        background: var(--xf-bg);
      }

      /* Tab bar */
      .tab-bar {
        display: flex;
        align-items: center;
        background: var(--xf-bg);
        border-bottom: 1px solid var(--xf-border);
        overflow-x: auto;
        min-height: 40px;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-right: 1px solid var(--xf-border);
        cursor: pointer;
        background: var(--xf-bg);
        color: var(--xf-text-muted);
        white-space: nowrap;
        min-width: 100px;
        max-width: 200px;
        position: relative;
        transition: all 0.2s ease;
        user-select: none;
      }

      .tab:hover {
        background: var(--xf-bg-hover);
        color: var(--xf-text);
      }

      .tab.active {
        background: var(--xf-bg-selected);
        color: var(--xf-text);
        border-bottom: 2px solid var(--xf-accent);
      }

      .tab-title {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 12px;
        font-weight: 500;
      }

      .tab-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        cursor: pointer;
        opacity: 0.6;
        font-size: 12px;
        line-height: 1;
        transition: all 0.2s ease;
      }

      .tab-close:hover {
        opacity: 1;
        background: var(--xf-bg-hover);
      }

      .new-tab-button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin: 4px;
        border: 1px solid var(--xf-border);
        border-radius: var(--xf-radius);
        cursor: pointer;
        background: transparent;
        color: var(--xf-text-muted);
        font-size: 16px;
        transition: all 0.2s ease;
      }

      .new-tab-button:hover {
        background: var(--xf-bg-hover);
        color: var(--xf-text);
        border-color: var(--xf-accent);
      }

      /* Tab content */
      .tab-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .tab-panel {
        flex: 1;
        display: none;
        flex-direction: column;
        height: 100%;
      }

      .tab-panel.active {
        display: flex;
      }

      /* Individual browser styling */
      x-files-browser {
        border: none;
        border-radius: 0;
        height: 100%;
      }

      /* Empty state */
      .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: var(--xf-text-muted);
        padding: 40px;
        text-align: center;
        gap: 16px;
      }

      .empty-state-title {
        font-size: 18px;
        font-weight: 500;
      }

      .empty-state-description {
        font-size: 14px;
        opacity: 0.8;
      }

      /* Responsive */
      @media (max-width: 600px) {
        .tab {
          min-width: 80px;
          max-width: 120px;
          padding: 8px 12px;
        }

        .tab-title {
          font-size: 11px;
        }

        .new-tab-button {
          width: 28px;
          height: 28px;
          font-size: 14px;
        }
      }
    `,
  ];

  @property({ type: String }) url = '';
  @property({ type: String }) initialPath = '';
  @property({ type: Boolean }) showHidden = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: String, reflect: true }) theme: 'dark' | 'light' | 'auto' = 'dark';
  @property({ type: Number }) maxTabs = 10;

  @state() private tabs: Tab[] = [];
  @state() private activeTabId: string | null = null;
  @state() private client: XFilesClient | null = null;
  @state() private connected = false;
  @state() private serverConfig: ServerConfig | null = null;
  @state() private rootPath = '/';

  private nextTabId = 1;

  override connectedCallback() {
    super.connectedCallback();
    if (this.url) {
      this.connect();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnect();
  }

  async connect() {
    if (!this.url) return;

    try {
      this.client = new XFilesClient({ url: this.url });

      this.client.onConnect(() => {
        this.connected = true;
      });

      this.client.onDisconnect(() => {
        this.connected = false;
      });

      this.client.onError((err) => {
        console.error('Connection error:', err);
      });

      await this.client.connect();

      // Get server config
      const config = await this.client.getServerConfig();
      this.serverConfig = config;

      // Get allowed paths for root
      if (config?.allowedPaths?.length) {
        this.rootPath = config.allowedPaths[0];
      }

      // Create initial tab if none exist
      if (this.tabs.length === 0) {
        await this.createTab(this.initialPath || this.rootPath);
      }
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.connected = false;
    }
  }

  private async createTab(path?: string, title?: string): Promise<void> {
    if (this.tabs.length >= this.maxTabs) {
      return;
    }

    const tabPath = path || this.rootPath;
    const tabTitle = title || this.getPathTitle(tabPath);
    const tabId = `tab-${this.nextTabId++}`;

    const newTab: Tab = {
      id: tabId,
      title: tabTitle,
      path: tabPath,
      active: true,
      files: [],
      selectedFile: null,
      loading: false,
      error: null,
    };

    // Deactivate other tabs
    this.tabs = this.tabs.map(tab => ({ ...tab, active: false }));

    // Add new tab
    this.tabs = [...this.tabs, newTab];
    this.activeTabId = tabId;

    this.requestUpdate();
  }

  private closeTab(tabId: string): void {
    const tabIndex = this.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    const wasActive = this.tabs[tabIndex].active;
    this.tabs = this.tabs.filter(tab => tab.id !== tabId);

    // If we closed the active tab, activate another one
    if (wasActive && this.tabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
      this.switchToTab(this.tabs[newActiveIndex].id);
    } else if (this.tabs.length === 0) {
      this.activeTabId = null;
    }

    this.requestUpdate();
  }

  private switchToTab(tabId: string): void {
    this.tabs = this.tabs.map(tab => ({
      ...tab,
      active: tab.id === tabId,
    }));
    this.activeTabId = tabId;
    this.requestUpdate();
  }

  private getPathTitle(path: string): string {
    if (!path || path === '/') return 'Root';
    const segments = path.split('/').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : 'Root';
  }

  private handleTabNavigate(e: CustomEvent, tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      const newPath = e.detail.path;
      const newTitle = this.getPathTitle(newPath);

      // Update tab
      this.tabs = this.tabs.map(t =>
        t.id === tabId
          ? { ...t, path: newPath, title: newTitle }
          : t
      );
      this.requestUpdate();
    }

    // Forward the event
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { ...e.detail, tabId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleTabSelect(e: CustomEvent, tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      this.tabs = this.tabs.map(t =>
        t.id === tabId
          ? { ...t, selectedFile: e.detail.file }
          : t
      );
      this.requestUpdate();
    }

    // Forward the event
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: { ...e.detail, tabId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleTabOpen(e: CustomEvent, tabId: string): void {
    const file: FileEntry = e.detail.file;

    // If it's a directory, create a new tab or navigate current tab
    if (file.isDirectory) {
      // Create new tab for directory
      this.createTab(file.path, this.getPathTitle(file.path));
    }

    // Forward the event
    this.dispatchEvent(
      new CustomEvent('open', {
        detail: { ...e.detail, tabId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private getActiveTab(): Tab | null {
    return this.tabs.find(tab => tab.active) || null;
  }

  override render() {
    return html`
      <div class="tab-bar">
        ${this.tabs.map(tab => html`
          <div
            class="tab ${tab.active ? 'active' : ''}"
            @click=${() => this.switchToTab(tab.id)}
            title="${tab.path}"
          >
            <span class="tab-title">${tab.title}</span>
            <span
              class="tab-close"
              @click=${(e: Event) => {
                e.stopPropagation();
                this.closeTab(tab.id);
              }}
              title="Close tab"
            >×</span>
          </div>
        `)}
        ${this.tabs.length < this.maxTabs ? html`
          <button
            class="new-tab-button"
            @click=${() => this.createTab()}
            title="New tab"
          >+</button>
        ` : nothing}
      </div>

      <div class="tab-content">
        ${this.tabs.length === 0 ? html`
          <div class="empty-state">
            <div class="empty-state-title">📁 No Tabs Open</div>
            <div class="empty-state-description">
              Click the + button to create a new tab
            </div>
          </div>
        ` : this.tabs.map(tab => html`
          <div class="tab-panel ${tab.active ? 'active' : ''}">
            <x-files-browser
              .url=${this.url}
              .path=${tab.path}
              .showHidden=${this.showHidden}
              .readonly=${this.readonly}
              .theme=${this.theme}
              @navigate=${(e: CustomEvent) => this.handleTabNavigate(e, tab.id)}
              @select=${(e: CustomEvent) => this.handleTabSelect(e, tab.id)}
              @open=${(e: CustomEvent) => this.handleTabOpen(e, tab.id)}
            ></x-files-browser>
          </div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'x-files-tabbed-browser': XFilesTabbedBrowser;
  }
}