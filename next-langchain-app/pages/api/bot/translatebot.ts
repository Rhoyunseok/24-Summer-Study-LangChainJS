// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
//기본 호출주소: http://localhost:3000/api/bot/translatebot
//라우팅 주소는  /api 물리적 폴더 아래 물리적 폴더명과 파일명으로 라우팅 주소가 설정됨

//NextApiRequest 타입은 웹브라우저에서 서버로 전달되는 각종 정보를 추출하는 HTTPRequest 객체
//NextApiResponse 타입은 서버에서 웹브라우저로 전달되는 응답을 처리하는 HTTPResponse 객체
import type { NextApiRequest, NextApiResponse } from "next";

//프론트엔드로 반환할 메시지 데이터 타입 참조하기
import { IMessage, UserType } from "@/interfaces/message";

//openAI LLM 서비스 객체 참조하기
import { ChatOpenAI } from "@langchain/openai";

//시스템 휴먼 메시지 객체 참조하기
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

//프롬프트 템플릿 참조하기
import { ChatPromptTemplate } from "@langchain/core/prompts";

//LLM 응답 메시지 타입을 원하는 타입결과물로 파싱(변환)해주는 아웃풋파서 참조하기
//StringOutputParser는 LLM 응답결과를 문자열로 변환해주는 파서이다.
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChainStepExecutor } from "langchain/experimental/plan_and_execute";

//서버에서 웹브라우저로 반환하는 처리결과 데이터 타입
type ResponseData = {
  code: number;
  data: string | null | IMessage;
  msg: string;
};

//해당 업무(Hello)에 대한 CRUD 처리를 하는 RESTFul API 기능구현 핸들러 함수
//하나의 함수로 해당업무의 모든 라우팅 방식을 통합해서 기능을 제공하는 통합 라우팅 함수
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
      const role = req.body.role;

      //step2 : LLM 모델 생성하기
      const llm = new ChatOpenAI({
        model: "gpt-4o",
        temperature: 0.9,
        apiKey: process.env.OPENAI_API_KEY,
      });

      //Case3 : ChatPromptTemplate를 이요한 프롬프트 전달하기
      //프롬프트 템플릿이란? llm 에게 전달할 수 있는 다양한 질문 템플릿을 제공하여
      //보다 효율적인 질문형식을 만들어 llm 에게 제공해 좋은 답변을 만들기 위한 방식 제공
      //의도: 좋은 질문이 좋은 답변을 만든다.
      // const promptTemplate = ChatPromptTemplate.fromMessages([
      //   ["system", role],
      //   ["user", "{input}"],
      // ]);
      //template.pipe(llm모델) : chain 객체 반환(chain은 처리학 작업의 기본단위);
      //chain(처리할 작업)을 여러개 생성하고 chain연결해 로직을 구현하는 방식이 LangChain이다..
      // const chain = promptTemplate.pipe(llm);
      // const result = await chain.invoke({ input: prompt });

      //Case2 : System, Human Message를 이용한 llm호출을 구현해주세요.
      const messages = [new SystemMessage(role), new HumanMessage(prompt)];
      //role의 값에 기본적으로 사용자의 역할을 설정해주세요.

      const result = await llm.invoke(messages);
      console.log("LLM 응답 결과 메시지 타입 확인하기 = ", result);

      //Case3 : StringOutputParser를 이용한 결과물 파싱처리 코드를 작성해주세요.

      const parser = new StringOutputParser();
      const chain = llm.pipe(parser);

      const resultMesage = await chain.invoke(messages);
      // const resultMsg: IMessage = {
      //   user_type: UserType.BOT,
      //   message: result.content as string,
      //   send_date: Date.now().toString(),
      // };

      const resultMsg: IMessage = {
        user_type: UserType.BOT,
        message: resultMesage,
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
