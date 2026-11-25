document.querySelectorAll('[data-confirm-delete]').forEach((button) => {
  button.closest('form')?.addEventListener('submit', (event) => {
    if (!window.confirm('Tens a certeza de que queres eliminar este projeto?')) {
      event.preventDefault();
    }
  });
});
