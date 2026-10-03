document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const unitInput = document.getElementById('unitInput');
  const driverInput = document.getElementById('driverInput');

  const unitError = document.getElementById('unitError');
  const driverError = document.getElementById('driverError');

  // REGEX: Solo números enteros mayores a 0
  const regexUnit = /^[1-9]\d*$/;

  // REGEX: Un nombre y un apellido (soporta tildes y Ñ/ñ)
  const regexDriver = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+(?:\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)$/;

  // --- VALIDACIÓN DE UNIDAD ---
  function validateUnit() {
    const value = unitInput.value.trim();

    if (value === '') {
      showError(unitInput, unitError, '⚠️ Por favor, ingrese el número de unidad.');
      return false;
    }

    if (!regexUnit.test(value)) {
      showError(unitInput, unitError, '⚠️ Debe ingresar solo números enteros válidos mayores a 0.');
      return false;
    }

    clearError(unitInput, unitError);
    return true;
  }

  // --- VALIDACIÓN DE CONDUCTOR ---
  function validateDriver() {
    const value = driverInput.value.trim();

    if (value === '') {
      showError(driverInput, driverError, '⚠️ Por favor, ingrese el nombre del socio/conductor.');
      return false;
    }

    if (!regexDriver.test(value)) {
      showError(driverInput, driverError, '⚠️ Ingrese exactamente UN nombre y UN apellido (Ej. Juan Pérez).');
      return false;
    }

    clearError(driverInput, driverError);
    return true;
  }

  // Muestra mensajes de error
  function showError(inputElement, errorElement, message) {
    inputElement.classList.add('invalid-input');
    errorElement.textContent = message;
  }

  // Limpia mensajes de error
  function clearError(inputElement, errorElement) {
    inputElement.classList.remove('invalid-input');
    errorElement.textContent = '';
  }

  // Evita la entrada inmediata de cualquier caracter no numérico en el campo Unidad
  unitInput.addEventListener('keypress', (e) => {
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  });

  // Validaciones dinámicas al escribir
  unitInput.addEventListener('input', validateUnit);
  driverInput.addEventListener('input', validateDriver);

  // --- PROCESAR ENVÍO ---
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const isUnitValid = validateUnit();
    const isDriverValid = validateDriver();

    if (!isUnitValid || !isDriverValid) {
      return;
    }

    // Obtener los turnos registrados
    const turns = JSON.parse(localStorage.getItem('coop_turns')) || [];

    // Generar formato de hora (HH:MM AM/PM)
    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Código de turno correlativo (Ej: T-001)
    const nextNumber = turns.length + 1;
    const turnCode = `T-${String(nextNumber).padStart(3, '0')}`;

    // Crear el nuevo objeto de turno
    const newTurn = {
      id: Date.now().toString(),
      turnCode: turnCode,
      unit: unitInput.value.trim(),
      driver: driverInput.value.trim(),
      time: formattedTime,
      paid: false,
      status: 'Pendiente Pago',
      invoice: null
    };

    // Guardar en localStorage
    turns.push(newTurn);
    localStorage.setItem('coop_turns', JSON.stringify(turns));

    // Confirmación y reseteo
    alert(`✅ ¡Registro Exitoso!\n\nTurno: ${newTurn.turnCode}\nUnidad: ${newTurn.unit}\nSocio: ${newTurn.driver}`);

    form.reset();
    clearError(unitInput, unitError);
    clearError(driverInput, driverError);
  });
});