import {Component, Input, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {Payment} from '../../../models/WSM/payment';
import {Customer} from '../../../models/WSM/customer';
import {CustomerService} from '../../../services/customer.service';
import {PaymentService} from '../../../services/payment.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {CustomerPaymentInvoiceService} from '../../../services/customer-payment-invoice.service';
import {NzMessageService} from "ng-zorro-antd/message";
import {NzModalService} from "ng-zorro-antd/modal";


@Component({
    selector: 'app-customer-details',
    standalone: false,
    templateUrl: './customer-details.component.html',
    styleUrl: './customer-details.component.scss'
})
export class CustomerDetailsComponent implements OnInit {
    @Input() customerId!: string;
    customer!: Customer;
    debtMonths: string[] = [];
    paymentDataSource: Payment[] = [];
    listOfDisplayData: Payment[] = [];

    isLoading = false;
    isPaymentDrawerVisible = false;
    paymentForm!: FormGroup;
    paymentDrawerTitle = "Novo Pagamento";
    selectedMonths: string[] = [];
    visible = false;
    searchValue = '';

    drawerWidth: string | number = 720;
    drawerPlacement: 'right' | 'bottom' = 'right';

    constructor(private http: HttpClient,
                private route: ActivatedRoute,
                private fb: FormBuilder,
                private customerService: CustomerService,
                private customerPaymentInvoiceService: CustomerPaymentInvoiceService,
                private paymentService: PaymentService,
                private modal: NzModalService,
                private message: NzMessageService) {


    }

    ngOnInit(): void {
        this.paymentForm = this.fb.group({
            amount: ['', Validators.required],
            unitPrice: [200],
            taxRate: [300],
            numMonths: [1, [Validators.required, Validators.min(1)]],
            paymentMethod: ['', Validators.required]
        });

        this.route.params.subscribe(params => {
            this.customerId = params['id'];
        });
        this.getCustomerPayments();
        this.getCustomer();
        this.updateDrawer();
        window.addEventListener('resize', () => this.updateDrawer());
    }

    updateDrawer() {
        if (window.innerWidth <= 768) {
            this.drawerWidth = '100%';
            this.drawerPlacement = 'bottom';
        } else {
            this.drawerWidth = 720;
            this.drawerPlacement = 'right';
        }
    }

    onNumMonthsChange() {
        const num = this.paymentForm.get('numMonths')?.value || 1;
        const maxMonths = this.customer?.monthsInDebt || 1;

        if (num < 1) {
            this.paymentForm.get('numMonths')?.setValue(1);
            this.selectedMonths = this.debtMonths.slice(0, 1);
        } else if (num > maxMonths) {
            this.paymentForm.get('numMonths')?.setValue(maxMonths);
            this.selectedMonths = this.debtMonths.slice(0, maxMonths);
        } else {
            this.selectedMonths = this.debtMonths.slice(0, num);
        }
    }

    goBack() {
        window.history.back();
    }

    editCustomer() {

    }

    getCustomerPayments() {
        this.isLoading = true;
        this.paymentService.getCustomerPayments(this.customerId).subscribe((payments: Payment[]) => {
            this.paymentDataSource = payments;
            this.isLoading = false;
            this.listOfDisplayData = [...this.paymentDataSource]; // Atualiza após receber os dados
        });
    }

    printPayment(data: Payment) {
        this.customerPaymentInvoiceService.downloadRecibo(data.id).subscribe((fileBlob: Blob) => {
            const url = window.URL.createObjectURL(fileBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.customerName || 'invoice.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        })
    }

    // === Abrir Drawer ===
    openPaymentDrawer() {
        this.isPaymentDrawerVisible = true;
    }

    // === Fechar Drawer ===
    closePaymentDrawer() {
        this.isPaymentDrawerVisible = false;
        this.paymentForm.reset();
    }

    deletePayment(data: Payment) {
        this.modal.confirm({
            nzTitle: 'Confirmar eliminação',
            nzContent: `Tem a certeza que deseja eliminar este pagamento de <strong>${data.customerName}</strong>?`,
            nzOkText: 'Sim, eliminar',
            nzOkDanger: true,
            nzCancelText: 'Cancelar',
            nzOnOk: () => {
                this.paymentService.deletePayment(data.id).subscribe({
                    next: () => {
                        this.message.success('Pagamento eliminado com sucesso ✅');
                        this.getCustomerPayments();
                    },
                    error: () => {
                        this.message.error('Erro ao eliminar o pagamento 🚫');
                    }
                });
            }
        });
    }

    viewPayment(data: Payment) {

    }

    // === Guardar Pagamento ===
    savePayment() {
        if (this.paymentForm.invalid) return;

        const payload = {
            ...this.paymentForm.value,
            customerId: this.customerId
        };
        console.log(payload)
        this.paymentService.addPayment(payload).subscribe({
            next: () => {
                this.getCustomerPayments();
                this.closePaymentDrawer();
            }
        });
    }

    search(): void {
        this.visible = false;
        this.listOfDisplayData = this.listOfDisplayData.filter(
            (item: Payment) => item.customerName.toLowerCase().includes(this.searchValue.toLowerCase())
        );
    }

    reset(): void {
        this.searchValue = '';
        this.search();
    }

    onBack() {
        window.history.back();
    }

    private getCustomer() {
        this.customerService.getCustomerById(this.customerId).subscribe({
            next: (customer: Customer) => {
                this.customer = customer;
                this.calculateDebtMonths();
            }
        })
    }

    private calculateDebtMonths() {
        if (!this.customer || !this.customer.monthsInDebt) return;

        const currentMonth = new Date().getMonth();
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        this.debtMonths = [];
        for (let i = this.customer.monthsInDebt; i > 0; i--) {
            let monthIndex = (currentMonth - i + 12) % 12;
            this.debtMonths.push(monthNames[monthIndex]);
        }
    }
}
