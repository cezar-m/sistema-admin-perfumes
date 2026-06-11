import { Outlet } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import AppNavbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
	return(
		<div className="d-flex flex-column min-vh-100">
			<AppNavbar />
			<Container className="flex-grow-1 mt-4">
				<Outlet />
			</Container>
			<Footer />
		</div>
	);
}