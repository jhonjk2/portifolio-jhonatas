
/* =====================================
   MENU DE NAVEGAÇÃO
===================================== */

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

// Abrir e fechar o menu no telemóvel
if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');

    menuButton.setAttribute('aria-expanded', String(isOpen));

    menuButton.setAttribute(
      'aria-label',
      isOpen ? 'Fechar menu' : 'Abrir menu'
    );
  });

  // Fechar o menu depois de selecionar uma opção
  document.querySelectorAll('.nav a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');

      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Abrir menu');
    });
  });
}


/* =====================================
   ANO AUTOMÁTICO NO RODAPÉ
===================================== */

const yearElement = document.querySelector('#year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}


/* =====================================
   PROTEÇÃO DE TEXTO HTML
===================================== */

// Impede que caracteres especiais sejam
// interpretados como código HTML.

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}


/* =====================================
   ELEMENTO DOS PROJETOS
===================================== */

const projectGrid = document.querySelector('#project-grid');


/* =====================================
   CRIAR CARTÃO DE PROJETO
===================================== */

function createProjectCard(project, index) {

  const technologies = (project.technologies || [])
    .map((technology) => {
      return `<span>${escapeHTML(technology)}</span>`;
    })
    .join('');

  // Se existir uma imagem, apresenta-a.
  // Caso contrário, apresenta o ícone.

  const visual = project.image
    ? `
      <div class="project-visual project-image">
        <img
          src="${escapeHTML(project.image)}"
          alt="Imagem do projeto ${escapeHTML(project.title)}"
          loading="lazy"
        >

        <span class="visual-caption">
          ${escapeHTML(project.category || 'PROJETO')}
        </span>
      </div>
    `
    : `
      <div class="project-visual ${escapeHTML(project.visualClass || 'web')}">
        <span class="visual-icon">
          ${escapeHTML(project.icon || '</>')}
        </span>

        <span class="visual-caption">
          ${escapeHTML(project.category || 'DESENVOLVIMENTO')}
        </span>
      </div>
    `;

  return `
    <a
      class="project-card"
      href="${escapeHTML(project.url)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir ${escapeHTML(project.title)} numa nova aba"
    >

      ${visual}

      <div class="project-info">

        <div class="project-meta">
          ${String(index + 1).padStart(2, '0')}
          — ${escapeHTML(project.category || 'PROJETO')}
        </div>

        <h3>
          ${escapeHTML(project.title)}
          <span class="external-icon" aria-hidden="true">↗</span>
        </h3>

        <p>
          ${escapeHTML(project.description || 'Sem descrição disponível.')}
        </p>

        <div class="tags">
          ${technologies}
        </div>

        <span class="project-status">
          Projeto online · Visitar projeto ↗
        </span>

      </div>

    </a>
  `;
}


/* =====================================
   APRESENTAR TODOS OS PROJETOS
===================================== */

function displayProjects() {

  if (!projectGrid) return;

  // Verifica se a lista de projetos existe.
  if (typeof projects === 'undefined' || !Array.isArray(projects)) {
    projectGrid.innerHTML = `
      <p class="small-note">
        Não foi possível carregar os projetos.
      </p>
    `;

    return;
  }

  // Filtra projetos que tenham nome e endereço.
  const validProjects = projects.filter((project) => {
    return project.title && project.url;
  });

  if (validProjects.length === 0) {
    projectGrid.innerHTML = `
      <p class="small-note">
        Ainda não existem projetos disponíveis.
      </p>
    `;

    return;
  }

  // Cria os cartões e apresenta-os na página.
  projectGrid.innerHTML = validProjects
    .map((project, index) => createProjectCard(project, index))
    .join('');
}


/* =====================================
   INICIALIZAÇÃO
===================================== */

// Apresenta os projetos na página.
displayProjects();
