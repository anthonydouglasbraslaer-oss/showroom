/**
 * Showroom Viewer
 * A comprehensive code and content viewer for showcasing projects
 * @version 1.0.0
 * @author Anthony Douglas Braslaer
 */

class ShowroomViewer {
  constructor(config = {}) {
    this.config = {
      theme: config.theme || 'dark',
      maxFileSize: config.maxFileSize || 5242880, // 5MB default
      languages: config.languages || this.getDefaultLanguages(),
      highlightCode: config.highlightCode !== false,
      enableSearch: config.enableSearch !== false,
      enablePreview: config.enablePreview !== false,
      containerSelector: config.containerSelector || '#showroom-viewer',
      ...config
    };

    this.state = {
      currentFile: null,
      currentContent: '',
      filteredContent: '',
      searchQuery: '',
      lineNumbers: true,
      selectedLines: [],
      isLoading: false,
      error: null
    };

    this.container = null;
    this.init();
  }

  /**
   * Initialize the viewer
   */
  init() {
    this.container = document.querySelector(this.config.containerSelector);
    if (!this.container) {
      console.error(`Container not found: ${this.config.containerSelector}`);
      return;
    }

    this.setupDOM();
    this.attachEventListeners();
    this.applyTheme();
  }

  /**
   * Setup the DOM structure
   */
  setupDOM() {
    this.container.innerHTML = `
      <div class="showroom-viewer" data-theme="${this.config.theme}">
        <div class="showroom-header">
          <div class="showroom-title">
            <h1>Showroom Viewer</h1>
          </div>
          <div class="showroom-controls">
            <button class="btn btn-theme" id="btn-toggle-theme" title="Toggle theme">
              <span class="icon">🌓</span>
            </button>
            <button class="btn btn-line-numbers" id="btn-toggle-lines" title="Toggle line numbers">
              <span class="icon">123</span>
            </button>
            <button class="btn btn-copy" id="btn-copy-code" title="Copy code">
              <span class="icon">📋</span>
            </button>
          </div>
        </div>

        <div class="showroom-toolbar">
          ${this.config.enableSearch ? `
            <div class="search-box">
              <input 
                type="text" 
                id="search-input" 
                class="search-input" 
                placeholder="Search in code..."
                aria-label="Search code"
              />
              <button class="btn btn-clear-search" id="btn-clear-search" title="Clear search">
                <span class="icon">✕</span>
              </button>
            </div>
          ` : ''}
          
          <div class="file-info">
            <span id="file-name" class="file-name">-</span>
            <span id="file-size" class="file-size">-</span>
            <span id="file-language" class="file-language">-</span>
          </div>
        </div>

        <div class="showroom-editor">
          <div class="editor-wrapper">
            <pre id="code-container" class="code-container"><code id="code-content" class="code-content"></code></pre>
          </div>
        </div>

        <div class="showroom-footer">
          <div class="footer-info">
            <span id="lines-count" class="info-item">Lines: 0</span>
            <span id="chars-count" class="info-item">Characters: 0</span>
          </div>
        </div>

        ${this.config.enablePreview ? `
          <div class="showroom-preview">
            <div class="preview-header">
              <h3>Preview</h3>
              <button class="btn btn-close-preview" id="btn-close-preview">✕</button>
            </div>
            <div id="preview-content" class="preview-content"></div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Theme toggle
    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Line numbers toggle
    const lineBtn = document.getElementById('btn-toggle-lines');
    if (lineBtn) {
      lineBtn.addEventListener('click', () => this.toggleLineNumbers());
    }

    // Copy button
    const copyBtn = document.getElementById('btn-copy-code');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyCode());
    }

    // Search functionality
    if (this.config.enableSearch) {
      const searchInput = document.getElementById('search-input');
      const clearBtn = document.getElementById('btn-clear-search');

      if (searchInput) {
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearSearch());
      }
    }

    // Close preview
    if (this.config.enablePreview) {
      const closePreviewBtn = document.getElementById('btn-close-preview');
      if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => this.closePreview());
      }
    }
  }

  /**
   * Load a file for viewing
   * @param {string|File} source - URL or File object
   * @param {Object} options - Additional options
   */
  async loadFile(source, options = {}) {
    this.state.isLoading = true;
    this.state.error = null;

    try {
      let content, fileName, fileSize;

      if (source instanceof File) {
        // Handle File object
        if (source.size > this.config.maxFileSize) {
          throw new Error(`File size exceeds limit: ${this.formatFileSize(source.size)}`);
        }
        content = await this.readFileContent(source);
        fileName = source.name;
        fileSize = source.size;
      } else if (typeof source === 'string') {
        // Handle URL or raw content
        try {
          const response = await fetch(source);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          content = await response.text();
          fileName = new URL(source).pathname.split('/').pop() || 'file';
          fileSize = new Blob([content]).size;
        } catch {
          // Assume it's raw content
          content = source;
          fileName = options.fileName || 'file.txt';
          fileSize = new Blob([content]).size;
        }
      }

      // Detect language
      const language = options.language || this.detectLanguage(fileName);
      
      // Update state
      this.state.currentFile = fileName;
      this.state.currentContent = content;
      this.state.filteredContent = content;
      this.state.isLoading = false;

      // Render content
      this.renderContent(content, language, fileName, fileSize);

    } catch (error) {
      this.state.error = error.message;
      this.state.isLoading = false;
      this.showError(error.message);
    }
  }

  /**
   * Render content in the viewer
   */
  renderContent(content, language, fileName, fileSize) {
    const codeContainer = document.getElementById('code-content');
    if (!codeContainer) return;

    let highlightedCode = content;

    // Apply syntax highlighting if enabled
    if (this.config.highlightCode && window.hljs) {
      try {
        highlightedCode = window.hljs.highlight(content, { language }).value;
      } catch {
        highlightedCode = this.escapeHtml(content);
      }
    } else {
      highlightedCode = this.escapeHtml(content);
    }

    codeContainer.innerHTML = highlightedCode;

    // Add line numbers if enabled
    if (this.state.lineNumbers) {
      this.addLineNumbers(codeContainer);
    }

    // Update file info
    this.updateFileInfo(fileName, fileSize, language);
    this.updateStats(content);

    // Apply theme
    this.applyTheme();
  }

  /**
   * Add line numbers to code
   */
  addLineNumbers(codeElement) {
    const lines = codeElement.textContent.split('\n');
    const lineNumbers = document.createElement('div');
    lineNumbers.className = 'line-numbers';

    lines.forEach((_, index) => {
      const lineNum = document.createElement('span');
      lineNum.className = 'line-number';
      lineNum.textContent = index + 1;
      lineNum.dataset.line = index + 1;
      lineNumbers.appendChild(lineNum);
    });

    const preElement = codeElement.parentElement;
    if (preElement && preElement.classList.contains('code-container')) {
      const existingNumbers = preElement.querySelector('.line-numbers');
      if (existingNumbers) existingNumbers.remove();
      preElement.insertBefore(lineNumbers, codeElement);
    }
  }

  /**
   * Handle search in code
   */
  handleSearch(query) {
    this.state.searchQuery = query;

    if (!query) {
      this.clearSearch();
      return;
    }

    const regex = new RegExp(this.escapeRegex(query), 'gi');
    const highlightedContent = this.state.currentContent.replace(
      regex,
      (match) => `<mark class="search-highlight">${match}</mark>`
    );

    this.state.filteredContent = highlightedContent;
    this.updateHighlights();
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.state.searchQuery = '';
    this.state.filteredContent = this.state.currentContent;
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    this.updateHighlights();
  }

  /**
   * Update highlights after search
   */
  updateHighlights() {
    const codeContent = document.getElementById('code-content');
    if (!codeContent) return;

    let content = this.state.filteredContent;
    if (!this.state.searchQuery) {
      content = this.escapeHtml(this.state.currentContent);
    }

    codeContent.innerHTML = content;

    if (this.state.lineNumbers) {
      this.addLineNumbers(codeContent);
    }
  }

  /**
   * Handle search keyboard shortcuts
   */
  handleSearchKeydown(e) {
    if (e.key === 'Escape') {
      this.clearSearch();
    } else if (e.key === 'Enter') {
      e.preventDefault();
    }
  }

  /**
   * Toggle theme
   */
  toggleTheme() {
    this.config.theme = this.config.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
  }

  /**
   * Apply theme
   */
  applyTheme() {
    const viewer = this.container.querySelector('.showroom-viewer');
    if (viewer) {
      viewer.setAttribute('data-theme', this.config.theme);
      document.documentElement.setAttribute('data-viewer-theme', this.config.theme);
    }
  }

  /**
   * Toggle line numbers
   */
  toggleLineNumbers() {
    this.state.lineNumbers = !this.state.lineNumbers;
    const codeContent = document.getElementById('code-content');
    if (codeContent) {
      if (this.state.lineNumbers) {
        this.addLineNumbers(codeContent);
      } else {
        const lineNumbers = this.container.querySelector('.line-numbers');
        if (lineNumbers) lineNumbers.remove();
      }
    }
  }

  /**
   * Copy code to clipboard
   */
  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.state.currentContent);
      this.showNotification('Code copied to clipboard!', 'success');
    } catch (error) {
      this.showNotification('Failed to copy code', 'error');
    }
  }

  /**
   * Update file information
   */
  updateFileInfo(fileName, fileSize, language) {
    const fileNameEl = document.getElementById('file-name');
    const fileSizeEl = document.getElementById('file-size');
    const fileLanguageEl = document.getElementById('file-language');

    if (fileNameEl) fileNameEl.textContent = fileName;
    if (fileSizeEl) fileSizeEl.textContent = `${this.formatFileSize(fileSize)}`;
    if (fileLanguageEl) fileLanguageEl.textContent = language || 'text';
  }

  /**
   * Update statistics
   */
  updateStats(content) {
    const linesCount = content.split('\n').length;
    const charsCount = content.length;

    const linesEl = document.getElementById('lines-count');
    const charsEl = document.getElementById('chars-count');

    if (linesEl) linesEl.textContent = `Lines: ${linesCount}`;
    if (charsEl) charsEl.textContent = `Characters: ${charsCount}`;
  }

  /**
   * Detect file language
   */
  detectLanguage(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'm': 'objectivec',
      'html': 'html',
      'xml': 'xml',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'ini',
      'conf': 'conf',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'zsh',
      'fish': 'fish',
      'ps1': 'powershell',
      'md': 'markdown',
      'markdown': 'markdown',
      'tex': 'latex',
      'dockerfile': 'docker',
      'makefile': 'makefile',
      'gitignore': 'text'
    };

    return languageMap[ext] || ext;
  }

  /**
   * Get default language configurations
   */
  getDefaultLanguages() {
    return ['javascript', 'typescript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'yaml', 'markdown'];
  }

  /**
   * Read file content
   */
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escape regex special characters
   */
  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    
    this.container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Close preview
   */
  closePreview() {
    const preview = this.container.querySelector('.showroom-preview');
    if (preview) {
      preview.style.display = 'none';
    }
  }

  /**
   * Open preview
   */
  openPreview(content) {
    const preview = document.getElementById('preview-content');
    if (preview) {
      preview.innerHTML = content;
      this.container.querySelector('.showroom-preview').style.display = 'block';
    }
  }

  /**
   * Destroy the viewer
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShowroomViewer;
}

// Auto-initialize if data attribute is present
document.addEventListener('DOMContentLoaded', () => {
  const viewers = document.querySelectorAll('[data-showroom-viewer]');
  viewers.forEach((element) => {
    const config = {
      containerSelector: `#${element.id || 'showroom-viewer'}`
    };
    new ShowroomViewer(config);
  });
});
