import { UF, Municipality, Neighborhood, Leader, Supporter } from '../types';

export const INITIAL_UFS: UF[] = [
  { id: 'sp', name: 'São Paulo', code: 'SP' },
  { id: 'rj', name: 'Rio de Janeiro', code: 'RJ' },
  { id: 'mg', name: 'Minas Gerais', code: 'MG' },
  { id: 'rs', name: 'Rio Grande do Sul', code: 'RS' },
  { id: 'ba', name: 'Bahia', code: 'BA' }
];

export const INITIAL_MUNICIPALITIES: Municipality[] = [
  { id: 'mun-sp-1', ufId: 'sp', name: 'São Paulo (Capital)' },
  { id: 'mun-sp-2', ufId: 'sp', name: 'Campinas' },
  { id: 'mun-sp-3', ufId: 'sp', name: 'Guarulhos' },
  { id: 'mun-rj-1', ufId: 'rj', name: 'Rio de Janeiro (Capital)' },
  { id: 'mun-rj-2', ufId: 'rj', name: 'Niterói' },
  { id: 'mun-mg-1', ufId: 'mg', name: 'Belo Horizonte' },
  { id: 'mun-mg-2', ufId: 'mg', name: 'Uberlândia' }
];

export const INITIAL_NEIGHBORHOODS: Neighborhood[] = [
  { id: 'nei-1', municipalityId: 'mun-sp-1', name: 'Pinheiros' },
  { id: 'nei-2', municipalityId: 'mun-sp-1', name: 'Paulista / Centro' },
  { id: 'nei-3', municipalityId: 'mun-sp-1', name: 'Itaim Bibi' },
  { id: 'nei-4', municipalityId: 'mun-sp-1', name: 'Moema' },
  { id: 'nei-5', municipalityId: 'mun-sp-2', name: 'Cambuí' },
  { id: 'nei-6', municipalityId: 'mun-sp-2', name: 'Barão Geraldo' },
  { id: 'nei-7', municipalityId: 'mun-rj-1', name: 'Copacabana' },
  { id: 'nei-8', municipalityId: 'mun-rj-1', name: 'Barra da Tijuca' },
  { id: 'nei-9', municipalityId: 'mun-mg-1', name: 'Savassi' },
  { id: 'nei-10', municipalityId: 'mun-mg-1', name: 'Pampulha' }
];

export const INITIAL_LEADERS: Leader[] = [
  {
    id: 'lead-1',
    name: 'Carlos Alberto Silva',
    phone: '(11) 98765-4321',
    uf: 'SP',
    municipalityId: 'mun-sp-1',
    neighborhoodId: 'nei-1',
    macroGoal: 500,
    notes: 'Liderança comunitária atuante no comércio local e associações de bairro.',
    createdAt: '2026-01-10'
  },
  {
    id: 'lead-2',
    name: 'Mariana Costa Santos',
    phone: '(11) 97123-8899',
    uf: 'SP',
    municipalityId: 'mun-sp-1',
    neighborhoodId: 'nei-2',
    macroGoal: 350,
    notes: 'Coordenadora de movimentos estudantis e servidores públicos.',
    createdAt: '2026-01-12'
  },
  {
    id: 'lead-3',
    name: 'Roberto de Souza',
    phone: '(19) 99222-1133',
    uf: 'SP',
    municipalityId: 'mun-sp-2',
    neighborhoodId: 'nei-5',
    macroGoal: 400,
    notes: 'Líder sindical e apoiador na região metropolitana de Campinas.',
    createdAt: '2026-01-15'
  },
  {
    id: 'lead-4',
    name: 'Juliana Mendes',
    phone: '(21) 98888-4455',
    uf: 'RJ',
    municipalityId: 'mun-rj-1',
    neighborhoodId: 'nei-7',
    macroGoal: 600,
    notes: 'Ativista social na Zona Sul do Rio.',
    createdAt: '2026-01-18'
  },
  {
    id: 'lead-5',
    name: 'Marcos Vinicius',
    phone: '(31) 99111-2233',
    uf: 'MG',
    municipalityId: 'mun-mg-1',
    neighborhoodId: 'nei-9',
    macroGoal: 300,
    notes: 'Empresário e articulador na Savassi.',
    createdAt: '2026-01-20'
  }
];

export const INITIAL_SUPPORTERS: Supporter[] = [
  {
    id: 'sup-1',
    name: 'Ana Paula Ribeiro',
    phone: '(11) 91111-1234',
    uf: 'SP',
    municipalityId: 'mun-sp-1',
    neighborhoodId: 'nei-1',
    leaderId: 'lead-1',
    microGoal: 15,
    status: 'Confirmado',
    notes: 'Comprometeu a família e vizinhos.',
    createdAt: '2026-01-11'
  },
  {
    id: 'sup-2',
    name: 'Bruno Lima',
    phone: '(11) 92222-5678',
    uf: 'SP',
    municipalityId: 'mun-sp-1',
    neighborhoodId: 'nei-1',
    leaderId: 'lead-1',
    microGoal: 20,
    status: 'Convertido',
    notes: 'Líder de grupo de corrida.',
    createdAt: '2026-01-12'
  },
  {
    id: 'sup-3',
    name: 'Camila Duarte',
    phone: '(11) 93333-9012',
    uf: 'SP',
    municipalityId: 'mun-sp-1',
    neighborhoodId: 'nei-2',
    leaderId: 'lead-2',
    microGoal: 10,
    status: 'Pendente',
    notes: 'Aguardando confirmação de agenda.',
    createdAt: '2026-01-13'
  },
  {
    id: 'sup-4',
    name: 'Diego Farias',
    phone: '(19) 94444-3456',
    uf: 'SP',
    municipalityId: 'mun-sp-2',
    neighborhoodId: 'nei-5',
    leaderId: 'lead-3',
    microGoal: 25,
    status: 'Confirmado',
    notes: 'Comércio local integrado.',
    createdAt: '2026-01-16'
  },
  {
    id: 'sup-5',
    name: 'Fernanda Vasconcelos',
    phone: '(21) 95555-7890',
    uf: 'RJ',
    municipalityId: 'mun-rj-1',
    neighborhoodId: 'nei-7',
    leaderId: 'lead-4',
    microGoal: 30,
    status: 'Confirmado',
    notes: 'Rede de contatos em Copacabana.',
    createdAt: '2026-01-19'
  },
  {
    id: 'sup-6',
    name: 'Gabriel Nogueira',
    phone: '(31) 96666-4321',
    uf: 'MG',
    municipalityId: 'mun-mg-1',
    neighborhoodId: 'nei-9',
    leaderId: 'lead-5',
    microGoal: 18,
    status: 'Indeciso',
    notes: 'Em negociação.',
    createdAt: '2026-01-21'
  }
];
