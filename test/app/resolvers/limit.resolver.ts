import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { Throttle } from '../../../src';
import { AppService } from '../app.service';
import { ResolveType } from './resolve.model';

@Resolver(ResolveType)
export class LimitResolver {
  constructor(private readonly appService: AppService) {}

  @Query(() => ResolveType)
  limitQuery() {
    return this.appService.success();
  }

  @Throttle(2, 10)
  @Mutation(() => ResolveType)
  limitMutation() {
    return this.appService.success();
  }
}
