const fetch = require("node-fetch");

const extractFromImage = async (imageBase64, question) => {
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/naver-clova-ix/donut-base-finetuned-docvqa", {
      method: "POST",
      headers: {
        "Authorization": process.env.HUGGINGFACEAPI,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: {
          question: question,
          image: imageBase64
        }
      })
    });

    const result = await response.json();
    console.log(result)
    return result?.answer || null;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { extractFromImage }
