import React, { useState, useEffect, useRef } from 'react';
import { Pagination, Button } from 'react-bootstrap';
import api from '../services/api';

export default function PedidosOnline() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const intervalRef = useRef(null);

  const carregarPedidos = async (force = false) => {
    try {
      setLoading(true);
      // Adiciona timestamp para quebrar cache do navegador
      const timestamp = Date.now();
      const url = force ? `/api/pedidos?_=${timestamp}` : `/api/pedidos`;
      const { data } = await api.get(url);
      setPedidos(data);
      setError('');
      console.log('Pedidos carregados:', data.length);
    } catch (error) {
      console.error(error);
      setError('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  // Recarga manual (botão)
  const refresh = () => carregarPedidos(true);

  useEffect(() => {
    // Carrega ao montar
    carregarPedidos(true);

    // Polling a cada 15 segundos (mais rápido)
    intervalRef.current = setInterval(() => {
      console.log('Polling pedidos...');
      carregarPedidos(true); // sempre com cache-bust
    }, 15000);

    // Recarrega quando a aba ganha foco
    const handleFocus = () => {
      console.log('Aba focada, recarregando...');
      carregarPedidos(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const aprovarPedido = async (pedidoId) => {
    if (!window.confirm('Aprovar este pedido? O estoque será reduzido permanentemente.')) return;
    try {
      await api.put(`/api/pedidos/${pedidoId}/aprovar`);
      alert('Pedido aprovado com sucesso!');
      carregarPedidos(true);
    } catch (error) {
      alert(error.response?.data?.erro || 'Erro ao aprovar pedido');
    }
  };

  if (loading && pedidos.length === 0) return <div className="text-center mt-5">Carregando...</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const pendentes = pedidos.filter(p => p.status === 'aguardando_aprovacao');
  const processados = pedidos.filter(p => p.status !== 'aguardando_aprovacao');
  const totalPages = Math.ceil(processados.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const processadosPaginados = processados.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Pedidos Online - Aguardando Aprovação</h2>
        <Button variant="outline-primary" onClick={refresh} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar Agora'}
        </Button>
      </div>

      {pendentes.length === 0 && <p>Nenhum pedido pendente.</p>}

      {pendentes.map(pedido => (
        <div key={pedido.id} className="card mb-3 shadow-sm">
          <div className="card-header bg-warning text-dark">
            Pedido #{pedido.id} - {new Date(pedido.data_pedido).toLocaleString()}
          </div>
          <div className="card-body">
            <h5 className="card-title">
              {pedido.cliente_nome} ({pedido.email})
            </h5>
            <p><strong>Total:</strong> R$ {parseFloat(pedido.total).toFixed(2)}</p>
            <p><strong>Forma de pagamento:</strong> {pedido.forma_pagamento}</p>
            <hr />
            <h6>Itens do pedido:</h6>
            <ul className="list-group mb-3">
              {pedido.itens?.map((item, index) => (
                <li key={index} className="list-group-item">
                  {item.perfume_nome} - {item.quantidade} x R$ {parseFloat(item.preco_unitario).toFixed(2)}
                </li>
              ))}
            </ul>
            <button className="btn btn-success" onClick={() => aprovarPedido(pedido.id)}>
              Aprovar Venda & Baixar Estoque
            </button>
          </div>
        </div>
      ))}

      {processados.length > 0 && (
        <>
          <hr className="my-5" />
          <h3 className="mb-3">Pedidos já processados</h3>
          {processadosPaginados.map(pedido => (
            <div key={pedido.id} className="card mb-2 bg-light">
              <div className="card-body">
                <strong>#{pedido.id}</strong> - {pedido.cliente_nome} - R$ {pedido.total} =
                <span className="badge bg-secondary ms-2">{pedido.status}</span>
                {pedido.aprovador_nome && (
                  <span className="ms-2 text-muted">
                    Aprovado por: {pedido.aprovador_nome}&nbsp;
                    {new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <Pagination>
            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
            <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
            {[...Array(totalPages)].map((_, index) => (
              <Pagination.Item key={index + 1} active={index + 1 === currentPage} onClick={() => setCurrentPage(index + 1)}>
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
            <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
          </Pagination>
        </div>
      )}
    </div>
  );
}
