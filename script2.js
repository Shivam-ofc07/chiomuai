const menuBtn = document.getElementById("menuToggle");
const leftPanel = document.getElementById("leftPanel");
const sendBtn = document.getElementById("sendBtn");
const inputEl = document.getElementById("animatedInput");
const chatArea = document.getElementById("chatArea");
const chatsList = document.getElementById("chatsList");
const newChatBtn = document.getElementById("newChatBtn");

// =====================================================
// CONFIG
// =====================================================

const backendURL = "https://shivam23445-botmen-ai.hf.space";

// Important:
// app.py has: api_name="chat"
// Therefore endpoint is /chat
const API_ENDPOINT = `${backendURL}/gradio_api/call/chat`;

let backendConnected = true;

let chats =
  JSON.parse(localStorage.getItem("sparkmind_chats")) || {};

let activeChat =
  localStorage.getItem("sparkmind_active") || null;


// =====================================================
// MENU TOGGLE
// =====================================================

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


// =====================================================
// CHAT HANDLING
// =====================================================

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


function createChat() {

  const newName =
    `Chat ${Object.keys(chats).length + 1}`;

  chats[newName] = [];

  activeChat = newName;

  saveChats();

  renderChats();

  loadChatMessages();

}


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


function loadChatMessages() {

  chatArea.innerHTML = "";

  if (
    activeChat &&
    chats[activeChat]
  ) {

    chats[activeChat].forEach((m) => {

      addMessage(
        m.text,
        m.sender,
        false
      );

    });

  }

}


// =====================================================
// MESSAGE FUNCTIONS
// =====================================================

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

  bubble.className =
    "bubble";

  // textContent prevents HTML injection
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
// GRADIO API REQUEST
// =====================================================

async function callBotmen(
  userText,
  history
) {

  // -------------------------------------------------
  // STEP 1: SUBMIT REQUEST
  // -------------------------------------------------

  const submitResponse =
    await fetch(API_ENDPOINT, {

      method: "POST",

      headers: {

        "Content-Type":
          "application/json"

      },

      body: JSON.stringify({

        data: [

          userText,

          history

        ]

      })

    });


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
      "No event_id returned by Gradio"
    );

  }


  // -------------------------------------------------
  // STEP 2: WAIT FOR RESULT
  // -------------------------------------------------

  const resultURL =
    `${API_ENDPOINT}/${eventId}`;


  const resultResponse =
    await fetch(resultURL);


  if (!resultResponse.ok) {

    throw new Error(
      `Result failed: ${resultResponse.status}`
    );

  }


  const resultText =
    await resultResponse.text();


  // -------------------------------------------------
  // SSE RESPONSE PARSING
  // -------------------------------------------------

  const lines =
    resultText.split("\n");


  for (
    let i = 0;
    i < lines.length;
    i++
  ) {

    const line =
      lines[i].trim();


    if (
      line === "event: complete" &&
      lines[i + 1]
    ) {

      const dataLine =
        lines[i + 1];


      if (
        dataLine.startsWith("data:")
      ) {

        const jsonText =
          dataLine
            .replace("data:", "")
            .trim();


        const data =
          JSON.parse(jsonText);


        // Gradio output:
        // ["BOTMEN response"]

        return data[0];

      }

    }


    if (
      line === "event: error"
    ) {

      throw new Error(
        "BOTMEN generation error"
      );

    }

  }


  throw new Error(
    "No completed response received"
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
      "⚠️ BOTMEN is offline!"
    );

    return;

  }


  // Create chat if none exists

  if (!activeChat) {

    createChat();

  }


  // Add user message

  addMessage(
    text,
    "user"
  );


  inputEl.value = "";


  // Thinking message

  const thinkingMsg =
    addMessage(
      "Thinking... 🤔",
      "bot"
    );


  try {


    // ---------------------------------------------
    // HISTORY CONVERSION
    // ---------------------------------------------

    const chatArr =
      chats[activeChat] || [];


    // Remove current thinking message
    // from history

    const previousMessages =
      chatArr
        .slice(0, -1)
        .slice(-10);


    const history =
      previousMessages.map((m) => {

        return {

          role:
            m.sender === "user"
              ? "user"
              : "assistant",

          content:
            m.text

        };

      });


    // ---------------------------------------------
    // CALL BOTMEN
    // ---------------------------------------------

    const reply =
      await callBotmen(
        text,
        history
      );


    const replyText =
      reply ||
      "⚠️ BOTMEN returned an empty response.";


    // ---------------------------------------------
    // UPDATE UI
    // ---------------------------------------------

    thinkingMsg
      .querySelector(".bubble")
      .textContent =
      replyText;


    // ---------------------------------------------
    // UPDATE LOCAL STORAGE
    // ---------------------------------------------

    const currentChat =
      chats[activeChat];


    const lastIndex =
      currentChat.length - 1;


    if (
      currentChat[lastIndex] &&
      currentChat[lastIndex].sender === "bot"
    ) {

      currentChat[lastIndex].text =
        replyText;

      saveChats();

    }


  } catch (error) {

    console.error(
      "BOTMEN ERROR:",
      error
    );


    const errorMessage =
      "⚠️ BOTMEN server error. Thoda wait karke dobara try karo.";


    thinkingMsg
      .querySelector(".bubble")
      .textContent =
      errorMessage;


    const currentChat =
      chats[activeChat];


    const lastIndex =
      currentChat.length - 1;


    if (
      currentChat[lastIndex] &&
      currentChat[lastIndex].sender === "bot"
    ) {

      currentChat[lastIndex].text =
        errorMessage;

      saveChats();

    }

  }

}


// =====================================================
// BUTTONS
// =====================================================

sendBtn.onclick =
  handleSend;


inputEl.addEventListener(
  "keydown",
  (e) => {

    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {

      e.preventDefault();

      handleSend();

    }

  }
);


// =====================================================
// BACKEND STATUS
// =====================================================

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


// =====================================================
// INIT
// =====================================================

renderChats();


if (activeChat) {

  loadChatMessages();

}


newChatBtn.onclick =
  createChat;


setBackendStatus(
  true
);
