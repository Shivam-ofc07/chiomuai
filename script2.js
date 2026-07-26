const menuBtn = document.getElementById("menuToggle");
const leftPanel = document.getElementById("leftPanel");
const sendBtn = document.getElementById("sendBtn");
const inputEl = document.getElementById("animatedInput");
const chatArea = document.getElementById("chatArea");
const chatsList = document.getElementById("chatsList");
const newChatBtn = document.getElementById("newChatBtn");

let backendConnected = true;

// ===============================
// HUGGING FACE SPACE URL
// ===============================
const backendURL = "https://shivam23445-chomuai.hf.space";

let chats =
  JSON.parse(localStorage.getItem("sparkmind_chats")) || {};

let activeChat =
  localStorage.getItem("sparkmind_active") || null;


// ===============================
// MENU TOGGLE
// ===============================

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


// ===============================
// CHAT LIST
// ===============================

function renderChats() {

  chatsList.innerHTML = "";

  Object.keys(chats).forEach((name) => {

    const div = document.createElement("div");

    div.className = "chat-item";

    div.textContent = name;

    if (name === activeChat) {
      div.classList.add("active");
    }

    div.onclick = () => {

      activeChat = name;

      localStorage.setItem(
        "sparkmind_active",
        activeChat
      );

      renderChats();

      loadChatMessages();

    };

    chatsList.appendChild(div);

  });

}


// ===============================
// CREATE CHAT
// ===============================

function createChat() {

  const newName =
    `Chat ${Object.keys(chats).length + 1}`;

  chats[newName] = [];

  activeChat = newName;

  saveChats();

  renderChats();

  loadChatMessages();

}


// ===============================
// SAVE CHATS
// ===============================

function saveChats() {

  localStorage.setItem(
    "sparkmind_chats",
    JSON.stringify(chats)
  );

  localStorage.setItem(
    "sparkmind_active",
    activeChat
  );

}


// ===============================
// LOAD CHAT
// ===============================

function loadChatMessages() {

  chatArea.innerHTML = "";

  if (
    activeChat &&
    chats[activeChat]
  ) {

    chats[activeChat].forEach((message) => {

      addMessage(
        message.text,
        message.sender,
        false
      );

    });

  }

}


// ===============================
// ADD MESSAGE
// ===============================

function addMessage(
  text,
  sender = "bot",
  save = true
) {

  const msg =
    document.createElement("div");

  msg.className =
    `message ${sender}`;

  const bubble =
    document.createElement("div");

  bubble.className = "bubble";

  // textContent is safer than innerHTML
  bubble.textContent = text;

  msg.appendChild(bubble);

  chatArea.appendChild(msg);

  chatArea.scrollTop =
    chatArea.scrollHeight;


  if (
    save &&
    activeChat
  ) {

    chats[activeChat].push({

      text: text,

      sender: sender

    });

    saveChats();

  }

  return msg;

}


// =====================================================
// 🔥 CALL GRADIO API
// =====================================================

async function callBotmenAPI(
  userText,
  chatHistory
) {

  // ==========================================
  // CONVERT FRONTEND HISTORY
  // TO MODEL HISTORY FORMAT
  // ==========================================

  const formattedHistory =
    chatHistory.map((message) => {

      return {

        role:
          message.sender === "user"
            ? "user"
            : "assistant",

        content:
          message.text

      };

    });


  // ==========================================
  // STEP 1: SUBMIT REQUEST
  // ==========================================

  const submitResponse =
    await fetch(

      `${backendURL}/gradio_api/call/chat`,

      {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body: JSON.stringify({

          data: [

            userText,

            formattedHistory

          ]

        })

      }

    );


  if (!submitResponse.ok) {

    throw new Error(
      `Submit failed: ${submitResponse.status}`
    );

  }


  const submitData =
    await submitResponse.json();


  const eventId =
    submitData.event_id;


  if (!eventId) {

    throw new Error(
      "No event_id received from Gradio"
    );

  }


  // ==========================================
  // STEP 2: WAIT FOR RESULT
  // ==========================================

  const resultResponse =
    await fetch(

      `${backendURL}/gradio_api/call/chat/${eventId}`

    );


  if (!resultResponse.ok) {

    throw new Error(
      `Result failed: ${resultResponse.status}`
    );

  }


  // ==========================================
  // GRADIO RETURNS STREAMING EVENTS
  // ==========================================

  const resultText =
    await resultResponse.text();


  const lines =
    resultText.split("\n");


  for (
    const line of lines
  ) {

    if (
      line.startsWith("data:")
    ) {

      try {

        const jsonData =
          JSON.parse(
            line.replace(
              "data:",
              ""
            ).trim()
          );


        if (
          jsonData &&
          jsonData[0]
        ) {

          return jsonData[0];

        }

      }

      catch (error) {

        console.log(
          "Waiting for final result..."
        );

      }

    }

  }


  throw new Error(
    "No response received from BOTMEN"
  );

}


// =====================================================
// SEND MESSAGE
// =====================================================

async function handleSend() {

  const text =
    inputEl.value.trim();


  if (!text) {

    return;

  }


  if (!backendConnected) {

    alert(
      "⚠️ BOTMEN is offline"
    );

    return;

  }


  // Create chat if no chat exists

  if (!activeChat) {

    createChat();

  }


  // ==========================================
  // SAVE USER MESSAGE
  // ==========================================

  addMessage(
    text,
    "user"
  );

  inputEl.value = "";


  // ==========================================
  // THINKING MESSAGE
  // ==========================================

  const thinkingMsg =
    addMessage(
      "Thinking... 🤔",
      "bot"
    );


  try {

    // IMPORTANT:
    // User message already exists in chats.
    // We send last 10 messages.

    const chatHistory =
      chats[activeChat]
        .slice(-10);


    // Call Gradio

    const reply =
      await callBotmenAPI(

        text,

        chatHistory

      );


    const replyText =
      reply ||
      "⚠️ Empty response from BOTMEN";


    // Update UI

    thinkingMsg
      .querySelector(".bubble")
      .textContent =
      replyText;


    // Update localStorage

    const chatArr =
      chats[activeChat];


    const lastIndex =
      chatArr.length - 1;


    if (

      chatArr[lastIndex] &&

      chatArr[lastIndex].sender === "bot" &&

      chatArr[lastIndex].text
        .startsWith("Thinking")

    ) {

      chatArr[lastIndex].text =
        replyText;

      saveChats();

    }


  }

  catch (error) {

    console.error(
      "BOTMEN ERROR:",
      error
    );


    thinkingMsg
      .querySelector(".bubble")
      .textContent =
      "⚠️ BOTMEN server error";


    setBackendStatus(false);

  }

}


// ===============================
// EVENTS
// ===============================

sendBtn.onclick =
  handleSend;


inputEl.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      handleSend();

    }

  }
);


// ===============================
// BACKEND STATUS
// ===============================

function setBackendStatus(status) {

  backendConnected =
    status;

  inputEl.disabled =
    !status;

  sendBtn.disabled =
    !status;


  inputEl.placeholder =
    status

      ? "Ask whatever you want..."

      : "BOTMEN offline ⚠️";

}


// ===============================
// INITIALIZE
// ===============================

renderChats();


if (activeChat) {

  loadChatMessages();

}


newChatBtn.onclick =
  createChat;


setBackendStatus(true);
