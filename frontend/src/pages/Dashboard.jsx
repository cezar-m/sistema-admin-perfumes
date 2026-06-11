import { usuarioAutenticado } from '../contexts/AuthContext'; 
import { Card, Row, Col } from 'react-bootstrap';

export default function Dashboard() {
	const { usuario } = usuarioAutenticado();
	return (
		<div className="container mt-4">
			<h2>Dashboard</h2>
			<p>Bem-vindo, {usuario?.nome} ({usuario?.cargo})</p>
			<Row>
				<Col md={4}>
					<Card className="text-center shadow">
						<Card.Body>
							<h5>Perfumes</h5>
							<p>Gerencie seus perfumes</p>
						</Card.Body>
					</Card>
				</Col>
				<Col md={4}>
					<Card className="text-center shadow">
						<Card.Body>
							<h5>Vendas</h5>
							<p>Registre e consulte suas vendas</p>
						</Card.Body>
					</Card>
				</Col>
				{usuario?.cargo === 'admin' && (
					<Col md={4}>
						<Card className="text-center shadow">
							<Card.Body>
								<h5>Usuários</h5>
								<p>Gerencie os funcionários</p>
							</Card.Body>
						</Card>
					</Col>
				)}
			</Row>
		</div>
	)
}