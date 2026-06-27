import React, { useEffect, useState } from 'react';
import { MapSelector } from '../../components/routes/MapSelector';
import '../../assets/styles/routes.css';

export interface RouteOption {
  id: number;
  nombre: string;
  color: string;
}

export const RoutesPage: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [zona, setZona] = useState('Centro Ocosingo');
  const [color, setColor] = useState('#6F42C1');
  const [routes, setRoutes] = useState<RouteOption[]>([]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await fetch('/api/rutas');
        if (!res.ok) throw new Error('Failed to fetch routes');
        const data = await res.json();
        setRoutes(
          data.map((r: { id: number; nombre: string; color?: string }) => ({
            id: r.id,
            nombre: r.nombre,
            color: r.color || '#6F42C1',
          }))
        );
      } catch (e) {
        console.error(e);
      }
    };
    fetchRoutes();
  }, []);

  const handleSaveRuta = async () => {
    if (!nombre || !zona) return;
    try {
      const res = await fetch('/api/rutas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, descripcion, zona, color }),
      });
      if (!res.ok) throw new Error('Error saving route');
      const saved = await res.json();
      alert(`Ruta "${saved.nombre}" guardada con id ${saved.id}`);
      setRoutes((prev) => [
        ...prev,
        { id: saved.id, nombre: saved.nombre, color: saved.color || color },
      ]);
      setNombre('');
      setDescripcion('');
    } catch (e) {
      console.error(e);
      alert('Error al guardar la ruta');
    }
  };

  return (
    <div className="routes-page">
      {/* ─── SECCIÓN: Crear Ruta ─── */}
      <section className="routes-section">
        <h2 className="section-title">Nueva Ruta</h2>
        <div className="form-grid">
          {/* nombre */}
          <div className="form-field">
            <label className="form-label">Nombre</label>
            <input
              className="form-input"
              type="text"
              value={nombre}
              placeholder="Ej. Ruta Centro"
              onChange={e => setNombre(e.target.value)}
            />
          </div>
          {/* descripcion */}
          <div className="form-field">
            <label className="form-label">Descripción</label>
            <input
              className="form-input"
              type="text"
              value={descripcion}
              placeholder="Descripción opcional"
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>
          {/* zona */}
          <div className="form-field">
            <label className="form-label">Zona</label>
            <select className="form-select" value={zona} onChange={e => setZona(e.target.value)}>
              <option value="Centro Ocosingo">Centro Ocosingo</option>
              <option value="Norte Ocosingo">Norte Ocosingo</option>
              <option value="Sur Ocosingo">Sur Ocosingo</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Color de ruta</label>
            <div className="color-picker-row">
              <input
                className="color-picker-input"
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
              />
              <span className="color-picker-value">{color}</span>
            </div>
          </div>
        </div>
        <button className="save-button" onClick={handleSaveRuta}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M16.704 5.292a1 1 0 010 1.416l-8.5 8.5a1 1 0 01-1.416 0l-4-4a1 1 0 111.416-1.416L8 12.084l7.788-7.788a1 1 0 011.416 0z" clipRule="evenodd" />
          </svg>
          Guardar Ruta
        </button>
      </section>

      {/* ─── SECCIÓN: Agregar Punto de Control ─── */}
      <section className="routes-section">
        <MapSelector routes={routes} onSaved={() => {}} />
      </section>
    </div>
  );
};
