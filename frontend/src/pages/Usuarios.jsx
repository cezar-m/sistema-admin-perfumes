import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Spinner, Badge, Pagination } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';

export default function Usuario() {
	const [usuarios, setUsuarios] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingUsuario, setEditingUsuario] = useState(null);
	const [formData, setFormData] = useState({ nome: '', email: '', cargo: 'funcionario', ativo: true, password: '' });
	const [submitting, setSubmitting] = useState(false);
	
	// Paginação
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	
	useEffect(() => { loadUsuarios(); }, []);
	
	const loadUsuarios = async () => {
		try {
			const res = await api.get('/usuarios');
			setUsuarios(res.data);
		} catch (error) { toast.error('Erro') } finally { setLoading(false); }
	};
	
	const handleSave = async () => {
		setSubmitting(true);
		try {
			if(editingUsuario) {
				await api.put(`/usuarios/${editingUsuario.id}`, formData);
				toast.success('Usuário atualizado com sucesso!!!');
			}
			setShowModal(false);
			loadUsuarios()
		} catch (error) { toast.error('Erro') } finally { setSubmitting(false); }
	};
	
	const handleDelete = async (id) => {
		if(window.confirm('Excluir usuário?')) {
			try {
				await api.delete(`/usuarios/${id}`);
				toast.success('Funcionário deletado com sucesso!!!');
				loadUsuarios();
			} catch(error) { toast.error('Error') }
		}
	};
	
	if(loading) return <Spinner />;
	
	// Paginação lógica
	const totalPages = Math.ceil(usuarios.length / itemsPerPage);
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
	const usuariosPaginadas = usuarios.slice(indexOfFirstItem, indexOfLastItem);
	
	return(
		<div className="container mt-4">
			<h2>Usuários do Sistema</h2>
			<Table striped bordered>
				<thead><tr><th>Nome</th><th>Email</th><th>Cargo</th><th>Status</th><th>Ações</th></tr></thead>
				<tbody>
					{usuariosPaginadas.map(u => (
						<tr key={u.id}>
							<td>{u.nome}</td>
							<td>{u.email}</td>
							<td><Badge bg={u.cargo === 'admin' ? 'danger' : 'secondary'}>{u.cargo}</Badge></td>
							<td><Badge bg={u.ativo ? 'success' : 'dark'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
							<td>
								<Button size="sm" variant="warning" onClick={() => { setEditingUsuario(u); setFormData({ nome: u.nome, email: u.email, cargo: u.cargo, ativo: u.ativo , password: '' }); setShowModal(true); }}>Editar</Button>{' '}
								<Button size="sm" variant="danger" onClick={() => handleDelete(u.id)}>Excluir</Button>
							</td>	
						</tr>
					))}
				</tbody>
			</Table>
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
			<Modal show={showModal} onHide={() => setShowModal(false)}>
				<Modal.Header closeButton><Modal.Title>Editar Usuários</Modal.Title></Modal.Header>
				<Modal.Body>
					<Form>
						<Form.Group><Form.Label>Nome</Form.Label><Form.Control type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value })} /></Form.Group>
						<Form.Group><Form.Label>Email</Form.Label><Form.Control type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></Form.Group>
						<Form.Group><Form.Label>Cargo</Form.Label><Form.Select value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})}><option value="funcionario">Funcionário</option><option value="admin">Admin</option></Form.Select></Form.Group>
						<Form.Group><Form.Label>Ativo</Form.Label><Form.Check type="checkbox" checked={formData.ativo} onChange={e => setFormData({...formData, ativo: e.target.checked})} /></Form.Group>
						<Form.Group><Form.Label>Nova senha (opcional)</Form.Label><Form.Control type="password" placeholder="Deixe em branco para manter" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value })} /></Form.Group>
					</Form>
				</Modal.Body>
				<Modal.Footer><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button variant="primary" onClick={handleSave} disabled={submitting}>Salvar</Button></Modal.Footer>
			</Modal>
		</div>			
	);
}