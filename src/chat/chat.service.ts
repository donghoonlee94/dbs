import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { DataSource } from 'typeorm';
import { CreateChatDto } from './dto/create-chat.dto';

@Injectable()
export class ChatService {
  private genAI: GoogleGenAI;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');
    this.genAI = new GoogleGenAI({ apiKey });
  }

  async chat(createChatDto: CreateChatDto) {
    const { message } = createChatDto;

    // 1. Gemini에게 SQL 생성 요청
    const sqlQuery = await this.generateSQL(message);
    console.log('Generated SQL:', sqlQuery);

    if (!sqlQuery) {
      return '죄송합니다. 질문에 대한 데이터를 찾을 수 없습니다.';
    }

    try {
      // 2. 생성된 SQL 실행
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.dataSource.query(sqlQuery);
      console.log('Query Result:', result);

      // 3. 결과를 바탕으로 답변 생성
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return await this.generateAnswer(message, result);
    } catch (error) {
      console.error('SQL Error:', error);
      return '죄송합니다. 데이터를 조회하는 중에 문제가 발생했습니다.';
    }
  }

  private async generateSQL(question: string): Promise<string | null> {
    const prompt = `
      당신은 PostgreSQL 데이터베이스 전문가입니다.
      사용자의 자연어 질문을 듣고 실행 가능한 SQL 쿼리만 작성해주세요.
      
      데이터베이스 스키마:
      Table: user
      Columns: id (number), name (string), email (string), isActive (boolean)

      규칙:
      1. 오직 SELECT 문만 작성하세요. (INSERT, UPDATE, DELETE 금지)
      2. 마크다운, 설명, 주석 없이 오직 SQL 코드만 출력하세요.
      3. 대소문자를 구분하지 않는 검색은 ILIKE를 사용하세요.
      4. 테이블 이름과 컬럼 이름은 반드시 쌍따옴표(")로 감싸주세요. (예: "user", "name")
      5. SQL 끝에 세미콜론(;)을 붙이세요.

      질문: "${question}"
    `;

    const response = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let text = response.text ?? '';

    // 마크다운 코드 블록 제거 (```sql ... ```)
    if (text) {
      text = text
        .replace(/```sql/g, '')
        .replace(/```/g, '')
        .trim();
    }

    return text;
  }

  private async generateAnswer(
    question: string,
    data: any[],
  ): Promise<string | null> {
    const prompt = `
      사용자의 질문과 그에 대한 데이터베이스 조회 결과가 있습니다.
      이 데이터를 바탕으로 사용자가 이해하기 쉽게 자연스러운 문장으로 답변해주세요.

      질문: "${question}"
      조회 결과: ${JSON.stringify(data)}

      답변:
    `;

    const response = await this.genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text ?? '';
  }
}
