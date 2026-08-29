import {
  initializeApp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  serverTimestamp
} from
"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =====================================================
   FIREBASE
===================================================== */

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


const auth =
  getAuth(app);


const db =
  getFirestore(app);


/* =====================================================
   VARIABLES
===================================================== */

let products = [];

let orders = [];

let editingProductId = null;


/* =====================================================
   HELPERS
===================================================== */

function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function money(value) {

  return Number(value || 0)
    .toLocaleString("en-BD");

}


function imagePath(filename) {

  const value =
    String(filename || "").trim();

  if (!value) {

    return "profile.jpeg";

  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  ) {

    return value;

  }

  if (
    value.startsWith("products/")
  ) {

    return value;

  }

  return `products/${value}`;

}


/* =====================================================
   ELEMENTS
===================================================== */

const loginBox =
  document.getElementById(
    "loginBox"
  );

const dashboard =
  document.getElementById(
    "dashboard"
  );

const emailInput =
  document.getElementById(
    "email"
  );

const passwordInput =
  document.getElementById(
    "password"
  );

const loginBtn =
  document.getElementById(
    "loginBtn"
  );

const loginMessage =
  document.getElementById(
    "loginMessage"
  );

const logoutBtn =
  document.getElementById(
    "logoutBtn"
  );


/* =====================================================
   LOGIN
===================================================== */

loginBtn.addEventListener(
  "click",
  async () => {

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    loginMessage.innerHTML =
      "";

    if (!email) {

      loginMessage.innerHTML =
        `<span class="error">
          📧 Enter admin email.
        </span>`;

      return;

    }

    if (!password) {

      loginMessage.innerHTML =
        `<span class="error">
          🔑 Enter password.
        </span>`;

      return;

    }

    loginBtn.disabled = true;

    loginBtn.innerText =
      "⏳ Logging in...";

    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      loginMessage.innerHTML =
        `<span class="success">
          ✅ Login successful.
        </span>`;

    }

    catch (error) {

      console.error(error);

      loginMessage.innerHTML =
        `<span class="error">
          ❌ ${escapeHTML(
            firebaseAuthError(error)
          )}
        </span>`;

    }

    finally {

      loginBtn.disabled = false;

      loginBtn.innerText =
        "🔐 Login";

    }

  }
);


/* =====================================================
   AUTH ERROR
===================================================== */

function firebaseAuthError(error) {

  switch (error.code) {

    case "auth/invalid-credential":
      return "Invalid email or password.";

    case "auth/user-not-found":
      return "Admin account not found.";

    case "auth/wrong-password":
      return "Incorrect password.";

    case "auth/invalid-email":
      return "Invalid email address.";

    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";

    default:
      return error.message ||
        "Unable to login.";

  }

}


/* =====================================================
   AUTH STATE
===================================================== */

onAuthStateChanged(
  auth,
  async user => {

    if (user) {

      loginBox.style.display =
        "none";

      dashboard.style.display =
        "block";

      await initializeDashboard();

    }

    else {

      loginBox.style.display =
        "block";

      dashboard.style.display =
        "none";

    }

  }
);


/* =====================================================
   LOGOUT
===================================================== */

logoutBtn.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);

    }

    catch (error) {

      console.error(error);

      alert(
        "❌ Unable to logout."
      );

    }

  }
);


/* =====================================================
   DASHBOARD INITIALIZE
===================================================== */

async function initializeDashboard() {

  await loadSettings();

  await loadProducts();

  await loadOrders();

  updateStats();

}


/* =====================================================
   SETTINGS
===================================================== */

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

    if (!snap.exists())
      return;

    const data =
      snap.data();

    document.getElementById(
      "deliveryFee"
    ).value =
      data.deliveryFee ?? 0;

    document.getElementById(
      "couponCode"
    ).value =
      data.couponCode ?? "";

    document.getElementById(
      "couponPercent"
    ).value =
      data.couponPercent ?? 0;

  }

  catch (error) {

    console.error(
      "Settings load error:",
      error
    );

  }

}


/* =====================================================
   SAVE SETTINGS
===================================================== */

document
  .getElementById(
    "saveSettingsBtn"
  )
  .addEventListener(
    "click",
    async () => {

      const deliveryFee =
        Number(
          document.getElementById(
            "deliveryFee"
          ).value || 0
        );

      const couponCode =
        document.getElementById(
          "couponCode"
        ).value
          .trim()
          .toUpperCase();

      let couponPercent =
        Number(
          document.getElementById(
            "couponPercent"
          ).value || 0
        );

      if (couponPercent < 0)
        couponPercent = 0;

      if (couponPercent > 100)
        couponPercent = 100;

      const button =
        document.getElementById(
          "saveSettingsBtn"
        );

      const message =
        document.getElementById(
          "settingsMessage"
        );

      button.disabled = true;

      button.innerText =
        "⏳ Saving...";

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

            couponPercent,

            updatedAt:
              serverTimestamp()

          },
          {
            merge: true
          }
        );

        message.innerHTML =
          `<span class="success">
            ✅ Store settings saved.
          </span>`;

      }

      catch (error) {

        console.error(error);

        message.innerHTML =
          `<span class="error">
            ❌ Unable to save settings.
          </span>`;

      }

      finally {

        button.disabled = false;

        button.innerText =
          "💾 Save Store Settings";

      }

    }
  );


/* =====================================================
   IMAGE PREVIEW
===================================================== */

const productImage =
  document.getElementById(
    "productImage"
  );

const imagePreview =
  document.getElementById(
    "imagePreview"
  );

const previewText =
  document.getElementById(
    "previewText"
  );

const imageStatus =
  document.getElementById(
    "imageStatus"
  );


productImage.addEventListener(
  "input",
  previewProductImage
);


function previewProductImage() {

  const filename =
    productImage.value.trim();

  if (!filename) {

    imagePreview.style.display =
      "none";

    previewText.style.display =
      "block";

    imageStatus.innerHTML =
      "";

    return;

  }

  const path =
    imagePath(filename);

  imagePreview.src =
    path;

  imagePreview.style.display =
    "block";

  previewText.style.display =
    "none";

  imageStatus.innerHTML =
    "⏳ Checking image...";

}


imagePreview.addEventListener(
  "load",
  () => {

    imageStatus.innerHTML =
      `<span class="success">
        ✅ Image found: ${escapeHTML(
          imagePath(
            productImage.value
          )
        )}
      </span>`;

  }
);


imagePreview.addEventListener(
  "error",
  () => {

    imagePreview.style.display =
      "none";

    previewText.style.display =
      "block";

    imageStatus.innerHTML =
      `<span class="error">
        ❌ Image not found.
        Check filename and products/ folder.
      </span>`;

  }
);


/* =====================================================
   LOAD PRODUCTS
===================================================== */

async function loadProducts() {

  const list =
    document.getElementById(
      "productList"
    );

  list.innerHTML =
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

    renderProducts();

    updateStats();

  }

  catch (error) {

    console.error(
      "Products error:",
      error
    );

    list.innerHTML =
      `<div class="empty">
        ❌ Unable to load products.
        <br><br>
        Check Firebase / Firestore rules.
      </div>`;

  }

}


/* =====================================================
   RENDER PRODUCTS
===================================================== */

function renderProducts() {

  const list =
    document.getElementById(
      "productList"
    );

  const search =
    document.getElementById(
      "productSearch"
    ).value
      .trim()
      .toLowerCase();

  const filter =
    document.getElementById(
      "productFilter"
    ).value;

  let result =
    products.filter(
      product => {

        const text =
          `
          ${product.name || ""}
          ${product.category || ""}
          ${product.description || ""}
          `.toLowerCase();

        const searchOK =
          !search ||
          text.includes(search);

        const stock =
          Number(
            product.stock || 0
          );

        let filterOK = true;

        if (filter === "stock") {

          filterOK =
            stock > 0 &&
            product.preorder !== true;

        }

        if (filter === "low") {

          filterOK =
            stock > 0 &&
            stock <= 5 &&
            product.preorder !== true;

        }

        if (filter === "out") {

          filterOK =
            stock <= 0 &&
            product.preorder !== true;

        }

        if (filter === "preorder") {

          filterOK =
            product.preorder === true;

        }

        return (
          searchOK &&
          filterOK
        );

      }
    );


  if (!result.length) {

    list.innerHTML =
      `<div class="empty">
        📦 No products found.
      </div>`;

    return;

  }


  list.innerHTML =
    result
      .map(
        product => {

          const stock =
            Number(
              product.stock || 0
            );

          const price =
            Number(
              product.price || 0
            );

          const oldPrice =
            Number(
              product.oldPrice || 0
            );

          const image =
            imagePath(
              product.image
            );

          return `

            <div class="product-card">

              <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(
                  product.name ||
                  "Product"
                )}"
                onerror="
                  this.src='profile.jpeg'
                "
              >

              <h3>
                ${escapeHTML(
                  product.name ||
                  "Unnamed Product"
                )}
              </h3>

              <p>
                📂 ${escapeHTML(
                  product.category ||
                  "Uncategorized"
                )}
              </p>

              <strong>
                💰 ৳${money(price)}
              </strong>

              ${
                oldPrice > price
                  ?
                  `
                  <del>
                    ৳${money(oldPrice)}
                  </del>
                  `
                  :
                  ""
              }

              <p>
                📦 Stock:
                <strong>
                  ${stock}
                </strong>
              </p>

              ${
                product.featured
                  ?
                  `<span class="preorder">
                    ⭐ Featured
                  </span>`
                  :
                  ""
              }

              ${
                product.preorder
                  ?
                  `<span class="preorder">
                    🛍️ Pre-Order
                  </span>`
                  :
                  ""
              }

              <div class="actions">

                <button
                  class="edit"
                  onclick="
                    editProduct(
                      '${product.id}'
                    )
                  ">
                  ✏️ Edit
                </button>

                <button
                  class="delete"
                  onclick="
                    deleteProduct(
                      '${product.id}'
                    )
                  ">
                  🗑️ Delete
                </button>

              </div>

            </div>

          `;

        }
      )
      .join("");

}


/* =====================================================
   SEARCH / FILTER
===================================================== */

document
  .getElementById(
    "productSearch"
  )
  .addEventListener(
    "input",
    renderProducts
  );


document
  .getElementById(
    "productFilter"
  )
  .addEventListener(
    "change",
    renderProducts
  );


/* =====================================================
   ADD / UPDATE PRODUCT
===================================================== */

document
  .getElementById(
    "saveProductBtn"
  )
  .addEventListener(
    "click",
    saveProduct
  );


async function saveProduct() {

  const name =
    document.getElementById(
      "productName"
    ).value.trim();

  const price =
    Number(
      document.getElementById(
        "productPrice"
      ).value || 0
    );

  const oldPrice =
    Number(
      document.getElementById(
        "productOldPrice"
      ).value || 0
    );

  const category =
    document.getElementById(
      "productCategory"
    ).value.trim();

  const image =
    document.getElementById(
      "productImage"
    ).value.trim();

  const stock =
    Number(
      document.getElementById(
        "productStock"
      ).value || 0
    );

  const featured =
    document.getElementById(
      "productFeatured"
    ).value === "true";

  const preorder =
    document.getElementById(
      "productPreorder"
    ).value === "true";

  const expectedDate =
    document.getElementById(
      "expectedDate"
    ).value;

  const description =
    document.getElementById(
      "productDescription"
    ).value.trim();

  const message =
    document.getElementById(
      "productMessage"
    );

  const button =
    document.getElementById(
      "saveProductBtn"
    );


  if (!name) {

    message.innerHTML =
      `<span class="error">
        🏷️ Product name is required.
      </span>`;

    return;

  }


  if (price <= 0) {

    message.innerHTML =
      `<span class="error">
        💰 Price must be greater than 0.
      </span>`;

    return;

  }


  if (!image) {

    message.innerHTML =
      `<span class="error">
        🖼️ Product image filename is required.
      </span>`;

    return;

  }


  if (stock < 0) {

    message.innerHTML =
      `<span class="error">
        📦 Stock cannot be negative.
      </span>`;

    return;

  }


  const productData = {

    name,

    price,

    oldPrice,

    category,

    image,

    stock,

    featured,

    preorder,

    expectedDate,

    description,

    updatedAt:
      serverTimestamp()

  };


  button.disabled = true;

  button.innerText =
    editingProductId
      ?
      "⏳ Updating..."
      :
      "⏳ Adding...";


  try {

    if (editingProductId) {

      await updateDoc(
        doc(
          db,
          "products",
          editingProductId
        ),
        productData
      );

      message.innerHTML =
        `<span class="success">
          ✅ Product updated successfully.
        </span>`;

    }

    else {

      await addDoc(
        collection(
          db,
          "products"
        ),
        {

          ...productData,

          createdAt:
            serverTimestamp()

        }
      );

      message.innerHTML =
        `<span class="success">
          ✅ Product added successfully.
        </span>`;

    }


    resetProductForm();

    await loadProducts();

  }

  catch (error) {

    console.error(
      "Product save error:",
      error
    );

    message.innerHTML =
      `<span class="error">
        ❌ ${escapeHTML(
          error.message ||
          "Unable to save product."
        )}
      </span>`;

  }

  finally {

    button.disabled = false;

    button.innerText =
      editingProductId
        ?
        "💾 Update Product"
        :
        "➕ Add Product";

  }

}


/* =====================================================
   EDIT PRODUCT
===================================================== */

window.editProduct =
  function(id) {

    const product =
      products.find(
        p => p.id === id
      );

    if (!product)
      return;

    editingProductId =
      id;


    document.getElementById(
      "formTitle"
    ).innerText =
      "✏️ Edit Product";


    document.getElementById(
      "productName"
    ).value =
      product.name || "";


    document.getElementById(
      "productPrice"
    ).value =
      product.price || 0;


    document.getElementById(
      "productOldPrice"
    ).value =
      product.oldPrice || 0;


    document.getElementById(
      "productCategory"
    ).value =
      product.category || "";


    document.getElementById(
      "productImage"
    ).value =
      product.image || "";


    document.getElementById(
      "productStock"
    ).value =
      product.stock || 0;


    document.getElementById(
      "productFeatured"
    ).value =
      product.featured
        ? "true"
        : "false";


    document.getElementById(
      "productPreorder"
    ).value =
      product.preorder
        ? "true"
        : "false";


    document.getElementById(
      "expectedDate"
    ).value =
      product.expectedDate || "";


    document.getElementById(
      "productDescription"
    ).value =
      product.description || "";


    const button =
      document.getElementById(
        "saveProductBtn"
      );

    button.innerText =
      "💾 Update Product";


    document.getElementById(
      "cancelEditBtn"
    ).style.display =
      "block";


    previewProductImage();


    document.getElementById(
      "formTitle"
    ).scrollIntoView({
      behavior: "smooth"
    });

  };


/* =====================================================
   DELETE PRODUCT
===================================================== */

window.deleteProduct =
  async function(id) {

    const product =
      products.find(
        p => p.id === id
      );

    if (!product)
      return;


    const confirmed =
      confirm(
        `Delete "${product.name}"?\n\nThis cannot be undone.`
      );

    if (!confirmed)
      return;


    try {

      await deleteDoc(
        doc(
          db,
          "products",
          id
        )
      );

      alert(
        "✅ Product deleted."
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


/* =====================================================
   CANCEL EDIT
===================================================== */

document
  .getElementById(
    "cancelEditBtn"
  )
  .addEventListener(
    "click",
    resetProductForm
  );


function resetProductForm() {

  editingProductId =
    null;


  document.getElementById(
    "formTitle"
  ).innerText =
    "➕ Add Product";


  document.getElementById(
    "productName"
  ).value = "";


  document.getElementById(
    "productPrice"
  ).value = "";


  document.getElementById(
    "productOldPrice"
  ).value = "";


  document.getElementById(
    "productCategory"
  ).value = "";


  document.getElementById(
    "productImage"
  ).value = "";


  document.getElementById(
    "productStock"
  ).value = "0";


  document.getElementById(
    "productFeatured"
  ).value = "false";


  document.getElementById(
    "productPreorder"
  ).value = "false";


  document.getElementById(
    "expectedDate"
  ).value = "";


  document.getElementById(
    "productDescription"
  ).value = "";


  document.getElementById(
    "saveProductBtn"
  ).innerText =
    "➕ Add Product";


  document.getElementById(
    "cancelEditBtn"
  ).style.display =
    "none";


  imagePreview.style.display =
    "none";

  previewText.style.display =
    "block";

  imageStatus.innerHTML =
    "";

}


/* =====================================================
   LOAD ORDERS
===================================================== */

async function loadOrders() {

  const list =
    document.getElementById(
      "orderList"
    );

  list.innerHTML =
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

    orders = [];

    snapshot.forEach(
      orderDoc => {

        orders.push({

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

    console.error(
      "Orders error:",
      error
    );

    list.innerHTML =
      `<div class="empty">
        ❌ Unable to load orders.
      </div>`;

  }

}


/* =====================================================
   RENDER ORDERS
===================================================== */

function renderOrders() {

  const list =
    document.getElementById(
      "orderList"
    );

  const search =
    document.getElementById(
      "orderSearch"
    ).value
      .trim()
      .toLowerCase();

  const filter =
    document.getElementById(
      "orderFilter"
    ).value;


  let result =
    orders.filter(
      order => {

        const text =
          `
          ${order.orderId || ""}
          ${order.customer?.name || ""}
          ${order.customer?.phone || ""}
          ${order.customer?.address || ""}
          `.toLowerCase();

        const searchOK =
          !search ||
          text.includes(search);

        const filterOK =
          filter === "all" ||
          order.orderStatus === filter;

        return (
          searchOK &&
          filterOK
        );

      }
    );


  if (!result.length) {

    list.innerHTML =
      `<div class="empty">
        🛍️ No orders found.
      </div>`;

    return;

  }


  list.innerHTML =
    result
      .map(
        order =>
          orderCard(order)
      )
      .join("");

}


/* =====================================================
   ORDER CARD
===================================================== */

function orderCard(order) {

  const customer =
    order.customer || {};

  const payment =
    order.payment || {};

  const status =
    order.orderStatus ||
    "Pending";

  const paymentStatus =
    payment.status ||
    "Pending";


  let created =
    "";

  if (
    order.createdAt &&
    order.createdAt.toDate
  ) {

    created =
      order.createdAt
        .toDate()
        .toLocaleString(
          "en-BD"
        );

  }


  const statusClass =
    status === "Delivered"
      ?
      "confirmed"
      :
      status === "Cancelled"
        ?
        "rejected"
        :
        "pending";


  return `

    <div class="order-card">

      <div class="order-header">

        <div>

          <div class="order-id">
            📦 ${escapeHTML(
              order.orderId ||
              order.id
            )}
          </div>

          ${
            created
              ?
              `<small>
                🕒 ${escapeHTML(created)}
              </small>`
              :
              ""
          }

        </div>

        <span
          class="status-badge ${statusClass}">

          ${statusEmoji(status)}
          ${escapeHTML(status)}

        </span>

      </div>


      <div class="order-info">

        <strong>
          👤 Customer
        </strong>

        <br>

        ${escapeHTML(
          customer.name ||
          "N/A"
        )}

        <br>

        📱 ${escapeHTML(
          customer.phone ||
          "N/A"
        )}

        <br>

        ${
          order.receiveMethod ===
          "Delivery"
            ?
            `
            🚚 Delivery
            <br>
            📍 ${escapeHTML(
              customer.address ||
              "No address"
            )}
            `
            :
            `
            🏪 Self Pickup
            `
        }

        <br>

        🛍️ ${
          order.isPreOrder
            ?
            "Pre-Order"
            :
            "Regular Order"
        }

      </div>


      <div class="order-items">

        <strong>
          🛒 Items
        </strong>

        ${
          Array.isArray(order.items)
            ?
            order.items
              .map(
                item => `

                  <div class="order-item">

                    <span>

                      ${escapeHTML(
                        item.productName ||
                        "Product"
                      )}

                      ×
                      ${Number(
                        item.quantity || 0
                      )}

                      ${
                        item.preorder
                          ?
                          " 🛍️"
                          :
                          ""
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
              .join("")
            :
            ""
        }

      </div>


      <div class="payment">

        <strong>
          💳 Payment
        </strong>

        <br>

        Method:
        ${escapeHTML(
          payment.method ||
          "N/A"
        )}

        <br>

        Transaction ID:
        <strong>
          ${escapeHTML(
            payment.transactionId ||
            "N/A"
          )}
        </strong>

        <br>

        Payment Status:
        <strong class="${
          paymentStatus === "Confirmed"
            ?
            "confirmed"
            :
            paymentStatus === "Rejected"
              ?
              "rejected"
              :
              "pending"
        }">

          ${paymentStatus}

        </strong>

        <hr>

        💰 Subtotal:
        ৳${money(
          order.subtotal
        )}

        <br>

        🎟️ Discount:
        - ৳${money(
          order.discount
        )}

        <br>

        🚚 Delivery:
        ৳${money(
          order.deliveryFee
        )}

        <br>

        <strong>
          💰 Total:
          ৳${money(
            order.total
          )}
        </strong>

        <br>

        💳 Paid:
        ৳${money(
          order.paidNow
        )}

        ${
          Number(
            order.dueOnPickup || 0
          ) > 0
            ?
            `
            <br>

            🏪 Due on Pickup:
            ৳${money(
              order.dueOnPickup
            )}
            `
            :
            ""
        }

      </div>


      <div class="order-buttons">

        ${
          paymentStatus !== "Confirmed"
            ?
            `
            <button
              class="confirm-btn"
              onclick="
                updatePaymentStatus(
                  '${order.id}',
                  'Confirmed'
                )
              ">
              ✅ Confirm Payment
            </button>
            `
            :
            ""
        }


        ${
          paymentStatus !== "Rejected"
            ?
            `
            <button
              class="reject-btn"
              onclick="
                updatePaymentStatus(
                  '${order.id}',
                  'Rejected'
                )
              ">
              ❌ Reject Payment
            </button>
            `
            :
            ""
        }

      </div>


      <div class="controls">

        <select
          onchange="
            updateOrderStatus(
              '${order.id}',
              this.value
            )
          ">

          <option
            value="Pending"
            ${
              status === "Pending"
                ? "selected"
                : ""
            }>
            ⏳ Pending
          </option>

          <option
            value="Processing"
            ${
              status === "Processing"
                ? "selected"
                : ""
            }>
            ⚙️ Processing
          </option>

          <option
            value="Shipped"
            ${
              status === "Shipped"
                ? "selected"
                : ""
            }>
            🚚 Shipped
          </option>

          <option
            value="Delivered"
            ${
              status === "Delivered"
                ? "selected"
                : ""
            }>
            ✅ Delivered
          </option>

          <option
            value="Cancelled"
            ${
              status === "Cancelled"
                ? "selected"
                : ""
            }>
            ❌ Cancelled
          </option>

        </select>


        <button
          class="status-btn"
          onclick="
            refreshOrders()
          ">
          🔄 Refresh
        </button>

      </div>

    </div>

  `;

}


/* =====================================================
   STATUS EMOJI
===================================================== */

function statusEmoji(status) {

  switch (status) {

    case "Processing":
      return "⚙️";

    case "Shipped":
      return "🚚";

    case "Delivered":
      return "✅";

    case "Cancelled":
      return "❌";

    default:
      return "⏳";

  }

}


/* =====================================================
   UPDATE PAYMENT
===================================================== */

window.updatePaymentStatus =
  async function(
    orderDocId,
    status
  ) {

    const order =
      orders.find(
        item =>
          item.id === orderDocId
      );

    if (!order)
      return;


    const message =
      status === "Confirmed"
        ?
        "Confirm this payment?"
        :
        "Reject this payment?";


    if (!confirm(message))
      return;


    try {

      await updateDoc(
        doc(
          db,
          "orders",
          orderDocId
        ),
        {

          "payment.status":
            status,

          paymentVerifiedAt:
            serverTimestamp()

        }
      );


      alert(
        status === "Confirmed"
          ?
          "✅ Payment confirmed."
          :
          "❌ Payment rejected."
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


/* =====================================================
   UPDATE ORDER STATUS
===================================================== */

window.updateOrderStatus =
  async function(
    orderDocId,
    status
  ) {

    try {

      await updateDoc(
        doc(
          db,
          "orders",
          orderDocId
        ),
        {

          orderStatus:
            status,

          statusUpdatedAt:
            serverTimestamp()

        }
      );


      await loadOrders();

    }

    catch (error) {

      console.error(error);

      alert(
        "❌ Unable to update order status."
      );

    }

  };


/* =====================================================
   ORDER SEARCH
===================================================== */

document
  .getElementById(
    "orderSearch"
  )
  .addEventListener(
    "input",
    renderOrders
  );


document
  .getElementById(
    "orderFilter"
  )
  .addEventListener(
    "change",
    renderOrders
  );


/* =====================================================
   REFRESH ORDERS
===================================================== */

window.refreshOrders =
  async function() {

    await loadOrders();

  };


/* =====================================================
   STATS
===================================================== */

function updateStats() {

  document.getElementById(
    "statProducts"
  ).innerText =
    products.length;


  document.getElementById(
    "statOrders"
  ).innerText =
    orders.length;


  const pending =
    orders.filter(
      order =>
        order.orderStatus ===
        "Pending"
    ).length;


  document.getElementById(
    "statPending"
  ).innerText =
    pending;


  const sales =
    orders
      .filter(
        order =>
          order.orderStatus !==
          "Cancelled"
      )
      .reduce(
        (
          total,
          order
        ) =>
          total +
          Number(
            order.paidNow ||
            0
          ),
        0
      );


  document.getElementById(
    "statSales"
  ).innerText =
    `৳${money(sales)}`;

}


/* =====================================================
   AUTO REFRESH
===================================================== */

setInterval(
  async () => {

    if (
      auth.currentUser
    ) {

      await loadProducts();

      await loadOrders();

      updateStats();

    }

  },
  60000
);
