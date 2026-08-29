import {
  initializeApp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  doc,
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


/* ================= VARIABLES ================= */

let products = [];

let cart = [];

let wishlist = [];

let settings = {

  deliveryFee: 0,

  couponCode: "",

  couponPercent: 0

};

let appliedCoupon = false;

let discountAmount = 0;


/* ================= HELPERS ================= */

const $ = id =>
  document.getElementById(id);


function money(value) {

  return Number(value || 0)
    .toLocaleString();

}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function getCartCount() {

  return cart.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

}


function getSubtotal() {

  return cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
      Number(item.quantity || 0),
    0
  );

}


function normalizePhone(phone) {

  let number =
    String(phone || "")
      .replace(/\D/g, "");

  if(number.startsWith("01")) {

    number =
      "88" + number;

  }

  return number;

}


/* ================= LOAD PRODUCTS ================= */

async function loadProducts() {

  $("productGrid").innerHTML = `

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


    snapshot.forEach(
      productDoc => {

        products.push({

          id:
            productDoc.id,

          ...productDoc.data()

        });

      }
    );


    buildCategories();

    renderProducts();

  }
  catch(error) {

    console.error(error);

    $("productGrid").innerHTML = `

      <div class="empty-state">

        <div>⚠️</div>

        <p>
          Unable to load products.
        </p>

      </div>

    `;

  }

}


/* ================= CATEGORIES ================= */

function buildCategories() {

  const categories =
    [
      ...new Set(
        products
          .map(
            product =>
              product.category
          )
          .filter(Boolean)
      )
    ]
    .sort();


  $("categoryFilter").innerHTML = `

    <option value="all">
      All Categories
    </option>

    ${
      categories
        .map(
          category => `

            <option
              value="${escapeHTML(category)}"
            >
              ${escapeHTML(category)}
            </option>

          `
        )
        .join("")
    }

  `;

}


/* ================= RENDER PRODUCTS ================= */

function renderProducts() {

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
    products.filter(
      product => {

        const name =
          String(
            product.name || ""
          )
          .toLowerCase();


        const cat =
          String(
            product.category || ""
          )
          .toLowerCase();


        const searchOK =
          !search ||
          name.includes(search) ||
          cat.includes(search);


        const categoryOK =
          category === "all" ||
          product.category === category;


        return searchOK &&
               categoryOK;

      }
    );


  if(sort === "low") {

    list.sort(
      (a,b) =>
        Number(a.price || 0) -
        Number(b.price || 0)
    );

  }


  if(sort === "high") {

    list.sort(
      (a,b) =>
        Number(b.price || 0) -
        Number(a.price || 0)
    );

  }


  if(list.length === 0) {

    $("productGrid").innerHTML = `

      <div class="empty-state">

        <div>🛍️</div>

        <p>
          No products found.
        </p>

      </div>

    `;

    return;

  }


  $("productGrid").innerHTML =
    list
      .map(renderProduct)
      .join("");

}


/* ================= PRODUCT CARD ================= */

function renderProduct(product) {

  const stock =
    Number(product.stock || 0);


  const oldPrice =
    Number(product.oldPrice || 0);


  let discount = 0;


  if(
    oldPrice > 0 &&
    oldPrice > Number(product.price || 0)
  ) {

    discount =
      Math.round(
        (
          (oldPrice -
            Number(product.price || 0))
          /
          oldPrice
        ) * 100
      );

  }


  const inWishlist =
    wishlist.includes(product.id);


  const unavailable =
    stock <= 0 &&
    product.preorder !== true;


  return `

    <div class="product-card">


      <div class="product-image-wrap">

        <div class="badges">

          ${
            product.featured
            ?
            `<span class="badge">
              ⭐ Featured
            </span>`
            :
            ""
          }


          ${
            product.preorder
            ?
            `<span class="badge">
              🛍️ Pre-Order
            </span>`
            :
            ""
          }


          ${
            discount > 0
            ?
            `<span class="badge">
              🔥 ${discount}% OFF
            </span>`
            :
            ""
          }


          ${
            !product.preorder &&
            stock <= 0
            ?
            `<span class="badge">
              ❌ Out of Stock
            </span>`
            :
            ""
          }

        </div>


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

      </div>


      <div class="product-info">

        <div class="product-name">

          ${escapeHTML(
            product.name
          )}

        </div>


        ${
          product.description
          ?
          `<div class="product-description">

            ${escapeHTML(
              product.description
            )}

          </div>`
          :
          ""
        }


        <div class="price-row">

          <span class="price">
            ৳${money(product.price)}
          </span>


          ${
            oldPrice > 0
            ?
            `<span class="old-price">
              ৳${money(oldPrice)}
            </span>`
            :
            ""
          }

        </div>


        <div class="product-actions">

          <button
            class="wish-btn"
            onclick="
              toggleWishlist('${product.id}')
            "
            title="Wishlist"
          >
            ${inWishlist ? "❤️" : "♡"}
          </button>


          <button
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
              product.preorder
              ?
              "🛍️ Pre-Order"
              :
              "🛒 Add to Cart"
            }
          </button>

        </div>

      </div>

    </div>

  `;

}


/* ================= CART ================= */

function addToCart(id) {

  const product =
    products.find(
      p => p.id === id
    );


  if(!product)
    return;


  const stock =
    Number(product.stock || 0);


  const existing =
    cart.find(
      item => item.id === id
    );


  if(existing) {

    if(
      !product.preorder &&
      existing.quantity >= stock
    ) {

      alert(
        "Maximum available stock reached."
      );

      return;

    }


    existing.quantity++;

  }
  else {

    cart.push({

      id: product.id,

      productName:
        product.name,

      price:
        Number(product.price || 0),

      image:
        product.image || "profile.jpeg",

      quantity: 1,

      preorder:
        product.preorder === true

    });

  }


  saveCart();

  renderCart();

  updateHeaderCounts();

  createEmojiReaction("🛒");

}


/* ================= CHANGE QUANTITY ================= */

function changeQuantity(id, amount) {

  const item =
    cart.find(
      product => product.id === id
    );


  const product =
    products.find(
      product => product.id === id
    );


  if(!item || !product)
    return;


  const newQuantity =
    item.quantity + amount;


  if(newQuantity <= 0) {

    cart =
      cart.filter(
        product =>
          product.id !== id
      );

  }
  else {

    const stock =
      Number(product.stock || 0);


    if(
      !product.preorder &&
      newQuantity > stock
    ) {

      alert(
        "Maximum available stock reached."
      );

      return;

    }


    item.quantity =
      newQuantity;

  }


  saveCart();

  renderCart();

  updateHeaderCounts();

}


/* ================= REMOVE CART ================= */

function removeFromCart(id) {

  cart =
    cart.filter(
      item =>
        item.id !== id
    );


  saveCart();

  renderCart();

  updateHeaderCounts();

}


/* ================= RENDER CART ================= */

function renderCart() {

  if(cart.length === 0) {

    $("cartItems").innerHTML = `

      <div class="empty-state">

        <div>🛒</div>

        <p>Your cart is empty.</p>

      </div>

    `;

    $("cartSubtotal").innerText =
      "৳0";

    $("checkoutBtn").disabled =
      true;

    return;

  }


  $("checkoutBtn").disabled =
    false;


  $("cartItems").innerHTML =
    cart
      .map(
        item => `

          <div class="cart-item">

            <img
              class="cart-item-image"
              src="${escapeHTML(
                item.image
              )}"
              onerror="
                this.src='profile.jpeg'
              "
            >


            <div class="cart-item-info">

              <strong>
                ${escapeHTML(
                  item.productName
                )}
              </strong>

              <br>

              ৳${money(item.price)}

            </div>


            <div class="qty-controls">

              <button
                onclick="
                  changeQuantity(
                    '${item.id}',
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
                onclick="
                  changeQuantity(
                    '${item.id}',
                    1
                  )
                "
              >
                +
              </button>

            </div>


            <button
              class="remove-btn"
              onclick="
                removeFromCart(
                  '${item.id}'
                )
              "
            >
              🗑️
            </button>

          </div>

        `
      )
      .join("");


  $("cartSubtotal").innerText =
    `৳${money(getSubtotal())}`;

}


/* ================= WISHLIST ================= */

function toggleWishlist(id) {

  if(wishlist.includes(id)) {

    wishlist =
      wishlist.filter(
        item => item !== id
      );

  }
  else {

    wishlist.push(id);

    createEmojiReaction("❤️");

  }


  saveWishlist();

  renderProducts();

  renderWishlist();

  updateHeaderCounts();

}


function renderWishlist() {

  const items =
    products.filter(
      product =>
        wishlist.includes(
          product.id
        )
    );


  if(items.length === 0) {

    $("wishlistItems").innerHTML = `

      <div class="empty-state">

        <div>❤️</div>

        <p>
          Your wishlist is empty.
        </p>

      </div>

    `;

    return;

  }


  $("wishlistItems").innerHTML =
    items
      .map(
        product => `

          <div class="cart-item">

            <img
              class="cart-item-image"
              src="${escapeHTML(
                product.image ||
                "profile.jpeg"
              )}"
            >

            <div class="cart-item-info">

              <strong>
                ${escapeHTML(
                  product.name
                )}
              </strong>

              <br>

              ৳${money(product.price)}

            </div>


            <button
              class="small-btn"
              onclick="
                addToCart(
                  '${product.id}'
                )
              "
            >
              🛒
            </button>

          </div>

        `
      )
      .join("");

}


/* ================= STORAGE ================= */

function saveCart() {

  localStorage.setItem(
    "diyanoCart",
    JSON.stringify(cart)
  );

}


function saveWishlist() {

  localStorage.setItem(
    "diyanoWishlist",
    JSON.stringify(wishlist)
  );

}


function loadLocalData() {

  try {

    cart =
      JSON.parse(
        localStorage.getItem(
          "diyanoCart"
        ) || "[]"
      );


    wishlist =
      JSON.parse(
        localStorage.getItem(
          "diyanoWishlist"
        ) || "[]"
      );

  }
  catch {

    cart = [];

    wishlist = [];

  }

}


/* ================= COUNTS ================= */

function updateHeaderCounts() {

  $("cartCount").innerText =
    getCartCount();


  $("wishlistCount").innerText =
    wishlist.length;

}


/* ================= SETTINGS ================= */

async function loadSettings() {

  try {

    const snap =
      await getDoc(
        doc(
          db,
          "settings",
          "store"
        )
      );


    if(
      snap.exists()
    ) {

      const data =
        snap.data();


      settings = {

        deliveryFee:
          Number(
            data.deliveryFee || 0
          ),

        couponCode:
          String(
            data.couponCode || ""
          )
          .toUpperCase(),

        couponPercent:
          Number(
            data.couponPercent || 0
          )

      };

    }

  }
  catch(error) {

    console.error(
      "Settings error:",
      error
    );

  }

}


/* ================= CHECKOUT TOTAL ================= */

function updateCheckoutTotal() {

  const subtotal =
    getSubtotal();


  discountAmount = 0;


  if(
    appliedCoupon &&
    settings.couponPercent > 0
  ) {

    discountAmount =
      Math.round(
        subtotal *
        settings.couponPercent /
        100
      );

  }


  const receiveMethod =
    document.querySelector(
      'input[name="receiveMethod"]:checked'
    )?.value ||
    "Delivery";


  const delivery =
    receiveMethod === "Delivery"
    ?
    Number(
      settings.deliveryFee || 0
    )
    :
    0;


  const total =
    Math.max(
      0,
      subtotal -
      discountAmount +
      delivery
    );


  $("checkoutSubtotal").innerText =
    `৳${money(subtotal)}`;


  $("checkoutDiscount").innerText =
    `৳${money(discountAmount)}`;


  $("checkoutDelivery").innerText =
    `৳${money(delivery)}`;


  $("checkoutTotal").innerText =
    `৳${money(total)}`;


  if(receiveMethod === "Pickup") {

    const advance =
      Math.round(
        total * 0.70
      );


    const due =
      total - advance;


    $("paymentDueText").innerHTML = `

      🏪 Pickup Payment:

      <br>

      Advance 70%:
      <strong>৳${money(advance)}</strong>

      <br>

      Pay on Pickup 30%:
      <strong>৳${money(due)}</strong>

    `;

  }
  else {

    $("paymentDueText").innerHTML = `

      🚚 Delivery Payment:

      <br>

      Full Payment:
      <strong>৳${money(total)}</strong>

    `;

  }


  return {

    subtotal,

    discount:
      discountAmount,

    delivery,

    total

  };

}


/* ================= APPLY COUPON ================= */

function applyCoupon() {

  const entered =
    $("couponInput")
      .value
      .trim()
      .toUpperCase();


  if(!entered) {

    $("couponMessage").innerText =
      "Enter a coupon code.";

    appliedCoupon = false;

    updateCheckoutTotal();

    return;

  }


  if(
    settings.couponCode &&
    entered === settings.couponCode &&
    settings.couponPercent > 0
  ) {

    appliedCoupon = true;

    $("couponMessage").className =
      "success";

    $("couponMessage").innerText =
      `✓ ${settings.couponPercent}% discount applied.`;

  }
  else {

    appliedCoupon = false;

    $("couponMessage").className =
      "error";

    $("couponMessage").innerText =
      "Invalid coupon code.";

  }


  updateCheckoutTotal();

}


/* ================= PAYMENT UI ================= */

function updatePaymentUI() {

  const method =
    $("paymentMethod").value;


  if(
    method === "bKash"
  ) {

    $("paymentInfo").style.display =
      "block";

    $("transactionId").style.display =
      "block";

  }
  else {

    $("paymentInfo").style.display =
      "none";

    $("transactionId").style.display =
      "none";

  }

}


/* ================= PLACE ORDER ================= */

async function placeOrder() {

  $("checkoutError").innerText =
    "";


  if(cart.length === 0) {

    $("checkoutError").innerText =
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


  const receiveMethod =
    document.querySelector(
      'input[name="receiveMethod"]:checked'
    )?.value ||
    "Delivery";


  const address =
    $("customerAddress")
      .value
      .trim();


  const paymentMethod =
    $("paymentMethod")
      .value;


  const transactionId =
    $("transactionId")
      .value
      .trim();


  if(!name) {

    $("checkoutError").innerText =
      "Please enter your name.";

    return;

  }


  if(!phone) {

    $("checkoutError").innerText =
      "Please enter your phone number.";

    return;

  }


  if(
    receiveMethod === "Delivery" &&
    !address
  ) {

    $("checkoutError").innerText =
      "Please enter delivery address.";

    return;

  }


  if(
    paymentMethod === "bKash" &&
    !transactionId
  ) {

    $("checkoutError").innerText =
      "Please enter your bKash Transaction ID.";

    return;

  }


  const totals =
    updateCheckoutTotal();


  let paidNow =
    totals.total;


  let dueOnPickup =
    0;


  if(
    receiveMethod === "Pickup"
  ) {

    paidNow =
      Math.round(
        totals.total * 0.70
      );

    dueOnPickup =
      totals.total -
      paidNow;

  }


  const isPreOrder =
    cart.some(
      item =>
        item.preorder === true
    );


  const orderId =
    "DYN-" +
    Date.now()
      .toString()
      .slice(-8);


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


    receiveMethod,


    items:
      cart.map(
        item => ({

          productId:
            item.id,

          productName:
            item.productName,

          price:
            item.price,

          quantity:
            item.quantity,

          subtotal:
            item.price *
            item.quantity,

          preorder:
            item.preorder === true

        })
      ),


    subtotal:
      totals.subtotal,


    discount:
      totals.discount,


    deliveryFee:
      totals.delivery,


    total:
      totals.total,


    paidNow,


    dueOnPickup,


    couponCode:
      appliedCoupon
      ?
      settings.couponCode
      :
      "",


    isPreOrder,


    payment: {

      method:
        paymentMethod,

      transactionId,

      status:
        "Pending"

    },


    orderStatus:
      "Pending",


    createdAt:
      serverTimestamp()

  };


  $("placeOrderBtn").disabled =
    true;

  $("placeOrderBtn").innerText =
    "Placing Order...";


  try {

    await addDoc(
      collection(
        db,
        "orders"
      ),
      orderData
    );


    /*
      Reduce stock only for normal products.
      Pre-order products are not reduced.
    */


    cart.forEach(
      async item => {

        const product =
          products.find(
            p =>
              p.id === item.id
          );


        if(
          !product ||
          product.preorder === true
        )
          return;


        const currentStock =
          Number(
            product.stock || 0
          );


        /*
          Stock update is intentionally
          not performed from the public
          customer page because Firestore
          security rules should prevent
          unauthorized product writes.
        */

      }
    );


    cart = [];

    saveCart();

    updateHeaderCounts();

    renderCart();


    $("checkoutModal").style.display =
      "none";


    $("successOrderId").innerText =
      orderId;


    $("successModal").style.display =
      "flex";


    $("trackingOrderId").value =
      orderId;


    createEmojiReaction("🎉");

  }
  catch(error) {

    console.error(error);

    $("checkoutError").innerText =
      "Unable to place order. Please try again.";

  }
  finally {

    $("placeOrderBtn").disabled =
      false;

    $("placeOrderBtn").innerText =
      "🛍️ Place Order";

  }

}


/* ================= TRACK ORDER ================= */

async function trackOrder() {

  const orderId =
    $("trackingOrderId")
      .value
      .trim();


  const phone =
    $("trackingPhone")
      .value
      .trim();


  if(!orderId || !phone) {

    $("trackingResult").innerHTML = `

      <div class="status-timeline">

        ⚠️ Please enter Order ID and phone number.

      </div>

    `;

    return;

  }


  $("trackingResult").innerHTML = `

    <div class="status-timeline">

      🔎 Searching...

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


    snapshot.forEach(
      orderDoc => {

        const data =
          orderDoc.data();


        const customer =
          data.customer || {};


        const savedPhone =
          normalizePhone(
            customer.phone
          );


        const inputPhone =
          normalizePhone(
            phone
          );


        if(
          String(
            data.orderId || ""
          )
          .toLowerCase()
          ===
          orderId.toLowerCase()
          &&
          savedPhone ===
          inputPhone
        ) {

          found = {

            id:
              orderDoc.id,

            ...data

          };

        }

      }
    );


    if(!found) {

      $("trackingResult").innerHTML = `

        <div class="status-timeline">

          ❌ Order not found.

          <br><br>

          Please check your Order ID
          and phone number.

        </div>

      `;

      return;

    }


    renderTrackingResult(found);

  }
  catch(error) {

    console.error(error);

    $("trackingResult").innerHTML = `

      <div class="status-timeline">

        ⚠️ Unable to track order.

      </div>

    `;

  }

}


/* ================= TRACK RESULT ================= */

function renderTrackingResult(order) {

  const status =
    order.orderStatus ||
    "Pending";


  const payment =
    order.payment || {};


  const steps = [

    "Pending",

    "Processing",

    "Shipped",

    "Delivered"

  ];


  const currentIndex =
    steps.indexOf(status);


  $("trackingResult").innerHTML = `

    <div class="status-timeline">

      <h3>
        📦 ${escapeHTML(
          order.orderId
        )}
      </h3>


      <p>
        Payment:
        <strong>
          ${escapeHTML(
            payment.status ||
            "Pending"
          )}
        </strong>
      </p>


      <p>
        Order Status:
        <strong>
          ${escapeHTML(status)}
        </strong>
      </p>


      ${
        order.isPreOrder
        ?
        `<p>
          🛍️ This order contains
          Pre-Order product(s).
        </p>`
        :
        ""
      }


      ${
        steps
          .map(
            (step,index) => `

              <div
                class="
                  status-step
                  ${
                    index <= currentIndex &&
                    status !== "Cancelled"
                    ?
                    "done"
                    :
                    ""
                  }
                "
              >

                ${
                  index <= currentIndex &&
                  status !== "Cancelled"
                  ?
                  "✅"
                  :
                  "○"
                }

                ${step}

              </div>

            `
          )
          .join("")
      }


      ${
        status === "Cancelled"
        ?
        `<div class="status-step done">

          ❌ Order Cancelled

        </div>`
        :
        ""
      }


      <hr>


      <strong>
        Total:
        ৳${money(order.total)}
      </strong>

      <br>

      Paid:
      ৳${money(order.paidNow)}

      <br>

      Due:
      ৳${money(order.dueOnPickup)}

    </div>

  `;

}


/* ================= EMOJI REACTION ================= */

function createEmojiReaction(emoji) {

  const container =
    $("emoji-reactions-container");


  const element =
    document.createElement(
      "div"
    );


  element.className =
    "floating-emoji";


  element.innerText =
    emoji;


  const startX =
    45 +
    Math.random() * 10;


  const offset =
    -100 +
    Math.random() * 200;


  const rotation =
    -25 +
    Math.random() * 50;


  element.style.position =
    "absolute";


  element.style.left =
    `${startX}%`;


  element.style.bottom =
    "100px";


  element.style.fontSize =
    `${30 + Math.random() * 25}px`;


  element.style.setProperty(
    "--offset-x",
    `${offset}px`
  );


  element.style.setProperty(
    "--rotation",
    `${rotation}deg`
  );


  element.style.animation =
    "floatEmoji 1.8s ease-out forwards";


  container.appendChild(
    element
  );


  setTimeout(
    () =>
      element.remove(),
    1900
  );

}


/* ================= MODALS ================= */

function openModal(id) {

  $(id).style.display =
    "flex";

}


function closeModal(id) {

  $(id).style.display =
    "none";

}


/* ================= RECEIVE METHOD ================= */

function updateReceiveMethod() {

  const method =
    document.querySelector(
      'input[name="receiveMethod"]:checked'
    )?.value ||
    "Delivery";


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


  $("customerAddress").style.display =
    method === "Delivery"
    ?
    "block"
    :
    "none";


  updateCheckoutTotal();

}


/* ================= EVENT LISTENERS ================= */

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


$("cartBtn")
  .addEventListener(
    "click",
    () => {

      renderCart();

      openModal("cartModal");

    }
  );


$("closeCartBtn")
  .addEventListener(
    "click",
    () =>
      closeModal("cartModal")
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


$("closeWishlistBtn")
  .addEventListener(
    "click",
    () =>
      closeModal(
        "wishlistModal"
      )
  );


$("checkoutBtn")
  .addEventListener(
    "click",
    () => {

      if(cart.length === 0)
        return;

      closeModal("cartModal");

      updateCheckoutTotal();

      updatePaymentUI();

      openModal(
        "checkoutModal"
      );

    }
  );


$("closeCheckoutBtn")
  .addEventListener(
    "click",
    () =>
      closeModal(
        "checkoutModal"
      )
  );


$("applyCouponBtn")
  .addEventListener(
    "click",
    applyCoupon
  );


$("paymentMethod")
  .addEventListener(
    "change",
    updatePaymentUI
  );


document
  .querySelectorAll(
    'input[name="receiveMethod"]'
  )
  .forEach(
    radio => {

      radio.addEventListener(
        "change",
        updateReceiveMethod
      );

    }
  );


$("placeOrderBtn")
  .addEventListener(
    "click",
    placeOrder
  );


$("trackOrderBtn")
  .addEventListener(
    "click",
    trackOrder
  );


$("shopNowBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById("products")
        .scrollIntoView({
          behavior: "smooth"
        });

    }
  );


$("trackHeroBtn")
  .addEventListener(
    "click",
    () => {

      document
        .getElementById("tracking")
        .scrollIntoView({
          behavior: "smooth"
        });

    }
  );


$("successTrackBtn")
  .addEventListener(
    "click",
    () => {

      closeModal(
        "successModal"
      );

      document
        .getElementById("tracking")
        .scrollIntoView({
          behavior: "smooth"
        });

    }
  );


$("successCloseBtn")
  .addEventListener(
    "click",
    () =>
      closeModal(
        "successModal"
      )
  );


/* Close modal by clicking outside */

document
  .querySelectorAll(".modal")
  .forEach(
    modal => {

      modal.addEventListener(
        "click",
        event => {

          if(
            event.target === modal
          ) {

            modal.style.display =
              "none";

          }

        }
      );

    }
  );


/* ================= INIT ================= */

async function init() {

  loadLocalData();

  updateHeaderCounts();

  renderCart();

  renderWishlist();

  await loadSettings();

  await loadProducts();

}


init();
