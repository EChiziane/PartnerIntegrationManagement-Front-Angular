import {Component} from '@angular/core';
import {Router} from '@angular/router';

type MaterialKey = 'areia_grossa' | 'areia_vermelha' | 'pedra_34' | 'pedra_sarrisca' | 'po_de_pedra';

interface MaterialItem {
  key: MaterialKey;
  title: string;
  subtitle: string;
  icon: string;
  highlights: string[];
  whatsappText: string;
}

@Component({
  selector: 'app-landingpage',
  standalone: false,
  templateUrl: './landingpage.component.html',
  styleUrls: ['./landingpage.component.scss']
})
export class LandingPageComponent {
  menuVisible = false;

  isQuoteModalVisible = false;

  companyName = 'Transportes Chiziane';
  whatsappNumber = '258845098583';
  phoneDisplay = '+258 845 098 583';

  capacities = ['4m³', '7m³', '18m³', '22m³', '24m³'];

  quoteName = '';
  quotePhone = '';
  quoteLocation = '';
  quoteMaterial: MaterialKey = 'areia_grossa';
  quoteCapacity = '7m³';

  // ✅ IMAGEM (a tua) como fundo do slide
  heroSlides = [
    {
      title: 'Materiais de Construção com Entrega Rápida',
      subtitle: 'Areia grossa · Areia vermelha · Pedra 3/4 · Pedra sarrisca · Pó de pedra',
      image: 'landing/slide-1.jpg'
    }
  ];

  materials: MaterialItem[] = [
    {
      key: 'areia_grossa',
      title: 'Areia Grossa',
      subtitle: 'Ideal para betão, assentamento e obras estruturais.',
      icon: 'build',
      highlights: ['Óptima granulometria', 'Boa compactação', 'Alta procura em obra'],
      whatsappText: 'Quero encomendar Areia Grossa'
    },
    {
      key: 'areia_vermelha',
      title: 'Areia Vermelha',
      subtitle: 'Indicada para reboco, acabamento e obras gerais.',
      icon: 'bg-colors',
      highlights: ['Boa trabalhabilidade', 'Excelente para reboco', 'Acabamento uniforme'],
      whatsappText: 'Quero encomendar Areia Vermelha'
    },
    {
      key: 'pedra_34',
      title: 'Pedra 3/4',
      subtitle: 'Brita forte para betão e fundações.',
      icon: 'appstore',
      highlights: ['Resistência elevada', 'Base sólida', 'Obra mais segura'],
      whatsappText: 'Quero encomendar Pedra 3/4'
    },
    {
      key: 'pedra_sarrisca',
      title: 'Pedra Sarrisca',
      subtitle: 'Material versátil para bases e enchimentos.',
      icon: 'layout',
      highlights: ['Boa para base', 'Excelente para enchimento', 'Fácil aplicação'],
      whatsappText: 'Quero encomendar Pedra Sarrisca'
    },
    {
      key: 'po_de_pedra',
      title: 'Pó de Pedra',
      subtitle: 'Perfeito para nivelamento e acabamento de base.',
      icon: 'filter',
      highlights: ['Nivelamento eficiente', 'Acabamento limpo', 'Óptimo custo-benefício'],
      whatsappText: 'Quero encomendar Pó de Pedra'
    }
  ];

  constructor(private router: Router) {
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  scrollTo(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  openWhatsApp(text: string): void {
    const url = `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  showQuoteModal(material?: MaterialKey): void {
    if (material) this.quoteMaterial = material;
    this.isQuoteModalVisible = true;
  }

  closeQuoteModal(): void {
    this.isQuoteModalVisible = false;
  }

  quickWhatsAppDirect(): void {
    this.openWhatsApp(
      `Olá ${this.companyName}! Quero uma cotação de materiais (areia/pedra). Podem enviar disponibilidade e valores?`
    );
  }

  submitQuickQuote(): void {
    const materialLabel = this.materials.find(m => m.key === this.quoteMaterial)?.title ?? 'Material';
    const phone = this.normalizeMozPhone(this.quotePhone);

    const msg =
      `Olá ${this.companyName}!\n` +
      `Quero cotação / encomenda:\n` +
      `• Material: ${materialLabel}\n` +
      `• Quantidade: ${this.quoteCapacity}\n` +
      (this.quoteLocation ? `• Local de entrega: ${this.quoteLocation}\n` : '') +
      (this.quoteName ? `• Nome: ${this.quoteName}\n` : '') +
      (phone ? `• Contacto: ${phone}\n` : '') +
      `\nPodem confirmar disponibilidade e o valor total com entrega?`;

    this.openWhatsApp(msg);
    this.closeQuoteModal();
  }

  ctaMaterial(item: MaterialItem): void {
    this.showQuoteModal(item.key);
  }

  private normalizeMozPhone(input: string): string {
    if (!input) return '';
    const digits = input.replace(/\D/g, '');
    if (digits.length === 9) return `+258 ${digits}`;
    if (digits.length === 12 && digits.startsWith('258')) return `+${digits}`;
    return input.trim();
  }
}
