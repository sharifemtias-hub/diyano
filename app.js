## `app.js`

```javascript
import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* ================= FIREBASE ================= */

const firebaseConfig = {

  apiKey:
    "AIzaSyDNS1kJkHfDqFz5Nr8YJe-CnMyyCmWSPEw",

  authDomain:
    "z-shop-e1a3e.firebaseapp.com",

  projectId:
    "z-shop-e1a3e",

  storageBucket:
    "z-shop-e1a3e.firebasestorage.app",

  messagingSenderId:
    "501847773563",

  appId:
    "1:501847773563:web:0be960fed00363b85e2dde",

  measurementId:
    "G-XK9K643HDD"

};


const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);


/* ================= STATE ================= */

let products = [];

let cart = [];

let wishlist = [];

let storeSettings = {

  deliveryFee: 80,

  couponCode: "",

  couponPercent: 0

};

let appliedCoupon = false;


/* ================= HELPERS ================= */

const $ = id =>
  document.getElementById(id);


function money(value) {

  return Number(value || 0)
    .toLocaleString("en-BD");

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


/* ================= LOAD SETTINGS ================= */

async function loadSettings() {

  try {

    const snapshot =
      await getDocs(
        collection(db, "settings")
      );

    snapshot.forEach(doc => {

      if (doc.id === "store") {

        storeSettings = {

          ...storeSettings,

          ...doc.data()

        };

      }

    });

  }

  catch (error) {

    console.error(
      "Settings error:",
      error
    );

  }

}


/* ================= LOAD PRODUCTS ================= */

async function loadProducts() {

  const grid =
    $("productGrid");

  grid.innerHTML = `

    <div class="loading">

      <div class="loader"></div>

      Loading products...

    </div>

  `;


  try {

    const q =
      query(
        collection(db, "products"),
        orderBy(
          "createdAt",
          "desc"
        )
      );


    const snapshot =
      await getDocs(q);


    products = [];


    snapshot.forEach(productDoc => {

      products.push({

        id:
          productDoc.id,

        ...productDoc.data()

      });

    });


    populateCategories();

    renderProducts();

  }

  catch (error) {

    console.error(
      "Products error:",
      error
    );


    grid.innerHTML = `

      <div class="empty-state">

        <div>😔</div>

        <h3>
          Unable to load products
        </h3>

        <p>
          Please refresh the page.
        </p>

      </div>

    `;

  }

}


/* ================= CATEGORIES ================= */

function populateCategories() {

  const select =
    $("categoryFilter");

  const categories =
    [
      ...new Set(
        products
          .map(product =>
            product.category
          )
          .filter(Boolean)
      )
    ]
    .sort();


  select.innerHTML = `

    <option value="all">
      📂 All Categories
    </option>

  `;


  categories.forEach(category => {

    const option =
      document.createElement("option");

    option.value =
      category;

    option.textContent =
      `📂 ${category}`;

    select.appendChild(option);

  });

}


/* ================= RENDER PRODUCTS ================= */

function renderProducts() {

  const grid =
    $("productGrid");

  const search =
    $("productSearch")
      .value
      .trim()
      .toLowerCase();


  const category =
    $("categoryFilter")
      .value;


  const sort =
    $("sortProducts")
      .value;


  let list =
    products.filter(product => {

      const text =
        `${product.name || ""}
         ${product.category || ""}
         ${product.description || ""}`
          .toLowerCase();


      const searchOK =
        !search ||
        text.includes(search);


      const categoryOK =
        category === "all" ||
        product.category === category;


      return searchOK &&
        categoryOK;

    });


  if (sort === "low") {

    list.sort(
      (a, b) =>
        Number(a.price || 0) -
        Number(b.price || 0)
    );

  }


  if (sort === "high") {

    list.sort(
      (a, b) =>
        Number(b.price || 0) -
        Number(a.price || 0)
    );

  }


  if (sort === "new") {

    list.sort(
      (a, b) =>
        getTimestamp(b) -
        getTimestamp(a)
    );

  }


  if (!list.length) {

    grid.innerHTML = `

      <div class="empty-state">

        <div>🔎</div>

        <h3>
          No products found
        </h3>

        <p>
          Try another search or category.
        </p>

      </div>

    `;

    return;

  }


  grid.innerHTML =
    list
      .map(renderProduct)
      .join("");

}


function getTimestamp(product) {

  if (
    product.createdAt &&
    product.createdAt.seconds
  ) {

    return product.createdAt.seconds;

  }

  return 0;

}


/* ================= PRODUCT CARD ================= */

function renderProduct(product) {

  const price =
    Number(product.price || 0);

  const oldPrice =
    Number(product.oldPrice || 0);

  const stock =
    Number(product.stock || 0);


  let discount = 0;


  if (
    oldPrice > price &&
    oldPrice > 0
  ) {

    discount =
      Math.round(
        ((oldPrice - price) /
          oldPrice) * 100
      );

  }


  const isWishlisted =
    wishlist.includes(product.id);


  const unavailable =
    stock <= 0 &&
    product.preorder !== true;


  return `

    <article
      class="product-card"
    >

      <div class="product-image-wrap">

        <img
          class="product-image"
          src="${escapeHTML(
            product.image ||
            "profile.jpeg"
          )}"
          alt="${escapeHTML(
            product.name
          )}"
          loading="lazy"
          onerror="
            this.src='profile.jpeg'
          "
        >


        <div class="badges">

          ${
            product.featured
              ? `
                <span class="badge">
                  ⭐ Featured
                </span>
              `
              : ""
          }


          ${
            product.preorder
              ? `
                <span class="badge">
                  🛍️ Pre-Order
                </span>
              `
              : ""
          }


          ${
            discount > 0
              ? `
                <span class="badge">
                  🔥 ${discount}% OFF
                </span>
              `
              : ""
          }

        </div>

      </div>


      <div class="product-info">

        <div class="product-name">

          ${escapeHTML(
            product.name
          )}

        </div>


        <div class="product-description">

          ${escapeHTML(
            product.description ||
            "Premium quality product from DIYANO."
          )}

        </div>


        <div class="price-row">

          <span class="price">

            ৳${money(price)}

          </span>


          ${
            oldPrice > price
              ? `
                <span class="old-price">
                  ৳${money(oldPrice)}
                </span>
              `
              : ""
          }

        </div>


        <div class="stock-info">

          ${
            product.preorder
              ? "🛍️ Available for Pre-Order"
              :
            stock > 0
              ? `📦 ${stock} in stock`
              : "❌ Out of stock"
          }

        </div>


        <div class="product-actions">

          <button
            type="button"
            class="wish-btn"
            onclick="
              toggleWishlist('${product.id}')
            "
            title="Wishlist"
          >
            ${isWishlisted ? "❤️" : "♡"}
          </button>


          <button
            type="button"
            class="add-btn"
            ${
              unavailable
                ? "disabled"
                : ""
            }
            onclick="
              addToCart('${product.id}')
            "
          >

            ${
              unavailable
                ? "Out of Stock"
                : "🛒 Add to Cart"
            }

          </button>

        </div>

      </div>

    </article>

  `;

}


/* ================= CART ================= */

function addToCart(id) {

  const product =
    products.find(
      p => p.id === id
    );


  if (!product)
    return;


  const stock =
    Number(product.stock || 0);


  const existing =
    cart.find(
      item => item.id === id
    );


  if (
    !product.preorder &&
    existing &&
    existing.quantity >= stock
  ) {

    showReaction("😅");

    alert(
      "Maximum available stock reached."
    );

    return;

  }


  if (existing) {

    existing.quantity++;

  }

  else {

    cart.push({

      id:

        product.id,

      quantity: 1

    });

  }


  saveCart();

  renderCart();

  updateCounts();

  showReaction("🛒");

}


/* ================= CART STORAGE ================= */

function saveCart() {

  localStorage.setItem(
    "diyano_cart",
    JSON.stringify(cart)
  );

}


function loadCart() {

  try {

    cart =
      JSON.parse(
        localStorage.getItem(
          "diyano_cart"
        )
      ) || [];

  }

  catch {

    cart = [];

  }

}


/* ================= WISHLIST ================= */

function loadWishlist() {

  try {

    wishlist =
      JSON.parse(
        localStorage.getItem(
          "diyano_wishlist"
        )
      ) || [];

  }

  catch {

    wishlist = [];

  }

}


function saveWishlist() {

  localStorage.setItem(
    "diyano_wishlist",
    JSON.stringify(wishlist)
  );

}


window.toggleWishlist =
  function(id) {

    const index =
      wishlist.indexOf(id);


    if (index >= 0) {

      wishlist.splice(index, 1);

      showReaction("💔");

    }

    else {

      wishlist.push(id);

      showReaction("❤️");

    }


    saveWishlist();

    updateCounts();

    renderProducts();

    renderWishlist();

  };


/* ================= CART RENDER ================= */

function renderCart() {

  const container =
    $("cartItems");


  if (!cart.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div>🛒</div>

        <h3>
          Your cart is empty
        </h3>

        <p>
          Add some products first.
        </p>

      </div>

    `;

    $("cartTotal")
      .innerText = "৳0";

    return;

  }


  let total = 0;


  container.innerHTML =
    cart
      .map(item => {

        const product =
          products.find(
            p => p.id === item.id
          );


        if (!product)
          return "";


        const subtotal =
          Number(product.price || 0) *
          item.quantity;


        total += subtotal;


        return `

          <div class="cart-item">

            <img
              class="cart-item-image"
              src="${escapeHTML(
                product.image ||
                "profile.jpeg"
              )}"
              alt=""
              onerror="
                this.src='profile.jpeg'
              "
            >


            <div class="cart-item-info">

              <strong>
                ${escapeHTML(
                  product.name
                )}
              </strong>

              <div>
                ৳${money(
                  product.price
                )}
              </div>

            </div>


            <div class="qty-controls">

              <button
                type="button"
                onclick="
                  changeQuantity(
                    '${product.id}',
                    -1
                  )
                "
              >
                −
              </button>


              <strong>
                ${item.quantity}
              </strong>


              <button
                type="button"
                onclick="
                  changeQuantity(
                    '${product.id}',
                    1
                  )
                "
              >
                +
              </button>

            </div>


            <strong>
              ৳${money(subtotal)}
            </strong>


            <button
              type="button"
              class="remove-btn"
              onclick="
                removeFromCart(
                  '${product.id}'
                )
              "
            >
              🗑️
            </button>

          </div>

        `;

      })
      .join("");


  $("cartTotal")
    .innerText =
      `৳${money(total)}`;

}


window.changeQuantity =
  function(id, amount) {

    const item =
      cart.find(
        i => i.id === id
      );


    const product =
      products.find(
        p => p.id === id
      );


    if (!item || !product)
      return;


    const newQuantity =
      item.quantity + amount;


    if (newQuantity <= 0) {

      removeFromCart(id);

      return;

    }


    if (
      !product.preorder &&
      newQuantity >
        Number(product.stock || 0)
    ) {

      showReaction("😅");

      return;

    }


    item.quantity =
      newQuantity;


    saveCart();

    renderCart();

    updateCounts();

  };


window.removeFromCart =
  function(id) {

    cart =
      cart.filter(
        item =>
          item.id !== id
      );


    saveCart();

    renderCart();

    updateCounts();

    showReaction("🗑️");

  };


/* ================= COUNTS ================= */

function updateCounts() {

  const cartCount =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(
          item.quantity || 0
        ),
      0
    );


  $("cartCount")
    .innerText =
      cartCount;


  $("wishlistCount")
    .innerText =
      wishlist.length;

}


/* ================= WISHLIST RENDER ================= */

function renderWishlist() {

  const container =
    $("wishlistItems");


  const list =
    products.filter(
      product =>
        wishlist.includes(
          product.id
        )
    );


  if (!list.length) {

    container.innerHTML = `

      <div class="empty-state">

        <div>❤️</div>

        <h3>
          Wishlist is empty
        </h3>

      </div>

    `;

    return;

  }


  container.innerHTML =
    list
      .map(product => `

        <div class="cart-item">

          <img
            class="cart-item-image"
            src="${escapeHTML(
              product.image ||
              "profile.jpeg"
            )}"
            alt=""
          >

          <div class="cart-item-info">

            <strong>
              ${escapeHTML(
                product.name
              )}
            </strong>

            <div>
              ৳${money(
                product.price
              )}
            </div>

          </div>


          <button
            type="button"
            class="small-btn"
            onclick="
              addToCart('${product.id}')
            "
          >
            🛒
          </button>


          <button
            type="button"
            class="remove-btn"
            onclick="
              toggleWishlist(
                '${product.id}'
              )
            "
          >
            💔
          </button>

        </div>

      `)
      .join("");

}


/* ================= TOTAL ================= */

function calculateTotals() {

  let subtotal = 0;


  cart.forEach(item => {

    const product =
      products.find(
        p => p.id === item.id
      );


    if (!product)
      return;


    subtotal +=
      Number(product.price || 0) *
      Number(item.quantity || 0);

  });


  let delivery = 0;


  const receive =
    getReceiveMethod();


  if (receive === "Delivery") {

    delivery =
      Number(
        storeSettings.deliveryFee || 0
      );

  }


  let discount = 0;


  if (appliedCoupon) {

    discount =
      subtotal *
      Number(
        storeSettings.couponPercent || 0
      ) /
      100;

  }


  const total =
    Math.max(
      0,
      subtotal +
      delivery -
      discount
    );


  return {

    subtotal,

    delivery,

    discount,

    total

  };

}


/* ================= RECEIVE METHOD ================= */

function getReceiveMethod() {

  const checked =
    document.querySelector(
      'input[name="receiveMethod"]:checked'
    );


  return checked
    ? checked.value
    : "Delivery";

}


function updateReceiveUI() {

  const method =
    getReceiveMethod();


  $("deliveryChoice")
    .classList.toggle(
      "active",
      method === "Delivery"
    );


  $("pickupChoice")
    .classList.toggle(
      "active",
      method === "Pickup"
    );


  $("addressBox")
    .style.display =
      method === "Delivery"
        ? "block"
        : "none";


  renderPaymentBreakdown();

}


/* ================= PAYMENT BREAKDOWN ================= */

function renderPaymentBreakdown() {

  const totals =
    calculateTotals();


  const method =
    getReceiveMethod();


  let paidNow =
    totals.total;


  let due =
    0;


  if (method === "Pickup") {

    paidNow =
      totals.total * 0.70;

    due =
      totals.total * 0.30;

  }


  $("paymentBreakdown")
    .innerHTML = `

      <div>
        🛍️ Subtotal:
        <strong>
          ৳${money(
            totals.subtotal
          )}
        </strong>
      </div>

      <div>
        🚚 Delivery:
        <strong>
          ৳${money(
            totals.delivery
          )}
        </strong>
      </div>

      ${
        totals.discount > 0
          ? `
            <div>
              🎟️ Discount:
              <strong>
                -৳${money(
                  totals.discount
                )}
              </strong>
            </div>
          `
          : ""
      }

      <hr>

      <div>
        💰 Total:
        <strong>
          ৳${money(
            totals.total
          )}
        </strong>
      </div>

      <div>
        💳 Pay Now:
        <strong>
          ৳${money(
            paidNow
          )}
        </strong>
      </div>

      ${
        due > 0
          ? `
            <div>
              🤝 Due on Pickup:
              <strong>
                ৳${money(due)}
              </strong>
            </div>
          `
          : ""
      }

    `;


  $("checkoutTotal")
    .innerText =
      `৳${money(
        totals.total
      )}`;

}


/* ================= COUPON ================= */

function applyCoupon() {

  const input =
    $("couponInput")
      .value
      .trim()
      .toUpperCase();


  if (!input) {

    $("couponMessage")
      .className =
        "small-message error-box";

    $("couponMessage")
      .innerText =
        "Enter a coupon code.";

    return;

  }


  if (
    !storeSettings.couponCode ||
    input !==
      String(
        storeSettings.couponCode
      ).toUpperCase()
  ) {

    appliedCoupon = false;

    $("couponMessage")
      .className =
        "small-message error-box";

    $("couponMessage")
      .innerText =
        "❌ Invalid coupon code.";

    renderPaymentBreakdown();

    return;

  }


  appliedCoupon = true;


  $("couponMessage")
    .className =
      "small-message success";

  $("couponMessage")
    .innerText =
      `🎉 ${storeSettings.couponPercent}% discount applied!`;


  renderPaymentBreakdown();

}


/* ================= ORDER ID ================= */

function generateOrderId() {

  const now =
    new Date();


  const date =
    now.getFullYear()
    .toString()
    .slice(-2) +
    String(
      now.getMonth() + 1
    ).padStart(2, "0") +
    String(
      now.getDate()
    ).padStart(2, "0");


  const random =
    Math.floor(
      1000 +
      Math.random() * 9000
    );


  return `DYN-${date}-${random}`;

}


/* ================= PLACE ORDER ================= */

async function placeOrder() {

  $("checkoutError")
    .innerText = "";


  if (!cart.length) {

    $("checkoutError")
      .innerText =
        "Your cart is empty.";

    return;

  }


  const name =
    $("customerName")
      .value
      .trim();


  const phone =
    $("customerPhone")
      .value
      .trim();


  const address =
    $("customerAddress")
      .value
      .trim();


  const transactionId =
    $("transactionId")
      .value
      .trim();


  const receiveMethod =
    getReceiveMethod();


  if (!name || !phone) {

    $("checkoutError")
      .innerText =
        "Please enter your name and phone number.";

    return;

  }


  if (
    receiveMethod ===
      "Delivery" &&
    !address
  ) {

    $("checkoutError")
      .innerText =
        "Please enter your delivery address.";

    return;

  }


  if (!transactionId) {

    $("checkoutError")
      .innerText =
        "Please enter your bKash Transaction ID.";

    return;

  }


  const totals =
    calculateTotals();


  const paidNow =
    receiveMethod === "Pickup"
      ? totals.total * 0.70
      : totals.total;


  const dueOnPickup =
    receiveMethod === "Pickup"
      ? totals.total * 0.30
      : 0;


  const orderId =
    generateOrderId();


  const items =
    cart.map(item => {

      const product =
        products.find(
          p => p.id === item.id
        );


      return {

        productId:
          product.id,

        productName:
          product.name,

        price:
          Number(
            product.price || 0
          ),

        quantity:
          Number(
            item.quantity || 0
          ),

        subtotal:
          Number(
            product.price || 0
          ) *
          Number(
            item.quantity || 0
          ),

        preorder:
          product.preorder === true

      };

    });


  const hasPreOrder =
    items.some(
      item =>
        item.preorder === true
    );


  const orderData = {

    orderId,

    customer: {

      name,

      phone,

      address:
        receiveMethod === "Delivery"
          ? address
          : ""

    },

    items,

    receiveMethod,

    isPreOrder:
      hasPreOrder,

    subtotal:
      totals.subtotal,

    deliveryFee:
      totals.delivery,

    discount:
      totals.discount,

    total:
      totals.total,

    paidNow,

    dueOnPickup,

    couponCode:
      appliedCoupon
        ? storeSettings.couponCode
        : "",

    payment: {

      method:
        "bKash",

      transactionId,

      status:
        "Pending"

    },

    orderStatus:
      "Pending",

    createdAt:
      serverTimestamp()

  };


  const button =
    $("placeOrderBtn");


  button.disabled = true;

  button.innerText =
    "Placing Order...";


  try {

    await addDoc(
      collection(
        db,
        "orders"
      ),
      orderData
    );


    cart = [];

    saveCart();

    updateCounts();


    $("successOrderId")
      .innerText =
        orderId;


    closeModal(
      "checkoutModal"
    );


    openModal(
      "successModal"
    );


    showReaction("🎉");

    setTimeout(
      () => showReaction("🛍️"),
      300
    );

  }

  catch (error) {

    console.error(
      "Order error:",
      error
    );


    $("checkoutError")
      .innerText =
        "Unable to place order. Please try again.";

  }

  finally {

    button.disabled = false;

    button.innerText =
      "✅ Place Order";

  }

}


/* ================= TRACK ORDER ================= */

async function trackOrder(event) {

  event.preventDefault();


  const orderId =
    $("trackingOrderId")
      .value
      .trim();


  const phone =
    $("trackingPhone")
      .value
      .trim();


  const result =
    $("trackingResult");


  result.innerHTML = `

    <div class="loading">

      <div class="loader"></div>

      Searching...

    </div>

  `;


  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "orders"
        )
      );


    let found = null;


    snapshot.forEach(doc => {

      const data =
        doc.data();


      if (
        String(
          data.orderId || ""
        ).toLowerCase() ===
        orderId.toLowerCase() &&
        String(
          data.customer?.phone || ""
        ) === phone
      ) {

        found = data;

      }

    });


    if (!found) {

      result.innerHTML = `

        <div class="status-timeline">

          ❌

          <strong>
            Order not found.
          </strong>

          <p>
            Please check your Order ID and phone number.
          </p>

        </div>

      `;

      return;

    }


    const status =
      found.orderStatus ||
      "Pending";


    const steps = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered"
    ];


    const currentIndex =
      steps.indexOf(status);


    result.innerHTML = `

      <div class="status-timeline">

        <h3>
          🆔 ${escapeHTML(
            found.orderId
          )}
        </h3>

        <p>
          Payment:
          <strong>
            ${escapeHTML(
              found.payment?.status ||
              "Pending"
            )}
          </strong>
        </p>

        <hr>

        ${
          steps
            .map(
              (step, index) => `

                <div
                  class="status-step ${
                    index <= currentIndex
                      ? "done"
                      : ""
                  }"
                >

                  ${
                    index <= currentIndex
                      ? "✅"
                      : "⚪"
                  }

                  ${step}

                </div>

              `
            )
            .join("")
        }


        ${
          status === "Cancelled"
            ? `
              <div
                class="status-step"
                style="color:#b00020;font-weight:bold;"
              >
                ❌ Order Cancelled
              </div>
            `
            : ""
        }

      </div>

    `;

  }

  catch (error) {

    console.error(
      error
    );


    result.innerHTML = `

      <div class="status-timeline">

        ❌ Unable to track order.

      </div>

    `;

  }

}


/* ================= MODALS ================= */

function openModal(id) {

  const modal =
    $(id);


  if (modal) {

    modal.style.display =
      "flex";

  }

}


function closeModal(id) {

  const modal =
    $(id);


  if (modal) {

    modal.style.display =
      "none";

  }

}


/* ================= EMOJI REACTION ================= */

function showReaction(emoji) {

  const container =
    $("emoji-reactions-container");


  if (!container)
    return;


  const element =
    document.createElement("div");


  element.className =
    "floating-emoji";


  element.innerText =
    emoji;


  element.style.position =
    "fixed";


  element.style.left =
    `${20 + Math.random() * 60}%`;


  element.style.bottom =
    "20px";


  element.style.fontSize =
    `${35 + Math.random() * 30}px`;


  element.style.setProperty(
    "--rotation",
    `${-25 + Math.random() * 50}deg`
  );


  element.style.setProperty(
    "--offset-x",
    `${-80 + Math.random() * 160}px`
  );


  element.style.animation =
    "floatEmoji 1.8s ease-out forwards";


  container.appendChild(
    element
  );


  setTimeout(
    () => element.remove(),
    1900
  );

}


/* ================= EVENTS ================= */

$("cartBtn")
  .addEventListener(
    "click",
    () => {

      renderCart();

      openModal(
        "cartModal"
      );

    }
  );


$("wishlistBtn")
  .addEventListener(
    "click",
    () => {

      renderWishlist();

      openModal(
        "wishlistModal"
      );

    }
  );


$("checkoutBtn")
  .addEventListener(
    "click",
    () => {

      if (!cart.length) {

        showReaction("🛒");

        return;

      }


      renderPaymentBreakdown();

      openModal(
        "checkoutModal"
      );

    }
  );


$("placeOrderBtn")
  .addEventListener(
    "click",
    placeOrder
  );


$("applyCouponBtn")
  .addEventListener(
    "click",
    applyCoupon
  );


$("trackingForm")
  .addEventListener(
    "submit",
    trackOrder
  );


$("productSearch")
  .addEventListener(
    "input",
    renderProducts
  );


$("categoryFilter")
  .addEventListener(
    "change",
    renderProducts
  );


$("sortProducts")
  .addEventListener(
    "change",
    renderProducts
  );


document
  .querySelectorAll(
    'input[name="receiveMethod"]'
  )
  .forEach(input => {

    input.addEventListener(
      "change",
      updateReceiveUI
    );

  });


document
  .querySelectorAll(
    "[data-close]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        closeModal(
          button.dataset.close
        );

      }
    );

  });


document
  .querySelectorAll(".modal")
  .forEach(modal => {

    modal.addEventListener(
      "click",
      event => {

        if (
          event.target === modal
        ) {

          modal.style.display =
            "none";

        }

      }
    );

  });


$("successCloseBtn")
  .addEventListener(
    "click",
    () => {

      closeModal(
        "successModal"
      );

      window.scrollTo({

        top: 0,

        behavior: "smooth"

      });

    }
  );


$("copyOrderBtn")
  .addEventListener(
    "click",
    async () => {

      const orderId =
        $("successOrderId")
          .innerText;


      try {

        await navigator.clipboard
          .writeText(orderId);


        $("copyOrderBtn")
          .innerText =
            "✅ Copied!";

        setTimeout(
          () => {

            $("copyOrderBtn")
              .innerText =
                "📋 Copy Order ID";

          },
          1500
        );

      }

      catch {

        alert(
          `Order ID: ${orderId}`
        );

      }

    }
  );


/* ================= START ================= */

async function init() {

  loadCart();

  loadWishlist();

  updateCounts();

  await loadSettings();

  await loadProducts();

  renderCart();

  renderWishlist();

  updateReceiveUI();

}


init();
```
