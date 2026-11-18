import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Supabase Client
const supabaseUrlRaw = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
let supabase: ReturnType<typeof createClient> | null = null;

let sRawUrl = supabaseUrlRaw.trim();
let sRawKey = supabaseAnonKey.trim();

// 1. Clean quotes if any
if (sRawUrl.startsWith('"') && sRawUrl.endsWith('"')) {
  sRawUrl = sRawUrl.slice(1, -1).trim();
} else if (sRawUrl.startsWith("'") && sRawUrl.endsWith("'")) {
  sRawUrl = sRawUrl.slice(1, -1).trim();
}

if (sRawKey.startsWith('"') && sRawKey.endsWith('"')) {
  sRawKey = sRawKey.slice(1, -1).trim();
} else if (sRawKey.startsWith("'") && sRawKey.endsWith("'")) {
  sRawKey = sRawKey.slice(1, -1).trim();
}

// Self-healing: Check if URL is actually a key
let cleanSupabaseUrl = sRawUrl;
let cleanSupabaseAnonKey = sRawKey;

if (sRawUrl.startsWith("sb_publishable_") || sRawUrl.startsWith("sb_secret_")) {
  cleanSupabaseAnonKey = sRawUrl;
  cleanSupabaseUrl = "https://mbfpvjnmbugihvvcsgxq.supabase.co";
}

if (!cleanSupabaseAnonKey && (sRawUrl.startsWith("sb_publishable_") || sRawUrl.startsWith("sb_secret_"))) {
  cleanSupabaseAnonKey = sRawUrl;
}

if (!cleanSupabaseUrl || !cleanSupabaseUrl.startsWith("http")) {
  cleanSupabaseUrl = "https://mbfpvjnmbugihvvcsgxq.supabase.co";
}

// In case keys are swapped
if (!cleanSupabaseUrl.startsWith("http") && cleanSupabaseAnonKey.startsWith("http")) {
  const temp = cleanSupabaseUrl;
  cleanSupabaseUrl = cleanSupabaseAnonKey;
  cleanSupabaseAnonKey = temp;
}

if (cleanSupabaseUrl.endsWith("/rest/v1/")) {
  cleanSupabaseUrl = cleanSupabaseUrl.slice(0, -9);
} else if (cleanSupabaseUrl.endsWith("/rest/v1")) {
  cleanSupabaseUrl = cleanSupabaseUrl.slice(0, -8);
}
if (cleanSupabaseUrl.endsWith("/")) {
  cleanSupabaseUrl = cleanSupabaseUrl.slice(0, -1);
}

try {
  if (cleanSupabaseUrl && cleanSupabaseAnonKey && cleanSupabaseUrl.startsWith("http")) {
    supabase = createClient(cleanSupabaseUrl, cleanSupabaseAnonKey);
  }
} catch (err) {
  console.error("Falha ao inicializar o cliente Supabase no servidor:", err);
}

// JSON payload limit (scale state for a full month can be large)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ limit: "5mb", extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Supabase status check
app.get("/api/supabase-status", (req, res) => {
  res.json({
    configured: !!supabase,
    url: supabaseUrlRaw ? supabaseUrlRaw.replace(/(https?:\/\/)[^.]+(\..+)/, "$1***$2") : ""
  });
});

// Database diagnostics route
app.get("/api/db-diagnose", async (req, res) => {
  if (!supabase) {
    res.json({ success: false, message: "Supabase não está configurado no servidor (variáveis de ambiente ausentes)." });
    return;
  }

  const diagnostics: any = {
    supabase_connected: true,
    tables: {}
  };

  try {
    // 1. Diagnose military_professionals
    const { data: mData, error: mError } = await supabase.from("military_professionals").select("*").limit(1);
    diagnostics.tables.military_professionals = {
      accessible: !mError,
      error: mError ? { message: mError.message, code: mError.code, details: mError.details } : null,
      sample_record: mData && mData.length > 0 ? mData[0] : null,
      columns: mData && mData.length > 0 ? Object.keys(mData[0]) : []
    };

    // Try a test insert with text ID to see if it fails due to type mismatch or missing columns
    const testId = `diag-test-${Date.now()}`;
    const { error: mInsertError } = await (supabase as any).from("military_professionals").insert({
      id: testId,
      name: "Teste Diagnostico",
      role: "Geral",
      category: "GRADUADOS"
    });

    diagnostics.tables.military_professionals.test_insert_text_id = {
      success: !mInsertError,
      error: mInsertError ? { message: mInsertError.message, code: mInsertError.code, details: mInsertError.details } : null
    };

    // Clean up test insert if successful
    if (!mInsertError) {
      await (supabase as any).from("military_professionals").delete().eq("id", testId);
    }

  } catch (err: any) {
    diagnostics.military_error = err.message;
  }

  try {
    // 2. Diagnose military_monthly_scales
    const { data: sData, error: sError } = await supabase.from("military_monthly_scales").select("*").limit(1);
    diagnostics.tables.military_monthly_scales = {
      accessible: !sError,
      error: sError ? { message: sError.message, code: sError.code, details: sError.details } : null,
      sample_record: sData && sData.length > 0 ? sData[0] : null,
      columns: sData && sData.length > 0 ? Object.keys(sData[0]) : []
    };

    // Test insert with custom ID and simple JSON
    const testScaleId = `scales-diag-test`;
    const { error: sInsertError } = await (supabase as any).from("military_monthly_scales").insert({
      id: testScaleId,
      month: 6,
      year: 2026,
      cell_state: {}
    });

    diagnostics.tables.military_monthly_scales.test_insert_text_id = {
      success: !sInsertError,
      error: sInsertError ? { message: sInsertError.message, code: sInsertError.code, details: sInsertError.details } : null
    };

    // Clean up test insert if successful
    if (!sInsertError) {
      await (supabase as any).from("military_monthly_scales").delete().eq("id", testScaleId);
    }
  } catch (err: any) {
    diagnostics.scales_error = err.message;
  }

  res.json(diagnostics);
});

// GET military list
app.get("/api/military", async (req, res) => {
  if (!supabase) {
    res.json({ success: true, local: true, data: [] });
    return;
  }
  try {
    const { data, error } = await supabase.from("military_professionals").select("*");
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Supabase error fetching military:", err);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

// POST save military list (upsert)
app.post("/api/military", async (req, res) => {
  const { professionals } = req.body;
  if (!supabase) {
    res.json({ success: true, local: true });
    return;
  }
  try {
    if (professionals && professionals.length > 0) {
      const { error } = await supabase.from("military_professionals").upsert(professionals, { onConflict: "id" });
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Supabase error saving military:", err);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

// DELETE single military
app.delete("/api/military/:id", async (req, res) => {
  const { id } = req.params;
  if (!supabase) {
    res.json({ success: true, local: true });
    return;
  }
  try {
    const { error } = await supabase.from("military_professionals").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error("Supabase error deleting military:", err);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

// GET monthly scale cellState
app.get("/api/scales", async (req, res) => {
  const month = parseInt(req.query.month as string);
  const year = parseInt(req.query.year as string);

  if (isNaN(month) || isNaN(year)) {
    res.status(400).json({ error: "INVALID_PARAMS", message: "Mês e ano são obrigatórios" });
    return;
  }

  if (!supabase) {
    res.json({ success: true, local: true, data: null });
    return;
  }

  try {
    let query = supabase.from("military_monthly_scales").select("*");
    if (month === 0 && year === 0) {
      query = query.eq("id", "global-signatures");
    } else {
      query = query.eq("month", month).eq("year", year);
    }
    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Supabase error fetching scales:", err);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

// POST save monthly scale cellState
app.post("/api/scales", async (req, res) => {
  const { month, year, cellState } = req.body;

  if (month === undefined || year === undefined || cellState === undefined) {
    res.status(400).json({ error: "INVALID_PARAMS", message: "Mês, ano e estado da escala são obrigatórios" });
    return;
  }

  if (!supabase) {
    res.json({ success: true, local: true });
    return;
  }

  try {
    const id = (month === 0 && year === 0) ? "global-signatures" : `scales-${month}-${year}`;
    const { error } = await (supabase as any)
      .from("military_monthly_scales")
      .upsert({
        id,
        month,
        year,
        cell_state: cellState
      }, { onConflict: "id" });

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error("Supabase error saving scales:", err);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

// Configure Vite or Static Files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Erro ao iniciar servidor:", err);
});
