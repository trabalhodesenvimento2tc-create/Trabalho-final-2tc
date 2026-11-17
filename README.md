# Relatório técnico completo - Foco & Rota

## 1. Visão geral do projeto

Foco & Rota é uma aplicação web responsiva voltada ao estudo. A aplicação combina autenticação, organização de matérias, cronômetro Pomodoro, plano semanal, frases motivacionais, acompanhamento das sessões e anotações.

O projeto roda diretamente no navegador e usa:

- HTML para estrutura inicial da página.
- CSS para aparência, temas e responsividade.
- JavaScript para interface, navegação, formulários e timer.
- Supabase para autenticação, banco PostgreSQL, políticas de acesso e persistência.
- Google Fonts para tipografia.
- VLibras para recurso opcional de acessibilidade.

A estrutura atual do projeto é:

- `index.html`: documento principal, recursos externos e containers.
- `style.css`: tema claro/escuro, layout, componentes e responsividade.
- `dados.js`: configuração do Supabase e camada central de comunicação com o banco.
- `app.js`: estado da aplicação, navegação e regras de interface.
- `sql/01-seguranca-e-sessoes.sql`: políticas RLS, `user_id` automático e colunas para registrar sessões.
- `sql/02-corrigir-materias-existentes.sql`: correção de nomes corrompidos por codificação.
- `sql/03-mais-frases-motivacionais.sql`: lote de frases motivacionais.
- `sql/04-criar-plano-estudos.sql`: criação da tabela de plano semanal.

O relatório anterior não corresponde integralmente ao estado atual e, por isso, este documento descreve a implementação que existe nos arquivos.

## 2. Objetivo de cada parte

### `index.html`

O arquivo HTML:

- Declara português brasileiro como idioma da interface.
- Ajusta o layout para dispositivos móveis por meio da viewport.
- Define o título da aplicação como "Foco & Rota".
- Carrega as fontes DM Sans e Space Grotesk.
- Importa o arquivo visual `style.css`.
- Importa o SDK do Supabase pela CDN.
- Mantém o shell da página, o espaço de feedback e um único ponto de montagem (`#view`).
- Carrega `dados.js` e `app.js` sem parâmetros de versão duplicados.
- Carrega o plugin VLibras.

As telas, formulários e a navegação são montados em `app.js`; o HTML não duplica essas estruturas.

### `style.css`

O CSS define:

- Fundo escuro por padrão.
- Tema claro e tema escuro.
- Variáveis globais de cor.
- Fontes de título e texto.
- Cartões, botões, campos, listas e detalhes expansíveis.
- Timer de 64 pixels.
- Navegação fixa na base da tela.
- Grade responsiva.
- Destaque azul como cor principal.
- Fundo amarelo reservado às frases motivacionais.
- Indicadores de sucesso e erro.
- Estados de foco visível para teclado.
- Contraste dos botões principais nos temas claro e escuro.
- Layout em uma coluna em telas menores que 500 pixels.
- Blocos do plano em duas colunas no computador e uma coluna no celular.

## 3. Arquitetura do código

### Camada de dados: `dados.js`

`dados.js` contém:

- URL pública do projeto Supabase.
- Chave pública `anon`.
- Inicialização do cliente Supabase.
- Lista das seis matérias iniciais.
- Tradução de mensagens técnicas em mensagens amigáveis.
- Função central `api(acao, dados)`.

A chave `anon` é destinada ao navegador. Ela não substitui as regras de banco nem permite acesso irrestrito. A chave administrativa `service_role` nunca deve ser colocada nesse arquivo ou em qualquer código público.

### Camada visual e lógica: `app.js`

`app.js` mantém em memória:

- A tela atual.
- O usuário autenticado.
- A lista de matérias.
- Estado do timer, incluindo duração, matéria, segundos estudados, tempo restante e início do trecho ativo.
- Identificador do usuário usado para separar o timer persistido de cada conta.

Ele também implementa:

- Escape de conteúdo para impedir injeção de HTML em textos informados pelo usuário.
- Seleção e persistência do tema em `localStorage`.
- Verificação da sessão Supabase ao abrir a aplicação.
- Montagem das telas por meio de `montarTela()`, em um único ponto de montagem.
- Navegação inferior com Início, Estudar, Matérias, Plano e Anotações.
- Formulários, exclusões e atualização dos dados exibidos.

## 4. Fluxo completo da aplicação

### 4.1. Inicialização

1. O navegador carrega `index.html`.
2. O tema é configurado. Se não existir preferência guardada, o tema escuro é usado.
3. O evento `DOMContentLoaded` executa a inicialização do aplicativo.
4. `app.js` consulta a sessão atual.
5. Se não houver sessão válida, o usuário recebe a tela de login.
6. Se houver sessão, o sistema cria matérias iniciais, caso necessário, e abre a tela de início.

Ao sair, o usuário é removido da sessão e a página é recarregada.

### 4.2. Cadastro

O usuário pode:

1. Selecionar a aba **Criar conta**.
2. Informar e-mail, senha e confirmação.
3. Receber um aviso caso as senhas sejam diferentes.
4. Receber um aviso caso a senha tenha menos de seis caracteres.
5. Ter o cadastro enviado ao Supabase.
6. Entrar automaticamente quando o projeto já retorna uma sessão.
7. Ser orientado a confirmar o e-mail quando a confirmação estiver habilitada.

O formulário usa validação HTML para o formato do e-mail e exige os campos obrigatórios.

### 4.3. Login

O usuário informa:

- E-mail válido.
- Senha com pelo menos seis caracteres.

Se a entrada for aceita, o aplicativo obtém o usuário autenticado e chama a inicialização da conta.

Se houver erro, `dados.js` traduz mensagens conhecidas do Supabase, como:

- Credenciais inválidas.
- E-mail já cadastrado.
- Limite de tentativas.
- Senha curta.
- E-mail inválido.
- E-mail não confirmado.

### 4.4. Tela inicial

A tela inicial reúne:

- Uma frase motivacional aleatória por data de seleção.
- Número de Pomodoros registrados pelo usuário.
- Total de minutos registrados em sessões.
- Estatísticas por matéria com minutos estudados e blocos do plano concluídos.
- Resumo dos blocos planejados para o dia atual.
- Orientação básica de uso.

A tela carrega em conjunto:

- Resumo das sessões.
- Uma frase.
- Plano semanal.
- Estatísticas por matéria.

Falhas de rede ou consulta aparecem com a opção **Tentar novamente**. Listas vazias exibem orientações para adicionar dados.

O dia atual é convertido para o padrão da semana usada pelo banco, começando na segunda-feira:

- Segunda = 0.
- Domingo = 6.

### 4.5. Pomodoro/Estudar

A tela Estudar permite:

- Selecionar uma matéria existente.
- Escolher o estudo sem matéria.
- Definir uma duração de 5 a 90 minutos, em intervalos de cinco.
- Iniciar ou pausar o cronômetro.
- Pular o ciclo atual.

O timer começa com 25 minutos. O tempo decorrido é calculado com `Date.now()`; um intervalo apenas atualiza a tela. Pausar, retomar ou recarregar não acrescenta tempo pausado. O estado é salvo em `localStorage`, separado por usuário.

- Ao completar o ciclo, a sessão é salva como concluída.
- Ao pular, a sessão fica marcada como não concluída e só registra os segundos realmente estudados.
- Os segundos são persistidos; as estatísticas exibem minutos completos.
- Se não houver tempo estudado ao pular, nenhum registro é criado.
- Mensagens de conclusão e erro aparecem na interface, sem `alert`.

### 4.6. Matérias

No primeiro acesso autenticado, o sistema tenta inserir:

1. Português, azul.
2. Matemática, azul escuro.
3. História, azul claro.
4. Geografia, azul escuro.
5. Ciências, azul muito claro.
6. Inglês, azul ciano.

A tela permite:

- Criar uma matéria com nome.
- Escolher uma cor.
- Editar nome e cor.
- Listar matérias do usuário.
- Excluir matérias.

Ao excluir uma matéria vinculada a plano ou sessão, o banco pode usar o comportamento definido pela chave estrangeira, que está configurado como `NULL` em algumas ligações.

### 4.7. Plano semanal

O Plano reúne os blocos de estudo por dia da semana.

Cada bloco possui:

- Dia de 0 a 6.
- Matéria opcional.
- Duração entre 5 e 240 minutos.
- Observação opcional de até 120 caracteres.
- Estado concluído ou pendente.

Na tela é possível:

- Criar um novo bloco.
- Editar blocos existentes.
- Selecionar o dia da semana.
- Selecionar matéria.
- Informar duração.
- Informar observação.
- Marcar um bloco como feito.
- Desfazer o bloco concluído.
- Excluir o bloco.
- Visualizar o progresso geral.

A soma de blocos feitos é usada para calcular uma barra de progresso em porcentagem.

### 4.8. Anotações

A tela Notas permite:

- Informar título.
- Selecionar matéria opcional.
- Escrever o conteúdo.
- Salvar a anotação.
- Editar anotações existentes.
- Listar notas em ordem decrescente de criação.
- Abrir detalhes.
- Excluir uma anotação.

Os textos renderizados são escapados pela função `esc()`, evitando que marcações inseridas pelo usuário sejam interpretadas como HTML.

### 4.9. Tema

O tema funciona por meio do atributo:

`document.documentElement.dataset.tema`

Os valores possíveis são:

- `escuro`.
- `claro`.

A preferência é armazenada em `localStorage` na chave `foco-rota-tema`. O tema padrão é escuro.

## 5. Função central da API

A interface não envia consultas diretamente para o Supabase nas telas. Ela chama `api(acao, dados)`.

Esta centralização permite que:

- Todas as mensagens de erro sejam traduzidas em um único lugar.
- As chamadas tenham o mesmo padrão.
- A interface não precise conhecer detalhes da consulta em cada tela.
- A autenticação seja verificada antes das operações protegidas.

### Ações autenticadas existentes

- `materias_listar`.
- `materias_criar`.
- `materias_editar`.
- `materias_excluir`.
- `plano_listar`.
- `plano_criar`.
- `plano_editar`.
- `plano_marcar`.
- `plano_excluir`.
- `sessao_salvar`.
- `resumo`.
- `estatisticas_materias`.
- `frase`.
- `anotacoes_listar`.
- `anotacoes_criar`.
- `anotacoes_editar`.
- `anotacoes_excluir`.
- `iniciar_usuario`.

### Ações públicas e de autenticação

- `sessao`.
- `cadastrar`.
- `entrar`.
- `recuperar_senha`.
- `atualizar_senha`.
- `sair`.

Antes de operações protegidas, `dados.js` chama `sb.auth.getUser()`. Se não houver usuário, informa que a sessão expirou e solicita novo login.

## 6. Banco Supabase configurado

Configuração registrada anteriormente para o projeto:

- Nome: `foco-rota`.
- Organização: `Trabalho2tc`.
- ID do projeto: `wboaqwpxnoghtzwbdygh`.
- Região: South America/São Paulo.
- Código da região: `sa-east-1`.
- URL: `https://wboaqwpxnoghtzwbdygh.supabase.co`.

Os scripts indicam que o projeto utiliza tabelas PostgreSQL, autenticação Supabase e políticas RLS.

## 7. Modelo de dados

### `materias`

Armazena:

- ID UUID.
- ID do usuário.
- Nome.
- Cor.
- Data de criação.

É usada para relacionar matérias ao plano, sessões e notas.

### `sessoes`

Armazena:

- ID UUID.
- ID do usuário.
- Segundos efetivamente estudados e minutos completos.
- Estado `concluida`, distinguindo ciclo completo de ciclo pulado.
- ID da matéria, opcional.
- Data de criação.

O resumo soma o tempo estudado e conta como Pomodoros somente as sessões concluídas.

As estatísticas por matéria somam os segundos estudados e contam somente as sessões concluídas.

### `plano_estudos`

Armazena:

- ID UUID.
- ID do usuário.
- Dia da semana.
- ID da matéria, opcional.
- Minutos.
- Observação.
- Estado `feito`.
- Data de criação.

Possui restrições:

- Dia entre 0 e 6.
- Minutos entre 5 e 240.
- Exclusão do usuário associada por chave estrangeira.

### `frases`

Armazena frases motivacionais públicas para leitura por usuários autenticados.

A aplicação:

1. Busca até 20 frases.
2. Escolhe uma pelo dia atual do mês.
3. Usa módulo pelo número de frases disponíveis.
4. Apresenta a frase padrão "Um passo de cada vez." quando não encontra dados.

### `anotacoes`

Armazena:

- ID UUID.
- ID do usuário.
- Título.
- Texto.
- ID da matéria, opcional.
- Data de criação.

As consultas são ordenadas da nota mais nova para a mais antiga.

## 8. Segurança

O projeto usa Row Level Security nas tabelas com dados por usuário.

As políticas são baseadas em:

`auth.uid() = user_id`

Isso significa que:

- Cada usuário consulta apenas dados com seu próprio ID.
- Cada usuário cria registros ligados ao seu próprio ID.
- Cada usuário altera apenas seus registros próprios.
- Cada usuário exclui apenas seus registros próprios.

O banco preenche `user_id` com `default auth.uid()`. O JavaScript não envia esse campo nas inserções. As políticas de inserção usam `WITH CHECK (auth.uid() = user_id)`; leitura, atualização e exclusão também ficam restritas ao proprietário.

A interface também:

- Escapa nomes, matérias, observações, títulos e textos antes de inserir HTML.
- Não usa a chave administrativa.
- Não guarda senha em arquivo.
- Usa autenticação em vez de um login próprio não seguro.

O código atual não deve reutilizar senhas enviadas em conversas, mensagens ou históricos de configuração.

## 9. Scripts SQL

### Ordem de execução

1. `01-seguranca-e-sessoes.sql`: define o padrão e as políticas RLS e adiciona as colunas de segundos estudados/conclusão em `sessoes`. Espera que as tabelas-base `materias`, `sessoes` e `anotacoes` já existam.
2. `02-corrigir-materias-existentes.sql`: revisa e corrige nomes já cadastrados.
3. `03-mais-frases-motivacionais.sql`: insere frases sem duplicá-las.
4. `04-criar-plano-estudos.sql`: cria o plano semanal e suas políticas.

Execute os scripts no SQL Editor do Supabase. O primeiro script substitui as políticas das tabelas pessoais pelas políticas padrão do aplicativo.

### Chave pública

A chave `anon` usada no navegador é pública por definição e só pode ser usada com as políticas RLS aplicadas. Ela não é uma credencial administrativa. **Nunca coloque a chave `service_role` no JavaScript, HTML, repositório ou qualquer ambiente público.**

### Correção de matérias

`02-corrigir-materias-existentes.sql` localiza nomes com problemas comuns de codificação e permite corrigir:

- PortuguÃªs para Português.
- MatemÃ¡tica para Matemática.
- HistÃ³ria para História.
- Geografia para Geografia, caso o nome esteja com uma codificação equivalente.
- CiÃªncias para Ciências.
- InglÃªs para Inglês.

O script contém primeiro uma consulta de conferência para evitar alterações sem análise.

### Frases adicionais

`03-mais-frases-motivacionais.sql` insere um lote de frases motivacionais usando um conjunto de valores.

A cláusula `NOT EXISTS` impede que uma frase exatamente igual já existente seja inserida novamente.

Espaços externos são normalizados por `trim()`.

### Plano de estudos

`04-criar-plano-estudos.sql` cria a tabela `plano_estudos`, ativa RLS e cria quatro políticas:

- Consulta.
- Inserção.
- Atualização.
- Exclusão.

## 10. Navegação e componentes visuais

A navegação de usuário é criada pelo JavaScript:

- Início.
- Estudar.
- Matérias.
- Plano.
- Anotações.
- Sair.

Ela fica fixa na parte inferior do aplicativo em desktop e celular. A opção ativa recebe o fundo azul claro.

Em telas pequenas:

- O texto da navegação fica menor.
- A grade se transforma em uma coluna.
- Controles ficam em largura adequada.
- Os blocos de plano passam para uma coluna.
- O painel de login continua centralizado.

## 11. Pontos que precisam ser considerados

### Autenticação por e-mail

O comportamento depende da configuração do projeto:

- Com confirmação desativada, o cadastro pode criar sessão imediatamente.
- Com confirmação ativada, o usuário precisa verificar o e-mail.

### Cache

Os scripts não repetem um número de versão no HTML. Durante o desenvolvimento, use o Live Server para recarga automática; em hospedagem, configure cache HTTP adequado para arquivos estáticos.

### VLibras

O projeto carrega o widget externo VLibras. Esse recurso depende da disponibilidade de scripts externos e de rede.

### Estrutura HTML estática

O HTML contém apenas a estrutura fixa da página. Login, recuperação de senha e telas autenticadas são criados em `app.js`, centralizados no mesmo ponto de montagem.

### Recuperação de senha

O fluxo chama `resetPasswordForEmail()` com `?recovery=1` no endereço de retorno. O aplicativo usa esse marcador e o evento `PASSWORD_RECOVERY` para abrir o formulário de nova senha, que usa `updateUser()`. A mensagem não revela se o e-mail está cadastrado. Em **Authentication > URL Configuration**, inclua o endereço local e o publicado em **Redirect URLs**. Erros de link expirado/inválido e senha curta são traduzidos na interface.

Configuração aplicada no Supabase:

- **Site URL:** `https://foco-rota.vercel.app`
- **Redirect URLs:** `https://foco-rota.vercel.app/**` e `http://localhost:3000/**`

Se o servidor local usar outra porta, inclua também essa origem em **Redirect URLs**.

### Diferenças entre relatório antigo e estado atual

Funcionalidades descritas anteriormente que não aparecem na implementação atual:

- Tarefas.
- Baralhos.
- Cartões.
- Método de estudo com virada do cartão.
- Registro de acertos ou dificuldades.

Esses recursos não são parte da interface atual dos arquivos examinados.

## 12. Prompt técnico completo para explicar o projeto

Você pode usar a descrição abaixo para apresentar ou explicar o projeto:

> O Foco & Rota é um aplicativo web de produtividade para estudos, construído com HTML, CSS e JavaScript e conectado ao Supabase. A interface é montada em `app.js`, e as chamadas passam pela função `api()` em `dados.js`. As políticas RLS isolam os dados por usuário; o banco define `user_id` com `auth.uid()`. O aplicativo permite organizar matérias, estudar por ciclos que registram apenas o tempo efetivo, montar um plano semanal, editar anotações e acompanhar estatísticas. A recuperação de senha usa o fluxo de autenticação do Supabase. O tema claro/escuro e o timer são persistidos localmente.

## 13. Como executar localmente

1. Abra a pasta do projeto.
2. No SQL Editor do Supabase, execute os scripts na ordem indicada na seção anterior.
3. A configuração atual do Supabase já permite a URL publicada e `http://localhost:3000/**`; ajuste-a se mudar o domínio ou a porta local.
4. No VS Code, inicie o Live Server (ou outro servidor HTTP local).
5. Abra a interface pelo endereço local e aguarde os scripts externos carregarem.
6. Crie uma conta ou entre com uma conta existente.
7. Navegue pelas opções inferiores.

Não abra tudo por arquivo local em ambientes que bloqueiem scripts externos; utilizar servidor local ou hospedagem HTTPS é a opção mais segura.

O projeto é estático e não requer `npm install`. O Live Server recarrega a página durante o desenvolvimento.

O projeto `foco-rota` do Vercel não publica automaticamente as alterações feitas nesta pasta. Na verificação de 16/11/2026, `https://foco-rota.vercel.app/` respondeu com HTTP 200, mas os arquivos servidos ainda eram de uma versão anterior do aplicativo. O projeto está no modo **Vercel Drop**; para publicar esta correção, arraste a pasta do projeto para o dashboard desse projeto ou conecte o repositório GitHub e publique a branch de produção. Confirme também que o domínio publicado está em **Authentication > URL Configuration > Redirect URLs** do Supabase. O teste de recuperação com um e-mail real deve ser feito após publicar.

## 14. Fluxo de validação manual

### Conta e recuperação de senha

- [ ] Criar conta válida e conferir a mensagem de confirmação, se exibida.
- [ ] Entrar, sair e entrar novamente.
- [ ] Solicitar recuperação com e-mails existente e inexistente; confirmar que a mensagem é a mesma.
- [ ] Abrir o link recebido, definir uma senha nova e entrar com ela.
- [ ] Conferir mensagens para link expirado e senha curta.

### Tema

- [ ] Alternar para claro e conferir contraste, legibilidade e foco de teclado.
- [ ] Recarregar e confirmar que a preferência permaneceu.
- [ ] Alternar para escuro.

### Matérias

- [ ] Confirmar as seis matérias iniciais.
- [ ] Criar matéria e confirmar a cor.
- [ ] Editar nome e cor; recarregar e conferir persistência.
- [ ] Excluir.

### Pomodoro

- [ ] Selecionar matéria e alterar duração.
- [ ] Iniciar, pausar, esperar e retomar; conferir que o período pausado não foi contabilizado.
- [ ] Recarregar com o timer ativo e conferir que o estado foi restaurado.
- [ ] Concluir um ciclo e conferir segundos reais, estado concluído e resumo.
- [ ] Pular após estudar parte do ciclo e confirmar que só esse tempo foi registrado como não concluído.
- [ ] Pular sem estudar e confirmar que nenhum registro foi criado.

### Plano

- [ ] Criar blocos em mais de um dia.
- [ ] Editar matéria, duração e observação.
- [ ] Marcar como feito, conferir progresso e desfazer.
- [ ] Excluir e conferir persistência em `plano_estudos`.

### Anotações

- [ ] Criar nota com matéria e abrir os detalhes.
- [ ] Editar título, matéria e texto; recarregar e conferir persistência.
- [ ] Excluir e confirmar ausência em `anotacoes`.

### Segurança

- [ ] Confirmar que novas inserções funcionam sem enviar `user_id` pelo navegador.
- [ ] Entrar com usuário A e conferir apenas dados próprios.
- [ ] Entrar com usuário B e confirmar que os dados não são compartilhados.

O teste de recuperação depende de acesso a uma caixa de e-mail real e deve ser concluído antes da entrega.

## 15. Dados enviados ao Supabase

### Cadastro

```text
e-mail
senha
```

### Matéria

```text
nome
cor
```

### Plano

```text
dia
materia_id
minutos
observacao
feito
```

### Sessão

```text
minutos
segundos_estudados
concluida
materia_id
```

### Anotação

```text
título
texto
materia_id
```

## 16. Estado do projeto identificado nesta análise

O projeto atual inclui e integra:

- Autenticação Supabase.
- Inicialização de matérias.
- Tela inicial.
- Resumo de sessões.
- Frases motivacionais.
- Timer Pomodoro.
- Plano semanal.
- Controle de estado concluído.
- Anotações.
- Tema claro e escuro.
- Recuperação de senha.
- Edição de matérias, blocos do plano e anotações.
- Estatísticas por matéria.
- RLS baseada em usuário.
- Scripts SQL de segurança, correção, frases e plano.
- Widget de acessibilidade VLibras.

Os recursos atuais não incluem:

- Lista de tarefas gerais.
- Sistema de flashcards.
- Interface de acertos/dificuldades.
- Perfil editável.
- Backend próprio em servidor Node.

## 17. Resumo final

Foco & Rota é uma interface front-end independente com persistência no Supabase. A separação atual é:

- `index.html`: carregamento e recursos da página.
- `style.css`: aparência.
- `dados.js`: comunicação com banco e autenticação.
- `app.js`: comportamento da interface.
- SQL: estrutura e manutenção adicional do banco.

Esse modelo permite explicar o projeto em três camadas: interface, regra da aplicação e banco seguro. Nenhuma tela autenticada consulta diretamente dados sem passar pela função central `api()`, e o banco complementa essa organização com políticas de acesso por usuário.
