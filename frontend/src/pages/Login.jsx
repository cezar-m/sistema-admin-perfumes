import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import { usuarioAutenticado } from '../contexts/AuthContext';  
import { toast } from 'react-toastify';

export default function Login() {
	const [email, setEmail] = useState('');
	const [password, SetPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const { login, logout } = usuarioAutenticado();
	const navigate = useNavigate();
	
	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		try {
			 await login(email, password);  // tenta logar, mas pode não retornar o usuário

			// Recupera o usuário de onde o contexto normalmente armazena (localStorage)
			const usuarioSalvo = localStorage.getItem('usuario') || localStorage.getItem('user');
			let usuario = null;
			if (usuarioSalvo) {
				try {
					usuario = JSON.parse(usuarioSalvo);
				} catch(e) { console.error(e); }
			}

			// Se ainda não achou, tenta pegar do contexto (se exposto)
			// Caso seu contexto tenha um estado user, você pode acessá-lo via useContext
			// Exemplo: const { user } = usuarioAutenticado(); e depois user.cargo

			if (usuario && usuario.cargo === 'cliente') {
				// Desfaz tudo
				localStorage.removeItem('token');
				localStorage.removeItem('usuario');
				localStorage.removeItem('user');
				if (logout) await logout();
				setError('Acesso permitido apenas para funcionários e administradores.');
				setTimeout(() => setError(''), 1000);
				setLoading(false);
				return;
			}

			toast.success('Login realizado!');
			navigate('/dashboard');
		} catch (error) {
			setError(error.response?.data?.error || 'Email ou senha inválidos');
		} finally {
			setLoading(false);
		}
	};
	
	return(
		<div className="bg-light min-vh-100 d-flex align-items-center">
			<Container>
				<div className="row justify-content-center">
					<div className="col-md-5">
						<Card className="shadow">
							<Card.Body className="p-5">
								<div className="text-center mb-4">
									<h2 className="fw-bold">Perfume Admin</h2>
									<p className="text-muted">Sistema de Gerenciamento</p>
								</div>
								{error && <Alert variant="danger">{error}</Alert>}
								<Form onSubmit={handleSubmit}>
									<Form.Group className="mb-3">
										<Form.Label>Email</Form.Label>
										<Form.Control
											type="email"
											placeholder="Digite seu email"
											value={email}
											onChange={e => setEmail(e.target.value)}
											required
										/>
									</Form.Group>
									<Form.Group className="mb-3">
										<Form.Label>Senha</Form.Label>
										<Form.Control
											type="password"
											placeholder="Digite sua senha"
											value={password}
											onChange={e => SetPassword(e.target.value)}
											required
										/>
									</Form.Group>
									<Button type="submit" variant="primary" className="w-100" disabled={loading}>
										{loading ? <Spinner size="sm" /> : 'Entrar'}
									</Button>
								</Form>
								<div className="text-center mt-3">
									<Link to={email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password'}
										className="text-decoration-none small"
									>
										Esqueci minha senha
									</Link>
								</div>
								<hr className="my-4" />
								<div className="text-center">
									<span className="text-muted">Não tem uma conta? </span>
									<Link to="/register" className="text-decoration-none">Criar nova conta</Link>										
								</div>
							</Card.Body>
						</Card>
					</div>
				</div>
			</Container>
		</div>
	);
}