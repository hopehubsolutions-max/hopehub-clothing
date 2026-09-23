(function () {
  "use strict";

  document.getElementById("year").textContent = new Date().getFullYear();

  var money = function (n) { return "M" + n.toFixed(2); };

  var PRODUCTS = [];
  var CONTENT = {};

  /* ---------------- STATE ---------------- */
  var selection = {}; // productId -> {color, size, qty}
  var cart = [];
  try {
    var saved = localStorage.getItem("hopehub_cart");
    if (saved) cart = JSON.parse(saved);
  } catch (e) { cart = []; }

  function saveCart() {
    try { localStorage.setItem("hopehub_cart", JSON.stringify(cart)); } catch (e) {}
  }

  /* ---------------- LOAD DATA ---------------- */
  Promise.all([
    fetch("data/products.json").then(function (r) { return r.json(); }),
    fetch("data/content.json").then(function (r) { return r.json(); })
  ]).then(function (results) {
    PRODUCTS = results[0].items || [];
    CONTENT = results[1] || {};
    init();
  }).catch(function (err) {
    console.error("Failed to load site data", err);
    var grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = '<p style="color:#9d9890;font-size:13px;">Could not load the catalog. If you just opened this file directly, run it through a local server or your Netlify deploy instead — browsers block fetch() on file:// links.</p>';
  });

  function init() {
    renderContent();
    renderMarquee();
    renderTabs();
    renderGrid();
    renderCart();
    renderLookbook();
    bindGlobalUI();
  }

  /* ---------------- CONTENT (editable copy) ---------------- */
  function renderContent() {
    setText("heroEyebrow", CONTENT.hero_eyebrow);
    setText("heroSesotho", '“' + CONTENT.hero_sesotho + '”');
    setText("heroSub", CONTENT.hero_sub);
    setHTML("storyP1", CONTENT.story_paragraph_1);
    setHTML("storyP2", CONTENT.story_paragraph_2);
    setText("policyLine", CONTENT.delivery_policy);

    var reachGrid = document.getElementById("reachGrid");
    reachGrid.innerHTML =
      '<a class="reach-tile" href="https://wa.me/' + CONTENT.whatsapp_orders + '" target="_blank" rel="noopener">' +
        '<span class="k">WhatsApp &middot; Orders &amp; Assistance</span>' +
        '<span class="v">' + CONTENT.whatsapp_orders_display + '</span>' +
        '<span class="d">Order questions, sizing, fabric care.</span>' +
      '</a>' +
      '<a class="reach-tile" href="https://wa.me/' + CONTENT.whatsapp_manager + '" target="_blank" rel="noopener">' +
        '<span class="k">WhatsApp &middot; Manager</span>' +
        '<span class="v">' + CONTENT.whatsapp_manager_display + '</span>' +
        '<span class="d">Wholesale, collabs, press.</span>' +
      '</a>' +
      '<a class="reach-tile" href="mailto:' + CONTENT.email + '">' +
        '<span class="k">Email</span>' +
        '<span class="v" style="font-size:16px;">' + CONTENT.email + '</span>' +
        '<span class="d">Everything else.</span>' +
      '</a>';

    document.getElementById("pay-mpesa").innerHTML =
      '<div class="pay-row"><span>M-Pesa number</span><b>' + CONTENT.payment_mpesa_number + '</b></div>' +
      '<div class="pay-row"><span>Account name</span><b>' + CONTENT.payment_mpesa_name + '</b></div>' +
      '<button class="copy-btn" data-copy="' + CONTENT.payment_mpesa_number_raw + '">Copy number</button>';
    document.getElementById("pay-ecocash").innerHTML =
      '<div class="pay-row"><span>EcoCash number</span><b>' + CONTENT.payment_ecocash_number + '</b></div>' +
      '<button class="copy-btn" data-copy="' + CONTENT.payment_ecocash_number_raw + '">Copy number</button>';
    document.getElementById("pay-bank").innerHTML =
      '<div class="pay-row"><span>Bank</span><b>' + CONTENT.payment_bank_name + '</b></div>' +
      '<div class="pay-row"><span>Account no.</span><b>' + CONTENT.payment_bank_account + '</b></div>' +
      '<div class="pay-row"><span>Account name</span><b>' + CONTENT.payment_bank_account_name + '</b></div>' +
      '<div class="pay-row"><span>Branch</span><b>' + CONTENT.payment_bank_branch + '</b></div>' +
      '<button class="copy-btn" data-copy="' + CONTENT.payment_bank_account + '">Copy account no.</button>';

    document.querySelectorAll(".copy-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var val = this.dataset.copy;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(val).then(function () { showToast("Copied: " + val); }).catch(function () { showToast(val); });
        } else {
          showToast(val);
        }
      });
    });
  }

  function setText(id, val) { var el = document.getElementById(id); if (el && val != null) el.textContent = val; }
  function setHTML(id, val) { var el = document.getElementById(id); if (el && val != null) el.innerHTML = val; }

  /* ---------------- MARQUEE ---------------- */
  function renderMarquee() {
    var items = ["Made In The Maloti Highlands", "Hand-Finished", "Limited Runs", "Setso Le Botle Ba Rona", "Heavy Cotton · 100%"];
    var track = document.getElementById("marqueeTrack");
    var html = "";
    for (var r = 0; r < 2; r++) {
      items.forEach(function (t) { html += "<span>" + t + " <b>&middot;</b></span>"; });
    }
    track.innerHTML = html;
  }

  /* ---------------- TABS ---------------- */
  var activeCat = "All";
  function renderTabs() {
    var categories = ["All"].concat(PRODUCTS.map(function (p) { return p.cat; }).filter(function (v, i, a) { return a.indexOf(v) === i; }));
    var tabs = document.getElementById("tabs");
    tabs.innerHTML = "";
    categories.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "tab" + (c === activeCat ? " active" : "");
      b.textContent = c;
      b.addEventListener("click", function () { activeCat = c; renderTabs(); renderGrid(); });
      tabs.appendChild(b);
    });
  }

  /* ---------------- PRODUCT GRID ---------------- */
  function getSel(id) {
    if (!selection[id]) {
      var p = PRODUCTS.find(function (x) { return x.id === id; });
      selection[id] = { color: p.colors[0].n, size: p.sizes[0], qty: 1 };
    }
    return selection[id];
  }

  function imageFor(p, colorName) {
    if (p.colorImages && p.colorImages.length) {
      var match = p.colorImages.find(function (ci) { return ci.color === colorName; });
      if (match) return match.image;
    }
    return p.image;
  }

  function renderGrid() {
    var grid = document.getElementById("productGrid");
    grid.innerHTML = "";
    var list = activeCat === "All" ? PRODUCTS : PRODUCTS.filter(function (p) { return p.cat === activeCat; });

    list.forEach(function (p) {
      var sel = getSel(p.id);
      var img = imageFor(p, sel.color);

      var card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        '<div class="card-media">' +
          (p.badge ? '<span class="card-badge">' + p.badge + "</span>" : "") +
          '<img id="img-' + p.id + '" src="' + img + '" alt="' + p.name + '">' +
        "</div>" +
        '<div class="card-body">' +
          '<div class="card-top">' +
            "<div><div class=\"card-name\">" + p.name + '</div><div class="card-fabric">' + p.fabric + "</div></div>" +
            '<div class="card-price">' + money(p.price) + "</div>" +
          "</div>" +
          '<button class="story-toggle" data-story="' + p.id + '">The story ▾</button>' +
          '<p class="card-story" id="story-' + p.id + '">' + p.story + "</p>" +
          "<div>" +
            '<div class="field-label" style="margin-bottom:8px;" id="colorlabel-' + p.id + '">Colour — ' + sel.color + "</div>" +
            '<div class="swatches" data-swatches="' + p.id + '"></div>' +
          "</div>" +
          (p.sizes.length > 1 || p.sizes[0] !== "One Size" ? (
          "<div>" +
            '<div class="field-label" style="margin-bottom:8px;">Size</div>' +
            '<div class="sizes" data-sizes="' + p.id + '"></div>' +
          "</div>") : "") +
          '<div class="qty-row">' +
            '<div class="field-label">Qty</div>' +
            '<button class="qty-btn" data-qtyminus="' + p.id + '">−</button>' +
            '<span id="qtyval-' + p.id + '">' + sel.qty + "</span>" +
            '<button class="qty-btn" data-qtyplus="' + p.id + '">+</button>' +
          "</div>" +
          '<button class="add-btn" data-add="' + p.id + '">Add to Cart</button>' +
        "</div>";
      grid.appendChild(card);

      var swatchWrap = card.querySelector('[data-swatches="' + p.id + '"]');
      p.colors.forEach(function (c) {
        var s = document.createElement("button");
        s.className = "swatch" + (c.n === sel.color ? " selected" : "");
        s.style.background = c.h;
        s.title = c.n;
        s.addEventListener("click", function () { updateColor(p, card, c.n); });
        swatchWrap.appendChild(s);
      });

      var sizeWrap = card.querySelector('[data-sizes="' + p.id + '"]');
      if (sizeWrap) {
        p.sizes.forEach(function (sz) {
          var b = document.createElement("button");
          b.className = "size-pill" + (sz === sel.size ? " selected" : "");
          b.textContent = sz;
          b.addEventListener("click", function () { getSel(p.id).size = sz; renderGrid(); });
          sizeWrap.appendChild(b);
        });
      }

      card.querySelector('[data-story="' + p.id + '"]').addEventListener("click", function () {
        document.getElementById("story-" + p.id).classList.toggle("open");
        this.textContent = this.textContent.indexOf("▾") > -1 ? "The story ▴" : "The story ▾";
      });
      card.querySelector('[data-qtyminus="' + p.id + '"]').addEventListener("click", function () {
        var s = getSel(p.id); s.qty = Math.max(1, s.qty - 1);
        document.getElementById("qtyval-" + p.id).textContent = s.qty;
      });
      card.querySelector('[data-qtyplus="' + p.id + '"]').addEventListener("click", function () {
        var s = getSel(p.id); s.qty = Math.min(9, s.qty + 1);
        document.getElementById("qtyval-" + p.id).textContent = s.qty;
      });
      card.querySelector('[data-add="' + p.id + '"]').addEventListener("click", function () { addToCart(p); });
    });
  }

  function updateColor(p, card, colorName) {
    var sel = getSel(p.id);
    sel.color = colorName;

    var newSrc = imageFor(p, colorName);
    var img = document.getElementById("img-" + p.id);
    if (img && img.getAttribute("src") !== newSrc) {
      img.style.opacity = "0";
      setTimeout(function () {
        img.setAttribute("src", newSrc);
        img.style.opacity = "1";
      }, 220);
    }

    var label = document.getElementById("colorlabel-" + p.id);
    if (label) label.textContent = "Colour — " + colorName;

    var swatches = card.querySelectorAll('[data-swatches="' + p.id + '"] .swatch');
    swatches.forEach(function (sw, i) { sw.classList.toggle("selected", p.colors[i].n === colorName); });
  }

  /* ---------------- CART LOGIC ---------------- */
  function addToCart(p) {
    var sel = getSel(p.id);
    var img = imageFor(p, sel.color);
    var key = p.id + "|" + sel.color + "|" + sel.size;
    var existing = cart.find(function (l) { return l.key === key; });
    if (existing) {
      existing.qty += sel.qty;
    } else {
      cart.push({ key: key, id: p.id, name: p.name, price: p.price, color: sel.color, size: sel.size, qty: sel.qty, image: img });
    }
    saveCart();
    renderCart();
    showToast(p.name + " added to cart");
  }

  function renderCart() {
    var body = document.getElementById("cartBody");
    var count = cart.reduce(function (a, l) { return a + l.qty; }, 0);
    document.getElementById("cartCount").textContent = count;
    document.getElementById("checkoutBtn").disabled = cart.length === 0;

    if (cart.length === 0) {
      body.innerHTML = '<div class="empty-cart">Your cart is empty.<br>Add something worth carrying.</div>';
    } else {
      body.innerHTML = "";
      cart.forEach(function (l, idx) {
        var row = document.createElement("div");
        row.className = "line-item";
        row.innerHTML =
          '<img src="' + l.image + '" alt="' + l.name + '">' +
          '<div class="li-info">' +
            '<div class="li-name">' + l.name + "</div>" +
            '<div class="li-meta">' + l.color + " · " + l.size + "</div>" +
            '<div class="li-row">' +
              '<div class="qty-row" style="gap:8px;">' +
                '<button class="qty-btn" data-cartminus="' + idx + '">−</button>' +
                "<span>" + l.qty + "</span>" +
                '<button class="qty-btn" data-cartplus="' + idx + '">+</button>' +
              "</div>" +
              "<span>" + money(l.price * l.qty) + "</span>" +
            "</div>" +
            '<button class="li-remove" data-cartremove="' + idx + '">Remove</button>' +
          "</div>";
        body.appendChild(row);
      });
      body.querySelectorAll("[data-cartminus]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = +this.dataset.cartminus;
          cart[i].qty = Math.max(1, cart[i].qty - 1);
          saveCart(); renderCart();
        });
      });
      body.querySelectorAll("[data-cartplus]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = +this.dataset.cartplus;
          cart[i].qty = Math.min(9, cart[i].qty + 1);
          saveCart(); renderCart();
        });
      });
      body.querySelectorAll("[data-cartremove]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = +this.dataset.cartremove;
          cart.splice(i, 1);
          saveCart(); renderCart();
        });
      });
    }

    var subtotal = cart.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
    document.getElementById("subtotal").textContent = money(subtotal);
  }

  /* ---------------- DRAWER / MODAL / GLOBAL UI ---------------- */
  function bindGlobalUI() {
    var overlay = document.getElementById("overlay");
    var drawer = document.getElementById("cartDrawer");
    var modal = document.getElementById("checkoutModal");

    function openDrawer() { drawer.classList.add("show"); overlay.classList.add("show"); }
    function closeDrawer() { drawer.classList.remove("show"); if (!modal.classList.contains("show")) overlay.classList.remove("show"); }
    function openModal() { modal.classList.add("show"); overlay.classList.add("show"); drawer.classList.remove("show"); }
    function closeModal() { modal.classList.remove("show"); overlay.classList.remove("show"); }

    document.getElementById("cartBtn").addEventListener("click", openDrawer);
    document.getElementById("closeCart").addEventListener("click", closeDrawer);
    document.getElementById("closeCheckout").addEventListener("click", closeModal);
    overlay.addEventListener("click", function () { closeDrawer(); closeModal(); });
    document.getElementById("checkoutBtn").addEventListener("click", openModal);

    var payMap = { "M-Pesa": "pay-mpesa", "EcoCash": "pay-ecocash", "Bank Transfer": "pay-bank" };
    document.querySelectorAll('input[name="payment"]').forEach(function (r) {
      r.addEventListener("change", function () {
        Object.keys(payMap).forEach(function (k) { document.getElementById(payMap[k]).classList.remove("show"); });
        document.getElementById(payMap[this.value]).classList.add("show");
      });
    });

    document.getElementById("sendWhatsapp").addEventListener("click", function () {
      var name = document.getElementById("custName").value.trim();
      var phone = document.getElementById("custPhone").value.trim();
      var loc = document.getElementById("custLoc").value.trim();
      if (!name || !phone || !loc) { showToast("Please fill in your name, phone and area"); return; }
      var delivery = document.querySelector('input[name="delivery"]:checked').value;
      var payment = document.querySelector('input[name="payment"]:checked').value;
      var subtotal = cart.reduce(function (a, l) { return a + l.price * l.qty; }, 0);

      var lines = cart.map(function (l) {
        return "• " + l.name + " (" + l.color + ", " + l.size + ") x" + l.qty + " — " + money(l.price * l.qty);
      }).join("%0a");

      var msg = "Hope Hub Order%0a%0a" +
        "Name: " + encodeURIComponent(name) + "%0a" +
        "Phone: " + encodeURIComponent(phone) + "%0a" +
        "Area: " + encodeURIComponent(loc) + "%0a%0a" +
        "Items:%0a" + lines + "%0a%0a" +
        "Subtotal: " + money(subtotal) + "%0a" +
        "Delivery: " + encodeURIComponent(delivery) + "%0a" +
        "Payment method: " + encodeURIComponent(payment);

      window.open("https://wa.me/" + CONTENT.whatsapp_orders + "?text=" + msg, "_blank");
    });

    var nav = document.getElementById("nav");
    window.addEventListener("scroll", function () {
      nav.classList.toggle("scrolled", window.scrollY > 40);
    }, { passive: true });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  }

  /* ---------------- TOAST ---------------- */
  var toastTimer;
  function showToast(text) {
    var t = document.getElementById("toast");
    t.textContent = text;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2400);
  }

  /* ---------------- LOOKBOOK ---------------- */
  function renderLookbook() {
    var LOOKBOOK = CONTENT.lookbook || [];
    var rail = document.getElementById("lookbookRail");
    rail.innerHTML = "";
    LOOKBOOK.forEach(function (l) {
      var el = document.createElement("div");
      el.className = "look-item reveal in";
      el.innerHTML = '<img src="' + l.image + '" alt="' + l.caption + '" loading="lazy"><div class="look-cap">' + l.caption + "</div>";
      rail.appendChild(el);
    });
  }
})();
