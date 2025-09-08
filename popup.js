document.getElementById("generateBtn").onclick = () => {
  const tweetText = document.getElementById("tweetText").value;

  chrome.runtime.sendMessage(
    { type: "generate-reply", tweetText },
    (response) => {
      if (response.reply) {
        document.getElementById("result").innerText = response.reply;
      } else {
        document.getElementById("result").innerText = "Error: " + response.error;
      }
    }
  );
};
