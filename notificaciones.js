// AGREGADO: sistema de alertas/confirmaciones personalizadas (reemplaza alert() y confirm()).
// Uso:
//   mostrarAlerta({ tipo: 'exito' | 'error' | 'advertencia' | 'info', titulo, mensaje })  -> Promise
//   confirmarAccion({ titulo, mensaje, textoConfirmar, textoCancelar })                  -> Promise<boolean>

(function () {
  const ICONOS = { exito: '✓', error: '✕', advertencia: '!', info: 'i', pregunta: '?' };

  function abrirModal({ tipo = 'info', titulo = '', mensaje = '', botones }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal-box modal-${tipo}" role="dialog" aria-modal="true">
          <div class="modal-icon">${ICONOS[tipo] || ICONOS.info}</div>
          <h3 class="modal-title"></h3>
          <p class="modal-message"></p>
          <div class="modal-actions"></div>
        </div>
      `;

      // textContent evita inyectar HTML con nombres de conductores
      overlay.querySelector('.modal-title').textContent = titulo;
      overlay.querySelector('.modal-message').textContent = mensaje;

      const actions = overlay.querySelector('.modal-actions');
      const cancelValue = botones.find((b) => b.cancelar)?.valor ?? botones[0].valor;

      function cerrar(valor) {
        document.removeEventListener('keydown', onKey);
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 180);
        resolve(valor);
      }

      function onKey(e) {
        if (e.key === 'Escape') cerrar(cancelValue);
      }

      botones.forEach((b) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `modal-btn ${b.clase || ''}`;
        btn.textContent = b.texto;
        btn.addEventListener('click', () => cerrar(b.valor));
        actions.appendChild(btn);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cerrar(cancelValue);
      });

      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
      actions.querySelector('.modal-btn.primary, .modal-btn')?.focus();
    });
  }

  window.mostrarAlerta = ({ tipo = 'info', titulo, mensaje }) =>
    abrirModal({
      tipo,
      titulo,
      mensaje,
      botones: [{ texto: 'Entendido', valor: true, clase: 'primary' }]
    });

  window.confirmarAccion = ({ titulo, mensaje, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar' }) =>
    abrirModal({
      tipo: 'pregunta',
      titulo,
      mensaje,
      botones: [
        { texto: textoCancelar, valor: false, clase: 'secondary', cancelar: true },
        { texto: textoConfirmar, valor: true, clase: 'primary' }
      ]
    });
})();