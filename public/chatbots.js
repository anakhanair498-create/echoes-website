
/* ECHOES — Rule-Based Character Chatbots
   Anna and Dr. Vale respond using keyword rules.
   No API key or paid service is needed.
*/

window.echoesChatbotReply = function (character, question) {
  const text = question.toLowerCase();

  const annaReplies = [
    {
      keywords: ["study", "room", "where"],
      reply: "I saw someone in a long coat near the study around 11:40. I couldn't see their face."
    },
    {
      keywords: ["time", "11:40", "when"],
      reply: "It was around 11:40. The timing seemed important, but I didn't know why."
    },
    {
      keywords: ["coat", "clothes", "wear"],
      reply: "The person wore a long coat. Their height looked similar to yours, but I never saw their face."
    },
    {
      keywords: ["vale", "doctor", "adrian"],
      reply: "Dr. Vale said he was working in the lab. You should check whether the evidence supports his story."
    },
    {
      keywords: ["cctv", "camera", "footage"],
      reply: "The security footage might help you establish who was where that night."
    }
  ];

  const valeReplies = [
    {
      keywords: ["lab", "alibi", "where"],
      reply: "I was in the lab between 10:30 and 11:30. I never entered the study."
    },
    {
      keywords: ["time", "11:30", "11:40"],
      reply: "My work was finished before 11:30. You should compare that timeline with the other evidence."
    },
    {
      keywords: ["hand", "tremble", "nervous"],
      reply: "My hands? That is irrelevant to the investigation. Focus on the evidence, please."
    },
    {
      keywords: ["anna", "maid", "witness"],
      reply: "Anna may have seen something that night. You should ask her about the person near the study."
    },
    {
      keywords: ["cctv", "camera", "footage"],
      reply: "The security recordings should establish who entered the study. Have you examined them?"
    }
  ];

  const rules = character.toLowerCase() === "anna"
    ? annaReplies
    : valeReplies;

  const match = rules.find(rule =>
    rule.keywords.some(keyword => text.includes(keyword))
  );

  if (match) return match.reply;

  return character.toLowerCase() === "anna"
    ? "I'm not sure what else I can tell you. Try asking me about the study, the time, the long coat, or Dr. Vale."
    : "I have answered your questions. Ask me about my alibi, the lab, Anna, or the security footage.";
};
