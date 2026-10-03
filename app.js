let turns = JSON.parse(localStorage.getItem('coop_turns')) || [];
let turnCounter = turns.length > 0 ? turns.length + 1 : 1;

// NUEVO (fix): el contador de facturas se recalcula con las ya emitidas para no repetir números al recargar
let invoiceCounter = turns.reduce((max, t) => {
  const n = t.invoice ? parseInt(t.invoice.replace('FACT-', ''), 10) : 0;
  return n >= max ? n + 1 : max;
}, 1001);

let selectedTurnId = null;

const arrivalForm = document.getElementById('arrivalForm');
const unitNumberInput = document.getElementById('unitNumber');
const driverNameInput = document.getElementById('driverName');
const turnTableBody = document.getElementById('turnTableBody');
const totalCountBadge = document.getElementById('totalCount');

const paymentPrompt = document.getElementById('paymentPrompt');
const paymentDetails = document.getElementById('paymentDetails');
const payTurnCode = document.getElementById('payTurnCode');
const payUnit = document.getElementById('payUnit');
const payDriver = document.getElementById('payDriver');
const btnConfirmPay = document.getElementById('btnConfirmPay');

// NUEVO: devuelve el turno que corresponde atender (el más antiguo no despachado).
// Como "turns" se llena en orden de llegada, el primero que no esté despachado es el actual.
function getCurrentTurn() {
  return turns.find(t => t.status !== 'Despachado') || null;
}

// NUEVO: valida que el turno indicado sea el actual en la cola; si no, avisa y bloquea.
function isCurrentTurn(id) {
  const current = getCurrentTurn();
  if (current && current.id !== id) {
    alert(`⚠️ ORDEN DE COLA: Primero debe atender el turno ${current.turnCode} antes de operar con otro.`);
    return false;
  }
  return true;
}

// 1. Registro de llegada del socio
arrivalForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const unit = unitNumberInput.value.trim();
  const driver = driverNameInput.value.trim();
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const turnCode = `T-${String(turnCounter).padStart(3, '0')}`;

  const newTurn = {
    id: Date.now(),
    turnCode: turnCode,
    unit: unit,
    driver: driver,
    time: time,
    paid: false,
    invoice: null,
    status: 'Pendiente Pago'
  };

  turns.push(newTurn);
  turnCounter++;
  arrivalForm.reset();
  renderTable();
});

// Seleccionar socio para pagar en el panel del gerente
function selectForPayment(id) {
  const turn = turns.find(t => t.id === id);
  if (!turn) return;

  // NUEVO: no se puede cobrar a un turno si hay uno anterior sin atender
  if (!isCurrentTurn(id)) return;

  selectedTurnId = id;
  payTurnCode.textContent = turn.turnCode;
  payUnit.textContent = `Unidad ${turn.unit}`;
  payDriver.textContent = turn.driver;

  paymentPrompt.classList.add('hidden');
  paymentDetails.classList.remove('hidden');
}

// 2. El Gerente confirma el pago de $65
btnConfirmPay.addEventListener('click', () => {
  if (!selectedTurnId) return;

  // NUEVO: revalidar el orden de la cola antes de cobrar
  if (!isCurrentTurn(selectedTurnId)) return;

  const turn = turns.find(t => t.id === selectedTurnId);
  if (turn) {
    turn.paid = true;
    turn.invoice = `FACT-${invoiceCounter}`;
    turn.status = 'Listo (En Cola)';
    invoiceCounter++;

    selectedTurnId = null;
    paymentDetails.classList.add('hidden');
    paymentPrompt.classList.remove('hidden');
    paymentPrompt.textContent = "¡Pago registrado con éxito! Seleccione otro socio si es necesario.";

    renderTable();
  }
});

// Cambiar estados del turno con validación de regla estricta
function changeStatus(id, newStatus) {
  const targetTurn = turns.find(t => t.id === id);
  if (!targetTurn) return;

  // NUEVO: solo se puede operar el turno que le corresponde en la cola
  if (!isCurrentTurn(id)) return;

  if (newStatus === 'En Cabecera') {
    const activeOnHeader = turns.find(t => t.status === 'En Cabecera');
    if (activeOnHeader) {
      alert("⚠️ REGLA OPERATIVA: Ya hay un turno en cabecera en curso. Debe despacharlo antes de llamar a otro.");
      return;
    }
  }

  targetTurn.status = newStatus;
  renderTable();
}

// Renderizar tabla y sincronizar con localStorage
function renderTable() {
  localStorage.setItem('coop_turns', JSON.stringify(turns));
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

  // NUEVO: turno que corresponde atender ahora
  const currentTurn = getCurrentTurn();

  turns.forEach((turn) => {
    const tr = document.createElement('tr');

    let badgeClass = 'status-pending-pay';
    if (turn.status === 'Listo (En Cola)') badgeClass = 'status-ready';
    if (turn.status === 'En Cabecera') badgeClass = 'status-called';
    if (turn.status === 'Despachado') badgeClass = 'status-completed';

    let actionHtml = '';
    if (turn.status === 'Despachado') {
      actionHtml = `<span style="color: var(--text-muted); font-size: 0.75rem;">Finalizado (${turn.invoice})</span>`;
    } else if (currentTurn && turn.id !== currentTurn.id) {
      // NUEVO: turnos posteriores quedan bloqueados hasta que se atienda el anterior
      actionHtml = `<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">Esperando al ${currentTurn.turnCode}</span>`;
    } else if (!turn.paid) {
      actionHtml = `<button class="action-btn" onclick="selectForPayment(${turn.id})" style="border-color: var(--danger); color: var(--danger);">Cobrar $65</button>`;
    } else if (turn.status === 'Listo (En Cola)') {
      actionHtml = `<button class="action-btn" onclick="changeStatus(${turn.id}, 'En Cabecera')">Llamar a Cabecera</button>`;
    } else if (turn.status === 'En Cabecera') {
      actionHtml = `<button class="action-btn" onclick="changeStatus(${turn.id}, 'Despachado')" style="background: var(--success); color: #000; border: none;">Despachar</button>`;
    }

    // NUEVO: marcar con ▶ el turno actual
    const isCurrent = currentTurn && turn.id === currentTurn.id;

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

  lucide.createIcons();

  const activeCount = turns.filter(t => t.status !== 'Despachado').length;
  totalCountBadge.textContent = `${activeCount} Unidades Activas`;
}

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  renderTable();
});