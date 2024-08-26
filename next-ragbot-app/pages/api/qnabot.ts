//호출주소 : http://localhost:3000/api/qnabot
import type { NextApiRequest, NextApiResponse } from "next";

//웹페이지 크롤링을 위한 cheerio 라이브러리 로드
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

//텍스트 분할 객체 로드
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { pull } from "langchain/hub";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { IMemberMessage, UserType } from "@/interfaces/message";

//API 반환 데이터 타입 정의
type ResponseData = {
  code: number;
  data: string | null | IMemberMessage;
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  let apiResult: ResponseData = {
    code: 400,
    data: null,
    message: "",
  };

  try {
    if (req.method === "POST") {
      const message = req.body.message;
      const nickName = req.body.nickName;

      //step1 : 웹페이지 크롤링을 위한 CheerioWebBaseLoader 객체 생성
      //step1-1 : 웹페이지 로딩하기
      const loader = new CheerioWebBaseLoader(
        "https://api.ncloud-docs.com/docs/common-ncpapi"
      );
      const docs = await loader.load();

      //step 1-2 : 텍스트 분할기 객체 생성 및 분할하리(Chunk)
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });

      const splitedDoc = await textSplitter.splitDocuments(docs);

      //step1-3 : 임베딩 처리(split된 단어를 벡터 데이터화 처리)하고 벡터저장소에 저장하기
      const vectorStore = await MemoryVectorStore.fromDocuments(
        splitedDoc,
        new OpenAIEmbeddings()
      );

      //step2 : 임베딩 데이터 조화하기(리트리버실시)
      //검색기 생성하기
      const retriever = vectorStore.asRetriever();
      //사용자 질문을 이용해 벡터저장소를 조회하고 조회결과 반환하기
      const retrieverResult = await retriever.invoke(message);

      //Step3 : RAG 기반 증강된 검색데이터를 통함 LLM 호출하기
      const gptModel = new ChatOpenAI({
        model: "gpt-4o",
        temperature: 0.2,
        apiKey: process.env.OPENAI_API_KEY,
      });
      //rag전용 프롬프트 템플릿 생성
      const ragPrompt = await pull<ChatPromptTemplate>("rlm/rag-prompt");

      //rag전용 프롬프트 기반 체인 생성하기
      const ragChain = await createStuffDocumentsChain({
        llm: gptModel,
        prompt: ragPrompt,
        outputParser: new StringOutputParser(),
      });

      //체인 실행해서 rag 조회결과 전달해서 llm 메시지 결과 받아오기
      const resultMessage = await ragChain.invoke({
        question: message,
        context: retrieverResult,
      });

      const resultMsg: IMemberMessage = {
        user_type: UserType.BOT,
        nick_name: "Bot",
        message: resultMessage,
        send_date: new Date(),
      };

      apiResult.code = 200;
      apiResult.data = resultMsg;
      apiResult.message = "Success";
    }
  } catch (err) {
    const resultMsg: IMemberMessage = {
      user_type: UserType.BOT,
      nick_name: "Bot",
      message: "에러에러에러에러",
      send_date: new Date(),
    };

    apiResult.code = 500;
    apiResult.data = resultMsg;
    apiResult.message = "Server Error Failed";
  }

  res.json(apiResult);
}
