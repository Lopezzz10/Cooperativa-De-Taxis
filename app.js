let turns = [];
let selectedTurnId = null;

// Carga dinámica de jsPDF desde CDN para generación de PDFs
if (!window.jspdf) {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  document.head.appendChild(script);
}

// BroadcastChannel: canal de comunicación entre pestañas
const canal = new BroadcastChannel('coop_turns_channel');

// Obtener datos actualizados directamente de localStorage
function getTurnsFromStorage() {
  return JSON.parse(localStorage.getItem('coop_turns')) || [];
}

// Guardar datos y actualizar la referencia local
function saveTurnsToStorage(updatedTurns) {
  localStorage.setItem('coop_turns', JSON.stringify(updatedTurns));
  turns = updatedTurns;

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
    // CAMBIADO: alert() nativo -> modal personalizado
    mostrarAlerta({
      tipo: 'advertencia',
      titulo: 'Orden de cola',
      mensaje: `Primero debe atender el turno ${current.turnCode} antes de operar con otro.`
    });
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

// --- FUNCIÓN: GENERAR FACTURA EN PDF ($65) ---
function generarFacturaPDF(turn) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    // CAMBIADO: alert() nativo -> modal personalizado
    mostrarAlerta({
      tipo: 'error',
      titulo: 'Error al generar PDF',
      mensaje: 'No se pudo cargar la librería PDF. Intente de nuevo.'
    });
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 130] // Formato recibo/ticket impreso
  });

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("COOP. DE TRANSPORTES EN TAXIS 146", 40, 10, { align: "center" });
  doc.setFontSize(8);
  doc.text('"EL TRANSITO DE CHILLOGALLO"', 40, 14, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text("RUC: 1791234567001", 40, 18, { align: "center" });
  doc.text("--------------------------------------------------", 40, 22, { align: "center" });

  // Datos de la Factura
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`COMPROBANTE DE PAGO: ${turn.invoice}`, 10, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Fecha/Hora: ${new Date().toLocaleString()}`, 10, 33);
  doc.text(`Turno N°: ${turn.turnCode}`, 10, 38);
  doc.text("--------------------------------------------------", 40, 42, { align: "center" });

  // Datos del Socio y Unidad
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE / SOCIO:", 10, 48);
  doc.setFont("helvetica", "normal");
  doc.text(`Socio: ${turn.driver}`, 10, 54);
  doc.text(`Unidad: N° ${turn.unit}`, 10, 60);
  doc.text("--------------------------------------------------", 40, 64, { align: "center" });

  // Detalle del Pago
  doc.setFont("helvetica", "bold");
  doc.text("CONCEPTO", 10, 70);
  doc.text("VALOR", 65, 70, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("Cuota de Turno Operativo", 10, 76);
  doc.text("$65.00", 65, 76, { align: "right" });

  doc.text("--------------------------------------------------", 40, 82, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL PAGADO:", 10, 88);
  doc.text("$65.00", 65, 88, { align: "right" });

  // Pie de página
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("¡Gracias por su pago puntual!", 40, 98, { align: "center" });
  doc.text("Guardar este comprobante", 40, 102, { align: "center" });

  // Guardar e imprimir PDF
  doc.save(`${turn.invoice}_Unidad_${turn.unit}.pdf`);
}

// Confirmar cobro de $65 y autorizar turno
btnConfirmPay.addEventListener('click', () => {
  if (!selectedTurnId) return;
  if (!isCurrentTurn(selectedTurnId)) return;

  const currentTurns = getTurnsFromStorage();
  const turnIndex = currentTurns.findIndex(t => String(t.id) === String(selectedTurnId));

  if (turnIndex !== -1) {
    let invoiceCounter = getInvoiceCounter();
    const invoiceNum = `FACT-${invoiceCounter}`;
    
    currentTurns[turnIndex].paid = true;
    currentTurns[turnIndex].invoice = invoiceNum;
    currentTurns[turnIndex].status = 'Listo (En Cola)';

    saveTurnsToStorage(currentTurns);

    // Generar Factura en PDF para el socio
    generarFacturaPDF(currentTurns[turnIndex]);

    selectedTurnId = null;
    paymentDetails.classList.add('hidden');
    paymentPrompt.classList.remove('hidden');
    paymentPrompt.textContent = "¡Pago registrado con éxito! Factura generada.";

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
      // CAMBIADO: alert() nativo -> modal personalizado
      mostrarAlerta({
        tipo: 'advertencia',
        titulo: 'Regla operativa',
        mensaje: 'Ya hay un turno en cabecera en curso. Debe despacharlo antes de llamar a otro.'
      });
      return;
    }
  }

  currentTurns[turnIndex].status = newStatus;
  saveTurnsToStorage(currentTurns);
  renderTable();
}

// Panel de recaudación (Caja)
const PRECIO_TURNO = 65;
const cajaTotal = document.getElementById('cajaTotal');
const cajaPagadosCount = document.getElementById('cajaPagadosCount');
const cajaPendientesCount = document.getElementById('cajaPendientesCount');
const cajaPagadosList = document.getElementById('cajaPagadosList');
const cajaPendientesList = document.getElementById('cajaPendientesList');
const btnCerrarCaja = document.getElementById('btnCerrarCaja');

function renderCaja() {
  const all = getTurnsFromStorage();
  const pagados = all.filter(t => t.paid && !t.cerrado);
  const pendientes = all.filter(t => !t.paid);

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

// --- FUNCIÓN: GENERAR REPORTE DE CIERRE DE CAJA EN PDF ---
function generarCierreCajaPDF(pagados, total) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const fechaActual = new Date().toLocaleString();

  // Encabezado principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("COOP. DE TRANSPORTES EN TAXIS N° 146", 105, 18, { align: "center" });
  doc.setFontSize(12);
  doc.text('"EL TRÁNSITO DE CHILLOGALLO"', 105, 25, { align: "center" });
  
  doc.setFontSize(14);
  doc.text("REPORTE OFICIAL DE CIERRE DE CAJA", 105, 35, { align: "center" });

  // Información General
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha y Hora de Cierre: ${fechaActual}`, 14, 45);
  doc.text(`Total Turnos Cobrados: ${pagados.length}`, 14, 51);

  // Recuadro del Total Recaudado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setFillColor(240, 240, 240);
  doc.rect(14, 57, 182, 14, 'F');
  doc.text(`TOTAL GENERAL RECAUDADO: $${total.toFixed(2)} USD`, 20, 66);

  // Tabla de desglose
  doc.setFontSize(11);
  doc.text("DETALLE DE PAGOS RECAUDADOS", 14, 80);

  doc.setFontSize(9);
  doc.setFillColor(220, 220, 220);
  doc.rect(14, 84, 182, 8, 'F');
  doc.text("Turno", 18, 89);
  doc.text("Unidad", 45, 89);
  doc.text("Socio / Conductor", 80, 89);
  doc.text("N° Factura", 140, 89);
  doc.text("Monto", 180, 89, { align: "right" });

  let y = 98;
  doc.setFont("helvetica", "normal");

  pagados.forEach((t, index) => {
    if (y > 270) { // Salto de página
      doc.addPage();
      y = 20;
    }
    doc.text(t.turnCode || '', 18, y);
    doc.text(`Unidad ${t.unit}`, 45, y);
    doc.text(t.driver || '', 80, y);
    doc.text(t.invoice || 'FACT-000', 140, y);
    doc.text("$65.00", 180, y, { align: "right" });
    
    doc.setDrawColor(230, 230, 230);
    doc.line(14, y + 2, 196, y + 2);
    y += 8;
  });

  // Firmas
  y += 20;
  if (y > 260) { doc.addPage(); y = 40; }

  doc.line(30, y, 80, y);
  doc.text("Gerencia / Receptación", 55, y + 5, { align: "center" });

  doc.line(120, y, 170, y);
  doc.text("Auditoría / Control", 145, y + 5, { align: "center" });

  // Guardar archivo PDF
  const fechaLimpia = fechaActual.replace(/[/,:\s]/g, '_');
  doc.save(`Cierre_Caja_${fechaLimpia}.pdf`);
}

// Cierra caja, genera el PDF de recaudación y reinicia el total a $0.00
// CAMBIADO: ahora es async para esperar la respuesta del modal de confirmación
async function cerrarCaja() {
  const all = getTurnsFromStorage();
  const pagados = all.filter(t => t.paid && !t.cerrado);

  if (pagados.length === 0) {
    mostrarAlerta({
      tipo: 'info',
      titulo: 'Caja vacía',
      mensaje: 'No hay recaudación para cerrar.'
    });
    return;
  }

  const total = pagados.length * PRECIO_TURNO;
  // CAMBIADO: confirm() nativo -> modal de confirmación personalizado
  const confirmado = await confirmarAccion({
    titulo: '¿Cerrar caja?',
    mensaje: `Pagos registrados: ${pagados.length}\nTotal recaudado: $${total.toFixed(2)}\n\nSe generará el reporte en PDF y la recaudación volverá a $0.00.`,
    textoConfirmar: 'Cerrar caja'
  });
  if (!confirmado) return;

  // Generar reporte en PDF
  generarCierreCajaPDF(pagados, total);

  // Historial de cierres
  const cierres = JSON.parse(localStorage.getItem('coop_cierres')) || [];
  cierres.push({ fecha: new Date().toLocaleString(), pagos: pagados.length, total: total });
  localStorage.setItem('coop_cierres', JSON.stringify(cierres));

  pagados.forEach(t => { t.cerrado = true; });
  saveTurnsToStorage(all);
  renderTable();
}

btnCerrarCaja.addEventListener('click', cerrarCaja);

// Renderizado dinámico de la tabla
function renderTable() {
  turns = getTurnsFromStorage();
  renderCaja();
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

// Escuchador BroadcastChannel
canal.onmessage = (event) => {
  if (event.data && event.data.tipo === 'TURNOS_ACTUALIZADOS') {
    renderTable();
  }
};

window.addEventListener('beforeunload', () => canal.close());

document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  setInterval(renderTable, 5000);
});