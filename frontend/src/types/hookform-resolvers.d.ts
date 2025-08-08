declare module '@hookform/resolvers/zod' {
  import { FieldValues, ResolverOptions, ResolverResult } from 'react-hook-form';
  import { ZodSchema } from 'zod';

  export function zodResolver<T extends ZodSchema>(
    schema: T,
    schemaOptions?: Parameters<T['parse']>[1],
    resolverOptions?: ResolverOptions
  ): <TFieldValues extends FieldValues, TContext>(
    values: TFieldValues,
    context: TContext | undefined,
    options: ResolverOptions
  ) => Promise<ResolverResult<TFieldValues>> | ResolverResult<TFieldValues>;
}