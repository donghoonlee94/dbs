import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity() // 1. 이 클래스는 DB 테이블이야!
export class User {
  @PrimaryGeneratedColumn() // 2. 1, 2, 3... 자동으로 늘어나는 ID (PK)
  id: number;

  @Column() // 3. 일반 컬럼 (문자열)
  name: string;

  @Column() // 4. 일반 컬럼 (문자열)
  email: string;

  @Column({ default: true }) // 5. 기본값이 true인 컬럼
  isActive: boolean;
}
