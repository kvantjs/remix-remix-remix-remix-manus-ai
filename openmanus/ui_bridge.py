#!/usr/bin/env python3
"""JSONL bridge between the existing Kvant UI and the OpenManus runtime."""
import asyncio, json, os, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# OpenManus reads TOML at import time. These environment overrides keep secrets out
# of the repository and let the existing deployment choose its provider/model.
if not os.getenv("OPENMANUS_API_KEY"):
    os.environ["OPENMANUS_API_KEY"] = os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY", "")
if not os.getenv("OPENMANUS_BASE_URL"):
    os.environ["OPENMANUS_BASE_URL"] = os.getenv("OPENAI_API_BASE") or "https://generativelanguage.googleapis.com/v1beta/openai/"
os.environ.setdefault("OPENMANUS_MODEL", "gemini-2.5-flash")
os.environ.setdefault("OPENMANUS_WORKSPACE_ROOT", str(Path.cwd()))

from app.agent.manus import Manus
from app.schema import Message
from app.config import PROJECT_ROOT


def emit(event, **data):
    sys.stdout.write(json.dumps({"event": event, **data}, ensure_ascii=False, default=str) + "\n")
    sys.stdout.flush()

class UiManus(Manus):
    async def execute_tool(self, command):
        name = command.function.name if command and command.function else "unknown"
        try:
            args = json.loads(command.function.arguments or "{}")
        except Exception:
            args = {}
        emit("tool_start", toolName=name, arguments=args, reason=f"OpenManus executando {name}")
        started = time.time()
        try:
            result = await super().execute_tool(command)
            emit("tool_finish", toolCall={
                "id": getattr(command, "id", f"openmanus_{int(time.time()*1000)}"),
                "toolName": name,
                "arguments": args,
                "result": str(result),
                "status": "success" if not str(result).startswith("Error") else "error",
                "timestamp": time.strftime("%H:%M:%S"),
                "server": "OpenManus",
                "screenData": {"actionDescription": f"OpenManus concluiu {name}", "durationMs": int((time.time()-started)*1000)},
            })
            return result
        except Exception as exc:
            emit("tool_finish", toolCall={
                "id": getattr(command, "id", f"openmanus_{int(time.time()*1000)}"),
                "toolName": name, "arguments": args, "result": str(exc), "status": "error",
                "timestamp": time.strftime("%H:%M:%S"), "server": "OpenManus",
                "screenData": {"actionDescription": f"Falha em {name}"},
            })
            raise

async def main(payload):
    message = str(payload.get("message", "")).strip()
    if not message:
        raise ValueError("message é obrigatório")
    emit("status", text="OpenManus inicializando o agente Manus...")
    emit("computer_ready", text="Runtime OpenManus pronto; ciclo ReAct habilitado.")
    agent = await UiManus.create()
    try:
        # Keep the UI history in the same memory model used by OpenManus.
        for item in payload.get("history", [])[-20:]:
            role = item.get("role")
            content = item.get("content")
            if role in {"user", "assistant"} and content:
                agent.update_memory(role, str(content)[:6000])
        emit("status", text="OpenManus analisando a solicitação e escolhendo ferramentas...")
        await agent.run(message)
        final = ""
        for msg in reversed(agent.memory.messages):
            if getattr(msg, "role", None) == "assistant" and getattr(msg, "content", None):
                final = msg.content
                break
        if not final:
            last_tool = next((m for m in reversed(agent.memory.messages) if getattr(m, "role", None) == "tool" and getattr(m, "content", None)), None)
            final = (f"O OpenManus concluiu o ciclo ReAct. Última evidência: {last_tool.content}" if last_tool else "O runtime OpenManus concluiu o ciclo de execução sem uma mensagem final textual. Consulte os rastros de ferramentas para ver as evidências.")
        emit("complete", explanation=final, thought="Execução concluída pelo agente Manus do OpenManus.", files=[], sources=[], toolCalls=[], status="completed", provider="OpenManus")
    finally:
        await agent.cleanup()

if __name__ == "__main__":
    raw = sys.stdin.read()
    try:
        asyncio.run(main(json.loads(raw)))
    except Exception as exc:
        emit("error", message=str(exc), provider="OpenManus")
        sys.exit(1)
