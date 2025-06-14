document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modalImagen');
  const modalImg = document.getElementById('imgAmpliada');
  const spanCerrar = document.querySelector('.cerrar');

  // Abrir el modal al hacer clic en una imagen
  document.querySelectorAll('.imagen-reparacion').forEach(img => {
    img.addEventListener('click', () => {
      modal.style.display = 'block';
      modalImg.src = img.src;
      modalImg.classList.remove('zoomed'); // quitar zoom si estaba antes
    });
  });

  // Cerrar modal al hacer clic en la X
  spanCerrar.onclick = () => {
    modal.style.display = 'none';
    modalImg.classList.remove('zoomed');
  };

  // Cerrar modal al hacer clic fuera de la imagen
  window.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modalImg.classList.remove('zoomed');
    }
  };

  // Alternar zoom al hacer clic sobre la imagen del modal
  modalImg.addEventListener('click', () => {
    modalImg.classList.toggle('zoomed');
  });
});
