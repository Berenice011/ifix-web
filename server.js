require('dotenv').config();

const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

// PostgreSQL config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Multer config para imágenes
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

// --- RUTAS BÁSICAS ---
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

// --- API CON BASE DE DATOS POSTGRESQL ---

// Crear nuevo folio
app.post('/api/folios', async (req, res) => {
  const { folio, nombre_completo, numero_contacto, dispositivo, estado } = req.body;
  try {
    await pool.query(
      'INSERT INTO folios (folio, nombre_completo, numero_contacto, dispositivo, estado) VALUES ($1, $2, $3, $4, $5)',
      [folio, nombre_completo, numero_contacto, dispositivo, estado]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error al insertar folio:', error);
    res.status(500).json({ error: 'Error al guardar folio' });
  }
});

// Obtener todos los folios
app.get('/api/folios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM folios ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener folios' });
  }
});

// Obtener folio por ID
app.get('/api/folios/:folio', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM folios WHERE folio = $1', [req.params.folio]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Folio no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar folio' });
  }
});

// Actualizar estado
app.put('/api/folios/:folio', async (req, res) => {
  const { estado } = req.body;
  try {
    const result = await pool.query(
      'UPDATE folios SET estado = $1 WHERE folio = $2',
      [estado, req.params.folio]
    );
    if (result.rowCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Folio no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar folio' });
  }
});

// Eliminar folio
app.delete('/api/folios/:folio', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM folios WHERE folio = $1', [req.params.folio]);
    if (result.rowCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Folio no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar folio' });
  }
});

// --- PDF y envío de correo (cotización) ---

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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

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

    fs.unlink(pdfPath, () => {});
    archivos.forEach(f => fs.unlink(f.path, () => {}));

    res.redirect('/confirmacion.html');
  } catch (error) {
    console.error('Error en /enviar-solicitud:', error);
    res.status(500).send('Error al enviar la solicitud. Intenta de nuevo.');
  }
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`🟢 Conexión exitosa. Hora del servidor: ${result.rows[0].now}`);
  } catch (err) {
    console.error('❌ Error de conexión con la base de datos:', err);
    res.status(500).send('Error al conectar con la base de datos');
  }
});


// --- Iniciar servidor ---
app.listen(PORT, () => {
  console.log(`🟢 Servidor corriendo en: http://localhost:${PORT}`);
});
