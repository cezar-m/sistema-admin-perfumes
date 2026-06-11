import { Container } from 'react-bootstrap';

export default function  Footer() {
	return (
		<footer className="bg-dark text-white mt-auto py-4">
			<Container>
				<div className="row">
					<div className="col-md-6 text-center text-md-start">
						<h5>@perfumes admin</h5>
					</div>
					<div className="col-md-6 text-center text-md-end">
						<small>Versão 1.0 | &copy; {new Date().getFullYear()}</small>
					</div>
				</div>
			</Container>
		</footer>
		
	);
}