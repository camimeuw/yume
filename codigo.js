 function parsePrecio(precioStr) {
  if (!precioStr) return 0;
  let limpio = precioStr.trim();
  limpio = limpio.replace(/[.,]00$/, '');
  limpio = limpio.replace(/\D/g, '');
  return parseInt(limpio) || 0;
}

const urlGoogleSheets = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTTbC0Qd0Yga5Rm6Gb_QRJnTE1B4pc1mVtvEVhaUWPXrDKNtl9sBBgB-BUKmS5-1DfctEgIP0lo21Bf/pub?output=csv";

let productos = [];
let productosVisibles = [];
const numeroWhatsApp = "5493462338222";
let currentProductIndex = null;
let carrito = [];
let playing = false;

function getCampo(fila, nombreCampo) {
  const key = Object.keys(fila).find(k => k.trim().toLowerCase() === nombreCampo.toLowerCase());
  return key ? fila[key].trim() : "";
}

function getCampoParcial(fila, palabra) {
  const key = Object.keys(fila).find(k => k.trim().toLowerCase().includes(palabra.toLowerCase()));
  return key ? fila[key].trim() : "";
}

function esValorAfirmativo(valor) {
  const v = valor.trim().toLowerCase();
  return v === "si" || v === "sí" || v === "x" || v === "true" || v === "nuevo" || v === "1";
}

function cargarProductosDesdeExcel() {
  Papa.parse(urlGoogleSheets, {
    download: true,
    header: true,
    complete: function(resultados) {
      let datosLimpios = resultados.data.filter(fila => fila["Nombre del producto"] && fila["Nombre del producto"].trim() !== "");

      productos = datosLimpios.map(fila => {
        let imagenes = fila["Archivo de imagen"] ? fila["Archivo de imagen"].split(',').map(img => img.trim()) : [""];
        const precioDescuento = getCampo(fila, "Precio con descuento");
        const stock = getCampo(fila, "Stock disponible");
        return {
          nombre: fila["Nombre del producto"],
          precio: fila["Precio original"],
          precioDescuento: precioDescuento,
          img: imagenes[0],
          todasLasImagenes: imagenes,
          desc: fila["Detalle / Descripción del producto"],
          categoria: getCampo(fila, "Categoría") || "General",
          stock: stock,
          sinStock: stock !== "" && parsePrecio(stock) === 0,
          esNuevo: esValorAfirmativo(getCampoParcial(fila, "nuevo"))
        };
      });

      let categoriasUnicas = [...new Set(productos.map(p => p.categoria))];
      const menuContainer = document.getElementById("menuMobile");

      let htmlMenu = `<a href="#" onclick="filtrarPorCategoria('todo')"> ver todo</a>`;
      htmlMenu += categoriasUnicas.map(cat =>
        `<a href="#" onclick="filtrarPorCategoria('${cat}')">｡𖦹° ${cat.toLowerCase()}</a>`
      ).join('');
      htmlMenu += `<a href="#contacto" onclick="document.getElementById('menuMobile').classList.remove('abierto')"> contacto</a>`;
      menuContainer.innerHTML = htmlMenu;

      renderProductos(productos);
    }
  });
}

function filtrarPorCategoria(cat) {
  document.getElementById('menuMobile').classList.remove('abierto');
  if (cat === 'todo') {
    renderProductos(productos);
  } else {
    renderProductos(productos.filter(p => p.categoria === cat));
  }
  document.getElementById('tienda').scrollIntoView({ behavior: 'smooth' });
}

const PRODUCTOS_POR_PAGINA = 8;
let productosMostrados = 0;

function renderProductos(lista) {
  productosVisibles = lista || productos;
  productosMostrados = 0;
  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  document.getElementById("verMasBtn")?.remove();
  mostrarMasProductos();
}

function precioHTML(p) {
  if (p.precioDescuento && p.precioDescuento !== p.precio) {
    return `<span class="precio-original">${p.precio}</span> <span class="precio-descuento">${p.precioDescuento}</span>`;
  }
  return p.precio;
}

function crearCardProducto(p, i) {
  const card = document.createElement("div");
  card.className = "producto-card producto-nuevo";
  if (p.sinStock) card.classList.add('agotado');
  card.innerHTML = `
    <div class="card-imagen">
      ${p.esNuevo ? '<span class="tag-nuevo">nuevo ✦</span>' : ''}
      ${p.sinStock ? '<span class="tag-agotado">sin stock</span>' : ''}
      <img src="${p.img}" alt="${p.nombre}">
    </div>
    <p class="card-nombre">${p.nombre}</p>
    <p class="card-precio">${precioHTML(p)}</p>
    <button class="card-btn">ver detalle ✦</button>
  `;
  const img = card.querySelector('img');
  img.onload = () => img.classList.add('cargada');
  if (img.complete) img.classList.add('cargada');
  card.addEventListener("click", () => abrirProducto(i));
  return card;
}

function mostrarMasProductos() {
  const grid = document.getElementById("grid");
  const siguientes = productosVisibles.slice(productosMostrados, productosMostrados + PRODUCTOS_POR_PAGINA);
  const cardsNuevas = [];

  siguientes.forEach((p, idx) => {
    const i = productosMostrados + idx;
    const card = crearCardProducto(p, i);
    card.style.transitionDelay = (idx * 0.06) + "s";
    grid.appendChild(card);
    cardsNuevas.push(card);
  });

  productosMostrados += siguientes.length;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cardsNuevas.forEach(card => card.classList.remove('producto-nuevo'));
    });
  });

  const btnViejo = document.getElementById("verMasBtn");
  if (btnViejo) btnViejo.remove();

  if (productosMostrados < productosVisibles.length) {
    const btn = document.createElement("button");
    btn.id = "verMasBtn";
    btn.className = "cta-pixel ver-mas-btn";
    btn.textContent = "ver más ✦";
    btn.addEventListener("click", mostrarMasProductos);
    grid.insertAdjacentElement("afterend", btn);
  }
}
 let imagenActualIndex = 0;

function abrirProducto(i) {
  currentProductIndex = i;
  imagenActualIndex = 0;
  const p = productosVisibles[i];
  mostrarImagenPopup();
  document.getElementById("popupName").innerHTML = p.nombre + (p.esNuevo ? ' <span class="tag-nuevo tag-nuevo-popup">nuevo ✦</span>' : '');
  document.getElementById("popupPrice").innerHTML = precioHTML(p);
  document.getElementById("popupDesc").textContent = p.desc;
  document.getElementById("popupStock").textContent = p.sinStock ? 'sin stock ✦' : (p.stock ? `quedan ${p.stock} ✦` : '');
  document.getElementById("overlay").classList.add("open");
}

function mostrarImagenPopup() {
  const p = productosVisibles[currentProductIndex];
  const imgs = (p.todasLasImagenes && p.todasLasImagenes.length) ? p.todasLasImagenes : [p.img];
  const img = document.getElementById("popupImg");
  img.classList.remove('cargada');
  img.onload = () => img.classList.add('cargada');
  img.src = imgs[imagenActualIndex];
  img.alt = p.nombre;

  document.querySelector('.popup-img-wrapper').classList.toggle('tiene-galeria', imgs.length > 1);

  document.getElementById('popupDots').innerHTML = imgs.length > 1
    ? imgs.map((_, idx) => `<span class="popup-dot ${idx === imagenActualIndex ? 'activo' : ''}"></span>`).join('')
    : '';
}

function cambiarImagen(dir) {
  const p = productosVisibles[currentProductIndex];
  const imgs = (p.todasLasImagenes && p.todasLasImagenes.length) ? p.todasLasImagenes : [p.img];
  imagenActualIndex = (imagenActualIndex + dir + imgs.length) % imgs.length;
  mostrarImagenPopup();
}


document.getElementById("closePopup").addEventListener("click", () => {
  document.getElementById("overlay").classList.remove("open");
});
document.getElementById("overlay").addEventListener("click", (e) => {
  if (e.target.id === "overlay") document.getElementById("overlay").classList.remove("open");
});

const audioPlayer = document.getElementById('audioPlayer');

function formatTiempo(segundos) {
  if (!isFinite(segundos)) return '0:00';
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60).toString().padStart(2, '0');
  return `${min}:${seg}`;
}

function actualizarUITiempo() {
  const actual = formatTiempo(audioPlayer.currentTime);
  const total = formatTiempo(audioPlayer.duration);
  document.getElementById('mp3Tiempo').textContent = `${actual} / ${total}`;
  const porcentaje = audioPlayer.duration ? (audioPlayer.currentTime / audioPlayer.duration) * 100 : 0;
  document.getElementById('mp3Progreso').style.width = porcentaje + '%';
}

audioPlayer.addEventListener('loadedmetadata', actualizarUITiempo);
audioPlayer.addEventListener('timeupdate', actualizarUITiempo);
audioPlayer.addEventListener('ended', () => {
  playing = false;
  document.getElementById('play-btn').textContent = '▶';
  document.getElementById('ondas').classList.remove('activo');
});

function togglePlay() {
  playing = !playing;
  document.getElementById('play-btn').textContent = playing ? '■' : '▶';
  const ondas = document.getElementById('ondas');
  if (playing) {
    ondas.classList.add('activo');
    audioPlayer.play();
  } else {
    ondas.classList.remove('activo');
    audioPlayer.pause();
  }
}

function agregarAlCarrito(i) {
  const p = productosVisibles[i];
  carrito.push(p);
  renderCarrito();
  const icon = document.querySelector('.carrito-icon');
  icon.classList.remove('bounce');
  void icon.offsetWidth;
  icon.classList.add('bounce');
  document.getElementById("overlay").classList.remove("open");
}

function renderCarrito() {
  const cont = document.getElementById('carritoItems');
  const badge = document.getElementById('carritoBadge');
  const totalEl = document.getElementById('carritoTotal');
  badge.textContent = carrito.length;

  if (carrito.length === 0) {
    cont.innerHTML = '<p class="carrito-vacio">todavía no agregaste nada ✦</p>';
    totalEl.textContent = '';
    return;
  }

  cont.innerHTML = carrito.map((p, i) => `
    <div class="carrito-item-row">
      <img src="${p.img}" alt="${p.nombre}" class="carrito-item-img">
      <div class="carrito-item-info">
        <span class="carrito-item-nombre">${p.nombre}</span>
        <span class="carrito-item-precio">${p.precio}</span>
      </div>
      <button onclick="quitarDelCarrito(${i})">✕</button>
    </div>
  `).join('');

  let total = carrito.reduce((sum, p) => sum + parsePrecio(p.precio), 0);
  totalEl.textContent = 'total: $' + total.toLocaleString('es-AR');

  let mensaje = 'Hola! Quiero pedir:\n' + carrito.map(p => `- ${p.nombre} (${p.precio})`).join('\n');
  document.getElementById('carritoWA').href = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
}

function quitarDelCarrito(i) {
  carrito.splice(i, 1);
  renderCarrito();
}

function toggleCarrito() {
  document.getElementById('carritoPanel').classList.toggle('open');
}

cargarProductosDesdeExcel();
renderCarrito();

document.getElementById('botonCarrito').addEventListener('click', toggleCarrito);
document.getElementById('cerrarCarritoBtn').addEventListener('click', toggleCarrito);

const inicioCarga = Date.now();
const TIEMPO_MINIMO = 2000; // milisegundos que se queda visible como mínimo

window.addEventListener('load', () => {
  const transcurrido = Date.now() - inicioCarga;
  const esperar = Math.max(0, TIEMPO_MINIMO - transcurrido);
  setTimeout(() => {
    document.getElementById('dreamVeil').classList.add('oculto');
  }, esperar);
});