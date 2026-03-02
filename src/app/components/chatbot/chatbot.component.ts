import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatbotService, ChatMessage, ProductSuggestion } from '../../services/chatbot.service';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './chatbot.component.html',
    styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, OnDestroy {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    @ViewChild('messageInput') private messageInput!: ElementRef;

    private chatbotService = inject(ChatbotService);
    private router = inject(Router);
    private sanitizer = inject(DomSanitizer);

    messages: ChatMessage[] = [];
    isOpen = false;
    isLoading = false;
    userMessage = '';

    private subscriptions: Subscription[] = [];

    ngOnInit(): void {
        // Subscribe to messages
        this.subscriptions.push(
            this.chatbotService.messages$.subscribe(messages => {
                this.messages = messages;
                this.scrollToBottom();
            })
        );

        // Subscribe to chat state
        this.subscriptions.push(
            this.chatbotService.isOpen$.subscribe(isOpen => {
                this.isOpen = isOpen;
                if (isOpen) {
                    setTimeout(() => this.focusInput(), 100);
                }
            })
        );

        // Subscribe to loading state
        this.subscriptions.push(
            this.chatbotService.isLoading$.subscribe(isLoading => {
                this.isLoading = isLoading;
            })
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
    }

    toggleChat(): void {
        this.chatbotService.toggleChat();
    }

    closeChat(): void {
        this.chatbotService.closeChat();
    }

    sendMessage(): void {
        const message = this.userMessage.trim();
        if (!message || this.isLoading) return;

        this.userMessage = '';

        this.chatbotService.sendMessage(message).subscribe({
            next: (response) => {
                this.chatbotService.handleResponse(response);
            },
            error: (error) => {
                this.chatbotService.handleError(error);
            }
        });
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    goToProduct(suggestion: ProductSuggestion): void {
        this.router.navigate(['/products', suggestion.id]);
        this.closeChat();
    }

    getProductImageUrl(thumbnail: string | undefined): string {
        if (!thumbnail) return 'assets/no-image.png';
        if (thumbnail.startsWith('http')) return thumbnail;
        return `${environment.apiBaseUrl}/products/images/${thumbnail}`;
    }

    formatPrice(price: number): string {
        return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Render markdown cơ bản + link sản phẩm clickable
     * Chuyển /products/{id} thành link Angular navigate
     */
    renderMarkdown(content: string): SafeHtml {
        if (!content) return '';

        let html = content;

        // Escape HTML trước
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Markdown link [text](url) → <a> tag
        html = html.replace(/\[([^\]]+)\]\(\/products\/(\d+)\)/g,
            '<a class="product-link" data-product-id="$2" href="javascript:void(0)">$1</a>');

        // Markdown link khác [text](url)
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Plain product links /products/{id} → clickable
        html = html.replace(/(?<!\")\/products\/(\d+)(?!\")/g,
            '<a class="product-link" data-product-id="$1" href="javascript:void(0)">Xem sản phẩm #$1</a>');

        // Bold **text** → <strong>
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic *text* → <em>
        html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

        // Numbered list (1. text)
        html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="numbered">$2</li>');

        // Bullet list (- text)
        html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');

        // Wrap consecutive <li> in <ul> hoặc <ol>
        html = html.replace(/((?:<li[^>]*>[^<]*<\/li>\n?)+)/g, '<ul class="chat-list">$1</ul>');

        // Newlines → <br>
        html = html.replace(/\n/g, '<br>');

        // Cleanup: remove <br> inside <ul>
        html = html.replace(/<ul class="chat-list"><br>/g, '<ul class="chat-list">');
        html = html.replace(/<br><\/ul>/g, '</ul>');
        html = html.replace(/<\/li><br><li/g, '</li><li');

        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    /**
     * Xử lý click trên link sản phẩm trong tin nhắn
     */
    onMessageClick(event: Event): void {
        const target = event.target as HTMLElement;
        if (target.classList.contains('product-link')) {
            const productId = target.getAttribute('data-product-id');
            if (productId) {
                this.router.navigate(['/products', productId]);
                this.closeChat();
            }
        }
    }

    private scrollToBottom(): void {
        setTimeout(() => {
            if (this.messagesContainer) {
                const container = this.messagesContainer.nativeElement;
                container.scrollTop = container.scrollHeight;
            }
        }, 100);
    }

    private focusInput(): void {
        if (this.messageInput) {
            this.messageInput.nativeElement.focus();
        }
    }

    clearHistory(): void {
        this.chatbotService.clearHistory();
    }
}
