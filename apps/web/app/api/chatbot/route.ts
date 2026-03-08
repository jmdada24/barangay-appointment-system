import { NextResponse } from "next/server";
import { sendChatMessage, getChatbotGreeting } from "@/actions/chatbot";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history } = body as {
      message?: string;
      history?: Array<{ role: "user" | "model"; content: string }>;
    };

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: "Message required" }, { status: 400 });
    }

    const result = await sendChatMessage(message, history ?? []);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}

export async function GET() {
  const result = await getChatbotGreeting();
  return NextResponse.json(result);
}