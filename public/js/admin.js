document.addEventListener('DOMContentLoaded', () => {
  const lista = document.getElementById('listaFolios');
  const form = document.getElementById('formAgregar');

  const cargarFolios = async () => {
    const res = await fetch('/api/folios');
    const folios = await res.json();
    lista.innerHTML = '';
    folios.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${f.folio}</strong> - ${f.estado}
        <button onclick="editar('${f.folio}')">Editar</button>
        <button onclick="eliminar('${f.folio}')">Eliminar</button>
      `;
      lista.appendChild(li);
    });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const res = await fetch('/api/folios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      form.reset();
      cargarFolios();
    } else {
      alert('❌ Folio duplicado');
    }
  });

  window.editar = async (folio) => {
    const nuevo = prompt('Nuevo estado:');
    if (!nuevo) return;
    await fetch(`/api/folios/${folio}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevo }),
    });
    cargarFolios();
  };

  window.eliminar = async (folio) => {
    if (!confirm(`¿Eliminar folio ${folio}?`)) return;
    await fetch(`/api/folios/${folio}`, { method: 'DELETE' });
    cargarFolios();
  };

  cargarFolios();
});
