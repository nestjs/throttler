import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ResolveType {
  @Field((type) => Boolean)
  success = true;
}
