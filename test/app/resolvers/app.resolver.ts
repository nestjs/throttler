import { Resolver, Query, Mutation } from '@nestjs/graphql';
import { ResolveType } from './resolve.model';
import { AppService } from '../app.service';

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
