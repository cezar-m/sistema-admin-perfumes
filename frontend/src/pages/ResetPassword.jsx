import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

export default function ResetPassword() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [token, setToken] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	
	useEffect(() => {
		const tokenParam = searchParams.get('token');
		const emailParam = searchParams.get('email');
		if(tokenParam && emailParam) {
			setToken(tokenParam);
			setEmail(decodeURIComponent(emailParam));
		} else {
			toast.error('Link inválido');
			navigate('/forgot-password');
		}
	}, [searchParams, navigate]);
	
	const handleSubmit = async (e) => {
		e.preventDefault();
		if(password !== confirmPassword) {
			setError('As senhas não coincidem');
			return;
		}
		if(password.length < 6) {
			setError('A senha deve ter no mínimo 6 caracteres');
			return;
		}
		setLoading(true);
		setError('');
		try {
			await api.post('/autenticacao/resetar-senha-admin', { token, email, password });
			toast.success('Senha definida com sucesso!');
			setTimeout(() => navigate('/login'), 1500);
		} catch (error) {
			setError(error.response?.data?.error || 'Erro ao redefinir senha');
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
								<div className="text-center mb-4">
									<h2 className="fw-bold">Redefinir Senha</h2>
									<p className="text-muted">
										Criar nova senha para <strong>{email}</strong>
									</p>
								</div>
								{error && <Alert variant="danger">{error}</Alert>}
								<Form onSubmit={handleSubmit}>
									<Form.Group className="mb-3">
										<Form.Label>Nova Senha</Form.Label>
										<Form.Control
											type="password"
											placeholder="Digite sua nova senha (mínimo 6 caracteres)"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											required
										/>
									</Form.Group>
									<Form.Group className="mb-3">
										<Form.Label>Confirmar Nova Senha</Form.Label>
										<Form.Control
											type="password"
											placeholder="Confirme sua nova senha"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											required
										/>
									</Form.Group>
									<Button 
										type="submit"
										variant="primary"
										className="w-100"
										disabled={loading}
									>
										{loading ? <Spinner size="sm" /> : 'Redefinir Senha'}
									</Button>
								</Form>
								<div className="text-center mt-3">
									<Link to="/login">Voltar para o login</Link>
								</div>
							</Card.Body>
						</Card>
					</div>
				</div>
			</Container>
		</div>						
	);
}