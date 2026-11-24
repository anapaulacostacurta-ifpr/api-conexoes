# Conexões — piloto consultarMeuPlano

Pacote independente para um NOVO repositório GitHub e um NOVO projeto Netlify. Não copie sobre a aplicação principal. Não altera o ZIP da plataforma, suas regras do Firestore nem seus dados. O backend apenas lê dois documentos: `sparkProfiles/{uid autenticado}` e `sparkPlans/{planId}`.

## 1. Publicar os arquivos no GitHub

1. Extraia o ZIP.
2. Crie um repositório privado chamado `conexoes-api-piloto`.
3. Faça upload do CONTEÚDO da pasta extraída na raiz do repositório. `package.json` e `netlify.toml` devem ficar na raiz, e não dentro de outra pasta.
4. Inclua as pastas `public`, `src`, `netlify` e `tests`, além de `package-lock.json`, `.gitignore` e `.nvmrc`. Ative a exibição de arquivos ocultos se necessário.
5. Não envie `node_modules`, chave JSON de conta de serviço, arquivos `.env` ou arquivos PEM.
6. Faça o commit na branch `main`.

Os arquivos públicos do Firebase em `public/firebase-config.js` já apontam para `app-conexao-783a4`. Essa configuração é pública e não é uma chave administrativa. O pacote não contém credenciais privadas.

## 2. Criar uma conta de serviço SOMENTE de leitura

No Google Cloud Console, selecione o projeto `app-conexao-783a4`:

1. Acesse IAM e administrador → Contas de serviço.
2. Crie uma conta, por exemplo `conexoes-piloto-leitura`.
3. Na concessão de acesso ao projeto, selecione o papel **Cloud Datastore Viewer**, identificador `roles/datastore.viewer`.
4. Não conceda Editor, Proprietário, Firebase Admin ou Datastore User. Não reutilize uma conta com permissão de gravação.
5. Na conta criada, abra Chaves → Adicionar chave → Criar nova chave → JSON.
6. Guarde esse arquivo fora do repositório. Ele permite acesso de servidor e não pode ser disponibilizado em `public/`.

Se a organização não permitir criação de chaves, não tente contornar a política: essa configuração precisará de uma alternativa de identidade aprovada pela organização.

O papel de leitura pode consultar outros documentos do banco, embora este código leia somente os dois caminhos definidos. O Admin SDK utiliza IAM e não as regras do Firestore. Não é preciso alterar as regras existentes. O piloto não lista contas do Authentication, não gera usuários e não verifica revogação por consulta ao cadastro de usuários: valida assinatura, projeto e expiração do ID token, e verifica o status do perfil em cada chamada. Um token revogado pode continuar válido até expirar; o piloto não substitui uma política completa de sessões de produção.

## 3. Criar o projeto no Netlify

1. Entre no Netlify e selecione adicionar/importar um projeto de um repositório Git.
2. Selecione GitHub e autorize apenas o novo repositório.
3. Escolha `conexoes-api-piloto`, branch `main`.
4. Confira a configuração importada de `netlify.toml`:
   - Base directory: raiz do repositório (vazio).
   - Build command: `npm run build`.
   - Publish directory: `public`.
   - Functions directory: `netlify/functions`.
   - Node: 22, definido no arquivo de configuração.
5. Publique. O build executa os testes locais antes de publicar. Os testes não acessam o banco real e não precisam de credenciais.
6. Anote a URL principal, por exemplo `https://conexoes-api-piloto.netlify.app`. O nome real depende da disponibilidade.

Use um único projeto para o piloto e acompanhe o consumo do plano gratuito no Netlify. Há limites de uso; não se trata de capacidade ilimitada.

## 4. Configurar as variáveis no Netlify

Abra Project configuration / Environment variables (o nome pode variar conforme o painel). Cadastre pela interface, disponíveis no ambiente Production e para Functions. Se a seleção de escopo não estiver disponível no plano, utilize o escopo disponibilizado, sem copiá-las para arquivos públicos.

| Variável | Valor |
|---|---|
| `FIREBASE_PROJECT_ID` | Opcional. Se ausente, o código usa `app-conexao-783a4`; se definida, precisa ter exatamente esse valor |
| `FIREBASE_CLIENT_EMAIL` | O campo `client_email` do JSON da conta de serviço |
| `FIREBASE_PRIVATE_KEY` | O campo `private_key` do JSON, incluindo BEGIN e END PRIVATE KEY |
| `PILOT_ALLOWED_UIDS` | Seu UID de professor aprovado; para várias contas, separe os UIDs por vírgula |

Cole somente o valor da chave privada, não o JSON inteiro e não as aspas externas do JSON. Tanto quebras de linha reais quanto a sequência literal `\n` são aceitas pelo código. Trate a variável como secreta, quando houver essa opção no painel.

O UID aparece em “Minha plataforma” no site atual. Também é possível copiá-lo no Firebase Authentication. Não é o e-mail do professor. Sem `PILOT_ALLOWED_UIDS`, a função recusa consultas. A autorização exige simultaneamente: UID na lista, token válido, e-mail verificado e perfil `teacher` com status `active`.

`ALLOWED_ORIGINS` é opcional e deve ficar ausente neste primeiro teste. A URL principal do projeto é reconhecida pela variável `URL` fornecida pelo Netlify. Teste na URL principal; domínios de previews não são liberados automaticamente. Se futuramente precisar de outra origem, cadastre o endereço exato, sem caminho e sem barra final, separando vários por vírgula. CORS não substitui autenticação.

Após salvar as variáveis, execute um novo deploy da branch principal. Alterar uma variável não atualiza funções já publicadas automaticamente.

## 5. Autorizar o domínio do piloto no Firebase 

1. Abra Firebase Console → projeto `app-conexao-783a4`.
2. Acesse Authentication → Configurações → Domínios autorizados.
3. Adicione apenas o hostname real do Netlify: por exemplo `conexoes-api-piloto.netlify.app`, sem `https://` e sem caminho.
4. Confira que o provedor Google está habilitado. O login atual já usa esse provedor; não é necessário reconfigurá-lo se estiver ativo.

Essa mudança adiciona um domínio de login. Não altera os arquivos da aplicação, as matrículas ou as regras do banco.

## 6. Testar

1. Abra a URL principal do projeto Netlify.
2. Clique em **Entrar com Google**, usando a conta de professor já aprovada na plataforma.
3. Clique em **Consultar meu plano**.
4. Confira plano, situação, limites e recursos. Em “Ver resposta técnica”, é possível consultar o JSON retornado. O token não é exibido.
5. Clique em **Sair** ao terminar. A sessão do piloto fica apenas na memória da página.

Endpoint: `GET /.netlify/functions/consultarMeuPlano`, com cabeçalho `Authorization: Bearer <ID token do Firebase>`. Abrir o endpoint diretamente na barra do navegador não envia esse cabeçalho e deve retornar erro 401. Não coloque tokens em URLs ou compartilhe-os.

O endpoint não recebe UID, nome do plano ou outros parâmetros; os dados são obtidos exclusivamente pelo usuário autenticado. Respostas privadas usam `Cache-Control: private, no-store`.

## 7. Compatibilidade com a plataforma atual

| Origem | Campo | Retorno |
|---|---|---|
| Perfil | `role`, `status` | Exige teacher / active |
| Perfil | `planId` | Plano consultado; se ausente, usa o identificador free |
| Perfil | `planExpiresAt` | Validade, quando o plano é pago |
| Plano | `title`, `price`, `active` | Nome e situação |
| Plano | `maxStudents` | `limites.alunos` |
| Plano | `maxQuestions` | `limites.perguntasPorAvaliacao` |
| Plano | `maxResponses` | `limites.respostasPorQuestionario` |
| Plano | `features.tracking`, `team`, `warnings`, `questionBank`, `courseAccess` | `recursos` com as mesmas chaves |

Se o plano não estiver cadastrado em `sparkPlans`, o piloto retorna `PLANO_AUSENTE`: não cria um plano automaticamente. Confira o cadastro pelo painel administrativo da aplicação existente. Não é preciso mudar dados válidos para testar.

Plano pago precisa de validade Timestamp; vencimento é exclusivo (no instante da validade, já está vencido). Plano gratuito não depende de validade. Plano `active:false` retorna `desativado`. Validade ausente em plano pago retorna `validade_pendente`. Limite ausente retorna `null` (não configurado), nunca “ilimitado”. Valores negativos ou de tipo inválido são recusados.

Recursos não configurados retornam `false`, por segurança. As regras legadas podem adotar padrões diferentes para campos ausentes; por isso este piloto é apenas informativo e não deve ser usado como substituto de autorização sem revisar os cadastros. Os recursos listados são os cadastrados; uma situação vencida/desativada não deve conceder acesso, mesmo se um recurso cadastrado for true. Não há contagem de consumo nesta fase.

Dados pessoais, comprovantes, observações internas e campos não previstos não são retornados. O piloto não altera o controle de acesso da plataforma existente nem aplica limites em suas operações.

## 8. Erros e diagnóstico

| Erro / situação | Ação |
|---|---|
| Domínio não autorizado no login | Adicionar o hostname correto ao Firebase Authentication |
| Janela de login bloqueada | Permitir popup para o projeto e tentar novamente |
| 401 LOGIN_NECESSARIO | Faça login e use o botão da página; a barra do navegador não envia token |
| 401 TOKEN_INVALIDO | Saia e entre novamente |
| 403 FORA_DO_PILOTO | Conferir UID e `PILOT_ALLOWED_UIDS`; depois republicar |
| 403 ACESSO_NEGADO | Conferir e-mail verificado, role teacher e status active |
| 403 ORIGEM_NEGADA | Utilizar a URL principal; conferir `URL` / `ALLOWED_ORIGINS` |
| 404 PERFIL_AUSENTE | O login existe, mas não há perfil correspondente na plataforma |
| 404 PLANO_AUSENTE | Conferir o plano indicado no perfil e o cadastro administrativo |
| 409 PLANO_INVALIDO | Conferir valores e tipos dos campos do plano |
| 503 | Configurar credenciais e a lista de UIDs e fazer novo deploy |
| 500 | Conferir chave privada, projeto e papel IAM da conta de serviço |
| Função não encontrada | Conferir pastas na raiz, logs do deploy e diretório netlify/functions |

Logs da função registram apenas o código genérico de falha interna, sem token, chave ou perfil. Não cole credenciais nos logs para diagnosticar. Mudanças de IAM podem levar algum tempo para se propagar.

## 9. Verificações de aceite

- Professor autorizado consulta somente o próprio plano.
- Professor fora da lista, estudante ou professor pendente não consulta.
- Sem token, com token inválido ou UID na URL: consulta recusada.
- Plano vencido, desativado e não cadastrado apresentam situação ou erro adequados.
- Nenhum documento é criado ou alterado pela consulta.
- O site principal continua funcionando como antes.

Testes automatizados: `npm ci` e `npm test`, com Node 22. Eles usam dados simulados e não acessam sua conta real. A autenticação Google, a leitura real no Firestore e a publicação só podem ser validadas após você configurar as credenciais e o domínio.

## 10. Desativar o piloto ou migrar

Para encerrar: retire o projeto Netlify de operação, remova o domínio adicional do Authentication e revogue a chave da conta de serviço. O sistema principal continuará usando a estrutura anterior.

Para migrar ao Firebase Functions: reutilize `src/services/consultar-meu-plano.mjs` e substitua o adaptador HTTP/credenciais. A inicialização no Google Cloud pode usar credenciais padrão, dispensando a chave privada usada neste piloto. Não há migração de banco.

Referências oficiais:
- https://docs.netlify.com/build/functions/get-started/
- https://docs.netlify.com/build/functions/environment-variables/
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
