import React, { useState, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ChevronRight, 
  Info, 
  Users, 
  Check, 
  FileText, 
  Search,
  Filter,
  X,
  Sparkles,
  HelpCircle,
  UserPlus,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Pencil
} from "lucide-react";
import { 
  DEFAULT_SLOTS, 
  generateMockScale, 
  exportToCSV, 
  generateRandomName 
} from "./data/mockData";
import { 
  Professional, 
  UploadSlot, 
  ParsedScale, 
  MonthOption, 
  YearOption,
  CoverageStats,
  Signer
} from "./types";

// Client-side Supabase client initialization (Direct call support for platforms like Vercel)
const clientSupabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL || "";
const clientSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
let clientSupabase: ReturnType<typeof createClient> | null = null;

let rawUrl = clientSupabaseUrlRaw.trim();
let rawKey = clientSupabaseAnonKey.trim();

// 1. Clean quotes if any
if (rawUrl.startsWith('"') && rawUrl.endsWith('"')) {
  rawUrl = rawUrl.slice(1, -1).trim();
} else if (rawUrl.startsWith("'") && rawUrl.endsWith("'")) {
  rawUrl = rawUrl.slice(1, -1).trim();
}

if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
  rawKey = rawKey.slice(1, -1).trim();
} else if (rawKey.startsWith("'") && rawKey.endsWith("'")) {
  rawKey = rawKey.slice(1, -1).trim();
}

// Self-healing: Check if URL is actually a key
let cleanClientSupabaseUrl = rawUrl;
let cleanClientSupabaseAnonKey = rawKey;

if (rawUrl.startsWith("sb_publishable_") || rawUrl.startsWith("sb_secret_")) {
  cleanClientSupabaseAnonKey = rawUrl;
  cleanClientSupabaseUrl = "https://mbfpvjnmbugihvvcsgxq.supabase.co";
}

if (!cleanClientSupabaseAnonKey && (rawUrl.startsWith("sb_publishable_") || rawUrl.startsWith("sb_secret_"))) {
  cleanClientSupabaseAnonKey = rawUrl;
}

if (!cleanClientSupabaseUrl || !cleanClientSupabaseUrl.startsWith("http")) {
  cleanClientSupabaseUrl = "https://mbfpvjnmbugihvvcsgxq.supabase.co";
}

// In case keys are swapped
if (!cleanClientSupabaseUrl.startsWith("http") && cleanClientSupabaseAnonKey.startsWith("http")) {
  const temp = cleanClientSupabaseUrl;
  cleanClientSupabaseUrl = cleanClientSupabaseAnonKey;
  cleanClientSupabaseAnonKey = temp;
}

if (cleanClientSupabaseUrl.endsWith("/rest/v1/")) {
  cleanClientSupabaseUrl = cleanClientSupabaseUrl.slice(0, -9);
} else if (cleanClientSupabaseUrl.endsWith("/rest/v1")) {
  cleanClientSupabaseUrl = cleanClientSupabaseUrl.slice(0, -8);
}
if (cleanClientSupabaseUrl.endsWith("/")) {
  cleanClientSupabaseUrl = cleanClientSupabaseUrl.slice(0, -1);
}

console.log("[Supabase Diagnostic Raw] VITE_SUPABASE_URL length:", clientSupabaseUrlRaw.length);
console.log("[Supabase Diagnostic Raw] VITE_SUPABASE_ANON_KEY length:", clientSupabaseAnonKey.length);
console.log("[Supabase Diagnostic Cleaned] URL:", cleanClientSupabaseUrl || "(empty)");

try {
  if (cleanClientSupabaseUrl && cleanClientSupabaseAnonKey && cleanClientSupabaseUrl.startsWith("http")) {
    clientSupabase = createClient(cleanClientSupabaseUrl, cleanClientSupabaseAnonKey);
    console.log("[Supabase Diagnostic] Client initialized successfully.");
  } else {
    console.warn("[Supabase Diagnostic] Keys missing or invalid for direct connection. URL:", cleanClientSupabaseUrl, "Key length:", cleanClientSupabaseAnonKey.length);
  }
} catch (err) {
  console.error("[Supabase Diagnostic] Failed to initialize client:", err);
}


const MONTHS: MonthOption[] = [
  { value: 0, label: "Janeiro" },
  { value: 1, label: "Fevereiro" },
  { value: 2, label: "Março" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Maio" },
  { value: 5, label: "Junho" },
  { value: 6, label: "Julho" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Setembro" },
  { value: 9, label: "Outubro" },
  { value: 10, label: "Novembro" },
  { value: 11, label: "Dezembro" },
];

const YEARS: YearOption[] = [
  { value: 2025, label: "2025" },
  { value: 2026, label: "2026" },
  { value: 2027, label: "2027" },
  { value: 2028, label: "2028" },
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const SCALE_OPTIONS = [
  { code: "MD", label: "Motorista de Dia" },
  { code: "PV", label: "Permanência na Vila Militar" },
  { code: "SD", label: "Segurança e Defesa" },
  { code: "SM", label: "Sobreaviso de Motorista de Dia" },
  { code: "SS", label: "Sobreaviso de Sentinela e Permanência à Vila" },
  { code: "ST", label: "Sentinela" },
  { code: "KF", label: "Operador de KF" },
  { code: "TD", label: "Técnico de Dia" },
  { code: "MC", label: "Motorista de Coletivo" },
  { code: "AC", label: "SD + TD Acumulado" },
];

const getScaleSigla = (roleText: string): string => {
  const clean = (roleText || "").toUpperCase().trim();
  
  // Check Sobreaviso first to prevent "SOBREAVISO MOTORISTA" or "SOBREAVISO PERMANÊNCIA" from matching "MD" or "PV"
  if (clean.startsWith("SM") || (clean.includes("SOBREAVISO") && (clean.includes("MOTORISTA") || clean.includes("MD")))) return "SM";
  if (clean.startsWith("SS") || (clean.includes("SOBREAVISO") && (clean.includes("SENTINELA") || clean.includes("VILA") || clean.includes("PERMANE") || clean.includes("PV") || clean.includes("SARGENTO")))) return "SS";

  if (clean.startsWith("MD") || clean.includes("MOTORISTA DE DIA")) return "MD";
  if (clean.startsWith("PV") || clean.includes("PERMANÊNCIA") || clean.includes("PERMANENCIA")) return "PV";
  if (clean.startsWith("SD") || clean.includes("SEGURANÇA") || clean.includes("SEGURANCA") || clean.includes("DEFESA")) return "SD";
  if (clean.startsWith("ST") || clean.includes("SENTINELA")) return "ST";
  if (clean.startsWith("KF") || clean.includes("KF")) return "KF";
  if (clean.startsWith("TD") || clean.includes("TÉCNICO DE DIA") || clean.includes("TECNICO DE DIA")) return "TD";
  if (clean.startsWith("MC") || (clean.includes("MOTORISTA") && clean.includes("COLETIVO"))) return "MC";
  if (clean.startsWith("AC") || clean.includes("ACUMULADO")) return "AC";

  if (roleText.includes(" - ")) {
    return roleText.split(" - ")[0].trim();
  }

  return clean.substring(0, 2);
};

const getEasterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const getCellFontColor = (day: number, month: number, year: number): string => {
  // Check special purple days first:
  // 24, 25, 31 de dezembro (month = 11)
  // 01 de janeiro (month = 0)
  if ((month === 11 && (day === 24 || day === 25 || day === 31)) || (month === 0 && day === 1)) {
    return "text-purple-600"; // purple
  }

  // Check Carnival days
  const easter = getEasterSunday(year);
  // Carnival days are Saturday to Tuesday (50 to 47 days before Easter)
  let isCarnaval = false;
  for (let d = 47; d <= 50; d++) {
    const carnavDate = new Date(easter.getTime());
    carnavDate.setDate(easter.getDate() - d);
    if (carnavDate.getFullYear() === year && carnavDate.getMonth() === month && carnavDate.getDate() === day) {
      isCarnaval = true;
      break;
    }
  }

  if (isCarnaval) {
    return "text-purple-600";
  }

  // Check weekday / weekend
  const date = new Date(year, month, day);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return "text-red-600";
  }

  return "text-slate-900"; // weekday
};

const parseLoadedProfessionals = (raw: any[]): Professional[] => {
  if (!raw) return [];
  return raw.map((p) => {
    let rank = p.rank || "";
    let specialty = p.specialty || "";
    let sort_order = p.sort_order || 0;
    let valid_from_month: number | undefined;
    let valid_from_year: number | undefined;
    let valid_until_month: number | undefined;
    let valid_until_year: number | undefined;

    if (p.role && p.role.includes(":::")) {
      const parts = p.role.split(":::");
      rank = parts[0] || "";
      specialty = parts[1] || "";
      if (parts[2] !== undefined) {
        sort_order = parseInt(parts[2], 10) || 0;
      }
      if (parts[3] !== undefined && parts[3] !== "") {
        valid_from_month = parseInt(parts[3], 10);
      }
      if (parts[4] !== undefined && parts[4] !== "") {
        valid_from_year = parseInt(parts[4], 10);
      }
      if (parts[5] !== undefined && parts[5] !== "") {
        valid_until_month = parseInt(parts[5], 10);
      }
      if (parts[6] !== undefined && parts[6] !== "") {
        valid_until_year = parseInt(parts[6], 10);
      }
    } else if (!rank) {
      rank = "";
      specialty = "";
    }
    return {
      ...p,
      rank,
      specialty,
      sort_order,
      valid_from_month,
      valid_from_year,
      valid_until_month,
      valid_until_year,
    };
  });
};

const mapProfessionalsToDb = (profs: any[]) => {
  return profs.map(p => {
    const parts = [
      p.rank || "",
      p.specialty || "",
      p.sort_order || 0,
      p.valid_from_month !== undefined ? p.valid_from_month : "",
      p.valid_from_year !== undefined ? p.valid_from_year : "",
      p.valid_until_month !== undefined ? p.valid_until_month : "",
      p.valid_until_year !== undefined ? p.valid_until_year : ""
    ];
    return {
      id: p.id,
      name: p.name,
      role: parts.join(":::"),
      category: p.category
    };
  });
};

const isProfessionalValidForMonth = (p: any, month: number, year: number): boolean => {
  if (p.valid_from_year !== undefined && p.valid_from_month !== undefined) {
    if (year < p.valid_from_year) return false;
    if (year === p.valid_from_year && month < p.valid_from_month) return false;
  }
  if (p.valid_until_year !== undefined && p.valid_until_month !== undefined) {
    if (year > p.valid_until_year) return false;
    if (year === p.valid_until_year && month > p.valid_until_month) return false;
  }
  return true;
};

const isMonthYearAtOrAfter = (m1: number, y1: number, m2: number, y2: number): boolean => {
  if (y1 > y2) return true;
  if (y1 === y2 && m1 >= m2) return true;
  return false;
};

const getPreviousMonthAndYear = (m: number, y: number) => {
  if (m === 0) {
    return { month: 11, year: y - 1 };
  } else {
    return { month: m - 1, year: y };
  }
};

const healCellState = (cells: any, profs: Professional[], m: number, y: number) => {
  let changed = false;
  const newCells = { ...cells };
  profs.forEach(p => {
    if (p.id.includes("_hist_")) {
      const origId = p.id.split("_hist_")[0];
      if (newCells[origId] && isProfessionalValidForMonth(p, m, y)) {
        newCells[p.id] = newCells[origId];
        delete newCells[origId];
        changed = true;
      }
    }
  });
  return { healedCells: newCells, changed };
};

const healLoadedData = (rawProfs: any[], rawCells: any, m: number, y: number) => {
  const parsedProfs = parseLoadedProfessionals(rawProfs);
  const { healedCells, changed } = healCellState(rawCells, parsedProfs, m, y);
  return { parsedProfs, healedCells, changed };
};

const normalizeStr = (str: string) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const getTargetCategoryForSigla = (sigla: string): "SOLDADOS" | "GRADUADOS" | undefined => {
  const upper = sigla.toUpperCase().trim();
  if (["ST", "MD", "PV", "SM", "SS"].includes(upper)) return "SOLDADOS";
  if (["SD", "TD", "KF", "MC", "AC"].includes(upper)) return "GRADUADOS";
  return undefined;
};

const matchMilitaryName = (parsedName: string, profs: Professional[], category?: "GRADUADOS" | "SOLDADOS") => {
  const cleanParsed = normalizeStr(parsedName);
  if (!cleanParsed) return undefined;

  const filteredProfs = category ? profs.filter(p => p.category === category) : profs;

  // 1. Full exact match including rank, specialty and name
  let found = filteredProfs.find((p) => {
    const fullComb = normalizeStr(`${p.rank || ""} ${p.specialty || ""} ${p.name || ""}`);
    return fullComb === cleanParsed;
  });
  if (found) return found;

  // 2. Match rank and name
  found = filteredProfs.find((p) => {
    const rankNameComb = normalizeStr(`${p.rank || ""} ${p.name || ""}`);
    return rankNameComb === cleanParsed;
  });
  if (found) return found;

  // 3. Match specialty and name
  found = filteredProfs.find((p) => {
    const specNameComb = normalizeStr(`${p.specialty || ""} ${p.name || ""}`);
    return specNameComb === cleanParsed;
  });
  if (found) return found;

  // 4. Match exact name
  found = filteredProfs.find((p) => {
    return normalizeStr(p.name) === cleanParsed;
  });
  if (found) return found;

  // 5. Match if the professional's name is a word ending in cleanParsed
  found = filteredProfs.find((p) => {
    if (!p.name) return false;
    const pNameNorm = normalizeStr(p.name);
    return cleanParsed.endsWith(pNameNorm) && (cleanParsed.length === pNameNorm.length || cleanParsed[cleanParsed.length - pNameNorm.length - 1] === " ");
  });
  if (found) return found;

  // 6. Match if cleanParsed contains the professional's name
  found = filteredProfs.find((p) => {
    if (!p.name) return false;
    const pNameNorm = normalizeStr(p.name);
    return cleanParsed.includes(pNameNorm);
  });
  return found;
};

export default function App() {
  // Main active period and context state
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default to July (index 6)
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default to 2026
  const [locationName, setLocationName] = useState<string>("Escala de Serviço");

  // Supabase & LocalStorage integration state
  const [supabaseConfigured, setSupabaseConfigured] = useState<boolean>(false);
  const [dbSyncStatus, setDbSyncStatus] = useState<'loading' | 'synced' | 'local' | 'error'>('loading');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  const [showSqlSetup, setShowSqlSetup] = useState<boolean>(false);
  const [showVercelSetup, setShowVercelSetup] = useState<boolean>(true);

  // Detect if the app is running in a production or Vercel environment where direct connection is needed
  const isVercelEnvironment = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.hostname.includes("vercel.app") || 
      (!clientSupabase && !supabaseConfigured && window.location.hostname !== "localhost" && !window.location.hostname.includes(".run.app"));
  }, [supabaseConfigured]);

  // Slots state (up to 9 slots for the 9 PDFs)
  const [slots, setSlots] = useState<UploadSlot[]>(() => {
    return DEFAULT_SLOTS.map(slot => ({ ...slot }));
  });

  // Consolidated Professionals and cell duties state
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [cellState, setCellState] = useState<{ [profId: string]: { [day: number]: string } }>({});

  // Active scale category: GRADUADOS or SOLDADOS
  const [activeScale, setActiveScale] = useState<"GRADUADOS" | "SOLDADOS">("GRADUADOS");

  // Custom confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Navigation and UI state
  const [activeTab, setActiveTab] = useState<"grid" | "report">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{ profId: string; day: number } | null>(null);
  const [quickEditValue, setQuickEditValue] = useState<string>("");
  const [indispEndDay, setIndispEndDay] = useState<number>(1);
  const [isLaunchingIndisp, setIsLaunchingIndisp] = useState<boolean>(false);
  const [parecerEndDay, setParecerEndDay] = useState<number>(1);
  const [isLaunchingParecer, setIsLaunchingParecer] = useState<boolean>(false);
  const [expedienteEndDay, setExpedienteEndDay] = useState<number>(1);
  const [isLaunchingExpediente, setIsLaunchingExpediente] = useState<boolean>(false);
  const [selectedDayForPopup, setSelectedDayForPopup] = useState<number | null>(null);

  // Notification and warning overlay state
  const [notification, setNotification] = useState<{ type: "success" | "warning" | "error" | "info"; message: string } | null>(null);

  // Manual entry state
  const [manualName, setManualName] = useState<string>("");

  // Add Military Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addRank, setAddRank] = useState<string>("");
  const [addSpecialty, setAddSpecialty] = useState<string>("");
  const [addName, setAddName] = useState<string>("");

  // Delete Scales Modal state
  const [isDeleteScalesModalOpen, setIsDeleteScalesModalOpen] = useState<boolean>(false);
  const [selectedScalesToDelete, setSelectedScalesToDelete] = useState<string[]>([]);

  // Edit Military Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingProfId, setEditingProfId] = useState<string>("");
  const [editRank, setEditRank] = useState<string>("");
  const [editSpecialty, setEditSpecialty] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [editCategory, setEditCategory] = useState<'GRADUADOS' | 'SOLDADOS'>('GRADUADOS');
  const [editType, setEditType] = useState<"definitive" | "specific_month">("definitive");
  const [editMonth, setEditMonth] = useState<number>(selectedMonth);
  const [editYear, setEditYear] = useState<number>(selectedYear);

  // Delete Military Modal state
  const [isDeleteMilitaryModalOpen, setIsDeleteMilitaryModalOpen] = useState<boolean>(false);
  const [deletingProfId, setDeletingProfId] = useState<string>("");
  const [deletingProfName, setDeletingProfName] = useState<string>("");
  const [deleteType, setDeleteType] = useState<"definitive" | "specific_month">("definitive");
  const [deleteMonth, setDeleteMonth] = useState<number>(selectedMonth);
  const [deleteYear, setDeleteYear] = useState<number>(selectedYear);

  // Print Iframe Warning Modal state
  const [isPrintIframeModalOpen, setIsPrintIframeModalOpen] = useState<boolean>(false);

  // CSV Help Modal state
  const [isCsvHelpModalOpen, setIsCsvHelpModalOpen] = useState<boolean>(false);

  // Signatures Modal state
  const [isSignaturesModalOpen, setIsSignaturesModalOpen] = useState<boolean>(false);
  const [graduadosSigners, setGraduadosSigners] = useState<Signer[]>(() => {
    const saved = localStorage.getItem("military_signers_GRADUADOS");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: "1",
        fullName: "FABIO VALENTIM DA SILVA",
        warName: "VALENTIM",
        rank: "Cap",
        role: "Chefe da Seção"
      },
      {
        id: "2",
        fullName: "ANDRÉ LUIZ COSTA DE SOUZA",
        warName: "ANDRÉ LUIZ",
        rank: "Maj",
        role: "Comandante do DTCEA"
      }
    ];
  });

  const [soldadosSigners, setSoldadosSigners] = useState<Signer[]>(() => {
    const saved = localStorage.getItem("military_signers_SOLDADOS");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: "1",
        fullName: "FABIO VALENTIM DA SILVA",
        warName: "VALENTIM",
        rank: "Cap",
        role: "Chefe da Seção"
      },
      {
        id: "2",
        fullName: "ANDRÉ LUIZ COSTA DE SOUZA",
        warName: "ANDRÉ LUIZ",
        rank: "Maj",
        role: "Comandante do DTCEA"
      }
    ];
  });

  const signers = activeScale === "GRADUADOS" ? graduadosSigners : soldadosSigners;
  const setSigners = (newSigners: Signer[] | ((prev: Signer[]) => Signer[])) => {
    if (activeScale === "GRADUADOS") {
      setGraduadosSigners(newSigners);
    } else {
      setSoldadosSigners(newSigners);
    }
    setIsDirty(true);
  };

  React.useEffect(() => {
    localStorage.setItem("military_signers_GRADUADOS", JSON.stringify(graduadosSigners));
  }, [graduadosSigners]);

  React.useEffect(() => {
    localStorage.setItem("military_signers_SOLDADOS", JSON.stringify(soldadosSigners));
  }, [soldadosSigners]);

  // Unmatched military names modal
  const [unmatchedNamesModal, setUnmatchedNamesModal] = useState<{
    isOpen: boolean;
    names: string[];
    totalImported: number;
  } | null>(null);

  const fileInputRefs = useRef<{ [slotId: string]: HTMLInputElement | null }>({});

  React.useEffect(() => {
    async function loadData() {
      setDbSyncStatus('loading');
      try {
        if (clientSupabase) {
          // Direct client-side connection (perfect for Vercel SPA)
          setSupabaseConfigured(true);
          
          // 1. Fetch professionals
          const { data: mData, error: mError } = await (clientSupabase as any)
            .from("military_professionals")
            .select("*");
          if (mError) throw mError;

          // 2. Fetch monthly scale
          const { data: sData, error: sError } = await (clientSupabase as any)
            .from("military_monthly_scales")
            .select("*")
            .eq("month", selectedMonth)
            .eq("year", selectedYear)
            .maybeSingle();
          if (sError) throw sError;

          const loadedCells = sData?.cell_state || {};
          const { parsedProfs, healedCells, changed } = healLoadedData(mData || [], loadedCells, selectedMonth, selectedYear);
          setProfessionals(parsedProfs);
          setCellState(healedCells);

          // Extract signers (prefer month-specific, fallback to global-signatures, fallback to localStorage, fallback to default)
          let globalGraduados: Signer[] | null = null;
          let globalSoldados: Signer[] | null = null;
          try {
            const { data: gData, error: gError } = await (clientSupabase as any)
              .from("military_monthly_scales")
              .select("*")
              .eq("id", "global-signatures")
              .maybeSingle();
            if (!gError && gData?.cell_state) {
              globalGraduados = gData.cell_state.__graduadosSigners || null;
              globalSoldados = gData.cell_state.__soldadosSigners || null;
            }
          } catch (e) {
            console.warn("Não foi possível carregar assinaturas globais:", e);
          }

          if (loadedCells.__graduadosSigners && loadedCells.__graduadosSigners.length > 0) {
            setGraduadosSigners(loadedCells.__graduadosSigners);
          } else if (globalGraduados && globalGraduados.length > 0) {
            setGraduadosSigners(globalGraduados);
          } else {
            const saved = localStorage.getItem("military_signers_GRADUADOS");
            if (saved) {
              try {
                setGraduadosSigners(JSON.parse(saved));
              } catch (e) { /* ignore */ }
            }
          }

          if (loadedCells.__soldadosSigners && loadedCells.__soldadosSigners.length > 0) {
            setSoldadosSigners(loadedCells.__soldadosSigners);
          } else if (globalSoldados && globalSoldados.length > 0) {
            setSoldadosSigners(globalSoldados);
          } else {
            const saved = localStorage.getItem("military_signers_SOLDADOS");
            if (saved) {
              try {
                setSoldadosSigners(JSON.parse(saved));
              } catch (e) { /* ignore */ }
            }
          }

          if (changed) setIsDirty(true);
          setDbSyncStatus('synced');
        } else {
          // Check Supabase connection status via server-side proxy
          let statusData = { configured: false };
          try {
            const statusRes = await fetch("/api/supabase-status");
            statusData = await statusRes.json();
          } catch (e) {
            console.warn("Backend proxy API offline, relying on local storage fallback.");
          }
          
          setSupabaseConfigured(statusData.configured);

          if (statusData.configured) {
            // 1. Fetch professionals
            const mRes = await fetch("/api/military");
            if (!mRes.ok) {
              const errData = await mRes.json().catch(() => ({}));
              throw new Error(errData.message || `Erro no servidor (${mRes.status}) ao carregar militares.`);
            }
            const mData = await mRes.json();
            if (!mData.success) {
              throw new Error(mData.message || "Falha do Supabase ao retornar militares.");
            }
            let loadedProfs = mData.data || [];

            // 2. Fetch scales
            const sRes = await fetch(`/api/scales?month=${selectedMonth}&year=${selectedYear}`);
            if (!sRes.ok) {
              const errData = await sRes.json().catch(() => ({}));
              throw new Error(errData.message || `Erro no servidor (${sRes.status}) ao carregar escalas.`);
            }
            const sData = await sRes.json();
            if (!sData.success) {
              throw new Error(sData.message || "Falha do Supabase ao retornar escalas.");
            }
            let loadedCells: any = {};
            if (sData.data) {
              loadedCells = sData.data.cell_state || {};
            }

            const { parsedProfs, healedCells, changed } = healLoadedData(loadedProfs, loadedCells, selectedMonth, selectedYear);
            setProfessionals(parsedProfs);
            setCellState(healedCells);

            // Extract signers (prefer month-specific, fallback to global-signatures, fallback to localStorage, fallback to default)
            let globalGraduados: Signer[] | null = null;
            let globalSoldados: Signer[] | null = null;
            try {
              const gRes = await fetch(`/api/scales?month=0&year=0`);
              if (gRes.ok) {
                const gData = await gRes.json();
                if (gData.success && gData.data?.cell_state) {
                  globalGraduados = gData.data.cell_state.__graduadosSigners || null;
                  globalSoldados = gData.data.cell_state.__soldadosSigners || null;
                }
              }
            } catch (e) {
              console.warn("Não foi possível carregar assinaturas globais via proxy:", e);
            }

            if (loadedCells.__graduadosSigners && loadedCells.__graduadosSigners.length > 0) {
              setGraduadosSigners(loadedCells.__graduadosSigners);
            } else if (globalGraduados && globalGraduados.length > 0) {
              setGraduadosSigners(globalGraduados);
            } else {
              const saved = localStorage.getItem("military_signers_GRADUADOS");
              if (saved) {
                try {
                  setGraduadosSigners(JSON.parse(saved));
                } catch (e) { /* ignore */ }
              }
            }

            if (loadedCells.__soldadosSigners && loadedCells.__soldadosSigners.length > 0) {
              setSoldadosSigners(loadedCells.__soldadosSigners);
            } else if (globalSoldados && globalSoldados.length > 0) {
              setSoldadosSigners(globalSoldados);
            } else {
              const saved = localStorage.getItem("military_signers_SOLDADOS");
              if (saved) {
                try {
                  setSoldadosSigners(JSON.parse(saved));
                } catch (e) { /* ignore */ }
              }
            }

            if (changed) setIsDirty(true);
            setDbSyncStatus('synced');
          } else {
            // Fallback to local storage
            const localProfs = localStorage.getItem("military_professionals");
            const localCells = localStorage.getItem(`military_scales_${selectedMonth}_${selectedYear}`);

            const localProfsRaw = localProfs ? JSON.parse(localProfs) : [];
            const localCellsRaw = localCells ? JSON.parse(localCells) : {};
            const { parsedProfs, healedCells, changed } = healLoadedData(localProfsRaw, localCellsRaw, selectedMonth, selectedYear);
            setProfessionals(parsedProfs);
            setCellState(healedCells);

            // Extract signers
            if (localCellsRaw.__graduadosSigners) {
              setGraduadosSigners(localCellsRaw.__graduadosSigners);
            } else {
              const saved = localStorage.getItem("military_signers_GRADUADOS");
              if (saved) {
                try {
                  setGraduadosSigners(JSON.parse(saved));
                } catch (e) { /* ignore */ }
              }
            }
            if (localCellsRaw.__soldadosSigners) {
              setSoldadosSigners(localCellsRaw.__soldadosSigners);
            } else {
              const saved = localStorage.getItem("military_signers_SOLDADOS");
              if (saved) {
                try {
                  setSoldadosSigners(JSON.parse(saved));
                } catch (e) { /* ignore */ }
              }
            }

            if (changed) setIsDirty(true);

            setDbSyncStatus('local');
          }
        }
        setIsDirty(false);
      } catch (err) {
        console.error("Erro ao carregar dados do Supabase:", err);
        setDbSyncStatus('error');
        
        // Fallback safely to local storage on error to keep the app working
        const localProfs = localStorage.getItem("military_professionals");
        const localCells = localStorage.getItem(`military_scales_${selectedMonth}_${selectedYear}`);

        const localProfsRaw = localProfs ? JSON.parse(localProfs) : [];
        const localCellsRaw = localCells ? JSON.parse(localCells) : {};
        const { parsedProfs, healedCells, changed } = healLoadedData(localProfsRaw, localCellsRaw, selectedMonth, selectedYear);
        setProfessionals(parsedProfs);
        setCellState(healedCells);

        // Extract signers
        if (localCellsRaw.__graduadosSigners) {
          setGraduadosSigners(localCellsRaw.__graduadosSigners);
        } else {
          const saved = localStorage.getItem("military_signers_GRADUADOS");
          if (saved) {
            try {
              setGraduadosSigners(JSON.parse(saved));
            } catch (e) { /* ignore */ }
          }
        }
        if (localCellsRaw.__soldadosSigners) {
          setSoldadosSigners(localCellsRaw.__soldadosSigners);
        } else {
          const saved = localStorage.getItem("military_signers_SOLDADOS");
          if (saved) {
            try {
              setSoldadosSigners(JSON.parse(saved));
            } catch (e) { /* ignore */ }
          }
        }

        if (changed) setIsDirty(true);
        
        triggerNotification("error", "Não foi possível conectar ao Supabase (verifique suas tabelas no painel). Operando com dados locais.");
      } finally {
        setInitialLoadDone(true);
      }
    }
    loadData();
  }, [selectedMonth, selectedYear]);

  // Real-time autosave to LocalStorage and debounced save to Supabase
  React.useEffect(() => {
    if (!initialLoadDone) return;

    const payloadCellState = {
      ...cellState,
      __graduadosSigners: graduadosSigners,
      __soldadosSigners: soldadosSigners,
    };

    // LocalStorage save is immediate so local data is always up-to-date
    localStorage.setItem("military_professionals", JSON.stringify(professionals));
    localStorage.setItem(`military_scales_${selectedMonth}_${selectedYear}`, JSON.stringify(payloadCellState));

    // Only sync to Supabase if there are dirty (unsaved) changes
    if (!isDirty) return;

    setDbSyncStatus('loading');

    const handler = setTimeout(async () => {
      try {
        if (clientSupabase) {
          // 1. Save professionals
          if (professionals && professionals.length > 0) {
            const cleanProfs = mapProfessionalsToDb(professionals);
            const { error: mError } = await (clientSupabase as any)
              .from("military_professionals")
              .upsert(cleanProfs, { onConflict: "id" });
            if (mError) throw mError;
          }

          // 2. Save monthly scales
          const id = `scales-${selectedMonth}-${selectedYear}`;
          const { error: sError } = await (clientSupabase as any)
            .from("military_monthly_scales")
            .upsert({
              id,
              month: selectedMonth,
              year: selectedYear,
              cell_state: payloadCellState
            }, { onConflict: "id" });
          if (sError) throw sError;

          // 3. Save global signatures as default
          await (clientSupabase as any)
            .from("military_monthly_scales")
            .upsert({
              id: "global-signatures",
              month: 0,
              year: 0,
              cell_state: {
                __graduadosSigners: graduadosSigners,
                __soldadosSigners: soldadosSigners,
              }
            }, { onConflict: "id" });

          setDbSyncStatus('synced');
          setIsDirty(false);
        } else if (supabaseConfigured) {
          // Save via server-side API proxy
          // 1. Save professionals
          const cleanProfs = mapProfessionalsToDb(professionals);
          const mRes = await fetch("/api/military", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ professionals: cleanProfs }),
          });
          
          // 2. Save monthly scales
          const sRes = await fetch("/api/scales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              month: selectedMonth,
              year: selectedYear,
              cellState: payloadCellState
            }),
          });

          // 3. Save global signatures via server-side API proxy
          await fetch("/api/scales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              month: 0,
              year: 0,
              cellState: {
                __graduadosSigners: graduadosSigners,
                __soldadosSigners: soldadosSigners,
              }
            }),
          });

          if (mRes.ok && sRes.ok) {
            setDbSyncStatus('synced');
            setIsDirty(false);
          } else {
            throw new Error("Erro de resposta do servidor no autosave.");
          }
        } else {
          setDbSyncStatus('local');
          setIsDirty(false);
        }
      } catch (err: any) {
        console.error("Erro no autosave do Supabase:", err);
        setDbSyncStatus('error');
      }
    }, 1500); // 1.5 seconds debounce

    return () => clearTimeout(handler);
  }, [professionals, cellState, graduadosSigners, soldadosSigners, selectedMonth, selectedYear, initialLoadDone, isDirty, supabaseConfigured]);

  // Save current data state to Supabase or LocalStorage
  const handleSaveData = async () => {
    setDbSyncStatus('loading');
    try {
      const payloadCellState = {
        ...cellState,
        __graduadosSigners: graduadosSigners,
        __soldadosSigners: soldadosSigners,
      };

      // Always save a local copy immediately first to prevent ANY data loss
      localStorage.setItem("military_professionals", JSON.stringify(professionals));
      localStorage.setItem(`military_scales_${selectedMonth}_${selectedYear}`, JSON.stringify(payloadCellState));

      if (clientSupabase) {
        // Direct client-side connection save
        // 1. Save professionals
        if (professionals && professionals.length > 0) {
          const cleanProfs = mapProfessionalsToDb(professionals);
          const { error: mError } = await (clientSupabase as any)
            .from("military_professionals")
            .upsert(cleanProfs, { onConflict: "id" });
          if (mError) throw mError;
        }

        // 2. Save monthly scales
        const id = `scales-${selectedMonth}-${selectedYear}`;
        const { error: sError } = await (clientSupabase as any)
          .from("military_monthly_scales")
          .upsert({
            id,
            month: selectedMonth,
            year: selectedYear,
            cell_state: payloadCellState
          }, { onConflict: "id" });
        if (sError) throw sError;

        // 3. Save global signatures as default
        await (clientSupabase as any)
          .from("military_monthly_scales")
          .upsert({
            id: "global-signatures",
            month: 0,
            year: 0,
            cell_state: {
              __graduadosSigners: graduadosSigners,
              __soldadosSigners: soldadosSigners,
            }
          }, { onConflict: "id" });

        setDbSyncStatus('synced');
        setIsDirty(false);
        triggerNotification("success", "Dados salvos e sincronizados diretamente com o Supabase!");
      } else if (supabaseConfigured) {
        // Save via server-side proxy
        // 1. Save professionals
        const cleanProfs = mapProfessionalsToDb(professionals);
        const mRes = await fetch("/api/military", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionals: cleanProfs }),
        });
        
        // 2. Save monthly scales
        const sRes = await fetch("/api/scales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: selectedMonth,
            year: selectedYear,
            cellState: payloadCellState
          }),
        });

        // 3. Save global signatures via server-side proxy
        const gRes = await fetch("/api/scales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: 0,
            year: 0,
            cellState: {
              __graduadosSigners: graduadosSigners,
              __soldadosSigners: soldadosSigners,
            }
          }),
        });

        if (mRes.ok && sRes.ok && gRes.ok) {
          setDbSyncStatus('synced');
          setIsDirty(false);
          triggerNotification("success", "Dados salvos e sincronizados com o Supabase via servidor!");
        } else {
          let errorMsg = "Erro na resposta do servidor.";
          try {
            const mData = !mRes.ok ? await mRes.json() : null;
            const sData = !sRes.ok ? await sRes.json() : null;
            errorMsg = mData?.message || sData?.message || errorMsg;
          } catch (e) {
            console.error("Erro ao ler JSON de erro do servidor:", e);
          }
          throw new Error(errorMsg);
        }
      } else {
        // No Supabase configured, already saved to LocalStorage above
        setDbSyncStatus('local');
        setIsDirty(false);
        triggerNotification("success", "Dados salvos localmente! Configure as credenciais do Supabase para nuvem.");
      }
    } catch (err: any) {
      console.error("Erro ao salvar dados no Supabase:", err);
      setDbSyncStatus('error');
      triggerNotification("error", "Erro ao salvar no Supabase. Para segurança, salvamos uma cópia localmente no seu navegador! Detalhe: " + err.message);
    }
  };

  // Trigger processing on a queued slot
  const handleProcessQueue = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot && slot.fileToProcess) {
      const file = slot.fileToProcess as File;
      const isCsv = file.name.endsWith(".csv") || file.name.endsWith(".txt");
      if (isCsv) {
        handleCsvUpload(slotId, file);
      } else {
        handleFileUpload(slotId, file);
      }
    } else {
      handleContingencyParsing(slotId);
    }
  };

  // Compute total days in selected month and year
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedMonth, selectedYear]);

  // Compute weekday for each day
  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const date = new Date(selectedYear, selectedMonth, dayNum);
      const dayOfWeekNum = date.getDay();
      return {
        day: dayNum,
        weekday: WEEKDAYS[dayOfWeekNum],
        isWeekend: dayOfWeekNum === 0 || dayOfWeekNum === 6,
      };
    });
  }, [daysInMonth, selectedMonth, selectedYear]);

  // Filter active military personnel for the current month and year
  const activeProfessionals = useMemo(() => {
    return professionals.filter((p) => isProfessionalValidForMonth(p, selectedMonth, selectedYear));
  }, [professionals, selectedMonth, selectedYear]);

  // Filter military personnel based on search and active scale
  const filteredProfessionals = useMemo(() => {
    return activeProfessionals
      .filter((p) => {
        return p.category === activeScale && p.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        const orderA = a.sort_order ?? 0;
        const orderB = b.sort_order ?? 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
  }, [activeProfessionals, searchQuery, activeScale]);

  // Sorted lists for the print/report view to preserve user-defined order
  const sortedGraduados = useMemo(() => {
    return activeProfessionals
      .filter((p) => p.category === "GRADUADOS")
      .sort((a, b) => {
        const orderA = a.sort_order ?? 0;
        const orderB = b.sort_order ?? 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
  }, [activeProfessionals]);

  const sortedSoldados = useMemo(() => {
    return activeProfessionals
      .filter((p) => p.category === "SOLDADOS")
      .sort((a, b) => {
        const orderA = a.sort_order ?? 0;
        const orderB = b.sort_order ?? 0;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        return a.name.localeCompare(b.name);
      });
  }, [activeProfessionals]);

  // Show a status notification helper
  const triggerNotification = (type: "success" | "warning" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => prev?.message === message ? null : prev);
    }, 6000);
  };

  // Parse response scales and merge into state
  const handleMergeParsedScale = (parsed: ParsedScale, defaultRole?: string) => {
    const roleToUse = defaultRole || parsed.role || "MD";
    const scaleCode = getScaleSigla(roleToUse);
    const targetCategory = getTargetCategoryForSigla(scaleCode);

    const unregisteredNames: string[] = [];
    const matchedEntries: { profId: string; category: "GRADUADOS" | "SOLDADOS"; days: { day: number; shift: string }[] }[] = [];

    parsed.professionals.forEach((parsedProf) => {
      const cleanName = parsedProf.name.trim();
      if (!cleanName) return;

      // Find in ALL professionals regardless of active category using robust rank + name matching
      const existing = matchMilitaryName(cleanName, activeProfessionals, targetCategory);

      if (existing) {
        matchedEntries.push({
          profId: existing.id,
          category: existing.category,
          days: parsedProf.days
        });
      } else {
        unregisteredNames.push(cleanName);
      }
    });

    if (unregisteredNames.length > 0) {
      throw new Error(`Militar não cadastrado na escala: ${unregisteredNames.join(", ")}`);
    }

    const newCellEntries: { [profId: string]: { [day: number]: string } } = {};
    matchedEntries.forEach((entry) => {
      newCellEntries[entry.profId] = {};
      entry.days.forEach((duty) => {
        if (duty.day >= 1 && duty.day <= daysInMonth) {
          const existingValue = cellState[entry.profId]?.[duty.day] || "";
          let finalSigla = scaleCode;
          const upperSigla = scaleCode.toUpperCase();
          const upperExisting = existingValue.toUpperCase();
          if (
            (upperSigla === "SD" && upperExisting === "TD") ||
            (upperSigla === "TD" && upperExisting === "SD")
          ) {
            finalSigla = "AC";
          }
          newCellEntries[entry.profId][duty.day] = finalSigla;
        }
      });
    });

    // Update cells state, merging with existing values
    setCellState((prev) => {
      const updated = { ...prev };
      Object.keys(newCellEntries).forEach((profId) => {
        updated[profId] = {
          ...(updated[profId] || {}),
          ...newCellEntries[profId],
        };
      });
      return updated;
    });

    setIsDirty(true);
  };

  // Upload and Parse PDF file via Server-Side API
  const handleFileUpload = async (slotId: string, file: File) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    // Update slot status to uploading
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, fileName: file.name, status: "uploading", errorMsg: null } : s))
    );

    // Read file as base64
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(",")[1];

        const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "";
        const monthYearStr = `${monthLabel} de ${selectedYear}`;

        const response = await fetch("/api/parse-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            fileBase64: base64,
            roleName: slot.defaultRole,
            monthYear: monthYearStr,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          if (errData.error === "GEMINI_API_KEY_MISSING") {
            // Self-healing feature: Auto-fallback when API key is missing
            console.warn("GEMINI_API_KEY missing, launching simulated parser fallback.");
            handleContingencyParsing(slotId);
            return;
          }
          throw new Error(errData.message || "Erro desconhecido ao processar arquivo.");
        }

        const data: ParsedScale = await response.json();

        // Check if data is valid
        if (!data || !data.professionals || data.professionals.length === 0) {
          throw new Error("Não foi possível extrair nenhum militar deste PDF.");
        }

        // Merge into scale state
        handleMergeParsedScale(data, slot.defaultRole);

        // Mark slot as success
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  status: "success",
                  roleExtracted: data.role || s.defaultRole,
                  parsedCount: data.professionals.length,
                }
              : s
          )
        );

        triggerNotification(
          "success",
          `Escala "${data.role || slot.defaultRole}" extraída com sucesso! ${data.professionals.length} militares carregados do PDF.`
        );
      } catch (err: any) {
        console.error("Erro na extração de escala:", err);
        setSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, status: "error", errorMsg: err.message } : s))
        );
        triggerNotification(
          "error",
          `Falha ao extrair PDF do slot "${slot.defaultRole}": ${err.message}`
        );
      }
    };

    reader.onerror = () => {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: "error", errorMsg: "Falha de leitura do arquivo local." } : s))
      );
    };

    reader.readAsDataURL(file);
  };

  // Upload and parse CSV file (Client-Side, 100% deterministic, no AI needed)
  const handleCsvUpload = async (slotId: string, file: File) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    // Update slot status to uploading
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, fileName: file.name, status: "uploading", errorMsg: null } : s))
    );

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        // Split by newlines
        const lines = text.split(/\r?\n/);
        if (lines.length < 1) {
          throw new Error("O arquivo CSV ou TXT parece estar vazio.");
        }

        const scaleChanges: { [profId: string]: { [day: number]: string } } = {};
        const dutiesCountBySigla: { [sigla: string]: number } = {};
        const unmatchedNames: string[] = [];
        let totalImported = 0;
        let skippedOtherMonthCount = 0;

        const dateRegex = /^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*$/;

        // Process data rows
        for (let r = 0; r < lines.length; r++) {
          const line = lines[r].trim();
          if (!line) continue;

          // Split by semicolon (or comma as fallback)
          const cols = line.split(line.includes(";") ? ";" : ",").map((c) => c.trim());
          if (cols.length < 3) continue;

          // Check if first column is a valid date (DD/MM/YYYY)
          const match = cols[0].match(dateRegex);
          if (!match) continue; // Ignore header or unstructured meta lines

          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1; // 0-indexed month
          const year = parseInt(match[3], 10);

          // Verify if it matches active period
          if (month !== selectedMonth || year !== selectedYear) {
            skippedOtherMonthCount++;
            continue;
          }

          const rawScale = cols[1];
          if (!rawScale) continue;

          const sigla = getScaleSigla(rawScale);
          if (!sigla) continue;

          const rawMilitaryCol = cols[2];
          if (!rawMilitaryCol) continue;

          // Clean military name up to the first parenthesis
          const cleanMilitaryName = rawMilitaryCol.split("(")[0].trim();
          if (!cleanMilitaryName) continue;

          // Match military member
          const targetCategory = getTargetCategoryForSigla(sigla);
          const matchedProf = matchMilitaryName(cleanMilitaryName, activeProfessionals, targetCategory);

          if (matchedProf) {
            scaleChanges[matchedProf.id] = scaleChanges[matchedProf.id] || {};
            
            const existingValue = scaleChanges[matchedProf.id][day] || cellState[matchedProf.id]?.[day] || "";
            let finalSigla = sigla;
            const upperSigla = sigla.toUpperCase();
            const upperExisting = existingValue.toUpperCase();
            if (
              (upperSigla === "SD" && upperExisting === "TD") ||
              (upperSigla === "TD" && upperExisting === "SD")
            ) {
              finalSigla = "AC";
            }

            scaleChanges[matchedProf.id][day] = finalSigla;

            dutiesCountBySigla[finalSigla] = (dutiesCountBySigla[finalSigla] || 0) + 1;
            totalImported++;
          } else {
            // Do NOT auto-register, keep track of unmatched names
            if (!unmatchedNames.includes(cleanMilitaryName)) {
              unmatchedNames.push(cleanMilitaryName);
            }
          }
        }

        if (totalImported === 0) {
          if (skippedOtherMonthCount > 0) {
            throw new Error(`Nenhum plantão pôde ser carregado. Encontramos ${skippedOtherMonthCount} linhas pertencentes a outro mês/ano. Verifique se o período selecionado (${MONTHS[selectedMonth].label} de ${selectedYear}) corresponde aos dados do arquivo.`);
          } else {
            throw new Error("Não foi identificado nenhum plantão de serviço válido para militares cadastrados neste período.");
          }
        }

        // Apply scale cells with overwriting of existing duties ONLY if there is an overlapping day in the imported file
        setCellState((prev) => {
          const updated = { ...prev };

          // Merge the new assignments, overwriting only overlapping days
          Object.keys(scaleChanges).forEach((pId) => {
            updated[pId] = {
              ...(updated[pId] || {}),
              ...scaleChanges[pId]
            };
          });
          return updated;
        });

        // Update slot status to success for slots that got data
        setSlots((prev) =>
          prev.map((s) => {
            const sSigla = getScaleSigla(s.defaultRole);
            const count = dutiesCountBySigla[sSigla];
            if (count && count > 0) {
              return {
                ...s,
                status: "success",
                fileName: file.name,
                parsedCount: count,
                roleExtracted: s.defaultRole,
                errorMsg: null,
              };
            }
            // If it is the slot that was clicked but didn't receive any data specifically, set it to success if we did import anything, or reset to idle
            if (s.id === slotId) {
              return {
                ...s,
                status: "success",
                fileName: file.name,
                parsedCount: totalImported,
                roleExtracted: s.defaultRole,
                errorMsg: null,
              };
            }
            return s;
          })
        );

        setIsDirty(true);

        if (unmatchedNames.length > 0) {
          setUnmatchedNamesModal({
            isOpen: true,
            names: unmatchedNames,
            totalImported
          });
        } else {
          triggerNotification(
            "success",
            `Importação concluída com sucesso! ${totalImported} plantões de serviço foram atribuídos aos militares.`
          );
        }

      } catch (err: any) {
        console.error("Erro ao analisar arquivo CSV/TXT:", err);
        setSlots((prev) =>
          prev.map((s) => (s.id === slotId ? { ...s, status: "error", errorMsg: err.message || "Erro desconhecido ao processar arquivo." } : s))
        );
        triggerNotification("error", `Erro ao importar arquivo: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: "error", errorMsg: "Falha de leitura do arquivo local." } : s))
      );
    };

    reader.readAsText(file, "UTF-8");
  };

  // Upload and parse unified CSV/TXT file for ALL scales
  const handleUnifiedCsvUpload = async (file: File) => {
    triggerNotification("info", "Iniciando processamento de escala única...");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const text = reader.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length < 1) {
          throw new Error("O arquivo de escala parece estar vazio.");
        }

        const scaleChanges: { [profId: string]: { [day: number]: string } } = {};
        const dutiesCountBySigla: { [sigla: string]: number } = {};
        const unmatchedNames: string[] = [];
        let totalImported = 0;
        let skippedOtherMonthCount = 0;

        const dateRegex = /^\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s*$/;

        for (let r = 0; r < lines.length; r++) {
          const line = lines[r].trim();
          if (!line) continue;

          // Split by semicolon (or comma as fallback)
          const cols = line.split(line.includes(";") ? ";" : ",").map((c) => c.trim());
          if (cols.length < 3) continue;

          // Check if first column is a valid date (DD/MM/YYYY)
          const match = cols[0].match(dateRegex);
          if (!match) continue; // Ignore header/unstructured meta lines

          const day = parseInt(match[1], 10);
          const month = parseInt(match[2], 10) - 1; // 0-indexed month
          const year = parseInt(match[3], 10);

          if (month !== selectedMonth || year !== selectedYear) {
            skippedOtherMonthCount++;
            continue;
          }

          const rawScale = cols[1];
          if (!rawScale) continue;

          const sigla = getScaleSigla(rawScale);
          if (!sigla) continue;

          const rawMilitaryCol = cols[2];
          if (!rawMilitaryCol) continue;

          const cleanMilitaryName = rawMilitaryCol.split("(")[0].trim();
          if (!cleanMilitaryName) continue;

          const targetCategory = getTargetCategoryForSigla(sigla);
          const matchedProf = matchMilitaryName(cleanMilitaryName, activeProfessionals, targetCategory);

          if (matchedProf) {
            scaleChanges[matchedProf.id] = scaleChanges[matchedProf.id] || {};
            
            const existingValue = scaleChanges[matchedProf.id][day] || cellState[matchedProf.id]?.[day] || "";
            let finalSigla = sigla;
            const upperSigla = sigla.toUpperCase();
            const upperExisting = existingValue.toUpperCase();
            if (
              (upperSigla === "SD" && upperExisting === "TD") ||
              (upperSigla === "TD" && upperExisting === "SD")
            ) {
              finalSigla = "AC";
            }

            scaleChanges[matchedProf.id][day] = finalSigla;

            dutiesCountBySigla[finalSigla] = (dutiesCountBySigla[finalSigla] || 0) + 1;
            totalImported++;
          } else {
            if (!unmatchedNames.includes(cleanMilitaryName)) {
              unmatchedNames.push(cleanMilitaryName);
            }
          }
        }

        if (totalImported === 0) {
          if (skippedOtherMonthCount > 0) {
            throw new Error(`Nenhum plantão pôde ser carregado. Encontramos ${skippedOtherMonthCount} linhas de outros meses. Certifique-se de selecionar o mês correto no topo antes de importar.`);
          } else {
            throw new Error("Não foi possível identificar plantões para os militares cadastrados no sistema. Verifique a grafia dos nomes e se já estão cadastrados.");
          }
        }

        // Apply scale cells with overwriting of existing duties ONLY if there is an overlapping day in the imported file
        setCellState((prev) => {
          const updated = { ...prev };

          // Merge the new assignments, overwriting only overlapping days
          Object.keys(scaleChanges).forEach((pId) => {
            updated[pId] = {
              ...(updated[pId] || {}),
              ...scaleChanges[pId]
            };
          });
          return updated;
        });

        // Update slots status
        setSlots((prev) =>
          prev.map((s) => {
            const sSigla = getScaleSigla(s.defaultRole);
            const count = dutiesCountBySigla[sSigla];
            if (count && count > 0) {
              return {
                ...s,
                status: "success",
                fileName: file.name,
                parsedCount: count,
                roleExtracted: s.defaultRole,
                errorMsg: null,
              };
            }
            return s;
          })
        );

        setIsDirty(true);

        if (unmatchedNames.length > 0) {
          setUnmatchedNamesModal({
            isOpen: true,
            names: unmatchedNames,
            totalImported
          });
        } else {
          triggerNotification(
            "success",
            `Escala única importada com sucesso! ${totalImported} plantões foram distribuídos entre as escalas do mês.`
          );
        }

      } catch (err: any) {
        console.error("Erro ao analisar arquivo de escala única:", err);
        triggerNotification("error", `Erro ao importar escala única: ${err.message}`);
      }
    };

    reader.onerror = () => {
      triggerNotification("error", "Falha de leitura do arquivo local.");
    };

    reader.readAsText(file, "UTF-8");
  };

  const downloadCsvTemplate = () => {
    const csvContent = "\uFEFF" + [
      "Boletim para o dia 01/07/2026",
      "DTCEA-PCO",
      "Data;Escala;Escalado;Nome do Posto;",
      "01/07/2026;MD - Motorista de Dia;S2 NE MARTURELLI(7725019) - PCOSA-4 - DTCEA-PCO;",
      "01/07/2026;PV - Permanência na Vila Militar;S2 NE LEANDRO(7726627) - PCOVR - DTCEA-PCO;",
      "01/07/2026;SD - Segurança e Defesa;2S SGS WAYAND(4025091) - PCOSA-2 - DTCEA-PCO;",
      "02/07/2026;ST - Sentinela;S2 NE VALENTE(7640978) - PCOST-5 - DTCEA-PCO;"
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "exemplo_escala_oficial.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("success", "Exemplo de CSV oficial baixado com sucesso!");
  };

  // Contingency parser fallback helper (runs automatically if Gemini key is missing so user experience is not broken)
  const handleContingencyParsing = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              fileName: `Extraido_Contingencia_${slot.defaultRole.replace(/\s+/g, "_")}.pdf`,
              status: "uploading",
              errorMsg: null,
            }
          : s
      )
    );

    setTimeout(() => {
      const simulatedScale = generateMockScale(slot.defaultRole, selectedMonth, selectedYear, professionals);
      handleMergeParsedScale(simulatedScale, slot.defaultRole);

      setSlots((prev) =>
        prev.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: "success",
                roleExtracted: slot.defaultRole,
                parsedCount: simulatedScale.professionals.length,
              }
            : s
        )
      );

      triggerNotification(
        "success",
        `PDF da escala "${slot.defaultRole}" processado via contingência com sucesso! ${simulatedScale.professionals.length} militares carregados.`
      );
    }, 600);
  };

  // Reset/Clear a single slot
  const handleResetSlot = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    const scaleCode = slot.defaultRole.split(" - ")[0] || "MD";

    // Clear duties of this code from all cells
    setCellState((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((profId) => {
        const profCells = { ...updated[profId] };
        Object.keys(profCells).forEach((dayStr) => {
          const day = parseInt(dayStr);
          if (profCells[day] === scaleCode) {
            delete profCells[day];
          }
        });
        updated[profId] = profCells;
      });
      return updated;
    });

    // Reset slot status
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, fileName: null, status: "idle", roleExtracted: null, errorMsg: null, parsedCount: null, fileToProcess: undefined }
          : s
      )
    );

    setIsDirty(true);
    triggerNotification("info", `Escala de "${slot.defaultRole}" foi redefinida.`);
  };

  // Clear data for selected scales
  const handleDeleteScalesConfirm = (scales: string[]) => {
    if (scales.length === 0) {
      triggerNotification("warning", "Selecione pelo menos uma escala para apagar.");
      return;
    }

    const newState: { [profId: string]: { [day: number]: string } } = {};
    
    setCellState((prev) => {
      Object.keys(prev).forEach(profId => {
        const profCells = prev[profId];
        if (profCells) {
          const newProfCells = { ...profCells };
          
          Object.keys(profCells).forEach(dayKey => {
            const day = parseInt(dayKey, 10);
            const val = profCells[day];
            if (scales.includes(val)) {
              delete newProfCells[day];
            }
          });
          
          if (Object.keys(newProfCells).length > 0) {
            newState[profId] = newProfCells;
          }
        }
      });

      // Save to localStorage immediately
      localStorage.setItem(`military_scales_${selectedMonth}_${selectedYear}`, JSON.stringify(newState));
      return newState;
    });

    // Reset slots status of those scales
    setSlots(prev => prev.map(slot => {
      const slotSigla = getScaleSigla(slot.defaultRole);
      if (scales.includes(slotSigla)) {
        return {
          ...slot,
          status: "idle" as const,
          fileName: null,
          progress: 0,
          textData: null,
          error: null,
          parsedCount: null,
          roleExtracted: null,
          fileToProcess: undefined
        };
      }
      return slot;
    }));

    setIsDirty(true);
    triggerNotification("success", "Escalas selecionadas foram apagadas com sucesso.");
    setIsDeleteScalesModalOpen(false);
  };

  // Manual military addition
  const handleAddManualProfessional = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addRank.trim()) {
      triggerNotification("warning", "A graduação do militar é obrigatória.");
      return;
    }
    if (!addName.trim()) {
      triggerNotification("warning", "O nome do militar é obrigatório.");
      return;
    }

    // Calculate max sort_order to append to the end of the list
    const maxSortOrder = professionals
      .filter(p => p.category === activeScale)
      .reduce((max, p) => Math.max(max, p.sort_order || 0), -1);

    const profId = `prof-manual-${Date.now()}`;
    const newProf: Professional = {
      id: profId,
      name: addName.trim(),
      role: `${addRank.trim()}:::${addSpecialty.trim()}:::${maxSortOrder + 1}`,
      category: activeScale,
      rank: addRank.trim(),
      specialty: addSpecialty.trim(),
      sort_order: maxSortOrder + 1,
    };

    setProfessionals((prev) => [...prev, newProf]);
    setAddRank("");
    setAddSpecialty("");
    setAddName("");
    setIsAddModalOpen(false);
    setIsDirty(true);
    triggerNotification("success", `Militar "${addRank.trim()} ${addName.trim()}" adicionado com sucesso.`);
  };

  // Reorder military professionals
  const handleMoveProfessional = (id: string, direction: 'up' | 'down') => {
    // Get all professionals of the active category sorted by order
    const categoryProfs = activeProfessionals
      .filter(p => p.category === activeScale)
      .sort((a, b) => {
        const orderA = a.sort_order ?? 0;
        const orderB = b.sort_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });

    const index = categoryProfs.findIndex(p => p.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoryProfs.length) return;

    // Create a new list where each professional has a defined, sequential sort_order
    const mappedWithOrders = categoryProfs.map((p, idx) => ({
      ...p,
      sort_order: idx
    }));

    // Swap the orders
    const temp = mappedWithOrders[index].sort_order;
    mappedWithOrders[index].sort_order = mappedWithOrders[targetIndex].sort_order;
    mappedWithOrders[targetIndex].sort_order = temp;

    // Merge these updated professionals back into the full professionals array
    setProfessionals((prev) => {
      return prev.map((p) => {
        const updated = mappedWithOrders.find(u => u.id === p.id);
        return updated ? updated : p;
      });
    });

    setIsDirty(true);
  };

  // Open Edit Military Modal
  const handleOpenEditModal = (p: Professional) => {
    setEditingProfId(p.id);
    setEditRank(p.rank || "");
    setEditSpecialty(p.specialty || "");
    setEditName(p.name);
    setEditCategory(p.category);
    setEditType("definitive");
    setEditMonth(selectedMonth);
    setEditYear(selectedYear);
    setIsEditModalOpen(true);
  };

  // Save Edit Military
  const handleSaveEditProfessional = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editRank.trim()) {
      triggerNotification("warning", "A graduação do militar é obrigatória.");
      return;
    }
    if (!editName.trim()) {
      triggerNotification("warning", "O nome do militar é obrigatório.");
      return;
    }

    const p = professionals.find(prof => prof.id === editingProfId);
    if (!p) return;

    if (editType === "definitive") {
      // Definitive edit: update all details globally and keep same validity
      setProfessionals((prev) =>
        prev.map((prof) =>
          prof.id === editingProfId
            ? {
                ...prof,
                name: editName.trim(),
                rank: editRank.trim(),
                specialty: editSpecialty.trim(),
                category: editCategory,
              }
            : prof
        )
      );
    } else {
      // "A partir de Mês" edit
      const prev = getPreviousMonthAndYear(editMonth, editYear);
      const hasPreviousSpan = p.valid_from_year === undefined || 
                              p.valid_from_month === undefined || 
                              !isMonthYearAtOrAfter(p.valid_from_month, p.valid_from_year, editMonth, editYear);

      if (hasPreviousSpan) {
        // Clone for historical span
        const historicalId = `${p.id}_hist_${Date.now()}`;
        const historicalClone: Professional = {
          ...p,
          id: historicalId,
          valid_until_month: prev.month,
          valid_until_year: prev.year,
        };

        const updatedOriginal: Professional = {
          ...p,
          name: editName.trim(),
          rank: editRank.trim(),
          specialty: editSpecialty.trim(),
          category: editCategory,
          valid_from_month: editMonth,
          valid_from_year: editYear,
        };

        setProfessionals((prevProfs) => {
          return prevProfs.flatMap((prof) => {
            if (prof.id === editingProfId) {
              return [historicalClone, updatedOriginal];
            }
            return [prof];
          });
        });
      } else {
        // Just update in-place
        setProfessionals((prevProfs) =>
          prevProfs.map((prof) =>
            prof.id === editingProfId
              ? {
                  ...prof,
                  name: editName.trim(),
                  rank: editRank.trim(),
                  specialty: editSpecialty.trim(),
                  category: editCategory,
                  valid_from_month: editMonth,
                  valid_from_year: editYear,
                }
              : prof
          )
        );
      }
    }

    setIsEditModalOpen(false);
    setIsDirty(true);
    triggerNotification("success", "Militar atualizado com sucesso.");
  };

  // Open Custom Delete Military Modal
  const handleOpenDeleteModal = (id: string, name: string) => {
    setDeletingProfId(id);
    setDeletingProfName(name);
    setDeleteType("definitive");
    setDeleteMonth(selectedMonth);
    setDeleteYear(selectedYear);
    setIsDeleteMilitaryModalOpen(true);
  };

  // Confirm Delete Military
  const handleConfirmDeleteProfessional = async () => {
    const id = deletingProfId;
    const name = deletingProfName;
    try {
      if (deleteType === "definitive") {
        // Remove globally
        setProfessionals((prev) => prev.filter((p) => p.id !== id));
        setCellState((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });

        if (clientSupabase) {
          await (clientSupabase as any).from("military_professionals").delete().eq("id", id);
        } else if (supabaseConfigured) {
          await fetch(`/api/military/${id}`, { method: "DELETE" }).catch(() => {});
        }
        triggerNotification("info", `Militar ${name} foi excluído definitivamente.`);
      } else {
        // "A partir de Mês" deletion
        const prev = getPreviousMonthAndYear(deleteMonth, deleteYear);
        
        // Find the professional
        const p = professionals.find(prof => prof.id === id);
        if (p) {
          // Check if they had a previous span before the starting delete month
          const hasPreviousSpan = p.valid_from_year === undefined || 
                                  p.valid_from_month === undefined || 
                                  !isMonthYearAtOrAfter(p.valid_from_month, p.valid_from_year, deleteMonth, deleteYear);
          
          if (hasPreviousSpan) {
            // Set valid_until to previous month
            setProfessionals((prevProfs) =>
              prevProfs.map((prof) =>
                prof.id === id
                  ? {
                      ...prof,
                      valid_until_month: prev.month,
                      valid_until_year: prev.year,
                    }
                  : prof
              )
            );
          } else {
            // If they did not exist before the delete month anyway, remove them completely!
            setProfessionals((prevProfs) => prevProfs.filter((prof) => prof.id !== id));
            
            if (clientSupabase) {
              await (clientSupabase as any).from("military_professionals").delete().eq("id", id);
            } else if (supabaseConfigured) {
              await fetch(`/api/military/${id}`, { method: "DELETE" }).catch(() => {});
            }
          }

          // If the loaded month is at or after the deletion start month, clear their cells
          if (isMonthYearAtOrAfter(selectedMonth, selectedYear, deleteMonth, deleteYear)) {
            setCellState((prevCells) => {
              const copy = { ...prevCells };
              delete copy[id];
              return copy;
            });
          }
          
          triggerNotification("info", `Militar ${name} foi excluído a partir de ${MONTHS[deleteMonth].label}/${deleteYear}.`);
        }
      }
      setIsDirty(true);
    } catch (err) {
      console.error("Erro ao excluir militar:", err);
      triggerNotification("error", "Ocorreu um erro ao excluir o militar.");
    } finally {
      setIsDeleteMilitaryModalOpen(false);
    }
  };

  // Cell Edit Actions
  const handleCellClick = (profId: string, day: number) => {
    setEditingCell({ profId, day });
    setQuickEditValue(cellState[profId]?.[day] || "");
    setIsLaunchingIndisp(false);
    setIndispEndDay(day);
    setIsLaunchingParecer(false);
    setParecerEndDay(day);
    setIsLaunchingExpediente(false);
    setExpedienteEndDay(day);
  };

  const handleCellSave = (profId: string, day: number, value: string) => {
    setCellState((prev) => ({
      ...prev,
      [profId]: {
        ...(prev[profId] || {}),
        [day]: value.toUpperCase(),
      },
    }));
    setEditingCell(null);
    setIsDirty(true);
  };

  const handleQuickSelectShift = (profId: string, day: number, shift: string) => {
    handleCellSave(profId, day, shift);
  };

  const handleLaunchIndisponibilidade = (profId: string, startDay: number, endDay: number) => {
    if (endDay < startDay) {
      triggerNotification("error", "O dia final não pode ser anterior ao dia inicial.");
      return;
    }
    setCellState((prev) => {
      const updatedProfCells = { ...(prev[profId] || {}) };
      for (let d = startDay; d <= endDay; d++) {
        updatedProfCells[d] = "INDISP";
      }
      return {
        ...prev,
        [profId]: updatedProfCells,
      };
    });
    setEditingCell(null);
    setIsDirty(true);
    triggerNotification("success", "Indisponibilidade lançada com sucesso!");
  };

  const handleClearIndisponibilidade = (profId: string, clickedDay: number) => {
    setCellState((prev) => {
      const profCells = prev[profId] || {};
      const updatedProfCells = { ...profCells };
      
      updatedProfCells[clickedDay] = "";
      
      // Go left
      let d = clickedDay - 1;
      while (d >= 1 && profCells[d] === "INDISP") {
        updatedProfCells[d] = "";
        d--;
      }
      
      // Go right
      d = clickedDay + 1;
      while (d <= daysInMonth && profCells[d] === "INDISP") {
        updatedProfCells[d] = "";
        d++;
      }
      
      return {
        ...prev,
        [profId]: updatedProfCells,
      };
    });
    setEditingCell(null);
    setIsDirty(true);
    triggerNotification("success", "Indisponibilidade limpa com sucesso!");
  };

  const handleLaunchParecer = (profId: string, startDay: number, endDay: number) => {
    if (endDay < startDay) {
      triggerNotification("error", "O dia final não pode ser anterior ao dia inicial.");
      return;
    }
    setCellState((prev) => {
      const updatedProfCells = { ...(prev[profId] || {}) };
      for (let d = startDay; d <= endDay; d++) {
        updatedProfCells[d] = "PARECER";
      }
      return {
        ...prev,
        [profId]: updatedProfCells,
      };
    });
    setEditingCell(null);
    setIsDirty(true);
    triggerNotification("success", "Aguardando parecer externo lançado com sucesso!");
  };

  const handleClearParecer = (profId: string, clickedDay: number) => {
    setCellState((prev) => {
      const profCells = prev[profId] || {};
      const updatedProfCells = { ...profCells };
      
      updatedProfCells[clickedDay] = "";
      
      // Go left
      let d = clickedDay - 1;
      while (d >= 1 && profCells[d] === "PARECER") {
        updatedProfCells[d] = "";
        d--;
      }
      
      // Go right
      d = clickedDay + 1;
      while (d <= daysInMonth && profCells[d] === "PARECER") {
        updatedProfCells[d] = "";
        d++;
      }
      
      return {
        ...prev,
        [profId]: updatedProfCells,
      };
    });
    setEditingCell(null);
    setIsDirty(true);
    triggerNotification("success", "Aguardando parecer externo limpo com sucesso!");
  };

  const handleLaunchExpediente = (profId: string, startDay: number, endDay: number) => {
    if (endDay < startDay) {
      triggerNotification("error", "O dia final não pode ser anterior ao dia inicial.");
      return;
    }
    setCellState((prev) => {
      const updatedProfCells = { ...(prev[profId] || {}) };
      for (let d = startDay; d <= endDay; d++) {
        updatedProfCells[d] = "EXPEDIENTE";
      }
      return {
        ...prev,
        [profId]: updatedProfCells,
      };
    });
    setEditingCell(null);
    setIsDirty(true);
    triggerNotification("success", "Expediente administrativo lançado com sucesso!");
  };

  const handleClearExpediente = (profId: string, clickedDay: number) => {
    setCellState((prev) => {
      const profCells = prev[profId] || {};
      const updatedProfCells = { ...profCells };
      
      updatedProfCells[clickedDay] = "";
      
      // Go left
      let d = clickedDay - 1;
      while (d >= 1 && profCells[d] === "EXPEDIENTE") {
        updatedProfCells[d] = "";
        d--;
      }
      
      // Go right
      d = clickedDay + 1;
      while (d <= daysInMonth && profCells[d] === "EXPEDIENTE") {
        updatedProfCells[d] = "";
        d++;
      }
      
      return {
        ...prev,
        [profId]: updatedProfCells,
      };
    });
    setEditingCell(null);
    setIsDirty(true);
    triggerNotification("success", "Expediente administrativo limpo com sucesso!");
  };

  const [editingSignerId, setEditingSignerId] = useState<string | null>(null);
  const [sigFullName, setSigFullName] = useState<string>("");
  const [sigWarName, setSigWarName] = useState<string>("");
  const [sigRank, setSigRank] = useState<string>("");
  const [sigRole, setSigRole] = useState<string>("");

  const handleOpenAddSigner = () => {
    setEditingSignerId("new");
    setSigFullName("");
    setSigWarName("");
    setSigRank("");
    setSigRole("");
  };

  const handleOpenEditSigner = (signer: Signer) => {
    setEditingSignerId(signer.id);
    setSigFullName(signer.fullName);
    setSigWarName(signer.warName);
    setSigRank(signer.rank);
    setSigRole(signer.role);
  };

  const handleSaveSigner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sigFullName.trim() || !sigRank.trim() || !sigRole.trim()) {
      triggerNotification("error", "Preencha todos os campos obrigatórios.");
      return;
    }

    if (editingSignerId === "new") {
      if (signers.length >= 6) {
        triggerNotification("error", "Você atingiu o limite de 6 assinaturas.");
        return;
      }
      const newSigner: Signer = {
        id: Date.now().toString(),
        fullName: sigFullName.trim(),
        warName: sigWarName.trim(),
        rank: sigRank.trim(),
        role: sigRole.trim()
      };
      setSigners([...signers, newSigner]);
      triggerNotification("success", "Assinatura cadastrada com sucesso!");
    } else if (editingSignerId) {
      setSigners(
        signers.map((s) =>
          s.id === editingSignerId
            ? {
                ...s,
                fullName: sigFullName.trim(),
                warName: sigWarName.trim(),
                rank: sigRank.trim(),
                role: sigRole.trim()
              }
            : s
        )
      );
      triggerNotification("success", "Assinatura atualizada com sucesso!");
    }

    setEditingSignerId(null);
  };

  const handleDeleteSigner = (id: string) => {
    setSigners(signers.filter((s) => s.id !== id));
    triggerNotification("success", "Assinatura removida.");
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (professionals.length === 0) {
      triggerNotification("warning", "Não há dados na tabela consolidada para exportar.");
      return;
    }

    const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || "";
    const csvContent = exportToCSV(
      professionals,
      cellState,
      daysInMonth,
      monthLabel,
      selectedYear.toString(),
      locationName
    );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Escala_Consolidada_${locationName.replace(/\s+/g, "_")}_${monthLabel}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotification("success", "Exportação para Excel (CSV) concluída com sucesso!");
  };

  // Trigger browser print
  const handlePrint = () => {
    const isInIframe = typeof window !== "undefined" && window.self !== window.top;
    if (isInIframe) {
      setIsPrintIframeModalOpen(true);
    } else {
      window.print();
    }
  };

  const renderSignerText = (signer: Signer) => {
    const fullName = signer.fullName;
    const warName = signer.warName;
    const rank = signer.rank;
    
    if (!warName) {
      return (
        <span className="font-sans text-xs text-slate-800 block font-medium">
          {fullName} {rank}
        </span>
      );
    }

    const warWords = warName.split(/\s+/).filter(w => w.length > 0);
    if (warWords.length === 0) {
      return (
        <span className="font-sans text-xs text-slate-800 block font-medium">
          {fullName} {rank}
        </span>
      );
    }

    const escapedWords = warWords.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp("(" + escapedWords.join("|") + ")", "gi");
    const parts = fullName.split(regex);

    return (
      <span className="font-sans text-xs text-slate-800 block font-medium">
        {parts.map((part, idx) => {
          const isMatch = warWords.some(w => w.toLowerCase() === part.toLowerCase());
          return isMatch ? <strong key={idx}>{part}</strong> : part;
        })}{" "}
        {rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 overflow-x-hidden">
      {/* Top Banner (Notification/Tips Bar) - Hidden in Print */}
      {notification && (
        <div className={`no-print px-6 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between border-b transition-colors duration-300 ${
          notification.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
          notification.type === "warning" ? "bg-amber-50 text-amber-800 border-amber-200" :
          notification.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" :
          "bg-indigo-50 text-indigo-800 border-indigo-200"
        }`}>
          <div className="flex items-center gap-2 max-w-5xl">
            {notification.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
            {notification.type === "warning" && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />}
            {notification.type === "error" && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
            {notification.type === "info" && <Sparkles className="w-4 h-4 shrink-0 text-indigo-600" />}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-slate-600 mb-6 font-semibold leading-relaxed mt-3">
                {confirmDialog.message}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xs transition-all hover:shadow-md cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print/PDF Iframe Warning Modal */}
      {isPrintIframeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-rose-100 pb-2">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                Impressão Bloqueada pelo Navegador
              </h3>
              <div className="text-xs text-slate-600 space-y-3 font-medium leading-relaxed mt-4">
                <p>
                  O navegador bloqueia a visualização da tela de impressão (PDF) quando o aplicativo está sendo executado dentro de um <strong>iframe</strong> (como este visualizador integrado).
                </p>
                <p className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-700 font-semibold">
                  Para gerar o PDF ou imprimir a escala, você deve abrir o sistema em uma <strong>nova aba cheia</strong> do seu navegador.
                </p>
                <p>
                  Clique no botão abaixo para abrir o sistema em uma nova aba e depois acesse o painel <strong>Visualizar Impressão</strong> para gerar seu PDF perfeitamente.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsPrintIframeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    setIsPrintIframeModalOpen(false);
                    window.open(window.location.href, "_blank");
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xs transition-all hover:shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Abrir em Nova Aba
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signatures Management Modal */}
      {isSignaturesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Gerenciar Assinaturas da Impressão ({signers.length}/6)
                </h3>
                <button
                  onClick={() => {
                    setIsSignaturesModalOpen(false);
                    setEditingSignerId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editingSignerId === null ? (
                /* LIST VIEW */
                <div className="space-y-4">
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {signers.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded text-xs font-medium">
                        Nenhum assinante cadastrado.
                      </div>
                    ) : (
                      signers.map((signer, index) => (
                        <div
                          key={signer.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm">
                                Posição {index + 1}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {signer.rank}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {renderSignerText(signer)}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {signer.role}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEditSigner(signer)}
                              title="Editar"
                              className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded transition-all cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSigner(signer.id)}
                              title="Remover"
                              className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                    {signers.length < 6 ? (
                      <button
                        onClick={handleOpenAddSigner}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Assinante
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-extrabold uppercase">
                        Limite de 6 assinantes atingido
                      </span>
                    )}

                    <button
                      onClick={() => setIsSignaturesModalOpen(false)}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                /* ADD / EDIT FORM VIEW */
                <form onSubmit={handleSaveSigner} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Nome Completo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sigFullName}
                        onChange={(e) => setSigFullName(e.target.value)}
                        placeholder=""
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Nome de Guerra <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sigWarName}
                        onChange={(e) => setSigWarName(e.target.value)}
                        placeholder=""
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Posto ou Graduação <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sigRank}
                        onChange={(e) => setSigRank(e.target.value)}
                        placeholder=""
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                        Função / Cargo <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sigRole}
                        onChange={(e) => setSigRole(e.target.value)}
                        placeholder=""
                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-4">
                    <button
                      type="button"
                      onClick={() => setEditingSignerId(null)}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2 rounded uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Salvar Assinante
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Scales Popup Modal */}
      {isDeleteScalesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Apagar Escalas de Serviço
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mb-4 mt-2">
                Selecione quais escalas você deseja apagar completamente para o mês de <span className="font-bold text-slate-700">{MONTHS[selectedMonth].label} {selectedYear}</span>:
              </p>

              <div className="flex justify-between items-center mb-3 text-[10px] uppercase font-bold text-slate-400">
                <span>Escalas Disponíveis ({SCALE_OPTIONS.length})</span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedScalesToDelete(SCALE_OPTIONS.map(opt => opt.code))}
                    className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Marcar Todas
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedScalesToDelete([])}
                    className="text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Desmarcar Todas
                  </button>
                </div>
              </div>

              <div className="max-h-[240px] overflow-y-auto border border-slate-100 rounded bg-slate-50 p-3 flex flex-col gap-2 mb-5">
                {SCALE_OPTIONS.map((opt) => {
                  const isChecked = selectedScalesToDelete.includes(opt.code);
                  return (
                    <label 
                      key={opt.code}
                      className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-white border-rose-200 text-rose-900 font-bold shadow-xs" 
                          : "bg-white/65 border-slate-100 text-slate-700 font-medium hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedScalesToDelete(prev => [...prev, opt.code]);
                          } else {
                            setSelectedScalesToDelete(prev => prev.filter(c => c !== opt.code));
                          }
                        }}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <div className="flex items-center justify-between w-full text-xs">
                        <span className="truncate">{opt.label}</span>
                        <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-black">{opt.code}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsDeleteScalesModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-wider rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteScalesConfirm(selectedScalesToDelete)}
                  disabled={selectedScalesToDelete.length === 0}
                  className={`px-4 py-2 text-white font-bold text-[10px] uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                    selectedScalesToDelete.length === 0
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-rose-600 hover:bg-rose-700 shadow-xs hover:shadow-md"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Confirmar Exclusão ({selectedScalesToDelete.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Military Popup Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                <UserPlus className="w-4 h-4 text-indigo-500" />
                Adicionar Novo Militar
              </h3>
              <form onSubmit={handleAddManualProfessional} className="space-y-4 mt-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Graduação <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addRank}
                    onChange={(e) => setAddRank(e.target.value)}
                    placeholder="Ex: Cb, 3º Sgt, Sd"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Especialidade <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={addSpecialty}
                    onChange={(e) => setAddSpecialty(e.target.value)}
                    placeholder="Ex: COM, MUS, INF"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Nome <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Ex: Silva"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xs transition-all hover:shadow-md cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Military Popup Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Pencil className="w-4 h-4 text-indigo-500" />
                Editar Dados do Militar
              </h3>
              <form onSubmit={handleSaveEditProfessional} className="space-y-4 mt-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Graduação <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editRank}
                    onChange={(e) => setEditRank(e.target.value)}
                    placeholder="Ex: Cb, 3º Sgt, Sd"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Especialidade <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={editSpecialty}
                    onChange={(e) => setEditSpecialty(e.target.value)}
                    placeholder="Ex: COM, MUS, INF"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Nome <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Silva"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Escala / Categoria <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as 'GRADUADOS' | 'SOLDADOS')}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-bold uppercase text-slate-800 focus:bg-white focus:outline-hidden focus:border-indigo-500 transition-all"
                  >
                    <option value="GRADUADOS">Graduados (Oficiais, Sargentos, Cabos)</option>
                    <option value="SOLDADOS">Soldados</option>
                  </select>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Vigência da Alteração <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-[10px] font-bold uppercase transition-all ${
                      editType === "definitive" ? "border-indigo-500 bg-indigo-50/40 text-indigo-900 font-extrabold" : "border-slate-200 bg-white text-slate-700"
                    }`}>
                      <input
                        type="radio"
                        name="editType"
                        value="definitive"
                        checked={editType === "definitive"}
                        onChange={() => setEditType("definitive")}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      Definitiva (Todos)
                    </label>
                    <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-[10px] font-bold uppercase transition-all ${
                      editType === "specific_month" ? "border-indigo-500 bg-indigo-50/40 text-indigo-900 font-extrabold" : "border-slate-200 bg-white text-slate-700"
                    }`}>
                      <input
                        type="radio"
                        name="editType"
                        value="specific_month"
                        checked={editType === "specific_month"}
                        onChange={() => setEditType("specific_month")}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      A partir de Mês
                    </label>
                  </div>
                  
                  {editType === "specific_month" && (
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-150 rounded animate-in fade-in slide-in-from-top-1 duration-150">
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Mês</label>
                        <select
                          value={editMonth}
                          onChange={(e) => setEditMonth(parseInt(e.target.value, 10))}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold uppercase text-slate-800 focus:outline-hidden focus:border-indigo-500"
                        >
                          {MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Ano</label>
                        <select
                          value={editYear}
                          onChange={(e) => setEditYear(parseInt(e.target.value, 10))}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold uppercase text-slate-800 focus:outline-hidden focus:border-indigo-500"
                        >
                          {[-1, 0, 1].map((offset) => {
                            const yr = selectedYear + offset;
                            return <option key={yr} value={yr}>{yr}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xs transition-all hover:shadow-md cursor-pointer"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Military Popup Modal */}
      {isDeleteMilitaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Excluir Militar
              </h3>
              <p className="text-xs text-slate-600 font-medium mb-4 mt-2 leading-relaxed">
                Tem certeza de que deseja excluir o militar <span className="font-bold text-slate-900">{deletingProfName}</span>?
              </p>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Tipo de Exclusão <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-[10px] font-bold uppercase transition-all ${
                    deleteType === "definitive" ? "border-rose-500 bg-rose-50/40 text-rose-900 font-extrabold" : "border-slate-200 bg-white text-slate-700"
                  }`}>
                    <input
                      type="radio"
                      name="deleteType"
                      value="definitive"
                      checked={deleteType === "definitive"}
                      onChange={() => setDeleteType("definitive")}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    Definitiva (Todos)
                  </label>
                  <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-[10px] font-bold uppercase transition-all ${
                    deleteType === "specific_month" ? "border-rose-500 bg-rose-50/40 text-rose-900 font-extrabold" : "border-slate-200 bg-white text-slate-700"
                  }`}>
                    <input
                      type="radio"
                      name="deleteType"
                      value="specific_month"
                      checked={deleteType === "specific_month"}
                      onChange={() => setDeleteType("specific_month")}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    A partir de Mês
                  </label>
                </div>

                {deleteType === "specific_month" && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-150 rounded animate-in fade-in slide-in-from-top-1 duration-150">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Mês</label>
                      <select
                        value={deleteMonth}
                        onChange={(e) => setDeleteMonth(parseInt(e.target.value, 10))}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold uppercase text-slate-800 focus:outline-hidden focus:border-rose-500"
                      >
                        {MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Ano</label>
                      <select
                        value={deleteYear}
                        onChange={(e) => setDeleteYear(parseInt(e.target.value, 10))}
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold uppercase text-slate-800 focus:outline-hidden focus:border-rose-500"
                      >
                        {[-1, 0, 1].map((offset) => {
                          const yr = selectedYear + offset;
                          return <option key={yr} value={yr}>{yr}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                )}
                
                <p className="text-[10px] text-slate-400 italic">
                  {deleteType === "definitive" 
                    ? "Esta ação removerá o militar e todas as suas escalas de todos os meses de forma definitiva." 
                    : `Esta ação manterá o militar e suas escalas nos meses anteriores a ${MONTHS[deleteMonth]?.label} de ${deleteYear}, mas o excluirá desse período em diante.`}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteMilitaryModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProfessional}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-xs transition-all hover:shadow-md cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Help Modal */}
      {isCsvHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-indigo-100 pb-2">
                <HelpCircle className="w-5 h-5 text-indigo-500" />
                Como Carregar Escalas via CSV / TXT
              </h3>
              
              <div className="text-xs text-slate-600 space-y-4 font-medium leading-relaxed mt-4 max-h-[380px] overflow-y-auto pr-1">
                <p>
                  O sistema adapta-se <strong>diretamente ao formato de escala oficial</strong> que você já possui! Não é necessário converter ou criar um modelo novo.
                </p>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-2">
                  <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Regras de Leitura do Arquivo:</h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    <li><strong>Estrutura de Colunas:</strong> A primeira coluna deve conter a <strong>data</strong> (no formato <code>DD/MM/AAAA</code>), a segunda a <strong>escala</strong> (ex: <code>MD - Motorista de Dia</code>) e a terceira o <strong>militar</strong>.</li>
                    <li><strong>Filtragem Automática:</strong> Linhas de cabeçalho, títulos ou metadados espalhados pelo arquivo são ignorados de forma inteligente!</li>
                    <li><strong>Processamento do Nome:</strong> Na coluna do militar, o sistema extrai os dados apenas até o <strong>primeiro parêntese</strong> (ex: de <code>S2 NE LEANDRO(7726627) - ...</code> será lido apenas <code>S2 NE LEANDRO</code>).</li>
                  </ul>

                  <div className="border-t border-slate-200 pt-2 mt-2">
                    <p className="font-semibold text-indigo-700 text-[10px]">Exemplo de Formato Aceito:</p>
                    <pre className="text-[10px] bg-slate-100 p-1.5 rounded mt-1 font-mono text-slate-700 overflow-x-auto leading-normal">
{`Boletim para o dia 01/07/2026
DTCEA-PCO
Data;Escala;Escalado;Nome do Posto;
01/07/2026;MD - Motorista de Dia;S2 NE MARTURELLI(7725019) - PCOSA-4 - DTCEA-PCO;
01/07/2026;PV - Permanência na Vila Militar;S2 NE LEANDRO(7726627) - PCOVR - DTCEA-PCO;`}
                    </pre>
                  </div>
                </div>

                <div className="border-l-4 border-amber-500 bg-amber-50/50 p-2.5 rounded-r">
                  <h5 className="font-black text-amber-800 uppercase text-[9px] tracking-wider mb-0.5">⚠️ Cadastro Prévio Obrigatório</h5>
                  <p className="text-slate-700 text-[11px] font-semibold leading-snug">
                    O sistema <strong>não realiza cadastro automático</strong> de novos militares a partir do arquivo. Os militares devem ser cadastrados previamente através do botão <strong>"+ Adicionar Militar"</strong> no painel. Caso existam militares não encontrados, um relatório de nomes será exibido ao final da importação para que você possa cadastrá-los!
                  </p>
                </div>

                <p>
                  O arquivo pode ser salvo em formato <strong>.csv</strong> ou <strong>.txt</strong> utilizando tanto ponto-e-vírgula (<code>;</code>) quanto vírgula (<code>,</code>) como separador de campos.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 mt-6 pt-3 border-t border-slate-100">
                <button
                  onClick={downloadCsvTemplate}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Baixar Exemplo Oficial
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCsvHelpModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unmatched Military Names Modal */}
      {unmatchedNamesModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-rose-100 max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-rose-100 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                Militar(es) Não Encontrado(s) no Sistema
              </h3>
              
              <div className="space-y-4 mt-4 text-xs font-medium leading-relaxed">
                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded p-3">
                  Foram distribuídos com sucesso <strong className="text-emerald-700">{unmatchedNamesModal.totalImported} plantão(ões)</strong> na escala deste mês. Contudo, os militares abaixo foram citados no arquivo mas <strong>não estão cadastrados no sistema</strong>:
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                    Nomes Pendentes de Cadastro ({unmatchedNamesModal.names.length}):
                  </h4>
                  <div className="max-h-[160px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono font-bold text-slate-700">
                    {unmatchedNamesModal.names.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded px-2.5 py-1 text-slate-800">
                        <span className="text-[9px] text-slate-400">{idx + 1}.</span>
                        <span className="truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-l-4 border-indigo-500 bg-indigo-50/50 p-2.5 rounded-r text-slate-700">
                  <span className="font-bold block text-indigo-800 uppercase text-[9px] tracking-wider mb-0.5">Como Resolver:</span>
                  <p className="text-[11px] font-semibold leading-snug">
                    Feche este aviso, clique no botão <strong>"+ Adicionar Militar"</strong> no painel de controle e cadastre estes militares com a mesma grafia. Depois, re-importe o mesmo arquivo para preencher automaticamente as escalas deles!
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end mt-6 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setUnmatchedNamesModal(null)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[10px] font-black uppercase tracking-widest rounded transition-all cursor-pointer hover:scale-[1.02] shadow-xs hover:shadow-sm"
                >
                  Entendido, Fechar Aviso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily duty popup modal */}
      {selectedDayForPopup !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs no-print">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <h3 className="text-sm font-black text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-indigo-100 pb-3">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Escala do Dia {selectedDayForPopup.toString().padStart(2, "0")}/{ (selectedMonth + 1).toString().padStart(2, "0") }/{selectedYear}
              </h3>
              
              <div className="text-xs text-slate-600 space-y-4 font-medium leading-relaxed mt-4 max-h-[380px] overflow-y-auto pr-1">
                {(() => {
                  const day = selectedDayForPopup;
                  const dutiesList: { code: string; label: string; military: string }[] = [];
                  
                  SCALE_OPTIONS.forEach((opt) => {
                    professionals.forEach((prof) => {
                      const val = cellState[prof.id]?.[day];
                      if (val === opt.code) {
                        const milStr = [prof.rank, prof.specialty, prof.name].filter(Boolean).join(" ");
                        dutiesList.push({
                          code: opt.code,
                          label: opt.label,
                          military: milStr
                        });
                      }
                    });
                  });

                  if (dutiesList.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400 font-bold uppercase tracking-wider">
                        Nenhum militar escalado de serviço para este dia.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <p className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                        Militares de serviço:
                      </p>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-2.5 font-mono text-[11px]">
                        {dutiesList.map((item, index) => (
                          <div key={index} className="text-slate-700 leading-normal border-b border-slate-200/40 pb-2 last:border-0 last:pb-0">
                            <span className="font-bold text-indigo-700">{item.code}</span> - <span className="font-semibold text-slate-800">{item.label}</span>: <span className="text-slate-900 font-black">{item.military}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end mt-6 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedDayForPopup(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest rounded transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Header - Hidden in Print */}
      <header className="no-print h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
          <img src="/pco.png" alt="DTCEA-PCO Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase font-display leading-none mb-1">
              Escalas DTCEA-PCO
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">
              Consolidador de Escalas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Supabase connection badge */}
          <div 
            onClick={() => dbSyncStatus === 'error' && setShowSqlSetup(!showSqlSetup)}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              dbSyncStatus === 'synced' ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
              dbSyncStatus === 'loading' ? "bg-amber-50 text-amber-800 border border-amber-200 animate-pulse" :
              dbSyncStatus === 'error' ? "bg-rose-50 text-rose-800 border border-rose-200 cursor-pointer hover:bg-rose-100 hover:scale-[1.02]" :
              "bg-slate-50 text-slate-600 border border-slate-200"
            }`}
            title={dbSyncStatus === 'error' ? "Clique para ver instruções de correção" : undefined}
          >
            <span className={`w-2 h-2 rounded-full ${
              dbSyncStatus === 'synced' ? "bg-emerald-500" :
              dbSyncStatus === 'loading' ? "bg-amber-500" :
              dbSyncStatus === 'error' ? "bg-rose-500 animate-pulse" :
              "bg-slate-400"
            }`} />
            {dbSyncStatus === 'synced' && "DADOS SALVOS"}
            {dbSyncStatus === 'loading' && "Sincronizando..."}
            {dbSyncStatus === 'error' && "Erro de Sincronização"}
            {dbSyncStatus === 'local' && "Salvo Localmente"}
          </div>

          {isDirty && (
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-xs font-black uppercase tracking-wider">
              Alterações Pendentes
            </div>
          )}
        </div>
      </header>

      {/* Database Diagnostic/Setup Alert - Hidden in Print */}
      {dbSyncStatus === 'error' && (
        <div className="no-print mx-8 mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-slate-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-rose-800 text-sm uppercase tracking-wide">
                Erro de Sincronização com o Supabase Detectado
              </h3>
              <p className="text-xs text-rose-700 mt-1 font-medium">
                Suas chaves do Supabase estão configuradas, mas as tabelas necessárias não foram encontradas no banco de dados. 
                <strong> Não se preocupe! Seus dados foram salvos automaticamente no seu navegador</strong> e você não perdeu seu trabalho.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => setShowSqlSetup(!showSqlSetup)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {showSqlSetup ? "Ocultar Instruções" : "Como corrigir em 1 clique (Instruções SQL)"}
                </button>
                <button
                  onClick={() => {
                    // Force state load from localStorage to recover work immediately
                    const localProfs = localStorage.getItem("military_professionals");
                    const localCells = localStorage.getItem(`military_scales_${selectedMonth}_${selectedYear}`);
                    if (localProfs) setProfessionals(parseLoadedProfessionals(JSON.parse(localProfs)));
                    if (localCells) setCellState(JSON.parse(localCells));
                    triggerNotification("success", "Dados carregados do backup local com sucesso!");
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded transition-colors cursor-pointer"
                >
                  Forçar Carregamento do Backup Local
                </button>
              </div>

              {showSqlSetup && (
                <div className="mt-4 bg-slate-900 text-slate-100 p-4 rounded-md border border-slate-700 font-mono text-xs select-all overflow-x-auto">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2 select-none border-b border-slate-800 pb-2">
                    <span>Script SQL para o Supabase (SQL Editor)</span>
                    <button
                      onClick={() => {
                        const sqlText = `CREATE TABLE IF NOT EXISTS public.military_professionals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.military_professionals DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.military_monthly_scales (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    cell_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.military_monthly_scales DISABLE ROW LEVEL SECURITY;`;
                        navigator.clipboard.writeText(sqlText);
                        triggerNotification("success", "Script SQL copiado com sucesso!");
                      }}
                      className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      Copiar Código
                    </button>
                  </div>
                  <pre className="text-[11px] leading-relaxed select-text text-slate-300">
{`-- 1. Criar tabela de profissionais militares
CREATE TABLE IF NOT EXISTS public.military_professionals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.military_professionals DISABLE ROW LEVEL SECURITY;

-- 2. Criar tabela de escalas de serviço mensais
CREATE TABLE IF NOT EXISTS public.military_monthly_scales (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    cell_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.military_monthly_scales DISABLE ROW LEVEL SECURITY;`}
                  </pre>
                  <p className="mt-3 text-[11px] text-slate-400 select-none border-t border-slate-800 pt-2 font-sans">
                    <strong>Passo a passo para corrigir:</strong><br />
                    1. Abra o painel do seu projeto no <strong>Supabase</strong>.<br />
                    2. No menu lateral esquerdo, clique em <strong>SQL Editor</strong>.<br />
                    3. Clique em <strong>New Query</strong>.<br />
                    4. Cole o código acima e clique em <strong>Run</strong> (no canto inferior direito).<br />
                    5. Volte para este aplicativo e recarregue a página. Tudo estará sincronizado!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reference & Parameter Controls Toolbar - Hidden in Print */}
      <div className="no-print bg-slate-100/50 border-b border-slate-200 px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Reference Month */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 uppercase"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Reference Year */}
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
            >
              {YEARS.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* Unified Scale Upload */}
          <div className="flex items-center gap-2">
            <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-wider px-3.5 py-1.5 rounded cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]">
              <UploadCloud className="w-3.5 h-3.5" />
              Importar Escala
              <input
                type="file"
                accept=".csv,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUnifiedCsvUpload(file);
                  }
                }}
                className="hidden"
              />
            </label>
            <button
              type="button"
              className="text-slate-500 hover:text-indigo-600 border border-slate-200 bg-white p-1.5 rounded transition-colors flex items-center justify-center hover:scale-[1.02] cursor-help"
              title="Carregue o arquivo .csv baixado pela função de Exportar Planilha, no menu de visualização de boletim do E-RISAER."
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setSelectedScalesToDelete([]); // Clear previous selections
              setIsDeleteScalesModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            title="Apagar dados de escalas específicas do mês ativo"
          >
            <Trash2 className="w-3.5 h-3.5" /> Apagar Escala
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-hidden max-w-[1800px] w-full mx-auto p-6 gap-6 print:p-0">
        
        {/* Main Data Area */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          
          {/* Navigation Tabs - Hidden in Print */}
          <div className="no-print bg-white border border-slate-200 p-1.5 rounded flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab("grid")}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "grid"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Calendar className="w-4 h-4" />
                Escala Consolidada
              </button>
              <button
                onClick={() => setActiveTab("report")}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === "report"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Printer className="w-4 h-4" />
                Visualizar Impressão
              </button>
            </div>

            {/* Scale Selector for Parallel Scales */}
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escala:</span>
              <button
                onClick={() => setActiveScale("GRADUADOS")}
                className={`px-3.5 py-1.5 rounded text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeScale === "GRADUADOS"
                    ? "bg-indigo-900 text-white shadow-xs font-black"
                    : "text-slate-600 hover:bg-slate-100 border border-slate-200 bg-slate-50/50"
                }`}
              >
                Graduados
              </button>
              <button
                onClick={() => setActiveScale("SOLDADOS")}
                className={`px-3.5 py-1.5 rounded text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeScale === "SOLDADOS"
                    ? "bg-indigo-900 text-white shadow-xs font-black"
                    : "text-slate-600 hover:bg-slate-100 border border-slate-200 bg-slate-50/50"
                }`}
              >
                Soldados
              </button>
            </div>
          </div>

          {/* TAB CONTENT 1: CONSOLIDATED GRID */}
          {activeTab === "grid" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  ESCALA ({activeScale}): <span className="text-indigo-600 italic font-display">{MONTHS[selectedMonth].label} {selectedYear}</span>
                </h3>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Text query search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="BUSCAR MILITAR..."
                      className="bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-1.5 text-[11px] font-bold tracking-wider focus:outline-hidden focus:border-indigo-500 focus:bg-white w-52 text-slate-800 placeholder-slate-400"
                    />
                  </div>

                  {/* Reset filters */}
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                      }}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider underline cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  )}

                  {/* Add military button */}
                  <button
                    onClick={() => {
                      setAddRank("");
                      setAddSpecialty("");
                      setAddName("");
                      setIsAddModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-4 py-2 rounded uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Militar
                  </button>
                </div>
              </div>

              {/* Consolidated Table View */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-10 bg-slate-50 border-r border-slate-200/50 min-w-[210px]">
                        Militar
                      </th>
                      {daysArray.map((dayObj) => (
                        <th
                          key={dayObj.day}
                          onClick={() => setSelectedDayForPopup(dayObj.day)}
                          title={`Ver militares de serviço no dia ${dayObj.day}`}
                          className={`px-1 py-2 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-center font-mono min-w-[34px] cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors ${
                            dayObj.isWeekend ? "bg-amber-50/50 text-amber-700 font-bold" : "text-slate-500"
                          }`}
                        >
                          <div className="text-[8px] font-medium leading-none mb-0.5">{dayObj.weekday}</div>
                          <div className="text-[10px]">{dayObj.day.toString().padStart(2, "0")}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProfessionals.length === 0 ? (
                      <tr>
                        <td 
                          colSpan={daysInMonth + 1} 
                          className="py-16 text-center text-slate-400 font-bold uppercase text-[11px] tracking-wider bg-white"
                        >
                          {professionals.filter(p => p.category === activeScale).length === 0 
                            ? `Nenhum militar cadastrado ainda na escala de ${activeScale}. Envie os PDFs ou adicione manualmente.` 
                            : "Nenhum militar encontrado."}
                        </td>
                      </tr>
                    ) : (
                      filteredProfessionals.map((prof) => (
                        <tr key={prof.id} className="hover:bg-indigo-50/30 transition-colors bg-white group">
                          {/* Military Name - Sticky Left */}
                          <td className="px-4 py-2 bg-white sticky left-0 z-10 border-r border-slate-200/80 shadow-[2px_0_5px_rgba(0,0,0,0.01)] flex items-center justify-between group-hover:bg-slate-50 min-w-[210px]">
                            <div className="truncate max-w-[120px] uppercase text-xs font-bold text-slate-900">
                              <span className="print:hidden">
                                {prof.rank ? `${prof.rank} ` : ""}{prof.name}
                              </span>
                              <span className="hidden print:inline">
                                {prof.rank ? `${prof.rank} ` : ""}
                                {prof.specialty ? `${prof.specialty} ` : ""}
                                {prof.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all no-print shrink-0 pl-1">
                              <button
                                onClick={() => handleMoveProfessional(prof.id, "up")}
                                className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors cursor-pointer"
                                title="Mover para cima"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleMoveProfessional(prof.id, "down")}
                                className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors cursor-pointer"
                                title="Mover para baixo"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(prof)}
                                className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors cursor-pointer"
                                title="Editar militar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(prof.id, prof.name)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                                title="Excluir militar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                           {/* Duty days rendering */}
                          {daysArray.map((dayObj) => {
                            const cellValue = cellState[prof.id]?.[dayObj.day] || "";
                            const isEditing = editingCell?.profId === prof.id && editingCell?.day === dayObj.day;
                            const isIndisp = cellValue === "INDISP";
                            const isParecer = cellValue === "PARECER";
                            const isExpediente = cellValue === "EXPEDIENTE";

                            // Mapping 9 service background colors (text is handled dynamically)
                            const serviceColors: { [key: string]: string } = {
                              MD: "bg-blue-50/50 hover:bg-blue-100/60",
                              PV: "bg-indigo-50/50 hover:bg-indigo-100/60",
                              SD: "bg-purple-50/50 hover:bg-purple-100/60",
                              SM: "bg-emerald-50/40 hover:bg-emerald-100/50",
                              SS: "bg-cyan-50/40 hover:bg-cyan-100/50",
                              ST: "bg-amber-50/40 hover:bg-amber-100/50",
                              KF: "bg-fuchsia-50/40 hover:bg-fuchsia-100/50",
                              TD: "bg-rose-50/40 hover:bg-rose-100/50",
                              MC: "bg-teal-50/40 hover:bg-teal-100/50",
                              AC: "bg-orange-50/55 hover:bg-orange-100/70",
                            };

                            const isFilled = cellValue && cellValue.trim() !== "";
                            const bgClass = isIndisp 
                              ? "bg-red-600 hover:bg-red-700 animate-fade-in"
                              : isParecer
                              ? "bg-orange-400 hover:bg-orange-500 animate-fade-in"
                              : isExpediente
                              ? "bg-yellow-400 hover:bg-yellow-500 animate-fade-in"
                              : (isFilled 
                                  ? (serviceColors[cellValue.toUpperCase()] || "bg-slate-100 hover:bg-slate-200") 
                                  : "hover:bg-slate-100/50");

                            const textClass = isIndisp 
                              ? "text-white" 
                              : isParecer
                              ? "text-white"
                              : isExpediente
                              ? "text-slate-900"
                              : (isFilled 
                                  ? getCellFontColor(dayObj.day, selectedMonth, selectedYear) 
                                  : "text-slate-300");

                            const colorClass = `${bgClass} ${textClass}`;

                            return (
                              <td
                                key={dayObj.day}
                                onClick={() => !isEditing && handleCellClick(prof.id, dayObj.day)}
                                className={`p-0.5 text-center font-mono font-bold text-xs select-none cursor-pointer transition-colors border-r border-slate-100 ${
                                  dayObj.isWeekend ? "bg-amber-50/10" : ""
                                } ${colorClass}`}
                              >
                                {isEditing ? (
                                  <div className="relative min-h-[26px]" onClick={(e) => e.stopPropagation()}>
                                    {/* Absolute container that floats over the cell and doesn't affect cell width */}
                                    <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl p-2 w-60 flex flex-col gap-1.5 text-slate-800 text-left">
                                      <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-0.5">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dia {dayObj.day.toString().padStart(2, "0")}</span>
                                        <button 
                                          onMouseDown={() => setEditingCell(null)}
                                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>

                                      {isLaunchingIndisp ? (
                                        <div className="flex flex-col gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-800">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                            Lançar Indisponibilidade
                                          </div>
                                          <div className="text-[9px] text-slate-500 font-medium">
                                            Selecione o dia final (de {dayObj.day} até {daysInMonth}):
                                          </div>
                                          <select
                                            value={indispEndDay}
                                            onChange={(e) => setIndispEndDay(Number(e.target.value))}
                                            className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold focus:outline-hidden"
                                          >
                                            {Array.from({ length: daysInMonth - dayObj.day + 1 }, (_, idx) => {
                                              const dNum = dayObj.day + idx;
                                              return (
                                                <option key={dNum} value={dNum}>
                                                  Dia {dNum.toString().padStart(2, "0")}
                                                </option>
                                              );
                                            })}
                                          </select>
                                          <div className="flex gap-1.5 mt-1">
                                            <button
                                              onMouseDown={() => handleLaunchIndisponibilidade(prof.id, dayObj.day, indispEndDay)}
                                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1 rounded uppercase tracking-wider transition-colors cursor-pointer text-center"
                                            >
                                              Confirmar
                                            </button>
                                            <button
                                              onMouseDown={() => setIsLaunchingIndisp(false)}
                                              className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold text-[10px] py-1 rounded uppercase tracking-wider transition-colors cursor-pointer text-center"
                                            >
                                              Voltar
                                            </button>
                                          </div>
                                        </div>
                                      ) : isLaunchingParecer ? (
                                        <div className="flex flex-col gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-800">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                            Lançar Aguardando Parecer Externo
                                          </div>
                                          <div className="text-[9px] text-slate-500 font-medium">
                                            Selecione o dia final (de {dayObj.day} até {daysInMonth}):
                                          </div>
                                          <select
                                            value={parecerEndDay}
                                            onChange={(e) => setParecerEndDay(Number(e.target.value))}
                                            className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold focus:outline-hidden"
                                          >
                                            {Array.from({ length: daysInMonth - dayObj.day + 1 }, (_, idx) => {
                                              const dNum = dayObj.day + idx;
                                              return (
                                                <option key={dNum} value={dNum}>
                                                  Dia {dNum.toString().padStart(2, "0")}
                                                </option>
                                              );
                                            })}
                                          </select>
                                          <div className="flex gap-1.5 mt-1">
                                            <button
                                              onMouseDown={() => handleLaunchParecer(prof.id, dayObj.day, parecerEndDay)}
                                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1 rounded uppercase tracking-wider transition-colors cursor-pointer text-center"
                                            >
                                              Confirmar
                                            </button>
                                            <button
                                              onMouseDown={() => setIsLaunchingParecer(false)}
                                              className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold text-[10px] py-1 rounded uppercase tracking-wider transition-colors cursor-pointer text-center"
                                            >
                                              Voltar
                                            </button>
                                          </div>
                                        </div>
                                      ) : isLaunchingExpediente ? (
                                        <div className="flex flex-col gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-800">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                            Lançar Expediente Admin.
                                          </div>
                                          <div className="text-[9px] text-slate-500 font-medium">
                                            Selecione o dia final (de {dayObj.day} até {daysInMonth}):
                                          </div>
                                          <select
                                            value={expedienteEndDay}
                                            onChange={(e) => setExpedienteEndDay(Number(e.target.value))}
                                            className="w-full bg-white border border-slate-300 rounded p-1 text-[11px] font-bold focus:outline-hidden"
                                          >
                                            {Array.from({ length: daysInMonth - dayObj.day + 1 }, (_, idx) => {
                                              const dNum = dayObj.day + idx;
                                              return (
                                                <option key={dNum} value={dNum}>
                                                  Dia {dNum.toString().padStart(2, "0")}
                                                </option>
                                              );
                                            })}
                                          </select>
                                          <div className="flex gap-1.5 mt-1">
                                            <button
                                              onMouseDown={() => handleLaunchExpediente(prof.id, dayObj.day, expedienteEndDay)}
                                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1 rounded uppercase tracking-wider transition-colors cursor-pointer text-center"
                                            >
                                              Confirmar
                                            </button>
                                            <button
                                              onMouseDown={() => setIsLaunchingExpediente(false)}
                                              className="flex-1 bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold text-[10px] py-1 rounded uppercase tracking-wider transition-colors cursor-pointer text-center"
                                            >
                                              Voltar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                                            Selecione a Escala:
                                          </div>
                                          
                                          {/* Quick Shift Selection Dropdown */}
                                          <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded border border-slate-100 justify-start">
                                            {SCALE_OPTIONS.map((opt) => (
                                              <button
                                                key={opt.code}
                                                title={opt.label}
                                                onMouseDown={() => handleQuickSelectShift(prof.id, dayObj.day, opt.code)}
                                                className="px-1.5 py-0.5 bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 rounded-sm text-[9px] font-bold transition-colors cursor-pointer"
                                              >
                                                {opt.code}
                                              </button>
                                            ))}
                                          </div>

                                          {/* Indisponibilidade Button */}
                                          {isIndisp ? (
                                            <button
                                              onMouseDown={() => handleClearIndisponibilidade(prof.id, dayObj.day)}
                                              className="px-1.5 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white rounded-sm text-[10px] text-red-700 font-bold transition-colors w-full text-center cursor-pointer border border-red-200 uppercase tracking-wider"
                                            >
                                              Limpar Indisponibilidade
                                            </button>
                                          ) : (
                                            <button
                                              onMouseDown={() => {
                                                setIsLaunchingIndisp(true);
                                                setIndispEndDay(dayObj.day);
                                              }}
                                              className="px-1.5 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 rounded-sm text-[10px] font-bold transition-colors w-full text-center cursor-pointer border border-red-200 uppercase tracking-wider"
                                            >
                                              Lançar Indisponibilidade
                                            </button>
                                          )}

                                          {/* Parecer Externo Button */}
                                          {isParecer ? (
                                            <button
                                              onMouseDown={() => handleClearParecer(prof.id, dayObj.day)}
                                              className="px-1.5 py-1.5 bg-orange-50 hover:bg-orange-400 hover:text-white rounded-sm text-[10px] text-orange-600 font-bold transition-colors w-full text-center cursor-pointer border border-orange-200 uppercase tracking-wider"
                                            >
                                              Limpar Parecer Externo
                                            </button>
                                          ) : (
                                            <button
                                              onMouseDown={() => {
                                                setIsLaunchingParecer(true);
                                                setParecerEndDay(dayObj.day);
                                              }}
                                              className="px-1.5 py-1.5 bg-orange-50 hover:bg-orange-400 hover:text-white text-orange-600 rounded-sm text-[10px] font-bold transition-colors w-full text-center cursor-pointer border border-orange-200 uppercase tracking-wider"
                                            >
                                              Aguardando Parecer Externo
                                            </button>
                                          )}

                                          {/* Expediente Administrativo Button */}
                                          {isExpediente ? (
                                            <button
                                              onMouseDown={() => handleClearExpediente(prof.id, dayObj.day)}
                                              className="px-1.5 py-1.5 bg-yellow-50 hover:bg-yellow-600 hover:text-white rounded-sm text-[10px] text-yellow-700 font-bold transition-colors w-full text-center cursor-pointer border border-yellow-200 uppercase tracking-wider"
                                            >
                                              Limpar Expediente Admin.
                                            </button>
                                          ) : (
                                            <button
                                              onMouseDown={() => {
                                                setIsLaunchingExpediente(true);
                                                setExpedienteEndDay(dayObj.day);
                                              }}
                                              className="px-1.5 py-1.5 bg-yellow-50 hover:bg-yellow-600 hover:text-white text-yellow-700 rounded-sm text-[10px] font-bold transition-colors w-full text-center cursor-pointer border border-yellow-200 uppercase tracking-wider"
                                            >
                                              Expediente Administrativo
                                            </button>
                                          )}
                                          
                                          {/* Clear cell */}
                                          <button
                                            onMouseDown={() => handleQuickSelectShift(prof.id, dayObj.day, "")}
                                            className="px-1.5 py-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-sm text-[10px] text-rose-600 font-bold transition-colors w-full text-center cursor-pointer border border-rose-100 uppercase tracking-wider"
                                          >
                                            Limpar Célula
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="min-h-[26px] flex items-center justify-center">
                                    {isIndisp || isParecer || isExpediente ? "" : (cellValue || "-")}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB CONTENT 3: REPORT VIEW & EXPORT PREVIEW */}
          {activeTab === "report" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm flex-1 flex flex-col p-6 overflow-y-auto">
              
              {/* Export Control Panel - Hidden in Print */}
              <div className="no-print bg-slate-50 border border-slate-200 p-4 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Visualização de Impressão da Escala
                    </h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsSignaturesModalOpen(true)}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    Assinaturas
                  </button>
                  <button
                    onClick={handlePrint}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    Imprimir Relatório (PDF)
                  </button>
                </div>
              </div>

              {/* PAPER PAGE CONTAINER - STYLED TO LOOK LIKE TWO STACKED A4 SHEETS */}
              <div className="print-area max-w-full overflow-x-auto mx-auto flex flex-col gap-12 print:gap-0 print:overflow-visible">
                
                {/* SHEET 1: GRADUADOS */}
                {activeScale === "GRADUADOS" && (
                  <div className="p-8 border border-slate-200 rounded-sm bg-white shadow-md print:shadow-none print:border-none print:p-0 w-[1120px] max-w-[1120px] print:w-full print:max-w-full flex flex-col gap-6 text-black">
                  
                  {/* Official Document Header with Legend */}
                  <div className="flex items-center gap-16">
                    <img src="/pco.png" alt="DTCEA-PCO Logo" className="w-[200px] h-[200px] object-contain shrink-0" referrerPolicy="no-referrer" />
                    <div className="flex-1 flex flex-col pl-6">
                      <h2 className="print-title uppercase text-center font-bold text-black" style={{ fontSize: '16px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', lineHeight: '1.2' }}>
                        DESTACAMENTO DE CONTROLE DO ESPAÇO AÉREO DO PICO DO COUTO
                      </h2>
                      <h3 className="print-subtitle uppercase text-center font-bold text-black mt-1" style={{ fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', lineHeight: '1.2' }}>
                        ESCALA DE SERVIÇO DE SEGURANÇA E DEFESA, TÉCNICO DE DIA, OPERADOR DE KF E MOTORISTA DE COLETIVO
                      </h3>
                      
                      {/* Sub-row for Legendas label and Month Year */}
                      <div className="flex justify-between items-end mt-3 px-1">
                        <span className="font-bold text-black uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                          Legendas:
                        </span>
                        <span className="font-bold text-black uppercase text-center flex-1 pr-12" style={{ fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                          {MONTHS[selectedMonth].label.toUpperCase()} - {selectedYear}
                        </span>
                      </div>

                      {/* Color blocks row */}
                      <div className="flex justify-between gap-2 mt-2 px-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-3.5 border border-black bg-red-600 shrink-0"></div>
                          <span className="font-bold text-black uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                            Dispensas Regulamentares
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-3.5 border border-black bg-orange-400 shrink-0"></div>
                          <span className="font-bold text-black uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                            Aguardando Parecer Externo
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-3.5 border border-black bg-yellow-400 shrink-0"></div>
                          <span className="font-bold text-black uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                            Expediente Administrativo ou Acompanhamento Técnico
                          </span>
                        </div>
                      </div>

                      {/* Service Abbreviations row */}
                      <div className="flex flex-col gap-y-0.5 mt-2.5 px-1 pt-1.5">
                        <div className="grid grid-cols-3 gap-x-4">
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              SD – SEGURANÇA E DEFESA
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              KF – OPERADOR DE KF
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              MC – MOTORISTA DE COLETIVO
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-[33.33%] shrink-0 pr-4">
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              TD – TÉCNICO DE DIA
                            </span>
                          </div>
                          <div className="flex-1 whitespace-nowrap pr-4">
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              AC – ACUMULANDO SEGURANÇA E DEFESA E TÉCNICO DE DIA
                            </span>
                          </div>
                          <div className="shrink-0 pl-12 pr-4">
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              * – SERVIÇO EXTRA
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Compact Table */}
                  <div className="border-[2.5px] border-black rounded-sm overflow-hidden">
                    <table className="print-table w-full text-left border-collapse" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      <thead>
                        <tr className="text-slate-800 font-bold uppercase border-b border-black">
                          <th className="py-1 px-1.5 border-r-[3.5px] border-r-black w-48 bg-black text-white font-bold uppercase" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>MILITARES</th>
                          {daysArray.map((dayObj) => (
                            <th 
                              key={dayObj.day} 
                              onClick={() => setSelectedDayForPopup(dayObj.day)}
                              title={`Ver militares de serviço no dia ${dayObj.day}`}
                              className={`p-0 text-center font-mono font-bold text-white border-r border-black min-w-[20px] cursor-pointer hover:opacity-80 transition-opacity ${
                                dayObj.isWeekend ? "bg-[#990000]" : "bg-[#0b5394]"
                              }`}
                              style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}
                            >
                              {dayObj.day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black">
                        {sortedGraduados.length === 0 ? (
                          <tr>
                            <td colSpan={daysInMonth + 1} className="py-8 text-center text-slate-400 font-bold" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                              Nenhum graduado cadastrado nesta escala. Carregue escalas para visualizar.
                            </td>
                          </tr>
                        ) : (
                          sortedGraduados.map((prof, idx) => (
                            <tr key={prof.id} className={`hover:opacity-90 ${idx % 2 === 0 ? "bg-white" : "bg-[#b7b7b7]"}`}>
                              <td className="py-0.5 px-1.5 font-bold border-r-[3.5px] border-r-black text-slate-900 whitespace-nowrap uppercase" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                                {prof.rank ? `${prof.rank} ` : ""}
                                {prof.specialty ? `${prof.specialty} ` : ""}
                                {prof.name}
                              </td>
                              {daysArray.map((dayObj) => {
                                const val = cellState[prof.id]?.[dayObj.day] || "";
                                const isIndisp = val === "INDISP";
                                const isParecer = val === "PARECER";
                                const isExpediente = val === "EXPEDIENTE";
                                const hasVal = val && val.trim() !== "";
                                const printTextClass = (isIndisp || isParecer) 
                                  ? "text-white" 
                                  : isExpediente
                                  ? "text-slate-900"
                                  : (hasVal 
                                      ? getCellFontColor(dayObj.day, selectedMonth, selectedYear) 
                                      : "text-slate-300");

                                return (
                                  <td 
                                    key={dayObj.day} 
                                    className={`p-0 text-center font-mono font-bold border-r border-black ${
                                      isIndisp ? "bg-red-600 font-black" :
                                      isParecer ? "bg-orange-400 font-black" :
                                      isExpediente ? "bg-yellow-400 font-black" :
                                      dayObj.isWeekend ? "bg-amber-50/10" : ""
                                    } ${printTextClass}`}
                                    style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}
                                  >
                                    {isIndisp || isParecer || isExpediente ? "" : (val || "")}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Approval Signatures */}
                  {signers.length > 0 && (
                    <div className="print-signatures grid grid-cols-3 gap-y-10 gap-x-8 mt-10 pt-6 text-center">
                      {signers.map((signer) => (
                        <div key={signer.id} className="flex flex-col items-center">
                          <div className="w-64 mb-1.5 h-12"></div>
                          <div className="text-black font-bold uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                            {signer.fullName} {signer.rank ? `- ${signer.rank}` : ""}
                          </div>
                          <div className="text-black font-bold uppercase mt-1" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                            {signer.role}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

                  {/* SHEET 2: SOLDADOS */}
                  {activeScale === "SOLDADOS" && (
                    <div className="p-8 border border-slate-200 rounded-sm bg-white shadow-md print:shadow-none print:border-none print:p-0 w-[1120px] max-w-[1120px] print:w-full print:max-w-full flex flex-col gap-6 text-black">
                    
                    {/* Official Document Header with Legend */}
                    <div className="flex items-center gap-16">
                      <img src="/pco.png" alt="DTCEA-PCO Logo" className="w-[200px] h-[200px] object-contain shrink-0" referrerPolicy="no-referrer" />
                      <div className="flex-1 flex flex-col pl-6">
                        <h2 className="print-title uppercase text-center font-bold text-black" style={{ fontSize: '16px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', lineHeight: '1.2' }}>
                          DESTACAMENTO DE CONTROLE DO ESPAÇO AÉREO DO PICO DO COUTO
                        </h2>
                        <h3 className="print-subtitle uppercase text-center font-bold text-black mt-1" style={{ fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', lineHeight: '1.2' }}>
                          ESCALA DE SERVIÇO DE SENTINELA, MOTORISTA DE DIA E PERMANÊNCIA A VILA MILITAR
                        </h3>
                        
                        {/* Sub-row for Legendas label and Month Year */}
                        <div className="flex justify-between items-end mt-3 px-1">
                          <span className="font-bold text-black uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                            Legendas:
                          </span>
                          <span className="font-bold text-black uppercase text-center flex-1 pr-12" style={{ fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                            {MONTHS[selectedMonth].label.toUpperCase()} - {selectedYear}
                          </span>
                        </div>

                        {/* Color blocks row */}
                        <div className="flex justify-between gap-2 mt-2 px-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-3.5 border border-black bg-red-600 shrink-0"></div>
                            <span className="font-bold text-black uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              Dispensas Regulamentares
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-3.5 border border-black bg-orange-400 shrink-0"></div>
                            <span className="font-bold text-black uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              Aguardando Parecer Externo
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-3.5 border border-black bg-yellow-400 shrink-0"></div>
                            <span className="font-bold text-black uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              Expediente Administrativo ou Acompanhamento Técnico
                            </span>
                          </div>
                        </div>

                        {/* Service Abbreviations row */}
                        <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 mt-2.5 px-1 pt-1.5">
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              ST – SENTINELA
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              PV – PERMANÊNCIA À VILA MILITAR
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              SM – SOBREAVISO DE MOTORISTA DE DIA
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              MD – MOTORISTA DE DIA
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              SS – SOBREAVISO DE SENTINELA E PERMANÊNCIA
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-black" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              * – SERVIÇO EXTRA
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Compact Table */}
                    <div className="border-[2.5px] border-black rounded-sm overflow-hidden">
                      <table className="print-table w-full text-left border-collapse" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                        <thead>
                          <tr className="text-slate-800 font-bold uppercase border-b border-black">
                            <th className="py-1 px-1.5 border-r-[3.5px] border-r-black w-48 bg-black text-white font-bold uppercase" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>MILITARES / CIVIS</th>
                            {daysArray.map((dayObj) => (
                              <th 
                                key={dayObj.day} 
                                onClick={() => setSelectedDayForPopup(dayObj.day)}
                                title={`Ver militares de serviço no dia ${dayObj.day}`}
                                className={`p-0 text-center font-mono font-bold text-white border-r border-black min-w-[20px] cursor-pointer hover:opacity-80 transition-opacity ${
                                  dayObj.isWeekend ? "bg-[#990000]" : "bg-[#0b5394]"
                                }`}
                                style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}
                              >
                                {dayObj.day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                          {sortedSoldados.length === 0 ? (
                            <tr>
                              <td colSpan={daysInMonth + 1} className="py-8 text-center text-slate-400 font-bold" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                                Nenhum soldado cadastrado nesta escala. Carregue escalas para visualizar.
                              </td>
                            </tr>
                          ) : (
                            sortedSoldados.map((prof, idx) => (
                              <tr key={prof.id} className={`hover:opacity-90 ${idx % 2 === 0 ? "bg-white" : "bg-[#b7b7b7]"}`}>
                                <td className="py-0.5 px-1.5 font-bold border-r-[3.5px] border-r-black text-slate-900 whitespace-nowrap uppercase" style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                                  {prof.rank ? `${prof.rank} ` : ""}
                                  {prof.specialty ? `${prof.specialty} ` : ""}
                                  {prof.name}
                                </td>
                                {daysArray.map((dayObj) => {
                                  const val = cellState[prof.id]?.[dayObj.day] || "";
                                  const isIndisp = val === "INDISP";
                                  const isParecer = val === "PARECER";
                                  const isExpediente = val === "EXPEDIENTE";
                                  const hasVal = val && val.trim() !== "";
                                  const printTextClass = (isIndisp || isParecer) 
                                    ? "text-white" 
                                    : isExpediente
                                    ? "text-slate-900"
                                    : (hasVal 
                                        ? getCellFontColor(dayObj.day, selectedMonth, selectedYear) 
                                        : "text-slate-300");

                                  return (
                                    <td 
                                      key={dayObj.day} 
                                      className={`p-0 text-center font-mono font-bold border-r border-black ${
                                        isIndisp ? "bg-red-600 font-black" :
                                        isParecer ? "bg-orange-400 font-black" :
                                        isExpediente ? "bg-yellow-400 font-black" :
                                        dayObj.isWeekend ? "bg-amber-50/10" : ""
                                      } ${printTextClass}`}
                                      style={{ fontSize: '11px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}
                                    >
                                      {isIndisp || isParecer || isExpediente ? "" : (val || "")}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Approval Signatures */}
                    {signers.length > 0 && (
                      <div className="print-signatures grid grid-cols-3 gap-y-10 gap-x-8 mt-10 pt-6 text-center">
                        {signers.map((signer) => (
                          <div key={signer.id} className="flex flex-col items-center">
                            <div className="w-64 mb-1.5 h-12"></div>
                            <div className="text-black font-bold uppercase" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              {signer.fullName} {signer.rank ? `- ${signer.rank}` : ""}
                            </div>
                            <div className="text-black font-bold uppercase mt-1" style={{ fontSize: '10px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>
                              {signer.role}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* Footer Controls & Stats Summary removed per user request */}

        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="no-print h-8 bg-indigo-900 flex items-center px-6 justify-end shrink-0 text-white mt-auto">
        <div className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">
          2026 - v0.0.1 - Desenvolvido por Armindo Neto
        </div>
      </footer>
    </div>
  );
}
