import axios from 'axios';

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem('token');

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {

		// Só desloga se já existir token
		if (
			error.response?.status === 401 &&
			localStorage.getItem('token')
		) {
			localStorage.clear();
			window.location.href = '/';
		}

		return Promise.reject(error);
	}
);

export default api;
