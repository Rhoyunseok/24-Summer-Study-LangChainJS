// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
//기본 호출주소: http://localhost:3000/api/hello
//라우팅 주소는  /api 물리적 폴더 아래 물리적 폴더명과 파일명으로 라우팅 주소가 설정됨

//NextApiRequest 타입은 웹브라우저에서 서버로 전달되는 각종 정보를 추출하는 HTTPRequest 객체
//NextApiResponse 타입은 서버에서 웹브라우저로 전달되는 응답을 처리하는 HTTPResponse 객체
import type { NextApiRequest, NextApiResponse } from "next";

//서버에서 웹브라우저로 반환하는 처리결과 데이터 타입
type ResponseData = {
  code: number;
  data: string | null;
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
    if (req.method == "GET") {
      //GET 방식 호출시 처리 로직
      apiResult.code = 200;
      apiResult.data = "백엔드GET";
      apiResult.msg = "ok";
    }
    if (req.method == "POST") {
      //POST 방식 호출시 처리 로직
      apiResult.code = 200;
      apiResult.data = "백엔드POST";
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
