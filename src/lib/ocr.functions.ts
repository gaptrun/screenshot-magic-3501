import { createServerFn } from "@tanstack/react-start";

export type OcrResult = { ok: true; ci: string; nombres: string; apellidos: string } | { ok: false; error: string };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["ci", "nombres", "apellidos"],
  properties: {
    ci: { type: "string", description: "Número de cédula, solo dígitos, sin V/E ni puntos. Vacío si no se lee." },
    nombres: { type: "string" },
    apellidos: { type: "string" },
  },
};

export const leerCedula = createServerFn({ method: "POST" })
  .inputValidator((d: { image: string }) => {
    if (typeof d?.image !== "string" || !d.image.startsWith("data:image/") || d.image.length > 4_000_000)
      throw new Error("Imagen inválida");
    return d;
  })
  .handler(async ({ data }): Promise<OcrResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { ok: false, error: "Falta la configuración del servicio de IA." };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "Eres un lector OCR de cédulas de identidad venezolanas y carnets universitarios. Extrae exactamente el número de cédula (solo dígitos), los nombres y los apellidos tal como aparecen, con mayúscula inicial y acentos correctos. Si un dato no es legible, devuelve cadena vacía. No inventes datos.",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Lee este documento." },
              { type: "input_image", image_url: data.image, detail: "high" },
            ],
          },
        ],
        text: { format: { type: "json_schema", name: "cedula", strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      let msg = `Error ${res.status}`;
      try {
        const j = (await res.json()) as { error?: { message?: string }; message?: string };
        msg = j.error?.message ?? j.message ?? msg;
      } catch { /* ignore */ }
      if (res.status === 402) msg = "Sin créditos de IA disponibles. " + msg;
      if (res.status === 429) msg = "Demasiadas solicitudes, intente en unos segundos.";
      return { ok: false, error: msg };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type?: string; delta?: string; message?: string; error?: { message?: string } };
          if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed")
            return { ok: false, error: ev.error?.message ?? ev.message ?? "Error del servicio de IA" };
        } catch { /* ignore */ }
      }
    }
    try {
      const p = JSON.parse(out) as { ci: string; nombres: string; apellidos: string };
      return { ok: true, ci: (p.ci ?? "").replace(/\D/g, ""), nombres: p.nombres ?? "", apellidos: p.apellidos ?? "" };
    } catch {
      return { ok: false, error: "No se pudo interpretar el documento." };
    }
  });
