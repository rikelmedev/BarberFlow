import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Admin from './Admin';
import Booking from './Booking';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Pública para os Clientes */}
        <Route path="/" element={<Booking />} />
        
        {/* Rota Privada para o Dono da Barbearia */}
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;