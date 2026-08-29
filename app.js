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
  serverTimestamp,
  runTransaction
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


/* ================= PAYMENT ================= */

const PAYMENT_INFO = {

  bKash: {
    number: "01875487705"
  },

  Nagad: {
    number: "01875487705"
  }

};


/* ================= VARIABLES ================= */

let products = [];


let cart =
  JSON.parse(
    localStorage.getItem("diyano_cart") ||
    "[]"
  );


let wishlist =
  JSON.parse(
    localStorage.getItem("diyano_wishlist") ||
    "[]"
  );


let settings = {

  deliveryFee: 0,

  couponCode: "",

  couponPercent: 0

};


let appliedCoupon = false;


/* ================= HELPERS ================= */

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


function saveCart() {

  localStorage.setItem(
    "diyano_cart",
    JSON.stringify(cart)
  );

}


function saveWishlist() {

  localStorage.setItem(
    "diyano_wishlist",
    JSON.stringify(wishlist)
  );

}


/* ================= LOAD SETTINGS ================= */

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


    if (snap.exists()) {

      settings = {
        ...settings,
        ...snap.data()
      };

    }

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

  const loading =
    document.getElementById(
      "loading"
    );


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


    loading.style.display =
      "none";


    buildCategories();

    renderProducts();

    renderFeatured();

  }

  catch (error) {

    console.error(
      "Products error:",
      error
    );


    loading.innerHTML = `
      <div style="
        font-size:40px;
        margin-bottom:10px;
      ">
        ⚠️
      </div>

      <strong>
        Unable to load products.
      </strong>

      <p>
        Please check Firebase connection.
      </p>
    `;

  }

}


/* ================= CATEGORIES ================= */

function buildCategories() {

  const select =
    document.getElementById(
      "categoryFilter"
    );


  const categories =
    [
      ...new Set(
        products
          .map(
            p => p.category
          )
          .filter(Boolean)
      )
    ];


  select.innerHTML = `
    <option value="all">
      📦 All Categories
    </option>
  `;


  categories.forEach(
    category => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        category;


      option.textContent =
        `📂 ${category}`;


      select.appendChild(
        option
      );

    }
  );

}


/* ================= FILTER ================= */

function getFilteredProducts() {

  const search =
    document
      .getElementById(
        "searchInput"
      )
      .value
      .trim()
      .toLowerCase();


  const category =
    document
      .getElementById(
        "categoryFilter"
      )
      .value;


  const sort =
    document
      .getElementById(
        "sortFilter"
      )
      .value;


  let result =
    products.filter(
      product => {

        const text =
          `
            ${product.name || ""}
            ${product.description || ""}
            ${product.category || ""}
          `.toLowerCase();


        const searchOK =
          !search ||
          text.includes(search);


        const categoryOK =
          category === "all" ||
          product.category === category;


        return (
          searchOK &&
          categoryOK
        );

      }
    );


  if (sort === "priceLow") {

    result.sort(
      (a, b) =>
        Number(a.price || 0) -
        Number(b.price || 0)
    );

  }


  if (sort === "priceHigh") {

    result.sort(
      (a, b) =>
        Number(b.price || 0) -
        Number(a.price || 0)
    );

  }


  if (sort === "name") {

    result.sort(
      (a, b) =>
        String(a.name || "")
          .localeCompare(
            String(b.name || "")
          )
    );

  }


  return result;

}


/* ================= PRODUCT CARD ================= */

function productCard(product) {

  const stock =
    Number(
      product.stock || 0
    );


  const preorder =
    product.preorder === true;


  const unavailable =
    stock <= 0 &&
    !preorder;


  const oldPrice =
    Number(
      product.oldPrice || 0
    );


  const price =
    Number(
      product.price || 0
    );


  let discount = 0;


  if (
    oldPrice > price &&
    oldPrice > 0
  ) {

    discount =
      Math.round(
        (
          (oldPrice - price) /
          oldPrice
        ) * 100
      );

  }


  const liked =
    wishlist.includes(
      product.id
    );


  return `

    <article
      class="product-card"
    >

      <div
        class="product-image-wrap"
      >

        <img
          class="product-image"

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


        <div class="badges">

          ${
            product.featured
              ?
              `
              <span class="badge">
                ⭐ Featured
              </span>
              `
              :
              ""
          }


          ${
            discount
              ?
              `
              <span class="badge">
                🔥 ${discount}% OFF
              </span>
              `
              :
              ""
          }


          ${
            preorder
              ?
              `
              <span class="badge">
                🛍️ Pre-Order
              </span>
              `
              :
              stock <= 0
                ?
                `
                <span class="badge">
                  ❌ Sold Out
                </span>
                `
                :
                `
                <span class="badge">
                  🟢 In Stock
                </span>
                `
          }

        </div>

      </div>


      <div class="product-info">

        <div class="product-name">

          ${escapeHTML(
            product.name ||
            "Unnamed Product"
          )}

        </div>


        <div class="product-description">

          ${escapeHTML(
            product.description ||
            "✨ Premium quality product."
          )}

        </div>


        <div class="price-row">

          <span class="price">
            ৳${money(price)}
          </span>


          ${
            oldPrice > price
              ?
              `
              <span class="old-price">
                ৳${money(oldPrice)}
              </span>
              `
              :
              ""
          }

        </div>


        <div class="product-actions">

          <button
            class="wish-btn"

            onclick="
              toggleWishlist(
                '${product.id}'
              )
            "

            title="Add to Wishlist"
          >

            ${
              liked
                ? "❤️"
                : "♡"
            }

          </button>


          <button
            class="add-btn"

            ${
              unavailable
                ? "disabled"
                : ""
            }

            onclick="
              addToCart(
                '${product.id}'
              )
            "
          >

            ${
              preorder
                ?
                "🛍️ Pre-Order"
                :
                unavailable
                  ?
                  "❌ Out of Stock"
                  :
                  "🛒 Add to Cart"
            }

          </button>

        </div>


        <button
          class="small-btn"

          style="
            width:100%;
            margin-top:8px;
          "

          onclick="
            openProductDetails(
              '${product.id}'
            )
          "
        >

          👁️ View Details

        </button>

      </div>

    </article>

  `;

}


/* ================= RENDER PRODUCTS ================= */

function renderProducts() {

  const grid =
    document.getElementById(
      "productsGrid"
    );


  const empty =
    document.getElementById(
      "noProducts"
    );


  const result =
    getFilteredProducts();


  grid.innerHTML = "";


  if (
    result.length === 0
  ) {

    empty.style.display =
      "block";

    return;

  }


  empty.style.display =
    "none";


  result.forEach(
    product => {

      grid.insertAdjacentHTML(
        "beforeend",
        productCard(product)
      );

    }
  );

}


/* ================= FEATURED ================= */

function renderFeatured() {

  const grid =
    document.getElementById(
      "featuredGrid"
    );


  const featured =
    products
      .filter(
        p => p.featured
      )
      .slice(0, 8);


  grid.innerHTML = "";


  if (
    featured.length === 0
  ) {

    grid.innerHTML = `
      <div
        class="empty-state"
        style="grid-column:1/-1;"
      >

        <div>⭐</div>

        <h3>
          Featured products coming soon
        </h3>

      </div>
    `;

    return;

  }


  featured.forEach(
    product => {

      grid.insertAdjacentHTML(
        "beforeend",
        productCard(product)
      );

    }
  );

}


/* ================= CART ================= */

window.addToCart =
  function (id) {

    const product =
      products.find(
        p => p.id === id
      );


    if (!product) {

      alert(
        "⚠️ Product not found."
      );

      return;

    }


    const stock =
      Number(
        product.stock || 0
      );


    const preorder =
      product.preorder === true;


    if (
      stock <= 0 &&
      !preorder
    ) {

      alert(
        "❌ This product is out of stock."
      );

      return;

    }


    const existing =
      cart.find(
        item => item.id === id
      );


    if (existing) {

      if (
        !preorder &&
        existing.qty >= stock
      ) {

        alert(
          `⚠️ Only ${stock} item(s) available.`
        );

        return;

      }


      existing.qty++;

    }

    else {

      cart.push({

        id:
          product.id,

        name:
          product.name,

        price:
          Number(
            product.price || 0
          ),

        image:
          product.image,

        stock,

        preorder,

        qty: 1

      });

    }


    saveCart();

    updateCart();


    alert(
      preorder
        ?
        "🛍️ Added to your pre-order cart!"
        :
        "🛒 Added to cart!"
    );

  };


/* ================= QUANTITY ================= */

window.changeQty =
  function (id, change) {

    const item =
      cart.find(
        p => p.id === id
      );


    if (!item)
      return;


    const stock =
      Number(
        item.stock || 0
      );


    if (
      change > 0 &&
      !item.preorder &&
      item.qty >= stock
    ) {

      alert(
        `⚠️ Only ${stock} item(s) available.`
      );

      return;

    }


    item.qty += change;


    if (
      item.qty <= 0
    ) {

      cart =
        cart.filter(
          p => p.id !== id
        );

    }


    saveCart();

    updateCart();

  };


/* ================= UPDATE CART ================= */

function updateCart() {

  const count =
    cart.reduce(
      (
        sum,
        item
      ) =>
        sum + item.qty,
      0
    );


  document.getElementById(
    "cartCount"
  ).innerText = count;


  document.getElementById(
    "wishlistCount"
  ).innerText =
    wishlist.length;


  renderCart();

}


/* ================= RENDER CART ================= */

function renderCart() {

  const container =
    document.getElementById(
      "cartItems"
    );


  const totalElement =
    document.getElementById(
      "cartTotal"
    );


  container.innerHTML = "";


  if (
    cart.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div>🛒</div>

        <h3>
          Your cart is empty
        </h3>

        <p>
          Add something you love! ❤️
        </p>

      </div>

    `;


    totalElement.innerText =
      "0";


    return;

  }


  let total = 0;


  cart.forEach(
    item => {

      const subtotal =
        Number(
          item.price || 0
        ) *
        item.qty;


      total += subtotal;


      container.insertAdjacentHTML(
        "beforeend",

        `

        <div class="cart-item">

          <img
            class="cart-item-image"

            src="${escapeAttribute(
              item.image ||
              "profile.jpeg"
            )}"

            onerror="
              this.src='profile.jpeg'
            "
          >


          <div
            class="cart-item-info"
          >

            <strong>
              ${escapeHTML(
                item.name
              )}
            </strong>

            <div>
              💰 ৳${money(
                item.price
              )}
            </div>

            ${
              item.preorder
                ?
                `
                <small>
                  🛍️ Pre-Order
                </small>
                `
                :
                ""
            }

          </div>


          <div
            class="qty-controls"
          >

            <button
              onclick="
                changeQty(
                  '${item.id}',
                  -1
                )
              "
            >
              −
            </button>


            <strong>
              ${item.qty}
            </strong>


            <button
              onclick="
                changeQty(
                  '${item.id}',
                  1
                )
              "
            >
              +
            </button>

          </div>


          <strong>
            ৳${money(
              subtotal
            )}
          </strong>

        </div>

        `

      );

    }
  );


  totalElement.innerText =
    money(total);

}


/* ================= OPEN CART ================= */

window.openCart =
  function () {

    renderCart();


    document.getElementById(
      "cartModal"
    ).style.display =
      "flex";

  };


window.closeCart =
  function () {

    document.getElementById(
      "cartModal"
    ).style.display =
      "none";

  };


/* ================= WISHLIST ================= */

window.toggleWishlist =
  function (id) {

    if (
      wishlist.includes(id)
    ) {

      wishlist =
        wishlist.filter(
          item => item !== id
        );

    }

    else {

      wishlist.push(id);

    }


    saveWishlist();

    updateCart();

    renderProducts();

    renderFeatured();

  };


window.openWishlist =
  function () {

    const container =
      document.getElementById(
        "wishlistItems"
      );


    const items =
      products.filter(
        p =>
          wishlist.includes(
            p.id
          )
      );


    if (
      items.length === 0
    ) {

      container.innerHTML = `

        <div class="empty-state">

          <div>❤️</div>

          <h3>
            No wishlist items
          </h3>

          <p>
            Save your favorite products here! ✨
          </p>

        </div>

      `;

    }

    else {

      container.innerHTML =
        items
          .map(productCard)
          .join("");

    }


    document.getElementById(
      "wishlistModal"
    ).style.display =
      "flex";

  };


window.closeWishlist =
  function () {

    document.getElementById(
      "wishlistModal"
    ).style.display =
      "none";

  };


/* ================= PRODUCT DETAILS ================= */

window.openProductDetails =
  function (id) {

    const product =
      products.find(
        p => p.id === id
      );


    if (!product)
      return;


    const stock =
      Number(
        product.stock || 0
      );


    const preorder =
      product.preorder === true;


    document.getElementById(
      "productDetails"
    ).innerHTML = `

      <img

        src="${escapeAttribute(
          product.image ||
          "profile.jpeg"
        )}"

        style="
          width:100%;
          max-height:350px;
          object-fit:contain;
          background:#f5f2eb;
          border-radius:18px;
        "

        onerror="
          this.src='profile.jpeg'
        "
      >


      <h2>
        ${escapeHTML(
          product.name ||
          "Product"
        )}
      </h2>


      <div class="price">
        💰 ৳${money(
          product.price
        )}
      </div>


      ${
        product.oldPrice
          ?
          `
          <div class="old-price">
            ৳${money(
              product.oldPrice
            )}
          </div>
          `
          :
          ""
      }


      <p>
        ${escapeHTML(
          product.description ||
          "No description available."
        )}
      </p>


      <p>

        ${
          preorder
            ?
            "🛍️ Available for Pre-Order"
            :
            stock > 0
              ?
              `🟢 ${stock} available`
              :
              "🔴 Out of Stock"
        }

      </p>


      ${
        product.expectedDate
          ?
          `
          <p>
            📅 Expected:
            ${escapeHTML(
              product.expectedDate
            )}
          </p>
          `
          :
          ""
      }


      <button

        class="primary-btn full"

        onclick="
          addToCart(
            '${product.id}'
          );

          closeProductModal();
        "

        ${
          stock <= 0 &&
          !preorder
            ?
            "disabled"
            :
            ""
        }

      >

        ${
          preorder
            ?
            "🛍️ Pre-Order Now"
            :
            "🛒 Add to Cart"
        }

      </button>

    `;


    document.getElementById(
      "productModal"
    ).style.display =
      "flex";

  };


window.closeProductModal =
  function () {

    document.getElementById(
      "productModal"
    ).style.display =
      "none";

  };


/* ================= CHECKOUT ================= */

window.openCheckout =
  function () {

    if (
      cart.length === 0
    ) {

      alert(
        "🛒 Your cart is empty."
      );

      return;

    }


    document.getElementById(
      "cartModal"
    ).style.display =
      "none";


    renderCheckout();


    document.getElementById(
      "checkoutModal"
    ).style.display =
      "flex";

  };


window.closeCheckout =
  function () {

    document.getElementById(
      "checkoutModal"
    ).style.display =
      "none";

  };


/* ================= RECEIVE METHOD ================= */

function getReceiveMethod() {

  const selected =
    document.querySelector(
      'input[name="receiveMethod"]:checked'
    );


  return selected
    ? selected.value
    : "Delivery";

}


/* ================= CHECKOUT RENDER ================= */

function renderCheckout() {

  const container =
    document.getElementById(
      "checkoutItems"
    );


  let total = 0;


  container.innerHTML =
    cart
      .map(
        item => {

          const subtotal =
            Number(
              item.price || 0
            ) *
            item.qty;


          total += subtotal;


          return `

            <div class="cart-item">

              <span>

                🛍️
                ${escapeHTML(
                  item.name
                )}

                × ${item.qty}

              </span>


              <strong>
                ৳${money(
                  subtotal
                )}
              </strong>

            </div>

          `;

        }
      )
      .join("");


  document.getElementById(
    "checkoutTotal"
  ).innerText =
    money(total);


  updatePaymentBreakdown();

}


/* ================= COUPON ================= */

window.applyCoupon =
  function () {

    const input =
      document.getElementById(
        "couponInput"
      );


    const message =
      document.getElementById(
        "couponMessage"
      );


    if (
      !settings.couponCode ||
      !settings.couponPercent
    ) {

      appliedCoupon =
        false;


      message.innerText =
        "ℹ️ No active coupon.";


      updatePaymentBreakdown();

      return;

    }


    if (
      input.value
        .trim()
        .toUpperCase() !==
      String(
        settings.couponCode
      ).toUpperCase()
    ) {

      appliedCoupon =
        false;


      message.innerText =
        "❌ Invalid coupon code.";


      updatePaymentBreakdown();

      return;

    }


    appliedCoupon =
      true;


    message.innerText =
      `✅ Coupon applied:
      ${settings.couponPercent}% off`;


    updatePaymentBreakdown();

  };


/* ================= PAYMENT CALCULATION ================= */

function calculateCheckout() {

  let subtotal = 0;


  cart.forEach(
    item => {

      subtotal +=
        Number(
          item.price || 0
        ) *
        item.qty;

    }
  );


  let discount = 0;


  if (appliedCoupon) {

    discount =
      Math.round(
        subtotal *
        Number(
          settings.couponPercent || 0
        ) /
        100
      );

  }


  const afterDiscount =
    subtotal -
    discount;


  const receiveMethod =
    getReceiveMethod();


  const deliveryFee =
    receiveMethod === "Delivery"
      ?
      Number(
        settings.deliveryFee || 0
      )
      :
      0;


  const total =
    afterDiscount +
    deliveryFee;


  const paidNow =
    receiveMethod === "Self Pickup"
      ?
      Math.round(
        total * .70
      )
      :
      total;


  const due =
    total -
    paidNow;


  return {

    subtotal,

    discount,

    deliveryFee,

    total,

    paidNow,

    due

  };

}


/* ================= PAYMENT BREAKDOWN ================= */

function updatePaymentBreakdown() {

  const box =
    document.getElementById(
      "paymentBreakdown"
    );


  if (!box)
    return;


  const data =
    calculateCheckout();


  box.innerHTML = `

    🧾 Subtotal:
    <strong>
      ৳${money(
        data.subtotal
      )}
    </strong>

    <br>


    🎟️ Discount:
    <strong>
      - ৳${money(
        data.discount
      )}
    </strong>

    <br>


    🚚 Delivery:
    <strong>
      ৳${money(
        data.deliveryFee
      )}
    </strong>

    <hr>


    💰 Total:
    <strong>
      ৳${money(
        data.total
      )}
    </strong>

    <br>


    ${
      getReceiveMethod() ===
      "Self Pickup"

        ?

        `
          💳 Pay Now (70%):
          <strong>
            ৳${money(
              data.paidNow
            )}
          </strong>

          <br>

          🏪 Due on Pickup (30%):
          <strong>
            ৳${money(
              data.due
            )}
          </strong>
        `

        :

        `
          💳 Pay Now (100%):
          <strong>
            ৳${money(
              data.paidNow
            )}
          </strong>
        `
    }

  `;

}


/* ================= PAYMENT INFO ================= */

function showPaymentInfo() {

  const method =
    document.getElementById(
      "paymentMethod"
    ).value;


  const box =
    document.getElementById(
      "paymentInfo"
    );


  if (!method) {

    box.style.display =
      "none";

    return;

  }


  const info =
    PAYMENT_INFO[method];


  box.innerHTML = `

    <strong>
      💳 ${method}
    </strong>

    <br><br>

    📱 Send payment to:

    <br>

    <strong>
      ${info.number}
    </strong>

    <br><br>

    🔢 After payment,
    enter your Transaction ID below.

  `;


  box.style.display =
    "block";

}


/* ================= PLACE ORDER ================= */

window.placeOrder =
  async function () {

    const name =
      document.getElementById(
        "customerName"
      ).value.trim();


    const phone =
      document.getElementById(
        "customerPhone"
      ).value.trim();


    const address =
      document.getElementById(
        "customerAddress"
      ).value.trim();


    const paymentMethod =
      document.getElementById(
        "paymentMethod"
      ).value;


    const transactionId =
      document.getElementById(
        "transactionId"
      ).value.trim();


    const receiveMethod =
      getReceiveMethod();


    const errorBox =
      document.getElementById(
        "checkoutError"
      );


    const button =
      document.getElementById(
        "placeOrderBtn"
      );


    errorBox.innerText =
      "";


    if (!name) {

      errorBox.innerText =
        "👤 Please enter your name.";

      return;

    }


    if (
      !/^01[3-9]\d{8}$/.test(
        phone
      )
    ) {

      errorBox.innerText =
        "📱 Please enter a valid Bangladesh phone number.";

      return;

    }


    if (
      receiveMethod ===
        "Delivery" &&
      !address
    ) {

      errorBox.innerText =
        "📍 Please enter your delivery address.";

      return;

    }


    if (!paymentMethod) {

      errorBox.innerText =
        "💳 Please select a payment method.";

      return;

    }


    if (!transactionId) {

      errorBox.innerText =
        "🔢 Please enter your Transaction ID.";

      return;

    }


    if (
      cart.length === 0
    ) {

      errorBox.innerText =
        "🛒 Your cart is empty.";

      return;

    }


    button.disabled =
      true;


    button.innerText =
      "⏳ Checking stock...";


    try {

      const orderItems = [];

      let subtotal = 0;


      /*
        Transaction ensures
        stock is checked and
        reduced atomically.
      */

      await runTransaction(
        db,
        async transaction => {

          for (
            const cartItem of cart
          ) {

            const ref =
              doc(
                db,
                "products",
                cartItem.id
              );


            const snap =
              await transaction.get(
                ref
              );


            if (
              !snap.exists()
            ) {

              throw new Error(
                `❌ ${cartItem.name} is no longer available.`
              );

            }


            const product =
              snap.data();


            const stock =
              Number(
                product.stock || 0
              );


            const preorder =
              product.preorder === true;


            if (
              !preorder &&
              stock < cartItem.qty
            ) {

              throw new Error(
                `⚠️ Only ${stock} of "${product.name}" is available.`
              );

            }


            const price =
              Number(
                product.price || 0
              );


            const itemSubtotal =
              price *
              cartItem.qty;


            subtotal +=
              itemSubtotal;


            orderItems.push({

              productId:
                cartItem.id,

              productName:
                product.name,

              price,

              quantity:
                cartItem.qty,

              subtotal:
                itemSubtotal,

              preorder

            });


            if (
              !preorder &&
              stock >=
                cartItem.qty
            ) {

              transaction.update(
                ref,
                {
                  stock:
                    stock -
                    cartItem.qty
                }
              );

            }

          }

        }
      );


      const discount =
        appliedCoupon

          ?

          Math.round(
            subtotal *
            Number(
              settings.couponPercent || 0
            ) /
            100
          )

          :

          0;


      const deliveryFee =
        receiveMethod ===
          "Delivery"

          ?

          Number(
            settings.deliveryFee || 0
          )

          :

          0;


      const total =
        subtotal -
        discount +
        deliveryFee;


      const paidNow =
        receiveMethod ===
          "Self Pickup"

          ?

          Math.round(
            total * .70
          )

          :

          total;


      const dueOnPickup =
        total -
        paidNow;


      const random =
        Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();


      const orderId =
        `DIYANO-${Date.now()}-${random}`;


      button.innerText =
        "⏳ Submitting Order...";


      await addDoc(
        collection(
          db,
          "orders"
        ),
        {

          orderId,

          customer: {

            name,

            phone,

            address:
              receiveMethod ===
                "Delivery"

                ?
                address

                :
                ""

          },


          receiveMethod,


          paymentPlan:
            receiveMethod ===
              "Self Pickup"

              ?

              "70% Advance + 30% On Pickup"

              :

              "Full Payment",


          items:
            orderItems,


          subtotal,

          discount,

          deliveryFee,

          total,

          paidNow,

          dueOnPickup,


          coupon:
            appliedCoupon
              ?
              settings.couponCode
              :
              "",


          payment: {

            method:
              paymentMethod,

            transactionId,

            status:
              "Pending"

          },


          orderStatus:
            "Pending",


          isPreOrder:
            orderItems.some(
              item =>
                item.preorder
            ),


          createdAt:
            serverTimestamp()

        }
      );


      cart = [];


      saveCart();

      updateCart();


      document.getElementById(
        "checkoutModal"
      ).style.display =
        "none";


      document.getElementById(
        "successOrderId"
      ).innerText =
        orderId;


      document.getElementById(
        "successPaymentInfo"
      ).innerHTML = `

        ${
          receiveMethod ===
            "Delivery"

            ?

            "🚚 Delivery"

            :

            "🏪 Self Pickup"
        }

        <br><br>


        💰 Total:
        <strong>
          ৳${money(total)}
        </strong>

        <br>


        💳 Paid Now:
        <strong>
          ৳${money(paidNow)}
        </strong>

        <br>


        ${
          dueOnPickup > 0

            ?

            `
              🏪 Due:
              <strong>
                ৳${money(
                  dueOnPickup
                )}
              </strong>
            `

            :

            `
              ✅ Fully Paid
            `
        }

        <br><br>

        ⏳ Payment Status:
        <strong>
          Pending Verification
        </strong>

      `;


      document.getElementById(
        "successModal"
      ).style.display =
        "flex";


      appliedCoupon =
        false;


      document.getElementById(
        "couponInput"
      ).value = "";


      document.getElementById(
        "couponMessage"
      ).innerText = "";


    }

    catch (error) {

      console.error(
        error
      );


      errorBox.innerText =
        error.message ||
        "❌ Unable to place order.";

    }

    finally {

      button.disabled =
        false;


      button.innerText =
        "✅ Place Order";

    }

  };


/* ================= SUCCESS ================= */

window.closeSuccess =
  function () {

    document.getElementById(
      "successModal"
    ).style.display =
      "none";

  };


/* ================= TRACKING ================= */

window.trackOrder =
  async function () {

    const orderId =
      document.getElementById(
        "trackingOrderId"
      ).value.trim();


    const phone =
      document.getElementById(
        "trackingPhone"
      ).value.trim();


    const result =
      document.getElementById(
        "trackingResult"
      );


    if (
      !orderId ||
      !phone
    ) {

      result.innerHTML = `

        <div class="status-timeline">

          ⚠️ Please enter both
          Order ID and phone number.

        </div>

      `;

      return;

    }


    result.innerHTML = `

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

          const order =
            orderDoc.data();


          if (
            order.orderId ===
              orderId &&
            order.customer?.phone ===
              phone
          ) {

            found =
              order;

          }

        }
      );


      if (!found) {

        result.innerHTML = `

          <div
            class="status-timeline"
          >

            ❌ Order not found.

            <br><br>

            Please check your
            Order ID and phone number.

          </div>

        `;

        return;

      }


      const statuses = [

        "Pending",

        "Processing",

        "Shipped",

        "Delivered"

      ];


      const currentIndex =
        statuses.indexOf(
          found.orderStatus
        );


      result.innerHTML = `

        <div
          class="status-timeline"
        >

          <h3>

            📦 Order
            ${escapeHTML(
              found.orderId
            )}

          </h3>


          <p>

            ${
              found.isPreOrder
                ?
                "🛍️ Pre-Order"
                :
                "🛒 Regular Order"
            }

          </p>


          ${statuses
            .map(
              (
                status,
                index
              ) => `

                <div
                  class="
                    status-step
                    ${
                      index <=
                      currentIndex
                        ?
                        "done"
                        :
                        ""
                    }
                  "
                >

                  ${
                    index <=
                    currentIndex
                      ?
                      "✅"
                      :
                      "○"
                  }

                  ${status}

                </div>

              `
            )
            .join("")}


          <hr>


          <strong>
            💳 Payment:
          </strong>

          ${escapeHTML(
            found.payment?.status ||
            "Pending"
          )}

          <br>


          <strong>
            💰 Total:
          </strong>

          ৳${money(
            found.total
          )}

          <br>


          <strong>
            💳 Paid:
          </strong>

          ৳${money(
            found.paidNow
          )}


          ${
            Number(
              found.dueOnPickup || 0
            ) > 0

              ?

              `

                <br>

                <strong>
                  🏪 Due:
                </strong>

                ৳${money(
                  found.dueOnPickup
                )}

              `

              :

              ""
          }

        </div>

      `;

    }

    catch (error) {

      console.error(
        error
      );


      result.innerHTML = `

        <div
          class="status-timeline"
        >

          ❌ Unable to track order.

          <br><br>

          Please try again later.

        </div>

      `;

    }

  };


/* ================= NAVIGATION ================= */

window.openTracking =
  function () {

    document
      .getElementById(
        "tracking"
      )
      .scrollIntoView({
        behavior: "smooth"
      });

  };


window.scrollHome =
  function () {

    document
      .getElementById(
        "home"
      )
      .scrollIntoView({
        behavior: "smooth"
      });

  };


/* ================= EVENTS ================= */

document
  .getElementById(
    "searchInput"
  )
  .addEventListener(
    "input",
    renderProducts
  );


document
  .getElementById(
    "categoryFilter"
  )
  .addEventListener(
    "change",
    renderProducts
  );


document
  .getElementById(
    "sortFilter"
  )
  .addEventListener(
    "change",
    renderProducts
  );


document
  .querySelectorAll(
    'input[name="receiveMethod"]'
  )
  .forEach(
    radio => {

      radio.addEventListener(
        "change",
        () => {

          const delivery =
            document.getElementById(
              "deliveryOption"
            );


          const pickup =
            document.getElementById(
              "pickupOption"
            );


          const address =
            document.getElementById(
              "addressSection"
            );


          if (
            radio.value ===
              "Self Pickup" &&
            radio.checked
          ) {

            address.style.display =
              "none";


            document.getElementById(
              "customerAddress"
            ).value = "";


            delivery.classList.remove(
              "active"
            );


            pickup.classList.add(
              "active"
            );

          }


          if (
            radio.value ===
              "Delivery" &&
            radio.checked
          ) {

            address.style.display =
              "block";


            delivery.classList.add(
              "active"
            );


            pickup.classList.remove(
              "active"
            );

          }


          updatePaymentBreakdown();

        }
      );

    }
  );


document
  .getElementById(
    "paymentMethod"
  )
  .addEventListener(
    "change",
    showPaymentInfo
  );


/* ================= MODAL CLICK OUTSIDE ================= */

document
  .querySelectorAll(
    ".modal"
  )
  .forEach(
    modal => {

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

    }
  );


/* ================= INIT ================= */

await loadSettings();

await loadProducts();

updateCart();
