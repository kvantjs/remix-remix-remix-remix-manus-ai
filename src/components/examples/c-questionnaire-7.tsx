import * as React from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const USAGE = [
  { value: "personal", label: "Pessoal / Individual", hint: "Uso individual para projetos pessoais" },
  { value: "team", label: "Equipe / Shared Workspace", hint: "Uso colaborativo entre membros do time" },
]

const OWNERS = [
  {
    value: "alice",
    name: "Alice Silva",
    initials: "AS",
    photo: "https://picsum.photos/seed/alice/100/100",
    role: "Tech Lead",
  },
  {
    value: "bob",
    name: "Bob Santos",
    initials: "BS",
    photo: "https://picsum.photos/seed/bob/100/100",
    role: "Product Designer",
  },
]

const TAIL = [
  {
    name: "first",
    title: "Qual o repositório ou branch inicial?",
    description: "Escolha a ramificação padrão para o ambiente de controle.",
    choices: [
      { value: "main", label: "main / principal" },
      { value: "dev", label: "dev / desenvolvimento" },
    ],
  },
  {
    name: "start",
    title: "Qual o gatilho de início do agente?",
    description: "Escolha como o agente deve começar a interagir.",
    choices: [
      { value: "manual", label: "Manual (Aguardar instrução)" },
      { value: "auto", label: "Automático (Análise inicial imediata)" },
    ],
  },
]

export function Pattern({
  onFinish,
}: {
  onFinish?: (answers: Record<string, string>, summaryText: string) => void
}) {
  const titleId = useId()
  const [usage, setUsage] = useState("")
  const [summary, setSummary] = useState<any>(null)

  const needsOwner = usage === "team"

  const items = [
    { name: "usage", required: true },
    { name: "owner", required: needsOwner },
    ...TAIL.map((q) => ({ name: q.name, required: true })),
  ]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const answers: Record<string, string> = {}
    const summaryLines: string[] = []

    const uVal = String(formData.get("usage") || "")
    answers["usage"] = uVal === "team" ? "Equipe / Shared" : "Pessoal / Individual"
    summaryLines.push(`Uso: ${answers["usage"]}`)

    if (uVal === "team") {
      const oVal = String(formData.get("owner") || "")
      const matched = OWNERS.find((p) => p.value === oVal)
      answers["owner"] = matched?.name || oVal || "Alice Silva"
      summaryLines.push(`Dono: ${answers["owner"]}`)
    }

    for (const question of TAIL) {
      const val = String(formData.get(question.name) || "")
      const choice = question.choices.find((c) => c.value === val)
      answers[question.name] = choice?.label || val
      summaryLines.push(`${question.title.replace('?', '')}: ${answers[question.name]}`)
    }

    const summaryText = summaryLines.join(" | ")
    setSummary({ usage: answers["usage"], owner: answers["owner"] || null, first: answers["first"], start: answers["start"] })
    if (onFinish) {
      onFinish(answers, summaryText)
    }
  }

  if (summary) {
    return (
      <Card className="mx-auto w-full max-w-md border-emerald-500/30 bg-card/90 shadow-xl backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-emerald-400">Contexto Configurado</CardTitle>
          <CardDescription>
            Configurações importadas com sucesso para o workspace de equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3">
            <div className="grid min-w-0 gap-0.5">
              <dt className="text-muted-foreground text-sm">Used for</dt>
              <dd className="text-sm font-medium">{summary.usage}</dd>
            </div>
            <div className="grid min-w-0 gap-0.5">
              <dt className="text-muted-foreground text-sm">Owner</dt>
              <dd className={cn("text-sm font-medium", summary.owner === null && "text-muted-foreground")}>
                {summary.owner ?? "Not applicable"}
              </dd>
            </div>
            <div className="grid min-w-0 gap-0.5">
              <dt className="text-muted-foreground text-sm">Importing</dt>
              <dd className="text-sm font-medium">{summary.first}</dd>
            </div>
            <div className="grid min-w-0 gap-0.5">
              <dt className="text-muted-foreground text-sm">Starting</dt>
              <dd className="text-sm font-medium">{summary.start}</dd>
            </div>
          </dl>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="outline" onClick={() => setSummary(null)}>
            Ajustar
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Questionnaire
      className="mx-auto w-full max-w-md"
      items={items}
      onReset={() => setUsage("")}
      onSubmit={handleSubmit}
    >
      <Card>
        <QuestionnaireItem aria-labelledby={`${titleId}-usage`} name="usage" required>
          <CardHeader>
            <QuestionnaireTitle id={`${titleId}-usage`} render={<CardTitle />}>
              Como seu time usará o workspace?
            </QuestionnaireTitle>
            <QuestionnaireDescription render={<CardDescription />}>
              Workspaces de equipe adicionam perguntas sobre quem gerencia o billing.
            </QuestionnaireDescription>
            <CardAction>
              <QuestionnaireProgress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <QuestionnaireChoices>
              {USAGE.map((option) => (
                <QuestionnaireChoice
                  key={option.value}
                  checked={usage === option.value}
                  value={option.value}
                  onChange={() => setUsage(option.value)}
                >
                  {option.label}
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            <QuestionnaireError />
          </CardContent>
        </QuestionnaireItem>

        <QuestionnaireItem
          aria-labelledby={`${titleId}-owner`}
          disabled={!needsOwner}
          name="owner"
          required
        >
          <CardHeader>
            <QuestionnaireTitle id={`${titleId}-owner`} render={<CardTitle />}>
              Quem é o dono do workspace?
            </QuestionnaireTitle>
            <QuestionnaireDescription render={<CardDescription />}>
              O dono gerencia os convites de membros do projeto.
            </QuestionnaireDescription>
            <CardAction>
              <QuestionnaireProgress />
            </CardAction>
          </CardHeader>
          <CardContent>
            <QuestionnaireChoices>
              {OWNERS.map((person) => (
                <QuestionnaireChoice key={person.value} value={person.value}>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar size="sm">
                      <AvatarImage src={person.photo} alt="" />
                      <AvatarFallback>{person.initials}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{person.name}</span>
                  </span>
                  <QuestionnaireChoiceDescription>
                    {person.role}
                  </QuestionnaireChoiceDescription>
                </QuestionnaireChoice>
              ))}
            </QuestionnaireChoices>
            <QuestionnaireError />
          </CardContent>
        </QuestionnaireItem>

        {TAIL.map((question) => (
          <QuestionnaireItem key={question.name} aria-labelledby={`${titleId}-${question.name}`} name={question.name} required>
            <CardHeader>
              <QuestionnaireTitle id={`${titleId}-${question.name}`} render={<CardTitle />}>
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
                    {choice.label}
                  </QuestionnaireChoice>
                ))}
              </QuestionnaireChoices>
              <QuestionnaireError />
            </CardContent>
          </QuestionnaireItem>
        ))}

        <CardFooter>
          <QuestionnaireActions className="w-full">
            <QuestionnairePrevious />
            <QuestionnaireNext>Avançar</QuestionnaireNext>
            <QuestionnaireSubmit>Confirmar Contexto</QuestionnaireSubmit>
          </QuestionnaireActions>
        </CardFooter>
      </Card>
    </Questionnaire>
  )
}
