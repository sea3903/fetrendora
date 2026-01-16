import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor() { }

  showToast({ error, defaultMsg: defaultMessage, title = '', delay = 4000 }: {
    error?: any,
    defaultMsg: string,
    title?: string,
    delay?: number
  }) {
    // Xác định message và loại toast
    let message = defaultMessage;
    const isError = !!error;

    if (error) {
      if (error.error && error.error.message) {
        message = error.error.message;
      } else if (typeof error === 'string' && error !== 'validation') {
        message = error;
      }
    }

    // Tạo container nếu chưa có
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      Object.assign(toastContainer.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '9999',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      });
      document.body.appendChild(toastContainer);
    }

    // Tạo toast element với Trendora style (đen trắng)
    const toast = document.createElement('div');
    Object.assign(toast.style, {
      minWidth: '320px',
      maxWidth: '400px',
      backgroundColor: isError ? '#000000' : '#ffffff',
      color: isError ? '#ffffff' : '#000000',
      border: '1px solid #000000',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      animation: 'slideIn 0.3s ease-out',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
    });

    // Tạo header với icon
    const icon = isError
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';

    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; padding: 16px; gap: 12px;">
        <div style="flex-shrink: 0; margin-top: 2px;">${icon}</div>
        <div style="flex: 1; min-width: 0;">
          ${title ? `<div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">${title}</div>` : ''}
          <div style="font-size: 14px; line-height: 1.5;">${message}</div>
        </div>
        <button class="toast-close" style="flex-shrink: 0; background: none; border: none; cursor: pointer; padding: 0; color: inherit; opacity: 0.7;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="toast-progress" style="height: 3px; background: ${isError ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'};">
        <div style="height: 100%; background: ${isError ? '#ffffff' : '#000000'}; animation: progress ${delay}ms linear;"></div>
      </div>
    `;

    // Add animation keyframes if not already added
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-close:hover { opacity: 1 !important; }
      `;
      document.head.appendChild(style);
    }

    // Thêm vào container
    toastContainer.appendChild(toast);

    // Hàm đóng toast với animation
    const closeToast = () => {
      toast.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    };

    // Tự động ẩn sau delay
    const timeoutId = setTimeout(closeToast, delay);

    // Xử lý đóng manual
    toast.querySelector('.toast-close')?.addEventListener('click', () => {
      clearTimeout(timeoutId);
      closeToast();
    });
  }
}