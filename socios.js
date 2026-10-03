// AGREGADO (BroadcastChannel): canal de comunicación entre pestañas.
// Mismo nombre que en registro.js y app.js para que estén conectadas.
const canal = new BroadcastChannel('coop_turns_channel');

const currentHeaderDisplay = document.getElementById('currentHeaderDisplay');
const publicTurnTableBody = document.getElementById('publicTurnTableBody');
const callTitle = document.getElementById('callTitle');

function loadPublicData() {
  const storedTurns = localStorage.getItem('coop_turns');
  const turns = storedTurns ? JSON.parse(storedTurns) : [];

  const currentTurn = turns.find(t => t.status !== 'Despachado') || null;

  if (currentTurn && currentTurn.status === 'Pendiente Pago') {
    callTitle.textContent = 'SOCIO LLAMADO A PAGAR';
    currentHeaderDisplay.innerHTML = `
      <div class="active-unit-highlight">
        <span class="turn-badge">${currentTurn.turnCode}</span>
        <span>Unidad ${currentTurn.unit} - ${currentTurn.driver}</span>
        <span style="font-size: 1.1rem; color: var(--danger); font-weight: bold;">Acérquese a Gerencia a pagar $65</span>
      </div>
    `;
  } else if (currentTurn && currentTurn.status === 'Listo (En Cola)') {
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

    const isCurrent = currentTurn && turn.id === currentTurn.id;

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

  try { lucide.createIcons(); } catch (err) {}
}

// AGREGADO (BroadcastChannel): reemplaza al antiguo listener 'storage'.
// Se ejecuta cuando registro.html o el panel admin publican un cambio.
canal.onmessage = (event) => {
  if (event.data && event.data.tipo === 'TURNOS_ACTUALIZADOS') {
    loadPublicData();
  }
};

// AGREGADO: cierra el canal al salir de la página
window.addEventListener('beforeunload', () => canal.close());

document.addEventListener('DOMContentLoaded', () => {
  loadPublicData();
  // CAMBIADO: antes cada 1 segundo; ahora solo respaldo cada 5 segundos
  setInterval(loadPublicData, 5000);
  try { lucide.createIcons(); } catch (err) {}
});