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
  HelpCircle
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
  CoverageStats
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
];

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

  // Navigation and UI state
  const [activeTab, setActiveTab] = useState<"grid" | "report">("grid");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{ profId: string; day: number } | null>(null);
  const [quickEditValue, setQuickEditValue] = useState<string>("");

  // Notification and warning overlay state
  const [notification, setNotification] = useState<{ type: "success" | "warning" | "error" | "info"; message: string } | null>(null);

  // Manual entry state
  const [manualName, setManualName] = useState<string>("");

  const fileInputRefs = useRef<{ [slotId: string]: HTMLInputElement | null }>({});

  // Load data on mount / month / year change
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

          setProfessionals(mData || []);
          setCellState(sData?.cell_state || {});
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
            let loadedCells = {};
            if (sData.data) {
              loadedCells = sData.data.cell_state || {};
            }

            setProfessionals(loadedProfs);
            setCellState(loadedCells);
            setDbSyncStatus('synced');
          } else {
            // Fallback to local storage
            const localProfs = localStorage.getItem("military_professionals");
            const localCells = localStorage.getItem(`military_scales_${selectedMonth}_${selectedYear}`);

            if (localProfs) setProfessionals(JSON.parse(localProfs));
            else setProfessionals([]);

            if (localCells) setCellState(JSON.parse(localCells));
            else setCellState({});

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

        if (localProfs) setProfessionals(JSON.parse(localProfs));
        else setProfessionals([]);

        if (localCells) setCellState(JSON.parse(localCells));
        else setCellState({});
        
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

    // LocalStorage save is immediate so local data is always up-to-date
    localStorage.setItem("military_professionals", JSON.stringify(professionals));
    localStorage.setItem(`military_scales_${selectedMonth}_${selectedYear}`, JSON.stringify(cellState));

    // Only sync to Supabase if there are dirty (unsaved) changes
    if (!isDirty) return;

    setDbSyncStatus('loading');

    const handler = setTimeout(async () => {
      try {
        if (clientSupabase) {
          // 1. Save professionals
          if (professionals && professionals.length > 0) {
            const { error: mError } = await (clientSupabase as any)
              .from("military_professionals")
              .upsert(professionals, { onConflict: "id" });
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
              cell_state: cellState
            }, { onConflict: "id" });
          if (sError) throw sError;

          setDbSyncStatus('synced');
          setIsDirty(false);
        } else if (supabaseConfigured) {
          // Save via server-side API proxy
          // 1. Save professionals
          const mRes = await fetch("/api/military", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ professionals }),
          });
          
          // 2. Save monthly scales
          const sRes = await fetch("/api/scales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              month: selectedMonth,
              year: selectedYear,
              cellState
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
  }, [professionals, cellState, selectedMonth, selectedYear, initialLoadDone, isDirty, supabaseConfigured]);

  // Save current data state to Supabase or LocalStorage
  const handleSaveData = async () => {
    setDbSyncStatus('loading');
    try {
      // Always save a local copy immediately first to prevent ANY data loss
      localStorage.setItem("military_professionals", JSON.stringify(professionals));
      localStorage.setItem(`military_scales_${selectedMonth}_${selectedYear}`, JSON.stringify(cellState));

      if (clientSupabase) {
        // Direct client-side connection save
        // 1. Save professionals
        if (professionals && professionals.length > 0) {
          const { error: mError } = await (clientSupabase as any)
            .from("military_professionals")
            .upsert(professionals, { onConflict: "id" });
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
            cell_state: cellState
          }, { onConflict: "id" });
        if (sError) throw sError;

        setDbSyncStatus('synced');
        setIsDirty(false);
        triggerNotification("success", "Dados salvos e sincronizados diretamente com o Supabase!");
      } else if (supabaseConfigured) {
        // Save via server-side proxy
        // 1. Save professionals
        const mRes = await fetch("/api/military", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ professionals }),
        });
        
        // 2. Save monthly scales
        const sRes = await fetch("/api/scales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            month: selectedMonth,
            year: selectedYear,
            cellState
          }),
        });

        if (mRes.ok && sRes.ok) {
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
      handleFileUpload(slotId, slot.fileToProcess);
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

  // Filter military personnel based on search and active scale
  const filteredProfessionals = useMemo(() => {
    return professionals.filter((p) => {
      return p.category === activeScale && p.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [professionals, searchQuery, activeScale]);

  // Show a status notification helper
  const triggerNotification = (type: "success" | "warning" | "error" | "info", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => prev?.message === message ? null : prev);
    }, 6000);
  };

  // Parse response scales and merge into state
  const handleMergeParsedScale = (parsed: ParsedScale) => {
    // 1. Assign unique IDs to military personnel and insert them
    const newProfs: Professional[] = [];
    const newCellEntries: { [profId: string]: { [day: number]: string } } = {};

    const scaleCode = parsed.role.split(" - ")[0] || "MD";

    parsed.professionals.forEach((parsedProf) => {
      // Clean name
      const cleanName = parsedProf.name.trim();
      if (!cleanName) return;

      // Check if military with same name and category already exists
      let existing = professionals.find(
        (p) => p.name.toLowerCase() === cleanName.toLowerCase() && p.category === activeScale
      );

      let profId: string;
      if (existing) {
        profId = existing.id;
      } else {
        profId = `prof-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        newProfs.push({
          id: profId,
          name: cleanName,
          role: "Geral",
          category: activeScale,
        });
      }

      // Prepare their cell schedule entries using the 2-letter scale code
      newCellEntries[profId] = {};
      parsedProf.days.forEach((duty) => {
        if (duty.day >= 1 && duty.day <= daysInMonth) {
          newCellEntries[profId][duty.day] = scaleCode;
        }
      });
    });

    // Update military state
    setProfessionals((prev) => {
      // Filter out newProfs that might have duplicates in the same category, then append
      const filteredNew = newProfs.filter(
        (np) => !prev.some((p) => p.name.toLowerCase() === np.name.toLowerCase() && p.category === activeScale)
      );
      return [...prev, ...filteredNew];
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
        handleMergeParsedScale(data);

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
      const simulatedScale = generateMockScale(slot.defaultRole, selectedMonth, selectedYear);
      handleMergeParsedScale(simulatedScale);

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

  // Clear everything
  const handleClearAll = () => {
    if (window.confirm("Deseja mesmo limpar todos os dados carregados de escalas e militares?")) {
      setProfessionals([]);
      setCellState({});
      setSlots(DEFAULT_SLOTS.map((s) => ({ ...s })));
      setIsDirty(true);
      triggerNotification("success", "Todo o consolidado foi redefinido com sucesso.");
    }
  };

  // Manual military addition
  const handleAddManualProfessional = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      triggerNotification("warning", "O nome do militar é obrigatório.");
      return;
    }

    const profId = `prof-manual-${Date.now()}`;
    const newProf: Professional = {
      id: profId,
      name: manualName.trim(),
      role: "Geral",
      category: activeScale,
    };

    setProfessionals((prev) => [...prev, newProf]);
    setManualName("");
    setIsDirty(true);
    triggerNotification("success", `Militar "${newProf.name}" adicionado com sucesso.`);
  };

  // Delete a military
  const handleDeleteProfessional = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza de que deseja excluir o militar ${name}?`)) {
      setProfessionals((prev) => prev.filter((p) => p.id !== id));
      setCellState((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setIsDirty(true);

      if (clientSupabase) {
        try {
          await (clientSupabase as any).from("military_professionals").delete().eq("id", id);
        } catch (err) {
          console.error("Erro ao deletar militar diretamente do Supabase:", err);
        }
      } else if (supabaseConfigured) {
        try {
          await fetch(`/api/military/${id}`, { method: "DELETE" });
        } catch (err) {
          console.error("Erro ao deletar militar do banco:", err);
        }
      }
      triggerNotification("info", `Militar ${name} foi excluído.`);
    }
  };

  // Cell Edit Actions
  const handleCellClick = (profId: string, day: number) => {
    setEditingCell({ profId, day });
    setQuickEditValue(cellState[profId]?.[day] || "");
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
    window.print();
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
            {dbSyncStatus === 'synced' && "Supabase: Sincronizado"}
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
                    if (localProfs) setProfessionals(JSON.parse(localProfs));
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
          <div className="flex items-center gap-2">
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
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <button 
            onClick={handleClearAll}
            className="px-3 py-1 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 rounded transition-colors"
            title="Limpar todos os dados"
          >
            Limpar Dados
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden max-w-[1600px] w-full mx-auto p-6 gap-6 print:p-0">
        
        {/* Sidebar: PDF Upload Management (Left) - Hidden in Print */}
        <aside className="no-print w-full xl:w-80 bg-white border border-slate-200 rounded p-6 flex flex-col gap-4 overflow-hidden shrink-0">
          <h2 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">
            Carga de Arquivos ({slots.filter(s => s.status === 'success').length}/9)
          </h2>
          
          <div className="space-y-3 overflow-y-auto pr-1">
            {slots.map((slot, index) => (
              <div 
                key={slot.id} 
                className={`p-3 rounded border transition-all ${
                  slot.status === "success" ? "border-2 border-dashed border-indigo-200 bg-indigo-50/50" :
                  slot.status === "queued" ? "border border-amber-200 bg-amber-50/10" :
                  slot.status === "uploading" ? "border border-indigo-200 bg-indigo-50/20 animate-pulse" :
                  slot.status === "error" ? "border border-rose-200 bg-rose-50/30" :
                  "border border-slate-200 bg-white hover:border-indigo-200"
                }`}
              >
                {/* Title and role name */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center justify-between w-full overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate" title={slot.defaultRole}>
                      0{index + 1}. {slot.defaultRole}
                    </span>
                  </div>
                </div>

                {/* Idle slot upload choices */}
                {slot.status === "idle" && (
                  <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400 italic font-medium">Aguardando...</span>
                    <div className="flex gap-3">
                      <label className="text-[10px] text-indigo-600 font-black underline uppercase cursor-pointer hover:text-indigo-800 tracking-wider">
                        Selecionar
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setSlots((prev) =>
                                prev.map((s) =>
                                  s.id === slot.id
                                    ? {
                                        ...s,
                                        fileName: file.name,
                                        status: "queued",
                                        fileToProcess: file,
                                        errorMsg: null,
                                      }
                                    : s
                                )
                              );
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Queued Status */}
                {slot.status === "queued" && (
                  <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-100/80">
                    <span className="text-[11px] text-amber-800 font-bold truncate max-w-[130px] italic" title={slot.fileName || ""}>
                      {slot.fileName}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetSlot(slot.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                        title="Cancelar upload"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleProcessQueue(slot.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-full transition-all shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                        title="Processar e incluir dados na escala"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Uploading Status */}
                {slot.status === "uploading" && (
                  <div className="flex items-center gap-1.5 py-1 text-[11px] text-indigo-800 font-bold uppercase">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />
                    <span className="truncate">Analisando...</span>
                  </div>
                )}

                {/* Success Status */}
                {slot.status === "success" && (
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-600 font-medium truncate max-w-[150px]" title={slot.fileName || ""}>
                      {slot.fileName}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-sm font-black uppercase">OK</span>
                      <button
                        onClick={() => handleResetSlot(slot.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                        title="Remover escala"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Status */}
                {slot.status === "error" && (
                  <div className="mt-1 flex flex-col gap-1.5">
                    <span className="text-[10px] text-rose-600 font-medium line-clamp-2 leading-tight">
                      {slot.errorMsg || "Erro na leitura do PDF."}
                    </span>
                    <div className="flex justify-end items-center pt-1 border-t border-slate-100">
                      <button
                        onClick={() => handleResetSlot(slot.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Data Area (Center/Right) */}
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
                Escala Consolidada (Grade)
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
                Visualizar Impressão (PDF)
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
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  ESCALA ({activeScale}): <span className="text-indigo-600 italic font-display">{MONTHS[selectedMonth].label} {selectedYear}</span>
                </h3>
              </div>

              {/* Filters Toolbar */}
              <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Text query search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="BUSCAR MILITAR..."
                      className="bg-white border border-slate-200 rounded pl-9 pr-3 py-1.5 text-[11px] font-bold tracking-wider focus:outline-hidden focus:border-indigo-500 w-52 text-slate-800 placeholder-slate-400"
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
                </div>

                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider max-w-sm flex items-center gap-1.5 bg-white px-3 py-2 border border-slate-200 rounded">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Dica: clique em uma célula para alterar a escala/serviço.</span>
                </div>
              </div>

              {/* Consolidated Table View */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-10 bg-slate-50 border-r border-slate-200/50 min-w-[180px]">
                        Militar
                      </th>
                      {daysArray.map((dayObj) => (
                        <th
                          key={dayObj.day}
                          className={`px-1 py-2 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-center font-mono min-w-[34px] ${
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
                          <td className="px-4 py-2 bg-white sticky left-0 z-10 border-r border-slate-200/80 shadow-[2px_0_5px_rgba(0,0,0,0.01)] flex items-center justify-between group-hover:bg-slate-50">
                            <span className="truncate max-w-[140px] uppercase text-xs font-bold text-slate-900">{prof.name}</span>
                            <button
                              onClick={() => handleDeleteProfessional(prof.id, prof.name)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-0.5 transition-all no-print cursor-pointer"
                              title="Excluir militar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>

                          {/* Duty days rendering */}
                          {daysArray.map((dayObj) => {
                            const cellValue = cellState[prof.id]?.[dayObj.day] || "";
                            const isEditing = editingCell?.profId === prof.id && editingCell?.day === dayObj.day;

                            // Mapping 9 service colors
                            const serviceColors: { [key: string]: string } = {
                              MD: "text-blue-700 bg-blue-50/50 hover:bg-blue-100/60",
                              PV: "text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/60",
                              SD: "text-purple-700 bg-purple-50/50 hover:bg-purple-100/60",
                              SM: "text-emerald-700 bg-emerald-50/40 hover:bg-emerald-100/50",
                              SS: "text-cyan-700 bg-cyan-50/40 hover:bg-cyan-100/50",
                              ST: "text-amber-700 bg-amber-50/40 hover:bg-amber-100/50",
                              KF: "text-fuchsia-700 bg-fuchsia-50/40 hover:bg-fuchsia-100/50",
                              TD: "text-rose-700 bg-rose-50/40 hover:bg-rose-100/50",
                              MC: "text-teal-700 bg-teal-50/40 hover:bg-teal-100/50",
                            };

                            const colorClass = serviceColors[cellValue.toUpperCase()] || 
                              (cellValue && cellValue.trim() !== "" ? "text-slate-800 bg-slate-100 hover:bg-slate-200" : "hover:bg-slate-100/50");

                            return (
                              <td
                                key={dayObj.day}
                                onClick={() => !isEditing && handleCellClick(prof.id, dayObj.day)}
                                className={`p-0.5 text-center font-mono font-bold text-xs select-none cursor-pointer transition-colors border-r border-slate-100 ${
                                  dayObj.isWeekend ? "bg-amber-50/10" : ""
                                } ${colorClass}`}
                              >
                                {isEditing ? (
                                  <div className="relative z-50 p-0.5 min-w-[60px]" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={quickEditValue}
                                      onChange={(e) => setQuickEditValue(e.target.value)}
                                      className="w-full bg-white border border-indigo-600 rounded-sm text-center py-0.5 font-bold font-mono text-slate-900 focus:outline-hidden"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCellSave(prof.id, dayObj.day, quickEditValue);
                                        if (e.key === "Escape") setEditingCell(null);
                                      }}
                                      onBlur={() => handleCellSave(prof.id, dayObj.day, quickEditValue)}
                                    />
                                    {/* Quick Shift Selection Dropdown */}
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded shadow-lg py-1 px-1.5 flex flex-wrap gap-1 w-52 z-50">
                                      {SCALE_OPTIONS.map((opt) => (
                                        <button
                                          key={opt.code}
                                          title={opt.label}
                                          onMouseDown={() => handleQuickSelectShift(prof.id, dayObj.day, opt.code)}
                                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-600 hover:text-white rounded-sm text-[10px] font-bold transition-colors cursor-pointer"
                                        >
                                          {opt.code}
                                        </button>
                                      ))}
                                      <button
                                        onMouseDown={() => handleQuickSelectShift(prof.id, dayObj.day, "")}
                                        className="px-1.5 py-0.5 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-sm text-[10px] text-rose-600 font-bold transition-colors w-full text-center cursor-pointer"
                                      >
                                        Limpar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="min-h-[26px] flex items-center justify-center">
                                    {cellValue || "-"}
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

              {/* manual additions footer section */}
              <div className="no-print p-4 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
                <form onSubmit={handleAddManualProfessional} className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Plus className="w-4 h-4 text-slate-400" /> Adicionar Militar:
                  </span>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="NOME COMPLETO..."
                    className="bg-white border border-slate-200 rounded px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider focus:outline-hidden focus:border-indigo-500 w-52 text-slate-800"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-4 py-2 rounded uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Incluir na Grade
                  </button>
                </form>
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
                      Visualização de Impressão do Relatório Consolidado
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Esta visualização simula perfeitamente o formato A4 paisagem para impressão do relatório.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                  >
                    Imprimir Relatório (PDF)
                  </button>
                </div>
              </div>

              {/* PAPER PAGE CONTAINER - STYLED TO LOOK LIKE TWO STACKED A4 SHEETS */}
              <div className="print-area max-w-full overflow-x-auto mx-auto flex flex-col gap-12">
                
                {/* SHEET 1: GRADUADOS */}
                <div className="p-8 border border-slate-200 rounded-sm bg-white shadow-md print:shadow-none print:border-none print:p-0 min-w-[1000px] flex flex-col gap-6 text-black" style={{ pageBreakAfter: 'always' }}>
                  {/* Official Document Header */}
                  <div className="border-b-4 border-slate-900 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src="/pco.png" alt="DTCEA-PCO Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                      <div>
                        <h2 className="text-lg font-black font-display tracking-tight text-slate-900 uppercase">
                          Escala de Serviço Consolidada de Graduados
                        </h2>
                        <div className="text-xs text-slate-500 font-bold flex gap-4 mt-0.5">
                          <span>PERÍODO: {MONTHS[selectedMonth].label.toUpperCase()} DE {selectedYear}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase tracking-wider block text-slate-400">Data de Geração</span>
                      <span className="text-xs font-mono font-bold">{new Date().toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>

                  {/* Official Info Blocks */}
                  <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded-sm text-xs font-medium border border-slate-200">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Gestor Responsável</span>
                      <span className="font-bold text-slate-800">Coordenação de Escalas</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Efetivo de Graduados</span>
                      <span className="font-bold text-indigo-700">{professionals.filter(p => p.category === 'GRADUADOS').length} Militares</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Mês/Ano</span>
                      <span className="font-bold text-slate-800">{MONTHS[selectedMonth].label.toUpperCase()} DE {selectedYear}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Status</span>
                      <span className="font-bold text-emerald-700 uppercase flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Escala Homologada
                      </span>
                    </div>
                  </div>

                  {/* Main Compact Table */}
                  <div className="border border-slate-300 rounded-sm overflow-hidden">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 font-bold uppercase border-b border-slate-300">
                          <th className="py-2 px-3 border-r border-slate-300 w-48">Militar (Graduado)</th>
                          {daysArray.map((dayObj) => (
                            <th 
                              key={dayObj.day} 
                              className={`p-1 text-center font-mono border-r border-slate-300 min-w-[20px] ${
                                dayObj.isWeekend ? "bg-amber-100 text-amber-800" : ""
                              }`}
                            >
                              {dayObj.day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {professionals.filter(p => p.category === 'GRADUADOS').length === 0 ? (
                          <tr>
                            <td colSpan={daysInMonth + 1} className="py-8 text-center text-slate-400 font-bold">
                              Nenhum graduado cadastrado nesta escala. Carregue escalas para visualizar.
                            </td>
                          </tr>
                        ) : (
                          professionals.filter(p => p.category === 'GRADUADOS').map((prof) => (
                            <tr key={prof.id} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-semibold border-r border-slate-200 text-slate-900 whitespace-nowrap uppercase">
                                {prof.name}
                              </td>
                              {daysArray.map((dayObj) => {
                                const val = cellState[prof.id]?.[dayObj.day] || "";
                                return (
                                  <td 
                                    key={dayObj.day} 
                                    className={`p-1 text-center font-mono font-bold border-r border-slate-200 ${
                                      dayObj.isWeekend ? "bg-amber-50/10" : ""
                                    }`}
                                  >
                                    {val || "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Report Legenda */}
                  <div className="flex flex-col gap-2 text-[9px] text-slate-500 border-t border-slate-200 pt-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="font-bold uppercase tracking-wider text-slate-700">Legenda de Serviços:</span>
                      {SCALE_OPTIONS.map((opt) => (
                        <span key={opt.code}>
                          <b>{opt.code}</b>: {opt.label}
                        </span>
                      ))}
                      <span><b>-</b>: Sem serviço</span>
                    </div>

                    <div className="text-right mt-1">
                      <span>Documento de Graduados emitido automaticamente pelo Consolidador de Escalas de Serviço</span>
                    </div>
                  </div>

                  {/* Approval Signatures */}
                  <div className="grid grid-cols-2 gap-12 mt-10 pt-6 border-t border-dashed border-slate-300 text-center text-xs font-sans font-sans">
                    <div className="flex flex-col items-center">
                      <div className="w-64 border-b border-black mb-1.5 h-10"></div>
                      <span className="font-bold text-slate-800">Responsável pelo Consolidado</span>
                      <span className="text-[10px] text-slate-400 font-medium">Assinatura / Carimbo</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-64 border-b border-black mb-1.5 h-10"></div>
                      <span className="font-bold text-slate-800">Diretoria Técnica / Administrativa</span>
                      <span className="text-[10px] text-slate-400 font-medium">Homologação da Escala</span>
                    </div>
                  </div>
                </div>

                {/* SHEET 2: SOLDADOS */}
                <div className="p-8 border border-slate-200 rounded-sm bg-white shadow-md print:shadow-none print:border-none print:p-0 min-w-[1000px] flex flex-col gap-6 text-black print:mt-12" style={{ pageBreakBefore: 'always' }}>
                  {/* Official Document Header */}
                  <div className="border-b-4 border-slate-900 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src="/pco.png" alt="DTCEA-PCO Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                      <div>
                        <h2 className="text-lg font-black font-display tracking-tight text-slate-900 uppercase">
                          Escala de Serviço Consolidada de Soldados
                        </h2>
                        <div className="text-xs text-slate-500 font-bold flex gap-4 mt-0.5">
                          <span>PERÍODO: {MONTHS[selectedMonth].label.toUpperCase()} DE {selectedYear}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase tracking-wider block text-slate-400">Data de Geração</span>
                      <span className="text-xs font-mono font-bold">{new Date().toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>

                  {/* Official Info Blocks */}
                  <div className="grid grid-cols-4 gap-4 bg-slate-50 p-3 rounded-sm text-xs font-medium border border-slate-200">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Gestor Responsável</span>
                      <span className="font-bold text-slate-800">Coordenação de Escalas</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Efetivo de Soldados</span>
                      <span className="font-bold text-indigo-700">{professionals.filter(p => p.category === 'SOLDADOS').length} Militares</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Mês/Ano</span>
                      <span className="font-bold text-slate-800">{MONTHS[selectedMonth].label.toUpperCase()} DE {selectedYear}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold uppercase">Status</span>
                      <span className="font-bold text-emerald-700 uppercase flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Escala Homologada
                      </span>
                    </div>
                  </div>

                  {/* Main Compact Table */}
                  <div className="border border-slate-300 rounded-sm overflow-hidden">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-800 font-bold uppercase border-b border-slate-300">
                          <th className="py-2 px-3 border-r border-slate-300 w-48">Militar (Soldado)</th>
                          {daysArray.map((dayObj) => (
                            <th 
                              key={dayObj.day} 
                              className={`p-1 text-center font-mono border-r border-slate-300 min-w-[20px] ${
                                dayObj.isWeekend ? "bg-amber-100 text-amber-800" : ""
                              }`}
                            >
                              {dayObj.day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {professionals.filter(p => p.category === 'SOLDADOS').length === 0 ? (
                          <tr>
                            <td colSpan={daysInMonth + 1} className="py-8 text-center text-slate-400 font-bold">
                              Nenhum soldado cadastrado nesta escala. Carregue escalas para visualizar.
                            </td>
                          </tr>
                        ) : (
                          professionals.filter(p => p.category === 'SOLDADOS').map((prof) => (
                            <tr key={prof.id} className="hover:bg-slate-50">
                              <td className="py-1.5 px-3 font-semibold border-r border-slate-200 text-slate-900 whitespace-nowrap uppercase">
                                {prof.name}
                              </td>
                              {daysArray.map((dayObj) => {
                                const val = cellState[prof.id]?.[dayObj.day] || "";
                                return (
                                  <td 
                                    key={dayObj.day} 
                                    className={`p-1 text-center font-mono font-bold border-r border-slate-200 ${
                                      dayObj.isWeekend ? "bg-amber-50/10" : ""
                                    }`}
                                  >
                                    {val || "-"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Report Legenda */}
                  <div className="flex flex-col gap-2 text-[9px] text-slate-500 border-t border-slate-200 pt-4">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="font-bold uppercase tracking-wider text-slate-700">Legenda de Serviços:</span>
                      {SCALE_OPTIONS.map((opt) => (
                        <span key={opt.code}>
                          <b>{opt.code}</b>: {opt.label}
                        </span>
                      ))}
                      <span><b>-</b>: Sem serviço</span>
                    </div>

                    <div className="text-right mt-1">
                      <span>Documento de Soldados emitido automaticamente pelo Consolidador de Escalas de Serviço</span>
                    </div>
                  </div>

                  {/* Approval Signatures */}
                  <div className="grid grid-cols-2 gap-12 mt-10 pt-6 border-t border-dashed border-slate-300 text-center text-xs font-sans font-sans">
                    <div className="flex flex-col items-center">
                      <div className="w-64 border-b border-black mb-1.5 h-10"></div>
                      <span className="font-bold text-slate-800">Responsável pelo Consolidado</span>
                      <span className="text-[10px] text-slate-400 font-medium">Assinatura / Carimbo</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-64 border-b border-black mb-1.5 h-10"></div>
                      <span className="font-bold text-slate-800">Diretoria Técnica / Administrativa</span>
                      <span className="text-[10px] text-slate-400 font-medium">Homologação da Escala</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Footer Controls & Stats Summary removed per user request */}

        </div>
      </main>

      {/* Bottom Status Bar */}
      <footer className="no-print h-8 bg-indigo-900 flex items-center px-6 justify-between shrink-0 text-white mt-auto">
        <div className="flex gap-4 text-[9px] text-indigo-300 font-bold uppercase tracking-wider">
          <span>Sessão: Admin_01</span>
          <span>IP: 192.168.1.45</span>
          <span>Versão do Layout: V2.04</span>
        </div>
        <div className="text-[9px] text-white font-bold uppercase flex items-center gap-2 tracking-wider">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          Módulo de Extração de OCR Ativo
        </div>
      </footer>
    </div>
  );
}
