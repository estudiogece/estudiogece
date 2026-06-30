# Estúdio Gecê — Site

Site institucional/portfólio com a identidade real do Estúdio Gecê (bordô + branco, **DM Sans**, logo e grafismo "g"). HTML, CSS e JS puros — sem build. Roda no Cloudflare e atualiza a cada `git push`.

```
site/
├── index.html              # Home: hero, Quem somos, Projetos, Processo, Contato
├── orcamento/index.html    # Formulário de briefing -> abre no WhatsApp preenchido
├── admin/index.html        # Área privada (futuro app)
├── 404.html
├── assets/
│   ├── css/styles.css       # Estilo (cores/fontes no bloco :root)
│   ├── js/main.js
│   └── img/  (logo, grafismo, foto)
├── _headers · robots.txt · .gitignore
```

## Já configurado
- **Contatos:** gcamara@estudiogece.com.br · WhatsApp +55 (79) 99102-1377 · @estudio.gece
- **Formulário /orcamento:** compila as respostas e abre uma mensagem pronta no seu WhatsApp.

## Falta preencher (marcado com `EDITAR:` no index.html)
- **Projetos:** títulos, descrições e fotos dos 6 cards. Para usar foto, dentro de
  `<div class="card__media">` coloque `<img src="/assets/img/projeto1.jpg" alt="...">`.

## Cores e fontes
Topo do `assets/css/styles.css` (`:root`): `--bordo: #561624`; fonte DM Sans.

## Publicar atualizações
Site já conectado na Cloudflare. Substitua o conteúdo do repositório por estes arquivos
e dê `git push` (ou use o Claude Code para commitar/enviar). Republica em ~1 min.

## Próximo passo — back-end
O formulário hoje usa WhatsApp (sem servidor). Quando quiser, dá pra evoluir para um
formulário que salva os leads no banco (Cloudflare D1) e te avisa por e-mail — junto
com o app do /admin protegido por Cloudflare Access.
