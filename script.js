document.getElementById("uploadForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    // Obtener el campo de entrada de archivos y la opción de reemplazo
    const filesInput = document.getElementById("files");
    const replaceCheckbox = document.getElementById("replace");

    // Validar que haya archivos seleccionados
    if (filesInput.files.length === 0) {
        showAlert("Por favor, selecciona al menos un archivo para subir.", "warning");
        return;
    }

    // Mostrar la animación de carga
    const loadingSpinner = document.getElementById("loadingSpinner");
    loadingSpinner.style.display = "block";

    const formData = new FormData();
    for (const file of filesInput.files) {
        formData.append("files", file);
    }
    // Añadir el valor del checkbox de reemplazo al formulario
    formData.append("replace", replaceCheckbox.checked);

    try {
        // Realizar la solicitud al backend
        const response = await fetch("http://127.0.0.1:8000/upload_files/", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        loadingSpinner.style.display = "none";

        // Verificar respuesta del servidor
        if (response.ok) {
            showAlert(result.message, "success");
            if (result.duplicates && result.duplicates.length > 0) {
                showAlert(`Archivos duplicados: ${result.duplicates.join(", ")}`, "warning", 10000);
            }
            // Limpiar el campo de archivos después de la subida exitosa
            filesInput.value = "";
            
        } else {
            showAlert(`Error: ${result.detail || "Ocurrió un error desconocido."}`, "danger");
        }
    } catch (error) {
        showAlert(`Error de conexión: ${error.message}`, "danger");
        loadingSpinner.style.display = "none"; // Ocultar el spinner si hay error
    }
});

document.getElementById("deleteButton").addEventListener("click", async () => {
    // Mostrar animación de carga
    const loadingSpinner = document.getElementById("loadingSpinner");
    loadingSpinner.style.display = "block";

    try {
        const response = await fetch("http://127.0.0.1:8000/delete_files/", {
            method: "DELETE",
        });

        const result = await response.json();
        loadingSpinner.style.display = "none";
        showAlert(result.message, response.ok ? "success" : "danger");
    } catch (error) {
        showAlert(`Error de conexión: ${error.message}`, "danger");
        loadingSpinner.style.display = "none"; // Ocultar el spinner si hay error
    }
});

// Función para mostrar alertas con un máximo de tres alertas visibles
function showAlert(message, type, time = 5000) {
    const messageDiv = document.getElementById("message");
    
    // Verificar el número de alertas activas
    const existingAlerts = messageDiv.getElementsByClassName("alert");
    if (existingAlerts.length >= 2) {
        // Si hay 3 o más alertas, elimina la primera (la más antigua)
        existingAlerts[0].classList.remove("show");
        existingAlerts[0].classList.add("hide");
        setTimeout(() => existingAlerts[0].remove(), 500); // Espera a que termine la animación
    }

    // Crear la nueva alerta
    const alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = "alert";
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" aria-label="Close"></button>
    `;
    
    // Agregar funcionalidad al botón de cierre
    alert.querySelector(".btn-close").addEventListener("click", () => {
        alert.classList.remove("show");
        alert.classList.add("hide");
        setTimeout(() => alert.remove(), 500); // Espera a que termine la animación antes de eliminar
    });

    // Añadir la nueva alerta al contenedor
    messageDiv.appendChild(alert);

    // Cerrar automáticamente después de 'time' milisegundos
    setTimeout(() => {
        if (alert.classList.contains("show")) {  // Solo cerrar si está visible
            alert.classList.remove("show");
            alert.classList.add("hide");
            setTimeout(() => alert.remove(), 500); // Espera a que termine la animación antes de eliminar
        }
    }, time);
}


document.getElementById("processButton").addEventListener("click", async () => {
    const requisitosInput = document.getElementById("requisitosInput").value.trim();
    const processingSpinner = document.getElementById("processingSpinner");
    const processingMessage = document.getElementById("processingMessage");

    if (!requisitosInput) {
        showAlert("El campo de requisitos no puede estar vacío.", "warning");
        return;
    }

    // Mostrar el spinner y limpiar mensajes previos
    processingSpinner.style.display = "block";
    processingMessage.innerHTML = "";

    try {
        // Inicia el procesamiento enviando la solicitud POST
        const response = await fetch("http://127.0.0.1:8000/procesar/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requisitos: requisitosInput })
        });

        // Verifica si la respuesta es exitosa
        if (!response.ok) {
            const errorData = await response.json();
            showAlert(`Error: ${errorData.detail}`, "danger");
            processingSpinner.style.display = "none";
            return;
        }

        // Realiza llamadas periódicas al endpoint de estado
        const intervalId = setInterval(async () => {
            try {
                const estadoResponse = await fetch("http://127.0.0.1:8000/estado_proceso/");
                const estadoData = await estadoResponse.json();

                // Verifica si el proceso ha terminado
                const lastMessage = estadoData.estado_proceso[estadoData.estado_proceso.length - 1];
                if (lastMessage === "Proceso completado.") {
                    clearInterval(intervalId); // Detiene las solicitudes periódicas
                    processingSpinner.style.display = "none";
                    processingMessage.innerHTML = "<p>Proceso completado.</p>";
                    document.getElementById("showResultsButton").style.display = "inline-block";
                    return;
                }

                // Actualiza el mensaje de procesamiento en tiempo real
                processingMessage.innerHTML = `<p>${lastMessage}</p>`;
            } catch (estadoError) {
                clearInterval(intervalId);
                showAlert(`Error al obtener el estado del proceso: ${estadoError.message}`, "danger");
                processingSpinner.style.display = "none";
            }
        }, 1000); // Llama al endpoint de estado cada segundo
    } catch (error) {
        showAlert(`Error de conexión: ${error.message}`, "danger");
        processingSpinner.style.display = "none";
    }
});



document.getElementById("showResultsButton").addEventListener("click", async () => {
    const resultadosContainer = document.getElementById("resultados-container");
    resultadosContainer.innerHTML = ""; // Limpiar resultados anteriores

    try {
        const response = await fetch("http://127.0.0.1:8000/mostrar_resultados/");
        const data = await response.json();

        console.log(data); // Debug: revisar la estructura de la respuesta

        // Verificar que data.resultados existe y es un arreglo
        if (response.ok && Array.isArray(data.resultados)) {
            data.resultados.forEach((resultado, index) => {
                // Crear etiquetas dinámicas para cada requisito
                const labels = resultado.requisitos_validados.map((_, i) => `Req${i + 1}`);

                // Crear card para cada resultado
                const card = document.createElement("div");
                card.className = "card col-md-4";
                card.innerHTML = `
                    <div class="card-header">${resultado.nombre}</div>
                    <div class="card-body">
                        <canvas id="radarChart${index}" width="200" height="200"></canvas>
                    </div>
                `;
                resultadosContainer.appendChild(card);

                // Crear gráfico de radar con Chart.js
                const ctx = document.getElementById(`radarChart${index}`).getContext("2d");
                new Chart(ctx, {
                    type: "radar",
                    data: {
                        labels: labels, // Etiquetas generadas dinámicamente
                        datasets: [{
                            label: "Requisitos",
                            data: resultado.requisitos_validados,
                            fill: true,
                            backgroundColor: "rgba(54, 162, 235, 0.2)",
                            borderColor: "rgba(54, 162, 235, 1)",
                            pointBackgroundColor: "rgba(54, 162, 235, 1)"
                        }]
                    },
                    options: {
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 5
                            }
                        }
                    }
                });
            });
        } else {
            showAlert("No hay resultados disponibles o la estructura de datos es incorrecta.", "danger");
        }
    } catch (error) {
        showAlert(`Error de conexión: ${error.message}`, "danger");
    }
});
