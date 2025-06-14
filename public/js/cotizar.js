document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formCotizacion');
  const mensajeEnvio = document.getElementById('mensajeEnvio');
  const errorEnvio = document.getElementById('errorEnvio');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    mensajeEnvio.style.display = 'none';
    errorEnvio.style.display = 'none';

    const formData = new FormData(form);

    try {
      const res = await fetch('/generar-pdf', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        mensajeEnvio.textContent = data.mensaje || 'Cotización enviada correctamente.';
        mensajeEnvio.style.display = 'block';
        form.reset();
      } else {
        errorEnvio.textContent = data.error || 'Error al enviar la cotización.';
        errorEnvio.style.display = 'block';
      }
    } catch (error) {
      errorEnvio.textContent = 'Error en la conexión al servidor.';
      errorEnvio.style.display = 'block';
    }
  });
});
