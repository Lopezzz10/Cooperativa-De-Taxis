const currentHeaderDisplay = document.getElementById('currentHeaderDisplay');
const publicTurnTableBody = document.getElementById('publicTurnTableBody');
// NUEVO: título de la tarjeta grande, que cambia según el estado del turno llamado
const callTitle = document.getElementById('callTitle');

function loadPublicData() {
  const storedTurns = localStorage.getItem('coop_turns');
  const turns = storedTurns ? JSON.parse(storedTurns) : [];

  // NUEVO: turno que corresponde atender ahora (el primero no despachado)
  const currentTurn = turns.find(t => t.status !== 'Despachado') || null;

  // 1. NUEVO: mostrar en la tarjeta grande al socio llamado, según su estado
  if (currentTurn && currentTurn.status === 'Pendiente Pago') {
    // NUEVO: recién registrado, se le llama a pagar
    callTitle.textContent = 'SOCIO LLAMADO A PAGAR';
    currentHeaderDisplay.innerHTML = `
      <div class="active-unit-highlight">
        <span class="turn-badge">${currentTurn.turnCode}</span>
        <span>Unidad ${currentTurn.unit} - ${currentTurn.driver}</span>
        <span style="font-size: 1.1rem; color: var(--danger); font-weight: bold;">Acérquese a Gerencia a pagar $65</span>
      </div>
    `;
  } else if (currentTurn && currentTurn.status === 'Listo (En Cola)') {
    // NUEVO: ya pagó, espera que lo llamen a cabecera
    callTitle.textContent = 'PAGO REGISTRADO';
    currentHeaderDisplay.innerHTML = `
      <div class="active-unit-highlight">
        <span class="turn-badge">${currentTurn.turnCode}</span>
        <span>Unidad ${currentTurn.unit} - ${currentTurn.driver}</span>
        <span style="font-size: 1.1rem; color: var(--info); font-weight: normal;">Pago registrado. Espere ser llamado a cabecera.</span>
      </div>
    `;
  } else if (currentTurn && currentTurn.status === 'En Cabecera') {
    callTitle.textContent = 'UNIDAD LLAMADA A CABECERA';
    currentHeaderDisplay.innerHTML = `
      <div class="active-unit-highlight">
        <span class="turn-badge">${currentTurn.turnCode}</span>
        <span>Unidad ${currentTurn.unit} - ${currentTurn.driver}</span>
        <span style="font-size: 1rem; color: var(--success); font-weight: normal;">¡Diríjase a la cabecera de salida inmediatamente!</span>
      </div>
    `;
  } else {
    callTitle.textContent = 'UNIDAD LLAMADA A CABECERA';
    currentHeaderDisplay.innerHTML = `<div class="no-active">Esperando llamada de la administración...</div>`;
  }

  // 2. Renderizar tabla general de turnos
  publicTurnTableBody.innerHTML = '';

  if (turns.length === 0) {
    publicTurnTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No hay turnos registrados en este momento.
        </td>
      </tr>
    `;
    return;
  }

  turns.forEach((turn) => {
    const tr = document.createElement('tr');

    let badgeClass = 'status-pending-pay';
    if (turn.status === 'Listo (En Cola)') badgeClass = 'status-ready';
    if (turn.status === 'En Cabecera') badgeClass = 'status-called';
    if (turn.status === 'Despachado') badgeClass = 'status-completed';

    // Marcar con ▶ el turno actual
    const isCurrent = currentTurn && turn.id === currentTurn.id;

    // Texto de posición en la cola
    let positionHtml = '';
    if (turn.status === 'Despachado') {
      positionHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;">Finalizado</span>`;
    } else if (isCurrent) {
      positionHtml = `<span style="color: var(--primary); font-weight: bold;">Turno actual</span>`;
    } else if (currentTurn) {
      positionHtml = `<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Esperando al ${currentTurn.turnCode}</span>`;
    }

    tr.innerHTML = `
      <td><strong>${isCurrent ? '▶ ' : ''}${turn.turnCode}</strong></td>
      <td>Unidad ${turn.unit}</td>
      <td>${turn.driver}</td>
      <td>${turn.time}</td>
      <td>${turn.paid ? '<span style="color: var(--success); font-weight: bold;">Cancelado ($65)</span>' : '<span style="color: var(--danger);">Pendiente Pago</span>'}</td>
      <td><span class="status ${badgeClass}">${turn.status}</span></td>
      <td>${positionHtml}</td>
    `;

    publicTurnTableBody.appendChild(tr);
  });

  // Protegido para que un fallo del CDN de iconos no rompa la pantalla
  try { lucide.createIcons(); } catch (err) { console.warn('Lucide no disponible', err); }
}

// Sincronización en tiempo real entre pestañas (Admin <-> Socios)
window.addEventListener('storage', (e) => {
  if (e.key === 'coop_turns') {
    loadPublicData();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  loadPublicData();
  setInterval(loadPublicData, 1000); // Refresco automático constante
  try { lucide.createIcons(); } catch (err) { console.warn('Lucide no disponible', err); }
});