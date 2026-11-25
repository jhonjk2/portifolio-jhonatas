require('dotenv').config();
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { rateLimit } = require('express-rate-limit');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) throw new Error('Falta configurar DATABASE_URL.');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('Configura SESSION_SECRET com pelo menos 32 caracteres aleatórios.');
}
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error('Configura ADMIN_USERNAME e ADMIN_PASSWORD_HASH nas variáveis de ambiente.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'https:'], scriptSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] } } }));
app.use(express.urlencoded({ extended: false, limit: '30kb' }));
app.use(express.json({ limit: '30kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  name: 'jhonatas.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));

function csrfToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}
function verifyCsrf(req, res, next) {
  const expected = req.session.csrfToken || '';
  const received = req.body._csrf || '';
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).send('Pedido inválido. Atualiza a página e tenta novamente.');
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.redirect('/admin/login');
  next();
}
function clean(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}
function validProject(body) {
  const title = clean(body.title, 100);
  const description = clean(body.description, 600);
  const url = clean(body.url, 500);
  const category = clean(body.category, 80);
  const imageUrl = clean(body.image_url, 500);
  let parsed;
  try { parsed = new URL(url); } catch { return { error: 'Indica um endereço válido para o projeto.' }; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { error: 'O link deve começar por http:// ou https://.' };
  if (!title || !description) return { error: 'Preenche o nome e a descrição do projeto.' };
  if (imageUrl) {
    try {
      const image = new URL(imageUrl);
      if (!['http:', 'https:'].includes(image.protocol)) throw new Error();
    } catch { return { error: 'O endereço da imagem não é válido.' }; }
  }
  const technologies = clean(body.technologies, 300).split(',').map(x => x.trim()).filter(Boolean).slice(0, 12);
  return {
    value: {
      title, description, url, category: category || 'DESENVOLVIMENTO', image_url: imageUrl || null,
      technologies, icon: clean(body.icon, 12) || '</>', visual_class: clean(body.visual_class, 30) || 'web',
      published: body.published === 'on'
    }
  };
}

async function initializeDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(600) NOT NULL,
    url TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'DESENVOLVIMENTO',
    technologies TEXT[] NOT NULL DEFAULT '{}',
    image_url TEXT,
    icon VARCHAR(12) NOT NULL DEFAULT '</>',
    visual_class VARCHAR(30) NOT NULL DEFAULT 'web',
    published BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const count = await pool.query('SELECT COUNT(*)::int AS total FROM projects');
  if (count.rows[0].total === 0) {
    const initialProjects = [
      ['LWM Motors', 'Plataforma web de apresentação de motociclos, com páginas de detalhe e contacto direto por WhatsApp.', 'https://lwm-motors.onrender.com/', 'DESENVOLVIMENTO WEB', ['Node.js', 'Express', 'EJS', 'PostgreSQL'], null, '🏍', 'web'],
      ['KryptoZero', 'Sistema para partilhar segredos através de links e QR Codes, com encriptação AES-256-GCM e acesso controlado.', 'https://sistemasegurosenhas.onrender.com/', 'SEGURANÇA E CRIPTOGRAFIA', ['AES-256-GCM', 'QR Code', 'Render'], null, '⌑', 'security'],
      ['Cooking Help MVC', 'Aplicação de receitas desenvolvida com arquitetura MVC e programação orientada a objetos, com gestão de conteúdos e base de dados.', 'https://castorcastanho.kesug.com/cookinghelp_mvc/index.php?i=1', 'DESENVOLVIMENTO WEB', ['PHP', 'POO', 'MVC', 'MySQL', 'HTML', 'CSS'], null, '⌘', 'database']
    ];
    for (let i = 0; i < initialProjects.length; i++) {
      const p = initialProjects[i];
      await pool.query(`INSERT INTO projects (title, description, url, category, technologies, image_url, icon, visual_class, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [...p, i]);
    }
  }
}

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: 'Demasiadas tentativas. Aguarda 15 minutos e tenta novamente.' });

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/api/projects', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT id, title, description, url, category, technologies, image_url, icon, visual_class FROM projects WHERE published = TRUE ORDER BY sort_order ASC, created_at DESC');
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.get('/admin/login', (req, res) => {
  if (req.session.admin) return res.redirect('/admin');
  res.render('login', { csrf: csrfToken(req), error: null });
});
app.post('/admin/login', loginLimiter, verifyCsrf, async (req, res, next) => {
  try {
    const username = clean(req.body.username, 100);
    const password = String(req.body.password || '');
    const matchesUser = username === process.env.ADMIN_USERNAME;
    const matchesPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!matchesUser || !matchesPassword) {
      return res.status(401).render('login', { csrf: csrfToken(req), error: 'Utilizador ou palavra-passe incorretos.' });
    }
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.admin = true;
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      res.redirect('/admin');
    });
  } catch (error) { next(error); }
});
app.post('/admin/logout', requireAdmin, verifyCsrf, (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('jhonatas.sid');
    res.redirect('/admin/login');
  });
});
app.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC');
    res.render('admin', { projects: result.rows, csrf: csrfToken(req), message: clean(req.query.message, 160), error: clean(req.query.error, 200) });
  } catch (error) { next(error); }
});
app.post('/admin/projects', requireAdmin, verifyCsrf, async (req, res, next) => {
  try {
    const parsed = validProject(req.body);
    if (parsed.error) return res.redirect('/admin?error=' + encodeURIComponent(parsed.error));
    const p = parsed.value;
    const order = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM projects');
    await pool.query(`INSERT INTO projects (title, description, url, category, technologies, image_url, icon, visual_class, published, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [p.title,p.description,p.url,p.category,p.technologies,p.image_url,p.icon,p.visual_class,p.published,order.rows[0].next]);
    res.redirect('/admin?message=' + encodeURIComponent('Projeto adicionado com sucesso.'));
  } catch (error) { next(error); }
});
app.post('/admin/projects/:id/edit', requireAdmin, verifyCsrf, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).send('ID inválido.');
    const parsed = validProject(req.body);
    if (parsed.error) return res.redirect('/admin?error=' + encodeURIComponent(parsed.error));
    const p = parsed.value;
    await pool.query(`UPDATE projects SET title=$1, description=$2, url=$3, category=$4, technologies=$5, image_url=$6,
      icon=$7, visual_class=$8, published=$9, updated_at=NOW() WHERE id=$10`, [p.title,p.description,p.url,p.category,p.technologies,p.image_url,p.icon,p.visual_class,p.published,id]);
    res.redirect('/admin?message=' + encodeURIComponent('Projeto atualizado.'));
  } catch (error) { next(error); }
});
app.post('/admin/projects/:id/delete', requireAdmin, verifyCsrf, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).send('ID inválido.');
    await pool.query('DELETE FROM projects WHERE id=$1', [id]);
    res.redirect('/admin?message=' + encodeURIComponent('Projeto eliminado.'));
  } catch (error) { next(error); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send('Ocorreu um erro no servidor. Tenta novamente mais tarde.');
});

initializeDatabase().then(() => {
  app.listen(port, () => console.log(`Portfólio iniciado na porta ${port}`));
}).catch((error) => {
  console.error('Erro ao preparar a base de dados:', error);
  process.exit(1);
});
