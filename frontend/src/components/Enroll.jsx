import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { Camera, CameraOff } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:5000/api';

const Enroll = () => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [name, setName] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Idle');

  useEffect(() => {
    if (!isCameraOn && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [isCameraOn]);

  const drawFaceBox = (box) => {
    const canvas = canvasRef.current;
    if (!canvas || !webcamRef.current || !webcamRef.current.video) return;
    
    const video = webcamRef.current.video;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (box) {
      let { x, y, w, h } = box;
      // Mirror the coordinate across the canvas axis to match the CSS scaleX(-1) video element exactly
      x = canvas.width - x - w; 

      ctx.strokeStyle = '#3b82f6'; 
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.stroke();

      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, y - 28, 140, 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.fillText('Capturing Face...', x + 6, y - 8);
    }
  };

  const startCapture = async () => {
    if (!name.trim()) {
      setStatus('Please enter a name first!');
      return;
    }
    setCapturing(true);
    setProgress(0);
    setStatus('Capturing 50 images...');
    
    let current = 0;
    const total = 50;
    
    const interval = setInterval(async () => {
      if (current >= total) {
        clearInterval(interval);
        setCapturing(false);
        setStatus(`Successfully enrolled ${total} images for ${name}!`);
        if (canvasRef.current) {
            canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        return;
      }
      
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        try {
          const response = await axios.post(`${API_BASE}/enroll`, {
            name: name,
            frame: imageSrc,
            count: current + 1
          });
          
          if (response.data.success) {
            drawFaceBox(response.data.box);
            current++;
            setProgress((current / total) * 100);
            setStatus(`Capturing frame ${current}/${total}`);
          } else {
             // Wipe canvas if face isn't detected for that specific frame
             if (canvasRef.current) {
                canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
             }
             setStatus(response.data.message || 'No face detected! Move into view.');
          }
        } catch (error) {
          console.error('Error sending frame:', error);
          setStatus('Error capturing face. Make sure backend is running.');
        }
      }
    }, 500);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', width: '100%' }}>
      <div className="header">
        <h2>Enroll New User</h2>
        <p>Register a new face profile directly from the browser.</p>
      </div>

      <div className="input-group">
        <input 
          type="text" 
          placeholder="Enter Person's Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          disabled={capturing}
        />
      </div>

      <button 
        className={`btn`} 
        onClick={() => setIsCameraOn(!isCameraOn)} 
        disabled={capturing}
        style={{ marginBottom: '1rem', width: 'auto', background: isCameraOn ? 'var(--text-secondary)' : 'var(--accent)', padding: '0.75rem 1.5rem' }}
      >
        {isCameraOn ? <CameraOff size={20} /> : <Camera size={20} />}
        {isCameraOn ? 'Power Off Camera' : 'Power On Camera'}
      </button>

      {isCameraOn ? (
        <div className="webcam-wrapper" style={{ marginBottom: '2rem', position: 'relative' }}>
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

          <div className="status-badge">
            <div className="status-dot" style={{ background: capturing ? 'var(--danger)' : 'var(--success)' }}></div>
            {capturing ? 'Recording...' : 'Camera Active'}
          </div>
        </div>
      ) : (
        <div className="webcam-wrapper" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', border: '1px solid var(--glass-border)' }}>
          <CameraOff size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Lens Powered Down</span>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        {status}
      </div>

      {capturing && (
        <div className="progress-container" style={{ marginBottom: '2rem' }}>
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      <button 
        className="btn btn-primary" 
        onClick={startCapture} 
        disabled={capturing || !name.trim() || !isCameraOn}
      >
        <Camera size={20} />
        {capturing ? `Enrolling (${Math.round(progress)}%)` : 'Start Enrollment'}
      </button>
    </div>
  );
};

export default Enroll;
