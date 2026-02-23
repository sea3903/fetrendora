import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiResponse } from '../../../responses/api.response';
import { Comment } from '../../../models/comment';
import { CommentService } from '../../../services/comment.service';
import { HttpErrorResponse } from '@angular/common/http';
import { BaseComponent } from '../../base/base.component';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-comment-admin',
    templateUrl: './comment.admin.component.html',
    styleUrls: ['./comment.admin.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
    ]
})
export class CommentAdminComponent extends BaseComponent implements OnInit {
    comments: Comment[] = [];
    currentPage: number = 0;
    itemsPerPage: number = 10;
    totalPages: number = 0;
    totalElements: number = 0;
    visiblePages: number[] = [];

    // Bộ lọc
    keyword: string = '';
    filterRating: number | null = null;
    filterStartDate: string = '';
    filterEndDate: string = '';

    // Quick filter đang chọn
    activeQuickFilter: string = '';

    // Thống kê
    stats: any = null;
    showStats: boolean = true;

    // Edit modal
    showEditModal: boolean = false;
    editingComment: Comment | null = null;
    editContent: string = '';
    editRating: number = 0;
    editHoverRating: number = 0;
    savingEdit: boolean = false;

    // Delete
    showDeleteConfirm: boolean = false;
    deletingComment: Comment | null = null;

    // Detail modal
    showDetailModal: boolean = false;
    detailComment: Comment | null = null;

    private commentService = inject(CommentService);
    private cdr = inject(ChangeDetectorRef);
    environment = environment;

    ngOnInit(): void {
        this.loadStatistics();
        this.loadComments();
    }

    // ══════════════════════════════════════════════
    // THỐNG KÊ
    // ══════════════════════════════════════════════

    loadStatistics(): void {
        this.commentService.getCommentStatistics().subscribe({
            next: (response: ApiResponse) => {
                this.stats = response.data;
            },
            error: () => {
                // Thống kê lỗi không cần block UI
            }
        });
    }

    getStarPercentage(starCount: number): number {
        if (!this.stats?.totalComments || this.stats.totalComments === 0) return 0;
        const distribution = this.stats.ratingDistribution || {};
        const count = distribution[starCount] || 0;
        return (count / this.stats.totalComments) * 100;
    }

    getStarCount(starCount: number): number {
        if (!this.stats?.ratingDistribution) return 0;
        return this.stats.ratingDistribution[starCount] || 0;
    }

    // ══════════════════════════════════════════════
    // LOAD & FILTER
    // ══════════════════════════════════════════════

    loadComments(): void {
        const startDate = this.filterStartDate ? this.filterStartDate + 'T00:00:00' : undefined;
        const endDate = this.filterEndDate ? this.filterEndDate + 'T23:59:59' : undefined;

        this.commentService.getCommentsAdmin(
            this.keyword,
            this.currentPage,
            this.itemsPerPage,
            undefined,
            this.filterRating || undefined,
            startDate,
            endDate
        ).subscribe({
            next: (apiResponse: ApiResponse) => {
                const data = apiResponse.data;
                this.comments = data.comments || [];
                this.totalPages = data.totalPages || 0;
                this.totalElements = data.totalElements || 0;
                this.visiblePages = this.generateVisiblePageArray(this.currentPage, this.totalPages);
                this.cdr.detectChanges(); // Trigger update UI manually
            },
            error: (error: HttpErrorResponse) => {
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi tải danh sách đánh giá',
                    title: 'Lỗi'
                });
            }
        });
    }

    searchComments(): void {
        this.currentPage = 0;
        this.activeQuickFilter = '';
        this.loadComments();
    }

    clearFilters(): void {
        this.keyword = '';
        this.filterRating = null;
        this.filterStartDate = '';
        this.filterEndDate = '';
        this.activeQuickFilter = '';
        this.currentPage = 0;
        this.loadComments();
    }

    filterByRating(rating: number | null): void {
        this.filterRating = rating;
        this.currentPage = 0;
        this.loadComments();
    }

    // ══════════════════════════════════════════════
    // QUICK FILTERS
    // ══════════════════════════════════════════════

    applyQuickFilter(filterName: string): void {
        const now = new Date();
        let start: Date;
        let end: Date = new Date();

        switch (filterName) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'yesterday':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                break;
            case 'last7days':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
                break;
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'lastMonth':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            default:
                return;
        }

        this.filterStartDate = this.formatDateForInput(start);
        this.filterEndDate = this.formatDateForInput(end);
        this.activeQuickFilter = filterName;
        this.currentPage = 0;
        this.loadComments();
    }

    private formatDateForInput(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ══════════════════════════════════════════════
    // PAGINATION
    // ══════════════════════════════════════════════

    onPageChange(page: number): void {
        this.currentPage = page < 0 ? 0 : page;
        this.loadComments();
    }

    // ══════════════════════════════════════════════
    // DETAIL (XEM CHI TIẾT)
    // ══════════════════════════════════════════════

    viewDetail(comment: Comment): void {
        this.detailComment = comment;
        this.showDetailModal = true;
    }

    closeDetailModal(): void {
        this.showDetailModal = false;
        this.detailComment = null;
    }

    // ══════════════════════════════════════════════
    // EDIT
    // ══════════════════════════════════════════════

    openEditModal(comment: Comment): void {
        this.editingComment = comment;
        this.editContent = comment.content;
        this.editRating = comment.rating || 0;
        this.editHoverRating = 0;
        this.showEditModal = true;
    }

    closeEditModal(): void {
        this.showEditModal = false;
        this.editingComment = null;
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
        if (!this.editingComment) return;

        this.savingEdit = true;
        this.commentService.adminUpdateComment(
            this.editingComment.id,
            this.editContent.trim(),
            this.editRating
        ).subscribe({
            next: () => {
                this.savingEdit = false;
                this.closeEditModal();
                this.loadComments();
                this.loadStatistics();
                this.toastService.showToast({
                    error: null,
                    defaultMsg: 'Cập nhật đánh giá thành công',
                    title: 'Thành công'
                });
            },
            error: (error: HttpErrorResponse) => {
                this.savingEdit = false;
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi khi cập nhật đánh giá',
                    title: 'Lỗi'
                });
            }
        });
    }

    // ══════════════════════════════════════════════
    // DELETE
    // ══════════════════════════════════════════════

    confirmDelete(comment: Comment): void {
        this.deletingComment = comment;
        this.showDeleteConfirm = true;
    }

    cancelDelete(): void {
        this.showDeleteConfirm = false;
        this.deletingComment = null;
    }

    executeDelete(): void {
        if (!this.deletingComment) return;

        this.commentService.deleteComment(this.deletingComment.id).subscribe({
            next: () => {
                this.showDeleteConfirm = false;
                this.deletingComment = null;
                this.loadComments();
                this.loadStatistics();
                this.toastService.showToast({
                    error: null,
                    defaultMsg: 'Xóa đánh giá thành công',
                    title: 'Thành công'
                });
            },
            error: (error: HttpErrorResponse) => {
                this.showDeleteConfirm = false;
                this.toastService.showToast({
                    error: error,
                    defaultMsg: 'Lỗi khi xóa đánh giá',
                    title: 'Lỗi'
                });
            }
        });
    }

    // ══════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════

    getAvatarUrl(user: any): string {
        if (!user?.profile_image) return 'assets/images/user-placeholder.png';
        if (user.profile_image.startsWith('http')) return user.profile_image;
        return `${this.environment.apiBaseUrl}/users/profile-images/${user.profile_image}`;
    }

    getThumbnailUrl(thumbnail: string | undefined): string {
        if (!thumbnail) return 'assets/images/product-placeholder.png';
        if (thumbnail.startsWith('http')) return thumbnail;
        return `${this.environment.apiBaseUrl}/products/images/${thumbnail}`;
    }

    truncateContent(content: string, maxLength: number = 80): string {
        if (!content || content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }

    hasActiveFilters(): boolean {
        return !!this.keyword || this.filterRating !== null ||
            !!this.filterStartDate || !!this.filterEndDate;
    }
}
