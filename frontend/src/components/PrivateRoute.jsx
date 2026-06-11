import { Navigate } from 'react-router-dom';
import { usuarioAutenticado } from '../contexts/AuthContext';
import { Spinner } from 'react-bootstrap';

export default function PrivateRoute({ children }) {
	const { usuario, loading } = usuarioAutenticado();
	if(loading) return <div className="text-center mt-5"><Spinner /></div>;
	return usuario ? children : <Navigate to="/login" replace />; 
}