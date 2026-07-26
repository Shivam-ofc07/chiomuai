const menuBtn = document.getElementById("menuToggle");
const leftPanel = document.getElementById("leftPanel");
const sendBtn = document.getElementById("sendBtn");
const inputEl = document.getElementById("animatedInput");
const chatArea = document.getElementById("chatArea");
const chatsList = document.getElementById("chatsList");
const newChatBtn = document.getElementById("newChatBtn");


// ==================================================
// BACKEND CONFIGURATION
// ==================================================

let backendConnected = true;

const backendURL =
  "https://shivam23445-botmen-ai.hf.space";


// ==================================================
// LOCAL CHAT STORAGE
// ==================================================

let chats =
  JSON.parse(localStorage.getItem("sparkmind_chats")) || {};

let activeChat =
  localStorage.getItem("sparkmind_active") || null;


// ==================================================
// MENU TOGGLE
// ==================================================

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


// ==================================================
// CHAT LIST
// ==================================================

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


// ==================================================
// CREATE NEW CHAT
// ==================================================

function createChat() {

  const newName =
    `Chat ${Object.keys(chats).length + 1}`;


  chats[newName] = [];

  activeChat = newName;


  saveChats();

  renderChats();

  loadChatMessages();

}


// ==================================================
// SAVE CHATS
// ==================================================

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


// ==================================================
// LOAD CHAT MESSAGES
// ==================================================

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


// ==================================================
// ADD MESSAGE
// ==================================================

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


  // textContent prevents unwanted HTML
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


// ==================================================
// CONVERT FRONTEND HISTORY
// TO BOTMEN HISTORY FORMAT
// ==================================================

function getChatHistory() {

  const history =
    (chats[activeChat] || [])
      .slice(-5);


  return history.map((message) => {

    return {

      role:
        message.sender === "user"
          ? "user"
          : "assistant",

      content:
        message.text

    };

  });

}


// ==================================================
// SEND MESSAGE
// ==================================================

async function handleSend() {

  const text =
    inputEl.value.trim();


  if (!text) {

    return;

  }


  if (!backendConnected) {

    alert(
      "⚠️ BOTMEN model is offline!"
    );

    return;

  }


  // Create chat if no active chat exists
  if (!activeChat) {

    createChat();

  }


  // Add user message
  addMessage(
    text,
    "user"
  );


  // Clear input
  inputEl.value = "";


  // Add temporary thinking message
  const thinkingMsg =
    addMessage(
      "Thinking... 🤔",
      "bot"
    );


  try {


    // ==========================================
    // GET LAST 5 CHAT MESSAGES
    // ==========================================

    const chatHistory =
      getChatHistory();


    console.log(
      "📤 Sending to BOTMEN:",
      {
        text,
        history: chatHistory
      }
    );


    // ==========================================
    // START GRADIO API JOB
    // ==========================================

    const startResponse =
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

              chatHistory

            ]

          })

        }

      );


    if (!startResponse.ok) {

      throw new Error(
        `API start failed: ${startResponse.status}`
      );

    }


    const eventData =
      await startResponse.json();


    console.log(
      "📥 Event received:",
      eventData
    );


    const eventId =
      eventData.event_id;


    if (!eventId) {

      throw new Error(
        "No event_id received from BOTMEN"
      );

    }


    // ==========================================
    // WAIT FOR GRADIO RESULT
    // ==========================================

    const resultResponse =
      await fetch(

        `${backendURL}/gradio_api/call/chat/${eventId}`

      );


    if (!resultResponse.ok) {

      throw new Error(
        `Result request failed: ${resultResponse.status}`
      );

    }


    // Gradio returns Server-Sent Events
    const reader =
      resultResponse.body.getReader();


    const decoder =
      new TextDecoder();


    let buffer = "";


    while (true) {


      const {
        value,
        done
      } =
        await reader.read();


      if (done) {

        break;

      }


      buffer +=
        decoder.decode(
          value,
          {
            stream: true
          }
        );


      const lines =
        buffer.split("\n");


      for (
        const line of lines
      ) {


        if (
          line.startsWith("data:")
        ) {


          const rawData =
            line
              .replace(
                "data:",
                ""
              )
              .trim();


          if (
            !rawData
          ) {

            continue;

          }


          try {


            const parsed =
              JSON.parse(
                rawData
              );


            console.log(
              "🤖 BOTMEN response:",
              parsed
            );


            /*
              Gradio output format:

              [
                "BOTMEN response"
              ]
            */


            const replyText =
              Array.isArray(parsed)
                ? parsed[0]
                : parsed;


            if (
              replyText
            ) {


              // Update thinking message
              thinkingMsg
                .querySelector(".bubble")
                .textContent =
                replyText;


              // Update saved chat
              const chatArr =
                chats[activeChat];


              const lastIndex =
                chatArr.length - 1;


              if (

                chatArr[lastIndex] &&

                chatArr[lastIndex].sender
                  === "bot" &&

                chatArr[lastIndex].text
                  === "Thinking... 🤔"

              ) {


                chatArr[lastIndex].text =
                  replyText;


                saveChats();

              }

            }


          } catch (parseError) {


            console.log(
              "Waiting for final BOTMEN output..."
            );

          }

        }

      }

    }


  } catch (error) {


    console.error(
      "❌ BOTMEN ERROR:",
      error
    );


    thinkingMsg
      .querySelector(".bubble")
      .textContent =
      "⚠️ Model offline or server error.";


    setBackendStatus(
      false
    );

  }

}


// ==================================================
// SEND BUTTON
// ==================================================

sendBtn.onclick =
  handleSend;


// ==================================================
// ENTER KEY
// ==================================================

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


// ==================================================
// BACKEND STATUS
// ==================================================

function setBackendStatus(
  status
) {

  backendConnected =
    status;


  inputEl.disabled =
    !status;


  sendBtn.disabled =
    !status;


  inputEl.placeholder =
    status

      ? "Ask whatever you want..."

      : "Model offline ⚠️";

}


// ==================================================
// INITIALIZATION
// ==================================================

renderChats();


if (activeChat) {

  loadChatMessages();

}


newChatBtn.onclick =
  createChat;


// Backend initially considered online
setBackendStatus(
  true
);
