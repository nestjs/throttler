import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ResolveType {
  @Field(() => Boolean)
  success = true;
}
