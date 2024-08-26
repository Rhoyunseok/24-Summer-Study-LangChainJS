// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
//기본 호출주소: http://localhost:3000/api/article
//제공 기능 : 게시글 정보관리 RESTAPI 기능제공 모듈

//NextApiRequest 타입은 웹브라우저에서 서버로 전달되는 각종 정보를 추출하는 HTTPRequest 객체
//NextApiResponse 타입은 서버에서 웹브라우저로 전달되는 응답을 처리하는 HTTPResponse 객체
import type { NextApiRequest, NextApiResponse } from "next";
import { IArticle } from "@/interfaces/article";
//서버에서 웹브라우저로 반환하는 처리결과 데이터 타입
type ResponseData = {
  code: number;
  data: string | IArticle[] | null | IArticle;
  msg: string;
};

//해당 업무(Hello)에 대한 CRUD 처리를 하는 RESTFul API 기능구현 핸들러 함수
//하나의 함수로 해당업무의 모든 라우팅 방식을 통합해서 기능을 제공하는 통합 라우팅 함수
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  //API 호출 기본 결과값 설정
  let apiResult: ResponseData = { code: 400, data: null, msg: "failed" };
  try {
    //호출주소 : http://localhost:3000/api/article
    //호출방식 : GET
    //호출결과 : 게시글 전체 목록 데이터 반환
    if (req.method == "GET") {
      const articles: IArticle[] = [
        {
          id: 1,
          title: "제목1입니다",
          contents: "내용1입니다",
          view_cnt: 0,
          ip_address: "",
          created_at: Date.now().toString(),
          created_memberid: 1,
        },
        {
          id: 2,
          title: "제목2입니다",
          contents: "내용2입니다",
          view_cnt: 0,
          ip_address: "",
          created_at: Date.now().toString(),
          created_memberid: 2,
        },
      ];
      //GET 방식 호출시 처리 로직
      apiResult.code = 200;
      apiResult.data = articles;
      apiResult.msg = "ok";
    }
    if (req.method == "POST") {
      //step1 : 사용자 데이터 추출하기
      const title: string = req.body.title;
      const contents: string = req.body.contents;
      const created_memberid: number = req.body.created_memberid;

      //step2 : DB에 데이터 저장하기
      const article = {
        id: 2,
        title: title,
        contents: contents,
        view_cnt: 0,
        ip_address: "111.111.111.111",
        created_at: Date.now().toString(),
        created_memberid: created_memberid,
      };
      //POST 방식 호출시 처리 로직
      apiResult.code = 200;
      apiResult.data = article;
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
