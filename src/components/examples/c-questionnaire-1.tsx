import { useId, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"

export type Question = {
  name: string
  title: string
  description: string
  choices: { value: string; label: string; hint: string }[]
}

const DEFAULT_QUESTIONS: Question[] = [
  {
    name: "niche",
    title: "Qual o segmento ou objetivo do site?",
    description: "Isso define o layout padrão, a paleta inicial e a arquitetura de informação.",
    choices: [
      {
        value: "saas",
        label: "Plataforma SaaS / Developer Tool",
        hint: "Dashboard escuro, métricas em tempo real, painel de logs e terminal",
      },
      {
        value: "fintech",
        label: "Fintech / Private Banking",
        hint: "Carteira digital, extrato com filtros, simulador de juros compostos e Pix",
      },
      {
        value: "ecommerce",
        label: "E-Commerce / Loja de Alta Performance",
        hint: "Catálogo em grade, carrinho dinâmico, cálculo de frete e checkout",
      },
      {
        value: "portfolio",
        label: "Editorial / Estúdio de Design",
        hint: "Tipografia refinada, galeria de projetos, artigos e modo escuro/claro",
      },
    ],
  },
  {
    name: "style",
    title: "Qual estilo visual e atmosfera você deseja?",
    description: "Cada estilo possui regras exclusivas de cores, contrastes e tipografia.",
    choices: [
      {
        value: "dark_obsidian",
        label: "Dark Obsidian & Esmeralda",
        hint: "Fundo #080A0F, cartões com bordas sutis e acentos vibrantes",
      },
      {
        value: "warm_editorial",
        label: "Warm Bone & Tipografia Serif",
        hint: "Fundo marfim/creme #FBFBFA, estilo Notion / Linear docs minimalista",
      },
      {
        value: "neon_volt",
        label: "Cyberpunk & Volt Neon",
        hint: "Fundo #0C0C0E com acentos verde-volt e tipografia mono",
      },
    ],
  },
  {
    name: "feature",
    title: "Qual o recurso interativo mais prioritário?",
    description: "O agente construirá este componente 100% dinâmico e funcional.",
    choices: [
      {
        value: "simulator",
        label: "Simulador / Calculadora Matemática",
        hint: "Cálculos em tempo real conforme você altera os sliders ou inputs",
      },
      {
        value: "live_feed",
        label: "Feed de Dados e Telemetria em Tempo Real",
        hint: "Logs ao vivo, filtros por severidade e busca instantânea",
      },
      {
        value: "forms",
        label: "Formulários e Modais de Cadastro com Validação",
        hint: "Inserção de novos registros diretamente no estado React",
      },
    ],
  },
]

export function Pattern({
  questions = DEFAULT_QUESTIONS,
  onFinish,
  initialAnswers,
}: {
  questions?: Question[]
  onFinish?: (answers: Record<string, string>, summaryText: string) => void
  initialAnswers?: Record<string, string>
}) {
  const titleId = useId()
  const [summary, setSummary] = useState<Record<string, string> | null>(initialAnswers || null)

  const items = questions.map((question) => ({
    choices: question.choices.map((choice) => ({ value: choice.value })),
    name: question.name,
    required: true,
  }))

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const answers: Record<string, string> = {}
    const summaryLines: string[] = []

    for (const question of questions) {
      const value = formData.get(question.name)
      const choiceObj = question.choices.find((c) => c.value === value)
      const label = choiceObj?.label ?? (value ? String(value) : "Não selecionado")
      answers[question.name] = label
      summaryLines.push(`${question.title}: ${label}`)
    }

    setSummary(answers)
    if (onFinish) {
      onFinish(answers, summaryLines.join(" | "))
    }
  }

  if (summary) {
    return (
      <Card className="mx-auto w-full max-w-lg border-emerald-500/30 bg-card/90 shadow-xl backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-emerald-400">Contexto Definido com Sucesso</CardTitle>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase text-emerald-400 border border-emerald-500/20">
              Pronto para Construir
            </span>
          </div>
          <CardDescription>
            O agente utilizará as preferências abaixo para guiar a criação do projeto:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3">
            {questions.map((question) => (
              <div key={question.name} className="grid min-w-0 gap-0.5 rounded-lg border border-border/40 bg-muted/20 p-2.5">
                <dt className="text-xs font-medium text-muted-foreground">
                  {question.title}
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {summary[question.name] || "Não respondido"}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Button size="sm" variant="outline" onClick={() => setSummary(null)}>
            Ajustar Respostas
          </Button>
          {onFinish && (
            <Button
              size="sm"
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              onClick={() => {
                const summaryLines = questions.map(q => `${q.title}: ${summary[q.name] || 'N/A'}`);
                onFinish(summary, summaryLines.join(" | "));
              }}
            >
              Confirmar e Iniciar Criação
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <Questionnaire
      className="mx-auto w-full max-w-lg"
      defaultItem={questions[0]?.name || "niche"}
      items={items}
      shortcuts="letters"
      onSubmit={handleSubmit}
    >
      <Card className="border-border/80 bg-card/95 shadow-2xl backdrop-blur-md">
        {questions.map((question) => (
          <QuestionnaireItem
            key={question.name}
            aria-labelledby={`${titleId}-${question.name}`}
            name={question.name}
            required
          >
            <CardHeader>
              <QuestionnaireTitle
                id={`${titleId}-${question.name}`}
                render={<CardTitle />}
              >
                {question.title}
              </QuestionnaireTitle>
              <QuestionnaireDescription render={<CardDescription />}>
                {question.description}
              </QuestionnaireDescription>
              <CardAction>
                <QuestionnaireProgress />
              </CardAction>
            </CardHeader>
            <CardContent>
              <QuestionnaireChoices>
                {question.choices.map((choice) => (
                  <QuestionnaireChoice key={choice.value} value={choice.value}>
                    <span className="font-medium text-foreground">{choice.label}</span>
                    <QuestionnaireChoiceDescription>
                      {choice.hint}
                    </QuestionnaireChoiceDescription>
                  </QuestionnaireChoice>
                ))}
              </QuestionnaireChoices>
              <QuestionnaireError />
            </CardContent>
          </QuestionnaireItem>
        ))}

        <CardFooter>
          <QuestionnaireActions className="w-full">
            <QuestionnairePrevious>Anterior</QuestionnairePrevious>
            <QuestionnaireNext>Próximo</QuestionnaireNext>
            <QuestionnaireSubmit>Enviar Contexto ao Agente</QuestionnaireSubmit>
          </QuestionnaireActions>
        </CardFooter>
      </Card>
    </Questionnaire>
  )
}
