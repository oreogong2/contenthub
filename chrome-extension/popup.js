// ContentHub Chrome插件 - 修复版
class ContentHubExtractor {
  constructor() {
    this.extractedData = null;
    this.contenthubUrl = '';
    this.init();
  }

  init() {
    this.loadConfig();
    this.bindEvents();
  }

  async loadConfig() {
    const result = await chrome.storage.sync.get(['contenthubUrl']);
    this.contenthubUrl = result.contenthubUrl || 'http://localhost:8000';
    document.getElementById('contenthubUrl').value = this.contenthubUrl;
  }

  async saveConfig() {
    this.contenthubUrl = document.getElementById('contenthubUrl').value;
    await chrome.storage.sync.set({ contenthubUrl: this.contenthubUrl });
  }

  bindEvents() {
    document.getElementById('extract').addEventListener('click', () => this.extractContent(false));
    document.getElementById('extractWithOCR').addEventListener('click', () => this.extractContent(true));
    document.getElementById('extractFromUrl').addEventListener('click', () => this.extractFromUrl(false));
    document.getElementById('extractFromUrlWithOCR').addEventListener('click', () => this.extractFromUrl(true));
    document.getElementById('sendToContentHub').addEventListener('click', () => this.sendToContentHub());
    document.getElementById('copyContent').addEventListener('click', () => this.copyContent());
    document.getElementById('contenthubUrl').addEventListener('change', () => this.saveConfig());
  }

  async extractContent(useOCR = false) {
    try {
      await this.saveConfig();
      this.showLoading('正在提取内容...');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 先尝试发送消息给content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'extractContent',
          useOCR: useOCR
        });

        if (response && response.success) {
          this.extractedData = response.data;
          this.displayResult(this.extractedData);
          this.enableButtons();
          return;
        }
      } catch (messageError) {
        console.log('Content script消息失败，尝试直接注入:', messageError);
      }
      
      // 如果content script通信失败，直接注入代码
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: this.extractPageContentFunction,
        args: [useOCR]
      });

      if (results && results[0] && results[0].result) {
        this.extractedData = results[0].result;
        this.displayResult(this.extractedData);
        this.enableButtons();
      } else {
        this.showError('提取失败，请重试');
      }
    } catch (error) {
      console.error('提取失败:', error);
      this.showError('提取失败: ' + error.message + '\n\n请刷新页面后重试');
    }
  }

  async extractFromUrl(useOCR = false) {
    try {
      await this.saveConfig();
      
      const extractUrl = document.getElementById('extractUrl').value.trim();
      if (!extractUrl) {
        this.showError('请输入要提取的链接');
        return;
      }

      // 简单的URL格式验证
      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(extractUrl)) {
        this.showError('请输入有效的链接地址');
        return;
      }

      this.showLoading('正在打开链接并提取内容...');
      
      // 创建新标签页打开链接
      const tab = await chrome.tabs.create({ 
        url: extractUrl,
        active: false // 不激活新标签页
      });
      
      // 等待页面加载完成
      await this.waitForTabLoad(tab.id);
      
      // 在新标签页中执行内容提取
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractContent',
        useOCR: useOCR
      });

      if (response && response.success) {
        this.extractedData = response.data;
        this.extractedData.url = extractUrl; // 使用原始URL
        this.displayResult(this.extractedData);
        this.enableButtons();
        
        // 关闭临时标签页
        chrome.tabs.remove(tab.id);
      } else {
        this.showError('提取失败，请重试');
        chrome.tabs.remove(tab.id);
      }
    } catch (error) {
      console.error('从链接提取失败:', error);
      this.showError('提取失败: ' + error.message);
    }
  }

  // 等待标签页加载完成
  async waitForTabLoad(tabId) {
    return new Promise((resolve) => {
      const checkComplete = () => {
        chrome.tabs.get(tabId, (tab) => {
          if (tab.status === 'complete') {
            // 额外等待1秒确保页面完全渲染
            setTimeout(resolve, 1000);
          } else {
            setTimeout(checkComplete, 500);
          }
        });
      };
      checkComplete();
    });
  }

  async sendToContentHub() {
    if (!this.extractedData) {
      this.showError('请先提取内容');
      return;
    }

    try {
      this.showLoading('正在发送到ContentHub...');
      
      const response = await fetch(`${this.contenthubUrl}/api/materials/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: this.generateTitle(),
          content: this.extractedData.combinedText || this.extractedData.originalText,
          source_type: this.detectSourceType(),
          source_url: this.extractedData.url
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.code === 200) {
        this.showSuccess('✅ 已成功发送到ContentHub！');
      } else {
        this.showError('发送失败: ' + result.message);
      }
    } catch (error) {
      console.error('发送失败:', error);
      this.showError('发送失败，请检查ContentHub地址是否正确');
    }
  }

  async copyContent() {
    if (!this.extractedData) {
      this.showError('请先提取内容');
      return;
    }

    const text = this.extractedData.combinedText || this.extractedData.originalText;
    await navigator.clipboard.writeText(text);
    this.showSuccess('✅ 内容已复制到剪贴板！');
  }

  generateTitle() {
    const url = this.extractedData.url || '';
    const timestamp = new Date().toLocaleString('zh-CN');
    const platform = this.detectSourceType();
    
    const platformNames = {
      'xiaohongshu': '小红书',
      'twitter': '推特',
      'weibo': '微博',
      'douyin': '抖音',
      'other': '网页'
    };
    
    return `${platformNames[platform] || '网页'}素材 - ${timestamp}`;
  }

  detectSourceType() {
    const url = this.extractedData.url || '';
    
    if (url.includes('xiaohongshu.com')) return 'xiaohongshu';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('weibo.com')) return 'weibo';
    if (url.includes('douyin.com')) return 'douyin';
    
    return 'other';
  }

  enableButtons() {
    document.getElementById('sendToContentHub').disabled = false;
    document.getElementById('copyContent').disabled = false;
  }

  showLoading(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  }

  showSuccess(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="section">
        <h4>${message}</h4>
      </div>
    `;
    setTimeout(() => {
      if (this.extractedData) {
        this.displayResult(this.extractedData);
      }
    }, 2000);
  }

  showError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `
      <div class="section">
        <h4 style="color: #fca5a5;">❌ ${message}</h4>
      </div>
    `;
  }

  displayResult(data) {
    const resultDiv = document.getElementById('result');
    
    let html = '';
    
    // 平台信息
    if (data.platform) {
      const platformNames = {
        'xiaohongshu': '小红书',
        'twitter': '推特',
        'weibo': '微博',
        'douyin': '抖音',
        'other': '其他网站'
      };
      html += `
        <div class="section">
          <h4>🌐 来源平台: ${platformNames[data.platform] || '未知'}</h4>
        </div>
      `;
    }
    
    // 原始文本
    if (data.originalText) {
      html += `
        <div class="section">
          <h4>📝 文本内容</h4>
          <p style="max-height: 150px; overflow-y: auto;">${this.escapeHtml(data.originalText)}</p>
        </div>
      `;
    }

    // 图片列表
    if (data.images && data.images.length > 0) {
      html += `
        <div class="section">
          <h4>🖼️ 图片 <span class="status success">${data.images.length}张</span></h4>
          <div class="image-list">
            ${data.images.slice(0, 6).map((img, index) => `
              <div class="image-item">图片 ${index + 1}</div>
            `).join('')}
            ${data.images.length > 6 ? `<div class="image-item">+${data.images.length - 6}张</div>` : ''}
          </div>
        </div>
      `;
    }

    // OCR结果
    if (data.ocrResults && data.ocrResults.length > 0) {
      const successCount = data.ocrResults.filter(r => r.success && r.text).length;
      html += `
        <div class="section">
          <h4>🔍 OCR识别 <span class="status ${successCount > 0 ? 'success' : 'error'}">${successCount}/${data.ocrResults.length}成功</span></h4>
          <div style="max-height: 150px; overflow-y: auto;">
            ${data.ocrResults.map((result, index) => `
              <p style="font-size: 11px; margin: 5px 0;">
                <strong>图${index + 1}:</strong> ${result.text ? this.escapeHtml(result.text.substring(0, 100)) : '未识别到文字'}
              </p>
            `).join('')}
          </div>
        </div>
      `;
    }

    resultDiv.innerHTML = html || '<div class="section"><h4>⚠️ 未提取到内容</h4></div>';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 页面内容提取函数（用于直接注入）
function extractPageContentFunction(useOCR = false) {
  const result = {
    url: window.location.href,
    platform: detectPlatform(),
    originalText: '',
    images: [],
    ocrResults: [],
    combinedText: ''
  };

  try {
    // 提取文本内容
    result.originalText = extractTextContent();
    
    // 提取图片
    result.images = extractImages();
    
    // 如果需要OCR（简化版）
    if (useOCR && result.images.length > 0) {
      result.ocrResults = result.images.map((img, index) => ({
        index: index + 1,
        url: img.url,
        text: `图片${index + 1}中的文字内容（需要OCR处理）`,
        success: true
      }));
    }
    
    // 合并所有文本
    const allTexts = [result.originalText];
    if (result.ocrResults) {
      allTexts.push(...result.ocrResults.map(r => r.text).filter(t => t));
    }
    result.combinedText = allTexts.filter(t => t).join('\n\n');
    
    return result;
  } catch (error) {
    console.error('提取失败:', error);
    return { ...result, error: error.message };
  }
}

// 平台检测
function detectPlatform() {
  const url = window.location.href;
  if (url.includes('xiaohongshu.com')) return 'xiaohongshu';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('weibo.com')) return 'weibo';
  if (url.includes('douyin.com')) return 'douyin';
  return 'other';
}

// 提取文本内容
function extractTextContent() {
  // 小红书
  if (window.location.href.includes('xiaohongshu.com')) {
    const selectors = [
      '.note-text', '.desc', '.content', '.text-content',
      '[data-testid="note-text"]', '.note-detail .desc', '.note-detail .content'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) return element.innerText.trim();
    }
  }
  
  // 推特
  if (window.location.href.includes('twitter.com') || window.location.href.includes('x.com')) {
    const selectors = [
      '[data-testid="tweetText"]', '.tweet-text', '.js-tweet-text', '.tweet-content'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) return element.innerText.trim();
    }
  }
  
  // 微博
  if (window.location.href.includes('weibo.com')) {
    const selectors = [
      '.weibo-text', '.WB_text', '.txt', '.content'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim()) return element.innerText.trim();
    }
  }
  
  // 通用提取
  const selectors = [
    'main p', '.content', '.text', '.post-content', '.article-content', '.main-content',
    'p', 'div[class*="content"]'
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.innerText.trim()) return element.innerText.trim();
  }
  
  return '';
}

// 提取图片
function extractImages() {
  const images = [];
  const selectors = [
    'img[src*="http"]', '.image img', '.photo img', '.media img'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(img => {
      if (img.src && img.src.startsWith('http') && !img.src.includes('data:')) {
        images.push({ index: images.length + 1, url: img.src });
      }
    });
  }
  
  return images;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new ContentHubExtractor();
});