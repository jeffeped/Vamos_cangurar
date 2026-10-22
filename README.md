# Vamos Cangurar! — protótipo demonstrativo

Autor: Jefferson Guilherme.

Versão: **0.2.0-demo.1**, de 21/10/2026. Exploração com dados fictícios; não usar com participantes.

Esta adaptação mantém o visual e a navegação do primeiro aplicativo. Base original: [commit bd7363221a375c89e8f5fe91673379076713d6a8](https://github.com/jeffeped/Vamos_cangurar/tree/bd7363221a375c89e8f5fe91673379076713d6a8). A referência `arquivo/primeiro-app-2026-06-06` preserva a versão anterior. Há também cópia local de seus cinco arquivos, conferida pelos identificadores Git dos arquivos, em `99_ARQUIVO/APP_ORIGINAL_2026-06-06_bd7363221a37` na pasta do projeto de pesquisa.

## Experimentar

Abra o aplicativo por HTTPS. No Android, use o menu do Chrome e escolha Adicionar à tela inicial ou Instalar aplicativo. No iPhone, use Compartilhar no Safari e Adicionar à Tela de Início. A instalação e o funcionamento offline em aparelho físico ainda precisam ser conferidos no dispositivo.

O cronômetro, o histórico e o CSV usam somente DEMO-001. O conteúdo de Aprender é um rascunho de estrutura, ainda sujeito ao desenvolvimento participativo e à validação. Não há cadastro real, consentimento eletrônico, comunicação com planilhas, avaliação clínica ou coleta da pesquisa. O armazenamento local fica separado do protótipo antigo.

## Rastreabilidade

- `version.json`: identificação da versão, base original e referência ao parecer.
- `CHANGELOG.md`: mudanças, requisitos do protocolo e limites da demonstração.
- `tests/prototipo.test.mjs`: verificações do cronômetro, exportação, isolamento e ausência de envio.
- Registro local do projeto: `00_GESTAO/REGISTRO_APP_0.2.0-demo.1_2026-10-21.json`, com hashes, fontes e resultado efetivo da publicação.

Os PDFs e os documentos da pesquisa permanecem na pasta regulatória local; não fazem parte desta publicação. A aprovação do protocolo não representa validação concluída do aplicativo.

## Conferir o código

Requer Node.js. Sem instalação de dependências:

```text
node --test tests/prototipo.test.mjs
node --check app.js
node --check sw.js
```

Para futuras mudanças, atualizar a versão, o histórico e o registro de verificação. Não substituir nem reescrever a versão original.
