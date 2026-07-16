import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Increase JSON payload limits for base64 file uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Lazy initializer for GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Supabase status check
app.get("/api/supabase-status", (req, res) => {
  res.json({
    configured: !!supabase,
    url: supabaseUrl ? supabaseUrl.replace(/(https?:\/\/)[^.]+(\..+)/, "$1***$2") : ""
  });
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
    const { data, error } = await supabase
      .from("military_monthly_scales")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();

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
    const id = `scales-${month}-${year}`;
    const { error } = await supabase
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

// Endpoint to parse schedule from PDF
app.post("/api/parse-pdf", async (req, res) => {
  const { fileName, fileBase64, roleName, monthYear } = req.body;

  if (!fileBase64) {
    res.status(400).json({ error: "O conteúdo do arquivo PDF (base64) é obrigatório." });
    return;
  }

  try {
    const ai = getGeminiClient();

    // Prepare the PDF inline part for Gemini
    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: fileBase64,
      },
    };

    const promptText = `Você é um assistente especialista em processamento de dados corporativos e hospitalares.
Sua tarefa é extrair com extrema precisão a escala de serviço deste documento PDF.
${roleName ? `A função/cargo principal esperada para este PDF é: "${roleName}".` : ""}
${monthYear ? `O mês/ano de referência esperado é: "${monthYear}".` : ""}

Analise o PDF fornecido e retorne um objeto JSON contendo os profissionais e os respectivos turnos de trabalho para cada dia do mês.

Regras de Extração:
1. Identifique o nome completo de cada profissional listado na escala.
2. Identifique quais dias do mês (números de 1 a 31) cada profissional está escalado para trabalhar.
3. Para cada dia escalado, extraia a sigla, nome do turno ou horário correspondente (ex: "D", "N", "T", "M", "Plantão", "12h", "24h" ou "07:00-19:00"). Mantenha a sigla/texto do turno curta e concisa (idealmente até 10 caracteres).
4. Ignore os dias de folga (não inclua no array de dias, ou se incluir, certifique-se de que representam apenas trabalho efetivo).
5. Extraia ou infira a função principal (role) do PDF (ex: "Médico", "Enfermeiro", "Recepcionista", "Técnico").
6. Extraia ou infira o mês e ano se estiverem visíveis no documento.

Importante: O retorno deve seguir estritamente o formato JSON especificado.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        pdfPart,
        { text: promptText }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            role: {
              type: Type.STRING,
              description: "Função ou setor da escala extraída (ex: Médico, Enfermeiro, Recepcionista, UTI)",
            },
            month: {
              type: Type.STRING,
              description: "Mês da escala extraída (ex: Julho)",
            },
            year: {
              type: Type.INTEGER,
              description: "Ano da escala extraído (ex: 2026)",
            },
            professionals: {
              type: Type.ARRAY,
              description: "Lista de profissionais identificados na escala",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "Nome do profissional",
                  },
                  days: {
                    type: Type.ARRAY,
                    description: "Lista de dias trabalhados e seus respectivos turnos",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: {
                          type: Type.INTEGER,
                          description: "Dia do mês (1 a 31)",
                        },
                        shift: {
                          type: Type.STRING,
                          description: "Sigla ou nome do turno correspondente (ex: D, N, M, T, 12h, 24h)",
                        },
                      },
                      required: ["day", "shift"],
                    },
                  },
                },
                required: ["name", "days"],
              },
            },
          },
          required: ["role", "professionals"],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Nenhuma resposta de texto gerada pelo modelo.");
    }

    const parsedData = JSON.parse(textOutput.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Erro ao processar PDF com Gemini:", error);
    if (error.message === "GEMINI_API_KEY_MISSING") {
      res.status(401).json({
        error: "GEMINI_API_KEY_MISSING",
        message: "A chave GEMINI_API_KEY não foi configurada. No painel lateral ou de configurações, configure sua API Key para habilitar a inteligência de IA real. Por enquanto, você pode usar a simulação de extração de alto fidelidade!",
      });
    } else {
      res.status(500).json({
        error: "EXTRACTION_FAILED",
        message: "Ocorreu um erro ao analisar o PDF. Verifique se o arquivo está legível ou use a simulação.",
        details: error.message,
      });
    }
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

setupServer();
