import React, { useState } from 'react';
import axios from 'axios';
import { Database, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api';

const Train = () => {
  const [training, setTraining] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  const trainModel = async () => {
    setTraining(true);
    setStatus('Generating PCA eigenvectors and Fisher LDA representations...');
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE}/train`);
      if (response.data.success) {
        setStatus(response.data.message);
      } else {
        setError(response.data.error || 'Failed to train the model.');
        setStatus(null);
      }
    } catch (err) {
      console.error(err);
      setError('Backend error. Ensure the Python API is running on localhost:5000.');
      setStatus(null);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: 'auto', textAlign: 'center' }}>
      <div className="header" style={{ marginBottom: '3rem' }}>
        <h2>Refit AI Model</h2>
        <p>Compile all currently enrolled face datasets into the FisherFaces algorithmic structure.</p>
      </div>
      
      <div style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: training ? 'var(--accent)' : 'rgba(99, 102, 241, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: training ? '0 0 30px rgba(99, 102, 241, 0.6)' : 'none',
          transition: 'all 0.5s ease',
          animation: training ? 'pulse-dot 2s infinite' : 'none'
        }}>
          <Database size={48} color={training ? 'white' : 'var(--text-secondary)'} />
        </div>
      </div>

      <div style={{ minHeight: '60px', marginBottom: '2rem' }}>
        {status && (
          <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {training ? <div className="status-dot"></div> : <CheckCircle2 size={20} />}
            <span>{status}</span>
          </div>
        )}
        
        {error && (
          <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
      </div>

      <button 
        className="btn btn-primary" 
        onClick={trainModel} 
        disabled={training}
        style={{ maxWidth: '300px', margin: 'auto' }}
      >
        <Database size={20} />
        {training ? 'Crunching Math...' : 'Train Model'}
      </button>

      <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Note: You require <strong>at least 2 distinct people</strong> enrolled in the database before Fisherfaces LDA matrix computation can succeed.
      </div>
    </div>
  );
};

export default Train;
