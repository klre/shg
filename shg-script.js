let markers = [];

let scale = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;

const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

const markerCache = [];

/* =====================================================
   LOAD MULTIPLE JSON FILES
   ===================================================== */

async function loadMarkers() {
  const files = ['AG', 'int', 'AV', 'contemp', 'feedback', 'tactile'];

  const results = await Promise.all(
    files.map(async type => {
      const res = await fetch(`data/${type}.json`);
      const data = await res.json();

      return data.map(item => ({
        ...item,
        type
      }));
    })
  );

  markers = results.flat();
}

/* =====================================================
   INIT
   ===================================================== */

$(document).ready(function () {
  const $img = $('.base-image');

  async function init() {
    await loadMarkers();        // wait for JSON
    renderMarkers();            // create DOM

    updatePositions();          // now safe

    setupZoom();
    setupPan();
    setupModals();
    setupMasterToggle();

    $('.marker-toggle').prop('checked', false);
    $('#toggle-all').prop('checked', false);
    $('.marker-toggle').trigger('change');
  }

  function startWhenReady() {
    if ($img[0].complete && $img[0].naturalWidth !== 0) {
      init();
    } else {
      $img.on('load', init);
    }
  }

  startWhenReady();

});

/* =====================================================
   RENDER
   ===================================================== */

function renderMarkers() {
  const $markersLayer = $('#markers-container');
  const $modalsLayer = $('.ui-layer');

  markers.forEach(marker => {
    const id = marker.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const topPct = parseFloat(marker.position.top);
    const leftPct = parseFloat(marker.position.left);

    markerCache.push({ id, topPct, leftPct });

    $markersLayer.append(`
      <div class="marker-wrapper"
           data-id="${id}"
           data-type="${marker.type}">
        <div class="marker marker-${marker.type}" data-target="${id}"></div>
        <div class="marker-label">${marker.name}</div>
      </div>
    `);

    $modalsLayer.append(`
      <div class="marker-modal" id="${id}">
        <h3>${marker.title}</h3>
        ${marker.content}
      </div>
    `);
  });
}

/* =====================================================
   TOGGLES
   ===================================================== */

$(document).on('change', '.marker-toggle', function () {
  const type = $(this).data('type');
  const visible = this.checked;

  $(`.marker-wrapper[data-type="${type}"]`)
    .toggle(visible);

  const allChecked =
    $('.marker-toggle').length ===
    $('.marker-toggle:checked').length;

  $('#toggle-all').prop('checked', allChecked);
});

/* =====================================================
   POSITIONING
   ===================================================== */

function updatePositions() {
  const $image = $('.base-image');

  const imgW = $image.width() * scale;
  const imgH = $image.height() * scale;

  markerCache.forEach(m => {
    const x = panX + (m.leftPct / 100) * imgW;
    const y = panY + (m.topPct / 100) * imgH;

    $(`.marker-wrapper[data-id="${m.id}"]`).css({
      transform: `translate(${x}px, ${y}px)`
    });

    const $modal = $('#' + m.id);
    if ($modal.is(':visible')) {

      const containerWidth = $('.image-container').width();
      const modalWidth = $modal.outerWidth();

      let modalLeft = x + 40;

      if (modalLeft + modalWidth > containerWidth) {
        modalLeft = x - modalWidth - 2;
      }

      $modal.css({
        left: modalLeft + 'px',
        top: y + 'px'
      });
    }
  });
}

/* =====================================================
   MAP TRANSFORM
   ===================================================== */

function applyTransform() {
  clampPan();

  $('.map-layer').css(
    'transform',
    `translate(${panX}px, ${panY}px) scale(${scale})`
  );

  updatePositions();
}

/* =====================================================
   PAN LIMITS
   ===================================================== */

function clampPan() {
  const $container = $('.image-container');
  const $image = $('.base-image');

  const cw = $container.width();
  const ch = $container.height();

  const iw = $image[0].naturalWidth * scale;
  const ih = $image[0].naturalHeight * scale;

  panX = Math.min(0, Math.max(cw - iw, panX));
  panY = Math.min(0, Math.max(ch - ih, panY));
}

/* =====================================================
   ZOOM
   ===================================================== */

function setupZoom() {
  $('#zoom-in').on('click', () => {
    scale = Math.min(scale + 0.2, MAX_SCALE);
    applyTransform();
  });

  $('#zoom-out').on('click', () => {
    scale = Math.max(scale - 0.2, MIN_SCALE);
    applyTransform();
  });

  $('#zoom-reset').on('click', () => {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  });

  $('.image-container').on('wheel', e => {
    e.preventDefault();
    scale += e.originalEvent.deltaY < 0 ? 0.1 : -0.1;
    scale = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
    applyTransform();
  });
}

/* =====================================================
   PAN
   ===================================================== */

function setupPan() {
  const $container = $('.image-container');

  $container.on('mousedown', e => {
    if (e.button !== 0 && e.button !== 2) return;
    if ($(e.target).closest('.marker').length) return;

    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    $container.css('cursor', 'grabbing');
  });

  $(document).on('mousemove', e => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyTransform();
  });

  function stopPan() {
    isPanning = false;
    $container.css('cursor', 'grab');
  }

  $(document).on('mouseup mouseleave blur dragstart', stopPan);
}

/* =====================================================
   MODALS
   ===================================================== */

function setupModals() {
  $('.image-container').on('click', '.marker', function (e) {
    e.stopPropagation();
    $('.marker-modal').hide();
    $('#' + $(this).data('target')).show();
    updatePositions();
  });

  $(document).on('click', () => {
    $('.marker-modal').hide();
  });
}

/* =====================================================
   MASTER TOGGLE
   ===================================================== */

function setupMasterToggle() {
  $(document).on('change', '#toggle-all', function () {
    const checked = this.checked;

    $('.marker-toggle').prop('checked', checked);
    $('.marker-toggle').trigger('change');
  });
}
