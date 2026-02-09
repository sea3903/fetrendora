import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventService, Event, EventImage } from '../../../services/event.service';
import { forkJoin, of, Observable } from 'rxjs';
import { Coupon } from '../../../services/coupon.service';
import { ApiResponse } from '../../../responses/api.response';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../services/toast.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface EventImageItem {
    id?: number;
    image_url: string;
    image_type: 'upload' | 'url';
    display_order: number;
    file?: File;
}

interface FormErrors {
    title?: string;
    images?: string;
    video_url?: string;
    start_date?: string;
    end_date?: string;
}

interface EventDTO {
    title: string;
    description: string;
    thumbnail_url: string;
    video_url: string;
    show_coupons: boolean;
    is_active: boolean;
    start_date: string;
    end_date: string;
    coupon_ids: number[];
}

@Component({
    selector: 'app-event-admin',
    templateUrl: './event.admin.component.html',
    styleUrls: ['./event.admin.component.scss'],
    imports: [CommonModule, FormsModule]
})
export class EventAdminComponent implements OnInit {
    private eventService = inject(EventService);
    private toastService = inject(ToastService);
    private sanitizer = inject(DomSanitizer);

    apiBaseUrl = environment.apiBaseUrl;

    events: Event[] = [];
    filteredEvents: Event[] = [];
    paginatedEvents: Event[] = [];
    allCoupons: Coupon[] = [];

    isLoading = false;

    // Tìm kiếm & Phân trang
    searchKeyword = '';
    currentPage = 0;
    itemsPerPage = 10;
    totalPages = 0;
    visiblePages: number[] = [];

    // Modal
    showModal = false;
    modalMode: 'create' | 'edit' = 'create';
    currentEvent: Event | null = null;

    // Form
    formData = {
        title: '',
        description: '',
        thumbnail_url: '',
        video_url: '',
        show_coupons: true,
        is_active: true,
        start_date: '',
        end_date: ''
    };

    formErrors: FormErrors = {};

    // Images (max 5)
    eventImages: EventImageItem[] = [];
    newImageUrl = '';

    // Coupons
    selectedCouponIds: number[] = [];

    ngOnInit(): void {
        this.loadEvents();
        this.loadAllCoupons();
    }

    // ═══════════════════════════════════════
    // TẢI DỮ LIỆU
    // ═══════════════════════════════════════

    loadEvents(): void {
        this.isLoading = true;
        this.eventService.getAllEvents().subscribe({
            next: (response: ApiResponse) => {
                this.events = response.data || [];
                this.applyFilter();
                this.isLoading = false;
            },
            error: (error) => {
                this.toastService.showToast({ error, defaultMsg: 'Lỗi tải danh sách sự kiện', title: 'Lỗi' });
                this.isLoading = false;
            }
        });
    }

    loadAllCoupons(): void {
        this.eventService.getAllCoupons().subscribe({
            next: (response: ApiResponse) => {
                this.allCoupons = response.data || [];
            },
            error: (err) => console.error('Lỗi tải voucher:', err)
        });
    }

    // ═══════════════════════════════════════
    // TÌM KIẾM & PHÂN TRANG
    // ═══════════════════════════════════════

    applyFilter(): void {
        const keyword = this.searchKeyword.toLowerCase().trim();
        this.filteredEvents = this.events.filter(event =>
            event.title.toLowerCase().includes(keyword) ||
            (event.description && event.description.toLowerCase().includes(keyword))
        );
        this.currentPage = 0;
        this.updatePagination();
    }

    updatePagination(): void {
        this.totalPages = Math.ceil(this.filteredEvents.length / this.itemsPerPage);
        const start = this.currentPage * this.itemsPerPage;
        this.paginatedEvents = this.filteredEvents.slice(start, start + this.itemsPerPage);
        this.calculateVisiblePages();
    }

    calculateVisiblePages(): void {
        const maxVisible = 5;
        let startPage = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
        const endPage = Math.min(this.totalPages, startPage + maxVisible);
        if (endPage - startPage < maxVisible) startPage = Math.max(0, endPage - maxVisible);
        this.visiblePages = [];
        for (let i = startPage; i < endPage; i++) this.visiblePages.push(i);
    }

    goToPage(page: number): void {
        if (page >= 0 && page < this.totalPages) {
            this.currentPage = page;
            this.updatePagination();
        }
    }

    onSearch(): void { this.applyFilter(); }

    // ═══════════════════════════════════════
    // MODAL (CỬA SỔ)
    // ═══════════════════════════════════════

    openCreateModal(): void {
        this.modalMode = 'create';
        this.currentEvent = null;
        this.resetForm();
        this.showModal = true;
    }

    openEditModal(event: Event): void {
        this.isLoading = true; // Hiển thị loading trong khi tải chi tiết
        this.eventService.getEventById(event.id).subscribe({
            next: (response) => {
                const detailedEvent = response.data;
                this.modalMode = 'edit';
                this.currentEvent = detailedEvent;

                this.formData = {
                    title: detailedEvent.title,
                    description: detailedEvent.description || '',
                    thumbnail_url: detailedEvent.thumbnail_url || '',
                    video_url: detailedEvent.video_url || '',
                    show_coupons: detailedEvent.show_coupons ?? true,
                    is_active: detailedEvent.is_active ?? true,
                    // Chuyển đổi định dạng ngày tháng
                    start_date: this.formatDateForInput(detailedEvent.start_date),
                    end_date: this.formatDateForInput(detailedEvent.end_date)
                };

                // Ánh xạ danh sách ảnh
                this.eventImages = (detailedEvent.images || []).map((img: any) => ({
                    id: img.id,
                    image_url: img.image_url,
                    image_type: img.image_type as 'upload' | 'url',
                    display_order: img.display_order
                }));

                // Auto-select thumbnail logic
                if (!this.formData.thumbnail_url && this.eventImages.length > 0) {
                    this.formData.thumbnail_url = this.eventImages[0].image_url;
                }

                // Map coupons using fetched details
                this.selectedCouponIds = (detailedEvent.coupons || []).map((c: any) => c.id);

                this.formErrors = {};
                this.isLoading = false;
                this.showModal = true;
            },
            error: (err) => {
                this.toastService.showToast({ error: err, defaultMsg: 'Lỗi tải chi tiết sự kiện', title: 'Lỗi' });
                this.isLoading = false;
            }
        });
    }

    closeModal(): void {
        this.showModal = false;
        this.resetForm();
    }

    resetForm(): void {
        this.formData = { title: '', description: '', thumbnail_url: '', video_url: '', show_coupons: true, is_active: true, start_date: '', end_date: '' };
        this.eventImages = [];
        this.selectedCouponIds = [];
        this.newImageUrl = '';
        this.currentEvent = null;
        this.formErrors = {};
    }

    // ═══════════════════════════════════════
    // KIỂM TRA DỮ LIỆU
    // ═══════════════════════════════════════

    validateForm(): boolean {
        this.formErrors = {};
        let isValid = true;

        if (!this.formData.title.trim()) {
            this.formErrors.title = 'Vui lòng nhập tên sự kiện';
            isValid = false;
        }

        if (this.eventImages.length < 1) {
            this.formErrors.images = 'Phải có ít nhất 1 hình ảnh banner';
            isValid = false;
        }

        // Link Video là tùy chọn, nhưng nếu nhập thì phải kiểm tra tính hợp lệ
        if (this.formData.video_url && this.formData.video_url.trim() && !this.isValidYoutubeUrl(this.formData.video_url)) {
            this.formErrors.video_url = 'Link YouTube không hợp lệ';
            isValid = false;
        }

        if (!this.formData.start_date) {
            this.formErrors.start_date = 'Vui lòng chọn ngày bắt đầu';
            isValid = false;
        }

        if (!this.formData.end_date) {
            this.formErrors.end_date = 'Vui lòng chọn ngày kết thúc';
            isValid = false;
        }

        if (this.formData.start_date && this.formData.end_date) {
            if (new Date(this.formData.end_date) <= new Date(this.formData.start_date)) {
                this.formErrors.end_date = 'Ngày kết thúc phải sau ngày bắt đầu';
                isValid = false;
            }
        }

        return isValid;
    }

    isValidYoutubeUrl(url: string): boolean {
        if (!url) return false;
        return url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/embed/');
    }

    // ═══════════════════════════════════════
    // LƯU SỰ KIỆN
    // ═══════════════════════════════════════

    saveEvent(): void {
        if (!this.validateForm()) {
            this.toastService.showToast({ error: 'validation', defaultMsg: 'Vui lòng kiểm tra lại thông tin', title: 'Lỗi' });
            return;
        }

        // Xử lý thumbnail_url
        // Nếu ảnh đầu tiên là URL (có sẵn hoặc nhập link) -> dùng luôn
        // Nếu ảnh đầu tiên là FILE (upload) -> gửi chuỗi rỗng (để tránh lỗi Data Truncation do Base64 quá dài)
        // Sau khi upload xong, backend có thể tự update hoặc mình gọi update sau (tạm thời để rỗng)
        let thumbnailUrl = '';
        if (this.eventImages.length > 0) {
            const firstImg = this.eventImages[0];
            if (firstImg.image_type === 'url' && !firstImg.image_url.startsWith('data:')) {
                thumbnailUrl = firstImg.image_url;
            }
        }

        const eventData: EventDTO = {
            title: this.formData.title,
            description: this.formData.description,
            thumbnail_url: thumbnailUrl,
            video_url: this.formData.video_url,
            show_coupons: this.formData.show_coupons,
            is_active: this.formData.is_active,
            start_date: this.formData.start_date ? this.formatDateToLocalString(new Date(this.formData.start_date)) : this.formatDateToLocalString(new Date()),
            end_date: this.formData.end_date ? this.formatDateToLocalString(new Date(this.formData.end_date)) : this.formatDateToLocalString(new Date()),
            coupon_ids: this.selectedCouponIds
        };

        if (this.modalMode === 'edit' && this.currentEvent?.id) {
            // ... update logic
            this.eventService.updateEvent(this.currentEvent.id, eventData).subscribe({
                next: (response) => {
                    this.uploadPendingImages(this.currentEvent!.id!).subscribe({
                        next: () => {
                            this.toastService.showToast({ error: null, defaultMsg: response.message || 'Cập nhật thành công', title: 'Hoàn tất' });
                            this.loadEvents();
                            this.closeModal();
                        },
                        error: () => {
                            this.loadEvents();
                            this.closeModal();
                        }
                    });
                },
                error: (error) => this.toastService.showToast({ error, defaultMsg: 'Lỗi cập nhật sự kiện' })
            });
        } else {
            // ... create logic
            this.eventService.createEvent(eventData).subscribe({
                next: (response) => {
                    const newEventId = response.data.id;
                    this.uploadPendingImages(newEventId).subscribe({
                        next: () => {
                            this.toastService.showToast({ error: null, defaultMsg: response.message || 'Thêm thành công', title: 'Hoàn tất' });
                            this.loadEvents();
                            this.closeModal();
                        },
                        error: () => {
                            this.loadEvents();
                            this.closeModal();
                        }
                    });
                },
                error: (error) => this.toastService.showToast({ error, defaultMsg: 'Lỗi thêm sự kiện' })
            });
        }
    }

    // ═══════════════════════════════════════
    // QUẢN LÝ ẢNH
    // ═══════════════════════════════════════

    onFilesSelected(event: any): void {
        const files = event.target.files;
        if (!files) return;

        const remaining = 5 - this.eventImages.length;
        const count = Math.min(files.length, remaining);

        for (let i = 0; i < count; i++) {
            const file = files[i];
            const reader = new FileReader();
            reader.onload = (e: any) => {
                const newImage: EventImageItem = {
                    image_url: e.target.result,
                    image_type: 'upload',
                    display_order: this.eventImages.length,
                    file
                };
                this.eventImages.push(newImage);

                // Tự động đặt thumbnail nếu là ảnh đầu tiên
                if (!this.formData.thumbnail_url && this.eventImages.length === 1) {
                    this.formData.thumbnail_url = newImage.image_url;
                }
            };
            reader.readAsDataURL(file);
        }

        if (files.length > remaining) {
            this.toastService.showToast({ error: null, defaultMsg: `Chỉ có thể thêm tối đa ${remaining} ảnh nữa`, title: 'Cảnh báo' });
        }
    }

    addImageUrl(): void {
        if (!this.newImageUrl.trim()) {
            this.toastService.showToast({ error: 'validation', defaultMsg: 'Vui lòng nhập URL ảnh', title: 'Lỗi' });
            return;
        }

        if (this.eventImages.length >= 5) {
            this.toastService.showToast({ error: null, defaultMsg: 'Đã đạt tối đa 5 ảnh', title: 'Cảnh báo' });
            return;
        }

        if (this.modalMode === 'edit' && this.currentEvent?.id) {
            this.eventService.addImageUrl(this.currentEvent.id, this.newImageUrl).subscribe({
                next: (response: ApiResponse) => {
                    const img = response.data;
                    this.eventImages.push({ id: img.id, image_url: img.image_url, image_type: 'url', display_order: img.display_order });

                    // Cập nhật thumbnail nếu cần
                    if (!this.formData.thumbnail_url) {
                        this.formData.thumbnail_url = img.image_url;
                        // Cập nhật backend
                        this.eventService.setThumbnail(this.currentEvent!.id!, img.id).subscribe();
                    }

                    this.newImageUrl = '';
                    this.toastService.showToast({ error: null, defaultMsg: 'Thêm URL ảnh thành công', title: 'Thành công' });
                },
                error: (error) => this.toastService.showToast({ error, defaultMsg: 'Lỗi thêm URL ảnh', title: 'Lỗi' })
            });
        } else {
            const newImage: EventImageItem = { image_url: this.newImageUrl, image_type: 'url', display_order: this.eventImages.length };
            this.eventImages.push(newImage);

            // Tự động đặt thumbnail nếu là ảnh đầu tiên
            if (!this.formData.thumbnail_url && this.eventImages.length === 1) {
                this.formData.thumbnail_url = this.newImageUrl;
            }

            this.newImageUrl = '';
        }
    }

    removeImage(index: number): void {
        const image = this.eventImages[index];
        const isThumbnail = this.isThumbnailImage(image);

        if (image.id) {
            this.eventService.deleteImage(image.id).subscribe({
                next: () => {
                    this.eventImages.splice(index, 1);
                    this.toastService.showToast({ error: null, defaultMsg: 'Đã xóa ảnh', title: 'Thành công' });

                    // Nếu ảnh vừa xóa là thumbnail, đặt ảnh tiếp theo làm thumbnail
                    if (isThumbnail) {
                        if (this.eventImages.length > 0) {
                            const nextThumb = this.eventImages[0];
                            if (this.modalMode === 'edit' && this.currentEvent?.id && nextThumb.id) {
                                this.eventService.setThumbnail(this.currentEvent.id, nextThumb.id).subscribe(res => {
                                    this.formData.thumbnail_url = nextThumb.image_url;
                                });
                            } else {
                                this.formData.thumbnail_url = nextThumb.image_url;
                            }
                        } else {
                            this.formData.thumbnail_url = '';
                        }
                    }
                },
                error: (error) => this.toastService.showToast({ error, defaultMsg: 'Lỗi xóa ảnh', title: 'Lỗi' })
            });
        } else {
            this.eventImages.splice(index, 1);
            // Chỉ xóa ở Frontend
            if (isThumbnail) {
                this.formData.thumbnail_url = this.eventImages.length > 0 ? this.eventImages[0].image_url : '';
            }
        }
    }

    uploadPendingImages(eventId: number): Observable<any> {
        const pending = this.eventImages.filter(img => !img.id);
        if (pending.length === 0) {
            return of(null); // Không có ảnh chờ, trả về ngay
        }

        const uploadObservables: Observable<any>[] = [];

        pending.forEach(img => {
            if (img.file) {
                uploadObservables.push(this.eventService.uploadImage(eventId, img.file));
            } else if (img.image_type === 'url' && !img.image_url.startsWith('data:')) {
                uploadObservables.push(this.eventService.addImageUrl(eventId, img.image_url));
            }
        });

        if (uploadObservables.length === 0) {
            return of(null);
        }

        return forkJoin(uploadObservables);
    }

    getPreviewImageUrl(image: EventImageItem): string {
        if (image.file) return image.image_url; // Base64
        if (image.image_type === 'url' || image.image_url.startsWith('http')) {
            return image.image_url;
        }
        return `${this.apiBaseUrl}/events/images/${image.image_url}`;
    }

    getImageUrl(url: string): string {
        if (!url) return 'assets/images/placeholder.svg';
        if (url.startsWith('http')) return url;
        return `${this.apiBaseUrl}/events/images/${url}`;
    }

    getDisplayImage(event: Event): string {
        // 1. Ưu tiên thumbnail_url
        if (event.thumbnail_url) {
            return this.getImageUrl(event.thumbnail_url);
        }
        // 2. Nếu không, lấy ảnh đầu tiên trong danh sách
        if (event.images && event.images.length > 0) {
            // Tùy chọn: sắp xếp theo display_order nếu cần, nhưng lấy cái đầu tiên thường là ổn
            // const sortedImages = [...event.images].sort((a, b) => a.display_order - b.display_order);
            return this.getImageUrl(event.images[0].image_url);
        }
        // 3. Ảnh thay thế
        return 'assets/images/placeholder.svg';
    }

    // Kiểm tra xem ảnh có phải là thumbnail hiện tại không
    isThumbnailImage(image: EventImageItem): boolean {
        if (!this.formData.thumbnail_url) return false;
        const thumbnailUrl = this.formData.thumbnail_url;
        // So sánh image_url với thumbnail_url
        return image.image_url === thumbnailUrl ||
            this.getPreviewImageUrl(image) === thumbnailUrl ||
            thumbnailUrl.includes(image.image_url) ||
            image.image_url.includes(thumbnailUrl);
    }

    // Đặt ảnh làm thumbnail
    setAsThumbnail(image: EventImageItem): void {
        if (this.modalMode === 'edit' && this.currentEvent?.id && image.id) {
            // Nếu đang edit, gọi API để set thumbnail
            this.eventService.setThumbnail(this.currentEvent.id, image.id).subscribe({
                next: (response: ApiResponse) => {
                    this.formData.thumbnail_url = image.image_url;
                    this.toastService.showToast({ error: null, defaultMsg: 'Đã đặt ảnh đại diện', title: 'Thành công' });
                },
                error: (error) => this.toastService.showToast({ error, defaultMsg: 'Lỗi đặt ảnh đại diện', title: 'Lỗi' })
            });
        } else {
            // Nếu đang create, chỉ cập nhật local
            this.formData.thumbnail_url = image.image_url;
            this.toastService.showToast({ error: null, defaultMsg: 'Đã chọn ảnh đại diện', title: 'Thành công' });
        }
    }

    // ═══════════════════════════════════════
    // MÃ GIẢM GIÁ
    // ═══════════════════════════════════════

    toggleCoupon(couponId: number): void {
        const idx = this.selectedCouponIds.indexOf(couponId);
        if (idx >= 0) this.selectedCouponIds.splice(idx, 1);
        else this.selectedCouponIds.push(couponId);
    }

    isCouponSelected(couponId: number): boolean {
        return this.selectedCouponIds.includes(couponId);
    }

    // ═══════════════════════════════════════
    // THAO TÁC
    // ═══════════════════════════════════════

    deleteEvent(id: number): void {
        if (confirm('Bạn có chắc muốn xóa sự kiện này?')) {
            this.eventService.deleteEvent(id).subscribe({
                next: () => {
                    this.toastService.showToast({ error: null, defaultMsg: 'Xóa sự kiện thành công!', title: 'Thành công' });
                    this.loadEvents();
                },
                error: (error) => this.toastService.showToast({ error, defaultMsg: 'Lỗi xóa sự kiện', title: 'Lỗi' })
            });
        }
    }

    toggleActive(event: Event): void {
        this.eventService.updateEvent(event.id, { is_active: !event.is_active }).subscribe({
            next: (response) => {
                // Cập nhật trạng thái từ server (quan trọng vì có thể bị soft-validate)
                if (response.data) {
                    event.is_active = response.data.is_active;
                } else {
                    // Fallback nếu không có data (nhưng backend đã fix trả về data)
                    this.loadEvents();
                }

                const message = response.message || (event.is_active ? 'Đã kích hoạt sự kiện' : 'Đã khóa sự kiện');

                // Hiển thị warning nếu message chứa nội dung cảnh báo
                if (message.includes('Tự động tắt') || message.includes('trùng lịch')) {
                    this.toastService.showToast({ error: null, defaultMsg: message, title: 'Cảnh báo' });
                } else {
                    this.toastService.showToast({ error: null, defaultMsg: message, title: 'Thành công' });
                }
            },
            error: (e) => {
                this.toastService.showToast({ error: e, defaultMsg: 'Lỗi cập nhật trạng thái', title: 'Lỗi' });
                // Khôi phục lại giao diện nếu lỗi
                this.loadEvents();
            }
        });
    }

    // ═══════════════════════════════════════
    // VIDEO
    // ═══════════════════════════════════════

    getYouTubeEmbedUrl(url: string): SafeResourceUrl | null {
        if (!url) return null;
        let videoId = '';
        if (url.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(url.split('?')[1]);
            videoId = urlParams.get('v') || '';
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
        } else if (url.includes('youtube.com/embed/')) {
            videoId = url.split('embed/')[1]?.split('?')[0] || '';
        }
        if (!videoId) return null;
        return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
    }

    // ═══════════════════════════════════════
    // HÀM HỖ TRỢ
    // ═══════════════════════════════════════

    private formatDateForInput(dateStr: string | number[]): string {
        if (!dateStr) return '';
        if (Array.isArray(dateStr)) {
            const [y, m, d, h = 0, min = 0] = dateStr;
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        }
        return new Date(dateStr).toISOString().slice(0, 16);
    }

    parseDate(dateStr: string | number[]): Date | null {
        if (!dateStr) return null;
        if (Array.isArray(dateStr)) {
            const [y, m, d, h = 0, min = 0] = dateStr;
            return new Date(y, m - 1, d, h, min);
        }
        return new Date(dateStr);
    }

    private formatDateToLocalString(date: Date): string {
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return date.getFullYear() + '-' +
            pad(date.getMonth() + 1) + '-' +
            pad(date.getDate()) + 'T' +
            pad(date.getHours()) + ':' +
            pad(date.getMinutes()) + ':' +
            pad(date.getSeconds());
    }
}
