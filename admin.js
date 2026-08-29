import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


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


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


/* ================= VARIABLES ================= */

let editingId = null;

let imageIsValid = false;

let allProducts = [];

let allOrders = [];


/* ================= ELEMENT HELPER ================= */

const $ = id => document.getElementById(id);


/* ================= SECURITY HELPERS ================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function escapeAttribute(value) {

  return escapeHTML(value);
}


function money(value) {

  return Number(value || 0)
    .toLocaleString("en-BD");
}


/* ================= LOGIN ================= */

$("loginBtn").addEventListener(
  "click",
  async () => {

    const email =
      $("email").value.trim();

    const password =
      $("password").value;


    if (!email || !password) {

      $("loginMessage").className = "error";

      $("loginMessage").innerText =
        "⚠️ Enter email and password.";

      return;
    }


    $("loginBtn").disabled = true;

    $("loginBtn").innerText =
      "⏳ Logging in...";


    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      $("loginMessage").className =
        "success";

      $("loginMessage").innerText =
        "✅ Login successful.";

    }

    catch (error) {

      console.error(error);

      $("loginMessage").className =
        "error";

      $("loginMessage").innerText =
        "❌ Login failed. Check email/password.";

    }

    finally {

      $("loginBtn").disabled = false;

      $("loginBtn").innerText =
        "🔐 Login";

    }

  }
);


/* ================= AUTH ================= */

onAuthStateChanged(
  auth,
  user => {

    if (user) {

      $("loginBox").style.display =
        "none";

      $("dashboard").style.display =
        "block";


      loadSettings();

      loadProducts();

      loadOrders();

    }

    else {

      $("loginBox").style.display =
        "block";

      $("dashboard").style.display =
        "none";

    }

  }
);


/* ================= LOGOUT ================= */

$("logoutBtn").addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

    }

    catch (error) {

      console.error(error);

    }

  }
);


/* ================= IMAGE PREVIEW ================= */

$("productImage").addEventListener(
  "input",
  previewImage
);


function previewImage() {

  const filename =
    $("productImage")
      .value
      .trim();

  imageIsValid = false;

  $("saveProductBtn").disabled = true;


  if (!filename) {

    $("imagePreview").style.display =
      "none";

    $("previewText").style.display =
      "block";

    $("previewText").innerText =
      "🖼️ Image preview";

    $("imageStatus").innerText = "";

    return;
  }


  const path =
    `products/${filename}`;


  const image =
    $("imagePreview");


  image.onload = () => {

    image.style.display =
      "block";

    $("previewText").style.display =
      "none";

    $("imageStatus").className =
      "success";

    $("imageStatus").innerText =
      "✓ Image found";

    imageIsValid = true;

    validateProduct();

  };


  image.onerror = () => {

    image.style.display =
      "none";

    $("previewText").style.display =
      "block";

    $("previewText").innerText =
      "❌ Image not found";

    $("imageStatus").className =
      "error";

    $("imageStatus").innerText =
      "Check filename and extension.";

    imageIsValid = false;

    $("saveProductBtn").disabled =
      true;

  };


  image.src = path;

}


/* ================= VALIDATE PRODUCT ================= */

[
  "productName",
  "productPrice",
  "productStock"
].forEach(
  id => {

    $(id).addEventListener(
      "input",
      validateProduct
    );

  }
);


function validateProduct() {

  const name =
    $("productName")
      .value
      .trim();

  const price =
    Number(
      $("productPrice").value
    );

  const stock =
    Number(
      $("productStock").value
    );


  $("saveProductBtn").disabled =
    !(
      name &&
      price >= 0 &&
      stock >= 0 &&
      imageIsValid
    );

}


/* ================= SAVE PRODUCT ================= */

$("saveProductBtn").addEventListener(
  "click",
  saveProduct
);


async function saveProduct() {

  const name =
    $("productName")
      .value
      .trim();

  const price =
    Number(
      $("productPrice").value
    );


  const oldPriceText =
    $("productOldPrice")
      .value
      .trim();


  const oldPrice =
    oldPriceText
      ? Number(oldPriceText)
      : null;


  const category =
    $("productCategory")
      .value
      .trim();


  const filename =
    $("productImage")
      .value
      .trim();


  const stock =
    Number(
      $("productStock").value || 0
    );


  const featured =
    $("productFeatured").value === "true";


  const preorder =
    $("productPreorder").value === "true";


  const expectedDate =
    $("expectedDate").value;


  const description =
    $("productDescription")
      .value
      .trim();


  if (
    !name ||
    price < 0 ||
    stock < 0 ||
    !imageIsValid
  ) {

    $("productMessage").className =
      "error";

    $("productMessage").innerText =
      "⚠️ Complete all required fields.";

    return;
  }


  const data = {

    name,

    price,

    oldPrice,

    category,

    image:
      `products/${filename}`,

    stock,

    featured,

    preorder,

    expectedDate,

    description

  };


  $("saveProductBtn").disabled =
    true;


  $("saveProductBtn").innerText =
    editingId
      ? "⏳ Updating..."
      : "⏳ Adding...";


  try {

    if (editingId) {

      await updateDoc(
        doc(
          db,
          "products",
          editingId
        ),
        data
      );


      $("productMessage").className =
        "success";

      $("productMessage").innerText =
        "✅ Product updated.";

    }

    else {

      await addDoc(
        collection(
          db,
          "products"
        ),
        {

          ...data,

          createdAt:
            serverTimestamp()

        }
      );


      $("productMessage").className =
        "success";

      $("productMessage").innerText =
        "✅ Product added.";

    }


    resetProductForm();

    await loadProducts();

  }

  catch (error) {

    console.error(error);

    $("productMessage").className =
      "error";

    $("productMessage").innerText =
      "❌ Firebase error.";

  }

  finally {

    $("saveProductBtn").disabled =
      false;

    $("saveProductBtn").innerText =
      "➕ Add Product";

  }

}


/* ================= RESET PRODUCT ================= */

function resetProductForm() {

  editingId = null;

  imageIsValid = false;


  $("formTitle").innerText =
    "➕ Add Product";


  $("productName").value = "";

  $("productPrice").value = "";

  $("productOldPrice").value = "";

  $("productCategory").value = "";

  $("productImage").value = "";

  $("productStock").value = "0";

  $("productFeatured").value =
    "false";

  $("productPreorder").value =
    "false";

  $("expectedDate").value = "";

  $("productDescription").value = "";


  $("imagePreview").style.display =
    "none";


  $("previewText").style.display =
    "block";


  $("previewText").innerText =
    "🖼️ Image preview";


  $("imageStatus").innerText = "";


  $("cancelEditBtn").style.display =
    "none";


  $("saveProductBtn").disabled =
    true;

}


/* ================= CANCEL ================= */

$("cancelEditBtn").addEventListener(
  "click",
  resetProductForm
);


/* ================= LOAD PRODUCTS ================= */

async function loadProducts() {

  $("productList").innerText =
    "⏳ Loading products...";


  try {

    const q =
      query(
        collection(
          db,
          "products"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );


    const snapshot =
      await getDocs(q);


    allProducts = [];


    snapshot.forEach(
      productDoc => {

        allProducts.push({

          id:
            productDoc.id,

          ...productDoc.data()

        });

      }
    );


    renderProducts();

    updateStats();

  }

  catch (error) {

    console.error(error);

    $("productList").innerHTML =
      `<div class="empty">
        ❌ Unable to load products.
      </div>`;

  }

}


/* ================= RENDER PRODUCTS ================= */

function renderProducts() {

  const search =
    $("productSearch")
      .value
      .trim()
      .toLowerCase();


  const filter =
    $("productFilter").value;


  const list =
    allProducts.filter(
      product => {

        const text =
          `${product.name || ""}
           ${product.category || ""}`
            .toLowerCase();


        if (
          search &&
          !text.includes(search)
        ) {

          return false;

        }


        const stock =
          Number(
            product.stock || 0
          );


        if (
          filter === "stock" &&
          stock <= 0
        ) {

          return false;

        }


        if (
          filter === "low" &&
          (stock <= 0 || stock > 5)
        ) {

          return false;

        }


        if (
          filter === "out" &&
          stock > 0
        ) {

          return false;

        }


        if (
          filter === "preorder" &&
          product.preorder !== true
        ) {

          return false;

        }


        return true;

      }
    );


  if (list.length === 0) {

    $("productList").innerHTML =
      `<div class="empty">
        📦 No products found.
      </div>`;

    return;

  }


  $("productList").innerHTML =
    list.map(
      product => {

        const stock =
          Number(
            product.stock || 0
          );


        const productId =
          escapeAttribute(
            product.id
          );


        return `

          <div class="product-card">

            <img
              src="${escapeAttribute(
                product.image ||
                "profile.jpeg"
              )}"
              alt="${escapeAttribute(
                product.name ||
                "Product"
              )}"
              onerror="
                this.src='profile.jpeg'
              "
            >


            ${
              product.preorder
                ? `
                  <span class="preorder">
                    🛍️ Pre-Order
                  </span>
                `
                : ""
            }


            <h3>
              ${escapeHTML(
                product.name
              )}
            </h3>


            <p>
              ${
                escapeHTML(
                  product.category ||
                  "Uncategorized"
                )
              }
            </p>


            <strong>
              💰 ৳${money(product.price)}
            </strong>


            ${
              product.oldPrice
                ? `
                  <p>
                    <del>
                      ৳${money(product.oldPrice)}
                    </del>
                  </p>
                `
                : ""
            }


            <p>
              📦 Stock:
              <strong>
                ${stock}
              </strong>
            </p>


            ${
              product.featured
                ? "<p>⭐ Featured</p>"
                : ""
            }


            ${
              product.expectedDate
                ? `
                  <p>
                    📅 Available:
                    ${escapeHTML(
                      product.expectedDate
                    )}
                  </p>
                `
                : ""
            }


            <div class="actions">

              <button
                class="edit"
                onclick="editProduct('${productId}')"
              >
                ✏️ Edit
              </button>


              <button
                class="delete"
                onclick="deleteProduct('${productId}')"
              >
                🗑️ Delete
              </button>

            </div>

          </div>

        `;

      }
    ).join("");

}


/* ================= EDIT PRODUCT ================= */

window.editProduct =
  function(id) {

    const product =
      allProducts.find(
        p => p.id === id
      );


    if (!product) {
      return;
    }


    editingId = id;


    $("formTitle").innerText =
      "✏️ Edit Product";


    $("productName").value =
      product.name || "";


    $("productPrice").value =
      product.price ?? "";


    $("productOldPrice").value =
      product.oldPrice ?? "";


    $("productCategory").value =
      product.category || "";


    $("productStock").value =
      product.stock ?? 0;


    $("productFeatured").value =
      product.featured
        ? "true"
        : "false";


    $("productPreorder").value =
      product.preorder
        ? "true"
        : "false";


    $("expectedDate").value =
      product.expectedDate || "";


    $("productDescription").value =
      product.description || "";


    const image =
      String(
        product.image || ""
      )
      .replace(
        /^products\//,
        ""
      );


    $("productImage").value =
      image;


    $("cancelEditBtn").style.display =
      "block";


    previewImage();


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  };


/* ================= DELETE PRODUCT ================= */

window.deleteProduct =
  async function(id) {

    const product =
      allProducts.find(
        p => p.id === id
      );


    if (!product) {
      return;
    }


    if (
      !confirm(
        `🗑️ Delete "${product.name}"?`
      )
    ) {

      return;

    }


    try {

      await deleteDoc(
        doc(
          db,
          "products",
          id
        )
      );


      await loadProducts();

    }

    catch (error) {

      console.error(error);

      alert(
        "❌ Unable to delete product."
      );

    }

  };


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


    if (!snap.exists()) {
      return;
    }


    const data =
      snap.data();


    $("deliveryFee").value =
      data.deliveryFee ?? 0;


    $("couponCode").value =
      data.couponCode || "";


    $("couponPercent").value =
      data.couponPercent ?? 0;

  }

  catch (error) {

    console.error(error);

  }

}


/* ================= SAVE SETTINGS ================= */

$("saveSettingsBtn").addEventListener(
  "click",
  async () => {

    const deliveryFee =
      Number(
        $("deliveryFee").value || 0
      );


    const couponCode =
      $("couponCode")
        .value
        .trim()
        .toUpperCase();


    const couponPercent =
      Number(
        $("couponPercent").value || 0
      );


    if (
      deliveryFee < 0
    ) {

      $("settingsMessage").className =
        "error";

      $("settingsMessage").innerText =
        "⚠️ Delivery charge cannot be negative.";

      return;

    }


    if (
      couponPercent < 0 ||
      couponPercent > 100
    ) {

      $("settingsMessage").className =
        "error";

      $("settingsMessage").innerText =
        "⚠️ Coupon must be 0-100%.";

      return;

    }


    try {

      await setDoc(
        doc(
          db,
          "settings",
          "store"
        ),
        {

          deliveryFee,

          couponCode,

          couponPercent

        },
        {
          merge: true
        }
      );


      $("settingsMessage").className =
        "success";

      $("settingsMessage").innerText =
        "✅ Settings saved.";

    }

    catch (error) {

      console.error(error);

      $("settingsMessage").className =
        "error";

      $("settingsMessage").innerText =
        "❌ Unable to save settings.";

    }

  }
);


/* ================= LOAD ORDERS ================= */

async function loadOrders() {

  $("orderList").innerText =
    "⏳ Loading orders...";


  try {

    const q =
      query(
        collection(
          db,
          "orders"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );


    const snapshot =
      await getDocs(q);


    allOrders = [];


    snapshot.forEach(
      orderDoc => {

        allOrders.push({

          id:
            orderDoc.id,

          ...orderDoc.data()

        });

      }
    );


    renderOrders();

    updateStats();

  }

  catch (error) {

    console.error(error);

    $("orderList").innerHTML =
      `<div class="empty">
        ❌ Unable to load orders.
      </div>`;

  }

}


/* ================= RENDER ORDERS ================= */

function renderOrders() {

  const search =
    $("orderSearch")
      .value
      .trim()
      .toLowerCase();


  const filter =
    $("orderFilter").value;


  const list =
    allOrders.filter(
      order => {

        const customer =
          order.customer || {};


        const text =
          `${order.orderId || ""}
           ${customer.name || ""}
           ${customer.phone || ""}`
            .toLowerCase();


        const searchOK =
          !search ||
          text.includes(search);


        const filterOK =
          filter === "all" ||
          (
            order.orderStatus ||
            "Pending"
          ) === filter;


        return (
          searchOK &&
          filterOK
        );

      }
    );


  if (list.length === 0) {

    $("orderList").innerHTML =
      `<div class="empty">
        🧾 No orders found.
      </div>`;

    return;

  }


  $("orderList").innerHTML =
    list
      .map(renderOrder)
      .join("");

}


/* ================= ORDER CARD ================= */

function renderOrder(order) {

  const customer =
    order.customer || {};


  const payment =
    order.payment || {};


  const items =
    Array.isArray(order.items)
      ? order.items
      : [];


  const paymentStatus =
    payment.status ||
    "Pending";


  const orderStatus =
    order.orderStatus ||
    "Pending";


  const itemsHTML =
    items
      .map(
        item => `

          <div class="order-item">

            <span>

              ${escapeHTML(
                item.productName ||
                item.name ||
                "Product"
              )}

              ×

              ${Number(
                item.quantity || 0
              )}

              ${
                item.preorder
                  ? " 🛍️"
                  : ""
              }

            </span>


            <strong>
              ৳${money(
                item.subtotal
              )}
            </strong>

          </div>

        `
      )
      .join("");


  let date =
    "Date unavailable";


  if (
    order.createdAt &&
    typeof order.createdAt.toDate ===
      "function"
  ) {

    date =
      order.createdAt
        .toDate()
        .toLocaleString();

  }


  return `

    <div class="order-card">

      <div class="order-header">

        <div class="order-id">

          🆔
          ${escapeHTML(
            order.orderId ||
            order.id
          )}

        </div>


        <small>
          ${escapeHTML(date)}
        </small>

      </div>


      ${
        order.isPreOrder
          ? `
            <div class="preorder">
              🛍️ Contains Pre-Order
            </div>
          `
          : ""
      }


      <div class="order-info">

        <strong>
          👤 Customer
        </strong>

        <br>

        Name:
        ${escapeHTML(
          customer.name || ""
        )}

        <br>

        Phone:
        ${escapeHTML(
          customer.phone || ""
        )}

        <br>

        Receive:
        ${escapeHTML(
          order.receiveMethod ||
          "Delivery"
        )}

        ${
          order.receiveMethod ===
          "Delivery"
            ? `
              <br>
              Address:
              ${escapeHTML(
                customer.address || ""
              )}
            `
            : ""
        }

      </div>


      <div class="order-items">

        ${itemsHTML}

      </div>


      <div class="payment">

        <strong>
          💳 Payment
        </strong>

        <br>

        Method:
        ${escapeHTML(
          payment.method || ""
        )}

        <br>

        Transaction ID:
        <strong>
          ${escapeHTML(
            payment.transactionId || ""
          )}
        </strong>

        <br>

        Status:

        <strong
          class="${
            paymentStatus ===
            "Confirmed"
              ? "confirmed"
              : paymentStatus ===
                "Rejected"
                ? "rejected"
                : "pending"
          }"
        >

          ${escapeHTML(
            paymentStatus
          )}

        </strong>

        <br>

        Total:
        ৳${money(order.total)}

        <br>

        Paid:
        ৳${money(order.paidNow)}

        <br>

        Due:
        ৳${money(order.dueOnPickup)}

      </div>


      <div class="controls">

        <div>

          <label>
            📦 Order Status
          </label>

          <select
            onchange="
              updateOrderStatus(
                '${escapeAttribute(order.id)}',
                this.value
              )
            "
          >

            ${
              [
                "Pending",
                "Processing",
                "Shipped",
                "Delivered",
                "Cancelled"
              ]
                .map(
                  status => `

                    <option
                      value="${status}"
                      ${
                        orderStatus ===
                        status
                          ? "selected"
                          : ""
                      }
                    >
                      ${status}
                    </option>

                  `
                )
                .join("")
            }

          </select>

        </div>


        <div>

          <label>
            💳 Payment Status
          </label>

          <select
            onchange="
              updatePaymentStatus(
                '${escapeAttribute(order.id)}',
                this.value
              )
            "
          >

            ${
              [
                "Pending",
                "Confirmed",
                "Rejected"
              ]
                .map(
                  status => `

                    <option
                      value="${status}"
                      ${
                        paymentStatus ===
                        status
                          ? "selected"
                          : ""
                      }
                    >
                      ${status}
                    </option>

                  `
                )
                .join("")
            }

          </select>

        </div>

      </div>


      <div class="actions">

        <button
          onclick="
            contactCustomer(
              '${escapeAttribute(
                customer.phone || ""
              )}'
            )
          "
        >
          📞 Contact
        </button>


        <button
          onclick="
            whatsappCustomer(
              '${escapeAttribute(
                customer.phone || ""
              )}',
              '${escapeAttribute(
                order.orderId ||
                order.id ||
                ""
              )}'
            )
          "
        >
          💬 WhatsApp
        </button>

      </div>

    </div>

  `;

}


/* ================= ORDER STATUS ================= */

window.updateOrderStatus =
  async function(id, status) {

    try {

      await updateDoc(
        doc(
          db,
          "orders",
          id
        ),
        {

          orderStatus:
            status,

          updatedAt:
            serverTimestamp()

        }
      );


      await loadOrders();

    }

    catch (error) {

      console.error(error);

      alert(
        "❌ Unable to update order."
      );

    }

  };


/* ================= PAYMENT STATUS ================= */

window.updatePaymentStatus =
  async function(id, status) {

    try {

      await updateDoc(
        doc(
          db,
          "orders",
          id
        ),
        {

          "payment.status":
            status,

          updatedAt:
            serverTimestamp()

        }
      );


      await loadOrders();

    }

    catch (error) {

      console.error(error);

      alert(
        "❌ Unable to update payment."
      );

    }

  };


/* ================= CONTACT ================= */

window.contactCustomer =
  function(phone) {

    if (!phone) {
      return;
    }


    window.location.href =
      `tel:${phone}`;

  };


/* ================= WHATSAPP ================= */

window.whatsappCustomer =
  function(phone, orderId) {

    if (!phone) {
      return;
    }


    let number =
      String(phone)
        .replace(/\D/g, "");


    if (
      number.startsWith("01")
    ) {

      number =
        "88" + number;

    }


    const message =
      encodeURIComponent(
        `Hello from DIYANO regarding your order ${orderId}.`
      );


    window.open(
      `https://wa.me/${number}?text=${message}`,
      "_blank"
    );

  };


/* ================= STATS ================= */

function updateStats() {

  $("statProducts").innerText =
    allProducts.length;


  $("statOrders").innerText =
    allOrders.length;


  $("statPending").innerText =
    allOrders.filter(
      order =>
        (
          order.orderStatus ||
          "Pending"
        ) === "Pending"
    ).length;


  const sales =
    allOrders
      .filter(
        order =>
          order.orderStatus !==
          "Cancelled"
      )
      .reduce(
        (sum, order) =>
          sum +
          Number(
            order.total || 0
          ),
        0
      );


  $("statSales").innerText =
    `৳${money(sales)}`;

}


/* ================= FILTER EVENTS ================= */

$("productSearch").addEventListener(
  "input",
  renderProducts
);


$("productFilter").addEventListener(
  "change",
  renderProducts
);


$("orderSearch").addEventListener(
  "input",
  renderOrders
);


$("orderFilter").addEventListener(
  "change",
  renderOrders
);
