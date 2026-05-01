import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreatePretripInspectionInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
