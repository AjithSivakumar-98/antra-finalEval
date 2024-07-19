const API = (() => {
  const URL = "http://localhost:3000";

  const getCart = () => {
    return fetch(`${URL}/cart`).then((res) => res.json());
  };

  const getInventory = () => {
    return fetch(`${URL}/inventory`).then((res) => res.json());
  };

  const addToCart = (cartItem) => {
    return fetch(`${URL}/cart?content=${cartItem.content}`)
      .then((res) => res.json())
      .then((existingItems) => {
        if (existingItems.length > 0) {
          const existingItem = existingItems[0];
          return fetch(`${URL}/cart/${existingItem.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              amount: existingItem.amount + cartItem.amount,
            }),
          }).then((res) => res.json());
        } else {
          return fetch(`${URL}/cart`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(cartItem),
          }).then((res) => res.json());
        }
      });
  };

  const updateInventory = (id, amount) => {
    return fetch(`${URL}/inventory/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount }),
    }).then((res) => res.json());
  };

  const deleteFromCart = (id) => {
    return fetch(`${URL}/cart/${id}`, {
      method: "DELETE",
    }).then((res) => res.json());
  };

  const checkout = () => {
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    getInventory,
    addToCart,
    updateInventory,
    deleteFromCart,
    checkout,
  };
})();

const Model = (() => {
  class State {
    #onChange;
    #inventory;
    #cart;
    constructor() {
      this.#inventory = [];
      this.#cart = [];
    }

    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }

    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }

  const { getCart, getInventory, addToCart, updateInventory, deleteFromCart, checkout } = API;

  return {
    State,
    getCart,
    getInventory,
    addToCart,
    updateInventory,
    deleteFromCart,
    checkout,
  };
})();

const View = (() => {
  const inventoryListEl = document.querySelector(".inventory-container ul");
  const cartListEl = document.querySelector(".cart-container ul");
  const checkoutBtnEl = document.querySelector(".checkout-btn");

  const renderInventory = (inventory) => {
    let htmlString = "";
  
    for (const item of inventory) {
      const singleLineContent = `<li data-id="${item.id}">
        ${item.content} 
        <button class="decrement-btn">-</button>
        <span class="amount">${item.amount}</span>
        <button class="increment-btn">+</button>
        <button class="add-to-cart-btn">Add to Cart</button>
      </li>`;
      htmlString += singleLineContent
    }
  
    inventoryListEl.innerHTML = htmlString;
  };
  

  const renderCart = (cart) => {
    let htmlString = "";
  
    for (const item of cart) {
      const singleLineContent= `<li data-id="${item.id}">
        ${item.content} &nbsp; x &nbsp;  ${item.amount}
        &nbsp;
        <button class="delete-from-cart-btn">Delete</button>
      </li>`;
      htmlString += singleLineContent;
    }
  
    cartListEl.innerHTML = htmlString;
  };
  

  const decreBtn = (handler) => {
    inventoryListEl.addEventListener("click", (event) => {
      if (event.target.classList.contains("decrement-btn")) {
        const id = parseInt(event.target.parentElement.dataset.id);
        handler(id);
      }
    });
  };

  const increBtn = (handler) => {
    inventoryListEl.addEventListener("click", (event) => {
      if (event.target.classList.contains("increment-btn")) {
        const id = parseInt(event.target.parentElement.dataset.id);
        handler(id);
      }
    });
  };

  const addToCart = (handler) => {
    inventoryListEl.addEventListener("click", (event) => {
      if (event.target.classList.contains("add-to-cart-btn")) {
        const id = parseInt(event.target.parentElement.dataset.id);
        handler(id);
      }
    });
  };

  const deleteCart = (handler) => {
    cartListEl.addEventListener("click", (event) => {
      if (event.target.classList.contains("delete-from-cart-btn")) {
        const id = parseInt(event.target.parentElement.dataset.id);
        handler(id);
      }
    });
  };

  const checkoutCart = (handler) => {
    checkoutBtnEl.addEventListener("click", () => {
      handler();
    });
  };

  return {
    renderInventory,
    renderCart,
    decreBtn,
    increBtn,
    addToCart,
    deleteCart,
    checkoutCart,
  };
})();

const Controller = ((model, view) => {
  const state = new model.State();

  const init = () => {
    model.getInventory().then((inventory) => {
      state.inventory = inventory;
    });

    model.getCart().then((cart) => {
      state.cart = cart;
    });
  };

  const decreBtnLogic = (id) => {
    const item = state.inventory.find((item) => item.id === id);
    if (item.amount > 0) {
      item.amount -= 1;
      model.updateInventory(id, item.amount).then(() => {
        model.getInventory().then((inventory) => {
          state.inventory = inventory;
        });
      });
    }
  };

  const increBtnLogic = (id) => {
    const item = state.inventory.find((item) => item.id === id);
    item.amount += 1;
    model.updateInventory(id, item.amount).then(() => {
      model.getInventory().then((inventory) => {
        state.inventory = inventory;
      });
    });
  };

  const addToCartLogic = (id) => {
    const item = state.inventory.find((item) => item.id === id);
    if (item.amount > 0) {
      model.addToCart({ content: item.content, amount: item.amount }).then(() => {
        item.amount = 0; 
        model.updateInventory(id, item.amount).then(() => {
          model.getInventory().then((inventory) => {
            state.inventory = inventory;
          });
        });
        model.getCart().then((cart) => {
          state.cart = cart;
        });
      });
    }
  };

  const deleteCartLogic = (id) => {
    model.deleteFromCart(id).then(() => {
      model.getCart().then((cart) => {
        state.cart = cart;
      });
    });
  };

  const checkoutCartLogic = () => {
    model.checkout().then(() => {
      model.getCart().then((cart) => {
        state.cart = cart;
      });
      model.getInventory().then((inventory) => {
        state.inventory = inventory;
      });
    });
  };

  const bootstrap = () => {
    state.subscribe(() => {
      view.renderInventory(state.inventory);
      view.renderCart(state.cart);
    });

    view.decreBtn(decreBtnLogic);
    view.increBtn(increBtnLogic);
    view.addToCart(addToCartLogic);
    view.deleteCart(deleteCartLogic);
    view.checkoutCart(checkoutCartLogic);

    init();
  };

  return {
    bootstrap,
  };
})(Model, View);

Controller.bootstrap();
