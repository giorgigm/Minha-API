const http = require('http');
const axios = require('axios');
const xml2js = require('xml2js');
const nodemailer = require('nodemailer');
const hostname = '15.228.52.208';
const port = 3000;



const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      const data = JSON.parse(body);
      const cnpjEntrega = data.Header.CNPJEntrega;
      const numeropedido = data.Header.NumeroPedido;
      const observacaofornecedor = data.Header.ObservacaoFornecedor;
      const items = data.Items;

      let detItens = '';
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        detItens += `
          <item>
            <cod-cliente>${item.CodProdutoCliente}</cod-cliente>
            <quantidade>${item.Quantidade}</quantidade>
            <vlr-unitario>${item.PrecoUnitario.toFixed(2)}</vlr-unitario>
            <ordem-item>${numeropedido}</ordem-item>
            <sequencia-item>${item.Sequencial}</sequencia-item>
          </item>
        `;
      }

      const xmlBody = `
        <?xml version="1.0"?>
        <arquivo>
          <info>  
            <nome-remetente>NOME EMPRESA REMETENTE</nome-remetente>
            <nome-destinatario>BR SUPPLY</nome-destinatario>
            <key>WBS-EXT00000-XXXXX-ID00000</key>
            <auth>12345</auth>
          </info>
          <det-pedidos>
            <pedido>
              <referencia>${numeropedido}</referencia>		
              <cnpj>${cnpjEntrega}</cnpj>
              <cod-local>A123</cod-local>
              <usuario>ti@brsupply.com.br</usuario>
              <observacao>${observacaofornecedor}</observacao>
              <cod-categoria>25</cod-categoria>
              <det-itens>
                ${detItens}
              </det-itens>
            </pedido>
          </det-pedidos> 
        </arquivo>
      `;

      axios.post('http://wbsvc.brsupply.com.br/webserviceimp/wsimppedido.exe/imppedido', xmlBody, { headers: { 'Content-Type': 'text/xml' } })
      .then(response => {
        xml2js.parseString(response.data, (err, result) => {
          if (err) {
            console.error(err);
            res.statusCode = 500;
            res.end('Erro ao processar resposta da API');
          } else {
            const processamento = result.arquivo.processamento[0];
    
            // Código para enviar o email com o XML gerado
            const transporter = nodemailer.createTransport({
              service: 'hotmail',
              auth: {
                user: 'giorgi.martins@outlook.com',
                pass: 'Amordavida',
              },
            });
            const mailOptions = {
              from: 'giorgi.martins@outlook.com',
              to: 'giorgi.martins@outlook.com',
              subject: 'XML gerado',
              text: 'Segue em anexo o XML gerado',
              attachments: [{
                filename: 'arquivo.xml',
                content: xmlBody,
                contentType: 'text/xml',
              }],
            };
            transporter.sendMail(mailOptions, function(error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log('Email enviado: ' + info.response);
              }
            });
    
            // Envia a resposta da API externa para o cliente
            res.setHeader('Content-Type', 'text/plain');
            res.end(processamento);
          }
        });
      })
      .catch(error => {
        console.error(error);
        res.statusCode = 500;
        res.end('Erro ao enviar pedido para outra API');
      });
    });
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Endpoint não encontrado');
  }
});

server.listen(port, hostname, () => {
  console.log(`Servidor rodando em http://${hostname}:${port}/`);
});
