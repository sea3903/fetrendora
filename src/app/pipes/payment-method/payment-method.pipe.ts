import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'paymentMethod',
  standalone: true
})
export class PaymentMethodPipe implements PipeTransform {
  transform(method: string): string {
    if (!method) return '';
    const labels: { [key: string]: string } = {
      'cod': 'COD',
      'vnpay': 'VNPay',
      'sepay': 'SePay'
    };
    return labels[method] || method;
  }
}
