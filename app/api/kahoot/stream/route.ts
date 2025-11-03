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

      let quizData: any = null;
      let currentQuestionIndex = 0;

      client.on("QuizStart", (quiz: any) => {
        console.log("✓ Quiz started:", quiz);
        quizData = quiz;
        sendEvent("quizStart", { quiz });
        
        // Send first question immediately from QuizStart data
        if (quiz.firstGameBlockData) {
          const firstQ = quiz.firstGameBlockData;
          const answers = firstQ.choices?.map((choice: any) => ({
            text: choice.answer || "",
            correct: choice.correct
          })).filter((a: any) => a.text) || [];
          
          if (answers.length > 0) {
            // Remove HTML entities from question
            const cleanQuestion = (firstQ.question || "Question").replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '');
            
            console.log("📤 Sending first question from QuizStart");
            sendEvent("question", {
              question: cleanQuestion,
              answers: answers,
              questionIndex: 0,
              timeLeft: firstQ.time,
            });
          }
        }
      });

      client.on("QuestionReady", (question: any) => {
        console.log("✓ Question READY");
        // This event fires but doesn't have the actual question data
        // We'll wait for QuestionStart to get the index
      });

      client.on("QuestionStart", (question: any) => {
        console.log("✓ Question START - Index:", question.gameBlockIndex);
        currentQuestionIndex = question.gameBlockIndex || 0;
        
        // If this is not the first question (already sent from QuizStart)
        // we need to fetch it from somewhere else or wait for the host to provide it
        // For now, we've already sent the first question from QuizStart
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
