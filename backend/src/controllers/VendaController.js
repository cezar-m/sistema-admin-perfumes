const db = require('../config/database');

class VendaController {

    async store(req, res) {
        try {

            if (
                req.usuarioCargo !== 'admin' &&
                req.usuarioCargo !== 'funcionario'
            ) {
                return res.status(403).json({
                    error: 'Apenas funcionários ou administradores podem registrar vendas'
                });
            }

            const {
                perfume_id,
                quantidade,
                cliente_nome,
                cliente_telefone,
                forma_pagamento,
                quantidade_parcelas = 1
            } = req.body;

            const vendedor_id = req.usuarioId;

            if (!perfume_id || !quantidade) {
                return res.status(400).json({
                    error: 'Perfume e quantidade são obrigatórios'
                });
            }

            if (!forma_pagamento) {
                return res.status(400).json({
                    error: 'Forma de pagamento é obrigatória'
                });
            }

            if (
                quantidade_parcelas > 1 &&
                forma_pagamento !== 'cartao_credito'
            ) {
                return res.status(400).json({
                    error: 'Parcelamento apenas para cartão de crédito'
                });
            }

            const perfumeResult = await db.query(
                'SELECT * FROM perfumes WHERE id = $1',
                [perfume_id]
            );

            const perfume = perfumeResult.rows[0];

            if (!perfume) {
                return res.status(404).json({
                    error: 'Perfume não encontrado'
                });
            }

            if (Number(perfume.quantidade) < Number(quantidade)) {
                return res.status(400).json({
                    error: 'Estoque insuficiente'
                });
            }

            const total =
                parseFloat(perfume.preco) * parseInt(quantidade);

            await db.query(
                `UPDATE perfumes
                 SET quantidade = quantidade - $1
                 WHERE id = $2`,
                [quantidade, perfume_id]
            );

            const vendaResult = await db.query(
                `INSERT INTO vendas
                (
                    perfume_id,
                    quantidade,
                    total,
                    cliente_nome,
                    cliente_telefone,
                    vendedor_id,
                    forma_pagamento,
                    data_venda,
                    status_pagamento,
                    quantidade_parcelas
                )
                VALUES
                (
                    $1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9
                )
                RETURNING id`,
                [
                    perfume_id,
                    quantidade,
                    total,
                    cliente_nome || null,
                    cliente_telefone || null,
                    vendedor_id,
                    forma_pagamento,
                    'pendente',
                    quantidade_parcelas
                ]
            );

            const vendaId = vendaResult.rows[0].id;

            if (quantidade_parcelas > 1) {

                const valorParcela =
                    total / quantidade_parcelas;

                const hoje = new Date();

                for (
                    let i = 1;
                    i <= quantidade_parcelas;
                    i++
                ) {

                    const vencimento = new Date(hoje);

                    vencimento.setMonth(
                        vencimento.getMonth() + i
                    );

                    await db.query(
                        `INSERT INTO parcelas
                        (
                            venda_id,
                            numero_parcela,
                            valor,
                            data_vencimento,
                            status
                        )
                        VALUES
                        (
                            $1,$2,$3,$4,'pendente'
                        )`,
                        [
                            vendaId,
                            i,
                            valorParcela,
                            vencimento
                                .toISOString()
                                .split('T')[0]
                        ]
                    );
                }
            }

            return res.status(201).json({
                id: vendaId,
                total,
                message: 'Venda registrada com sucesso'
            });

        } catch (error) {

            console.error(
                'Erro ao registrar venda:',
                error
            );

            return res.status(500).json({
                error: error.message
            });
        }
    }

    async index(req, res) {
        try {

            const usuarioId = req.usuarioId;
            const usuarioCargo = req.usuarioCargo;

            let result;

            if (usuarioCargo === 'admin') {

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

                result = await db.query(
                    `
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
                    `,
                    [usuarioId]
                );
            }

            return res.json(result.rows);

        } catch (error) {

            console.error(
                'Erro ao listar vendas:',
                error
            );

            return res.status(500).json({
                error: error.message
            });
        }
    }

    async updateStatus(req, res) {
        try {

            const { id } = req.params;
            const { status_pagamento } = req.body;

            const permitidos = [
                'pendente',
                'pago',
                'cancelado'
            ];

            if (
                !permitidos.includes(status_pagamento)
            ) {
                return res.status(400).json({
                    error: 'Status inválido'
                });
            }

            await db.query(
                `
                UPDATE vendas
                SET status_pagamento = $1
                WHERE id = $2
                `,
                [status_pagamento, id]
            );

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

            const result = await db.query(
                `
                SELECT *
                FROM parcelas
                WHERE venda_id = $1
                ORDER BY numero_parcela
                `,
                [id]
            );

            return res.json(result.rows);

        } catch (error) {

            console.error(
                'Erro ao buscar parcelas:',
                error
            );

            return res.status(500).json({
                error: error.message
            });
        }
    }

    async updateParcelaStatus(req, res) {
        try {

            const { id } = req.params;
            const { status } = req.body;

            const permitidos = [
                'pendente',
                'pago',
                'cancelado'
            ];

            if (!permitidos.includes(status)) {
                return res.status(400).json({
                    error: 'Status inválido'
                });
            }

            await db.query(
                `
                UPDATE parcelas
                SET status = $1
                WHERE id = $2
                `,
                [status, id]
            );

            return res.json({
                message: 'Status da parcela atualizado'
            });

        } catch (error) {

            console.error(
                'Erro ao atualizar parcela:',
                error
            );

            return res.status(500).json({
                error: error.message
            });
        }
    }
}

module.exports = new VendaController();
