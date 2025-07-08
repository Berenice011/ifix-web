document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formAgregar');
  const listaFolios = document.getElementById('listaFolios');

  // Función para mostrar todos los folios
  async function cargarFolios() {
    try {
      const res = await fetch('/api/folios');
      const folios = await res.json();

      listaFolios.innerHTML = '';
      folios.forEach(folio => {
        const li = document.createElement('li');
        li.innerHTML = `
          <strong>Folio:</strong> ${folio.folio} <br/>
          <strong>Nombre:</strong> ${folio.nombre_completo} <br/>
          <strong>Contacto:</strong> ${folio.numero_contacto} <br/>
          <strong>Dispositivo:</strong> ${folio.dispositivo} <br/>
          <strong>Estado:</strong> 
          <select class="estado-select" data-folio="${folio.folio}">
            <option value="En reparación" ${folio.estado === 'En reparación' ? 'selected' : ''}>En reparación</option>
            <option value="Listo para recoger" ${folio.estado === 'Listo para recoger' ? 'selected' : ''}>Listo para recoger</option>
          </select>
          <button class="btn-eliminar" data-folio="${folio.folio}">Eliminar</button>
          <hr/>
        `;
        listaFolios.appendChild(li);
      });

      // Agregar listeners para actualizar estado
      document.querySelectorAll('.estado-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const folio = e.target.getAttribute('data-folio');
          const nuevoEstado = e.target.value;
          try {
            const res = await fetch(`/api/folios/${folio}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ estado: nuevoEstado })
            });
            if (!res.ok) throw new Error('No se pudo actualizar estado');
            alert(`Estado del folio ${folio} actualizado a "${nuevoEstado}"`);
          } catch (error) {
            alert('Error al actualizar estado');
            console.error(error);
          }
        });
      });

      // Agregar listeners para eliminar folio
      document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const folio = e.target.getAttribute('data-folio');
          if (confirm(`¿Seguro que quieres eliminar el folio ${folio}?`)) {
            try {
              const res = await fetch(`/api/folios/${folio}`, { method: 'DELETE' });
              if (!res.ok) throw new Error('No se pudo eliminar folio');
              alert(`Folio ${folio} eliminado`);
              cargarFolios(); // refrescar lista
            } catch (error) {
              alert('Error al eliminar folio');
              console.error(error);
            }
          }
        });
      });

    } catch (error) {
      listaFolios.innerHTML = '<li>Error al cargar folios.</li>';
      console.error(error);
    }
  }

  // Enviar formulario para agregar folio
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const data = {
      folio: formData.get('folio'),
      nombre_completo: formData.get('nombre_completo'),
      numero_contacto: formData.get('numero_contacto'),
      dispositivo: formData.get('dispositivo'),
      estado: formData.get('estado'),
    };

    try {
      const res = await fetch('/api/folios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert('Error al agregar folio: ' + (errorData.error || 'Desconocido'));
        return;
      }

      alert('Folio agregado correctamente');
      form.reset();
      cargarFolios();
    } catch (error) {
      alert('Error al agregar folio');
      console.error(error);
    }
  });

  // Cargar folios al inicio
  cargarFolios();
});
