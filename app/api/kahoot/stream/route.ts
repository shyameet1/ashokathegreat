import { NextRequest } from "next/server";
import Kahoot from "kahoot.js-latest";

const clients = new Map<string, any>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pin = searchParams.get("pin");
  const name = searchParams.get("name");

  if (!pin || !name) {
    return new Response("PIN and name are required", { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const client = new Kahoot();
      const sessionId = `${pin}-${name}-${Date.now()}`;
      clients.set(sessionId, client);
      let isClosed = false;

      const sendEvent = (event: string, data: any) => {
        if (isClosed) {
          return;
        }
        try {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          if (!isClosed) {
            console.error("Error sending event:", error);
            isClosed = true;
          }
        }
      };

      // Send initial connection event
      sendEvent("connected", { message: "Connecting to game..." });

      // Listen to ALL events to debug
      const originalOn = client.on.bind(client);
      client.on = function(event: string, callback: any) {
        console.log(`Registering listener for event: ${event}`);
        return originalOn(event, (...args: any[]) => {
          console.log(`Event fired: ${event}`, args);
          callback(...args);
        });
      };

      client.on("Joined", () => {
        console.log("✓ Joined game successfully");
        sendEvent("joined", { message: "Successfully joined the game!" });
      });

      let allQuestions: any[] = [];
      let currentQuestionIndex = 0;

      client.on("QuizStart", async (quiz: any) => {
        console.log("✓ Quiz started:", quiz);
        sendEvent("quizStart", { quiz });
        
        // Try to fetch all questions from Kahoot API
        const gameId = quiz.gameId;
        if (gameId) {
          console.log("🔍 Fetching all questions for gameId:", gameId);
          try {
            const response = await fetch(`https://create.kahoot.it/rest/kahoots/${gameId}`);
            if (response.ok) {
              const quizData = await response.json();
              console.log("✅ Fetched quiz data successfully!");
              
              // Store all questions
              quizData.questions?.forEach((q: any, index: number) => {
                const cleanQuestion = (q.question || "Question").replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '');
                const answers = q.choices?.map((choice: any) => ({
                  text: choice.answer || "",
                  correct: choice.correct
                })).filter((a: any) => a.text) || [];
                
                allQuestions[index] = {
                  question: cleanQuestion,
                  answers: answers,
                  timeLeft: q.time,
                };
              });
              
              console.log(`📚 Stored ${allQuestions.length} questions`);
            }
          } catch (error) {
            console.log("⚠️ Could not fetch quiz data from API, using fallback");
          }
        }
        
        // Fallback: Store first question from QuizStart
        if (quiz.firstGameBlockData && !allQuestions[0]) {
          const firstQ = quiz.firstGameBlockData;
          const answers = firstQ.choices?.map((choice: any) => ({
            text: choice.answer || "",
            correct: choice.correct
          })).filter((a: any) => a.text) || [];
          
          if (answers.length > 0) {
            const cleanQuestion = (firstQ.question || "Question").replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '');
            
            allQuestions[0] = {
              question: cleanQuestion,
              answers: answers,
              timeLeft: firstQ.time,
            };
          }
        }
        
        // Send first question immediately
        if (allQuestions[0]) {
          console.log("📤 Sending first question");
          sendEvent("question", {
            ...allQuestions[0],
            questionIndex: 0,
          });
        }
      });

      client.on("QuestionReady", (question: any) => {
        console.log("✓ Question READY - Index:", question.questionIndex || question.gameBlockIndex);
        
        // Check if this question has data in nextGameBlockData
        if (question.nextGameBlockData) {
          const nextQ = question.nextGameBlockData;
          console.log("Next question data:", JSON.stringify(nextQ, null, 2));
        }
      });

      client.on("QuestionStart", (question: any) => {
        console.log("✓ Question START - Index:", question.gameBlockIndex);
        console.log("📋 Full QuestionStart data:", JSON.stringify(question, null, 2));
        console.log("📋 All question properties:", Object.keys(question));
        
        const qIndex = question.gameBlockIndex || 0;
        currentQuestionIndex = qIndex;
        
        // Try to extract question text from any available property
        const questionText = question.title || 
                           question.question || 
                           question.text ||
                           question.questionText ||
                           (question as any).gameBlock?.question ||
                           null;
        
        console.log("🔍 Extracted question text:", questionText);
        
        // Check if we have this question stored
        if (allQuestions[qIndex]) {
          console.log("📤 Sending stored question", qIndex);
          sendEvent("question", {
            ...allQuestions[qIndex],
            questionIndex: qIndex,
          });
        } else if (questionText) {
          // If we found question text but no stored data, send just the question
          console.log("📤 Sending question text only (no answers)");
          sendEvent("question", {
            question: questionText,
            answers: [
              { text: "Option 1" },
              { text: "Option 2" },
              { text: "Option 3" },
              { text: "Option 4" }
            ],
            questionIndex: qIndex,
            timeLeft: question.timeAvailable,
          });
        } else {
          console.log("⚠️ No data for question", qIndex);
          // Send a placeholder
          sendEvent("question", {
            question: `Question ${qIndex + 1} (Data not available)`,
            answers: [
              { text: "Answer 1" },
              { text: "Answer 2" },
              { text: "Answer 3" },
              { text: "Answer 4" }
            ],
            questionIndex: qIndex,
            timeLeft: question.timeAvailable,
          });
        }
      });

      client.on("QuestionEnd", (result: any) => {
        console.log("✓ Question ended:", result);
        sendEvent("questionEnd", result);
      });

      client.on("QuizEnd", () => {
        console.log("✓ Quiz ended");
        sendEvent("finish", { message: "Quiz has ended!" });
      });

      client.on("Disconnect", (reason: any) => {
        console.log("✓ Disconnected:", reason);
        sendEvent("disconnect", { reason });
        clients.delete(sessionId);
        isClosed = true;
        try {
          controller.close();
        } catch (e) {
          console.log("Controller already closed");
        }
      });

      console.log(`🎮 Joining game ${pin} as ${name}`);
      
      try {
        client.join(pin, name);
        // Send joined event after a short delay as fallback
        setTimeout(() => {
          sendEvent("joined", { message: "Connected! Waiting for questions..." });
        }, 2000);
      } catch (error) {
        console.error("Error joining game:", error);
        sendEvent("error", { message: "Failed to join game" });
      }

      request.signal.addEventListener("abort", () => {
        console.log("Client disconnected from browser");
        clients.delete(sessionId);
        isClosed = true;
        try {
          controller.close();
        } catch (e) {
          console.log("Controller already closed");
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
