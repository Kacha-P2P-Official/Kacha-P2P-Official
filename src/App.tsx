import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <div style={{ padding: '20px', color: 'white' }}>
          <h1>Kacha P2P App</h1>
          <p>AuthProvider added</p>
        </div>
      </AuthProvider>
    </Router>
  );
};

export default App;
