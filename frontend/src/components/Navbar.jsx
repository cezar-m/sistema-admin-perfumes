import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { usuarioAutenticado } from  '../contexts/AuthContext';

export default function AppNavbar() {
	const { usuario, logout } = usuarioAutenticado();
	const navigate = useNavigate();
	
	const handleLogout = () => {
		logout();
		navigate('/login');
	};
	
	return (
		<Navbar bg="dark" variant="dark" expand="lg">
			<Container>
				<Navbar.Brand as={Link} to="/dashboard">Perfume Admin</Navbar.Brand>
				<Navbar.Toggle aria-controls="basic-navbar-nav" />
				<Navbar.Collapse id="basic-navbar-nav">
					<Nav className="me-auto">
						<Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
						<Nav.Link as={Link} to="/perfumes">Perfumes</Nav.Link>
						<Nav.Link as={Link} to="/vendas">Vendas</Nav.Link>
						<Nav.Link as={Link} to="/pedidos-online">Pedidos Online</Nav.Link>
							{usuario?.cargo === 'admin' && (
								<>
									<Nav.Link as={Link} to="/usuarios">Usuários</Nav.Link>
									{/* NOVO LINK PARA PEDIDOS ONLINE */}
								</>
							)}
					</Nav>
					<Nav>
						<span className="navbar-text text-white me-3">
							Olá, {usuario?.nome || usuario?.email}
						</span>
						<Button variant="outline-light" size="sm" onClick={handleLogout}>
							Sair
						</Button>
					</Nav>
				</Navbar.Collapse>
			</Container>
		</Navbar>
	);	
}