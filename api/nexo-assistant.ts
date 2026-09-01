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
  if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
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

  const instructions = `Você é o NEXO, um assistente acadêmico executivo para universitários.\n\nSua função é ajudar o estudante a decidir o próximo passo, reduzir sobrecarga e transformar confusão em ação concreta. Você não é o professor da disciplina. Seja acolhedor, direto e prático. Nunca humilhe o estudante por atraso ou erro. Não invente informações sobre conteúdos que não foram fornecidos. Quando faltar conteúdo específico, peça o trecho, tema ou dúvida necessária.\n\nRegras de resposta:\n- Responda em português do Brasil.\n- Seja conciso: normalmente 3 a 6 parágrafos curtos ou uma pequena lista.\n- Comece pela ação mais útil agora.\n- Se o estudante estiver atrasado, priorize recuperação sustentável em vez de mandar fazer tudo de uma vez.\n- Para explicar, ensine passo a passo e confirme o conceito essencial.\n- Para resumo, destaque apenas o que precisa ser retido.\n- Para flashcards, entregue cartões em formato Pergunta → Resposta.\n- Para mapa mental, use uma hierarquia textual simples.\n- Para dúvidas, identifique primeiro onde está o bloqueio.\n- Não dê respostas acadêmicas inventadas ou cite fontes inexistentes.`;

  const input = `AÇÃO SOLICITADA: ${body.action ?? "conversa"}\nPRIORIDADE ATUAL: ${context.priority ?? "não definida"}\nMOTIVO DA PRIORIDADE: ${context.priorityReason ?? "não informado"}\nMINUTOS PENDENTES HOJE: ${context.pendingMinutes ?? 0}\nCARGA ACADÊMICA ATUAL:\n${workloadText || "- Não informada"}\n\nMENSAGEM DO ESTUDANTE:\n${message}`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        instructions,
        input,
        max_output_tokens: 500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("NEXO OpenAI error", response.status, data?.error?.code ?? "unknown");
      return res.status(502).json({ error: "Não consegui falar com a IA agora. Tente novamente em alguns segundos." });
    }

    const output = getOutputText(data);
    if (!output) {
      return res.status(502).json({ error: "A IA não retornou uma resposta válida." });
    }

    return res.status(200).json({ answer: output });
  } catch (error) {
    console.error("NEXO assistant error", error instanceof Error ? error.message : "unknown");
    return res.status(500).json({ error: "O assistente encontrou um problema temporário. Tente novamente." });
  }
}
