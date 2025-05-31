require('dotenv').config();
const { request } = require('undici');
const crypto = require('crypto');

// URL do ngrok fornecida
const WEBHOOK_URL = 'https://globally-picked-skylark.ngrok-free.app/api/notifications';
const ACCOUNT_NUMBER = '8860959';

// Função para construir query string (copiado de B8cashUtils)
function buildQuery(obj, prefix) {
  let str = [];
  for (let p in obj) {
    if (obj.hasOwnProperty(p)) {
      let k = prefix ? `${prefix}[${p}]` : p;
      let v = obj[p];
      str.push(
        v !== null && typeof v === "object"
          ? buildQuery(v, k)
          : encodeURIComponent(k) + "=" + encodeURIComponent(v)
      );
    }
  }
  return str.join("&");
}

// Função para gerar assinatura (copiado de B8cashUtils)
function generateSignature(body, queryParams, apiSecret) {
  const combinedData = { ...body, ...queryParams };
  delete combinedData.signature; // Remove assinatura existente
  const queryString = buildQuery(combinedData); // Transforma em query string
  const hash = crypto.createHmac('sha512', apiSecret).update(queryString).digest('hex'); // Gera HMAC-SHA512
  return hash;
}

// Função principal para definir o webhook
async function setWebhook() {
  try {
    // Obter as variáveis de ambiente
    const baseUrl = process.env.B8_BASE_URL;
    const apiKey = process.env.B8_API_KEY;
    const apiSecret = process.env.B8_API_SECRET;

    // Verificar se todas as variáveis necessárias estão definidas
    if (!baseUrl || !apiKey || !apiSecret) {
      console.error('Erro: Variáveis de ambiente não configuradas. Verifique seu arquivo .env');
      console.error('Variáveis necessárias: B8_BASE_URL, B8_API_KEY, B8_API_SECRET');
      return;
    }

    console.log(`Configurando webhook para a URL: ${WEBHOOK_URL}`);
    console.log('Usando API Key:', apiKey);
    console.log('Usando Account Number:', ACCOUNT_NUMBER);
    
    // Preparar o corpo da requisição
    const timestamp = Math.floor(Date.now() / 1000);
    const body = {
      url: WEBHOOK_URL,
      timestamp
    };

    // Gerar assinatura
    body.signature = generateSignature(body, {}, apiSecret);

    console.log('Body da requisição:', JSON.stringify(body, null, 2));
    console.log('Enviando requisição para configurar webhook...');
    
    // Fazer a requisição para a API B8Cash
    const { body: responseBody, statusCode } = await request(`${baseUrl}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'B8-API-KEY': apiKey,
        'ACCOUNT-NUMBER': ACCOUNT_NUMBER
      },
      body: JSON.stringify(body)
    });

    // Processar a resposta
    const response = await responseBody.json();
    
    if (statusCode === 200 && response.success) {
      console.log('Webhook configurado com sucesso!');
      console.log('Resposta:', JSON.stringify(response, null, 2));
    } else {
      console.error('Erro ao configurar webhook:');
      console.error(`Status: ${statusCode}`);
      console.error('Resposta:', JSON.stringify(response, null, 2));
    }

    // Mostrar o comando curl equivalente para referência
    console.log('\nComando curl equivalente:');
    console.log(`curl --request POST \\
  --url ${baseUrl}/setWebhook \\
  --header 'Content-Type: application/json' \\
  --header 'B8-API-KEY: ${apiKey}' \\
  --header 'ACCOUNT-NUMBER: ${ACCOUNT_NUMBER}' \\
  --data '${JSON.stringify(body)}'`);

  } catch (error) {
    console.error('Erro ao executar a requisição:', error.message);
  }
}

// Executar a função principal
setWebhook(); 