import { CreatePretripInspectionInput } from './create-pretrip-inspection.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdatePretripInspectionInput extends PartialType(CreatePretripInspectionInput) {
  @Field(() => Int)
  id: number;
}
