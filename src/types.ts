export interface CandidateConfig {
  candidateName: string;
  ballotNumber: string;
  activationCode: string;
  activated: boolean;
  party?: string;
  office?: string; // e.g. "Deputado Estadual", "Vereador", "Prefeito"
}

export interface UF {
  id: string;
  name: string;
  code: string; // e.g. "SP", "RJ", "MG"
}

export interface Municipality {
  id: string;
  ufId: string;
  name: string;
}

export interface Neighborhood {
  id: string;
  municipalityId: string;
  name: string;
}

export interface Leader {
  id: string;
  name: string;
  phone: string;
  uf: string;
  municipalityId: string;
  neighborhoodId: string;
  macroGoal: number; // Meta Macro of votes committed by leader
  notes?: string;
  createdAt: string;
}

export interface Supporter {
  id: string;
  name: string;
  phone: string;
  uf: string;
  municipalityId: string;
  neighborhoodId: string;
  leaderId: string; // Linked Leader
  microGoal: number; // Meta Micro (vote commitment, usually 1 to N family/friends)
  status: 'Confirmado' | 'Pendente' | 'Indeciso' | 'Convertido';
  voted?: boolean;
  notes?: string;
  createdAt: string;
}

export interface FilterState {
  uf: string;
  municipalityId: string;
  neighborhoodId: string;
  leaderId: string;
  status: string;
  search: string;
}
