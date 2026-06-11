import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Perfumes from './pages/Perfumes';
import Vendas from './pages/Vendas';
import Usuarios from './pages/Usuarios';
import PedidosOnline from './pages/PedidosOnline';

function App() {
  return (
	  <AuthProvider>
			<BrowserRouter>
				<ToastContainer />
				<Routes>
					{/* Rotas públicas */}
					<Route path="/login" element={<Login />} />
					<Route path="/register" element={<Register />} />
					<Route path="/forgot-password" element={<ForgotPassword />} />
					<Route path="/reset-password" element={<ResetPassword />} />
					
					{/* Rotas protegidas com layout (navbar) */}
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                        <Route path="/dashboard" element={<Dashboard />} />
						<Route path="/perfumes" element={<Perfumes />} />
						<Route path="/vendas" element={<Vendas />} />
						<Route path="/usuarios" element={<Usuarios />} />
						<Route path="/pedidos-online" element={<PedidosOnline />} />
                    </Route>

				</Routes>
			</BrowserRouter>	 
	 </AuthProvider>
  )
}

export default App
