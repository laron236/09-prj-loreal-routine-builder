/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Create HTML for displaying product cards */
// Array to keep track of selected product IDs (restored from localStorage if available)
let selectedProductIds = [];
// Try to load saved selections from localStorage
const savedIds = localStorage.getItem("selectedProductIds");
if (savedIds) {
  try {
    selectedProductIds = JSON.parse(savedIds);
  } catch (e) {
    selectedProductIds = [];
  }
}

// Function to display product cards and handle selection
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if this product is selected
      const isSelected = selectedProductIds.includes(product.id);
      return `
        <div class="product-card${
          isSelected ? " selected" : ""
        }" data-product-id="${product.id}">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click event listeners to each product card
  const productCards = document.querySelectorAll(".product-card");
  productsContainer.scrollTop = 0;
  productCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.classList.contains("desc-toggle-btn")) return;
      const productId = Number(card.getAttribute("data-product-id"));
      if (selectedProductIds.includes(productId)) {
        selectedProductIds = selectedProductIds.filter(
          (id) => id !== productId
        );
      } else {
        selectedProductIds.push(productId);
      }
      localStorage.setItem(
        "selectedProductIds",
        JSON.stringify(selectedProductIds)
      );
      displayProducts(products);
      // Always update selected products list with ALL products
      loadProducts().then(updateSelectedProductsList);
    });
  });

  // Add event listeners to description toggle buttons
  const descBtns = document.querySelectorAll(".desc-toggle-btn");
  descBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const descId = btn.getAttribute("aria-controls");
      const descDiv = document.getElementById(descId);
      const expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        descDiv.style.display = "none";
        btn.setAttribute("aria-expanded", "false");
        btn.textContent = "Show Description";
      } else {
        descDiv.style.display = "block";
        btn.setAttribute("aria-expanded", "true");
        btn.textContent = "Hide Description";
      }
    });
  });
}

// Function to update the Selected Products section
function updateSelectedProductsList(allProducts) {
  const selectedProductsList = document.getElementById("selectedProductsList");
  // Find selected product objects
  const selectedProducts = allProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<div style="color:#666;">No products selected.</div>';
    // Remove Clear All button if present
    const clearBtn = document.getElementById("clearAllSelectedBtn");
    if (clearBtn) clearBtn.remove();
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-item" data-product-id="${product.id}" style="display:flex;align-items:center;gap:8px;border:1px solid #ccc;padding:6px 10px;border-radius:6px;background:#fafafa;">
          <img src="${product.image}" alt="${product.name}" style="width:36px;height:36px;object-fit:contain;">
          <span>${product.name}</span>
          <button class="remove-selected-btn" title="Remove" style="margin-left:4px;background:none;border:none;color:#c00;font-size:18px;cursor:pointer;">&times;</button>
        </div>
      `
    )
    .join("");

  // Add Clear All button if not present
  if (!document.getElementById("clearAllSelectedBtn")) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearAllSelectedBtn";
    clearBtn.textContent = "Clear All";
    clearBtn.style =
      "margin-top:10px;background:#fff;border:1.5px solid #c00;color:#c00;padding:6px 18px;border-radius:6px;cursor:pointer;font-size:15px;float:right;";
    clearBtn.addEventListener("click", () => {
      selectedProductIds = [];
      localStorage.setItem(
        "selectedProductIds",
        JSON.stringify(selectedProductIds)
      );
      loadProducts().then((all) => {
        displayProducts(all.filter((p) => p.category === categoryFilter.value));
        updateSelectedProductsList(all);
      });
    });
    selectedProductsList.parentElement.appendChild(clearBtn);
  }

  // Add event listeners to remove buttons
  const removeBtns = selectedProductsList.querySelectorAll(
    ".remove-selected-btn"
  );
  removeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent triggering card click
      const parent = btn.closest(".selected-product-item");
      const productId = Number(parent.getAttribute("data-product-id"));
      selectedProductIds = selectedProductIds.filter((id) => id !== productId);
      localStorage.setItem(
        "selectedProductIds",
        JSON.stringify(selectedProductIds)
      );
      // Re-render both products and selected list
      loadProducts().then((all) => {
        displayProducts(all.filter((p) => p.category === categoryFilter.value));
        updateSelectedProductsList(all);
      });
    });
  });
}

// Filter and display products when category changes
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
  // Always update selected products list with ALL products
  updateSelectedProductsList(products);
});

// Always show selected products on page load
window.addEventListener("DOMContentLoaded", () => {
  loadProducts().then(updateSelectedProductsList);
});

// Get reference to the Generate Routine button
const generateRoutineBtn = document.getElementById("generateRoutine");

// Store the full chat history for context
let chatHistory = [
  {
    role: "system",
    content:
      "You are a helpful skincare and beauty advisor. Only answer questions about the generated routine, skincare, haircare, makeup, fragrance, or related topics. If asked about something else, politely say you can only help with beauty and routine questions.",
  },
];

// Handle Generate Routine button click
generateRoutineBtn.addEventListener("click", async () => {
  chatWindow.innerHTML = "<em>Generating your personalized routine...</em>";
  const allProducts = await loadProducts();
  const selectedProducts = allProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "<span style='color:#c00;'>Please select at least one product to generate a routine.</span>";
    return;
  }
  // Add the user's product selection to the chat history
  chatHistory = [
    chatHistory[0], // system message
    {
      role: "user",
      content: `Here are my selected products as JSON:\n${JSON.stringify(
        selectedProducts.map((p) => ({
          name: p.name,
          brand: p.brand,
          category: p.category,
          description: p.description,
        })),
        null,
        2
      )}\nPlease generate a personalized routine using only these products.`,
    },
  ];
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 2000, // Allow longer responses
      }),
    });
    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add assistant's routine to chat history
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      chatWindow.innerHTML = `<strong>Your Personalized Routine:</strong><br><br>${data.choices[0].message.content.replace(
        /\n/g,
        "<br>"
      )}`;
    } else {
      chatWindow.innerHTML =
        "Sorry, I couldn't generate a routine. Please try again.";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "There was an error connecting to the AI. Please try again later.";
  }
});

// Chat form submission handler for follow-up questions
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value;
  if (!userInput.trim()) return;

  // Add user's question to chat history
  chatHistory.push({ role: "user", content: userInput });
  // Show the user's message immediately as a chat bubble
  let html = "";
  for (let i = 1; i < chatHistory.length; i++) {
    if (chatHistory[i].role === "user") {
      html += `<div class='chat-bubble user'>${chatHistory[i].content}</div>`;
    } else if (chatHistory[i].role === "assistant") {
      html += `<div class='chat-bubble ai'>${chatHistory[i].content.replace(
        /\n/g,
        "<br>"
      )}</div>`;
    }
  }
  chatWindow.innerHTML =
    html +
    "<div class='chat-bubble ai' style='opacity:0.5;'><em>Thinking...</em></div>";
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 1200, // Allow longer responses
      }),
    });
    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add assistant's reply to chat history
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      // Show the full conversation (user and assistant turns)
      let html = "";
      for (let i = 1; i < chatHistory.length; i++) {
        if (chatHistory[i].role === "user") {
          html += `<div class='chat-bubble user'>${chatHistory[i].content}</div>`;
        } else if (chatHistory[i].role === "assistant") {
          html += `<div class='chat-bubble ai'>${chatHistory[i].content.replace(
            /\n/g,
            "<br>"
          )}</div>`;
        }
      }
      chatWindow.innerHTML = html;
      chatWindow.scrollTop = chatWindow.scrollHeight;
    } else {
      chatWindow.innerHTML = "Sorry, I couldn't answer that. Please try again.";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "There was an error connecting to the AI. Please try again later.";
  }
  // Clear the input box
  document.getElementById("userInput").value = "";
  chatWindow.scrollTop = chatWindow.scrollHeight;
});
