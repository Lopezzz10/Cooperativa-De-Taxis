document.addEventListener('DOMContentLoaded', () => {
  try { lucide.createIcons(); } catch (e) {}

  const publicArrivalForm = document.getElementById('publicArrivalForm');
  const unitNumberInput = document.getElementById('unitNumber');
  const driverNameInput = document.getElementById('driverName');
  const arrivalSuccess = document.getElementById('arrivalSuccess');
  const assignedTurnCode = document.getElementById('assignedTurnCode');

  publicArrivalForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const turns = JSON.parse(localStorage.getItem('coop_turns')) || [];
    
    // Obtener el siguiente contador de turnos
    let turnCounter = parseInt(localStorage.getItem('coop_turn_counter'), 10);
    if (!turnCounter || isNaN(turnCounter)) {
      turnCounter = turns.length > 0 ? turns.length + 1 : 1;
    }

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
    
    // Guardar en localStorage para sincronizar entre pestañas/pantallas
    localStorage.setItem('coop_turns', JSON.stringify(turns));
    localStorage.setItem('coop_turn_counter', (turnCounter + 1).toString());

    // Reiniciar formulario y mostrar confirmación
    publicArrivalForm.reset();
    assignedTurnCode.textContent = turnCode;
    arrivalSuccess.classList.remove('hidden');

    // Ocultar la confirmación tras 6 segundos
    setTimeout(() => {
      arrivalSuccess.classList.add('hidden');
    }, 6000);
  });
});