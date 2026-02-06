import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Payment} from '../../models/WSM/payment';
import {CustomerService} from '../../services/customer.service';
import {PaymentService} from '../../services/payment.service';
import {Customer} from '../../models/WSM/customer';
import {Recibo} from '../../models/WSM/Recibo';
import {ReciboService} from '../../services/recibo.service';
import {NzMessageService} from 'ng-zorro-antd/message';
import {NzModalService} from 'ng-zorro-antd/modal';
import {CustomerPaymentInvoiceService} from '../../services/customer-payment-invoice.service';


@Component({
  selector: 'app-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
})
export class PaymentComponent implements OnInit {

  dataSource: Payment[] = []; // Inicializado como array vazio
  listOfDisplayData: Payment[] = [];

  totalPayments = 0;
  confirmedPayments = 0;
  unconfirmedPayments = 0;
  isPaymentDrawerVisible = false;

  paymentForm!: FormGroup;

  drawerWidth: string | number = 720;
  drawerPlacement: 'right' | 'bottom' = 'right';
  searchValue = '';

  selectedCustomer: Customer | null = null;


  paymentDrawerTitle = "Novo Pagamento";
  customer!: Customer;
  debtMonths: string[] = [];
  isLoading = false;
  selectedMonths: string[] = [];
  allCustomers: Customer[] = [];

  constructor(
    private paymentService: PaymentService,
    private customerService: CustomerService,
    private customerPaymentInvoiceService: CustomerPaymentInvoiceService,
    private reciboService: ReciboService,
    private message: NzMessageService,
    private fb: FormBuilder,
    private modal: NzModalService
  ) {
  }

  ngOnInit(): void {

    this.customerService.getCustomers().subscribe(customers => {
      this.allCustomers = customers;
    });


    this.paymentForm = this.fb.group({
      customerId: ['', Validators.required],
      amount: ['', Validators.required],
      numMonths: [1, [Validators.required, Validators.min(1)]],
      paymentMethod: ['', Validators.required]
    });


    this.getPayments();

    this.updateDrawer();
    window.addEventListener('resize', () => this.updateDrawer());
// Carrega os clientes
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

  // === Abrir Drawer ===
  openPaymentDrawer() {
    this.isPaymentDrawerVisible = true;
  }


  // === Fechar Drawer ===
  closePaymentDrawer() {
    this.isPaymentDrawerVisible = false;
    this.paymentForm.reset();
  }

  onCustomerSelect(customerId: string) {
    this.customerService.getCustomerById(customerId).subscribe(c => {
      this.selectedCustomer = c;
      this.buildDebtMonths();
      this.onNumMonthsChange();
    });
  }

  buildDebtMonths() {
    if (!this.selectedCustomer || !this.selectedCustomer.monthsInDebt) return;

    const currentMonth = new Date().getMonth();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    this.debtMonths = [];
    for (let i = this.selectedCustomer.monthsInDebt; i > 0; i--) {
      let index = (currentMonth - i + 12) % 12;
      this.debtMonths.push(monthNames[index]);
    }
  }

  getPayments() {
    this.isLoading = true;
    this.paymentService.getPayments().subscribe((payments: Payment[]) => {
      this.dataSource = payments;
      console.log(payments)
      this.isLoading = false;
      this.listOfDisplayData = [...this.dataSource]; // Atualiza após receber os dados
      this.calculatePaymentStats();
    });
  }

  calculatePaymentStats() {
    this.totalPayments = this.dataSource.length;
    this.confirmedPayments = this.dataSource.filter(
      (payment) => payment.confirmed
    ).length;
    this.unconfirmedPayments = this.dataSource.filter(
      (payment) => !payment.confirmed
    ).length;
  }

  reset(): void {
    this.searchValue = '';
    this.filterData();
  }

  filterData(): void {
    this.listOfDisplayData = this.dataSource.filter((item: Payment) => {
      const customer = this.dataSource.find(c => c.id === item.customerId);
      return customer?.customer.name.toLowerCase().includes(this.searchValue.toLowerCase());
    });
  }

  // ========= Navigation =========
  onBack() {
    window.history.back();
  }

  printPayment(payment: Payment): void {
    this.paymentService.printInvoice(payment.id).subscribe({})
  }

  getDownloadUrl(recibo: Recibo) {
    this.reciboService.downloadRecibo(recibo.id).subscribe((fileBlob: Blob) => {
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = recibo.fileName; // ou qualquer nome
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  createRecibo(payment: Payment) {

    {
      this.reciboService.addRecibo(payment.id).subscribe({
        next: (newRecibo) => {
          this.message.success('Recibo criado com sucesso! ✅');
        },
        error: () => {
          this.message.error('Erro ao criar recibo. 🚫');
        }
      });
    }
  }

  public createPayment() {
    if (this.paymentForm.invalid) {
      console.error('Erro: O formulário contém campos inválidos.');
      return;
    }

    this.paymentService.addPayment(this.paymentForm.value).subscribe({
      next: (newPayment) => {
        console.log('Form Data:', this.paymentForm.value);
        console.log('Pagamento adicionado com sucesso:', newPayment);
        this.getPayments();
        this.dataSource = [...this.dataSource, newPayment];
        this.listOfDisplayData = [...this.dataSource]; // Atualiza a tabela
        this.calculatePaymentStats(); // Atualiza os dados estatísticos
        this.paymentForm.reset({confirmed: false}); // Reseta o formulário
        this.closePaymentDrawer(); // Fecha o modal
      },
      error: (err) => {
        console.error('Erro ao adicionar pagamento:', err);
      },
    });
  }

  deletePayment(data: Payment) {
  }

  createCustomerPaymentInvoice(payment: any) {
    this.customerPaymentInvoiceService.createCustomerPaymentInvoice(payment).subscribe(
      {}
    )
  }

  // ===================== DOWNLOAD =====================
  downloadCustomerPaymentInvoice(invoice: any) {
    this.customerPaymentInvoiceService.downloadRecibo(invoice.id).subscribe((fileBlob: Blob) => {
      const url = window.URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = invoice.fileName || 'invoice.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  editPayment(data: Payment) {
  }

  viewPayment(data: Payment) {
  }

  onNumMonthsChange() {
    const num = this.paymentForm.get('numMonths')?.value || 1;
    const max = this.selectedCustomer?.monthsInDebt || 1;

    if (num < 1) {
      this.paymentForm.get('numMonths')?.setValue(1);
      this.selectedMonths = this.debtMonths.slice(0, 1);
    } else if (num > max) {
      this.paymentForm.get('numMonths')?.setValue(max);
      this.selectedMonths = this.debtMonths.slice(0, max);
    } else {
      this.selectedMonths = this.debtMonths.slice(0, num);
    }
  }

  // === Guardar Pagamento ===
  savePayment() {
    if (this.paymentForm.invalid) return;

    const payload = {
      ...this.paymentForm.value,
      months: this.selectedMonths
    };

    this.paymentService.addPayment(payload).subscribe(() => {
      this.getPayments();
      this.closePaymentDrawer();
    });
  }


}


/* No HTML, adicione o evento (input) ao campo de pesquisa: */
// <input class="input-flex" nz-input placeholder="Search by customer name" type="text" [(ngModel)]="searchValue" (input)="filterData()"/>
