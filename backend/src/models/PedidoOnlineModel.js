const db = require('../config/database');

class PedidoOnlineModel {

    // Cliente vê seus próprios pedidos
    static async listarPorCliente(clienteId) {

        const result = await db.query(
            `
            SELECT *
            FROM pedidos_online
            WHERE cliente_id = $1
            ORDER BY data_pedido DESC
            `,
            [clienteId]
        );

        const pedidos = result.rows;

        if (pedidos.length === 0) {
            return pedidos;
        }

        const ids = pedidos.map(p => p.id);

        const itensResult = await db.query(
            `
            SELECT
                ip.pedido_id,
                ip.quantidade,
                ip.preco_unitario,
                perf.nome
            FROM itens_pedido_online ip
            INNER JOIN perfumes perf
                ON perf.id = ip.perfume_id
            WHERE ip.pedido_id = ANY($1)
            `,
            [ids]
        );

        const itens = itensResult.rows;

        const itensPorPedido = {};

        for (const item of itens) {

            if (!itensPorPedido[item.pedido_id]) {
                itensPorPedido[item.pedido_id] = [];
            }

            itensPorPedido[item.pedido_id].push({
                nome: item.nome,
                quantidade: item.quantidade,
                preco: item.preco_unitario
            });
        }

        for (const pedido of pedidos) {
            pedido.itens = itensPorPedido[pedido.id] || [];
        }

        return pedidos;
    }

    // Funcionários/Admin
    static async listarComPermissao(usuarioId, isAdmin = false) {

        let sql;
        let params;

        if (isAdmin) {

            sql = `
                SELECT
                    po.*,
                    u.nome AS cliente_nome,
                    u.email,
                    aprov.nome AS aprovador_nome
                FROM pedidos_online po
                INNER JOIN usuarios u
                    ON u.id = po.cliente_id
                LEFT JOIN usuarios aprov
                    ON aprov.id = po.aprovado_por_id
                ORDER BY po.data_pedido DESC
            `;

            params = [];

        } else {

            sql = `
                SELECT
                    po.*,
                    u.nome AS cliente_nome,
                    u.email,
                    NULL AS aprovador_nome
                FROM pedidos_online po
                INNER JOIN usuarios u
                    ON u.id = po.cliente_id
                WHERE
                    po.status = 'aguardando_aprovacao'
                    OR (
                        po.status <> 'aguardando_aprovacao'
                        AND po.aprovado_por_id = $1
                    )
                ORDER BY po.data_pedido DESC
            `;

            params = [usuarioId];
        }

        const result = await db.query(sql, params);

        const pedidos = result.rows;

        for (const pedido of pedidos) {

            const itensResult = await db.query(
                `
                SELECT
                    ip.quantidade,
                    ip.preco_unitario,
                    perf.nome AS perfume_nome
                FROM itens_pedido_online ip
                INNER JOIN perfumes perf
                    ON perf.id = ip.perfume_id
                WHERE ip.pedido_id = $1
                `,
                [pedido.id]
            );

            pedido.itens = itensResult.rows;
        }

        return pedidos;
    }

    // Criar pedido
    static async criar(pedido) {

        const {
            cliente_id,
            total,
            forma_pagamento,
            dados_transacao,
            endereco_entrega,
            itens
        } = pedido;

        const client = await db.connect();

        try {

            await client.query('BEGIN');

            const enderecoFinal = endereco_entrega
                ? (
                    typeof endereco_entrega === 'string'
                        ? endereco_entrega
                        : JSON.stringify(endereco_entrega)
                )
                : null;

            const pedidoResult = await client.query(
                `
                INSERT INTO pedidos_online (
                    cliente_id,
                    total,
                    forma_pagamento,
                    endereco_entrega,
                    dados_transacao,
                    status
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    'aguardando_aprovacao'
                )
                RETURNING id
                `,
                [
                    cliente_id,
                    total,
                    forma_pagamento,
                    enderecoFinal,
                    JSON.stringify(dados_transacao)
                ]
            );

            const pedidoId = pedidoResult.rows[0].id;

            for (const item of itens) {

                await client.query(
                    `
                    INSERT INTO itens_pedido_online (
                        pedido_id,
                        perfume_id,
                        quantidade,
                        preco_unitario
                    )
                    VALUES ($1,$2,$3,$4)
                    `,
                    [
                        pedidoId,
                        item.perfume_id,
                        item.quantidade,
                        item.preco_unitario
                    ]
                );
            }

            await client.query('COMMIT');

            return pedidoId;

        } catch (error) {

            await client.query('ROLLBACK');
            throw error;

        } finally {

            client.release();
        }
    }

    // Aprovar pedido
    static async aprovar(pedidoId, aprovadoPorId) {

        const client = await db.connect();

        try {

            await client.query('BEGIN');

            const pedidoResult = await client.query(
                `
                SELECT status
                FROM pedidos_online
                WHERE id = $1
                `,
                [pedidoId]
            );

            if (pedidoResult.rows.length === 0) {
                throw new Error('Pedido não encontrado');
            }

            const pedido = pedidoResult.rows[0];

            if (pedido.status !== 'aguardando_aprovacao') {
                throw new Error('Pedido já processado');
            }

            const itensResult = await client.query(
                `
                SELECT
                    perfume_id,
                    quantidade
                FROM itens_pedido_online
                WHERE pedido_id = $1
                `,
                [pedidoId]
            );

            const itens = itensResult.rows;

            for (const item of itens) {

                const updateResult = await client.query(
                    `
                    UPDATE perfumes
                    SET quantidade = quantidade - $1
                    WHERE id = $2
                    AND quantidade >= $3
                    `,
                    [
                        item.quantidade,
                        item.perfume_id,
                        item.quantidade
                    ]
                );

                if (updateResult.rowCount === 0) {
                    throw new Error(
                        `Estoque insuficiente para o perfume ID ${item.perfume_id}`
                    );
                }
            }

            await client.query(
                `
                UPDATE pedidos_online
                SET
                    status = 'aprovado',
                    aprovado_por_id = $1
                WHERE id = $2
                `,
                [
                    aprovadoPorId,
                    pedidoId
                ]
            );

            await client.query('COMMIT');

            return true;

        } catch (error) {

            await client.query('ROLLBACK');
            throw error;

        } finally {

            client.release();
        }
    }
}

module.exports = PedidoOnlineModel;
