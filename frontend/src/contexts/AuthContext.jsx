import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
	const [usuario, setUsuario] = useState(null);
	const [loading, setLoading] = useState(true);
	
	useEffect(() => {
		const token = localStorage.getItem('token');
		const usuarioData = localStorage.getItem('usuario');
		if(token && usuarioData) {
			setUsuario(JSON.parse(usuarioData));
		}
		setLoading(false);
	}, []);
	
	const login = async (email, password) => {
		try {
			console.log('Enviando requisição para /autenticacao/login');
			const response = await api.post('/autenticacao/login', {email, password });
			console.log('Resposta recebida:', response.data);
			const { token, usuario } = response.data;
			localStorage.setItem('token', token);
			localStorage.setItem('usuario', JSON.stringify(usuario));
			setUsuario(usuario);
		} catch (error) {
			console.error('Erro no login:', error.response?.data || error.message);
			throw error;
		}
	};
	
	const logout = () => {
		localStorage.clear();
		setUsuario(null);
	};
	
	return (
		<AuthContext.Provider value={{ usuario, login, logout, loading }}>
			{children}
		</AuthContext.Provider>
	);
}

export const usuarioAutenticado = () => useContext(AuthContext);