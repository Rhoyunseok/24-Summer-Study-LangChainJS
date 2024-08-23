// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
//기본 호출주소: http://localhost:3000/api/bot
//대화 이력 기반 챗봇 구현하기
//기본적으로 LLM은 사용자와 챗봇간 대화이력 데이터를 관리하지 않기 때문에
//대화중에 발생한 데이터에 대해 물어보면 모르는 상황이 발생합니다.
//랭체인/백엔드 영역에서 대화이력을 관리하고 해당 대화이려과 프롬프트를 LLM에게 전달해서
//대화 이력 기반 챗봇 구현이 가능함..
import type { NextApiRequest, NextApiResponse } from "next";

//프론트엔드로 반환할 메시지 데이터 타입 참조하기
import { IMessage, IMemberMessage, UserType } from "@/interfaces/message";

//openAI LLM 서비스 객체 참조하기
import { ChatOpenAI } from "@langchain/openai";

//시스템 휴먼 메시지 객체 참조하기
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

//프롬프트 템플릿 참조하기
import { ChatPromptTemplate } from "@langchain/core/prompts";

//LLM 응답 메시지 타입을 원하는 타입결과물로 파싱(변환)해주는 아웃풋파서 참조하기
//StringOutputParser는 LLM 응답결과를 문자열로 변환해주는 파서이다.
import { StringOutputParser } from "@langchain/core/output_parsers";

//챗봇과의 대화이력 정보 관리를 위한 메모리 기반 InMemoryChatMessageHistory 객체 참조하기
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";

//대화이력 관리를 위한 세부 주요 객체 참조하기
import {
  RunnableWithMessageHistory,
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";

//서버에서 웹브라우저로 반환하는 처리결과 데이터 타입
type ResponseData = {
  code: number;
  data: string | null | IMemberMessage;
  msg: string;
};

//메모리 영역에 대화이력을 실제 저장되는 변수 선언 및 구조정의
//Record<사용자세션아이디, InMemoryChatMessageHistory: 사용자별대화이력 객체>
const messageHistories: Record<string, InMemoryChatMessageHistory> = {};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  //API 호출 기본 결과값 설정
  let apiResult: ResponseData = { code: 400, data: null, msg: "failed" };
  try {
    if (req.method == "POST") {
      //step1 : 사용자 프롬프트 추출하기
      const prompt = req.body.message;
      const nick_name = req.body.nickName;

      //step2 : LLM 모델 생성하기
      const llm = new ChatOpenAI({
        model: "gpt-4o",
        temperature: 0.9,
        apiKey: process.env.OPENAI_API_KEY,
      });

      //result = AIMessge{content: "챗봇 응답 메시지 문자열", ...}
      //   const result = await llm.invoke(prompt);
      //챗봇에게 대화이력기반 채팅을 할 것을 알려주고 대화이력정보를 챗봇에게 제공하며
      //사용자 메시지를 포함한 채팅전용 템플릿을 생성합니다.
      const promptTempate = ChatPromptTemplate.fromMessages([
        ["system", "당신은 사용자와의 모든 대화이력을 기억합니다."],
        ["placeholder", "{chat_history}"],
        ["human", "{input}"],
      ]);

      //LLM OutputParser 객체 생성하기
      const outputParser = new StringOutputParser();

      //LLM 모델 체인 생성(llm 기본작업)
      const llmChain = promptTempate.pipe(llm).pipe(outputParser);

      //대화이력 관리 객체 생성하기(대화이력관리 작업)
      // |||||||RunnableWithMessageHistory|||||||| 객체는 대화이력을 관리하는 객체이다.{지정된 사용자의 대화이력 반환}
      //inputMessagesKey: 사용자 입력메시지 키값
      //historyMessagesKey: 대화이력메시지 키값
      const historychain = new RunnableWithMessageHistory({
        runnable: llmChain,
        getMessageHistory: async (sessionId) => {
          //메모리 영역에 해당 세션 아이디 사용자의 대화이력이 없으면 대화이력 관리 객체를 생성해준다.
          if (messageHistories[sessionId] == undefined) {
            messageHistories[sessionId] = new InMemoryChatMessageHistory();
          }
          return messageHistories[sessionId];
        },
        inputMessagesKey: "input",
        historyMessagesKey: "chat_history",
      });

      //사용자 세션 아이디 값 구성하기
      //현재 챗봇을 호출한 사용자 아이디값을 세션아이디로 설정해줍닏.
      //추후 프론트엔드에서 전달된 사용자 아이디값을 세셔아이디 값으로 설정해주면 됩니다.
      const config = {
        configurable: { sessionId: nick_name },
      };

      //대화이력 관리 기반 챗봇 llm 호출하기

      //Case1 : 한방에 LLM 응답 메시지 수신하기
      const resultMessage = await historychain.invoke(
        { input: prompt },
        config
      );

      //Case2 : LLM 응답메시지 스트림 방식으로 전달하기
      //LLM에서 반환된 응답메시지 문자열을 글자수를 짤라서 순차적으로 스트리밍(전송)하는 방법 제공
      //LLM 응답 메시지를 스트림 형식으로 전달받기 위해
      //   const stream = await historychain.stream({ input: prompt }, config);
      //   let resultMessage = "";
      //   for await (const chunk of stream) {
      //     console.log("|", chunk);
      //     resultMessage += chunk;
      //   }

      //프론트엔드로 반환되는 메시지 데이터 생성하기
      const resultMsg: IMemberMessage = {
        user_type: UserType.BOT,
        nick_name: "챗봇",
        message: resultMessage,
        send_date: new Date(),
      };

      //POST 방식 호출시 처리 로직
      apiResult.code = 200;
      apiResult.data = resultMsg;
      apiResult.msg = "ok";
    }
    //step1 : 로직 구현
  } catch (err) {
    //step2 : API 호출 결과 설정
    apiResult.code = 500;
    apiResult.data = null;
    apiResult.msg = "server error";
  }
  res.json(apiResult);
}
