import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Form, Button, Card, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';

export default function ForgotPassword() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	
	// Leitura escrachada: força pegar o email da URL assim que a página monta
	useEffect(() => {
		const emailParam = searchParams.get('email');
		console.log('Email na URL:', emailParam); // veja no console do navegador
		if(emailParam) {
			setEmail(decodeURIComponent(emailParam));
		}
	}, [searchParams]);
	
	const handleSubmit = async (e) => {
		e.preventDefault();
		if(!email) return setError('Digite seu email');
		setLoading(true);
		try {
			const response = await api.post('/autenticacao/esqueci-senha-admin', { email });
			const { token, email: emailRetornado } = response.data;
			// Monta a URL de reset com os parâmetros
			navigate(`/reset-password?token=${token}&email=${encodeURIComponent(emailRetornado)}`);
		} catch (error) {
			setError(error.response?.data?.error || 'Email não encontrado');
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
								<h2 className="text-center fw-bold">Esqueci minha senha</h2>
								<p className="text-center text-muted">Digite seu email cadastrado</p>
								{error && <Alert variant="danger">{error}</Alert>}
								<Form onSubmit={handleSubmit}>
									<Form.Group className="mb-3">
										<Form.Label>Email</Form.Label>
										<Form.Control
											type="email"
											placeholder="Digite seu email cadastrado"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											required
											autoFocus
										/>
									</Form.Group>
									<Button type="submit" className="w-100" disabled={loading}>
										{loading ? <Spinner size="sm" /> : 'Enviar link'}
									</Button>
								</Form>
								<div className="text-center mt-3">
									<Link to="/login">Voltar ao login</Link>
								</div>
							</Card.Body>
						</Card>
					</div>
				</div>
			</Container>
		</div>
	);
} 