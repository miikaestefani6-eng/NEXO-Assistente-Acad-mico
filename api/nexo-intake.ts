type IntakeBody = {
  text?: string;
  journeyType?: string;
  file?: { name: string; mimeType: string; data: string } | null;
};

function outputText(data: any) {
  return (data?.candidates ?? []).flatMap((c: any) => c?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("\n").trim();
}

function extractJson(text: string) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("JSON ausente");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "A IA do NEXO ainda não está configurada." });

  const body = (req.body ?? {}) as IntakeBody;
  if (!body.text?.trim() && !body.file) return res.status(400).json({ error: "Conte ao NEXO sobre seus estudos ou envie um documento." });
  if (body.file && body.file.data.length > 12_000_000) return res.status(413).json({ error: "Este arquivo é grande demais para esta etapa. Envie um PDF menor." });

  const instruction = `Você estrutura informações de estudo para o NEXO. Analise somente fatos presentes na mensagem e no documento. Não invente disciplinas, datas, provas ou quantidades. Retorne APENAS JSON válido no formato:
{"summary":"resumo curto do que entendeu","subjects":[{"name":"nome","lessons":0,"exercises":0,"assignments":0,"examDate":"","classDays":[]}],"events":[{"title":"","date":"YYYY-MM-DD","time":"","kind":"Aula ao vivo|Prova|Entrega|Outro","subject":""}],"targetDate":"","missing":["informação importante que falta"],"confidence":"alta|media|baixa"}
Use 0 ou string vazia quando o dado não existir. classDays deve conter nomes dos dias em português. Datas só devem ser preenchidas quando puderem ser determinadas com segurança.`;

  const parts: any[] = [{ text: `Tipo de jornada: ${body.journeyType ?? "não informado"}\nMensagem do estudante: ${body.text?.trim() || "nenhuma"}` }];
  if (body.file) parts.push({ inline_data: { mime_type: body.file.mimeType, data: body.file.data } });

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ system_instruction: { parts: [{ text: instruction }] }, contents: [{ role: "user", parts }], generation_config: { max_output_tokens: 1600, response_mime_type: "application/json" } }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message || "Não consegui interpretar esse material agora." });
    const text = outputText(data);
    const parsed = extractJson(text);
    return res.status(200).json({ intake: parsed });
  } catch (error) {
    console.error("NEXO intake error", error);
    return res.status(500).json({ error: "Não consegui organizar essas informações agora. Tente novamente." });
  }
}
