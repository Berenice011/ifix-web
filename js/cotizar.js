document.getElementById("formCotizacion").addEventListener("submit", async function (e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const modelo = document.getElementById("modelo").value.trim();
  const problema = document.getElementById("problema").value;
  const descripcion = document.getElementById("descripcion").value.trim();

  const data = { nombre, modelo, problema, descripcion };

  try {
    const response = await fetch("/generar-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error("Error en el servidor");

    const result = await response.json();
    const pdfURL = result.url;

    // Redirigir a WhatsApp con el link al PDF
    const mensaje = `¡Hola! Soy ${nombre} y solicité una cotización para el modelo ${modelo}.
Problema: ${problema}
Descripción: ${descripcion}
Aquí está el PDF con los detalles: ${pdfURL}`;

    const numero = "5218335303717"; // Incluye el 52 de México si usas wa.me
    const urlWhatsApp = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");

  } catch (err) {
    console.error(err);
    alert("Ocurrió un error al generar la cotización.");
  }
});
