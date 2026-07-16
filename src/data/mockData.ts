import { ParsedScale, UploadSlot, Professional } from "../types";

export const DEFAULT_SLOTS: UploadSlot[] = [
  { id: "slot-1", defaultRole: "MD - Motorista de Dia", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
  { id: "slot-2", defaultRole: "PV - Permanência na Vila Militar", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
  { id: "slot-3", defaultRole: "SD - Segurança e Defesa", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
  { id: "slot-4", defaultRole: "SM - Sobreaviso de Motorista de Dia", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
  { id: "slot-5", defaultRole: "SS - Sobreaviso de Sentinela e Permanência à Vila", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
  { id: "slot-6", defaultRole: "ST - Sentinela", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
  { id: "slot-7", defaultRole: "KF - Operador de KF", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
  { id: "slot-8", defaultRole: "TD - Técnico de Dia", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
  { id: "slot-9", defaultRole: "MC - Motorista de Coletivo", fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null },
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", 
  "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", 
  "Rocha", "Mendes", "Barbosa", "Nunes", "Melo", "Cardoso"
];

const FIRST_NAMES_M = [
  "João", "José", "Francisco", "Carlos", "Paulo", "Lucas", "Luiz", "Marcos", 
  "Mateus", "Rafael", "Rodrigo", "Gabriel", "Bruno", "Felipe", "Daniel"
];

const FIRST_NAMES_F = [
  "Maria", "Ana", "Francisca", "Adriana", "Juliana", "Camila", "Letícia", 
  "Amanda", "Mariana", "Fernanda", "Patrícia", "Aline", "Bruna", "Beatriz"
];

export function generateRandomName(): string {
  const isMale = Math.random() > 0.5;
  const firstName = isMale 
    ? FIRST_NAMES_M[Math.floor(Math.random() * FIRST_NAMES_M.length)]
    : FIRST_NAMES_F[Math.floor(Math.random() * FIRST_NAMES_F.length)];
  const lastName1 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const lastName2 = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  
  return lastName1 !== lastName2 
    ? `${firstName} ${lastName1} ${lastName2}`
    : `${firstName} ${lastName1}`;
}

export function generateMockScale(role: string, month: number, year: number): ParsedScale {
  const numDays = new Date(year, month + 1, 0).getDate();
  const numProfessionals = 4 + Math.floor(Math.random() * 5); // 4 to 8 professionals
  
  const professionals = Array.from({ length: numProfessionals }).map(() => {
    const name = generateRandomName();
    const days: { day: number; shift: string }[] = [];
    
    // Choose a schedule pattern: 
    // Pattern 1: Plantão 12x36 par
    // Pattern 2: Plantão 12x36 ímpar
    // Pattern 3: Diário (M-F) Manhã (M) ou Tarde (T)
    // Pattern 4: Fins de semana apenas
    const pattern = Math.floor(Math.random() * 4);
    
    if (pattern === 0) {
      // 12x36 Even Days
      for (let d = 2; d <= numDays; d += 2) {
        const isNight = Math.random() > 0.5;
        days.push({ day: d, shift: isNight ? "N" : "D" });
      }
    } else if (pattern === 1) {
      // 12x36 Odd Days
      for (let d = 1; d <= numDays; d += 2) {
        const isNight = Math.random() > 0.5;
        days.push({ day: d, shift: isNight ? "N" : "D" });
      }
    } else if (pattern === 2) {
      // Weekdays M-F, mornings (M) or afternoons (T)
      const isMorning = Math.random() > 0.5;
      const shiftCode = isMorning ? "M" : "T";
      for (let d = 1; d <= numDays; d++) {
        const dayOfWeek = new Date(year, month, d).getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
          // 85% attendance
          if (Math.random() > 0.15) {
            days.push({ day: d, shift: shiftCode });
          }
        }
      }
    } else {
      // Weekend warrior (Saturday/Sunday shifts)
      for (let d = 1; d <= numDays; d++) {
        const dayOfWeek = new Date(year, month, d).getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          const shiftType = Math.random() > 0.5 ? "D" : "N";
          days.push({ day: d, shift: shiftType });
        }
      }
    }
    
    return { name, days };
  });

  const monthsBr = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return {
    role,
    month: monthsBr[month],
    year,
    professionals
  };
}

// Convert consolidated schedule grid to CSV
export function exportToCSV(
  professionals: Professional[],
  cellState: { [profId: string]: { [day: number]: string } },
  numDays: number,
  monthLabel: string,
  yearLabel: string,
  location: string
): string {
  const headers = ["Militar"];
  for (let i = 1; i <= numDays; i++) {
    headers.push(`Dia ${i}`);
  }

  const rows = professionals.map((prof) => {
    const row = [prof.name];
    for (let day = 1; day <= numDays; day++) {
      row.push(cellState[prof.id]?.[day] || "");
    }
    return row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",");
  });

  const metadata = [
    `"Relatório Consolidado de Escalas de Serviço"`,
    `"Local/Setor:","${location.replace(/"/g, '""')}"`,
    `"Período:","${monthLabel} / ${yearLabel}"`,
    `"Gerado em:","${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}"`,
    ""
  ];

  // Excel UTF-8 BOM representation: \uFEFF
  return "\uFEFF" + metadata.join("\n") + headers.join(",") + "\n" + rows.join("\n");
}
