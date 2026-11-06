require("dotenv").config();

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

admin.initializeApp();

/*
  IMPORTANT:
  Do NOT write your API key here.

  The key is loaded from:
  functions/.env

  Example:
  OPENAI_API_KEY=your_new_key_here
*/

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.processAISummary = onCall(
  {
    timeoutSeconds: 300,
    memory: "1GiB",
  },

  async (request) => {
    // 1. Check login
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated."
      );
    }

    const uid = request.auth.uid;

    const {
      documentId,
      fileData,
      fileType,
      fileName,
      mode,
    } = request.data || {};

    // 2. Validate input
    if (!documentId || !fileData || !fileName) {
      throw new HttpsError(
        "invalid-argument",
        "Missing file information."
      );
    }

    if (!mode) {
      throw new HttpsError(
        "invalid-argument",
        "AI mode is required."
      );
    }

    try {
      // 3. Convert Base64 → Buffer
      const fileBuffer = Buffer.from(fileData, "base64");

      let extractedText = "";

      const lowerFileName = fileName.toLowerCase();
      const lowerFileType = (fileType || "").toLowerCase();

      // 4. PDF
      if (
        lowerFileType === "application/pdf" ||
        lowerFileName.endsWith(".pdf")
      ) {
        const pdfData = await pdfParse(fileBuffer);

        extractedText = pdfData.text || "";
      }

      // 5. IMAGE
      else if (lowerFileType.startsWith("image/")) {
        const base64Image = fileBuffer.toString("base64");

        const visionResponse =
          await openai.chat.completions.create({
            model: "gpt-4o",

            messages: [
              {
                role: "user",

                content: [
                  {
                    type: "text",

                    text:
                      "Analyze this educational image accurately. " +
                      "Extract readable text, notes, diagrams, labels, " +
                      "headings and important educational information. " +
                      "Do not invent information.",
                  },

                  {
                    type: "image_url",

                    image_url: {
                      url: `data:${lowerFileType};base64,${base64Image}`,
                    },
                  },
                ],
              },
            ],

            max_tokens: 4000,
          });

        extractedText =
          visionResponse.choices?.[0]?.message?.content || "";
      }

      // 6. TXT / other text files
      else {
        extractedText = fileBuffer.toString("utf8");
      }

      // 7. Check extracted text
      if (!extractedText.trim()) {
        throw new Error(
          "The document could not be read or contains no readable text."
        );
      }

      // 8. Limit text
      const limitedText =
        extractedText.substring(0, 15000);

      // 9. AI instructions
      let systemPrompt = "";

      if (mode === "summary") {
        systemPrompt = `
Analyze ONLY the supplied document.

Create a clear educational summary.

Use simple language that a student can understand.

Do not invent information.

Return ONLY valid JSON:

{
  "overview": "Short overview",

  "mainPoints": [
    "Important point 1",
    "Important point 2"
  ],

  "importantConcepts": [
    "Concept 1",
    "Concept 2"
  ],

  "importantTerms": {
    "Term": "Meaning"
  },

  "keyTakeaways": [
    "Takeaway 1",
    "Takeaway 2"
  ],

  "conclusion": "Short conclusion"
}
`;
      }

      else if (mode === "mindmap") {
        systemPrompt = `
Analyze ONLY the supplied document.

Create a clean hierarchical educational mind map.

Identify the main topic, major branches,
subtopics and important points.

Do not invent information.

Return ONLY valid JSON:

{
  "title": "Main Topic",

  "branches": [
    {
      "title": "Branch 1",

      "children": [
        "Point 1",
        "Point 2"
      ]
    }
  ]
}
`;
      }

      else {
        throw new Error("Unsupported AI mode.");
      }

      // 10. OpenAI
      const completion =
        await openai.chat.completions.create({
          model: "gpt-4o",

          response_format: {
            type: "json_object",
          },

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },

            {
              role: "user",
              content: limitedText,
            },
          ],

          temperature: 0.2,
        });

      // 11. Get AI response
      const content =
        completion.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error(
          "AI returned an empty response."
        );
      }

      // 12. Convert JSON
      const parsedResult = JSON.parse(content);

      // 13. Save result in Firestore
      const docRef = admin
        .firestore()
        .doc(
          `users/${uid}/aiDocuments/${documentId}`
        );

      await docRef.set(
        {
          status: "completed",

          result: parsedResult,

          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },

        {
          merge: true,
        }
      );

      // 14. Send result to React
      return {
        success: true,
        result: parsedResult,
      };

    } catch (error) {
      console.error(
        "AI Processing Error:",
        error
      );

      // Save error
      try {
        const docRef = admin
          .firestore()
          .doc(
            `users/${uid}/aiDocuments/${documentId}`
          );

        await docRef.set(
          {
            status: "failed",

            error:
              error.message ||
              "Failed to analyze the document.",

            updatedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },

          {
            merge: true,
          }
        );

      } catch (firestoreError) {
        console.error(
          "Failed to save error status:",
          firestoreError
        );
      }

      throw new HttpsError(
        "internal",
        "Failed to analyze the document."
      );
    }
  }
);