import { useState, useEffect } from 'react';
import { Card, Form, Button, Table, Spinner, Alert, Row, Col, Badge, Modal, Pagination } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';
import { usuarioAutenticado } from '../contexts/AuthContext';

export default function Vendas() {
	const { usuario } = usuarioAutenticado();
	const [perfumes, setPerfumes] = useState([]);
	const [selectedPerfume, setSelectedPerfume] = useState(null);
	const [quantidade, setQuantidade] = useState(1);
	const [clienteNome, setClienteNome] = useState('');
	const [clienteTelefone, setClienteTelefone] = useState('');
	const [formaPagamento, setFormaPagamento] = useState('pix');
	const [numeroParcelas, setNumeroParcelas] = useState(1)
	const [loading, setLoading] = useState(false);
	const [vendas, setVendas] = useState([]);
	const [loadingVendas, setLoadingVendas] = useState(false);
	
	// Paginação
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 5;
	
	// Modal parcelas
	const [showModalParcelas, setShowModalParcelas] = useState(false);
	const [parcelas, setParcelas] = useState([]);
	const [vendaId, setVendaId] = useState(null);

	// Modal status da venda
	const [showModalStatus, setShowModalStatus] = useState(false);
	const [vendaStatusSelecionada, setVendaStatusSelecionada] = useState(null);
	const [novoStatusVenda, setNovoStatusVenda] = useState('pendente');
	
	useEffect(() => {
		loadPerfumes();
		loadVendas();
	}, []);
	
	const loadPerfumes = async () => {
		try {
			const response = await api.get('/perfumes');
			setPerfumes(response.data.filter(p => p && p.quantidade > 0));
		} catch (error) {
			toast.error(error.response?.data?.error || 'Erro ao registrar venda');
		}
	};
	
	const loadVendas = async () => {
		setLoadingVendas(true);
		try {
			const response = await api.get('/vendas');
			 console.log('🔍 Estrutura da primeira venda:', response.data[0]); // vê o primeiro objeto
        console.log('📦 Keys disponíveis:', Object.keys(response.data[0] || {}));
			const vendasValidas = (response.data || []).filter(v =>
				v && v.id && v.perfume_nome && v.total != null && !isNaN(v.total) && v.data_venda
			);
			setVendas(vendasValidas);
		} catch (error) {
			toast.error('Erro ao carregar vendas');
		} finally {
			setLoadingVendas(false);
		}
	};
	
	const handleSubmit = async (e) => {
		e.preventDefault();
		if(!selectedPerfume) return toast.error('Selecione um perfume');
		if(quantidade > selectedPerfume.quantidade) return toast.error('Estoque insuficiente');
		setLoading(true);
		try {
			await api.post('/vendas', {
				perfume_id: selectedPerfume.id,
				quantidade,
				cliente_nome: clienteNome,
				cliente_telefone: clienteTelefone,
				forma_pagamento: formaPagamento,
				quantidade_parcelas: numeroParcelas
			});
			toast.success(`Venda registrada! Total: R$ ${(selectedPerfume.preco * quantidade).toFixed(2)}`);
			setSelectedPerfume(null);
			setQuantidade(1);
			setClienteNome('');
			setClienteTelefone('');
			loadPerfumes();
			loadVendas();
		} catch(error) {
			toast.error(error.response?.data?.error || 'Erro ao registrar venda');
		} finally {
			setLoading(false);
		}		
	};
	
	const formatarData = (dataString) => {
		try {
			if(!dataString)return 'Data inválida';
			const data = new Date(dataString);
			return isNaN(data.getTime()) ? 'Data inválida' : data.toLocaleDateString();
		} catch {
			return 'Data inválida';
		}
	};
	
	const formatarPagamento = (pagamento) => {
		if(!pagamento) return '-';
		const map = {
			pix: 'PIX',
			dinheiro: 'Dinheiro',
			cartao_credito: 'Cartão de Crédito',
			cartao_debito: 'Cartão Débito',
			boleto: 'Boleto'
		};
		return map[pagamento] || pagamento;
	};
	
	const renderStatusBadge = (status) => {
		switch (status) {
			case 'pendente': return <Badge bg="warning">Pendente</Badge>
			case 'pago': return <Badge bg="success">Pago</Badge>;
			case 'cancelado': return <Badge bg="danger">Cancelado</Badge>
			default: return <Badge bg="secondary">{status}</Badge>;
		}
	};
	
	// Modal parcelas
	const abrirModalParcelas = async (id) => {
		setVendaId(id);
		try {
			const response = await api.get(`/vendas/${id}/parcelas`);
			setParcelas(response.data);
			setShowModalParcelas(true);
		} catch (error) {
			toast.error('Erro ao carregar parcelas');
		}
	};
	
	const marcarParcelaPaga = async (parcelasId) => {
		try {
			await api.patch(`/vendas/parcelas/${parcelasId}/status`, { status: 'pago' });
			toast.success('Parcela marcada como paga');
			if(vendaId) {
				const response = await api.get(`/vendas/${vendaId}/parcelas`);
				setParcelas(response.data);
			}
		} catch(error) {
			toast.error('Erro ao atualizar parcela');
		}
	};

	// Modal status da venda
	const abrirModalStatusVenda = (venda) => {
		setVendaStatusSelecionada(venda);
		setNovoStatusVenda(venda.status_pagamento);
		setShowModalStatus(true);
	};
	
	const salvarStatusVenda = async () => {
		try {
			await api.patch(`/vendas/${vendaStatusSelecionada.id}/status`, { status_pagamento: novoStatusVenda });
			toast.success('Status da venda atualizado!');
			setShowModalStatus(false);
			loadVendas(); // recarrega a lista
		} catch (error) {
			toast.error(error.response?.data?.error || 'Erro ao atualizar status');
		}
	};
	
	// Paginação lógica
	const totalPages = Math.ceil(vendas.length / itemsPerPage);
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
	const vendasPaginadas = vendas.slice(indexOfFirstItem, indexOfLastItem);
	
	return (
		<div className="container mt-4">
			<h2 className="mb-4">Nova Venda</h2>
			<Row>
				<Col>
					<Card className="mb-4">
						<Card.Body>
							<Form onSubmit={handleSubmit}>
								<Form.Group className="mb-3">
									<Form.Label>Perfume</Form.Label>
									<Form.Select
										onChange={e=> setSelectedPerfume(perfumes.find(p => p.id === parseInt(e.target.value)))}
										required
										value={selectedPerfume?.id || ''}
									>
										<option value="">Selecione...</option>
										{perfumes.map(p => (
											<option key={p.id} value={p.id}>
												{p.nome} - Estoque: {p.quantidade} - R$ {p.preco}
											</option>
										))}
									</Form.Select>
								</Form.Group>
									
								{selectedPerfume && (
									<>
										<Alert variant="info">
											Preço: R$ {selectedPerfume.preco} | Estoque: {selectedPerfume.quantidade}
										</Alert>
										<Form.Group className="mb-3">
											<Form.Label>Quantidade</Form.Label>
											<Form.Control
												type="number"
												min="1"
												max={selectedPerfume.quantidade}
												value={quantidade}
												onChange={e =>setQuantidade(parseInt(e.target.value))}
												required
											/>
										</Form.Group>
										<Alert variant="success">
											Total: R$ {(selectedPerfume.preco * quantidade).toFixed(2)}
										</Alert>
									</>
								)}
								
								<Form.Group className="mb-3">
									<Form.Label>Cliente (opcional)</Form.Label>
									<Form.Control
										placeholder="Nome do cliente"
										value={clienteNome}
										onChange={e => setClienteNome(e.target.value)}
									/>
								</Form.Group>
								
								<Form.Group className="mb-3">
									<Form.Label>Telefone (opcional)</Form.Label>
									<Form.Control
										placeholder="Telefone"
										value={clienteTelefone}
										onChange={e => setClienteTelefone(e.target.value)}
									/>
								</Form.Group>
								
								<Form.Group className="mb-3">
									<Form.Label>Forma de Pagamento</Form.Label>
									<Form.Select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
										<option value="pix">PIX</option>
										<option value="dinheiro">Dinheiro</option>
										<option value="cartao_credito">Cartão de Crédito</option>
										<option value="cartao_debito">Cartão Débito</option>
										<option value="boleto">Boleto</option>
									</Form.Select>
								</Form.Group>
								
								<Form.Group className="mb-3">
									<Form.Label>Parcelamento</Form.Label>
									<Form.Select value={numeroParcelas} onChange={e => setNumeroParcelas(parseInt(e.target.value))}>
										<option value={1}>À vista</option>
										<option value={2}>2x sem juros</option>
										<option value={3}>3x sem juros</option>
										<option value={4}>4x sem juros</option>
										<option value={5}>5x sem juros</option>
										<option value={6}>6x sem juros</option>
									</Form.Select>
								</Form.Group>

								<Button type="submit" variant="success" disabled={loading || !selectedPerfume}>
									{loading ? 'Processando...' : 'Finalizar venda'}
								</Button>
							</Form>
						</Card.Body>
					</Card>
				</Col>
			</Row>
				
			<Row className="mb-5">
				<Col>
					<Card>
						<Card.Header>
							{usuario?.cargo === 'admin' ? 'Todas as Vendas' : 'Suas Vendas'}
						</Card.Header>
						<Card.Body>
							{loadingVendas ? (
								<div className="text-center">
									<Spinner animation="border" size="sm" /> Carregando...
								</div>
							) :  vendas.length ===0 ? ( 
								 <p className="text-muted text-center mb-0">Nenhuma venda registrada ainda.</p>
							) : (
								<div className="table-responsive">
									<Table striped size="sm" hover>
										<thead>
											<tr>
												<th>Perfume</th>
												<th>Quantidade</th>
												<th>Total</th>
												<th>Pagamento</th>
												<th>Status</th>
												<th>Parcelas</th>
												<th>Data</th>
												{usuario?.cargo === 'admin' && <th>Vendedor</th>}
												<th>Ações</th>
											</tr>
										</thead>
										<tbody>
											{vendasPaginadas.map(v => (
												<tr key={v.id}>
													<td>{v.perfume_nome || 'Perfume removido'}</td>
													<td>{v.quantidade}</td>
													<td>R$ {parseFloat(v.total).toFixed(2)}</td>
													<td>{formatarPagamento(v.forma_pagamento)}</td>
													<td>{renderStatusBadge(v.status_pagamento)}</td>
													<td>{v.quantidade_parcelas > 1 ? `${v.quantidade_parcelas}x` : 'À vista'}</td>
													<td>{formatarData(v.data_venda)}</td>
													{usuario?.cargo === 'admin'  && <td>{v.vendedor_nome || `Usuário #${v.vendedor_id}`}</td>}
													<td>
														<Button size="sm" variant="outline-secondary" className="me-1" onClick={() => abrirModalStatusVenda(v)}>
															Status
														</Button>
														<Button size="sm" variant="info" onClick={() => abrirModalParcelas(v.id)}>
															Parcelas
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</Table>
								</div>
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
						</Card.Body>
					</Card>
				</Col>
			</Row>
			
			{/* Modal para alterar os status da venda */}
			<Modal show={showModalStatus} onHide={() => setShowModalStatus(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Alterar Status da Venda #{vendaStatusSelecionada?.id}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Form.Group>
						<Form.Label>Selecione o novo status:</Form.Label>
						<Form.Select value={novoStatusVenda} onChange={e => setNovoStatusVenda(e.target.value)}>
							<option value="pendente">Pendente</option>
							<option value="pago">Pago</option>
							<option value="cancelado">Cancelado</option>
						</Form.Select>
					</Form.Group>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowModalStatus(false)}>Cancelar</Button>
					<Button variant="primary" onClick={salvarStatusVenda}>Salvar</Button>
				</Modal.Footer>
			</Modal>
			
			{/* Modal para listar parcelas */}
			<Modal show={showModalParcelas} onHide={() => setShowModalParcelas(false)} size="lg">
				<Modal.Header closeButton>
					<Modal.Title>Parcelas da Venda #{vendaId}</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					{parcelas.length === 0 ? (
						<p className="text-muted">Nenhuma parcela encontrada.</p>
						) : (
							<Table striped bordered size="sm">
								<thead>
									<tr>
										<th>Parcelas</th>
										<th>Valor</th>
										<th>Vencimento</th>
										<th>Status</th>
										<th>Ações</th>
									</tr>
								</thead>
								<tbody>
									{parcelas.map(p => (
										<tr key={p.id}>
											<td>{p.numero_parcela}º</td>
											<td>R$ {parseFloat(p.valor).toFixed(2)}</td> 
											<td>{new Date(p.data_vencimento).toLocaleDateString()}</td>
											<td>{p.status === 'pendente' ? <Badge bg="warning">Pendente</Badge> : <Badge bg="success">Pago</Badge>}</td>
											<td>
												{p.status === 'pendente' && (
													<Button size="sm" variant="success" onClick={() => marcarParcelaPaga(p.id)}>
														Marcar Paga
													</Button>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</Table>
					)}
				</Modal.Body>
				<Modal.Footer>
					<Button variant="secondary" onClick={() => setShowModalParcelas(false)}>Fechar</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
}
