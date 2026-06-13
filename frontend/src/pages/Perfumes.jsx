import { useState, useEffect } from 'react';
import { Table, Button, Modal, Spinner, Alert, Form, Image, Pagination } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';
import { usuarioAutenticado } from '../contexts/AuthContext';

// 🔥 CORRIGIDO - Reconhece separador decimal americano e brasileiro
const parsePriceToNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  let str = String(value).trim();
  
  // Se já for número, retorna
  if (typeof value === 'number') return value;
  
  // Verifica se tem vírgula (formato BR) => último separador é decimal
  if (str.includes(',')) {
    // Remove pontos de milhar e troca vírgula por ponto
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes('.') && (str.indexOf('.') === str.lastIndexOf('.'))) {
    // Apenas um ponto: é decimal (ex: "45.00" ou "45.00")
    // Não faz nada, já está no formato americano
  } else if (str.includes('.') && str.split('.').length > 2) {
    // Múltiplos pontos: são separadores de milhar (ex: "4.500")
    str = str.replace(/\./g, '');
  }
  
  let num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

const formatPriceForDisplay = (value) => {
  let num = parsePriceToNumber(value);
  // Garante exibição brasileira: "45,00" e "4.500,00"
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function Perfumes() {
  const { usuario } = usuarioAutenticado();
  const [perfumes, setPerfumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    nome: '', descricao: '', preco: '', quantidade: '', familia: '', genero: '', imagem: null
  });
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => { loadPerfumes(); }, []);
  
  const loadPerfumes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/perfumes');
      setPerfumes(data.filter(p => p && p.nome));
    } catch (error) {
      toast.error('Erro ao carregar perfumes');
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    if (preview && !preview.includes('http')) URL.revokeObjectURL(preview);
    setFormData({ nome: '', descricao: '', preco: '', quantidade: '', familia: '', genero: '', imagem: null });
    setPreview('');
    setEditing(null);
  };
  
  const openModal = (perfume = null) => {
    if (perfume) {
      setEditing(perfume);
      setFormData({
        nome: perfume.nome || '',
        descricao: perfume.descricao || '',
        preco: formatPriceForDisplay(perfume.preco),
        quantidade: perfume.quantidade?.toString() || '',
        familia: perfume.familia || '',
        genero: perfume.genero || '',
        imagem: null
      });
      setPreview(perfume.imagem ? `https://sistema-admin-perfumes.onrender.com/uploads/${produto.imagem}` : '');
    } else {
      resetForm();
    }
    setShowModal(true);
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (preview && !preview.includes('http')) URL.revokeObjectURL(preview);
      setFormData({ ...formData, imagem: file });
      setPreview(URL.createObjectURL(file));
    }
  };
  
  const handleSave = async () => {
    if (!formData.nome.trim()) return toast.error('Nome obrigatório');
    if (!formData.quantidade || formData.quantidade < 0) return toast.error('Quantidade inválida');
    
    setSubmitting(true);
    const precoNumerico = parsePriceToNumber(formData.preco);
    const data = new FormData();
    data.append('nome', formData.nome);
    data.append('descricao', formData.descricao || '');
    data.append('preco', precoNumerico);
    data.append('quantidade', formData.quantidade);
    data.append('familia', formData.familia || '');
    data.append('genero', formData.genero || '');
    if (formData.imagem) data.append('imagem', formData.imagem);
    
    try {
      if (editing) {
        await api.put(`/perfumes/${editing.id}`, data);
        toast.success('Perfume atualizado!');
      } else {
        await api.post('/perfumes', data);
        toast.success('Perfume cadastrado!');
      }
      setShowModal(false);
      await loadPerfumes();  // Espera recarregar
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm('Excluir?')) return;
    try {
      await api.delete(`/perfumes/${id}`);
      toast.success('Excluído!');
      await loadPerfumes();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };
  
  // Filtros
  let perfumesFiltrados = perfumes.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  if (priceFilter === 'cheapest' && perfumesFiltrados.length) {
    const min = Math.min(...perfumesFiltrados.map(p => parsePriceToNumber(p.preco)));
    perfumesFiltrados = perfumesFiltrados.filter(p => parsePriceToNumber(p.preco) === min);
  } else if (priceFilter === 'mostExpensive' && perfumesFiltrados.length) {
    const max = Math.max(...perfumesFiltrados.map(p => parsePriceToNumber(p.preco)));
    perfumesFiltrados = perfumesFiltrados.filter(p => parsePriceToNumber(p.preco) === max);
  }
  
  const totalPages = Math.ceil(perfumesFiltrados.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const perfumesExibidos = perfumesFiltrados.slice(start, start + itemsPerPage);
  
  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Meus Perfumes</h2>
        <Button onClick={() => openModal()}>+ Novo Perfume</Button>
      </div>
      
      <div className="row mb-4 g-2">
        <div className="col-md-5">
          <Form.Control type="text" placeholder="Pesquisar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="col-md-7">
          <div className="d-flex gap-2">
            <Button variant={priceFilter === 'cheapest' ? 'success' : 'outline-secondary'} onClick={() => setPriceFilter(priceFilter === 'cheapest' ? null : 'cheapest')}>💰 Mais Barato</Button>
            <Button variant={priceFilter === 'mostExpensive' ? 'success' : 'outline-secondary'} onClick={() => setPriceFilter(priceFilter === 'mostExpensive' ? null : 'mostExpensive')}>💎 Mais Caro</Button>
            {priceFilter && <Button variant="link" onClick={() => setPriceFilter(null)}>Limpar</Button>}
          </div>
        </div>
      </div>
      
      {perfumesExibidos.length === 0 ? (
        <Alert variant="info">Nenhum perfume encontrado.</Alert>
      ) : (
        <>
          <Table striped bordered hover responsive>
            <thead>
              <tr><th>Imagem</th><th>Nome</th><th>Preço</th><th>Estoque</th><th>Família</th><th>Gênero</th>{usuario?.cargo === 'admin' && <th>Criado por</th>}<th>Ações</th></tr>
            </thead>
            <tbody>
              {perfumesExibidos.map(p => (
                <tr key={p.id}>
                  <td>{p.imagem ? <Image src={`http://localhost:5001/uploads/${p.imagem}`} width="50" rounded /> : '-'}</td>
                  <td>{p.nome}</td>
                  <td>R$ {formatPriceForDisplay(p.preco)}</td>
                  <td>{p.quantidade}</td>
                  <td>{p.familia || '-'}</td>
                  <td>{p.genero || '-'}</td>
                  {usuario?.cargo === 'admin' && <td>{p.criado_por || p.usuario_id}</td>}
                  <td>
                    <Button size="sm" variant="warning" className="me-1" onClick={() => openModal(p)}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Excluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <Pagination>
                <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                <Pagination.Prev onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage === 1} />
                {[...Array(totalPages)].map((_, i) => (
                  <Pagination.Item key={i+1} active={i+1 === currentPage} onClick={() => setCurrentPage(i+1)}>{i+1}</Pagination.Item>
                ))}
                <Pagination.Next onClick={() => setCurrentPage(p => Math.min(p+1, totalPages))} disabled={currentPage === totalPages} />
                <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
              </Pagination>
            </div>
          )}
        </>
      )}
      
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>{editing ? 'Editar' : 'Novo'} Perfume</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Nome*</Form.Label><Form.Control type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Descrição</Form.Label><Form.Control as="textarea" rows={3} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Preço*</Form.Label><Form.Control type="text" value={formData.preco} onChange={e => setFormData({...formData, preco: e.target.value})} placeholder="Ex: 199,90" /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Quantidade*</Form.Label><Form.Control type="number" min="0" value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})} required /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Família</Form.Label><Form.Control type="text" value={formData.familia} onChange={e => setFormData({...formData, familia: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Gênero</Form.Label><Form.Select value={formData.genero} onChange={e => setFormData({...formData, genero: e.target.value})}><option value="">Selecione</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option><option value="unissex">Unissex</option></Form.Select></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Imagem</Form.Label><Form.Control type="file" accept="image/*" onChange={handleImageChange} /></Form.Group>
            {preview && <div className="text-center"><Image src={preview} width="150" className="border rounded" /><Button variant="link" size="sm" onClick={() => { if(preview && !preview.includes('http')) URL.revokeObjectURL(preview); setPreview(''); setFormData({...formData, imagem: null}); }}>Remover</Button></div>}
          </Form>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button><Button variant="primary" onClick={handleSave} disabled={submitting}>{submitting ? <Spinner size="sm" /> : 'Salvar'}</Button></Modal.Footer>
      </Modal>
    </div>
  );
}
