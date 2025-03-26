import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import DealDetails from './components/DealDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deal/:id" element={<DealDetails />} />
      </Routes>
    </Router>
  );
}

export default App;