let turns = [];
let selectedTurnId = null;

// AGREGADO (BroadcastChannel): canal de comunicación entre pestañas.
// Mismo nombre que en registro.js y socios.js para que estén conectadas.
const canal = new BroadcastChannel('coop_turns_channel');

// Obtener datos actualizados directamente de localStorage
function getTurnsFromStorage() {
  return JSON.parse(localStorage.getItem('coop_turns')) || [];
}

// Guardar datos y actualizar la referencia local
function saveTurnsToStorage(updatedTurns) {
  localStorage.setItem('coop_turns', JSON.stringify(updatedTurns));
  turns = updatedTurns;

  // AGREGADO (BroadcastChannel): cada vez que el admin guarda un cambio
  // (cobro, llamado a cabecera, despacho) avisa a las demás pestañas.
  canal.postMessage({
    tipo: 'TURNOS_ACTUALIZADOS',
    origen: 'admin'
  });
}

// Recalcular contador de facturas basado en las ya emitidas
function getInvoiceCounter() {
  const currentTurns = getTurnsFromStorage();
  return currentTurns.reduce((max, t) => {
    const n = t.invoice ? parseInt(t.invoice.replace('FACT-', ''), 10) : 0;
    return n >= max ? n + 1 : max;
  }, 1001);
}

const turnTableBody = document.getElementById('turnTableBody');
const totalCountBadge = document.getElementById('totalCount');

const paymentPrompt = document.getElementById('paymentPrompt');
const paymentDetails = document.getElementById('paymentDetails');
const payTurnCode = document.getElementById('payTurnCode');
const payUnit = document.getElementById('payUnit');
const payDriver = document.getElementById('payDriver');
const btnConfirmPay = document.getElementById('btnConfirmPay');

// Devuelve el primer turno que no ha sido despachado
function getCurrentTurn() {
  const currentTurns = getTurnsFromStorage();
  return currentTurns.find(t => t.status !== 'Despachado') || null;
}

// Valida que el turno seleccionado coincida con el turno que le corresponde salir en cola
function isCurrentTurn(id) {
  const current = getCurrentTurn();
  if (current && String(current.id) !== String(id)) {
    alert(`⚠️ ORDEN DE COLA: Primero debe atender el turno ${current.turnCode} antes de operar con otro.`);
    return false;
  }
  return true;
}

// Seleccionar socio para pagar en el panel del gerente
function selectForPayment(id) {
  if (!isCurrentTurn(id)) return;

  const currentTurns = getTurnsFromStorage();
  const turn = currentTurns.find(t => String(t.id) === String(id));
  if (!turn) return;

  selectedTurnId = id;
  payTurnCode.textContent = turn.turnCode;
  payUnit.textContent = `Unidad ${turn.unit}`;
  payDriver.textContent = turn.driver;

  paymentPrompt.classList.add('hidden');
  paymentDetails.classList.remove('hidden');
}

// Confirmar cobro de $65 y autorizar turno
btnConfirmPay.addEventListener('click', () => {
  if (!selectedTurnId) return;
  if (!isCurrentTurn(selectedTurnId)) return;

  const currentTurns = getTurnsFromStorage();
  const turnIndex = currentTurns.findIndex(t => String(t.id) === String(selectedTurnId));

  if (turnIndex !== -1) {
    let invoiceCounter = getInvoiceCounter();
    currentTurns[turnIndex].paid = true;
    currentTurns[turnIndex].invoice = `FACT-${invoiceCounter}`;
    currentTurns[turnIndex].status = 'Listo (En Cola)';

    saveTurnsToStorage(currentTurns);

    selectedTurnId = null;
    paymentDetails.classList.add('hidden');
    paymentPrompt.classList.remove('hidden');
    paymentPrompt.textContent = "¡Pago registrado con éxito! Seleccione otro socio si es necesario.";

    renderTable();
  }
});

// Cambiar estado a 'En Cabecera' o 'Despachado'
function changeStatus(id, newStatus) {
  if (!isCurrentTurn(id)) return;

  const currentTurns = getTurnsFromStorage();
  const turnIndex = currentTurns.findIndex(t => String(t.id) === String(id));
  
  if (turnIndex === -1) return;

  if (newStatus === 'En Cabecera') {
    const activeOnHeader = currentTurns.find(t => t.status === 'En Cabecera');
    if (activeOnHeader && String(activeOnHeader.id) !== String(id)) {
      alert("⚠️ REGLA OPERATIVA: Ya hay un turno en cabecera en curso. Debe despacharlo antes de llamar a otro.");
      return;
    }
  }

  // Actualizar estado del turno
  currentTurns[turnIndex].status = newStatus;
  
  // Guardar en localStorage y refrescar la tabla de inmediato
  saveTurnsToStorage(currentTurns);
  renderTable();
}

// AGREGADO (CAJA): elementos y lógica del panel de recaudación
const PRECIO_TURNO = 65;
const cajaTotal = document.getElementById('cajaTotal');
const cajaPagadosCount = document.getElementById('cajaPagadosCount');
const cajaPendientesCount = document.getElementById('cajaPendientesCount');
const cajaPagadosList = document.getElementById('cajaPagadosList');
const cajaPendientesList = document.getElementById('cajaPendientesList');
const btnCerrarCaja = document.getElementById('btnCerrarCaja');

// AGREGADO (CAJA): muestra pagados, pendientes y total recaudado
function renderCaja() {
  const all = getTurnsFromStorage();
  const pagados = all.filter(t => t.paid && !t.cerrado);   // cobrados en la caja actual
  const pendientes = all.filter(t => !t.paid);              // aún no pagan

  cajaTotal.textContent = `$${(pagados.length * PRECIO_TURNO).toFixed(2)}`;
  cajaPagadosCount.textContent = pagados.length;
  cajaPendientesCount.textContent = pendientes.length;

  cajaPagadosList.innerHTML = pagados.length
    ? pagados.map(t => `<li>${t.turnCode} · Unidad ${t.unit} · ${t.driver} <span style="color: var(--text-muted);">(${t.invoice})</span></li>`).join('')
    : '<li style="color: var(--text-muted);">Ninguno</li>';

  cajaPendientesList.innerHTML = pendientes.length
    ? pendientes.map(t => `<li>${t.turnCode} · Unidad ${t.unit} · ${t.driver}</li>`).join('')
    : '<li style="color: var(--text-muted);">Ninguno</li>';
}

// AGREGADO (CAJA): cierra caja y reinicia lo recaudado a $0.00
// No borra los turnos: solo los marca como 'cerrado' para no contarlos de nuevo.
function cerrarCaja() {
  const all = getTurnsFromStorage();
  const pagados = all.filter(t => t.paid && !t.cerrado);

  if (pagados.length === 0) {
    alert('No hay recaudación para cerrar.');
    return;
  }

  const total = pagados.length * PRECIO_TURNO;
  if (!confirm(`¿Cerrar caja?\n\nPagos: ${pagados.length}\nTotal recaudado: $${total.toFixed(2)}\n\nLa recaudación se reiniciará a $0.00.`)) return;

  // Historial de cierres
  const cierres = JSON.parse(localStorage.getItem('coop_cierres')) || [];
  cierres.push({ fecha: new Date().toLocaleString(), pagos: pagados.length, total: total });
  localStorage.setItem('coop_cierres', JSON.stringify(cierres));

  pagados.forEach(t => { t.cerrado = true; });
  saveTurnsToStorage(all);
  renderTable();
}

btnCerrarCaja.addEventListener('click', cerrarCaja);

// Renderizado dinamico de la tabla
function renderTable() {
  turns = getTurnsFromStorage();
  renderCaja(); // AGREGADO (CAJA): refresca el panel de recaudación
  turnTableBody.innerHTML = '';

  if (turns.length === 0) {
    turnTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No hay socios registrados en la jornada actual.
        </td>
      </tr>
    `;
    totalCountBadge.textContent = '0 En Cola';
    return;
  }

  const currentTurn = getCurrentTurn();

  turns.forEach((turn) => {
    const tr = document.createElement('tr');

    let badgeClass = 'status-pending-pay';
    if (turn.status === 'Listo (En Cola)') badgeClass = 'status-ready';
    if (turn.status === 'En Cabecera') badgeClass = 'status-called';
    if (turn.status === 'Despachado') badgeClass = 'status-completed';

    let actionHtml = '';
    const isCurrent = currentTurn && String(turn.id) === String(currentTurn.id);

    if (turn.status === 'Despachado') {
      actionHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;">Finalizado (${turn.invoice})</span>`;
    } else if (!isCurrent) {
      actionHtml = `<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Esperando al ${currentTurn ? currentTurn.turnCode : ''}</span>`;
    } else if (!turn.paid) {
      actionHtml = `<button class="action-btn" onclick="selectForPayment('${turn.id}')" style="border-color: var(--danger); color: var(--danger);">Cobrar $65</button>`;
    } else if (turn.status === 'Listo (En Cola)') {
      actionHtml = `<button class="action-btn" onclick="changeStatus('${turn.id}', 'En Cabecera')">Llamar a Cabecera</button>`;
    } else if (turn.status === 'En Cabecera') {
      actionHtml = `<button class="action-btn" onclick="changeStatus('${turn.id}', 'Despachado')" style="background: var(--success); color: #000; border: none; font-weight: bold;">Despachar</button>`;
    }

    tr.innerHTML = `
      <td><strong>${isCurrent ? '▶ ' : ''}${turn.turnCode}</strong></td>
      <td>Unidad ${turn.unit}</td>
      <td>${turn.driver}</td>
      <td>${turn.time}</td>
      <td>${turn.paid ? `<span style="color: var(--success); font-weight: bold;">$65.00 OK</span>` : `<span style="color: var(--danger);">Pendiente</span>`}</td>
      <td><span class="status ${badgeClass}">${turn.status}</span></td>
      <td>${actionHtml}</td>
    `;

    turnTableBody.appendChild(tr);
  });

  try { lucide.createIcons(); } catch (e) {}

  const activeCount = turns.filter(t => t.status !== 'Despachado').length;
  totalCountBadge.textContent = `${activeCount} Unidades Activas`;
}

// AGREGADO (BroadcastChannel): reemplaza al antiguo listener 'storage'.
// Se ejecuta cuando OTRA pestaña (ej. registro.html) publica un mensaje.
canal.onmessage = (event) => {
  if (event.data && event.data.tipo === 'TURNOS_ACTUALIZADOS') {
    renderTable();
  }
};

// AGREGADO: cierra el canal al salir de la página para liberar recursos
window.addEventListener('beforeunload', () => canal.close());

document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  // CAMBIADO: antes era cada 1 segundo; ahora el canal actualiza al instante
  // y este intervalo (5 s) queda solo como respaldo de seguridad.
  setInterval(renderTable, 5000);
});