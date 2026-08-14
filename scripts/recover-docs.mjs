/* Recupera documentos corrompidos pela conversão UTF-16→UTF-8 do commit 93dc6b8.
   Estratégia: versão pré-recuperação (UTF-16 LE, limpa) + reaplica as edições
   semânticas do M8. Uso: node scripts/recover-docs.mjs [--write] */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DOCS = join(ROOT, 'documentos')
const write = process.argv.includes('--write')

function preContent(gitPath) {
  const out = execFileSync('git', ['show', '93dc6b8~1:' + gitPath], { maxBuffer: 50 * 1024 * 1024 })
  let text = out.toString('utf8').replace(/^\uFEFF/, '')
  text = text.replace(/\r\n/g, '\n')
  return text
}

function patch(text, [from, to]) {
  if (!text.includes(from)) {
    console.log(`  !! padrão não encontrado: ${from.slice(0, 60)}`)
    return text
  }
  return text.replaceAll(from, to)
}

// Os documentos agora vivem DENTRO de documentos/: referências entre si
// usam `./` (ajuste feito pelo próprio commit de movimentação — preservar).
function normalizePaths(text) {
  return text
    .replaceAll('documentos/SERVICE-PROMPT-INICIO.md', './SERVICE-PROMPT-INICIO.md')
    .replaceAll('documentos/DECISIONS.md', './DECISIONS.md')
    .replaceAll('documentos/AUDITORIA_2026-08-12.md', './AUDITORIA_2026-08-12.md')
}

const results = {}

// ---------------------------------------------------------------
// 1. ARCHITECTURE / ENVIRONMENT / AUDITORIA — só restaura (sem edições M8)
// ---------------------------------------------------------------
for (const [gitPath, target] of [
  ['ARCHITECTURE.md', join(DOCS, 'ARCHITECTURE.md')],
  ['ENVIRONMENT.md', join(DOCS, 'ENVIRONMENT.md')],
  ['documentos/AUDITORIA_2026-08-12.md', join(DOCS, 'AUDITORIA_2026-08-12.md')],
]) {
  let text = preContent(gitPath)
  results[target] = text
}

// ---------------------------------------------------------------
// 2. PRODUCT.md — restaura + edições M8
// ---------------------------------------------------------------
{
  let text = preContent('PRODUCT.md')
  text = patch(text, [
    '- Reviews apenas de clientes reais do booking concluído; proteção contra duplicadas/falsas/autoavaliação; profissional pode responder.',
    '- Reviews apenas de clientes reais do booking concluído; proteção contra duplicadas/falsas/autoavaliação; profissional pode responder. **Implementado (M8)** — 1 avaliação por booking (unique no banco), resposta única do profissional, imutável.',
  ])
  text = patch(text, [
    '- Disputas (open/under_review/resolved/rejected), com evidências e decisão administrativa.',
    '- Disputas (open/under_review/resolved/rejected), com evidências e decisão administrativa. **Implementado (M8)** — 1 por booking, mensagens + evidências (URL; R2 na M11), decisão só admin. Verificação de profissionais e badges com regra objetiva também implementados (M8).',
  ])
  text = patch(text, ['(ADR-001 a ADR-039', '(ADR-001 a ADR-040'])
  text = patch(text, ['**37 testes SQL aprovados no banco real**', '**73 testes SQL aprovados no banco real**'])
  text = patch(text, ['rls 15, ledger 11, chat 11 ', 'rls 15, ledger 11, chat 11, reviews/confiança/disputas 36 '])
  text = patch(text, ['com fundação M0–M7', 'com fundação M0–M8'])
  results[join(DOCS, 'PRODUCT.md')] = text
}

// ---------------------------------------------------------------
// 3. ROADMAP.md — restaura + seção M8 + deploy M0–M8
// ---------------------------------------------------------------
{
  let text = preContent('ROADMAP.md')
  text = patch(text, ['(site no ar com M0–M7)', '(site no ar com M0–M8)'])
  const start = text.indexOf('## M8 ')
  const end = text.indexOf('## M9 ')
  if (start < 0 || end < 0 || end <= start) {
    console.log('!! seção M8/M9 do ROADMAP não localizada')
  } else {
    const novaSecao = [
      '## M8 — Reviews + confiança + disputas',
      '',
      '- [x] Reviews só de booking concluído, só pelo cliente, 1 por booking (unique no banco) — spec §33',
      '- [x] Resposta do profissional à própria avaliação (1x, `review_responses`)',
      '- [x] Verificação: `verification_status` no banco + solicitação pelo profissional + mudança só por admin (guarda ativa agora; UI admin na M10) — spec §32',
      '- [x] Badges com regra objetiva (verificado / alta avaliação / top; `pro` aguarda M9) + selo inventado removido (ADR-004)',
      '- [x] Disputas: 1 por booking, estados open/under_review/resolved/rejected com guarda no banco, mensagens + evidências (URL — R2 na M11), decisão só admin — spec §34',
      '- [x] Notificações de review/dispute + lembrete de avaliação na conclusão (trigger, spec §53)',
      '- [x] UI: nota e badges reais no perfil público, lista de avaliações com resposta, avaliar na agenda, abrir disputa, página da disputa, verificação no perfil',
      '- [x] **Testes no banco real: 36/36** (total 73: RLS 15 + ledger 11 + chat 11 + reviews 36), sem regressão',
      '- [ ] Upload de evidências com R2 (M11) e decisões de disputa pela UI (M10)',
      '',
    ].join('\n')
    text = text.slice(0, start) + novaSecao + text.slice(end)
  }
  results[join(DOCS, 'ROADMAP.md')] = text
}

// ---------------------------------------------------------------
// 4. documentos/AGENTS.md — restaura (do AGENTS.md raiz pré) + edições M8
// ---------------------------------------------------------------
{
  let text = preContent('AGENTS.md')
  text = patch(text, [
    'node scripts/sql-tests.mjs supabase/tests/chat-tests.sql     # chat+notif (11 testes)',
    'node scripts/sql-tests.mjs supabase/tests/chat-tests.sql     # chat+notif (11 testes)\nnode scripts/sql-tests.mjs supabase/tests/reviews-tests.sql   # reviews+confiança+disputas (36 testes)',
  ])
  text = patch(text, [
    'Milestones concluídos e testados no banco real: **M0 a M7**',
    'Milestones concluídos e testados no banco real: **M0 a M8**',
  ])
  text = patch(text, [
    'pagamentos, ledger+cashback+comissão, chat+notificações).',
    'pagamentos, ledger+cashback+comissão, chat+notificações, reviews+confiança+\ndisputas).',
  ])
  text = patch(text, [
    'para o que falta (M8: reviews/confiança/disputas; M9: Premium/PRO/referral;',
    'para o que falta (M9: Premium/PRO/referral;',
  ])
  results[join(DOCS, 'AGENTS.md')] = text
}

// ---------------------------------------------------------------
// Verificação + escrita
// ---------------------------------------------------------------
let ok = true
for (const [target, text0] of Object.entries(results)) {
  const text = normalizePaths(text0)
  const fffd = (text.match(/\uFFFD/g) || []).length
  const ctrl = (text.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length
  const name = target.replace(ROOT, '')
  console.log(`${name}: FFFD=${fffd} ctrl=${ctrl} len=${text.length}`)
  if (fffd > 0 || ctrl > 0) ok = false
  if (write) {
    writeFileSync(target, text, 'utf8')
  }
}
if (!write) console.log('\n(pré-visualização — rode com --write para gravar)')
process.exit(ok ? 0 : 1)
