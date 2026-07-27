import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <Router>
      <div style={{ padding: '20px', color: 'white' }}>
        <h1>Kacha P2P App</h1>
        <p>Router added</p>
      </div>
    </Router>
  );
};

export default App;
