const menuBtn = document.getElementById("menuToggle");
const leftPanel = document.getElementById("leftPanel");
const sendBtn = document.getElementById("sendBtn");
const inputEl = document.getElementById("animatedInput");
const chatArea = document.getElementById("chatArea");
const chatsList = document.getElementById("chatsList");
const newChatBtn = document.getElementById("newChatBtn");

// ======================================================
// BOTMEN SERVEO BACKEND URL (LIVE)
// ======================================================
const backendURL = "https://4b99d38526d7f3c9-35-247-183-249.serveusercontent.com";

// ======================================================
// LOCAL CHAT DATA
// ======================================================
let chats = JSON.parse(localStorage.getItem("sparkmind_chats")) || {};
let activeChat = localStorage.getItem("sparkmind_active") || null;

// ======================================================
// MENU TOGGLE
// ======================================================
menuBtn.addEventListener("click", function (e) {
  e.stopPropagation();
  leftPanel.classList.toggle("collapsed");
});

document.addEventListener("click", function (e) {
  if (
    window.innerWidth <= 900 &&
    !leftPanel.classList.contains("collapsed") &&
    !leftPanel.contains(e.target) &&
    !menuBtn.contains(e.target)
  ) {
    leftPanel.classList.add("collapsed");
  }
});

// ======================================================
// RENDER CHATS
// ======================================================
function renderChats() {
  chatsList.innerHTML = "";

  Object.keys(chats).forEach(function (name) {
    const div = document.createElement("div");
    div.className = "chat-item";
    div.textContent = name;

    if (name === activeChat) {
      div.classList.add("active");
    }

    div.onclick = function () {
      activeChat = name;
      localStorage.setItem("sparkmind_active", activeChat);
      renderChats();
      loadChatMessages();
    };

    chatsList.appendChild(div);
  });
}

// ======================================================
// CREATE CHAT
// ======================================================
function createChat() {
  const newName = "Chat " + (Object.keys(chats).length + 1);
  chats[newName] = [];
  activeChat = newName;

  saveChats();
  renderChats();
  loadChatMessages();
}

// ======================================================
// SAVE CHAT
// ======================================================
function saveChats() {
  localStorage.setItem("sparkmind_chats", JSON.stringify(chats));
  localStorage.setItem("sparkmind_active", activeChat);
}

// ======================================================
// LOAD CHAT
// ======================================================
function loadChatMessages() {
  chatArea.innerHTML = "";

  if (activeChat && chats[activeChat]) {
    chats[activeChat].forEach(function (message) {
      addMessage(message.text, message.sender, false);
    });
  }
}

// ======================================================
// ADD MESSAGE
// ======================================================
function addMessage(text, sender, save = true) {
  const message = document.createElement("div");
  message.className = "message " + sender;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  message.appendChild(bubble);
  chatArea.appendChild(message);

  chatArea.scrollTop = chatArea.scrollHeight;

  if (save && activeChat) {
    chats[activeChat].push({
      text: text,
      sender: sender
    });

    saveChats();
  }

  return message;
}

// ======================================================
// SEND MESSAGE (Updated for Serveo & Flask Backend)
// ======================================================
async function handleSend() {
  const text = inputEl.value.trim();

  if (!text) return;

  if (!activeChat) createChat();

  // USER MESSAGE
  addMessage(text, "user");
  inputEl.value = "";

  // THINKING MESSAGE
  const thinkingMessage = addMessage("Thinking... 🤔", "bot");

  try {
    const response = await fetch(backendURL + "/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: text,
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.response;

    if (!reply) throw new Error("Response khali aaya hai");

    // UPDATE UI WITH AI RESPONSE
    thinkingMessage.querySelector(".bubble").textContent = reply;

    // SAVE TO LOCAL STORAGE
    const chatArray = chats[activeChat];
    const lastIndex = chatArray.length - 1;

    if (chatArray[lastIndex] && chatArray[lastIndex].sender === "bot") {
      chatArray[lastIndex].text = reply;
      saveChats();
    }

    chatArea.scrollTop = chatArea.scrollHeight;

  } catch (error) {
    console.error("BOTMEN ERROR:", error);
    thinkingMessage.querySelector(".bubble").textContent =
      "⚠️ BOTMEN server error. Colab backend running hai ya nahi check kar le.";
  }
}

// ======================================================
// EVENT LISTENERS & INITIALIZATION
// ======================================================
sendBtn.onclick = handleSend;

inputEl.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

renderChats();

if (activeChat) {
  loadChatMessages();
}

newChatBtn.onclick = createChat;
