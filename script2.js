const menuBtn = document.getElementById("menuToggle");
const leftPanel = document.getElementById("leftPanel");
const sendBtn = document.getElementById("sendBtn");
const inputEl = document.getElementById("animatedInput");
const chatArea = document.getElementById("chatArea");
const chatsList = document.getElementById("chatsList");
const newChatBtn = document.getElementById("newChatBtn");


// ======================================================
// BOTMEN AI HUGGING FACE SPACE
// ======================================================

const backendURL =
  "https://shivam23445-botmen-ai.hf.space";


// ======================================================
// LOCAL CHAT DATA
// ======================================================

let chats =
  JSON.parse(
    localStorage.getItem("sparkmind_chats")
  ) || {};

let activeChat =
  localStorage.getItem(
    "sparkmind_active"
  ) || null;


// ======================================================
// MENU
// ======================================================

menuBtn.addEventListener(
  "click",
  function (e) {

    e.stopPropagation();

    leftPanel.classList.toggle(
      "collapsed"
    );

  }
);


document.addEventListener(
  "click",
  function (e) {

    if (

      window.innerWidth <= 900 &&

      !leftPanel.classList.contains(
        "collapsed"
      ) &&

      !leftPanel.contains(e.target) &&

      !menuBtn.contains(e.target)

    ) {

      leftPanel.classList.add(
        "collapsed"
      );

    }

  }
);


// ======================================================
// RENDER CHATS
// ======================================================

function renderChats() {

  chatsList.innerHTML = "";

  Object.keys(chats).forEach(
    function (name) {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "chat-item";

      div.textContent =
        name;


      if (
        name === activeChat
      ) {

        div.classList.add(
          "active"
        );

      }


      div.onclick =
        function () {

          activeChat =
            name;

          localStorage.setItem(
            "sparkmind_active",
            activeChat
          );

          renderChats();

          loadChatMessages();

        };


      chatsList.appendChild(
        div
      );

    }
  );

}


// ======================================================
// CREATE CHAT
// ======================================================

function createChat() {

  const newName =
    "Chat " +
    (Object.keys(chats).length + 1);


  chats[newName] =
    [];


  activeChat =
    newName;


  saveChats();

  renderChats();

  loadChatMessages();

}


// ======================================================
// SAVE CHAT
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

  chatArea.innerHTML =
    "";


  if (

    activeChat &&

    chats[activeChat]

  ) {

    chats[activeChat].forEach(
      function (message) {

        addMessage(
          message.text,
          message.sender,
          false
        );

      }
    );

  }

}


// ======================================================
// ADD MESSAGE
// ======================================================

function addMessage(
  text,
  sender,
  save = true
) {

  const message =
    document.createElement(
      "div"
    );


  message.className =
    "message " +
    sender;


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    "bubble";


  bubble.textContent =
    text;


  message.appendChild(
    bubble
  );


  chatArea.appendChild(
    message
  );


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


  return message;

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


  if (!activeChat) {

    createChat();

  }


  // USER MESSAGE
  addMessage(
    text,
    "user"
  );


  inputEl.value =
    "";


  // THINKING MESSAGE
  const thinkingMessage =
    addMessage(
      "Thinking... 🤔",
      "bot"
    );


  try {


    // ==========================================
    // HISTORY
    // ==========================================

    const history =
      chats[activeChat]

        .filter(
          function (message) {

            return (

              message.text !==
              "Thinking... 🤔"

            );

          }
        )

        .slice(-10)

        .map(
          function (message) {

            return {

              role:
                message.sender ===
                "user"

                  ? "user"

                  : "assistant",

              content:
                message.text

            };

          }
        );


    // ==========================================
    // STEP 1
    // ==========================================

    const startResponse =
      await fetch(

        backendURL +
        "/gradio_api/call/chat",

        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              data: [

                text,

                history

              ]

            })

        }

      );


    if (
      !startResponse.ok
    ) {

      throw new Error(
        "API call failed"
      );

    }


    const startData =
      await startResponse.json();


    const eventId =
      startData.event_id;


    if (!eventId) {

      throw new Error(
        "Event ID nahi mila"
      );

    }


    // ==========================================
    // STEP 2
    // ==========================================

    const resultResponse =
      await fetch(

        backendURL +

        "/gradio_api/call/chat/" +

        eventId

      );


    if (
      !resultResponse.ok
    ) {

      throw new Error(
        "Result nahi mila"
      );

    }


    const resultText =
      await resultResponse.text();


    // ==========================================
    // GRADIO RESPONSE PARSE
    // ==========================================

    let reply =
      "";


    const lines =
      resultText.split(
        "\n"
      );


    for (
      let i = 0;
      i < lines.length;
      i++
    ) {


      const line =
        lines[i];


      if (
        line.startsWith(
          "data:"
        )
      ) {


        const jsonString =
          line.substring(
            5
          ).trim();


        if (
          !jsonString
        ) {

          continue;

        }


        try {


          const data =
            JSON.parse(
              jsonString
            );


          if (

            Array.isArray(
              data
            ) &&

            data.length > 0

          ) {

            reply =
              data[0];

          }

        }

        catch (
          error
        ) {

          console.log(
            "Parse error:",
            error
          );

        }

      }

    }


    if (
      !reply
    ) {

      throw new Error(
        "Empty response"
      );

    }


    // ==========================================
    // SHOW RESPONSE
    // ==========================================

    thinkingMessage

      .querySelector(
        ".bubble"
      )

      .textContent =
      reply;


    // ==========================================
    // SAVE RESPONSE
    // ==========================================

    const chatArray =
      chats[activeChat];


    const lastIndex =
      chatArray.length - 1;


    if (

      chatArray[lastIndex] &&

      chatArray[lastIndex].sender ===
      "bot"

    ) {

      chatArray[lastIndex].text =
        reply;


      saveChats();

    }


    chatArea.scrollTop =
      chatArea.scrollHeight;


  }

  catch (
    error
  ) {


    console.error(
      "BOTMEN ERROR:",
      error
    );


    thinkingMessage

      .querySelector(
        ".bubble"
      )

      .textContent =
      "⚠️ BOTMEN server error. Thoda wait karke dobara try karo.";


  }

}


// ======================================================
// SEND BUTTON
// ======================================================

sendBtn.onclick =
  handleSend;


// ENTER KEY
inputEl.addEventListener(
  "keydown",
  function (e) {

    if (

      e.key ===
      "Enter" &&

      !e.shiftKey

    ) {

      e.preventDefault();

      handleSend();

    }

  }
);


// ======================================================
// INITIALIZE
// ======================================================

renderChats();


if (
  activeChat
) {

  loadChatMessages();

}


newChatBtn.onclick =
  createChat;
