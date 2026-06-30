# Estúdio Gecê — Site

Site institucional/portfólio do Estúdio Gecê. HTML, CSS e JS puros — **sem build, sem dependências**. Roda direto no Cloudflare Pages e atualiza sozinho a cada `git push`.

```
estudio-gece-site/
├── index.html          # Página principal (portfólio)
├── 404.html            # Página de erro
├── admin/
│   └── index.html      # Área privada (futuro app)
├── assets/
│   ├── css/styles.css  # Todo o estilo (cores em variáveis no topo)
│   └── js/main.js      # Menu mobile + animações
├── _headers            # Cabeçalhos de segurança (Cloudflare)
├── robots.txt          # Bloqueia /admin dos buscadores
└── .gitignore
```

---

## 1. Subir para o GitHub

No terminal, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "Site inicial do Estúdio Gecê"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/estudio-gece-site.git
git push -u origin main
```

(Troque `SEU-USUARIO` pelo seu usuário do GitHub. Crie o repositório vazio antes, em github.com → New repository.)

---

## 2. Publicar no Cloudflare Pages

1. Painel da Cloudflare → **Workers & Pages** → **Create** → aba **Pages** → **Connect to Git**.
2. Autorize o GitHub e selecione o repositório `estudio-gece-site`.
3. Nas configurações de build, use **exatamente**:
   - **Framework preset:** `None`
   - **Build command:** *(deixe em branco)*
   - **Build output directory:** `/`
4. **Save and Deploy.**

Em ~1 minuto o site fica no ar em `https://estudio-gece-site.pages.dev`. Cada `git push` para a branch `main` republica automaticamente.

### Domínio próprio
Se você já tem um domínio na Cloudflare: dentro do projeto Pages → **Custom domains** → **Set up a custom domain** → digite seu domínio. A Cloudflare ajusta o DNS sozinha.

---

## 3. Proteger a área `/admin` (importante)

Antes de colocar qualquer dado no `/admin`, tranque o acesso com **Cloudflare Access** (gratuito no plano Zero Trust):

1. Painel Cloudflare → **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**.
2. Domínio da aplicação: seu site, caminho `/admin`.
3. Em **Policies**, crie uma regra **Allow** com *Include → Emails →* o seu e-mail.
4. Salve.

A partir daí, só você entra no `/admin` (login por e-mail). Sem isso, a página fica pública.

---

## 4. Editar o conteúdo

Tudo é texto — dá pra editar direto no GitHub (lápis ✏️) ou no seu editor.

- **Textos:** edite no `index.html` (procure os comentários `EDITAR:`).
- **Contatos:** seção `#contato` no `index.html` — troque e-mail, WhatsApp e Instagram.
- **Projetos:** cada card está marcado. Para usar foto, dentro de `.card__media` coloque
  `<img src="/assets/img/seu-projeto.jpg" alt="...">` e crie a pasta `assets/img/`.
- **Cores e fontes:** topo do `assets/css/styles.css`, bloco `:root` (variáveis).

---

## 5. Próximo passo — o app no `/admin`

A base já está pronta para virar aplicativo, tudo dentro da Cloudflare:

- **Pages Functions** → back-end (rotas tipo `/api/...`) no mesmo projeto, sem servidor separado.
- **D1** → banco de dados SQL para guardar clientes, propostas, projetos etc.
- **Access** → o login que protege o `/admin` (passo 3).

Quando você decidir o que o app vai fazer, monto essa camada. Não precisa trocar nada do que já está aqui.
