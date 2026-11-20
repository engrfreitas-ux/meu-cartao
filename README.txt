MEU CARTÃO — PWA (aplicativo web instalável)

IMPORTANTE
Este pacote é o código-fonte inicial. Ainda não está publicado na internet e ainda não está conectado ao Firebase. Não compartilhe o app publicamente antes de configurar e testar as regras.

1) No Firebase Console, abra o projeto meu-cartao-rafael.
2) Clique na engrenagem > Configurações do projeto > Geral.
3) Em "Seus apps", clique no ícone Web </> para registrar um app web.
4) Dê o nome "Meu Cartão Web". Não precisa marcar Firebase Hosting neste passo.
5) Copie o objeto firebaseConfig exibido.
6) Abra app.js e substitua os seis valores COLE_AQUI pelos valores correspondentes do firebaseConfig.
7) No Firestore > Regras, substitua o conteúdo pelas regras do arquivo firestore.rules e publique.
8) Em Authentication > Settings/Configurações > Domínios autorizados, adicione o domínio onde o app for hospedado.
9) Hospede os arquivos deste pacote em um serviço HTTPS de hospedagem estática (por exemplo Firebase Hosting). A publicação exige configurar o serviço e domínio.
10) Abra o endereço HTTPS no Chrome do Android > menu ⋮ > "Adicionar à tela inicial" ou "Instalar app".

FUNCIONALIDADES NESTA VERSÃO
- Login com Google
- Limite de controle e dia de fechamento
- Lançamento manual por categoria
- Compras à vista e parceladas
- Visão de saldo, categorias e parcelas futuras
- Exclusão de compra

OBSERVAÇÕES
- O código calcula o mês de fatura de forma simplificada com base no dia de fechamento. A regra real de fechamento/competência do seu cartão deve ser conferida com a fatura do banco.
- A configuração Firebase (apiKey etc.) identifica o projeto; a segurança depende das regras Firestore e autenticação, não de esconder esses valores.
- Não insira senha ou dados bancários no código.
