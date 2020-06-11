import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from '../app.service';
import { ResolveType } from './resolve.model';
import { Throttle } from '../../../src';

@Throttle(2, 10)
@Resolver(ResolveType)
export class AppResolver {
  constructor(private readonly appService: AppService) {}

  @Query(() => ResolveType)
  appQuery() {
    return this.appService.success();
  }

  @Mutation(() => ResolveType)
  appMutation() {
    return this.appService.success();
  }
}
