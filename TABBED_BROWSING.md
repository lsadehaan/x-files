# 🗂️ Tabbed Browsing Feature

The x-files.js library now includes a new **tabbed file browser** component that allows users to open multiple file browsing sessions in tabs within the same interface.

## Features

- ✅ **Multiple tabs**: Open multiple directories in separate tabs
- ✅ **Tab management**: Create, switch, and close tabs
- ✅ **Shared connection**: All tabs use the same WebSocket connection for efficiency
- ✅ **Directory navigation**: Double-click directories to open them in new tabs
- ✅ **Responsive design**: Works well on both desktop and mobile
- ✅ **Theming support**: Supports dark, light, and auto themes
- ✅ **Customizable**: Max tabs limit, initial path, and all original browser properties

## Usage

### Basic HTML Usage

```html
<!DOCTYPE html>
<html>
<head>
    <title>Tabbed File Browser</title>
</head>
<body>
    <!-- Include the UI bundle -->
    <script type="module" src="node_modules/x-files.js/dist/ui/browser-bundle.js"></script>

    <!-- Use the tabbed browser component -->
    <x-files-tabbed-browser
        url="ws://localhost:3000"
        theme="dark"
        max-tabs="8"
        initial-path="/home/user"
        show-hidden="false"
        readonly="false">
    </x-files-tabbed-browser>
</body>
</html>
```

### JavaScript Usage

```javascript
import { XFilesTabbedBrowser } from 'x-files.js/ui';

// Create the component
const tabbedBrowser = document.createElement('x-files-tabbed-browser');
tabbedBrowser.url = 'ws://localhost:3000';
tabbedBrowser.theme = 'dark';
tabbedBrowser.maxTabs = 10;
tabbedBrowser.initialPath = '/home/user';

// Append to DOM
document.body.appendChild(tabbedBrowser);

// Listen for events
tabbedBrowser.addEventListener('navigate', (e) => {
    const { path, tabId } = e.detail;
    console.log(`Navigation in tab ${tabId}: ${path}`);
});

tabbedBrowser.addEventListener('select', (e) => {
    const { file, tabId } = e.detail;
    console.log(`Selected in tab ${tabId}: ${file.name}`);
});

tabbedBrowser.addEventListener('open', (e) => {
    const { file, tabId } = e.detail;
    console.log(`Opened in tab ${tabId}: ${file.name}`);
});
```

### React Usage

```jsx
import React from 'react';
import 'x-files.js/ui';

function App() {
    const handleNavigate = (e) => {
        const { path, tabId } = e.detail;
        console.log(`Navigation in tab ${tabId}: ${path}`);
    };

    return (
        <div style={{ height: '100vh' }}>
            <x-files-tabbed-browser
                url="ws://localhost:3000"
                theme="dark"
                max-tabs={8}
                initial-path="/home/user"
                onNavigate={handleNavigate}
            />
        </div>
    );
}

export default App;
```

## Component Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `url` | `string` | `''` | WebSocket server URL |
| `initialPath` | `string` | `''` | Initial directory path for first tab |
| `showHidden` | `boolean` | `false` | Show hidden files (starting with .) |
| `readonly` | `boolean` | `false` | Disable write operations |
| `theme` | `'dark' \| 'light' \| 'auto'` | `'dark'` | Color theme |
| `maxTabs` | `number` | `10` | Maximum number of tabs allowed |

## Events

### navigate
Fired when a tab navigates to a different directory.

```javascript
tabbedBrowser.addEventListener('navigate', (e) => {
    console.log(e.detail); // { path: '/new/path', tabId: 'tab-1' }
});
```

### select
Fired when a file is selected in a tab.

```javascript
tabbedBrowser.addEventListener('select', (e) => {
    console.log(e.detail); // { file: FileEntry, tabId: 'tab-1' }
});
```

### open
Fired when a file is double-clicked in a tab.

```javascript
tabbedBrowser.addEventListener('open', (e) => {
    console.log(e.detail); // { file: FileEntry, tabId: 'tab-1' }
});
```

## Tab Behavior

- **Creating tabs**: Click the "+" button to create a new tab
- **Switching tabs**: Click on any tab to switch to it
- **Closing tabs**: Click the "×" button on any tab to close it
- **New tab from directory**: Double-click a directory to open it in a new tab
- **Tab titles**: Show the current directory name (last segment of the path)
- **Tab limits**: Configurable maximum number of tabs (default: 10)

## Styling

The tabbed browser inherits all the styling capabilities of the original browser component and adds tab-specific styling:

```css
/* Customize tab appearance */
x-files-tabbed-browser {
    --x-files-bg: #1e1e1e;
    --x-files-bg-hover: #2d2d2d;
    --x-files-bg-selected: #094771;
    --x-files-border: #3c3c3c;
    --x-files-text: #cccccc;
    --x-files-accent: #0078d4;
}

/* Custom tab styling */
x-files-tabbed-browser::part(tab) {
    /* Custom tab styles */
}

x-files-tabbed-browser::part(tab-active) {
    /* Active tab styles */
}
```

## Testing

To test the tabbed browsing feature:

1. **Start the test server**:
   ```bash
   node test-server.js
   ```

2. **Open the test page** in your browser:
   ```
   open test-tabbed-browser.html
   ```

3. **Test the features**:
   - Create new tabs with the "+" button
   - Navigate directories in each tab independently
   - Double-click directories to open them in new tabs
   - Switch between tabs
   - Close tabs with the "×" button
   - Toggle themes and hidden files

## Backwards Compatibility

The new tabbed browser component is completely backwards compatible:

- ✅ Existing `XFilesBrowser` component unchanged
- ✅ All existing APIs and events preserved
- ✅ New component is additive (no breaking changes)
- ✅ Same server setup and WebSocket protocol

## Implementation Details

### Architecture

- **Tab Management**: Each tab maintains its own path and state
- **Shared Connection**: All tabs use one WebSocket client instance
- **Event Forwarding**: Tab events include `tabId` for identification
- **Memory Efficient**: Inactive tabs don't continuously load data

### Component Structure

```
XFilesTabbedBrowser
├── Tab Bar (with create/close buttons)
│   ├── Tab 1 (with title and close button)
│   ├── Tab 2 (with title and close button)
│   └── + New Tab Button
└── Tab Content Area
    ├── XFilesBrowser (Tab 1 content)
    ├── XFilesBrowser (Tab 2 content)
    └── Empty State (when no tabs)
```

### File Structure

- `src/ui/x-files-tabbed-browser.ts` - Main tabbed browser component
- `src/ui/x-files-browser.ts` - Original browser component (unchanged)
- `test-tabbed-browser.html` - Test page
- `test-server.js` - Test server