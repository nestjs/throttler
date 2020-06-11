import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from '../app.service';
import { ResolveType } from './resolve.model';

@Resolver(ResolveType)
export class DefaultResolver {
  constructor(private readonly appService: AppService) {}

  @Query(() => ResolveType)
  defaultQuery() {
    return this.appService.success();
  }

  @Mutation(() => ResolveType)
  defaultMutation() {
    return this.appService.success();
  }
}
