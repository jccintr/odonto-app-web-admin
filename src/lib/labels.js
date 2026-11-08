// Textos e cores (por "tom") dos estados e perfis da API.
export const ROLE_LABEL = { admin: 'Administrador', secretary: 'Secretária', dentist: 'Dentista' };

export const APPOINTMENT_STATUS = {
  scheduled: { label: 'Agendado', tone: 'neutral' },
  confirmed: { label: 'Confirmado', tone: 'info' },
  in_progress: { label: 'Em atendimento', tone: 'primary' },
  attended: { label: 'Atendido', tone: 'success' },
  no_show: { label: 'Faltou', tone: 'warning' },
  canceled: { label: 'Cancelado', tone: 'danger' },
};

export const BUDGET_STATUS = {
  open: { label: 'Aguardando aprovação', tone: 'info' },
  approved: { label: 'Em tratamento', tone: 'primary' },
  rejected: { label: 'Recusado', tone: 'danger' },
  completed: { label: 'Concluído', tone: 'success' },
};

export const ITEM_STATUS = {
  proposed: { label: 'Proposto', tone: 'neutral' },
  pending: { label: 'A realizar', tone: 'info' },
  done: { label: 'Realizado', tone: 'success' },
  canceled: { label: 'Cancelado', tone: 'danger' },
};

export const PAYMENT_STATUS = {
  pending: { label: 'A receber', tone: 'info' },
  overdue: { label: 'Vencido', tone: 'danger' },
  paid: { label: 'Recebido', tone: 'success' },
  canceled: { label: 'Cancelado', tone: 'neutral' },
};

export const PAYMENT_METHOD = {
  cash: 'Dinheiro', pix: 'Pix', debit_card: 'Cartão de débito', credit_card: 'Cartão de crédito',
  bank_transfer: 'Transferência', check: 'Cheque', other: 'Outro',
};

export const CONDITION = {
  caries: { label: 'Cárie', color: '#dc2626' },
  restoration: { label: 'Restauração', color: '#2563eb' },
  crown: { label: 'Coroa', color: '#d97706' },
  implant: { label: 'Implante', color: '#0891b2' },
  missing: { label: 'Ausente', color: '#a1a1aa' },
  extracted: { label: 'Extraído', color: '#52525b' },
  root_canal: { label: 'Tratamento de canal', color: '#7c3aed' },
  sealant: { label: 'Selante', color: '#16a34a' },
  fracture: { label: 'Fratura', color: '#ea580c' },
  prosthesis: { label: 'Prótese', color: '#be185d' },
  other: { label: 'Outro', color: '#64748b' },
};

export const IMAGE_KIND = { xray: 'Radiografia', photo: 'Foto', document: 'Documento', other: 'Outro' };
export const RELEASE_ON = { payment: 'Conforme o paciente paga', procedure: 'Quando o procedimento é realizado' };
export const RULE_SOURCE = {
  dentist_procedure: 'Regra do dentista neste procedimento', procedure: 'Regra do procedimento',
  dentist: 'Percentual do dentista', clinic_default: 'Percentual padrão da clínica',
};
export const NOTICE_KIND = { appointment_reminder: 'Lembrete de consulta', budget: 'Orçamento' };
export const NOTICE_STATUS = { pending: { label: 'Enviando', tone: 'info' }, sent: { label: 'Enviado', tone: 'success' }, failed: { label: 'Falhou', tone: 'danger' } };
