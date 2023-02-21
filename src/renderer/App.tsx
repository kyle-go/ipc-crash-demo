import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function Hello() {
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          window.electron.ipcRenderer.sendMessage('ipc-example', ['ping'])
        }
      >
        test
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
