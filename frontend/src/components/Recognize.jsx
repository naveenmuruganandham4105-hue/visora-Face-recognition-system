import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Camera, CameraOff, AlertTriangle, Settings2 } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api';

const Recognize = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [scanning, setScanning] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [threshold, setThreshold] = useState(90);
  const [error, setError] = useState(null);
  const scanInterval = useRef(null);

  // Auto-stop scanning if camera is shut off
  useEffect(() => {
    if (!isCameraOn && scanning) {
        setScanning(false);
    }
  }, [isCameraOn]);

  const drawBoundingBoxes = (faces) => {
    const canvas = canvasRef.current;
    if (!canvas || !webcamRef.current || !webcamRef.current.video) return;

    const video = webcamRef.current.video;
    
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach((face) => {
      let { x, y, w, h } = face.box;
      const { name, confidence, accepted } = face;

      // Because the underlying <Webcam> is horizontally flipped via CSS, we must mirror X on the unmirrored canvas
      x = canvas.width - x - w;

      const color = accepted ? '#10b981' : '#ef4444';

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 28, Math.max(w, 150), 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(`${name} (${confidence})`, x + 6, y - 8);
    });
  };

  const processFrame = useCallback(async () => {
    if (!webcamRef.current || !isCameraOn) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const response = await axios.post(`${API_BASE}/recognize`, {
        frame: imageSrc,
        threshold: threshold
      });

      if (response.data.success) {
        drawBoundingBoxes(response.data.faces);
        setError(null);
      } else {
        setError(response.data.error || 'Server error tracking face.');
        const canvas = canvasRef.current;
        if(canvas) {
           canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Connection to FisherFaces API lost. Check if python server.py is running.');
      // Stop scanning on disconnect
      setScanning(false);
    }
  }, [threshold, isCameraOn]);

  useEffect(() => {
    if (scanning && isCameraOn) {
      scanInterval.current = setInterval(processFrame, 150); 
    } else {
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
      }
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
  }, [scanning, isCameraOn, processFrame]);

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', width: '100%' }}>
      <div className="header">
        <h2>Live Face Scanner</h2>
        <p>Real-time projection vectors against mathematical Fisher Faces.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button 
            className={`btn`} 
            onClick={() => setIsCameraOn(!isCameraOn)} 
            style={{ width: 'auto', background: isCameraOn ? 'var(--text-secondary)' : 'var(--accent)', padding: '0.75rem 1.5rem' }}
          >
            {isCameraOn ? <CameraOff size={20} /> : <Camera size={20} />}
            {isCameraOn ? 'Power Off Camera' : 'Power On Camera'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
              <Settings2 size={24} color="var(--text-secondary)" />
              <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Strictness Threshold</div>
                  <input 
                      type="range" 
                      min="10" max="250" step="5" 
                      value={threshold} 
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      style={{ height: '6px', width: '150px', margin: '0.5rem 0', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>Strict</span>
                    <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{threshold}</span>
                    <span>Lenient</span>
                  </div>
              </div>
          </div>
      </div>

      {isCameraOn ? (
        <div className="webcam-wrapper" style={{ marginBottom: '1rem', position: 'relative' }}>
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="webcam-video"
            videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
            style={{ width: '100%', display: 'block' }}
          />
          
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />

          {scanning && <div className="scan-line"></div>}

          <div className="status-badge">
            <div className="status-dot" style={{ background: scanning ? 'var(--success)' : 'var(--danger)' }}></div>
            {scanning ? 'System Scanning...' : 'Camera Online'}
          </div>
        </div>
      ) : (
        <div className="webcam-wrapper" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', border: '1px solid var(--glass-border)' }}>
          <CameraOff size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Lens Powered Down</span>
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <button 
        className={`btn`}
        onClick={() => setScanning(!scanning)}
        disabled={!isCameraOn}
        style={{ 
          maxWidth: '400px', 
          margin: 'auto',
          background: scanning ? 'var(--danger)' : 'var(--accent)',
          opacity: isCameraOn ? 1 : 0.5,
          fontSize: '1.1rem',
          padding: '1rem 2rem'
        }}
      >
        <Camera size={24} />
        {scanning ? 'Terminate Scanning' : 'Initialize Scanner'}
      </button>
    </div>
  );
};

export default Recognize;
