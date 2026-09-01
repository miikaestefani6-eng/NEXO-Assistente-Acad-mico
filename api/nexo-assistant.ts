type AssistantBody = {
  message?: string;
  action?: string | null;
  context?: {
    priority?: string | null;
    priorityReason?: string | null;
    pendingMinutes?: number;
    workload?: Array<{
      discipline: string;
      pendingLessons: number;
      pendingExercises: number;
      pendingAssignments: number;
      daysUntilExam: number;
    }>;
  };
};

function getOutputText(data: any): string {
  const candidates = data?.candidates ?? [];
  const parts: string[] = [];
  for (const candidate of candidates) {
    for (const part of candidate?.content?.parts ?? []) {
      if (typeof part?.text === "string") parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  apiKey: string,
  model: string,
  systemInstruction: string,
  prompt: string,
  retries: number,
  delays: number[],
) {
  let lastFailure: { status: number; code: string; message: string } | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generation_config: {
            max_output_tokens: 500,
          },
        }),
      },
    );

    const data = await response.json();
    if (response.ok) {
      return { data, failure: null };
    }

    const code = typeof data?.error?.status === "string" ? data.error.status : "unknown";
    const providerMessage = typeof data?.error?.message === "string" ? data.error.message : "";
    lastFailure = { status: response.status, code, message: providerMessage };

    const retryable = response.status === 503 || response.status === 429 || response.status === 500;
    if (!retryable || attempt >= retries) break;

    const delay = delays[Math.min(attempt, delays.length - 1)] ?? 5000;
    console.warn(`NEXO Gemini ${model} indisponível (${response.status}/${code}). Tentando novamente em ${delay}ms.`);
    await sleep(delay);
  }

  return { data: null, failure: lastFailure };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "A IA do NEXO ainda não está configurada no servidor." });
  }

  const body = (req.body ?? {}) as AssistantBody;
  const message = body.message?.trim();
  if (!message) {
    return res.status(400).json({ error: "Digite o que você precisa destravar." });
  }

  const context = body.context ?? {};
  const workloadText = (context.workload ?? [])
    .map((item) =>
      `- ${item.discipline}: ${item.pendingLessons} aulas, ${item.pendingExercises} exercícios, ${item.pendingAssignments} trabalhos pendentes; prova em ${item.daysUntilExam} dias.`
    )
    .join("\n");

  const systemInstruction = `Você é o NEXO, um assistente acadêmico executivo para universitários.

Sua função é ajudar o estudante a decidir o próximo passo, reduzir sobrecarga e transformar confusão em ação concreta. Você não é o professor da disciplina. Seja acolhedor, direto e prático. Nunca humilhe o estudante por atraso ou erro. Não invente informações sobre conteúdos que não foram fornecidos. Quando faltar conteúdo específico, peça o trecho, tema ou dúvida necessária.

Regras de resposta:
- Responda em português do Brasil.
- Seja conciso: normalmente 3 a 6 parágrafos curtos ou uma pequena lista.
- Comece pela ação mais útil agora.
- Se o estudante estiver atrasado, priorize recuperação sustentável em vez de mandar fazer tudo de uma vez.
- Para explicar, ensine passo a passo e confirme o conceito essencial.
- Para resumo, destaque apenas o que precisa ser retido.
- Para flashcards, entregue cartões em formato Pergunta → Resposta.
- Para mapa mental, use uma hierarquia textual simples.
- Para dúvidas, identifique primeiro onde está o bloqueio.
- Não dê respostas acadêmicas inventadas ou cite fontes inexistentes.`;

  const prompt = `AÇÃO SOLICITADA: ${body.action ?? "conversa"}
PRIORIDADE ATUAL: ${context.priority ?? "não definida"}
MOTIVO DA PRIORIDADE: ${context.priorityReason ?? "não informado"}
MINUTOS PENDENTES HOJE: ${context.pendingMinutes ?? 0}
CARGA ACADÊMICA ATUAL:
${workloadText || "- Não informada"}

MENSAGEM DO ESTUDANTE:
${message}`;

  try {
    // Primeira linha: tenta o modelo principal algumas vezes com backoff exponencial.
    const primary = await callGemini(
      apiKey,
      "gemini-3.7-flash",
      systemInstruction,
      prompt,
      3,
      [2000, 5000, 10000],
    );

    let result = primary;

    // Se o modelo principal estiver congestionado, troca automaticamente para um modelo Flash-Lite.
    if (primary.failure?.status === 503) {
      console.warn("NEXO Gemini: ativando fallback para gemini-3.5-flash-lite.");
      result = await callGemini(
        apiKey,
        "gemini-3.5-flash-lite",
        systemInstruction,
        prompt,
        2,
        [3000, 8000],
      );
    }

    if (result.failure) {
      console.error(
        "NEXO Gemini error",
        result.failure.status,
        result.failure.code,
        result.failure.message,
      );
      return res.status(502).json({
        error: `O Gemini recusou a solicitação (${result.failure.status}/${result.failure.code}).${result.failure.message ? ` ${result.failure.message}` : ""}`,
        providerStatus: result.failure.status,
        providerCode: result.failure.code,
      });
    }

    const output = getOutputText(result.data);
    if (!output) {
      return res.status(502).json({ error: "O Gemini não retornou uma resposta válida." });
    }

    return res.status(200).json({ answer: output });
  } catch (error) {
    console.error("NEXO assistant error", error instanceof Error ? error.message : "unknown");
    return res.status(500).json({ error: "O assistente encontrou um problema temporário. Tente novamente." });
  }
}
