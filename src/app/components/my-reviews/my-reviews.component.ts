import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommentService } from '../../services/comment.service';
import { TokenService } from '../../services/token.service';
import { ApiResponse } from '../../responses/api.response';
import { HttpErrorResponse } from '@angular/common/http';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ToastService } from '../../services/toast.service';
import { Comment } from '../../models/comment';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'app-my-reviews',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, HeaderComponent, FooterComponent],
    templateUrl: './my-reviews.component.html',
    styleUrls: ['./my-reviews.component.scss']
})
export class MyReviewsComponent implements OnInit {
    reviews: Comment[] = [];
    isLoading: boolean = false;
    currentPage: number = 0;
    totalPages: number = 0;
    totalElements: number = 0;
    limit: number = 10;

    // Edit Modal
    showEditModal: boolean = false;
    editingReview: Comment | null = null;
    editRating: number = 0;
    editHoverRating: number = 0;
    editContent: string = '';
    saving: boolean = false;

    // Delete
    showDeleteConfirm: boolean = false;
    deletingReview: Comment | null = null;

    private commentService = inject(CommentService);
    private tokenService = inject(TokenService);
    private toastService = inject(ToastService);

    environment = environment;

    ngOnInit(): void {
        this.loadReviews();
    }

    loadReviews(): void {
        this.isLoading = true;
        this.commentService.getMyReviews(this.currentPage, this.limit).subscribe({
            next: (response: ApiResponse) => {
                const data = response.data;
                this.reviews = data.reviews || [];
                this.totalPages = data.totalPages || 0;
                this.totalElements = data.totalElements || 0;
                this.currentPage = data.currentPage || 0;
                this.isLoading = false;
            },
            error: (error: HttpErrorResponse) => {
                this.isLoading = false;
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Không thể tải danh sách đánh giá',
                    title: 'Lỗi'
                });
            }
        });
    }

    // ══════════════════════════════════════════════
    // PAGINATION
    // ══════════════════════════════════════════════

    goToPage(page: number): void {
        if (page < 0 || page >= this.totalPages) return;
        this.currentPage = page;
        this.loadReviews();
    }

    get visiblePages(): number[] {
        const maxVisible = 5;
        const half = Math.floor(maxVisible / 2);
        let start = Math.max(this.currentPage - half, 0);
        let end = Math.min(start + maxVisible - 1, this.totalPages - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(end - maxVisible + 1, 0);
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    // ══════════════════════════════════════════════
    // EDIT
    // ══════════════════════════════════════════════

    openEditModal(review: Comment): void {
        this.editingReview = review;
        this.editRating = review.rating || 0;
        this.editHoverRating = 0;
        this.editContent = review.content;
        this.showEditModal = true;
        document.body.style.overflow = 'hidden';
    }

    closeEditModal(): void {
        this.showEditModal = false;
        this.editingReview = null;
        document.body.style.overflow = '';
    }

    setEditRating(star: number): void {
        this.editRating = star;
    }

    setEditHover(star: number): void {
        this.editHoverRating = star;
    }

    resetEditHover(): void {
        this.editHoverRating = 0;
    }

    getRatingText(rating: number): string {
        switch (rating) {
            case 1: return 'Rất tệ';
            case 2: return 'Tệ';
            case 3: return 'Bình thường';
            case 4: return 'Tốt';
            case 5: return 'Rất tốt';
            default: return '';
        }
    }

    saveEdit(): void {
        if (!this.editingReview) return;

        // Đọc giá trị trực tiếp từ editingReview (đã bind 2 chiều trong HTML)
        const content = this.editingReview.content?.trim() || '';
        const rating = this.editingReview.rating || 0;

        if (content.length < 10) {
            this.toastService.showToast({
                error: null,
                defaultMsg: 'Nội dung đánh giá phải có ít nhất 10 ký tự',
                title: 'Thông báo'
            });
            return;
        }

        if (rating === 0) {
            this.toastService.showToast({
                error: null,
                defaultMsg: 'Vui lòng chọn số sao',
                title: 'Thông báo'
            });
            return;
        }

        this.saving = true;
        this.commentService.updateComment(
            this.editingReview.id,
            content,
            rating
        ).subscribe({
            next: () => {
                this.saving = false;
                this.closeEditModal();
                this.loadReviews();
                this.toastService.showToast({
                    error: null,
                    defaultMsg: 'Cập nhật đánh giá thành công!',
                    title: 'Thành công'
                });
            },
            error: (error: HttpErrorResponse) => {
                this.saving = false;
                const errorMsg = error.error?.message || 'Lỗi khi cập nhật đánh giá';
                this.toastService.showToast({
                    error: null,
                    defaultMsg: errorMsg,
                    title: 'Lỗi'
                });
            }
        });
    }

    // ══════════════════════════════════════════════
    // DELETE
    // ══════════════════════════════════════════════

    confirmDelete(review: Comment): void {
        this.deletingReview = review;
        this.showDeleteConfirm = true;
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        this.deletingReview = null;
    }

    executeDelete(): void {
        if (!this.deletingReview) return;

        this.commentService.deleteMyComment(this.deletingReview.id).subscribe({
            next: () => {
                this.showDeleteConfirm = false;
                this.deletingReview = null;
                this.loadReviews();
                this.toastService.showToast({
                    error: null,
                    defaultMsg: 'Đã xóa đánh giá thành công',
                    title: 'Thành công'
                });
            },
            error: (error: HttpErrorResponse) => {
                this.showDeleteConfirm = false;
                const errorMsg = error.error?.message || 'Lỗi khi xóa đánh giá';
                this.toastService.showToast({
                    error: null,
                    defaultMsg: errorMsg,
                    title: 'Lỗi'
                });
            }
        });
    }

    // ══════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════

    getProductImageUrl(thumbnail: string | undefined): string {
        if (!thumbnail) return 'assets/images/product-placeholder.png';
        if (thumbnail.startsWith('http')) return thumbnail;
        return `${this.environment.apiBaseUrl}/products/images/${thumbnail}`;
    }

    getAvatarUrl(user: any): string {
        if (!user?.profile_image) return 'assets/images/user-placeholder.png';
        if (user.profile_image.startsWith('http')) return user.profile_image;
        return `${this.environment.apiBaseUrl}/users/profile-images/${user.profile_image}`;
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
