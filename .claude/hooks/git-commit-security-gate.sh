#!/usr/bin/env bash
# Gate de segurança pré-commit — Claude Code PreToolUse hook (matcher: Bash).
# Só age quando o comando é um `git commit`. Faz duas coisas:
#   1) BLOQUEIA (exit 2) se o diff staged contém um segredo de alta confiança.
#   2) Se limpo, injeta um lembrete para rodar a auditoria de segurança completa
#      (checklist auditoria/skills/pr-security-audit — política §11 do workspace).
# Não substitui a auditoria de raciocínio; é a rede determinística contra vazamento.

input="$(cat)"

# Extrai o comando do JSON do hook (jq preferido, python3 de fallback).
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || true)"
if [ -z "$cmd" ]; then
  cmd="$(printf '%s' "$input" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null || true)"
fi

# Age apenas em git commit (inclui compostos: "git add ... ; git commit ...").
printf '%s' "$cmd" | grep -qE '(^|[;&|[:space:]])git[[:space:]]+commit([[:space:]]|$)' || exit 0

diff="$(git diff --cached 2>/dev/null || true)"
files="$(git diff --cached --name-only 2>/dev/null || true)"

problems=""
add() { problems="${problems}  - ${1}
"; }

# 1) Arquivo .env real staged (permite .env.example).
env_hit="$(printf '%s\n' "$files" | grep -E '(^|/)\.env($|\.[^/]*)$' | grep -vE '\.env\.example$' || true)"
[ -n "$env_hit" ] && add "arquivo .env versionado: $(printf '%s' "$env_hit" | tr '\n' ' ')"

# 2) Bloco de chave privada.
printf '%s' "$diff" | grep -qE -- '-----BEGIN [A-Z ]*PRIVATE KEY-----' && add "bloco de chave privada"

# 3) AWS Access Key ID.
printf '%s' "$diff" | grep -qE '\bAKIA[0-9A-Z]{16}\b' && add "AWS Access Key ID (AKIA...)"

# 4) service_role do Supabase com valor.
printf '%s' "$diff" | grep -qiE 'service_role[a-z_]*["'\'' ]*[:=]["'\'' ]*[A-Za-z0-9._-]{20,}' && add "chave service_role com valor"

if [ -n "$problems" ]; then
  {
    echo "🔴 GATE DE SEGURANÇA — commit BLOQUEADO (possível segredo no diff staged):"
    printf '%s' "$problems"
    echo "Mova o segredo para variável de ambiente (.env NÃO versionado) e refaça o commit."
  } >&2
  exit 2
fi

# Diff limpo → injeta lembrete de auditoria no contexto do modelo.
printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"Gate de seguranca: nenhum segredo obvio no diff staged. Antes de finalizar este commit, rode a auditoria de seguranca do projeto sobre o diff — checklist auditoria/skills/pr-security-audit/SKILL.md (secao produto-web). Politica §11 do CLAUDE.md do workspace."}}'
exit 0
