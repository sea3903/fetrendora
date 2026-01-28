import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    suggestions?: ProductSuggestion[];
    timestamp: Date;
}

export interface ProductSuggestion {
    id: number;
    name: string;
    price: number;
    thumbnail: string;
    link: string;
}

export interface ChatRequest {
    message: string;
    userId?: number;
}

export interface ChatResponse {
    reply: string;
    suggestions: ProductSuggestion[];
}

@Injectable({
    providedIn: 'root'
})
export class ChatbotService {
    private apiBaseUrl = environment.apiBaseUrl;
    private http = inject(HttpClient);

    // Message history
    private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
    public messages$ = this.messagesSubject.asObservable();

    // Chat window state
    private isOpenSubject = new BehaviorSubject<boolean>(false);
    public isOpen$ = this.isOpenSubject.asObservable();

    // Loading state
    private isLoadingSubject = new BehaviorSubject<boolean>(false);
    public isLoading$ = this.isLoadingSubject.asObservable();

    constructor() {
        // Add welcome message
        this.addMessage({
            role: 'assistant',
            content: 'Xin chào! Em là trợ lý tư vấn của Shop App. Anh/chị đang tìm kiếm sản phẩm gì ạ? 🛍️',
            timestamp: new Date()
        });
    }

    /**
     * Send message to chatbot API
     */
    sendMessage(message: string): Observable<ChatResponse> {
        this.isLoadingSubject.next(true);

        // Add user message to history
        this.addMessage({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        const request: ChatRequest = { message };
        return this.http.post<ChatResponse>(`${this.apiBaseUrl}/chat`, request);
    }

    /**
     * Handle API response
     */
    handleResponse(response: ChatResponse): void {
        this.isLoadingSubject.next(false);
        this.addMessage({
            role: 'assistant',
            content: response.reply,
            suggestions: response.suggestions,
            timestamp: new Date()
        });
    }

    /**
     * Handle API error
     */
    handleError(error: any): void {
        this.isLoadingSubject.next(false);
        this.addMessage({
            role: 'assistant',
            content: 'Xin lỗi, em gặp lỗi khi xử lý. Anh/chị vui lòng thử lại sau ạ! 😔',
            timestamp: new Date()
        });
        console.error('Chatbot Error:', error);
    }

    /**
     * Add message to history
     */
    private addMessage(message: ChatMessage): void {
        const current = this.messagesSubject.value;
        this.messagesSubject.next([...current, message]);
    }

    /**
     * Toggle chat window
     */
    toggleChat(): void {
        this.isOpenSubject.next(!this.isOpenSubject.value);
    }

    /**
     * Open chat window
     */
    openChat(): void {
        this.isOpenSubject.next(true);
    }

    /**
     * Close chat window
     */
    closeChat(): void {
        this.isOpenSubject.next(false);
    }

    /**
     * Clear chat history
     */
    clearHistory(): void {
        this.messagesSubject.next([{
            role: 'assistant',
            content: 'Xin chào! Em là trợ lý tư vấn của Shop App. Anh/chị đang tìm kiếm sản phẩm gì ạ? 🛍️',
            timestamp: new Date()
        }]);
    }
}
