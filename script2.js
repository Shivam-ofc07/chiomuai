const menuBtn = document.getElementById("menuToggle");
const leftPanel = document.getElementById("leftPanel");
const sendBtn = document.getElementById("sendBtn");
const inputEl = document.getElementById("animatedInput");
const chatArea = document.getElementById("chatArea");
const chatsList = document.getElementById("chatsList");
const newChatBtn = document.getElementById("newChatBtn");


// ======================================================
// BOTMEN AI BACKEND
// ======================================================

const backendURL = "https://shivam23445-botmen-ai.hf.space";

let backendConnected = true;

let chats =
  JSON.parse(localStorage.getItem("sparkmind_chats")) || {};

let activeChat =
  localStorage.getItem("sparkmind_active") || null;


// ======================================================
// MENU TOGGLE
// ======================================================

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


// ======================================================
// CHAT LIST
// ======================================================

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


// ======================================================
// CREATE NEW CHAT
// ======================================================

function createChat() {

  const newName =
    `Chat ${Object.keys(chats).length + 1}`;

  chats[newName] = [];

  activeChat = newName;

  saveChats();

  renderChats();

  loadChatMessages();

}


// ======================================================
// SAVE CHATS
// ======================================================

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


// ======================================================
// LOAD CHAT
// ======================================================

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


// ======================================================
// ADD MESSAGE
// ======================================================

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

  // textContent use kiya hai
  // taaki model ka text safe rahe
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


// ======================================================
// SEND MESSAGE
// ======================================================

async function handleSend() {

  const text =
    inputEl.value.trim();


  if (!text) {

    return;

  }


  if (!backendConnected) {

    alert(
      "⚠️ BOTMEN server offline hai."
    );

    return;

  }


  // Chat nahi hai to naya chat
  if (!activeChat) {

    createChat();

  }


  // User message
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


    // ==================================================
    // HISTORY PREPARE
    // ==================================================

    const history =
      (chats[activeChat] || [])

        .filter((message) => {

          return (
            message.text !==
            "Thinking... 🤔"
          );

        })

        .slice(-10)

        .map((message) => {

          if (
            message.sender === "user"
          ) {

            return {

              role: "user",

              content: message.text

            };

          }


          return {

            role: "assistant",

            content: message.text

          };

        });


    // ==================================================
    // STEP 1: CREATE GRADIO EVENT
    // ==================================================

    const callResponse =
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

              text,

              history

            ]

          })

        }

      );


    if (!callResponse.ok) {

      throw new Error(
        `Gradio call failed: ${callResponse.status}`
      );

    }


    const callData =
      await callResponse.json();


    const eventId =
      callData.event_id;


    if (!eventId) {

      throw new Error(
        "No event_id received from Gradio"
      );

    }


    // ==================================================
    // STEP 2: READ RESULT FROM SSE
    // ==================================================

    const resultResponse =
      await fetch(

        `${backendURL}/gradio_api/call/chat/${eventId}`

      );


    if (!resultResponse.ok) {

      throw new Error(
        `Gradio result failed: ${resultResponse.status}`
      );

    }


    const resultText =
      await resultResponse.text();


    console.log(
      "BOTMEN RAW RESPONSE:",
      resultText
    );


    // ==================================================
    // RESPONSE PARSE
    // ==================================================

    let replyText = "";


    // Gradio SSE mein "data:" line hoti hai
    const dataLines =
      resultText

        .split("\n")

        .filter((line) => {

          return line.startsWith("data:");

        });


    if (dataLines.length > 0) {


      const lastData =
        dataLines[dataLines.length - 1]

          .replace(
            "data:",
            ""
          )

          .trim();


      try {

        const parsed =
          JSON.parse(lastData);


        // Output textbox ka result
        if (
          Array.isArray(parsed)
        ) {

          replyText =
            parsed[0];

        } else {

          replyText =
            parsed;

        }

      }

      catch (parseError) {

        replyText =
          lastData;

      }

    }


    if (
      !replyText ||
      typeof replyText !== "string"
    ) {

      replyText =
        "⚠️ BOTMEN ne empty response diya.";

    }


    // ==================================================
    // THINKING KO ACTUAL RESPONSE SE REPLACE KARO
    // ==================================================

    thinkingMsg
      .querySelector(".bubble")
      .textContent =
      replyText;


    const chatArr =
      chats[activeChat];


    const lastIndex =
      chatArr.length - 1;


    if (

      chatArr[lastIndex] &&

      chatArr[lastIndex].sender ===
      "bot" &&

      chatArr[lastIndex].text
        .startsWith("Thinking")

    ) {

      chatArr[lastIndex].text =
        replyText;

      saveChats();

    }


    chatArea.scrollTop =
      chatArea.scrollHeight;


  }

  catch (error) {


    console.error(
      "❌ BOTMEN ERROR:",
      error
    );


    thinkingMsg
      .querySelector(".bubble")
      .textContent =
      "⚠️ BOTMEN server error. Thoda wait karke dobara try karo.";


    // Error par Thinking ko error se replace
    const chatArr =
      chats[activeChat];


    const lastIndex =
      chatArr.length - 1;


    if (

      chatArr[lastIndex] &&

      chatArr[lastIndex].sender ===
      "bot" &&

      chatArr[lastIndex].text
        .startsWith("Thinking")

    ) {

      chatArr[lastIndex].text =
        "⚠️ BOTMEN server error.";

      saveChats();

    }

  }

}


// ======================================================
// BUTTON + ENTER
// ======================================================

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


// ======================================================
// BACKEND STATUS
// ======================================================

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


// ======================================================
// INITIALIZE
// ======================================================

renderChats();


if (activeChat) {

  loadChatMessages();

}


newChatBtn.onclick =
  createChat;


setBackendStatus(true);
