# Estúdio Gecê — Site (v2)

Site institucional/portfólio com a identidade real do Estúdio Gecê (bordô + branco, DM Sans + Montserrat, logo e grafismo "g"). HTML, CSS e JS puros — sem build. Roda no Cloudflare Pages/Workers e atualiza a cada `git push`.

```
site/
├── index.html              # Página principal
├── 404.html
├── admin/index.html        # Área privada (futuro app)
├── assets/
│   ├── css/styles.css       # Estilo (cores/fontes no topo, bloco :root)
│   ├── js/main.js           # Menu mobile + animações
│   └── img/
│       ├── logo-gece-transp.png   # Logo bordô (header)
│       ├── logo-gece-branco.png   # Logo branco (rodapé/fundo bordô)
│       └── marca-split.png        # Grafismo "g" (hero e faixa)
├── _headers · robots.txt · .gitignore
```

## O que falta preencher (marcado com `EDITAR:` no index.html)
- **Contato:** e-mail, WhatsApp e Instagram reais (seção `#contato`).
- **Projetos:** títulos, descrições e fotos dos 6 cards. Para usar foto, dentro de
  `<div class="card__media">` coloque `<img src="/assets/img/projeto1.jpg" alt="...">`
  ocupando o bloco, e remova a tag `card__tag` se quiser.

## Cores e fontes
Topo do `assets/css/styles.css`, bloco `:root`:
- Bordô da marca: `--bordo: #561624`
- Fontes: DM Sans (texto/títulos) e Montserrat (rótulos)

## Publicar as atualizações
Você já tem o site conectado na Cloudflare. Para atualizar:
1. Substitua o conteúdo do repositório por estes arquivos.
2. Faça `git push` (ou use o Claude Code: abra-o nesta pasta e peça para
   commitar e enviar). A Cloudflare republica sozinha em ~1 min.

## Próximo passo — app no /admin
Base pronta. Quando definir a função (clientes, propostas, obras), monto a camada
de back-end na Cloudflare (Functions + banco D1) e o login via Cloudflare Access.
