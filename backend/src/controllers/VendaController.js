const db = require('../config/database');

class VendaController {
   
   async store(req, res) {
       try {
           console.log('================================');
           console.log('BODY RECEBIDO:', req.body);
           console.log('USUARIO:', req.usuarioId);
           console.log('CARGO:', req.usuarioCargo);
   
           if (
               req.usuarioCargo !== 'admin' &&
               req.usuarioCargo !== 'funcionario'
           ) {
               return res.status(403).json({
                   error: 'Apenas funcionários ou administradores podem registrar vendas'
               });
           }
   
           const { perfume_id, quantidade, cliente_nome, cliente_telefone, forma_pagamento, quantidade_parcelas } = req.body;
           const vendedor_id = req.usuarioId;
   
           if (!perfume_id) {
               return res.status(400).json({
                   error: 'Perfume não informado'
               });
           }
   
           if (!quantidade || Number(quantidade) <= 0) {
               return res.status(400).json({
                   error: 'Quantidade inválida'
               });
           }
   
           if (!forma_pagamento) {
               return res.status(400).json({
                   error: 'Forma de pagamento obrigatória'
               });
           }
   
           const parcelas = Number(quantidade_parcelas || 1);
           const perfumeResult = await db.query(`SELECT * FROM perfumes WHERE id = $1`, [perfume_id]);
   
           if (perfumeResult.rows.length === 0) {
               return res.status(404).json({
                   error: 'Perfume não encontrado'
               });
           }
   
           const perfume = perfumeResult.rows[0];
   
           if (Number(perfume.quantidade) < Number(quantidade)) {
               return res.status(400).json({
                   error: 'Estoque insuficiente'
               });
           }
   
           const preco = Number(perfume.preco);
           const total = preco * Number(quantidade);
   
           console.log('PERFUME:', perfume.nome);
           console.log('PREÇO:', preco);
           console.log('TOTAL:', total);
   
           await db.query(`UPDATE perfumes SET quantidade = quantidade - $1 WHERE id = $2, [Number(quantidade), perfume_id]);
   
           const vendaResult = await db.query(`INSERT INTO vendas (perfume_id, quantidade, total, cliente_nome, cliente_telefone, forma_pagamento, vendedor_id, data_venda, status_pagamento, quantidade_parcelas)
               VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9)RETURNING *`,
               [perfume_id, Number(quantidade), total, cliente_nome || null, cliente_telefone || null, forma_pagamento, vendedor_id, 'pendente', parcelas]);
   
               const venda = vendaResult.rows[0];
               console.log('VENDA CRIADA:', venda);
      
              if (forma_pagamento === 'cartao_credito' && parcelas > 1) {
                 const valorParcela = total / parcelas;
                  for (let i = 1; i <= parcelas; i++) {
                      const vencimento = new Date();
                      vencimento.setMonth(
                           vencimento.getMonth() + i
                      );
                      await db.query(`INSERT INTO parcelas (venda_id, numero_parcela, valor, data_vencimento, status)
                          VALUES ( $1,$2,$3,$4,'pendente') `,
                          [venda.id, i, valorParcela, vencimento.toISOString().split('T')[0]]
                      );
                     }
                 }
   
                 return res.status(201).json({
                     success: true,
                     venda
                 });
             } catch (error) {
                 console.error('ERRO STORE VENDA');
                 console.error(error);
   
                 return res.status(500).json({
                     error: error.message,
                     stack: process.env.NODE_ENV === 'development'
                         ? error.stack
                         : undefined
                 });
             }
         }

       async index(req, res) {
          try {
              console.log('===== INDEX VENDAS =====');
              console.log('usuarioId:', req.usuarioId);
              console.log('usuarioCargo:', req.usuarioCargo);
              let result;

              if (req.usuarioCargo === 'admin') {
                  result = await db.query(`
                     SELECT
                       s.id,
                       s.quantidade,
                       s.total,
                       s.cliente_nome,
                       s.cliente_telefone,
                       s.forma_pagamento,
                       s.status_pagamento,
                       s.quantidade_parcelas,
                       s.data_venda,
                       p.nome AS perfume_nome,
                       u.nome AS vendedor_nome
                   FROM vendas s
                   INNER JOIN perfumes p
                       ON p.id = s.perfume_id
                   INNER JOIN usuarios u
                       ON u.id = s.vendedor_id
                   ORDER BY s.data_venda DESC
               `);
            } else {
               result = await db.query(`
                   SELECT
                       s.id,
                       s.quantidade,
                       s.total,
                       s.cliente_nome,
                       s.cliente_telefone,
                       s.forma_pagamento,
                       s.status_pagamento,
                       s.quantidade_parcelas,
                       s.data_venda,
                       p.nome AS perfume_nome,
                       u.nome AS vendedor_nome
                   FROM vendas s
                   INNER JOIN perfumes p
                       ON p.id = s.perfume_id
                   INNER JOIN usuarios u
                       ON u.id = s.vendedor_id
                   WHERE s.vendedor_id = $1
                   ORDER BY s.data_venda DESC
               `, [req.usuarioId]);
         }
           return res.json(result.rows);
       } catch (error) {
            console.error('===== ERRO INDEX VENDAS =====');
            console.error(error);
            console.error(error.message);
            
           return res.status(500).json({
               error: error.message,
               stack: error.stack
           });
       }
   }

  async updateStatus(req, res) {
      try {
            const { id } = req.params;
            const { status_pagamento } = req.body;

            const permitidos = ['pendente', 'pago', 'cancelado'];

            if (!permitidos.includes(status_pagamento)) {
                return res.status(400).json({
                    error: 'Status inválido'
                });
            }

            await db.query(`UPDATE vendas SET status_pagamento = $1 WHERE id = $2`, [status_pagamento, id]);

            return res.json({
                message: 'Status atualizado com sucesso'
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                error: error.message
            });
        }
    }

    async getParcelas(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`SELECT  FROM parcelas WHERE venda_id = $1 ORDER BY numero_parcela`, [id]);
            return res.json(result.rows);
        } catch (error) {
            console.error('Erro ao buscar parcelas:', error);
            return res.status(500).json({
                error: error.message
            });
        }
    }

    async updateParcelaStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const permitidos = ['pendente', 'pago', 'cancelado'];

            if (!permitidos.includes(status)) {
                return res.status(400).json({
                    error: 'Status inválido'
                });
            }

            await db.query(`UPDATE parcelas SET status = $1 WHERE id = $2`, [status, id]);

            return res.json({
                message: 'Status da parcela atualizado'
            });
        } catch (error) {
            console.error('Erro ao atualizar parcela:', error);

            return res.status(500).json({
                error: error.message
            });
        }
    }
}

module.exports = new VendaController();
