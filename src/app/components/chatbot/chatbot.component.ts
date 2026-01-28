import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ChatbotService, ChatMessage, ProductSuggestion } from '../../services/chatbot.service';
import { environment } from '../../../environments/environment';

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
