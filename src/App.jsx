import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

function App() {
  const [movimientos, setMovimientos] = useState([]);
  const [fecha, setFecha] = useState('');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [tipo, setTipo] = useState('ingreso');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, `users/${user.uid}/movimientos`), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nuevosMovimientos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMovimientos(nuevosMovimientos);
    });

    return () => unsubscribe();
  }, [user]);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      console.log("Login exitoso:", result.user);
    } catch (error) {
      console.error('Error en login:', error);
      if (error.code === 'auth/unauthorized-domain') {
        alert('Error: Este dominio no está autorizado. Por favor, contacta al administrador.');
      } else {
        alert('Error al iniciar sesión: ' + error.message);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert('Error al cerrar sesión: ' + error.message);
    }
  };

  const agregarMovimiento = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Debes iniciar sesión para agregar movimientos');
      return;
    }

    if (!fecha || !concepto || !monto) {
      alert('Por favor, completa todos los campos');
      return;
    }

    try {
      await addDoc(collection(db, `users/${user.uid}/movimientos`), {
        fecha,
        concepto,
        monto: parseFloat(monto),
        tipo,
        createdAt: new Date()
      });

      setFecha('');
      setConcepto('');
      setMonto('');
      alert('Movimiento agregado exitosamente');
    } catch (error) {
      alert('Error al agregar movimiento: ' + error.message);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <button
          onClick={login}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Iniciar sesión con Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Cash Book</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{user.email}</span>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <form onSubmit={agregarMovimiento} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Concepto</label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Monto</label>
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              required
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px' }}>Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            marginTop: '10px',
            cursor: 'pointer'
          }}
        >
          Agregar Movimiento
        </button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Fecha</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Concepto</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Ingreso</th>
              <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Egreso</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((mov) => (
              <tr key={mov.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '12px' }}>{mov.fecha}</td>
                <td style={{ padding: '12px' }}>{mov.concepto}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#28a745' }}>
                  {mov.tipo === 'ingreso' ? `$${mov.monto.toFixed(2)}` : ''}
                </td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#dc3545' }}>
                  {mov.tipo === 'egreso' ? `$${mov.monto.toFixed(2)}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;