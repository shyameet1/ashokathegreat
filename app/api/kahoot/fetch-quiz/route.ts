import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const quizId = searchParams.get("quizId");

  if (!quizId) {
    return NextResponse.json({ error: "Quiz ID is required" }, { status: 400 });
  }

  try {
    // Try to fetch quiz data from Kahoot's public API
    const response = await fetch(`https://create.kahoot.it/rest/kahoots/${quizId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quiz: ${response.status}`);
    }

    const quizData = await response.json();
    
    // Extract questions and answers
    const questions = quizData.questions?.map((q: any, index: number) => ({
      question: q.question,
      answers: q.choices?.map((choice: any) => ({
        text: choice.answer,
        correct: choice.correct,
      })) || [],
      questionIndex: index,
      time: q.time,
    })) || [];

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz data" },
      { status: 500 }
    );
  }
}
