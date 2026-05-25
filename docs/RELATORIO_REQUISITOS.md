# Relatório de Validação de Requisitos — iClass

Data: 2026-05-25
Fonte: `docs/Trabalho de Engenharia de Software.pdf`
Escopo: validação do estado atual do código (`api/`, `web/`, `docker-compose.yml`) frente aos requisitos funcionais (RF) e não funcionais (RNF).

Legenda: **OK** atendido · **PARCIAL** parcial · **FALHA** não atendido · **N/A** fora do MVP

---

## 1. Requisitos Funcionais

### RF 1 — Segurança

| ID | Requisito | Status | Evidência / Observação |
|----|-----------|--------|------------------------|
| RF 1.1 | Acesso só a usuários cadastrados | **OK** | `auth.py:19` login valida `email`+senha; rotas usam `get_current_user` (`core/deps.py`) |
| RF 1.2 | Login retorna credenciais do usuário | **OK** | `auth.py:29` emite JWT com `sub`+`role`; `usuarios.py:14` `/me` |
| RF 1.3 | Primeiro acesso obriga troca de senha | **OK** | flag `primeiro_acesso` (`models.py:36`), endpoint `trocar-senha-primeiro-acesso` (`auth.py:89`); commit `e479ef3` |
| RF 1.4 | Código de troca enviado por e-mail | **PARCIAL** | Código gerado e persistido (`auth.py:46`), mas envio SMTP **não implementado** — TODO em `auth.py:53`; retornado em `codigo_debug` |
| RF 1.5 | Código validado e com expiração | **OK** | `auth.py:71-75`; expira em 15 min (`EXPIRACAO_CODIGO_MINUTOS=15`) |

### RF 2 — Usuários

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF 2.1 | Criação de usuários | **OK** | `usuarios.py:25` `POST /usuarios` |
| RF 2.2 | 3 categorias: aluno/professor/admin | **OK** | `TipoUsuario` enum (`models.py:9`) |
| RF 2.3 | (texto incompleto no PDF) | **N/A** | Sem critério verificável |
| RF 2.4 | Apenas admin cadastra usuários/turmas | **OK** | `require_role(admin)` em `usuarios.py:26` e `turmas.py` |
| RF 2.5 | Professor cadastra tarefas para turmas e alunos | **OK** | `tarefas.py:24` exige `professor` ou `admin` |

### RF 3 — Turmas

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF 3.1 | Cadastro de turmas | **OK** | `routers/turmas.py` |
| RF 3.2 | Nome, código, professor, lista alunos | **OK** | `Turma` (`models.py:52`) + `TurmaAluno` (`models.py:62`) |
| RF 3.3 | Apenas admin/professor cadastra/remove | **OK** | `require_role` no router de turmas |
| RF 3.4 | Professor em 1+ turmas | **OK** | FK `professor_id`; sem restrição de unicidade |
| RF 3.5 | Aluno em 1+ turmas | **OK** | tabela N:N `TurmaAluno` |
| RF 3.6 | Adicionar/remover alunos da turma | **OK** | endpoints em `turmas.py` |

### RF 4 — Tarefas

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF 4.1 | Professor cria tarefas p/ turmas e alunos | **OK** | `tarefas.py:24` (turma) + `tarefas.py:127` (aluno individual) |
| RF 4.2 | Tarefa com prazo limite | **OK** | campos `data_limite`, `prazo_fixo` (`models.py:78-79`) |
| RF 4.3 | Pesos Fibonacci | **OK** | `FIBONACCI` + `indice_fibonacci` (`models.py:6,77`); `peso_fibonacci` property |
| RF 4.4 | Upload PDF/imagem (prof e aluno) | **OK** | `arquivos.py:47,70` whitelist `application/pdf` + `image/*` |
| RF 4.5 | Limite 5 MB | **OK** | `MAX_SIZE_BYTES = 5*1024*1024` (`arquivos.py:18`), HTTP 413 |

### Relatórios (mencionado no PDF, sem RFs numerados)

| Item | Status | Observação |
|------|--------|------------|
| Relatório gráfico de desempenho do aluno | **FALHA** | Sem rota dedicada (`/relatorios`) nem componente de gráfico (sem `recharts`/`chart.js` em `web/package.json`). `avaliacoes.py` expõe lista bruta — frontend `Avaliacoes.jsx` é tabela |
| Painel responsável (extra ao PDF) | **OK** | `LinkResponsavel` + `responsaveis.py` + `PainelResponsavel.jsx` (commits 255c266, bc5e7f7) |

---

## 2. Requisitos Não Funcionais

| ID | Requisito | Status | Observação |
|----|-----------|--------|------------|
| RNF1 | Relatório gráfico em ≤ 5s | **FALHA** | Relatório gráfico ainda não existe — não verificável |
| RNF2 | Upload ≤ 10s p/ 5MB | **PARCIAL** | Upload síncrono em disco local (`/app/uploads`) — viável, sem teste de carga |
| RNF3 | Múltiplos alunos enviando simultaneamente | **PARCIAL** | Stack async (FastAPI+asyncpg) suporta; sem benchmark formal |
| RNF4 | Código por e-mail expira em 15 min | **OK** | `EXPIRACAO_CODIGO_MINUTOS=15` (`auth.py:16`) |
| RNF5 | Senhas criptografadas no BD | **OK** | bcrypt via passlib (`core/security.py:6`) |
| RNF6 | Sessão expira após 30 min de inatividade | **FALHA** | JWT fixo em **60 min** (`config.py:7`); sem renovação por atividade. Deve ser 30 min |
| RNF7 | UI responsiva (mobile/desktop) | **OK** | Tailwind com classes `sm:/md:/lg:` em páginas (`web/src/pages/`) |
| RNF8a | Cadastro de tarefa em ≤ 3 cliques | **OK** | Login → Turmas → "Nova Tarefa" (`NovaTarefa.jsx`); rota direta `/tarefas/nova` |
| RNF8b | Uptime 99% (duplicado como RNF8 no PDF) | **N/A** | Depende de hospedagem; sem SLA configurado |
| RNF9 | Backups diários automáticos | **FALHA** | `docker-compose.yml` sem job de backup do volume `pg_data` |

---

## 3. Diagrama ER vs. Modelo

`models.py` reproduz fielmente o ERD do PDF: `Usuario`, `CodigoRecuperacao`, `Turma`, `TurmaAluno`, `Tarefa`, `TarefaAluno`, `Resolucao`, `Arquivo`, `Avaliacao`. **OK**
Acrescido (não no ERD original): `LinkResponsavel` (feature painel responsável).

---

## 4. Tecnologias declaradas (seção 8 do PDF)

| Item | Declarado | Implementado |
|------|-----------|--------------|
| 8.1 REST | sim | **OK** FastAPI |
| 8.2 JavaScript | sim | **OK** React + Vite (`web/`) — **divergência**: PDF previa TUI/JS, CLAUDE.md ainda menciona TUI Rust; a entrega é SPA web |
| 8.3 PostgreSQL | sim | **OK** `postgres:16-alpine` (`docker-compose.yml`) |
| 8.4 TUI | sim | **FALHA** Substituído por SPA web. Diretório `tui/` não existe; apenas `web/` |
| 8.5 E-mail recuperação | sim | **PARCIAL** código gerado, **envio não implementado** |
| 8.6 Padrões de software | sim | **OK** Camadas routers/schemas/models; deps injection FastAPI |

---

## 5. Resumo

- **RF cobertos:** 17/18 verificáveis. Pendência: relatório gráfico e envio real de e-mail.
- **RNF cobertos:** 5/9. Pendências relevantes: sessão 30min (atualmente 60), backups diários, relatório gráfico (impacta RNF1).
- **Mudança de escopo:** TUI Rust → SPA React (não refletido no PDF). Atualizar PDF ou CLAUDE.md.

## 6. Pendências Recomendadas

1. Implementar envio real de e-mail (SMTP) em `auth.py:solicitar_recuperacao` — RF 1.4.
2. Reduzir `access_token_expire_minutes` para 30 e implementar refresh por atividade — RNF6.
3. Criar endpoint de relatório agregado (média nota/participação por aluno/turma) e tela com gráfico (`recharts`) — Relatórios + RNF1.
4. Configurar backup diário do volume `pg_data` (cron + `pg_dump`) — RNF9.
5. Atualizar PDF/CLAUDE.md para refletir frontend Web (React) em vez de TUI Rust.
