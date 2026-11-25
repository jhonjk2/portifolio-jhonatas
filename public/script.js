const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

menuButton?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
});

document.querySelectorAll('.nav a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Abrir menu');
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

const projectGrid = document.querySelector('#project-grid');
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

async function loadProjects() {
  if (!projectGrid) return;
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) throw new Error('Não foi possível carregar os projetos.');
    const projects = await response.json();
    if (!projects.length) {
      projectGrid.innerHTML = '<p class="small-note">Ainda não existem projetos publicados.</p>';
      return;
    }

    projectGrid.innerHTML = projects.map((project, index) => {
      const technologies = (project.technologies || []).map((tech) => `<span>${escapeHTML(tech)}</span>`).join('');
      const visual = project.image_url
        ? `<div class="project-visual project-image"><img src="${escapeHTML(project.image_url)}" alt="Imagem do projeto ${escapeHTML(project.title)}" loading="lazy"><span class="visual-caption">${escapeHTML(project.category || 'PROJETO')}</span></div>`
        : `<div class="project-visual ${escapeHTML(project.visual_class || 'web')}"><span class="visual-icon">${escapeHTML(project.icon || '</>')}</span><span class="visual-caption">${escapeHTML(project.category || 'DESENVOLVIMENTO')}</span></div>`;
      return `<a class="project-card" href="${escapeHTML(project.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${escapeHTML(project.title)} numa nova aba">
        ${visual}<div class="project-info"><div class="project-meta">${String(index + 1).padStart(2, '0')} — ${escapeHTML(project.category || 'PROJETO')}</div>
        <h3>${escapeHTML(project.title)} <span class="external-icon" aria-hidden="true">↗</span></h3>
        <p>${escapeHTML(project.description)}</p><div class="tags">${technologies}</div>
        <span class="project-status">Projeto online · Visitar projeto ↗</span></div></a>`;
    }).join('');
  } catch (error) {
    projectGrid.innerHTML = '<p class="small-note">Não foi possível carregar os projetos neste momento. Tenta novamente mais tarde.</p>';
    console.error(error);
  }
}

loadProjects();
