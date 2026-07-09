/**
 * BRASLAER SHOWROOM V2
 * MACHINE.JS - Inicializa o viewer 3D
 */

let viewer3D = null;

document.addEventListener("DOMContentLoaded", () => {
    carregarMaquina();
});

/**
 * Carregar máquina e inicializar viewer
 */
function carregarMaquina() {
    if (typeof machines === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("machine");

    if (!id || !machines[id]) {
        window.location = "../index.html";
        return;
    }

    const maquina = machines[id];

    document.title = maquina.nome + " | Braslaer";

    preencherInformacoes(maquina);
    preencherBeneficios(maquina);
    preencherGaleria(maquina);
    inicializarViewer3D(maquina);
}

/**
 * Inicializar o viewer 3D com Three.js
 */
function inicializarViewer3D(maquina) {
    // Verificar se Three.js está carregado
    if (typeof THREE === "undefined") {
        console.error("Three.js não foi carregado");
        mostrarErroViewer("Three.js não foi carregado");
        return;
    }

    // Verificar se GLTFLoader está disponível
    if (typeof THREE.GLTFLoader === "undefined") {
        console.error("GLTFLoader não foi carregado");
        mostrarErroViewer("GLTFLoader não foi carregado");
        return;
    }

    // Verificar se OrbitControls está disponível
    if (typeof THREE.OrbitControls === "undefined") {
        console.error("OrbitControls não foi carregado");
        mostrarErroViewer("OrbitControls não foi carregado");
        return;
    }

    try {
        viewer3D = new Viewer3D({
            container: "#viewer3D",
            loaderContainer: "#viewerLoader",
            backgroundColor: 0xffffff,
            enableAutoRotate: true
        });

        // Carregar modelo 3D
        viewer3D.loadModel(maquina.modelo3d, {
            scale: maquina.escala3d || 1,
            rotation: {
                x: 0,
                y: (maquina.rotacaoInicial || 0) * Math.PI / 180,
                z: 0
            },
            camera: maquina.camera
        }).catch(error => {
            console.error("Erro ao carregar modelo:", error);
            mostrarErroViewer("Erro ao carregar o modelo 3D da máquina");
        });

    } catch (error) {
        console.error("Erro ao inicializar Viewer3D:", error);
        mostrarErroViewer("Erro ao inicializar o visualizador 3D");
    }
}

/**
 * Preencher informações da máquina
 */
function preencherInformacoes(maquina) {
    set("machineCategory", maquina.categoria);
    set("machineName", maquina.nome);
    set("machineDescription", maquina.descricao);
    set("machineProduction", maquina.producao);
    set("machineWeight", maquina.peso);
    set("machineMotor", maquina.motor);
    set("machineVoltage", maquina.voltagem);
    set("machineDimensions", maquina.dimensoes);

    // Adicionar listeners aos botões
    const budgetBtn = document.getElementById("budgetButton");
    const catalogBtn = document.getElementById("catalogButton");

    if (budgetBtn) {
        budgetBtn.addEventListener("click", () => {
            solicitarOrcamento(maquina);
        });
    }

    if (catalogBtn) {
        catalogBtn.addEventListener("click", () => {
            baixarCatalogo(maquina);
        });
    }
}

/**
 * Preencher benefícios
 */
function preencherBeneficios(maquina) {
    const lista = document.getElementById("machineBenefits");
    if (!lista) return;

    lista.innerHTML = "";
    maquina.beneficios.forEach(item => {
        lista.innerHTML += `<li>${item}</li>`;
    });
}

/**
 * Preencher galeria
 */
function preencherGaleria(maquina) {
    const galeria = document.getElementById("galleryGrid");
    if (!galeria) return;

    galeria.innerHTML = "";
    maquina.galeria.forEach(imagem => {
        const img = document.createElement("img");
        img.src = "../" + imagem;
        img.alt = maquina.nome;
        img.loading = "lazy";
        img.addEventListener("click", () => abrirImagemEmFullscreen(img.src));
        galeria.appendChild(img);
    });
}

/**
 * Solicitar orçamento
 */
function solicitarOrcamento(maquina) {
    const message = `Olá! Gostaria de solicitar um orçamento para a máquina: ${maquina.nome}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappLink, "_blank");
}

/**
 * Baixar catálogo
 */
function baixarCatalogo(maquina) {
    if (maquina.catalogo) {
        window.open("../" + maquina.catalogo, "_blank");
    } else {
        alert("Catálogo não disponível para esta máquina");
    }
}

/**
 * Abrir imagem em fullscreen
 */
function abrirImagemEmFullscreen(src) {
    const modal = document.createElement("div");
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        cursor: pointer;
    `;

    const img = document.createElement("img");
    img.src = src;
    img.style.cssText = `
        max-width: 90vw;
        max-height: 90vh;
        object-fit: contain;
        border-radius: 12px;
    `;

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕";
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: 2px solid rgba(255, 255, 255, 0.5);
        color: white;
        font-size: 24px;
        cursor: pointer;
        transition: all 0.3s;
    `;

    closeBtn.addEventListener("mouseover", () => {
        closeBtn.style.background = "rgba(255, 255, 255, 0.3)";
    });

    closeBtn.addEventListener("mouseout", () => {
        closeBtn.style.background = "rgba(255, 255, 255, 0.2)";
    });

    const fecharModal = () => {
        modal.remove();
    };

    closeBtn.addEventListener("click", fecharModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) fecharModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") fecharModal();
    });

    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
}

/**
 * Mostrar erro no viewer
 */
function mostrarErroViewer(mensagem) {
    const loader = document.getElementById("viewerLoader");
    if (loader) {
        loader.innerHTML = `
            <div style="color: #d32f2f; font-weight: 700; text-align: center; padding: 20px;">
                <div style="font-size: 18px; margin-bottom: 10px;">⚠️ Erro</div>
                <div style="font-size: 14px;">${mensagem}</div>
                <div style="font-size: 12px; margin-top: 10px; color: #999;">Verifique o console para mais detalhes</div>
            </div>
        `;
    }
}

/**
 * Utilitário para definir conteúdo de elementos
 */
function set(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor || "--";
    }
}
