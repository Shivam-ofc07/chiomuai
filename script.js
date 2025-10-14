const menuBtn = document.getElementById("menuToggle");
const leftPanel = document.getElementById("leftPanel");
const sendBtn = document.getElementById("sendBtn");
const inputEl = document.getElementById("animatedInput");
const chatArea = document.getElementById("chatArea");
const chatsList = document.getElementById("chatsList");
const newChatBtn = document.getElementById("newChatBtn");

let backendConnected = false;
let backendURL = "https://5d09cd96e8f02fff2a78d0cacfaa07a1.serveo.net";  // 👈 apna Serveo URL daal (https://abc123.serveo.net)
let chats = JSON.parse(localStorage.getItem("sparkmind_chats")) || {};
let activeChat = localStorage.getItem("sparkmind_active") || null;

// ================= MENU TOGGLE =================
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  leftPanel.classList.toggle("collapsed");
});

document.addEventListener("click", (e) => {
  if (
    window.innerWidth <= 900 &&
    !leftPanel.classList.contains("collapsed") &&
    !leftPanel.contains(e.target) &&
    !menuBtn.contains(e.target)
  ) {
    leftPanel.classList.add("collapsed");
  }
});

// ================= CHAT HANDLING =================
function renderChats() {
  chatsList.innerHTML = "";
  Object.keys(chats).forEach((name) => {
    const div = document.createElement("div");
    div.className = "chat-item";
    div.textContent = name;
    if (name === activeChat) div.classList.add("active");
    div.onclick = () => {
      activeChat = name;
      localStorage.setItem("sparkmind_active", activeChat);
      renderChats();
      loadChatMessages();
    };
    chatsList.appendChild(div);
  });
}

function createChat() {
  const newName = `Chat ${Object.keys(chats).length + 1}`;
  chats[newName] = [];
  activeChat = newName;
  saveChats();
  renderChats();
  loadChatMessages();
}

function saveChats() {
  localStorage.setItem("sparkmind_chats", JSON.stringify(chats));
  localStorage.setItem("sparkmind_active", activeChat);
}

function loadChatMessages() {
  chatArea.innerHTML = "";
  if (activeChat && chats[activeChat]) {
    chats[activeChat].forEach((m) => addMessage(m.text, m.sender, false));
  }
}

// ================= MESSAGE FUNCTIONS =================
function addMessage(text, sender = "bot", save = true) {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;
  msg.innerHTML = `<div class="bubble">${text}</div>`;
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;

  if (save && activeChat) {
    chats[activeChat].push({ text, sender });
    saveChats();
  }

  return msg;
}

function handleSend() {
  const text = inputEl.value.trim();
  if (!text) return;

  if (!backendConnected) {
    alert("⚠️ Model is offline yet!");
    inputEl.value = "";
    return; // don’t add user message
  }

  // create chat if none active
  if (!activeChat) createChat();

  addMessage(text, "user");
  inputEl.value = "";

  const thinkingMsg = addMessage("Thinking... 🤔", "bot");

  // ============= CALL BACKEND =============
  fetch(`${backendURL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      history: chats[activeChat] || [],
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      const replyText = data.response || "⚠️ Empty response.";
      thinkingMsg.querySelector(".bubble").textContent = replyText;

      const chatArr = chats[activeChat];
      const lastIndex = chatArr.length - 1;
      if (
        chatArr[lastIndex] &&
        chatArr[lastIndex].sender === "bot" &&
        chatArr[lastIndex].text.startsWith("Thinking")
      ) {
        chatArr[lastIndex].text = replyText;
        saveChats();
      }
    })
    .catch((err) => {
      console.error("❌ Error:", err);
      thinkingMsg.querySelector(".bubble").textContent =
        "⚠️ Model offline or server error.";
      setBackendStatus(false);
    });
}

sendBtn.onclick = handleSend;
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSend();
});

// ================= BACKEND STATUS =================
function setBackendStatus(status) {
  backendConnected = status;
  inputEl.disabled = !status;
  sendBtn.disabled = !status;
  inputEl.placeholder = status
    ? "Ask whatever you want..."
    : "Model offline ⚠️";
}

// ================= INIT =================
renderChats();
if (activeChat) loadChatMessages();
newChatBtn.onclick = createChat;

// Initially assume online (you can ping to verify)
setBackendStatus(true);


