import { Resolver } from '@nestjs/graphql';
import { ResolveType } from './resolve.model';

@Resolver(ResolveType)
export class AppResolver {}
