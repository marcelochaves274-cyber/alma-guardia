'use client';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export function ErrorModal({ isOpen, onClose, message }: ErrorModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div style={{ backgroundColor: `hsl(var(--card))`, padding: '25px', borderRadius: '10px', textAlign: 'center', color: `hsl(var(--card-foreground))`, boxShadow: '0 4px 15px rgba(0,0,0,0.3)', border: `1px solid hsl(var(--border))`, maxWidth: '400px', width: '90%' }}>
        <h3 style={{ margin: '0 0 10px 0', color: `hsl(var(--foreground))` }}>Atenção</h3>
        <p style={{ margin: '0 0 20px 0', fontSize: '16px' }}>{message}</p>
        <button 
          onClick={onClose} 
          style={{ padding: '10px 25px', backgroundColor: `hsl(var(--primary))`, color: `hsl(var(--primary-foreground))`, border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', opacity: 1 }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}