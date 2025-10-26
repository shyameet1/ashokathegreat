import { NextRequest, NextResponse } from "next/server";
import Kahoot from "kahoot.js-latest";

export async function POST(request: NextRequest) {
  try {
    const { pin, name } = await request.json();

    if (!pin) {
      return NextResponse.json(
        { error: "PIN is required" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const client = new Kahoot();

    return new Promise((resolve) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.log("Connection timeout reached");
          resolve(
            NextResponse.json(
              { error: "Connection timeout - invalid PIN or game not found" },
              { status: 408 }
            )
          );
        }
      }, 15000);

      // Try multiple event names that might indicate successful connection
      client.on("joined", () => {
        console.log("Event: joined");
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(
            NextResponse.json({
              message: "Successfully connected to Kahoot game!",
              pin,
            })
          );
        }
      });

      client.on("ready", () => {
        console.log("Event: ready");
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(
            NextResponse.json({
              message: "Successfully connected to Kahoot game!",
              pin,
            })
          );
        }
      });

      client.on("quizStart", (quiz: any) => {
        console.log("Quiz started:", quiz);
      });

      client.on("questionStart", (question: any) => {
        console.log("Question:", question);
      });

      client.on("finishText", (text: any) => {
        console.log("Game finished:", text);
      });

      client.on("disconnect", (reason: any) => {
        console.log("Disconnected:", reason);
      });

      console.log(`Attempting to join game ${pin} as ${name}`);
      client.join(pin, name);
    });
  } catch (error) {
    console.error("Kahoot connection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect" },
      { status: 500 }
    );
  }
}
