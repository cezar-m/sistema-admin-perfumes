import React, { useState, useEffect } from 'react';
import { Pagination } from 'react-bootstrap';
import api from '../services/api';

export default function PedidosOnline() {
	const [pedidos, setPedidos] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	
	// Paginação
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	
	const carregarPedidos = async () => {
		try {
			setLoading(true);
			// Rota agora é / pedidos (sem / admin)
			const { data } = await api.get('/pedidos');
			setPedidos(data);
			setError('');
		} catch (error) {
			console.error(error);
			setError('Erro ao carregar pedidos');
		} finally {
			setLoading(false);
		}
	};
	
	useEffect(() => {
		carregarPedidos();
	}, []);
	
	const aprovarPedido = async (pedidoId) => {
		if(!window.confirm('Aprovar este pedido? O estoque será reduzido permanentemente.')) return;
		try {
			// Rota de aprovação agora é  /pedidos/:id/aprovar
			await api.put(`/pedidos/${pedidoId}/aprovar`);
			alert('Pedido aprovado com sucesso!!!');
			carregarPedidos();
		} catch (error) {
			alert(error.response?.data?.erro || 'Erro ao aprovar pedido');
		}
	};
	
	if(loading) return <div className="text-center mt-5">Carregando...</div>;
	if(error) return <div className="alert alert-danger">{error}</div>;
	
	if(pedidos.length === 0) {
		return (
			<div className="container mt-4">
				<h2 className="mb-4">Pedidos Online</h2>
				<div className="alert alert-info">Nenhum pedido encontrado</div>
			</div>
		);
	}
	
	const pendentes = pedidos.filter(p => p.status === 'aguardando_aprovacao');
	const processados = pedidos.filter(p => p.status !== 'aguardando_aprovacao');
	
	// Paginação lógica
	const totalPages = Math.ceil(processados.length / itemsPerPage);
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
	const processadosPaginados  = processados.slice(indexOfFirstItem, indexOfLastItem);
	
	return(
		<div className="container mt-4">
			<h2 className="mb-4">Pedidos Online - Aguardando Aprovação</h2>
			
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
			{/* Paginação */}
			{totalPages > 1 && (
				<div className="d-flex justify-content-center mt-3">
					<Pagination>
						<Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
						<Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
						{[...Array(totalPages)].map((_, index) => (
							<Pagination.Item
								key={index + 1}
								active={index + 1 === currentPage}
								onClick={() => setCurrentPage(index + 1)}
							>
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