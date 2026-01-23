import { IsNumber } from 'class-validator';

export class CartItemDTO {
    @IsNumber()
    product_id: number;

    @IsNumber()
    quantity: number;

    // ID chi tiết sản phẩm (biến thể: màu, size, xuất xứ)
    product_detail_id?: number;

    constructor(data: any) {
        this.product_id = data.product_id;
        this.quantity = data.quantity;
        this.product_detail_id = data.product_detail_id;
    }
}
