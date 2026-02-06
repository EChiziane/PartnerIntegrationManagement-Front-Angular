import {Component, Input, OnInit} from '@angular/core';

import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {PaymentService} from '../../../services/payment.service';
import {Payment} from '../../../models/WSM/payment';
import {Customer} from '../../../models/WSM/customer';
import {CustomerService} from '../../../services/customer.service';

/*import jsPDF from 'jspdf';*/

@Component({
  selector: 'app-payment-details',
  standalone: false,
  templateUrl: './payment-details.component.html',
  styleUrls: ['./payment-details.component.scss']
})
export class PaymentDetailsComponent implements OnInit {

  @Input() paymentId!: string;
  payment!: Payment;
  customer!: Customer;

  constructor(private http: HttpClient,
              private route: ActivatedRoute,
              private paymentService: PaymentService,
              private customerService: CustomerService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.paymentId = params['id'];
    });

    this.getPayment();

  }

  goBack() {
    window.history.back();
  }

  private getPayment() {
    this.paymentService.getPaymentById(this.paymentId).subscribe({
      next: (payment: Payment) => {
        console.log(payment)
        this.payment = payment;
      }
    })
  }

  private getCustomer(id: string) {
    this.customerService.getCustomerById(id).subscribe({
      next: (customer: Customer) => {
        this.customer = customer;

      }
    })
  }
}
