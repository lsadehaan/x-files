/**
 * File/folder icon component with file type detection
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// File extension to icon mapping
const FILE_ICONS: Record<string, string> = {
  // Code
  js: '📜', ts: '📘', jsx: '⚛️', tsx: '⚛️',
  py: '🐍', rb: '💎', go: '🔷', rs: '🦀',
  java: '☕', c: '🔧', cpp: '🔧', h: '📑',
  cs: '🟣', php: '🐘', swift: '🍎', kt: '🟠',

  // Web
  html: '🌐', htm: '🌐', css: '🎨', scss: '🎨', sass: '🎨', less: '🎨',

  // Data
  json: '📋', xml: '📋', yaml: '📋', yml: '📋', toml: '📋',
  csv: '📊', sql: '🗄️',

  // Docs
  md: '📝', txt: '📄', pdf: '📕', doc: '📘', docx: '📘',
  xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙',

  // Images
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🎨',
  ico: '🖼️', webp: '🖼️', bmp: '🖼️',

  // Media
  mp3: '🎵', wav: '🎵', flac: '🎵', ogg: '🎵',
  mp4: '🎬', avi: '🎬', mkv: '🎬', mov: '🎬', webm: '🎬',

  // Archives
  zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',

  // Config
  env: '⚙️', gitignore: '🚫', dockerignore: '🚫',
  dockerfile: '🐳', 'docker-compose': '🐳',

  // Lock files
  lock: '🔒',
};

@customElement('x-files-icon')
export class XFilesIcon extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--x-files-icon-size, 16px);
      height: var(--x-files-icon-size, 16px);
      font-size: calc(var(--x-files-icon-size, 16px) - 2px);
      line-height: 1;
    }

    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .folder {
      color: var(--x-files-icon-folder, #dcb67a);
    }

    .file {
      color: var(--x-files-icon-file, #cccccc);
    }
  `;

  @property({ type: String }) name = '';
  @property({ type: Boolean }) isDirectory = false;

  private getIcon(): string {
    if (this.isDirectory) {
      return '📁';
    }

    const ext = this.name.split('.').pop()?.toLowerCase() || '';
    const baseName = this.name.toLowerCase();

    // Check special filenames
    if (baseName === 'dockerfile') return '🐳';
    if (baseName === '.gitignore') return '🚫';
    if (baseName === '.env' || baseName.startsWith('.env.')) return '⚙️';
    if (baseName === 'package.json') return '📦';
    if (baseName === 'tsconfig.json') return '📘';
    if (baseName === 'readme.md') return '📖';
    if (baseName === 'license') return '📜';

    return FILE_ICONS[ext] || '📄';
  }

  override render() {
    return html`
      <span class="icon ${this.isDirectory ? 'folder' : 'file'}">
        ${this.getIcon()}
      </span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'x-files-icon': XFilesIcon;
  }
}
