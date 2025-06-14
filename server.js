require('dotenv').config();

const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;
const FOLIOS_FILE = path.join(__dirname, 'data', 'folios.json');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer config para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'public', 'images');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname;
    cb(null, unique);
  }
});
const upload = multer({ storage });

// Funciones para leer y escribir folios
function readFolios() {
  if (!fs.existsSync(FOLIOS_FILE)) fs.writeFileSync(FOLIOS_FILE, '[]');
  return JSON.parse(fs.readFileSync(FOLIOS_FILE, 'utf8'));
}
function writeFolios(data) {
  fs.writeFileSync(FOLIOS_FILE, JSON.stringify(data, null, 2));
}

// --- Rutas básicas ---

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inicio.html'));
});

app.post('/login', (req, res) => {
  const { usuario, contrasena } = req.body;
  const USER = 'admin';
  const PASS = '1234';
  if (usuario === USER && contrasena === PASS) {
    res.redirect('/admin.html');
  } else {
    res.redirect('/?error=1');
  }
});

// --- API para folios ---

app.get('/api/folios', (req, res) => {
  res.json(readFolios());
});
app.get('/api/folios/:folio', (req, res) => {
  const folios = readFolios();
  const item = folios.find(f => f.folio === req.params.folio);
  if (item) res.json(item);
  else res.status(404).json({ error: 'Folio no encontrado' });
});
app.post('/api/folios', (req, res) => {
  const { folio, estado } = req.body;
  const folios = readFolios();
  if (folios.find(f => f.folio === folio)) {
    return res.status(400).json({ error: 'Folio duplicado' });
  }
  folios.push({ folio, estado });
  writeFolios(folios);
  res.json({ success: true });
});
app.put('/api/folios/:folio', (req, res) => {
  const folios = readFolios();
  const index = folios.findIndex(f => f.folio === req.params.folio);
  if (index !== -1) {
    folios[index].estado = req.body.estado;
    writeFolios(folios);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Folio no encontrado' });
  }
});
app.delete('/api/folios/:folio', (req, res) => {
  let folios = readFolios();
  folios = folios.filter(f => f.folio !== req.params.folio);
  writeFolios(folios);
  res.json({ success: true });
});

// --- NUEVO: Recibir formulario, generar PDF y enviar correo ---

function crearPDF(datos, rutaArchivo) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(rutaArchivo);

    doc.pipe(stream);

    doc.fontSize(22).text('Solicitud de Cotización iFix', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14);
    doc.text(`Nombre: ${datos.nombre}`);
    doc.text(`Teléfono: ${datos.telefono}`);
    doc.text(`Correo: ${datos.correo}`);
    doc.text(`Modelo: ${datos.modelo}`);
    doc.text(`Problema: ${datos.problema}`);
    doc.moveDown();
    doc.text('Descripción:');
    doc.text(datos.descripcion);

    doc.end();

    stream.on('finish', () => resolve(rutaArchivo));
    stream.on('error', (err) => reject(err));
  });
}

app.post('/enviar-solicitud', upload.array('imagen', 5), async (req, res) => {
  try {
    const { nombre, telefono, correo, modelo, problema, descripcion } = req.body;
    const archivos = req.files || [];

    const uploadsDir = path.join(__dirname, 'public', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const pdfPath = path.join(uploadsDir, `Solicitud_${Date.now()}.pdf`);

    await crearPDF({ nombre, telefono, correo, modelo, problema, descripcion }, pdfPath);

    // Configurar nodemailer con datos en .env
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Adjuntos: pdf + imágenes
    const attachments = [
      { filename: 'Solicitud.pdf', path: pdfPath },
      ...archivos.map(f => ({ filename: f.originalname, path: f.path })),
    ];

    const mailOptions = {
      from: `"iFix Centro de Reparaciones" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'Nueva Solicitud de Cotización',
      text:
        `Nueva solicitud de cotización:\n\n` +
        `Nombre: ${nombre}\nTeléfono: ${telefono}\nCorreo: ${correo}\n` +
        `Modelo: ${modelo}\nProblema: ${problema}\nDescripción: ${descripcion}`,
      attachments,
    };

    await transporter.sendMail(mailOptions);

    // Limpieza archivos temporales
    fs.unlink(pdfPath, () => {});
    archivos.forEach(f => fs.unlink(f.path, () => {}));

    res.redirect('/confirmacion.html');
  } catch (error) {
    console.error('Error en /enviar-solicitud:', error);
    res.status(500).send('Error al enviar la solicitud. Intenta de nuevo.');
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🟢 Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`🌐 Abre en navegador: http://localhost:${PORT}/`);
});
