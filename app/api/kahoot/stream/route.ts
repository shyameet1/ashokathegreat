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

      client.on("QuizStart", (quiz: any) => {
        console.log("✓ Quiz started:", quiz);
        sendEvent("quizStart", { quiz });
      });

      // QuestionReady fires BEFORE QuestionStart - this gives us the earliest data!
      client.on("QuestionReady", (question: any) => {
        console.log("✓ Question READY (early data):", question);
        console.log("QuestionReady object:", JSON.stringify(question, null, 2));
        
        const answers = question.choices?.map((choice: any) => ({
          text: choice.answer,
          correct: choice.correct
        })) || [];
        
        // Send question data as soon as we have it
        if (answers.length > 0) {
          sendEvent("question", {
            question: question.title || question.question || "Question",
            answers: answers,
            questionIndex: question.gameBlockIndex || question.questionIndex || 0,
            timeLeft: question.timeRemaining,
            early: true, // Flag to indicate this is early data
          });
        }
      });

      client.on("QuestionStart", (question: any) => {
        console.log("✓ Question START:", question);
        console.log("QuestionStart object:", JSON.stringify(question, null, 2));
        
        const answers = question.choices?.map((choice: any) => ({
          text: choice.answer,
          correct: choice.correct
        })) || [];
        
        // Only send if we didn't already send from QuestionReady
        // or if QuestionStart has more complete data
        sendEvent("question", {
          question: question.title || question.question || "Question",
          answers: answers,
          questionIndex: question.gameBlockIndex || question.questionIndex || 0,
          timeLeft: question.timeRemaining,
        });
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
