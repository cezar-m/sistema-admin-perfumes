import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

export default function Register() {
	const [nome, setNome] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [cargo, setCargo] = useState('funcionario'); // padrão funcionario
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		if(password !== confirmPassword) return setError('Senhas não conferem');
		if(password.length < 6) return setError('Senha deve ter no mínimo 6 caracteres');
		setLoading(true);
		try {
			await api.post('autenticacao/registro', { nome, email, password, cargo });
			toast.success('Usuário cadastrado com sucesso!');
			setTimeout(() => navigate('/login'), 1500);
		} catch (error) {
			setError(error.response?.data?.error || 'Erro ao cadastrar');
		} finally {
			setLoading(false);
		}
	};
	
	return (
		<div className="bg-light min-vh-100 d-flex align-items-center">
			<Container>
				<div className="row justify-content-center">
					<div className="col-md-5">
						<Card className="shadow">
							<Card.Body className="p-5">
								<h2 className="text-center fw-bold">Criar Conta</h2>
								{error && <Alert variant="danger">{error}</Alert>}
								<Form onSubmit={handleSubmit}>
									<Form.Group className="mb-3">
										<Form.Label>Nome</Form.Label>
										<Form.Control
											value={nome}
											onChange={e => setNome(e.target.value)}
											required
										/>
									</Form.Group>
									<Form.Group className="mb-3">
										<Form.Label>Email</Form.Label>
										<Form.Control
											type="email"
											value={email}
											onChange={e => setEmail(e.target.value)}
											required
										/>
									</Form.Group>
									<Form.Group className="mb-3">
										<Form.Label>Senha</Form.Label>
										<Form.Control
											type="password"
											value={password}
											onChange={e => setPassword(e.target.value)}
											required
										/>
									</Form.Group>
									<Form.Group className="mb-3">
										<Form.Label>Confirmar Senha</Form.Label>
										<Form.Control
											type="password"
											value={confirmPassword}
											onChange={e => setConfirmPassword(e.target.value)}
											required
										/>
									</Form.Group>
									<Form.Group className="mb-3">
										<Form.Label>Perfil</Form.Label>
										<Form.Select
											value={cargo}
											onChange={e => setCargo(e.target.value)}
										>
											<option value="funcionario">Funcionário</option>
											<option value="admin">Admistrador</option>
										</Form.Select>
									</Form.Group>
									<Button
										type="submit"
										className="w-100"
										disabled={loading}
									>
										{loading ? <Spinner size="sm" /> : 'Cadastrar'}
									</Button>
								</Form>
								<div className="text-center mt-3">
									<Link to="/login">Já tenho conta</Link>
								</div>
							</Card.Body>
						</Card>
					</div>
				</div>
			</Container>
		</div>											
	);
}