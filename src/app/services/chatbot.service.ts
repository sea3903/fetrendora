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
    sessionId: string;
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

    // Session ID cố định cho toàn bộ phiên chat → gửi lên backend để Redis lưu đúng lịch sử
    private sessionId: string = this.generateSessionId();

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
        // Tin nhắn chào mừng
        this.addMessage({
            role: 'assistant',
            content: 'Xin chào! Em là trợ lý tư vấn của TRENDORA. Anh/chị đang tìm kiếm sản phẩm gì ạ? 🛍️',
            timestamp: new Date()
        });
    }

    /**
     * Gửi tin nhắn tới chatbot API (kèm sessionId)
     */
    sendMessage(message: string): Observable<ChatResponse> {
        this.isLoadingSubject.next(true);

        this.addMessage({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        const request: ChatRequest = {
            message,
            sessionId: this.sessionId
        };
        return this.http.post<ChatResponse>(`${this.apiBaseUrl}/chat`, request);
    }

    /** Xử lý response thành công */
    handleResponse(response: ChatResponse): void {
        this.isLoadingSubject.next(false);
        this.addMessage({
            role: 'assistant',
            content: response.reply,
            suggestions: response.suggestions,
            timestamp: new Date()
        });
    }

    /** Xử lý lỗi */
    handleError(error: any): void {
        this.isLoadingSubject.next(false);
        this.addMessage({
            role: 'assistant',
            content: 'Xin lỗi, em gặp lỗi khi xử lý. Anh/chị vui lòng thử lại sau ạ! 😔',
            timestamp: new Date()
        });
        console.error('Chatbot Error:', error);
    }

    private addMessage(message: ChatMessage): void {
        const current = this.messagesSubject.value;
        this.messagesSubject.next([...current, message]);
    }

    toggleChat(): void {
        this.isOpenSubject.next(!this.isOpenSubject.value);
    }

    openChat(): void {
        this.isOpenSubject.next(true);
    }

    closeChat(): void {
        this.isOpenSubject.next(false);
    }

    /** Xóa lịch sử chat và tạo session mới */
    clearHistory(): void {
        this.sessionId = this.generateSessionId();
        this.messagesSubject.next([{
            role: 'assistant',
            content: 'Xin chào! Em là trợ lý tư vấn của TRENDORA. Anh/chị đang tìm kiếm sản phẩm gì ạ? 🛍️',
            timestamp: new Date()
        }]);
    }

    /** Tạo session ID duy nhất */
    private generateSessionId(): string {
        return 'chat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    }
}
